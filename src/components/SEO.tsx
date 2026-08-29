import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_HANDLE,
  SITE_NAME,
  type SeoMeta,
} from '@/lib/seo';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Declarative per-page SEO manager (no external dependencies).
 * Sets document title, description, canonical URL, Open Graph and
 * Twitter card metadata for the current page. On unmount it restores
 * the site defaults so every page always has complete metadata.
 */
export function SEO({ title, description, path, image, type = 'website', noIndex = false }: SeoMeta) {
  const location = useLocation();
  const currentPath = path ?? location.pathname;

  useEffect(() => {
    const fullTitle = title === DEFAULT_TITLE || title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`;
    const desc = description || DEFAULT_DESCRIPTION;
    const url = absoluteUrl(currentPath);
    const img = image || DEFAULT_OG_IMAGE;

    document.title = fullTitle;

    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('name', 'title', fullTitle);

    // Open Graph (WhatsApp, Facebook, LinkedIn, Threads, Discord, Telegram, Instagram)
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', img);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', title);

    // Twitter / X / Threads
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:site', SITE_HANDLE);
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', img);
    upsertMeta('name', 'twitter:image:alt', title);

    upsertCanonical(url);

    return () => {
      // Restore site defaults for the next page
      document.title = DEFAULT_TITLE;
      upsertMeta('name', 'description', DEFAULT_DESCRIPTION);
      upsertMeta('name', 'robots', 'index, follow');
      upsertMeta('name', 'title', DEFAULT_TITLE);
      upsertMeta('property', 'og:type', 'website');
      upsertMeta('property', 'og:title', DEFAULT_TITLE);
      upsertMeta('property', 'og:description', DEFAULT_DESCRIPTION);
      upsertMeta('property', 'og:url', absoluteUrl('/'));
      upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE);
      upsertMeta('name', 'twitter:title', DEFAULT_TITLE);
      upsertMeta('name', 'twitter:description', DEFAULT_DESCRIPTION);
      upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE);
      upsertCanonical(absoluteUrl('/'));
    };
  }, [title, description, currentPath, image, type, noIndex]);

  return null;
}
