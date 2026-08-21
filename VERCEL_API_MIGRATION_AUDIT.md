# Liverton Learning API and Vercel Migration Audit

## Executive conclusion

The current Liverton Learning application is a **Vite frontend with Firebase client services, direct Cloudinary uploads, legacy Firebase Functions, and one incomplete Vercel-style OTP route**. The repository does not currently contain a complete Vercel serverless API layer for Hanna, Cloudinary signing, Firebase Admin operations, or external notification delivery.

The safest migration is not to replace Firebase entirely. Firebase should remain the browser-facing authentication, Firestore, and Storage platform because the application already depends on Firebase Auth and Firestore rules throughout the UI. Vercel should become the server-side API layer for privileged operations: Hanna/Gemini, signed Cloudinary operations, OTP/email delivery, payment webhooks, and any future administrative service calls. The browser should call same-origin routes such as `/api/hanna` and `/api/cloudinary/sign`, while Firebase client reads and writes should continue to be protected by Firestore and Storage rules.

> **Critical finding:** The Gemini key must be moved to a server-only Vercel variable named `GEMINI_API_KEY`. It must never use a `VITE_` prefix. Vite exposes `VITE_*` variables to the browser bundle.

The working tree contains a local secure-gateway implementation under `functions/src/hannaGateway.ts` and `functions/src/aiProvider.ts`, but Firebase Functions deployment is not available in the current environment. That work must not be published as-is if the frontend points to a Firebase Function that has not been deployed. It should be adapted into a root Vercel API function instead.

## Current architecture inventory

| Integration | Current implementation | Current endpoint or access path | Audit result |
|---|---|---|---|
| Firebase Auth | Firebase Web SDK in `src/lib/firebase.ts` and `AuthContext` | Browser SDK | Appropriate to retain, provided Firebase Auth and Firestore rules remain authoritative. |
| Firestore | Many frontend services read and write directly through the Firebase Web SDK | Browser SDK | Retain for ordinary user-scoped operations; review every rule for resource-level authorization. Do not bypass rules with unrestricted server credentials. |
| Firebase Storage | Firebase Web SDK is used by some profile/document flows | Browser SDK | Retain only where Storage Rules validate ownership, content type, and size. |
| Firebase Functions | Legacy endpoints in `functions/src/index.ts` and `functions/src/hannaAI.ts` | `onRequest` and `onCall` | Several legacy `onRequest` functions trust request-body `userId` values and should be deprecated or hardened. |
| Hanna/Gemini | The old browser implementation directly imported the Gemini SDK; the working tree now contains a gateway client | Previously browser SDK; local gateway currently targets a Firebase Functions URL | The browser SDK must remain removed. The gateway should move to `/api/hanna` on Vercel. |
| Cloudinary | Direct unsigned browser uploads in `src/services/cloudinaryService.ts` | `https://api.cloudinary.com/v1_1/{cloudName}/{resourceType}/upload` | Public cloud name and unsigned preset identifiers are exposed. This can be acceptable for low-risk public uploads, but signed server-issued uploads are safer. |
| OTP | `src/app/api/send-otp/route.ts` | Intended `/api/send-otp` | The route currently only logs the OTP. It is not a real mail-delivery implementation. Under this Vite setup, `src/app/api` is not a reliable Vercel serverless-function location. |
| Vercel | `vercel.json` contains SPA rewrites and cache headers | Static Vite deployment | No complete root `api/` directory or API deployment contract is currently present. |
| External content proxy | `DashboardBanners.tsx` calls `api.allorigins.win` | Browser `fetch` | External proxy usage creates privacy, availability, and SSRF/content-trust concerns. Replace with a controlled Vercel route or remove it. |
| Wikipedia | `TakeQuiz.tsx` calls Wikipedia REST endpoints | Browser `fetch` | Low-risk public lookup, but add timeout, response validation, and fallback handling. |
| PDF.js | `DocumentEditor.tsx` loads scripts from cdnjs | External script URL | Pin integrity/version or bundle through the application where possible. |

## Exact Vercel environment-variable contract

Vercel should have separate **Production**, **Preview**, and **Development** values. The names below are the recommended contract for this project.

### Public frontend variables

These variables are intentionally available to the browser because they are required by the Firebase Web SDK or Cloudinary delivery/upload configuration. They are not sufficient to administer Firebase or Cloudinary by themselves.

| Variable | Required | Purpose |
|---|---:|---|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Web SDK configuration. Treat as public configuration, not an admin secret. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain. |
| `VITE_FIREBASE_DATABASE_URL` | If Realtime Database is used | Realtime Database URL. |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project identifier; for the renamed project this should be `liverton-learn`. |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase Storage bucket. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging configuration. |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase Web App ID. |
| `VITE_CLOUDINARY_CLOUD_NAME` | Yes for current direct uploads | Cloudinary cloud name. |
| `VITE_VERCEL_API_BASE_URL` | Optional | Leave empty in production when using same-origin `/api/*`; use only for a separate preview/API origin. |

