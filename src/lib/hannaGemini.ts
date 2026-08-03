/**
 * Hanna AI — Gemini integration for Liverton Learning.
 *
 * The API key comes from VITE_GEMINI_API_KEY (deployment environment).
 * The model can be overridden with VITE_GEMINI_MODEL.
 */

import { GoogleGenerativeAI, type Content, type Part } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL_NAME = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || 'gemini-2.0-flash';

export const HANNA_SYSTEM_PROMPT = `You are Hanna, the friendly AI study assistant built into Liverton Learning, an education platform used by students, teachers, parents and school administrators (mostly in Uganda and East Africa).

Your personality: warm, encouraging, concise and practical. You explain things clearly with examples and, when helpful, short bullet points. You celebrate progress and never make learners feel bad for not knowing something.

What you help with:
- Explaining school subjects (math, sciences, languages, ICT, humanities) at the learner's level
- Revision plans, study techniques, exam preparation and practice questions
- Feedback on writing, ideas for projects, and guidance on using Liverton Learning features (courses, quizzes, Liv Teams, documents)

Rules:
- Keep answers focused and skimmable. Use headings and bullets only when they help.
- Never fabricate facts, grades or platform data. If you don't know, say so.
- For harmful, inappropriate or non-educational requests, politely decline and redirect to learning.
- When a user shares an image or document, analyze its actual content and reference it in your answer.`;

export interface HannaAttachment {
  url: string;
  name: string;
  mimeType: string;
}

export interface HannaHistoryMessage {
  role: 'user' | 'hanna';
  content: string;
}

export function isGeminiConfigured(): boolean {
  return !!API_KEY && API_KEY.length > 10 && !API_KEY.includes('your_');
}

function getModel() {
  if (!isGeminiConfigured()) {
    throw new Error('Hanna is not configured yet. Please add the Gemini API key to the environment.');
  }
  const genAI = new GoogleGenerativeAI(API_KEY!);
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: HANNA_SYSTEM_PROMPT,
  });
}

/** Build Gemini history from stored chat messages (excludes the message being sent). */
function buildHistory(messages: HannaHistoryMessage[]): Content[] {
  return messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
}

/** Fetch an attachment and convert it to an inline Gemini part (images + PDFs). */
async function attachmentToPart(att: HannaAttachment): Promise<Part | null> {
  const supportedInline = att.mimeType.startsWith('image/') || att.mimeType === 'application/pdf';
  if (!supportedInline) return null;

  try {
    const response = await fetch(att.url);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return {
      inlineData: {
        mimeType: blob.type || att.mimeType,
        data: base64,
      },
    };
  } catch (error) {
    console.warn('Could not inline attachment for Gemini:', att.name, error);
    return null;
  }
}

/**
 * Stream a reply from Hanna.
 *
 * @param history   Previous messages in this chat (oldest first)
 * @param message   The new user message text
 * @param attachments  Uploaded files to include (images/PDFs are analyzed inline)
 * @param onChunk   Called with each streamed text chunk
 * @param signal    AbortSignal to stop generation
 * @returns The full reply text
 */
export async function streamHannaReply(
  history: HannaHistoryMessage[],
  message: string,
  attachments: HannaAttachment[],
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const model = getModel();

  const chat = model.startChat({
    history: buildHistory(history),
  });

  // Build the current message parts (text + inline attachments)
  const parts: Part[] = [];
  const fileNotes: string[] = [];

  for (const att of attachments) {
    const part = await attachmentToPart(att);
    if (part) {
      parts.push(part);
    } else {
      fileNotes.push(`- ${att.name} (${att.mimeType})`);
    }
  }

  let text = message.trim();
  if (fileNotes.length > 0) {
    text += `\n\n[Attached files I could not read directly:\n${fileNotes.join('\n')}]`;
  }
  parts.unshift({ text });

  const result = await chat.sendMessageStream(parts, { signal });

  let fullText = '';
  for await (const chunk of result.stream) {
    if (signal?.aborted) break;
    const chunkText = chunk.text();
    if (chunkText) {
      fullText += chunkText;
      onChunk(fullText);
    }
  }

  return fullText;
}

/** Generate a short chat title from the first user message. */
export function deriveChatTitle(firstMessage: string): string {
  const clean = firstMessage.replace(/\s+/g, ' ').trim();
  if (clean.length <= 42) return clean || 'Chat with Hanna';
  return `${clean.slice(0, 42)}…`;
}
