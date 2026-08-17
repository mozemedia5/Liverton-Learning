import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
} from '@/lib/seo';

type RouteDefinition = {
  title: string;
  description: string;
  noIndex?: boolean;
  schemaType?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'PrivacyPolicy';
};

const PUBLIC_ROUTES: Record<string, RouteDefinition> = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    schemaType: 'WebPage',
  },
  '/get-started': {
    title: 'Get Started',
    description: 'Choose your Liverton Learning experience and join a modern learning community for students, teachers, parents and schools.',
    schemaType: 'WebPage',
  },
  '/about': {
    title: 'About Liverton Learning',
    description: 'Learn how Liverton Learning connects students, teachers, parents and schools through practical digital learning tools.',
    schemaType: 'AboutPage',
  },
  '/about/schools': {
    title: 'Learning Tools for Schools',
    description: 'Liverton Learning helps schools coordinate courses, communication, assessments and student progress in one place.',
    schemaType: 'AboutPage',
  },
  '/about/teachers': {
    title: 'Tools for Teachers',
    description: 'Create courses, teach live lessons, manage quizzes and support learners with Liverton Learning.',
    schemaType: 'AboutPage',
  },
  '/about/students': {
    title: 'Learning for Students',
    description: 'Explore courses, quizzes, live lessons and study tools designed to help students learn with confidence.',
    schemaType: 'AboutPage',
  },
  '/support': {
    title: 'Support',
    description: 'Find answers to common questions and contact the Liverton Learning support team.',
    schemaType: 'ContactPage',
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    description: 'Read the Liverton Learning privacy policy and learn how account and platform information is handled.',
    schemaType: 'PrivacyPolicy',
  },
  '/login': {
    title: 'Sign In',
    description: 'Sign in to your Liverton Learning account.',
    noIndex: true,
  },
  '/register': {
    title: 'Create an Account',
    description: 'Create a Liverton Learning account for your learning or teaching journey.',
    noIndex: true,
  },
  '/verify-email': {
    title: 'Verify Email',
    description: 'Verify your email address for Liverton Learning.',
    noIndex: true,
  },
};

const PRIVATE_PREFIXES = [
  '/student', '/teacher', '/parent', '/school-admin', '/admin', '/dashboard',
  '/chat', '/payments', '/profile', '/settings', '/calendar', '/events',
  '/features', '/zoom-lessons', '/announcements', '/documents',
];

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
}

function upsertJsonLd(data: Record<string, unknown>) {
  let element = document.head.querySelector<HTMLScriptElement>('script[data-liverton-jsonld="route"]');
  if (!element) {
    element = document.createElement('script');
    element.type = 'application/ld+json';
    element.dataset.livertonJsonld = 'route';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
}

function removeRouteJsonLd() {
  document.head.querySelector('script[data-liverton-jsonld="route"]')?.remove();
}

export default function RouteMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const definition = PUBLIC_ROUTES[pathname];
    const isPrivate = PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    const isPublicCourse = /^\/courses\/[^/]+$/.test(pathname);
    const isNotFound = !definition && !isPrivate && !isPublicCourse && pathname !== '/documents/public';
    const title = definition?.title || (isNotFound ? 'Page Not Found' : DEFAULT_TITLE);
    const description = definition?.description || (isNotFound
      ? 'The requested Liverton Learning page could not be found.'
      : DEFAULT_DESCRIPTION);
    const noIndex = definition?.noIndex || isPrivate || isNotFound;
    const canonical = absoluteUrl(pathname);
    const fullTitle = title === DEFAULT_TITLE || title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

    document.documentElement.lang = 'en';
    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('name', 'title', fullTitle);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE);
    upsertMeta('property', 'og:image:alt', `${SITE_NAME} logo`);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE);
    upsertCanonical(canonical);

    if (noIndex) {
      removeRouteJsonLd();
      return;
    }

    upsertJsonLd({
      '@context': 'https://schema.org',
      '@type': definition?.schemaType || 'WebPage',
      name: fullTitle,
      description,
      url: canonical,
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: absoluteUrl('/'),
      },
    });
  }, [pathname]);

  return null;
}
