# Liverton Learning: Cloudinary Implementation and Security Report

**Prepared by Manus AI**  
**Repository:** [mozemedia5/Liverton-Learning](https://github.com/mozemedia5/Liverton-Learning)  
**Reviewed commit:** `3a087a2d2536779fef9682552e80575c5764e0dc`  
**Review date:** 2026-08-22

## Executive conclusion

The current `HEAD` does **not use Cloudinary upload presets at runtime**. It uses a **server-signed direct upload** flow. The browser first calls `/api/cloudinary/sign` with a Firebase ID token; the Vercel endpoint verifies the token, creates a SHA-1 upload signature using the server-only `CLOUDINARY_API_SECRET`, and returns the Cloud name, API key, timestamp, folder, resource type, and signature. The browser then posts the file directly to Cloudinary with `api_key`, `timestamp`, `signature`, and `folder` [1] [2].

The repository history contains an earlier implementation with five named upload presets: `liverton_learning_images`, `liverton_learning_courses`, `liverton_learning_shorts`, `liverton_learning_audio`, and `liverton_learning_documents` [3]. That older implementation sent only `upload_preset` from the browser and did not send a signature, which indicates an **intended unsigned-upload design**. The repository does not contain the Cloudinary Console state, so it cannot prove whether those five presets were actually configured as unsigned or signed in the Cloudinary account. They should be verified in Cloudinary Console under **Settings → Upload → Upload presets**.

For this application, the recommended production posture is to keep the current **signed, server-authorized flow**, not to revert to public unsigned presets. Signed uploads are appropriate because Liverton Learning has authenticated users, user-specific folders, course and team content, documents, videos, and potentially sensitive educational material. The signing endpoint should be strengthened before it is treated as a complete upload-policy boundary: it currently validates the requested resource type, client-declared MIME type, and client-declared size, but it signs only `folder` and `timestamp`. The server therefore does not cryptographically bind the requested MIME type, size, file name, or business purpose to the upload.

## 1. What is present at the current `HEAD`

The shared client service defines five **application classification names**, not Cloudinary preset names: `image`, `course_video`, `short_video`, `audio`, and `document` [1]. The mapper chooses `image` for image MIME types, `audio` for audio, `course_video` for videos larger than 20 MB or for chat videos, `short_video` for other videos, and `document` for recognized document extensions or the fallback case [1]. These names are passed to `resolveResourceType`, which maps them to Cloudinary resource types: `image`, `video`, or `raw` [1].

| Application classification | Cloudinary resource type | Current upload-preset field sent? | Current signing status |
|---|---:|---:|---|
| `image` | `image` | No | Signed request |
| `course_video` | `video` | No | Signed request |
| `short_video` | `video` | No | Signed request |
| `audio` | `video` | No | Signed request |
| `document` | `raw` | No | Signed request |

The comments in the current source still say “secure presets,” and several callers use the word “preset,” but the executable code no longer defines or sends `upload_preset`. A repository-wide search found no current `upload_preset` field or current preset-name constant in the active source. The current implementation is therefore best described as **signed direct upload with application categories**, not as upload-preset-based upload.

## 2. Current call path: from UI to Cloudinary

The implementation flows as follows.

| Stage | Location | Operation |
|---|---|---|
| 1 | UI/service callers | Components and feature pages call `uploadToCloudinary(file, type, options)`; examples include profile images, documents, banners, course content, Hanna chat, and Liv Teams [4]. |
| 2 | `src/services/cloudinaryService.ts:58–72` | The client requires a signed-in Firebase user, obtains `auth.currentUser.getIdToken()`, and sends `POST /api/cloudinary/sign` with `Authorization: Bearer <Firebase ID token>`. The JSON body contains `resourceType`, `contentType`, and `size` [1]. |
| 3 | `api/cloudinary/sign.ts:11–20` | The Vercel endpoint applies CORS, permits `POST`, verifies the Firebase token through `requireIdentity`, and rejects unsupported resource types, non-positive sizes, sizes above 100 MB, or missing content types [2]. |
| 4 | `api/cloudinary/sign.ts:21–33` | The endpoint creates `folder = liverton/<Firebase UID>/<resourceType>`, sets a current Unix timestamp, and signs `folder=<folder>&timestamp=<timestamp>` with `CLOUDINARY_API_SECRET` using SHA-1 [2]. |
| 5 | `api/cloudinary/sign.ts:35–43` | The endpoint returns `cloudName`, `apiKey`, `resourceType`, `folder`, `timestamp`, `signature`, and `params` to the browser. The API key is public-identifying information; the API secret is not returned [2]. |
| 6 | `src/services/cloudinaryService.ts:188–197` | The browser constructs `https://api.cloudinary.com/v1_1/<cloudName>/<resourceType>/upload` and posts the file with `api_key`, `timestamp`, `signature`, and `folder` [1]. |
| 7 | `src/services/cloudinaryService.ts:198–237` | `XMLHttpRequest` reports progress, accepts a successful `secure_url`, and asynchronously records the asset in Firestore [1]. |

### API key and secret handling

The server reads the following environment variables in `api/cloudinary/sign.ts` [2]:

| Environment variable | Where it is read | Intended sensitivity | How it is used |
|---|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | Server signing endpoint | Public identifier | Returned to the browser and used in the Cloudinary upload URL |
| `CLOUDINARY_API_KEY` | Server signing endpoint | Public identifier / upload credential identifier | Returned to the browser as the `api_key` form field |
| `CLOUDINARY_API_SECRET` | Server signing endpoint | **Secret** | Used only on the server to generate the upload signature |
| `VITE_CLOUDINARY_CLOUD_NAME` | `.env.example` / historical client configuration | Public identifier | Historical client-side cloud-name fallback; not a secret |

The repository’s `.env.example` correctly comments that the server-side Cloudinary variables should not use the `VITE_` prefix and should not be exposed to the browser [5]. No `CLOUDINARY_API_SECRET` value should be committed to Git, embedded in frontend bundles, logged, or returned in an API response. The report intentionally does not reproduce any credential value.

## 3. Presets found in repository history

The five named presets appear in commit `35c098b`, titled “configure exactly five Cloudinary upload presets.” The historical `CLOUDINARY_CONFIG` mapped application categories to these names [3].

| Historical application purpose | Historical preset name | Historical resource type | Historical code behavior |
|---|---|---:|---|
| Images | `liverton_learning_images` | `image` | Appended as `upload_preset`; no signature was appended |
| Course and larger videos | `liverton_learning_courses` | `video` | Appended as `upload_preset`; no signature was appended |
| Short videos | `liverton_learning_shorts` | `video` | Appended as `upload_preset`; no signature was appended |
| Audio | `liverton_learning_audio` | `video` | Appended as `upload_preset`; no signature was appended |
| Documents | `liverton_learning_documents` | `raw` | Appended as `upload_preset`; no signature was appended |

The historical implementation resolved a category to `{ preset, resourceType }`, then sent `file` and `upload_preset` directly to Cloudinary [3]. That is the source-level evidence for classifying the legacy flow as **intended unsigned**. It is not evidence of the actual Console setting: a preset’s authoritative signing mode is stored in Cloudinary, not in this repository. If these presets still exist in the account, inspect each one in the Cloudinary Console and record the displayed **Signing mode**.

The current signed implementation appears to have replaced the legacy preset implementation through the repository’s secure Vercel API gateway changes. The current code does not reference the five names and does not send `upload_preset` [1] [2].

## 4. Signed versus unsigned assessment

Cloudinary documents that unsigned client-side uploads use an unsigned upload preset and the `upload_preset` request parameter, while signed uploads use a server-generated signature and timestamp. Cloudinary also states that unsigned uploads expose only a restricted set of parameters and recommends server-generated signatures for sensitive use cases [6].

| Flow | Evidence in Liverton Learning | Assessment |
|---|---|---|
| Current `HEAD` | Server endpoint uses `CLOUDINARY_API_SECRET`; browser sends `signature` and `timestamp`; no `upload_preset` | **Signed** |
| Historical five-preset flow | Browser sent `upload_preset`; no `signature`, `timestamp`, or API secret | **Intended unsigned** |
| Actual Console signing mode of legacy presets | Not stored in Git | **Unknown until checked in Cloudinary Console** |

The safest answer to “where are the presets signed or unsigned?” is therefore: **the current code has no runtime upload presets; its uploads are signed. The five historical presets were used as unsigned-style client presets, but their actual Cloudinary Console signing-mode flags cannot be determined from the repository.**

## 5. Security findings

### Strengths

The client requires Firebase authentication before requesting an upload signature [1]. The server independently verifies the Firebase ID token rather than trusting a user ID supplied by the browser [2]. It derives the destination folder from the verified Firebase UID, which limits the intended storage namespace to `liverton/<uid>/<resourceType>` [2]. The API secret remains server-side, and the browser receives only the Cloud name, API key, timestamp, and signature [2]. The upload endpoint also restricts resource types to `image`, `video`, and `raw`, and enforces a 100 MB declared-size ceiling [2].

### Issues requiring attention

First, the `contentType` and `size` values are checked but are **not included in the signed parameter string** and are not passed to Cloudinary as upload-policy parameters [2]. A caller can therefore alter the request body after the endpoint validates it, or simply submit a misleading MIME type and size. The server’s 100 MB check is a check on the JSON claim, not a verified measurement of the uploaded bytes. The application should enforce file type and byte-size policy at a trusted boundary, ideally by signing the relevant Cloudinary upload parameters and validating the Cloudinary response against the policy.

Second, the signing endpoint returns a signature for only `folder` and `timestamp`. If the client or an attacker adds other upload parameters, those parameters are not cryptographically bound by this signature. The server should construct an allowlisted parameter set and sign all security-relevant values, including the folder, resource type where applicable, public-ID policy, overwrite behavior, allowed format or MIME policy, and any moderation or access-control settings required by the product.

Third, the Firestore tracking call is asynchronous and not awaited by `uploadToCloudinary`; upload success can be returned even if tracking fails [1]. That is acceptable for availability, but it means the Firestore record is not an authoritative security or retention control. In addition, the client cleanup routine removes only Firestore tracking documents and explicitly does not delete the corresponding Cloudinary asset [1]. If the intention is seven-day deletion of temporary chat videos, deletion must be performed by a trusted server-side scheduled process using Cloudinary authenticated deletion or the Admin API; deleting only the tracking document does not delete the media.

Fourth, the repository contains comments and tests that still refer to “presets” even though the active flow is signed direct upload [1] [7]. This naming mismatch can cause future developers to configure or rotate the wrong Cloudinary settings. The code should be renamed around “upload categories” or “signed upload policy,” or the implementation should be deliberately migrated back to real presets with documented signing modes.

Finally, the current endpoint authenticates the caller but does not show role- or entitlement-based authorization. If only instructors, administrators, team members, or course owners should upload particular asset classes, that authorization should be enforced on the server before signing. Authentication alone proves identity; it does not prove permission to upload every resource type or consume 100 MB per request.

## 6. Recommendations

### Recommended target design

Keep **signed uploads** for production. Use the Vercel endpoint as a narrowly scoped upload-authority service, and never place `CLOUDINARY_API_SECRET` in frontend code. Cloudinary’s official guidance distinguishes unsigned browser uploads from server-signed uploads and recommends server-side signatures for sensitive use cases [6]. This recommendation aligns with Liverton Learning’s authenticated, multi-user, educational-content workload.

| Priority | Recommendation | Reason |
|---|---|---|
| P0 | Verify and document the five historical presets in Cloudinary Console; disable or delete unused unsigned presets | A forgotten unsigned preset can become a public upload entry point even if the current application no longer calls it |
| P0 | Keep `CLOUDINARY_API_SECRET` server-only and rotate it immediately if it has ever appeared in Git history, client bundles, logs, or shared build output | The secret can authorize signed API operations; exposure requires credential rotation |
| P0 | Change the signer to sign an explicit allowlist of upload parameters and reject client-supplied parameters outside that allowlist | Prevents tampering with folder, overwrite, public ID, transformations, access mode, and related behavior |
| P0 | Enforce authorization by user role and business object, not just Firebase authentication | Prevents any authenticated user from obtaining signatures for disallowed asset classes or destinations |
| P1 | Validate actual upload size and media type at a trusted server or post-upload verification step; do not treat browser-declared `size` and `contentType` as authoritative | Browser JSON fields are attacker-controlled |
| P1 | Add rate limits, quotas, request logging, and abuse monitoring to `/api/cloudinary/sign` | Signed uploads can still be abused by authenticated or compromised accounts |
| P1 | Implement server-side deletion for expired temporary assets and reconcile Firestore records with Cloudinary | Firestore document deletion alone does not remove the Cloudinary asset |
| P1 | Add a Cloudinary notification/webhook or post-upload verification path before publishing sensitive media | Allows moderation, type checks, and policy enforcement before the asset becomes usable |
| P2 | Update comments, tests, and names to distinguish `CloudinaryUploadType` categories from actual Cloudinary upload presets | Reduces configuration drift and maintenance errors |
| P2 | If unsigned uploads are retained for a low-risk public feature, create a separate tightly restricted unsigned preset with format, size, folder, moderation, and access controls | Unsigned is acceptable only for deliberately public, low-trust upload scenarios with strong preset guardrails [6] |

### Signed or unsigned decision

**Use signed uploads for the existing Liverton Learning flows.** Unsigned presets should not be used for course videos, documents, team resources, profile-related uploads, or chat attachments unless the product explicitly accepts public abuse risk and has an isolated, tightly restricted preset. If an unsigned flow is needed for a future public intake form, it should be separate from the authenticated signed flow, use a dedicated preset and folder, apply restrictive allowed formats and limits, enable moderation where appropriate, and be rate-limited at the application edge.

## 7. Verification checklist in Cloudinary Console

An administrator should inspect **Cloudinary Console → Settings → Upload → Upload presets** and record, for each historical name, whether the console displays `Signed` or `Unsigned`. The review should also capture allowed formats, maximum file size, folder or asset-folder behavior, overwrite behavior, public-ID behavior, access mode, moderation, notification URL, and whether the preset is still used by any deployment.

The exact names to check are:

```text
liverton_learning_images
liverton_learning_courses
liverton_learning_shorts
liverton_learning_audio
liverton_learning_documents
```

If any of these are unsigned and no current deployment requires them, disable or delete them after confirming that no external workflow depends on them. If any secret has been exposed, rotate the Cloudinary API secret and review Cloudinary activity logs.

## References

[1]: https://github.com/mozemedia5/Liverton-Learning/blob/3a087a2d2536779fef9682552e80575c5764e0dc/src/services/cloudinaryService.ts "Current Cloudinary client service"

[2]: https://github.com/mozemedia5/Liverton-Learning/blob/3a087a2d2536779fef9682552e80575c5764e0dc/api/cloudinary/sign.ts "Current Cloudinary signing endpoint"

[3]: https://github.com/mozemedia5/Liverton-Learning/blob/35c098b/src/services/cloudinaryService.ts "Historical five-preset implementation"

[4]: https://github.com/mozemedia5/Liverton-Learning/search?q=uploadToCloudinary&type=code "Cloudinary upload call sites"

[5]: https://github.com/mozemedia5/Liverton-Learning/blob/3a087a2d2536779fef9682552e80575c5764e0dc/.env.example "Repository environment-variable example"

[6]: https://cloudinary.com/documentation/client_side_uploading "Cloudinary client-side uploading and security considerations"

[7]: https://github.com/mozemedia5/Liverton-Learning/blob/3a087a2d2536779fef9682552e80575c5764e0dc/src/services/cloudinaryService.test.ts "Cloudinary service tests"
