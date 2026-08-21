/**
 * Cloudinary Upload Service
 * Handles uploading files directly to Cloudinary using secure presets
 */

import { toast } from 'sonner';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore';

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
  /** Context metadata for storing in Firestore tracking */
  userId?: string;
  referenceId?: string; // e.g. chatId, courseId, docId, etc.
  purpose?: string;     // e.g. 'chat_video', 'profile_picture', 'course_material', etc.
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
 *
 * If isChat is true, any video is forced to use the 'course_video' preset.
 */
export function mapFileToCloudinaryType(
  file: File | Blob,
  fileName?: string,
  isChat?: boolean
): CloudinaryUploadType {
  const type = (file.type || '').toLowerCase();

  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) {
    if (isChat) return 'course_video'; // Force chat videos to Courses/Video preset
    return file.size > 20 * 1024 * 1024 ? 'course_video' : 'short_video';
  }

  const extension = (fileName || (file instanceof File ? file.name : '')).split('.').pop()?.toLowerCase();
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'].includes(extension || '')) {
    return 'document';
  }

  return 'document';
}

function resolveResourceType(type: CloudinaryUploadType): 'image' | 'video' | 'raw' {
  if (type === 'document') return 'raw';
  if (type === 'course_video' || type === 'short_video' || type === 'audio') return 'video';
  return 'image';
}

async function requestUploadSignature(type: CloudinaryUploadType, file: File | Blob) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in before uploading a file.');
  const token = await user.getIdToken();
  const response = await fetch(`${import.meta.env.VITE_VERCEL_API_BASE_URL || ''}/api/cloudinary/sign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceType: resolveResourceType(type), contentType: file.type, size: file.size }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Cloudinary upload authorization failed.');
  }
  return response.json() as Promise<{ cloudName: string; apiKey: string; resourceType: string; folder: string; timestamp: number; signature: string }>;
}

/**
 * Track an uploaded asset in the Firestore 'uploaded_assets' collection.
 */
async function trackAssetInFirestore(
  data: { secure_url: string; public_id: string; resource_type: string },
  file: File | Blob,
  type: CloudinaryUploadType,
  options: CloudinaryUploadOptions
): Promise<void> {
  try {
    if (!db) {
      console.warn('Firestore db not available. Skipping tracking.');
      return;
    }

    const uploaderId = options.userId || auth?.currentUser?.uid || 'anonymous';
    const referenceId = options.referenceId || 'none';
    const contentType = file.type || '';

    // Determine purpose
    let purpose = options.purpose || '';
    if (!purpose) {
      if (type === 'image') purpose = 'image';
      else if (type === 'course_video') purpose = 'course_video';
      else if (type === 'short_video') purpose = 'shorts';
      else if (type === 'audio') purpose = 'audio';
      else if (type === 'document') purpose = 'document';
      else purpose = 'other';
    }

    const isTemporaryChatVideo = purpose === 'chat_video';
    const uploadedAt = Timestamp.now();
    let deleteAfter = null;

    if (isTemporaryChatVideo) {
      // Set to delete 7 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      deleteAfter = Timestamp.fromDate(futureDate);
    }

    await addDoc(collection(db, 'uploaded_assets'), {
      publicId: data.public_id || '',
      resourceType: data.resource_type || '',
      url: data.secure_url,
      uploadedAt,
      uploader: uploaderId,
      contentType,
      referenceId,
      purpose,
      isTemporaryChatVideo,
      ...(deleteAfter ? { deleteAfter } : {})
    });

    console.log('Successfully tracked uploaded asset in Firestore:', data.public_id);
  } catch (err) {
    console.error('Error tracking uploaded asset in Firestore:', err);
  }
}

/**
 * Client-side automatic cleanup routine for temporary chat videos.
 * Queries Firestore for expired temporary chat videos, deletes the Firestore tracking documents,
 * and logs their Cloudinary public IDs for compliance tracking.
 */
export async function cleanupTemporaryChatVideos(): Promise<void> {
  try {
    if (!db) return;

    const now = Timestamp.now();
    const q = query(
      collection(db, 'uploaded_assets'),
      where('isTemporaryChatVideo', '==', true),
      where('deleteAfter', '<=', now)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log('No expired temporary chat videos found for cleanup.');
      return;
    }

    console.log(`Found ${snapshot.size} expired temporary chat video(s). Executing cleanup...`);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      console.log(`[CLEANUP] Deleting expired chat video from tracking. PublicID: ${data.publicId}, URL: ${data.url}`);
      // In a frontend-only app, we delete the reference document from Firestore.
      await deleteDoc(doc(db, 'uploaded_assets', docSnap.id));
    }

    console.log('Cleanup of expired temporary chat videos completed successfully.');
  } catch (err) {
    console.error('Error during temporary chat video cleanup:', err);
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
    const signature = await requestUploadSignature(type, file);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', String(signature.timestamp));
    formData.append('signature', signature.signature);
    formData.append('folder', signature.folder);

    const data = await new Promise<{ secure_url: string; public_id: string; resource_type: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const resData = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300 && resData.secure_url) {
            onProgress?.(100);
            resolve({
              secure_url: resData.secure_url,
              public_id: resData.public_id || '',
              resource_type: resData.resource_type || signature.resourceType
            });
          } else {
            reject(new Error(resData?.error?.message || `Upload failed (status ${xhr.status})`));
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

    // Track asset in Firestore asynchronously without blocking upload resolution
    trackAssetInFirestore(data, file, type, options);

    return data.secure_url;
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
