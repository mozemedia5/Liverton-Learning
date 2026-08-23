import { GoogleGenerativeAI, type Content, type Part } from '@google/generative-ai';

const ALLOWED_MODELS = new Set(['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash']);

function getModelName() {
  const requested = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  return ALLOWED_MODELS.has(requested) ? requested : 'gemini-3.6-flash';
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