The current code hardcodes Cloudinary upload preset names rather than reading them from environment variables: `liverton_learning_images`, `liverton_learning_courses`, `liverton_learning_shorts`, `liverton_learning_audio`, and `liverton_learning_documents`. These should either remain fixed public preset identifiers with strict unsigned-preset restrictions or be replaced by the signed-upload route described below.

The following variables should **not** remain in the frontend environment:

| Do not expose | Reason |
|---|---|
| `VITE_GEMINI_API_KEY` | Any `VITE_*` value is eligible for inclusion in the browser bundle. |
| `VITE_FIREBASE_CLIENT_EMAIL` | Service-account identity must remain server-side. |
| `VITE_FIREBASE_PRIVATE_KEY` | Full Firebase Admin credential. Never expose. |
| `VITE_CLOUDINARY_API_SECRET` | Cloudinary signing secret. Never expose. |
| `VITE_RESEND_API_KEY` | Email-provider secret. Never expose. |
| `VITE_PAYMENT_SECRET` or webhook signing secrets | Financial and webhook credentials. Never expose. |

### Server-only Vercel variables

These variables should be configured without the `VITE_` prefix and should only be read by files under Vercel serverless functions or server-side code.

| Variable | Required for | Purpose |
|---|---:|---|
| `GEMINI_API_KEY` | `/api/hanna` | Server-side Gemini authentication. |
| `GEMINI_MODEL` | `/api/hanna` | Server-selected default model, validated against an allowlist. |
| `FIREBASE_PROJECT_ID` | Any Firebase Admin route | Firebase Admin project ID. |
| `FIREBASE_CLIENT_EMAIL` | Any Firebase Admin route | Firebase Admin service-account client email. |
| `FIREBASE_PRIVATE_KEY` | Any Firebase Admin route | Firebase Admin private key, preserving escaped newlines. |
| `CLOUDINARY_CLOUD_NAME` | Signed upload route | Server-side Cloudinary account identifier. |
| `CLOUDINARY_API_KEY` | Signed upload route | Cloudinary API key for signing. |
| `CLOUDINARY_API_SECRET` | Signed upload route | Cloudinary signing secret. |
| `ALLOWED_ORIGINS` | All API routes | Comma-separated approved browser origins; use same-origin by default. |
| `AI_REQUEST_TIMEOUT_MS` | `/api/hanna` | Provider timeout limit, for example `30000`. |
| `AI_MAX_OUTPUT_TOKENS` | `/api/hanna` | Server-side output limit. |
| `AI_MAX_CREDITS_PER_REQUEST` | `/api/hanna` | Server-side usage guard. |
| `RESEND_API_KEY` | `/api/send-otp` or notifications | Server-side email delivery. |
| `CRON_SECRET` | Scheduled Vercel jobs | Authentication for scheduled maintenance routes. |
| `WEBHOOK_SIGNING_SECRET` | Payment or external webhooks | Verification of inbound webhook signatures. |

Vercel environment values must be configured in the Vercel project settings. The repository should contain only `.env.example` names and placeholder values; it must not contain production secret values.

## Firebase audit

### What Firebase is doing correctly

The application uses Firebase Auth in the browser, and many Firestore operations are scoped to the authenticated user or team. Firebase API keys in `VITE_FIREBASE_API_KEY` are Web SDK configuration values, not equivalent to a service-account private key. Firebase’s primary protection must therefore be the Auth state plus Firestore and Storage Rules, not secrecy of the Web SDK key.

### Risks requiring attention

The legacy HTTP Functions in `functions/src/index.ts` accept fields such as `userId`, `userName`, and `userRole` from request bodies. That is an insecure trust boundary if those functions remain publicly callable. A user should not be able to replace `userId` in a request and read or write another user’s records. Each legacy endpoint should either be removed from deployment, wrapped in Firebase token verification, or changed to use only the verified token identity.

The local gateway work correctly begins with a Bearer token and `verifyIdToken`, but it is still built for Firebase Functions. The equivalent Vercel implementation must use the Firebase Admin SDK with `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` server variables, then apply resource-level authorization for every chat, team, project, file, funding, and marketplace identifier.

The Firebase client should remain responsible for ordinary Firestore operations only when Firestore Rules enforce the same ownership or membership boundary. A Vercel route using the Firebase Admin SDK bypasses Firestore Rules, so every Admin SDK read and write must perform its own authorization check.

## Cloudinary audit

The current upload flow is direct browser-to-Cloudinary using unsigned presets. The browser sends the file, receives a `secure_url`, and asynchronously writes an `uploaded_assets` document to Firestore. This has several risks.

