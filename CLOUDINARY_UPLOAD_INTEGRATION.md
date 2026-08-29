# Cloudinary Upload Integration

This document describes the active file-upload path used by Liverton Learning.

## Architecture

Liverton Learning uses **server-signed Cloudinary uploads**. The browser never receives `CLOUDINARY_API_SECRET` and does not depend on unsigned upload presets.

1. A signed-in Firebase user selects a file in the browser.
2. `src/services/cloudinaryService.ts` requests a short-lived signature from `POST /api/cloudinary/sign` with the Firebase ID token.
3. `api/cloudinary/sign.ts` verifies the Firebase token, validates the file category, MIME type, and size, then signs the `folder` and `timestamp` parameters with the server-only Cloudinary API secret.
4. The browser uploads the file directly to the matching Cloudinary resource endpoint using the returned cloud name, API key, timestamp, signature, and folder.
5. The successful asset URL is tracked in Firestore under `uploaded_assets`.

Cloudinary signatures are valid for one hour. The signature must be generated from exactly the same signed parameters sent in the upload request.

## Server configuration

Set these variables in the **Vercel project that serves Liverton Learning**. They must not be prefixed with `VITE_` and must never be committed to Git:

```text
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_admin_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key_with_escaped_newlines
ALLOWED_ORIGINS=https://liverton-learning.vercel.app
```

The Cloudinary cloud name and API key are safe to return to the browser as part of a signed upload response. The API secret is server-only. If the API secret has ever been exposed publicly, rotate it in Cloudinary before configuring the new value in Vercel.

## Upload categories and limits

| Category | Cloudinary resource endpoint | Accepted content | Maximum size | Default folder suffix |
| --- | --- | --- | ---: | --- |
| `image` | `image/upload` | `image/*` | 20 MB | `image` |
| `course_video` | `video/upload` | `video/*` | 100 MB | `course_video` |
| `short_video` | `video/upload` | `video/*` | 100 MB | `short_video` |
| `audio` | `video/upload` | `audio/*` or generic binary audio | 100 MB | `audio` |
| `document` | `raw/upload` | PDF, office documents, text, CSV, ZIP, and RAR | 25 MB | `document` |

Each upload is written to a user-specific folder:

```text
liverton/<firebase_uid>/<upload_type>
```

The `short_video` client limit is intentionally aligned with the server limit. Files larger than 100 MB require a separate chunked-upload implementation and are rejected by the current signed endpoint.

## Cloudinary Console setup

The active implementation does **not** require the historical unsigned presets named `liverton_learning_images`, `liverton_learning_courses`, `liverton_learning_shorts`, `liverton_learning_audio`, or `liverton_learning_documents`. Those presets can remain disabled or be removed after confirming that no separate application depends on them.

The Cloudinary account must contain the API key whose secret is configured in Vercel. The cloud name, API key, and API secret must all belong to the same Cloudinary product environment. A mismatched cloud name/API key/secret combination produces Cloudinary authorization or signature errors even when the application code is correct.

## Firestore tracking and temporary chat media

Successful uploads are tracked in the `uploaded_assets` collection with the following fields:

```json
{
  "publicId": "liverton/user-id/short_video/example",
  "resourceType": "video",
  "url": "https://res.cloudinary.com/example/video/upload/example.mp4",
  "uploadedAt": "Timestamp",
  "uploader": "firebase-user-id",
  "contentType": "video/mp4",
  "referenceId": "course-or-chat-id",
  "purpose": "shorts",
  "isTemporaryChatVideo": false
}
```

Chat videos can be marked with `purpose: "chat_video"`. The client cleanup routine removes expired Firestore tracking records after seven days. Removing a Firestore record does not delete the Cloudinary asset itself; server-side deletion or a scheduled reconciliation job should be added if full storage cleanup is required.

## Troubleshooting unauthorized uploads

| Symptom | Meaning | Action |
| --- | --- | --- |
| `401 Authentication required` from `/api/cloudinary/sign` | Firebase ID token is missing or cannot be verified | Sign in again and confirm the Firebase Admin variables are present in Vercel. |
| `503 Cloudinary server configuration is incomplete` | One or more server-only variables are missing | Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and the Firebase Admin variables to the correct Vercel environment, then redeploy. |
| `Could not authorize upload` or a 500 from `/api/cloudinary/sign` | The API function failed before returning a signature | Check the Vercel runtime logs. Relative API imports must use explicit `.js` specifiers for the Node ESM runtime. |
| Cloudinary HTTP 401 after a signature was returned | The Cloudinary credentials do not match, the signature is stale, or the request parameters differ from the signed parameters | Verify that cloud name, API key, and API secret are from the same Cloudinary environment; redeploy after rotating credentials. |
| Cloudinary HTTP 400 with a file-policy message | The file type or size is outside the application policy | Use an accepted format and remain within the category limit. |

## Verification checklist

1. Confirm the Vercel deployment is built from the current `main` branch.
2. Open `/api/health` and confirm `cloudinarySigning: true` and `firebaseAdmin: true`.
3. Sign in through the deployed application.
4. Upload a small PNG first, then test one document, audio file, and video within the stated limits.
5. Confirm the Cloudinary Media Library contains the asset under the user-specific folder.
6. Confirm the corresponding `uploaded_assets` document exists in Firestore.

The health endpoint reports only whether required variables exist; it never returns secret values.

## Relevant source files

- `src/services/cloudinaryService.ts` — client signature request and direct upload.
- `api/cloudinary/sign.ts` — Firebase-authenticated server signer and upload policy.
- `api/_lib/server.ts` — Firebase Admin token verification and CORS handling.
- `api/health.ts` — non-secret deployment configuration health check.
- `src/services/cloudinaryService.test.ts` — signed-upload regression tests.

See also the [official Cloudinary signed-upload documentation](https://cloudinary.com/documentation/authentication_signatures).

See also the [official Cloudinary Upload API reference](https://cloudinary.com/documentation/image_upload_api_reference).
