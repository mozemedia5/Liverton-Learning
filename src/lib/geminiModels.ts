export type GeminiCapability = 'chat' | 'reasoning' | 'image' | 'slides' | 'video' | 'speech';

export interface GeminiModelDescriptor {
  id: string;
  label: string;
  capabilities: GeminiCapability[];
  status: 'server-supported' | 'provider-available';
  description: string;
}

/**
 * Models verified against the configured Gemini account on 2026-08-26.
 * `server-supported` is deliberately limited to the two models currently
 * allowlisted by api/_lib/gemini.ts. Other entries are recorded here for
 * capability discovery and future server operations, but are not silently
 * exposed as selectable generation paths until their operation is implemented.
 */
export const GEMINI_MODEL_CATALOG: GeminiModelDescriptor[] = [
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', capabilities: ['chat', 'reasoning', 'slides'], status: 'server-supported', description: 'Fast general-purpose learning, planning, and slide-outline generation.' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', capabilities: ['chat', 'reasoning', 'slides'], status: 'server-supported', description: 'Fast general-purpose generation with stronger reasoning context.' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', capabilities: ['chat', 'reasoning', 'slides'], status: 'provider-available', description: 'Balanced text generation and structured learning content.' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', capabilities: ['chat', 'reasoning', 'slides'], status: 'provider-available', description: 'Long-form reasoning and detailed educator planning.' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', capabilities: ['chat', 'reasoning', 'slides'], status: 'provider-available', description: 'Preview model for fast multimodal generation.' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', capabilities: ['chat', 'reasoning', 'slides'], status: 'provider-available', description: 'Preview model for complex course and assessment drafts.' },
  { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', capabilities: ['image', 'slides'], status: 'provider-available', description: 'Image-capable model for visual learning aids and image-based slides.' },
  { id: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image', capabilities: ['image', 'slides'], status: 'provider-available', description: 'Fast image generation for classroom visuals.' },
  { id: 'gemini-3-pro-image', label: 'Gemini 3 Pro Image', capabilities: ['image', 'slides'], status: 'provider-available', description: 'High-quality visual generation for polished educational slides.' },
  { id: 'nano-banana-pro-preview', label: 'Nano Banana Pro Preview', capabilities: ['image', 'slides'], status: 'provider-available', description: 'Image generation and editing model verified for this account.' },
  { id: 'veo-3.1-generate-preview', label: 'Veo 3.1', capabilities: ['video'], status: 'provider-available', description: 'Long-running video generation; requires a dedicated async operation.' },
  { id: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast', capabilities: ['video'], status: 'provider-available', description: 'Faster long-running video generation; requires a dedicated async operation.' },
  { id: 'gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash TTS', capabilities: ['speech'], status: 'provider-available', description: 'Speech synthesis model for accessible learning content.' },
];

export const SERVER_SUPPORTED_GEMINI_MODELS = GEMINI_MODEL_CATALOG.filter(model => model.status === 'server-supported');
export const IMAGE_CAPABLE_GEMINI_MODELS = GEMINI_MODEL_CATALOG.filter(model => model.capabilities.includes('image'));
export const SLIDE_CAPABLE_GEMINI_MODELS = GEMINI_MODEL_CATALOG.filter(model => model.capabilities.includes('slides'));

export function getGeminiModel(id?: string) {
  return GEMINI_MODEL_CATALOG.find(model => model.id === id) || GEMINI_MODEL_CATALOG[0];
}
