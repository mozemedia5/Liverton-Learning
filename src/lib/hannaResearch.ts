import { auth } from '@/lib/firebase';

const API_BASE_URL = (import.meta.env.VITE_VERCEL_API_BASE_URL || '').replace(/\/$/, '');
const ENDPOINT = `${API_BASE_URL}/api/hanna-research`;

export interface HannaSource {
  title: string;
  url: string;
  citedText?: string;
}

export interface HannaImageResult {
  title: string;
  url: string;
  thumbnailUrl: string;
  sourceUrl: string;
  creator?: string;
  license?: string;
}

export interface HannaResearchResult {
  answer: string;
  sources: HannaSource[];
  images: HannaImageResult[];
  model?: string;
}

async function researchRequest(query: string, mode: 'web' | 'images'): Promise<HannaResearchResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in to use Hanna web research.');
  const token = await user.getIdToken();
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, mode }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Hanna could not access external information.');
  return {
    answer: typeof body.answer === 'string' ? body.answer : '',
    sources: Array.isArray(body.sources) ? body.sources : [],
    images: Array.isArray(body.images) ? body.images : [],
    model: typeof body.model === 'string' ? body.model : undefined,
  };
}

export const researchWithHanna = (query: string) => researchRequest(query, 'web');
export const searchImagesForHanna = (query: string) => researchRequest(query, 'images');
