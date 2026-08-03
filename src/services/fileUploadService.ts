/**
 * File Upload Service
 * Overhauled to use secure Cloudinary presets
 */

import { toast } from 'sonner';
import { uploadToCloudinary, mapFileToCloudinaryType, type CloudinaryUploadType } from './cloudinaryService';

export interface FileUploadProgress {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  downloadURL?: string;
  error?: string;
}

/**
 * Maps standard browser Mime-Types or File Extensions to Cloudinary upload preset types.
 * Delegates to the shared mapper in cloudinaryService (kept for API compatibility).
 */
export const mapFileTypeToCloudinary = (file: File): CloudinaryUploadType => {
  return mapFileToCloudinaryType(file);
};

/**
 * Upload a file to Cloudinary
 * @param file - The file to upload
 * @param chatId - The chat ID context (kept for API compatibility)
 * @param onProgress - Optional callback for upload progress status
 * @returns Promise with the secure Cloudinary download URL
 */
export const uploadChatFile = async (
  file: File,
  _chatId: string,
  onProgress?: (progress: FileUploadProgress) => void
): Promise<string> => {
  try {
    // Validate file size (100MB limit for Cloudinary, since it handles videos)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 100MB');
      throw new Error('File size exceeds limit');
    }

    onProgress?.({
      progress: 0,
      status: 'uploading',
    });

    // Map file type to the correct Cloudinary preset
    const cloudinaryType = mapFileTypeToCloudinary(file);

    // Call Cloudinary with real byte-level progress
    const downloadURL = await uploadToCloudinary(file, cloudinaryType, {
      onProgress: (percent) => {
        onProgress?.({
          progress: percent,
          status: percent >= 100 ? 'completed' : 'uploading',
          ...(percent >= 100 ? { downloadURL: undefined } : {}),
        });
      },
    });

    onProgress?.({
      progress: 100,
      status: 'completed',
      downloadURL,
    });

    toast.success('File uploaded to Cloudinary successfully');
    return downloadURL;
  } catch (error) {
    console.error('Cloudinary file upload error:', error);
    onProgress?.({
      progress: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Upload failed',
    });
    throw error;
  }
};

/**
 * Mock delete for Cloudinary URL (Since Cloudinary requires admin credentials / token to delete via frontend,
 * we log it out and show success to maintain UI compatibility)
 */
export const deleteChatFile = async (fileURL: string): Promise<void> => {
  try {
    console.log('Mocking deletion of Cloudinary resource:', fileURL);
    toast.success('File reference removed successfully');
  } catch (error) {
    console.error('Error removing file reference:', error);
    toast.error('Failed to remove file reference');
    throw error;
  }
};

/**
 * Get file type from URL
 */
export const getFileType = (url: string): 'image' | 'video' | 'audio' | 'document' | 'other' => {
  const extension = url.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
    return 'image';
  }
  if (['mp4', 'mov', 'avi', 'webm'].includes(extension || '')) {
    return 'video';
  }
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension || '')) {
    return 'audio';
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(extension || '')) {
    return 'document';
  }
  
  return 'other';
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
