/**
 * Central SEO configuration for Liverton Learning.
 *
 * To move from https://liverton-learning.vercel.app to https://livertonlearning.com:
 *   1. Set VITE_SITE_URL=https://livertonlearning.com in the deployment environment
 *   2. Update public/robots.txt and public/sitemap.xml host entries
 * Everything else (canonical, Open Graph, Twitter cards) follows automatically.
 */

export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://liverton-learning.vercel.app').replace(/\/$/, '');

export const SITE_NAME = 'Liverton Learning';
export const SITE_HANDLE = '@livertonlearn';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

export const DEFAULT_TITLE = 'Liverton Learning — Modern LMS & e-Learning Marketplace';
export const DEFAULT_DESCRIPTION =
  'Liverton Learning is the modern learning platform for students, teachers, parents and schools: courses, live lessons, quizzes, collaborative Liv Teams workspaces, documents and AI-powered study help.';

/** Build an absolute URL for the site from an app path. */
export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface SeoMeta {
  /** Page title (site name is appended automatically unless absolute) */
  title: string;
  /** Meta description (max ~160 chars recommended) */
  description?: string;
  /** Canonical path (defaults to current location) */
  path?: string;
  /** Absolute image URL for social cards */
  image?: string;
  /** Open Graph type */
  type?: 'website' | 'article' | 'profile';
  /** Prevent indexing (login, private workspaces, etc.) */
  noIndex?: boolean;
}
