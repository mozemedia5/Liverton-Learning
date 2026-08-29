/**
 * Cloudinary Upload Service
 * Handles unsigned uploads using the specified presets and resource types
 */

export type CloudinaryPreset =
  | 'liverton_learning_images'
  | 'liverton_learning_courses'
  | 'liverton_learning_shorts'
  | 'liverton_learning_audio'
  | 'liverton_learning_documents';

/**
 * Determine the correct preset and resource type based on file type and category
 */
export function getCloudinaryPreset(file: File, category?: string): { preset: CloudinaryPreset; resourceType: 'image' | 'video' | 'raw' } {
  const mime = file.type.toLowerCase();

  // 1. Audio (Cloudinary stores audio under "video" resource type)
  if (mime.startsWith('audio/') || category === 'audio' || category === 'voice_message' || category === 'chat_voice') {
    return { preset: 'liverton_learning_audio', resourceType: 'video' };
  }

  // 2. Video Lessons / Full Courses
  if (category === 'course_lesson' || category === 'recorded_class' || category === 'lecture_video') {
    return { preset: 'liverton_learning_courses', resourceType: 'video' };
  }

  // 3. Short Videos / Shorts / Promotional clips / Video announcements (motivations)
  if (category === 'short_video' || category === 'motivation_video' || category === 'shorts' || category === 'announcement_video') {
    return { preset: 'liverton_learning_shorts', resourceType: 'video' };
  }

  // 4. Images
  if (mime.startsWith('image/')) {
    return { preset: 'liverton_learning_images', resourceType: 'image' };
  }

  // 5. General Videos
  if (mime.startsWith('video/')) {
    if (file.size < 15 * 1024 * 1024) {
      return { preset: 'liverton_learning_shorts', resourceType: 'video' };
    }
    return { preset: 'liverton_learning_courses', resourceType: 'video' };
  }

  // 6. Documents (PDF, Word, Excel, PowerPoint, Text, raw)
  return { preset: 'liverton_learning_documents', resourceType: 'raw' };
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
}

/**
 * Uploads a file to Cloudinary using unsigned upload presets.
 */
export async function uploadToCloudinary(
  file: File,
  category?: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary is not configured on this environment (missing VITE_CLOUDINARY_CLOUD_NAME).');
  }

  const { preset, resourceType } = getCloudinaryPreset(file, category);
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.secure_url) {
            resolve(response.secure_url);
          } else {
            reject(new Error('Cloudinary response missing secure_url'));
          }
        } catch (err) {
          reject(new Error('Failed to parse Cloudinary response: ' + (err as Error).message));
        }
      } else {
        try {
          const response = JSON.parse(xhr.responseText);
          reject(new Error(response.error?.message || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during Cloudinary upload'));
    };

    xhr.send(formData);
  });
}
