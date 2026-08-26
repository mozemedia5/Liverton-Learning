import { GoogleGenerativeAI, type Content, type Part } from '@google/generative-ai';

const DEFAULT_MODEL = 'gemini-3.6-flash';
const STABLE_ENV_MODELS = new Set(['gemini-3.6-flash', 'gemini-3.7-flash']);
const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
]);

export function getModelName(requestedModel?: string) {
  if (requestedModel?.trim() && ALLOWED_MODELS.has(requestedModel.trim())) return requestedModel.trim();
  const environmentModel = process.env.GEMINI_MODEL?.trim();
  return environmentModel && STABLE_ENV_MODELS.has(environmentModel) ? environmentModel : DEFAULT_MODEL;
}

export function isAllowedGeminiModel(model: string) {
  return ALLOWED_MODELS.has(model);
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

function modelCandidates(requestedModel?: string) {
  const selected = getModelName(requestedModel);
  const alternate = selected === 'gemini-3.6-flash' ? 'gemini-3.7-flash' : 'gemini-3.6-flash';
  return selected === alternate ? [selected] : [selected, alternate];
}

function isRetryableProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('429') || message.includes('404') || message.includes('RESOURCE_EXHAUSTED') || message.includes('model not found');
}

function providerError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (isRetryableProviderError(error)) {
    return Object.assign(new Error(message.includes('429') || message.includes('RESOURCE_EXHAUSTED') ? 'AI_QUOTA_EXCEEDED' : 'AI_MODEL_UNAVAILABLE'), { statusCode: 429 });
  }
  return error;
}

export function operationPolicy(operation: string, requestedModel?: string) {
  const model = getModelName(requestedModel);
  const policies: Record<string, { model: string; maxChars: number; credits: number }> = {
    chat: { model, maxChars: 5000, credits: 1 },
    title: { model, maxChars: 3000, credits: 1 },
    structured_poll: { model, maxChars: 5000, credits: 2 },
    text_enhancement: { model, maxChars: 5000, credits: 2 },
    document: { model, maxChars: 5000, credits: 5 },
  };
  return policies[operation] || policies.chat;
}

export async function* streamGemini(
  operation: string,
  systemPrompt: string,
  history: Content[],
  parts: Part[],
  requestedModel?: string,
) {
  void operation;
  let lastError: unknown;
  const candidates = modelCandidates(requestedModel);
  for (const model of candidates) {
    try {
      const chat = getClient().getGenerativeModel({ model }).startChat({ history });
      const result = await chat.sendMessageStream([{ text: `${systemPrompt}\n\nUser request:` }, ...parts]);
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
      return;
    } catch (error) {
      lastError = error;
      if (!isRetryableProviderError(error) || model === candidates.at(-1)) throw providerError(error);
    }
  }
  throw providerError(lastError);
}

export async function generateGemini(
  operation: string,
  systemPrompt: string,
  history: Content[],
  parts: Part[],
  requestedModel?: string,
) {
  const policy = operationPolicy(operation, requestedModel);
  let lastError: unknown;
  const candidates = modelCandidates(requestedModel);
  for (const model of candidates) {
    try {
      const chat = getClient().getGenerativeModel({ model }).startChat({ history });
      const result = await chat.sendMessage([{ text: `${systemPrompt}\n\nUser request:` }, ...parts]);
      return { text: result.response.text(), model, credits: policy.credits };
    } catch (error) {
      lastError = error;
      if (!isRetryableProviderError(error) || model === candidates.at(-1)) throw providerError(error);
    }
  }
  throw providerError(lastError);
}
