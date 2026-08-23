import { GoogleGenerativeAI, type Content, type Part } from '@google/generative-ai';

const DEFAULT_MODEL = 'gemini-3.6-flash';
const ALLOWED_MODELS = new Set(['gemini-3.6-flash', 'gemini-3.7-flash']);

export function getModelName() {
  const requested = process.env.GEMINI_MODEL?.trim();
  return requested && ALLOWED_MODELS.has(requested) ? requested : DEFAULT_MODEL;
}

/**
 * Check model availability without exposing the API key or provider error body.
 * This is intentionally separate from generation so /api/health can detect a
 * stale model override before users encounter a 500 response.
 */
export async function checkGeminiModel(): Promise<{ model: string; reachable: boolean }> {
  const key = process.env.GEMINI_API_KEY;
  const model = getModelName();
  if (!key) return { model, reachable: false };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, {
      headers: { 'x-goog-api-key': key },
      signal: controller.signal,
    });
    return { model, reachable: response.ok };
  } catch {
    return { model, reachable: false };
  } finally {
    clearTimeout(timeout);
  }
}

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error('AI_NOT_CONFIGURED'), { statusCode: 503 });
  return new GoogleGenerativeAI(key);
}

export function operationPolicy(operation: string) {
  const policies: Record<string, { model: string; maxChars: number; credits: number }> = {
    chat: { model: getModelName(), maxChars: 5000, credits: 1 },
    title: { model: getModelName(), maxChars: 3000, credits: 1 },
    structured_poll: { model: getModelName(), maxChars: 5000, credits: 2 },
    text_enhancement: { model: getModelName(), maxChars: 5000, credits: 2 },
    document: { model: getModelName(), maxChars: 5000, credits: 5 },
  };
  return policies[operation] || policies.chat;
}

export async function* streamGemini(
  operation: string,
  systemPrompt: string,
  history: Content[],
  parts: Part[],
) {
  const policy = operationPolicy(operation);
  const chat = getClient().getGenerativeModel({ model: policy.model }).startChat({ history });
  const result = await chat.sendMessageStream([{ text: `${systemPrompt}\n\nUser request:` }, ...parts]);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

export async function generateGemini(
  operation: string,
  systemPrompt: string,
  history: Content[],
  parts: Part[],
) {
  const policy = operationPolicy(operation);
  const chat = getClient().getGenerativeModel({ model: policy.model }).startChat({ history });
  const result = await chat.sendMessage([{ text: `${systemPrompt}\n\nUser request:` }, ...parts]);
  return { text: result.response.text(), model: policy.model, credits: policy.credits };
}
