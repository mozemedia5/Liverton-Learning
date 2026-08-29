# Verification notes

The Vite production bundle succeeds when run directly with `./node_modules/.bin/vite build`. Direct TypeScript checking succeeds with `./node_modules/.bin/tsc --noEmit`; the repository-level `pnpm check` is blocked by pnpm’s ignored-build-scripts policy, not by a TypeScript error.

The public landing route renders successfully in Chromium and preserves the existing Liverton editorial refresh. The protected educator route correctly redirects to `/login` when no authenticated Firebase session is present, so the authenticated shell cannot be visually exercised without credentials. The browser console only reported a service-worker dynamic-import warning from the local Vite development environment; no React render exception appeared.
