/**
 * Central SEO configuration for Liverton Learning.
 *
 * The Vercel deployment is the only production/public domain used by this
 * project. All canonical, Open Graph, sitemap, and AI-readable URLs use it.
 */

export const SITE_URL = 'https://liverton-learning.vercel.app';
export const SITE_DOMAIN = 'liverton-learning.vercel.app';
export const SITE_NAME = 'Liverton Learning';
export const SITE_HANDLE = '@livertonlearn';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;
export const DEFAULT_TITLE = 'Liverton Learning — Modern LMS & e-Learning Marketplace';
export const DEFAULT_DESCRIPTION =
  'Liverton Learning is the modern learning platform for students, teachers, parents and schools: courses, live lessons, quizzes, collaborative Liv Teams workspaces, documents and AI-powered study help.';

/** Build an absolute canonical URL for an application path. */
export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.split(/[?#]/, 1)[0] || '/';
  return `${SITE_URL}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

export interface SeoMeta {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
}
