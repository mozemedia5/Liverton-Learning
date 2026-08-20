/**
 * Central SEO configuration for Liverton Learning.
 *
 * `learn.liverton.com` is the preferred public origin. The Vercel deployment
 * remains supported as an alternate host so previews and the current production
 * URL continue to render complete metadata and crawler directives.
 */

export const PRIMARY_SITE_URL = 'https://learn.liverton.com';
export const VERCEL_SITE_URL = 'https://liverton-learning.vercel.app';
export const SITE_URL = PRIMARY_SITE_URL;

const SUPPORTED_SITE_URLS = new Set([PRIMARY_SITE_URL, VERCEL_SITE_URL]);

/** Return the preferred canonical origin for the current host. */
export function getCanonicalOrigin(): string {
  if (typeof window !== 'undefined') {
    const currentOrigin = `${window.location.protocol}//${window.location.host}`.replace(/\/$/, '');
    if (SUPPORTED_SITE_URLS.has(currentOrigin)) return PRIMARY_SITE_URL;
  }
  return SITE_URL;
}

export const SITE_DOMAIN = 'learn.liverton.com';
export const SITE_NAME = 'Liverton Learning';
export const SITE_HANDLE = '@livertonlearn';
export const DEFAULT_OG_IMAGE = `${PRIMARY_SITE_URL}/logo.png`;
export const DEFAULT_TITLE = 'Liverton Learning — Modern LMS & e-Learning Marketplace';
export const DEFAULT_DESCRIPTION =
  'Liverton Learning is the modern learning platform for students, teachers, parents and schools: courses, live lessons, quizzes, collaborative Liv Teams workspaces, documents and AI-powered study help.';

/** Build an absolute canonical URL for an application path. */
export function absoluteUrl(path: string): string {
  const base = getCanonicalOrigin();
  if (!path) return base;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.split(/[?#]/, 1)[0] || '/';
  return `${base}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

export interface SeoMeta {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
}