First, the Cloudinary cloud name and preset identifiers are public. Anyone who discovers an unsigned preset can attempt uploads within the preset’s limits. Second, the client trusts the returned URL and stores it in Firestore. Third, cleanup only deletes the Firestore tracking document; it does not delete the Cloudinary asset. Fourth, the file mapper checks extensions and MIME types, but the server-side Cloudinary preset remains the final enforcement point and must restrict size, formats, transformations, and folders.

The recommended Vercel migration is a `/api/cloudinary/sign` route. The browser authenticates with Firebase, sends metadata to Vercel, Vercel verifies the Firebase token and resource authorization, creates a short-lived Cloudinary signature using `CLOUDINARY_API_SECRET`, and returns only the signed upload parameters. The browser can still upload directly to Cloudinary for progress performance, but the signing secret never leaves Vercel. The route should validate the allowed resource type, MIME type, size, destination folder, and reference ownership.

## Gemini/Hanna audit

The old architecture used the Gemini SDK in `src/lib/hannaGemini.ts`, which was unsafe because provider credentials and model calls were browser-side. The current local working tree removes the browser Gemini SDK and routes Hanna requests through an authenticated gateway client. That direction is correct.

The remaining migration work is to move the gateway from Firebase Functions to a Vercel function, preferably `api/hanna.ts`. The route should authenticate the Firebase ID token, load only authorized context, enforce message and attachment limits, select an allowlisted model server-side, apply timeout/retry limits, and return an SSE stream. The client should call same-origin `/api/hanna` with `Authorization: Bearer <Firebase ID token>`.

The server route must not trust `userId`, `userName`, `userRole`, `model`, `credits`, `teamId`, `projectId`, or attachment URLs merely because they arrived in JSON. It should derive identity from the token, validate the requested resource against the authenticated user, ignore client-selected expensive models, and authorize every contextual record before including it in the prompt.

The current gateway’s attachment policy only permits Cloudinary hosts and limits the size. In the Vercel version this should be retained, but the stronger design is to send a stored asset ID rather than a raw URL. Vercel can then load the asset metadata from Firebase, verify ownership, and fetch the authorized file.

## Vercel endpoint design

Because this repository is a Vite project, the current `src/app/api/send-otp/route.ts` is not a reliable Vercel Function location. The migration should create root-level TypeScript functions under `api/`.

| Route | Method | Responsibility | Authentication |
|---|---|---|---|
| `/api/hanna` | `POST` | Stream Hanna/Gemini responses, structured operations, and safe contextual answers. | Firebase ID token required. |
| `/api/cloudinary/sign` | `POST` | Issue short-lived signed upload parameters after authorization and file validation. | Firebase ID token required. |
| `/api/send-otp` | `POST` | Send OTP through Resend or another server-side provider. Never log the OTP. | Required for registration flow; rate-limited. |
| `/api/health` | `GET` | Return non-sensitive service readiness information. | Public or protected, but never reveal secrets. |
| `/api/webhooks/payment` | `POST` | Verify payment-provider signatures and update authoritative records. | Signature verification, not browser auth. |
| `/api/cron/notifications` | `POST` | Idempotent scheduled reminders. | `CRON_SECRET` plus idempotency. |

The Vercel route layout should be:

```text
api/
  hanna.ts
  cloudinary/
    sign.ts
  send-otp.ts
  health.ts
  webhooks/
    payment.ts
  cron/
    notifications.ts
```

The frontend helper should use a same-origin base by default:

```ts
const API_BASE_URL = import.meta.env.VITE_VERCEL_API_BASE_URL || '';
const response = await fetch(`${API_BASE_URL}/api/hanna`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
  },
  body: JSON.stringify({ chatId, message, attachments }),
});
```

Same-origin calls are preferable because they avoid a separate CORS trust list in production. If a separate API origin is used for previews, `ALLOWED_ORIGINS` must be validated server-side and not replaced by `Access-Control-Allow-Origin: *`.

## API request risks and measures

