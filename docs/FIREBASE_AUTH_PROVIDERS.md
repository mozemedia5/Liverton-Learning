# Firebase authentication provider setup

The client now uses Firebase popup authentication for Google and Apple, preserves the requested destination, waits for the Firestore profile before route guards redirect, and normalizes legacy role aliases. Firebase Console configuration is still required because authorized domains and Apple credentials are managed outside the repository.

## Authorized domains

In **Firebase Console → Authentication → Settings → Authorized domains**, add each exact hostname used by the app, without a protocol, path, or trailing slash. At minimum, add the production hostname (`liverton-learning.vercel.app` if that is the active deployment), the current Vercel preview hostname(s), and `localhost` for local development. If the app uses a custom domain, add that custom hostname as well. The hostname shown in the `auth/unauthorized-domain` error is the one that must be added.

Firebase’s default `liverton-learn.firebaseapp.com` auth domain is retained in the environment contract because it belongs to the configured `liverton-learn` project. Do not mix it with the older `liverton-learning.firebaseapp.com` project name.

## Google

In **Authentication → Sign-in method**, enable Google and select the correct project support email. Test from an authorized hostname after redeployment.

## Apple

In **Authentication → Sign-in method**, enable Apple and configure the Apple Services ID, Team ID, private key, and key ID required by Firebase. The Apple Services ID return URL must be Firebase’s OAuth redirect URL for the same project. Apple provider credentials cannot be made functional by frontend code alone.

## Code behavior

`src/contexts/AuthContext.tsx` adds Google account selection and requests Apple email/name scopes. `src/App.tsx` holds public routes on an account-loading screen until the profile role is resolved, avoiding the previous successful-login-to-landing-page race. Legacy Firestore role keys remain supported while `educator` and `organization` aliases resolve to the existing internal `teacher` and `school_admin` routes.
