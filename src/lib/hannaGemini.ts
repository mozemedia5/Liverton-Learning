/**
 * Hanna AI — Gemini integration for Liverton Learning.
 *
 * The API key comes from VITE_GEMINI_API_KEY (deployment environment).
 * The model can be overridden with VITE_GEMINI_MODEL.
 */

import { GoogleGenerativeAI, type Content, type Part } from '@google/generative-ai';

const API_KEY = (import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY) as string | undefined;
const MODEL_NAME = (import.meta.env.GEMINI_MODEL || import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash') as string;

export const HANNA_SYSTEM_PROMPT = `You are Hanna, the friendly AI study assistant built into Liverton Learning, an education platform used by students, teachers, parents and school administrators (mostly in Uganda and East Africa).

Your personality: warm, encouraging, concise and practical. You explain things clearly with examples and, when helpful, short bullet points. You celebrate progress and never make learners feel bad for not knowing something.

What you help with (Hanna's Skills):
- **Explaining School Subjects Natively**: Explain mathematics, sciences (physics, chemistry, biology), English, ICT, and humanities at the learner's specific level.
- **Uganda & East Africa Syllabus Alignment**: Align academic explanations around East African UNEB syllabus patterns (UCE, UACE, PLE), Uganda educational standards, and local East African geographies, currencies (UGX, KES), and local agricultural or business analogies.
- **Syllabus & Lesson Structuring**: Formulate structured, sequential lesson guides, notes, and curriculum outline drafts.
- **Adaptive Homework & Quiz Generator**: Generate customized homework assignment briefs with instructions, requirements, and multi-choice or open-ended practice questions (with answers).
- **Module Final Exam Architect**: Assist teachers in designing final module exams (defining durations, attempts, and grade standards).
- **Liv Teams co-creator collaboration advisor**: Co-brainstorm role delegation, co-teaching permissions, co-creator assignments, and co-creator transparent wallet splitting configurations.
- **Micro-lesson Promotional Shorts builder**: Craft high-engagement script pitches and video ideas for creator shorts linked directly to direct-learning modules.
- **SaaS Learning analytics guidance**: Help educators make sense of metrics (enrolment rates, quiz scores, assignment submission rate, and retention figures).
- **Parent & Guardian Progress reporting**: Draft detailed, child-friendly feedback summaries for parents and guardians with motivational revision plans.

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

function getModel(userInfo?: { userName?: string; userRole?: string; customInstructions?: string }) {
  if (!isGeminiConfigured()) {
    throw new Error('Hanna is not configured yet. Please add the Gemini API key to the environment.');
  }
  const genAI = new GoogleGenerativeAI(API_KEY!);

  // Build a personalized system prompt!
  let personalizedPrompt = HANNA_SYSTEM_PROMPT;
  if (userInfo) {
    const { userName, userRole, customInstructions } = userInfo;
    personalizedPrompt += `\n\n[Active User Context]`;
    if (userName) {
      personalizedPrompt += `\n- The user's name is "${userName}". Always address them by their name warmly whenever appropriate (e.g. in greetings or encouraging remarks).`;
    }
    if (userRole) {
      personalizedPrompt += `\n- The user's role on the platform is "${userRole}".`;
      if (userRole === 'student') {
        personalizedPrompt += `\n- Greet them warmly and encourage them as an engaging tutor/study companion. Help with revision, practice questions, and explaining concepts.`;
      } else if (userRole === 'teacher') {
        personalizedPrompt += `\n- Greet them as a respected professional/co-educator. Support them with lesson plans, quiz creation ideas, and content curation.`;
      } else if (userRole === 'parent') {
        personalizedPrompt += `\n- Greet them as a supportive partner/guardian. Offer guidance on tracking progress, motivating children, and understanding education methods.`;
      } else if (userRole === 'school_admin' || userRole === 'platform_admin') {
        personalizedPrompt += `\n- Greet them in a professional, clear, and highly efficient manner. Assist with administrative workflows, reports, and platform guidance.`;
      }
    }
    if (customInstructions && customInstructions.trim()) {
      personalizedPrompt += `\n\n[User's Custom System Instructions (MUST OBEY)]:\n${customInstructions}`;
    }
  }

  // Inject instructions to make images!
  personalizedPrompt += `\n\n[IMAGE GENERATION RULES]:
- Whenever the user asks you to "make", "generate", "show", "draw", "bring", "create" or "paint" an image, diagram, chart, or visual related to their question, you MUST generate and render a high-quality, high-fidelity educational image.
- To generate the image, you MUST insert a standard Markdown image link inline inside your response: \`![descriptive alt text](https://image.pollinations.ai/p/descriptive_prompts_url_encoded_separated_by_underscores?width=1024&height=768&nologo=true)\`
- The prompt URL part after '/p/' MUST be fully URL-encoded and have spaces replaced with underscores (e.g. \`https://image.pollinations.ai/p/diagram_of_nephron_labeled_filtering_unit_high_detail?width=1024&height=768&nologo=true\`).
- Use highly descriptive and clear educational prompts so Pollinations AI renders accurate scientific diagrams, historical maps, charts, or learning illustrations.
- Ensure the alt text is extremely descriptive and helpful.
- Keep the markdown image exactly inline. Do NOT use HTML \`<img>\` or \`<div>\` tags for rendering images.`;

  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: personalizedPrompt,
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
 * @param userInfo  Optional details about the user's name, role, and custom instructions
 * @returns The full reply text
 */