| Risk | Evidence in current app | Required measure |
|---|---|---|
| Browser-side provider secret exposure | Old Gemini client and legacy Firebase code paths | Remove browser SDK and all `VITE_GEMINI` values. Use `GEMINI_API_KEY` only in Vercel server functions. |
| IDOR / user impersonation | Legacy Functions accept body `userId` | Verify Firebase token; derive user identity from token; authorize exact resource. |
| Public unsigned Cloudinary abuse | Direct unsigned presets in `cloudinaryService.ts` | Use signed Vercel upload parameters or strict unsigned presets with quotas. |
| Oversized or malicious files | Client-side checks only | Enforce server/preset size, MIME, extension, resource-type, and folder policy. |
| SSRF through user URLs | Attachment and external URL flows | Do not fetch arbitrary URLs; use asset IDs or allowlisted hosts and timeouts. |
| OTP leakage | Current route logs OTP instead of sending it | Use Resend server-side, never log OTPs, hash/store challenges with expiry and attempt limits. |
| Unbounded AI cost | Current generation has no integrated reservation/usage path | Server-side pricing, rate limits, per-request caps, team-credit reservation, usage ledger, and timeout. |
| Model abuse | Client can potentially request model values | Server-side allowlist and operation-to-model mapping. |
| Prompt/data leakage | Context is assembled broadly in older code | Query only authorized records and minimize context. |
| Replay/duplicate mutations | No universal idempotency contract | Require idempotency keys for writes, payments, credits, task creation, and notifications. |
| CORS abuse | Existing Functions use permissive CORS | Prefer same-origin Vercel routes; otherwise validate exact origins. |
| Stale server route | Static rewrites only in `vercel.json` | Add root `api/` functions and test deployment routes directly. |
| External proxy risk | `api.allorigins.win` usage in `DashboardBanners.tsx` | Replace with a controlled route or restrict to trusted sources. |

## What should be replaced

The first replacement should be the Hanna call path. Replace the frontend’s `VITE_FIREBASE_FUNCTIONS_URL` dependency with same-origin `/api/hanna`, move the current provider abstraction into `api/_lib/aiProvider.ts`, and move Firebase Admin authentication/context helpers into `api/_lib/firebaseAdmin.ts`.

The second replacement should be the legacy public Hanna HTTP Functions. They should no longer be the primary path. After the Vercel route is verified, remove their exports from the deployed Functions bundle or harden them and return a deprecation response. Do not leave multiple unaudited AI paths active.

The third replacement should be the OTP route. Move it from `src/app/api/send-otp/route.ts` to root `api/send-otp.ts`, connect a server-only email provider, rate-limit by email and IP, hash the challenge, expire it, cap attempts, and never log the OTP.

The fourth replacement should be Cloudinary direct unsigned uploads for sensitive documents. Use `/api/cloudinary/sign` for authenticated or private content while optionally retaining unsigned direct uploads for public images with restrictive presets.

## Recommended migration sequence

1. Add root Vercel API functions and shared server-only helpers.
2. Configure the public Firebase variables and server-only Vercel variables listed above.
3. Deploy `/api/health` and verify the route is actually available in the Vite/Vercel deployment.
4. Deploy `/api/hanna` with Firebase token verification, allowlisted Gemini model selection, request limits, and SSE streaming.
5. Change `src/lib/hannaGemini.ts` to call same-origin `/api/hanna`.
6. Test authenticated, unauthenticated, expired-token, wrong-chat, oversized-message, attachment, timeout, and provider-failure cases.
7. Deploy `/api/cloudinary/sign` and migrate document/private uploads.
8. Replace the OTP stub with `/api/send-otp.ts` and a server-side provider.
9. Deprecate or remove the legacy Firebase AI Functions after production verification.
10. Add AI usage, audit, notification, and event records as separate authoritative backend services.

## Final decision

**Use Firebase client SDK for Auth, Firestore, and ordinary Storage operations. Use Vercel serverless API functions for privileged operations and external provider calls. Do not put Gemini, Cloudinary signing, Firebase Admin, email, or payment secrets into Vite-exposed variables.**

The most important immediate code change is not to point the frontend at a Firebase Function URL. It is to create a real root-level `/api/hanna` Vercel endpoint, then change the frontend to call that same-origin endpoint. The current `src/app/api/send-otp/route.ts` should not be treated as proof that Vercel API routing is working in this Vite project.

No production behavior should be switched until `/api/health` and `/api/hanna` are deployed and directly verified. This staged approach avoids the prior failure mode where the UI changed before the server endpoint existed.

## Evidence files reviewed

| Repository path | Relevance |
|---|---|
| `src/lib/firebase.ts` | Firebase Web SDK configuration and public environment variables. |
| `src/services/cloudinaryService.ts` | Direct upload URL construction, unsigned presets, asset tracking, and cleanup. |
| `src/lib/hannaGemini.ts` | Hanna client request path and provider boundary. |
| `functions/src/index.ts` | Legacy public Firebase HTTP Functions and body-trusted identity fields. |
| `functions/src/hannaAI.ts` | Legacy callable Gemini implementation. |
| `functions/src/hannaGateway.ts` | Local secure-gateway draft that should be adapted to Vercel. |
| `functions/src/aiProvider.ts` | Local provider abstraction and server-side model selection draft. |
| `src/app/api/send-otp/route.ts` | Existing incomplete OTP route. |
| `vercel.json` | Vercel SPA rewrite and cache configuration. |
| `.env.example` | Current project environment-variable contract. |
| `firestore.rules` | Firebase-side authorization boundaries. |
