/**
 * Cloudinary Upload Service
 * Handles uploading files directly to Cloudinary using secure presets
 */

import { toast } from 'sonner';

export type CloudinaryUploadType = 'image' | 'course_video' | 'short_video' | 'audio' | 'document';

export interface CloudinaryConfig {
  cloudName: string;
  presets: {
    images: string;
    courses: string;
    shorts: string;
    audio: string;
    documents: string;
  };
}

export interface CloudinaryUploadOptions {
  /** Receive upload progress as a 0-100 percentage */
  onProgress?: (percent: number) => void;
  /** Set to false to handle error presentation yourself (default: true) */
  showErrorToast?: boolean;
}

const CLOUDINARY_CONFIG: CloudinaryConfig = {
  // Fallback matches the cloud used by the production deployment
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'fbciycdw',
  presets: {
    images: 'liverton_learning_images',
    courses: 'liverton_learning_courses',
    shorts: 'liverton_learning_shorts',
    audio: 'liverton_learning_audio',
    documents: 'liverton_learning_documents',
  }
};

/**
 * Map a browser File to the correct configured upload classification.
 * Images, audio, videos and documents each use their dedicated preset;
 * small videos use the shorts preset while larger ones use the courses preset.
 */
export function mapFileToCloudinaryType(file: File | Blob, fileName?: string): CloudinaryUploadType {
  const type = (file.type || '').toLowerCase();

  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) {
    return file.size > 20 * 1024 * 1024 ? 'course_video' : 'short_video';
  }

  const extension = (fileName || (file instanceof File ? file.name : '')).split('.').pop()?.toLowerCase();
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'].includes(extension || '')) {
    return 'document';
  }

  return 'document';
}

function resolvePreset(type: CloudinaryUploadType): { preset: string; resourceType: string } {
  switch (type) {
    case 'course_video':
      return { preset: CLOUDINARY_CONFIG.presets.courses, resourceType: 'video' };
    case 'short_video':
      return { preset: CLOUDINARY_CONFIG.presets.shorts, resourceType: 'video' };
    case 'audio':
      // Cloudinary stores audio under the "video" resource type
      return { preset: CLOUDINARY_CONFIG.presets.audio, resourceType: 'video' };
    case 'document':
      return { preset: CLOUDINARY_CONFIG.presets.documents, resourceType: 'raw' };
    case 'image':
    default:
      return { preset: CLOUDINARY_CONFIG.presets.images, resourceType: 'image' };
  }
}

/**
 * Upload a file to Cloudinary with progress/error handling.
 * Uses XMLHttpRequest so callers can receive real upload progress.
 *
 * @param file - The file to upload (File or Blob)
 * @param type - The upload classification type
 * @param options - Optional progress callback and error-toast control
 * @returns Promise with secure URL string
 */
export async function uploadToCloudinary(
  file: File | Blob,
  type: CloudinaryUploadType = 'image',
  options: CloudinaryUploadOptions = {}
): Promise<string> {
  const { onProgress, showErrorToast = true } = options;

  try {
    const { preset, resourceType } = resolvePreset(type);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);

    const secureUrl = await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
            onProgress?.(100);
            resolve(data.secure_url as string);
          } else {
            reject(new Error(data?.error?.message || `Upload failed (status ${xhr.status})`));
          }
        } catch {
          reject(new Error('Upload failed (invalid server response)'));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error occurred during upload')));
      xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled')));
      xhr.addEventListener('timeout', () => reject(new Error('Upload timed out. Please try again')));

      xhr.open('POST', uploadUrl);
      xhr.timeout = 120000;
      xhr.send(formData);
    });

    return secureUrl;
  } catch (error) {
    console.error('Cloudinary upload error details:', error);
    if (showErrorToast) {
      toast.error(error instanceof Error ? error.message : 'Network error occurred during upload');
    }
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Optimized delivery                                                  */
/* ------------------------------------------------------------------ */

export interface CloudinaryDeliveryOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'limit' | 'fit' | 'scale' | 'thumb';
  gravity?: string;
  quality?: string;
  format?: string;
  dpr?: string | number;
}

/**
 * Build an optimized delivery URL for a media asset.
 * Non-Cloudinary URLs are returned unchanged.
 */
export function optimizeCloudinaryUrl(url: string, options: CloudinaryDeliveryOptions = {}): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  const {
    width,
    height,
    crop = 'limit',
    gravity,
    quality = 'auto',
    format = 'auto',
    dpr
  } = options;

  const transforms: string[] = [];
  if (format) transforms.push(`f_${format}`);
  if (quality) transforms.push(`q_${quality}`);
  if (crop) transforms.push(`c_${crop}`);
  if (gravity) transforms.push(`g_${gravity}`);
  if (width) transforms.push(`w_${Math.round(width)}`);
  if (height) transforms.push(`h_${Math.round(height)}`);
  if (dpr) transforms.push(`dpr_${dpr}`);

  return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
}