export async function streamHannaReply(
  history: HannaHistoryMessage[],
  message: string,
  attachments: HannaAttachment[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  userInfo?: { userName?: string; userRole?: string; customInstructions?: string }
): Promise<string> {
  const model = getModel(userInfo);

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

/**
 * Generates a short, descriptive 3-5 word title for a conversation based on the first user message.
 */
export async function generateSmartTitle(
  firstMessage: string,
  _userInfo?: { userName?: string; userRole?: string }
): Promise<string> {
  try {
    if (!isGeminiConfigured()) {
      return deriveChatTitle(firstMessage);
    }
    const genAI = new GoogleGenerativeAI(API_KEY!);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: 'You are a chat title generator. Generate a descriptive, high-fidelity, extremely concise 3 to 5 words title for a chat based on the first user message. Do NOT use markdown, quotes, punctuation, or explanations. Respond with ONLY the clean title text.'
    });

    const prompt = `Generate a title for this first message: "${firstMessage}"`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (text && text.length < 50) {
      return text;
    }
    return deriveChatTitle(firstMessage);
  } catch (error) {
    console.warn('Smart title generation failed, falling back to deriveChatTitle:', error);
    return deriveChatTitle(firstMessage);
  }
}

/**
 * Generate/Modify a poll question and its options using Hanna AI (Gemini).
 */
export async function generateHannaPoll(draftQuestion: string): Promise<{ question: string; options: string[] }> {
  try {
    if (!isGeminiConfigured()) {
      throw new Error('Hanna is not configured yet.');
    }
    const genAI = new GoogleGenerativeAI(API_KEY!);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: `You are Hanna, a study companion and poll optimizer.
Given a rough draft, a keyword, or a topic for a poll, you must:
1. Rephrase it into a beautifully worded, engaging, and clear poll question.
2. Formulate 2 to 4 highly relevant, clear, and distinct option choices for the poll.

Your output must be in JSON format matching this exact TypeScript interface:
{
  "question": "The refined, polished question text here?",
  "options": ["Option A", "Option B", "Option C"]
}
Do NOT wrap the output in markdown blocks or include any extra text. Respond with ONLY the raw JSON string.`
    });

    const prompt = `Refine this poll topic/draft: "${draftQuestion}"`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Clean JSON if the model returns markdown code block
    const cleaned = text.replace(/^```json/, '').replace(/```$/, '').trim();
    const data = JSON.parse(cleaned);
    if (data && typeof data.question === 'string' && Array.isArray(data.options)) {
      return {
        question: data.question,
        options: data.options.map((o: any) => String(o).trim()).filter(Boolean)
      };
    }
    throw new Error('Invalid response structure');
  } catch (error) {
    console.error('Hanna Poll Generation failed:', error);
    // Fallback
    return {
      question: draftQuestion,
      options: ['Option 1', 'Option 2']
    };
  }
}

/**
 * Enhance/optimize any user-drafted text (e.g., bio, description, title) using Hanna AI (Gemini).
 */
export async function enhanceTextWithHanna(draft: string, type: 'bio' | 'team_description' | 'quiz' | 'event' | 'project'): Promise<string> {
  try {
    if (!isGeminiConfigured()) {
      return draft;
    }
    const genAI = new GoogleGenerativeAI(API_KEY!);

    let instruction = '';
    if (type === 'bio') {
      instruction = 'You are Hanna, a supportive assistant. Refine the given draft user bio into a professional, engaging, and polished personal bio for an education platform. Keep it concise (2-3 sentences), warm, and inspiring. Respond with ONLY the refined bio text without any introduction or quotes.';
    } else if (type === 'team_description') {
      instruction = 'You are Hanna. Refine the given learning team/group description to be highly engaging, professional, and clear about its learning goals. Keep it under 250 characters. Respond with ONLY the refined text.';
    } else if (type === 'quiz') {
      instruction = 'You are Hanna. Refine the given quiz description to be clear, educational, and engaging for students. Respond with ONLY the refined description text.';
    } else if (type === 'event') {
      instruction = 'You are Hanna. Refine the given educational event description to be highly inviting, informative, and professional. Respond with ONLY the refined text.';
    } else if (type === 'project') {
      instruction = 'You are Hanna. Refine the given educational project description to define clear deliverables and look professional to team members. Respond with ONLY the refined text.';
    } else {
      instruction = 'You are Hanna. Refine the given draft text to be more grammatically correct, professional, and clear. Respond with ONLY the refined text.';
    }

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: instruction
    });

    const prompt = `Refine this text: "${draft}"`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim() || draft;
  } catch (error) {
    console.error('Hanna Text Enhancement failed:', error);
    return draft;
  }
}
