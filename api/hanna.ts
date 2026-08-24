import type { Content, Part } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminFirestore, applyCors, json, parseBody, requireIdentity, safeString } from './_lib/server.js';
import { getApplicationKnowledgeParts } from './_lib/appKnowledge.js';
import { generateGemini, operationPolicy, streamGemini } from './_lib/gemini.js';
import { formatResearchContext, performWebResearch } from './_lib/webResearch.js';

const MAX_HISTORY = 20;
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 18 * 1024 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimitKey(req: VercelRequest, uid: string) {
  const forwarded = req.headers['x-forwarded-for'];
  const address = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return `${uid}:${address || req.socket.remoteAddress || 'unknown'}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    if (rateBuckets.size > 10_000) rateBuckets.clear();
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

type Attachment = { url: string; name?: string; mimeType?: string };

type GatewayMessage = { role: 'user' | 'model'; parts: Part[] };

function history(input: unknown): GatewayMessage[] {
  if (!Array.isArray(input)) return [];
  return input.slice(-MAX_HISTORY).map((item): GatewayMessage => ({
    role: item?.role === 'user' ? 'user' : 'model',
    parts: [{ text: safeString(item?.content, 12000) }],
  })).filter(item => Boolean(item.parts[0]?.text));
}

async function loadAuthorizedHistory(chatId: string, uid: string): Promise<GatewayMessage[]> {
  const db = getAdminFirestore();
  const chat = await db.collection('hanna_chats').doc(chatId).get();
  if (!chat.exists || chat.data()?.userId !== uid) throw Object.assign(new Error('CHAT_FORBIDDEN'), { statusCode: 403 });
  const snapshot = await db.collection('hanna_messages').where('chatId', '==', chatId).get();
  const messages = snapshot.docs.map(doc => doc.data()).sort((a, b) => {
    const left = a.createdAt?.toMillis?.() || 0;
    const right = b.createdAt?.toMillis?.() || 0;
    return left - right;
  });
  return history(messages.map(message => ({ role: message.senderRole === 'user' ? 'user' : 'model', content: message.content })));
}

async function loadCloudinaryParts(input: unknown, uid: string): Promise<Part[]> {
  if (!Array.isArray(input)) return [];
  const parts: Part[] = [];
  let totalBytes = 0;
  for (const item of input.slice(0, MAX_ATTACHMENTS) as Attachment[]) {
    try {
      const url = new URL(item.url);
      const mimeType = safeString(item.mimeType, 100);
      const isCloudinaryHost = url.hostname === 'cloudinary.com' || url.hostname.endsWith('.cloudinary.com');
      if (!isCloudinaryHost) continue;
      const supportedMime = mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('audio/') || mimeType.startsWith('video/');
      if (!supportedMime) continue;
      const assets = await getAdminFirestore().collection('uploaded_assets').where('url', '==', item.url).limit(1).get();
      const asset = assets.docs[0]?.data();
      if (!asset || asset.uploader !== uid) continue;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) continue;
      const responseType = response.headers.get('content-type') || '';
      const expectedType = mimeType.split(';')[0];
      if (responseType && responseType !== 'application/octet-stream' && !responseType.startsWith(expectedType)) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > MAX_ATTACHMENT_BYTES || totalBytes + buffer.byteLength > MAX_TOTAL_ATTACHMENT_BYTES) continue;
      totalBytes += buffer.byteLength;
      parts.push({ inlineData: { mimeType, data: buffer.toString('base64') } });
    } catch {
      // Do not allow one inaccessible attachment to fail the complete request.
    }
  }
  return parts;
}

function systemPrompt(identity: { name: string; email: string }, operation: string) {
  return `You are Hanna, Liverton Learning's secure contextual assistant.\n\nAuthenticated user: ${identity.name || identity.email}\nOperation: ${operation}\n\nRules:\n- Use only authorized facts provided in the request or retrieved server context.\n- Never invent records, grades, balances, permissions, deadlines, project status, or transactions.\n- If information is unavailable, state exactly what is missing.\n- You may prepare suggestions, but do not claim that you executed an action.\n- Do not reveal secrets or records outside the authenticated user's permissions.\n- Be concise, clear, and supportive.
- For chat requests, use the supplied web-research context when present. Cite or link sources for externally sourced claims, distinguish official requirements from suggestions, and explain when current information could not be verified.`;
}

function sse(res: VercelResponse, payload: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function recordUsage(uid: string, operation: string, model: string, credits: number, success: boolean) {
  try {
    await getAdminFirestore().collection('ai_usage').add({
      userId: uid,
      operation,
      model,
      credits,
      success,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('AI usage record failed', { operation, error: error instanceof Error ? error.message : 'unknown' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  let identity: { uid: string; email: string; name: string } | undefined;
  let operation = 'chat';
  try {
    identity = await requireIdentity(req);
    if (isRateLimited(rateLimitKey(req, identity.uid))) return json(res, 429, { error: 'Hanna is receiving many requests. Please try again shortly.' });
    const body = parseBody(req);
    operation = safeString(body.operation || 'chat', 40) || 'chat';
    const message = safeString(body.message, operationPolicy(operation).maxChars);
    if (!message) return json(res, 400, { error: 'A message is required' });

    const chatId = safeString(body.chatId, 160);
    const requestHistory = chatId ? await loadAuthorizedHistory(chatId, identity.uid) : history(body.history);
    const applicationKnowledge = await getApplicationKnowledgeParts(operation === 'chat' && !chatId);
    let researchContext = '';
    if (operation === 'chat') {
      const knowledgeText = applicationKnowledge.map(part => 'text' in part ? part.text : '').filter(Boolean).join('\n');
      const research = await performWebResearch(message, knowledgeText);
      researchContext = formatResearchContext(research);
    }
    const uploadedParts = await loadCloudinaryParts(body.attachments, identity.uid);
    const requestedAttachments = Array.isArray(body.attachments) ? body.attachments.length : 0;
    if (requestedAttachments > 0 && uploadedParts.length === 0) {
      throw Object.assign(new Error('ATTACHMENTS_UNAVAILABLE'), { statusCode: 422 });
    }
    const parts: Part[] = [
      ...applicationKnowledge,
      ...(researchContext ? [{ text: researchContext }] : []),
      ...uploadedParts,
      { text: message },
    ];
    const attachmentTypes = Array.isArray(body.attachments)
      ? body.attachments.map((item: any) => safeString(item?.mimeType, 100)).filter(Boolean)
      : [];
    const mediaInstruction = attachmentTypes.length > 0
      ? `\nAttached media types: ${attachmentTypes.join(', ')}. Analyze the attached content directly. For audio, provide a transcript when requested or when no more specific task is given. For PDFs, use both visible layout and text. For images, describe uncertainty and distinguish visible facts from inference.`
      : '';
    const prompt = `${systemPrompt(identity, operation)}${mediaInstruction}`;
    const policy = operationPolicy(operation);

    if (operation !== 'chat') {
      const result = await generateGemini(operation, prompt, requestHistory, parts);
      await recordUsage(identity.uid, operation, result.model, result.credits, true);
      return json(res, 200, { success: true, result: result.text, model: result.model });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    let fullText = '';
    for await (const text of streamGemini(operation, prompt, requestHistory, parts)) {
      fullText += text;
      sse(res, { type: 'chunk', text: fullText });
    }
    sse(res, { type: 'done', text: fullText, model: policy.model });
    await recordUsage(identity.uid, operation, policy.model, policy.credits, true);
    return res.end();
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown';
    const status = typeof (error as { statusCode?: unknown })?.statusCode === 'number' ? Number((error as { statusCode: number }).statusCode) : 500;
    if (res.headersSent) {
      const streamError = code === 'AI_QUOTA_EXCEEDED'
        ? 'Hanna has reached the current AI quota. Please try again later or ask an administrator to review the Gemini plan.'
        : code === 'AI_MODEL_UNAVAILABLE'
          ? 'Hanna’s configured AI model is temporarily unavailable. Please try again shortly.'
          : code === 'AI_NOT_CONFIGURED'
            ? 'Hanna is not configured.'
            : 'Hanna could not complete this request.';
      sse(res, { type: 'error', error: streamError });
      return res.end();
    }
    if (identity) await recordUsage(identity.uid, operation, operationPolicy(operation).model, operationPolicy(operation).credits, false);
    if (code === 'AUTH_REQUIRED' || code.includes('auth/')) return json(res, 401, { error: 'Authentication required' });
    if (code === 'CHAT_FORBIDDEN') return json(res, 403, { error: 'You are not authorized to access this conversation' });
    if (code.startsWith('SERVER_CONFIG_MISSING')) return json(res, 503, { error: 'Server configuration is incomplete' });
    if (code === 'AI_NOT_CONFIGURED') return json(res, 503, { error: 'Hanna is temporarily unavailable' });
    if (code === 'AI_QUOTA_EXCEEDED') return json(res, 429, { error: 'Hanna has reached the current AI quota. Please try again later.' });
    if (code === 'AI_MODEL_UNAVAILABLE') return json(res, 503, { error: 'Hanna’s configured AI model is temporarily unavailable.' });
    if (code === 'ATTACHMENTS_UNAVAILABLE') return json(res, 422, { error: 'Hanna could not access the attached media. Please re-upload the file and try again.' });
    console.error('Vercel Hanna API error', { code, operation });
    return json(res, status >= 400 && status < 600 ? status : 500, { error: 'Hanna could not complete this request' });
  }
}
