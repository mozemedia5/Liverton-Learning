# Comprehensive Cloudinary Upload Presets & Asset Architecture Report

This report provides a complete, technical overview of how media uploads and Cloudinary upload presets are configured, invoked, and managed across the Liverton Learning platform.

---

## 1. Configured Upload Presets & Classification

The application uses five dedicated, unsigned Cloudinary upload presets. Each preset is tailored for specific file types, payload sizes, and storage behaviors:

| Preset Identifier | Purpose | File Types Supported | Cloud Name / Target Endpoint |
| :--- | :--- | :--- | :--- |
| `liverton_learning_images` | Profile pictures, module covers, event banners, and image attachments | `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.gif` | `https://api.cloudinary.com/v1_1/fbciycdw/image/upload` |
| `liverton_learning_courses` | Full course lectures, HD instructional videos (>20MB), and chat videos | `.mp4`, `.mov`, `.webm`, `.avi`, `.mkv` | `https://api.cloudinary.com/v1_1/fbciycdw/video/upload` |
| `liverton_learning_shorts` | Micro promotional teasers, educational shorts (<=20MB) | `.mp4`, `.mov`, `.webm` | `https://api.cloudinary.com/v1_1/fbciycdw/video/upload` |
| `liverton_learning_audio` | Voice messages, audio notes, and podcast materials | `.mp3`, `.wav`, `.aac`, `.m4a`, `.ogg` | `https://api.cloudinary.com/v1_1/fbciycdw/video/upload` |
| `liverton_learning_documents` | PDF documents, assignments, spreadsheets, slides, ZIP archives | `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.zip` | `https://api.cloudinary.com/v1_1/fbciycdw/raw/upload` |

---

## 2. Automatic Classification Logic (`mapFileToCloudinaryType`)

When a user selects or drops a file anywhere in the app, `mapFileToCloudinaryType(file, fileName, isChat)` dynamically determines the optimal preset:

1. **Images (`image/*`)** $\rightarrow$ `liverton_learning_images`
2. **Audio (`audio/*`)** $\rightarrow$ `liverton_learning_audio` (Uploaded under Cloudinary's `video` resource endpoint)
3. **Videos (`video/*`)**:
   - If in chat (`isChat = true`) $\rightarrow$ `liverton_learning_courses` (For temporary chat videos)
   - If size > 20MB $\rightarrow$ `liverton_learning_courses`
   - If size <= 20MB $\rightarrow$ `liverton_learning_shorts`
4. **Documents (`application/pdf`, `.doc`, `.zip`, etc.)** $\rightarrow$ `liverton_learning_documents` (Uploaded under Cloudinary's `raw` endpoint)

---

## 3. Progress Tracking & Callbacks (`uploadToCloudinary`)

The upload engine in `src/services/cloudinaryService.ts` utilizes `XMLHttpRequest` instead of standard `fetch` to enable real byte-level progress monitoring for large videos and files:

```typescript
export async function uploadToCloudinary(
  file: File | Blob,
  type: CloudinaryUploadType = 'image',
  options: CloudinaryUploadOptions = {}
): Promise<string>
```

### Key Execution Highlights:
- **Real Progress Callback**: Pass `onProgress: (percent: number) => void` to update UI progress bars (0% to 100%).
- **Error Handling**: Displays friendly toast notifications (`showErrorToast: true`) on network dropouts or validation failures.
- **Firestore Tracking**: Automatically writes a tracking record into the `uploaded_assets` collection in Firestore.

---

## 4. Firestore Asset Tracking & Temporary Cleanup Routine

Whenever a file is uploaded, a tracking document is generated inside `uploaded_assets`:

```json
{
  "publicId": "liverton-learning/shorts/abc123",
  "resourceType": "video",
  "url": "https://res.cloudinary.com/fbciycdw/video/upload/v1/...",
  "uploadedAt": "Timestamp",
  "uploader": "user_uid",
  "contentType": "video/mp4",
  "referenceId": "module_id_or_chat_id",
  "purpose": "shorts",
  "isTemporaryChatVideo": false
}
```

### Automatic 7-Day Cleanup Policy:
For temporary chat videos (`purpose: 'chat_video'`), `isTemporaryChatVideo` is set to `true` and `deleteAfter` is calculated as 7 days from upload. The background cleanup function `cleanupTemporaryChatVideos()` runs on app layout mount to automatically prune expired temporary chat video tracking documents while preserving permanent course lectures, shorts, and documents!

---

## 5. Summary of Application Workflows Utilizing Cloudinary Presets

1. **Work Hub Module Creation (`TearnDashboard.tsx`)**:
   - Cover Image: Uploaded to `liverton_learning_images`
   - Promotional Short Video: Uploaded to `liverton_learning_shorts`
2. **Liv Teams Workspace & Chat (`TeamWorkspaceChat.tsx`)**:
   - Chat voice notes, documents, and video clips uploaded directly via presets.
3. **PDF Document Library (`Documents.tsx`)**:
   - PDFs uploaded to `liverton_learning_documents` with reading progress tracked.
4. **Dashboard Banners (`DashboardBanners.tsx`)**:
   - Banners and promo video slides uploaded to `liverton_learning_images` or `liverton_learning_shorts`.
5. **Hanna AI Attachments (`HannaButton.tsx`, `HannaChatIntegrated.tsx`)**:
   - User file uploads analyzed by Gemini AI routed via mapped presets.
