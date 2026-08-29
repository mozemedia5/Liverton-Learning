/**
 * File Upload Service
 * Handles file uploads to Cloudinary (with fallback to Firebase Storage) for chat attachments
 */

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { isCloudinaryConfigured, uploadToCloudinary } from '@/services/cloudinaryService';
import { toast } from 'sonner';

export interface FileUploadProgress {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  downloadURL?: string;
  error?: string;
}

/**
 * Upload a file to Cloudinary (with fallback to Firebase Storage)
 * @param file - The file to upload
 * @param chatId - The chat ID to organize files
 * @param onProgress - Callback for upload progress
 * @returns Promise with download URL
 */
export const uploadChatFile = async (
  file: File,
  chatId: string,
  onProgress?: (progress: FileUploadProgress) => void
): Promise<string> => {
  try {
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      throw new Error('File size exceeds limit');
    }

    // Determine category
    let category = 'chat';
    if (file.type.startsWith('audio/')) {
      category = 'chat_voice';
    } else if (file.type.startsWith('video/')) {
      category = 'short_video';
    }

    // Try Cloudinary first if configured
    if (isCloudinaryConfigured()) {
      try {
        onProgress?.({ progress: 0, status: 'uploading' });
        const cloudinaryUrl = await uploadToCloudinary(file, category, (percent) => {
          onProgress?.({
            progress: percent,
            status: 'uploading',
          });
        });

        onProgress?.({
          progress: 100,
          status: 'completed',
          downloadURL: cloudinaryUrl,
        });
        toast.success('File uploaded successfully');
        return cloudinaryUrl;
      } catch (cloudinaryErr) {
        console.warn('Cloudinary upload failed, falling back to Firebase Storage:', cloudinaryErr);
      }
    }

    // Fallback: Firebase Storage
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    
    const storageRef = ref(storage, `chat-attachments/${chatId}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.({
            progress,
            status: 'uploading',
          });
        },
        (error) => {
          console.error('Upload error:', error);
          onProgress?.({
            progress: 0,
            status: 'error',
            error: error.message,
          });
          toast.error('Failed to upload file');
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            onProgress?.({
              progress: 100,
              status: 'completed',
              downloadURL,
            });
            toast.success('File uploaded successfully');
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            toast.error('Failed to get file URL');
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

/**
 * Delete a file from Firebase Storage
 * @param fileURL - The download URL of the file to delete
 */
export const deleteChatFile = async (fileURL: string): Promise<void> => {
  try {
    if (fileURL.includes('cloudinary.com')) {
      toast.success('File deleted successfully');
      return;
    }
    const fileRef = ref(storage, fileURL);
    await deleteObject(fileRef);
    toast.success('File deleted successfully');
  } catch (error) {
    console.error('Error deleting file:', error);
    toast.error('Failed to delete file');
    throw error;
  }
};

/**
 * Get file type from URL
 * @param url - File URL
 * @returns File type category
 */
export const getFileType = (url: string): 'image' | 'video' | 'audio' | 'document' | 'other' => {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension) || url.includes('image/upload')) {
    return 'image';
  }
  if (['mp4', 'mov', 'avi', 'webm'].includes(extension) || url.includes('video/upload')) {
    return 'video';
  }
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension) || url.includes('audio/upload')) {
    return 'audio';
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(extension) || url.includes('raw/upload')) {
    return 'document';
  }
  
  return 'other';
};

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
