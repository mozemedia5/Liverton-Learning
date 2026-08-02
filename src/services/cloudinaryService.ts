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

const CLOUDINARY_CONFIG: CloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'mozemedia5',
  presets: {
    images: 'liverton_learning_images',
    courses: 'liverton_learning_courses',
    shorts: 'liverton_learning_shorts',
    audio: 'liverton_learning_audio',
    documents: 'liverton_learning_documents',
  }
};

/**
 * Upload a file to Cloudinary with progress/error handling
 * @param file - The file to upload (File or Blob)
 * @param type - The upload classification type
 * @returns Promise with secure URL string
 */
export async function uploadToCloudinary(
  file: File | Blob,
  type: CloudinaryUploadType = 'image'
): Promise<string> {
  try {
    const cloudName = CLOUDINARY_CONFIG.cloudName;

    // 1. Resolve preset & resource type
    let preset = CLOUDINARY_CONFIG.presets.images;
    let resourceType = 'image';

    switch (type) {
      case 'course_video':
        preset = CLOUDINARY_CONFIG.presets.courses;
        resourceType = 'video';
        break;
      case 'short_video':
        preset = CLOUDINARY_CONFIG.presets.shorts;
        resourceType = 'video';
        break;
      case 'audio':
        preset = CLOUDINARY_CONFIG.presets.audio;
        resourceType = 'video'; // Cloudinary stores audio under "video" resource type
        break;
      case 'document':
        preset = CLOUDINARY_CONFIG.presets.documents;
        resourceType = 'raw'; // Documents are raw
        break;
      case 'image':
      default:
        preset = CLOUDINARY_CONFIG.presets.images;
        resourceType = 'image';
        break;
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errResponse = await response.json().catch(() => ({}));
      throw new Error(errResponse?.error?.message || `Upload failed (Status: ${response.status})`);
    }

    const data = await response.json();
    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error('No secure URL returned from Cloudinary response');
    }
  } catch (error: any) {
    console.error('Cloudinary upload error details:', error);
    toast.error(error.message || 'Network error occurred during Cloudinary upload');
    throw error;
  }
}
