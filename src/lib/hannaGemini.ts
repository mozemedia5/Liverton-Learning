import { auth } from '@/lib/firebase';

const API_BASE_URL = (import.meta.env.VITE_VERCEL_API_BASE_URL || '').replace(/\/$/, '');
const HANNA_ENDPOINT = `${API_BASE_URL}/api/hanna`;

export const HANNA_SYSTEM_PROMPT = `You are Hanna, the friendly AI study assistant built into Liverton Learning. Be warm, concise, practical, and honest about uncertainty. Never fabricate platform data, grades, permissions, financial records, project status, or deadlines. Guide learners rather than completing restricted assessments.`;

export interface HannaAttachment { url: string; name: string; mimeType: string; }
export interface HannaHistoryMessage { role: 'user' | 'hanna'; content: string; }
export type HannaMode = 'web_search' | 'deep_think' | 'studying' | 'deep_research' | 'coding' | 'artifacts';

export function isGeminiConfigured(): boolean {
  // Provider configuration is intentionally server-side. The browser only needs the gateway URL.
  return HANNA_ENDPOINT.length > 0;
}

async function getGatewayHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in to use Hanna.');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function parseGatewayError(response: Response): Promise<never> {
  let message = 'Hanna could not complete this request.';
  const contentType = response.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const body = await response.json();
      if (typeof body.error === 'string') message = body.error;
    } else {
      const body = await response.text();
      if (body.includes('<!doctype') || body.includes('<html')) {
        message = 'Hanna’s API route is not available in this environment. Configure VITE_VERCEL_API_BASE_URL for local development.';
      }
    }
  } catch { /* keep safe generic message */ }
  throw new Error(message);
}

async function callGateway(operation: string, message: string, attachments: HannaAttachment[] = []) {
  const response = await fetch(HANNA_ENDPOINT, {
    method: 'POST',
    headers: await getGatewayHeaders(),
    body: JSON.stringify({ operation, message, attachments }),
  });
  if (!response.ok) return parseGatewayError(response);
  const body = await response.json();
  return body.result as string;
}

async function readSseStream(response: Response, onChunk: (text: string) => void, signal?: AbortSignal) {
  if (!response.body) throw new Error('Hanna returned an empty response stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      break;
    }
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const event of events) {
      const dataLine = event.split('\n').find(line => line.startsWith('data: '));
      if (!dataLine) continue;
      const payload = JSON.parse(dataLine.slice(6));
      if (payload.error) throw new Error(payload.error);
      if (payload.type === 'chunk' && typeof payload.text === 'string') {
        fullText = payload.text;
        onChunk(fullText);
      }
      if (payload.type === 'done' && typeof payload.text === 'string') fullText = payload.text;
    }
    if (done) break;
  }
  return fullText;
}

export async function streamHannaReply(
  history: HannaHistoryMessage[],
  message: string,
  attachments: HannaAttachment[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  userInfo?: { userName?: string; userRole?: string; customInstructions?: string },
  chatId?: string,
  mode: HannaMode = 'web_search',
  model?: string,
): Promise<string> {
  const response = await fetch(HANNA_ENDPOINT, {
    method: 'POST',
    headers: await getGatewayHeaders(),
    signal,
    body: JSON.stringify({
      operation: 'chat',
      chatId,
      message,
      attachments,
      // The server reloads the authorized history. This is retained only for compatibility and is not trusted.
      history: history.slice(-20),
      mode,
      model,
      customInstructions: userInfo?.customInstructions?.slice(0, 2000) || '',
    }),
  });
  if (!response.ok) return parseGatewayError(response);
  const reply = await readSseStream(response, onChunk, signal);
  if (!reply.trim()) throw new Error('Hanna returned an empty response. Please try again.');
  return reply;
}

export async function generateHannaImage(prompt: string, model = 'gemini-3-pro-image'): Promise<{ title: string; url: string; thumbnailUrl: string; sourceUrl: string; model: string }> {
  const response = await fetch(`${API_BASE_URL}/api/hanna-media`, {
    method: 'POST',
    headers: await getGatewayHeaders(),
    body: JSON.stringify({ prompt, model }),
  });
  if (!response.ok) return parseGatewayError(response);
  const body = await response.json() as { data?: string; mimeType?: string; model?: string };
  if (!body.data) throw new Error('Hanna did not return an image.');
  const binary = atob(body.data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const blob = new Blob([bytes], { type: body.mimeType || 'image/png' });
  const url = URL.createObjectURL(blob);
  return { title: prompt.slice(0, 80) || 'Hanna educational image', url, thumbnailUrl: url, sourceUrl: 'hanna-generated', model: body.model || model };
}

export function deriveChatTitle(firstMessage: string): string {
  const clean = firstMessage.replace(/\s+/g, ' ').trim();
  if (clean.length <= 42) return clean || 'Chat with Hanna';
  return `${clean.slice(0, 42)}…`;
}

export async function generateSmartTitle(firstMessage: string, _userInfo?: { userName?: string; userRole?: string }): Promise<string> {
  try {
    const result = await callGateway('title', `Create a clean 3–5 word title for this first chat message. Return only the title, without quotes or punctuation:\n\n${firstMessage}`);
    return result?.trim().slice(0, 50) || deriveChatTitle(firstMessage);
  } catch {
    return deriveChatTitle(firstMessage);
  }
}

export async function generateHannaPoll(draftQuestion: string): Promise<{ question: string; options: string[] }> {
  try {
    const result = await callGateway('structured_poll', `Return ONLY valid JSON with this shape: {"question":"string","options":["string"]}. Create a clear educational poll from this draft:\n${draftQuestion}`);
    const parsed = JSON.parse(result.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
    if (typeof parsed.question === 'string' && Array.isArray(parsed.options)) return { question: parsed.question, options: parsed.options.map(String).filter(Boolean).slice(0, 4) };
  } catch { /* preserve the existing safe fallback */ }
  return { question: draftQuestion, options: ['Option 1', 'Option 2'] };
}

export async function enhanceTextWithHanna(draft: string, type: 'bio' | 'team_description' | 'quiz' | 'event' | 'project'): Promise<string> {
  if (!draft.trim()) return draft;
  try {
    const result = await callGateway('text_enhancement', `Improve this ${type} draft. Return only the revised text, preserving the original meaning and avoiding invented facts:\n\n${draft}`);
    return result?.trim() || draft;
  } catch {
    return draft;
  }
}


export type HannaArtifactFormat = 'pdf' | 'docx' | 'pptx';

export async function exportHannaArtifact(params: {
  title: string;
  content: string;
  format: HannaArtifactFormat;
}): Promise<{ fileName: string; format: HannaArtifactFormat; blob: Blob }> {
  const endpoint = `${API_BASE_URL}/api/hanna-artifact`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: await getGatewayHeaders(),
    body: JSON.stringify(params),
  });
  if (!response.ok) return parseGatewayError(response);
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `hanna-document.${params.format}`;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return { fileName, format: params.format, blob };
}
