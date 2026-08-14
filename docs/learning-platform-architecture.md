# Learning platform architecture

## Module and Work Hub

Modules remain stored in the existing `courses` collection for backward compatibility. New code normalizes those records through `src/types/learning.ts`, where a module owns ordered lessons, required assignments, optional quizzes, live lessons, publication state and final assessment metadata.

A teacher has one Work Hub at `workHubs/{teacherUid}`. The owner is the only member-management authority. Members carry an explicit role and permission list; Liv Teams remain a separate collaboration/community feature and do not grant Work Hub permissions.

## Upload purposes

| Purpose | Resource | Preset |
| --- | --- | --- |
| `profile_image` | image | `liverton_learning_images` |
| `module_cover` | image | `liverton_learning_images` |
| `module_video` | video | `liverton_learning_courses` |
| `short_video` | video | `liverton_learning_shorts` |
| `banner_image` | image | `liverton_learning_banners` |
| `banner_video` | video | `liverton_learning_banners` |
| `document` | raw | `liverton_learning_documents` |
| `audio` | video/audio | `liverton_learning_audio` |

Callers must select the purpose explicitly for module media. The uploader reports real XHR progress and tracks successful assets in `uploaded_assets`; provider names should not appear in user-facing copy. Production cleanup must be performed server-side using the stored public ID and verified webhook signatures.

## Notifications

Notification events should be created server-side after verified enrollment, lesson release, assignment/quiz publication and live-lesson scheduling. Use a stable event key such as `enrollment:{studentId}:{moduleId}` to prevent duplicates, honor notification preferences, persist delivery attempts, and deep-link to `/modules/{moduleId}` or the exact lesson/live-lesson route. Email and WhatsApp delivery must use configured providers; an unavailable provider is reported as pending configuration rather than simulated success.

## Configuration checklist

- Configure the named unsigned upload presets in Cloudinary and the matching `VITE_CLOUDINARY_CLOUD_NAME`.
- Configure server-side Cloudinary API credentials and a signed webhook endpoint in Cloud Functions for deletion/asset lifecycle events.
- Configure the selected email and WhatsApp providers in Functions; keep credentials server-side.
- Deploy Firestore rules and Cloud Functions before enabling public enrollment, review aggregation or notification delivery.
