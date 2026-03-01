/**
 * Dashboard Announcement Types
 * For auto-sliding promotional banners on user dashboards
 * Admin-only creation with auto-expiry support
 */

/**
 * Announcement type - determines display format
 */
export type AnnouncementType = 'image' | 'video' | 'text';

/**
 * Announcement status
 */
export type AnnouncementStatus = 'active' | 'expired' | 'draft';

/**
 * Dashboard Announcement Interface
 * Displayed as auto-sliding banner on all user dashboards
 */
export interface DashboardAnnouncement {
  id: string;
  
  // Basic info
  title: string;
  description?: string;
  type: AnnouncementType;
  
  // Content based on type
  imageUrl?: string; // For 'image' type
  videoUrl?: string; // For 'video' type
  content?: string; // For 'text' type
  
  // Action
  redirectUrl?: string; // Where to redirect when clicked
  openInNewTab?: boolean;
  
  // Metadata
  createdBy: string; // Admin user ID
  createdByName: string; // Admin name
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
  
  // Expiry
  expiresAt: any; // Firestore timestamp
  expiryDays: number; // Default: 2 days
  status: AnnouncementStatus;
  
  // Display settings
  priority: number; // Higher priority shows first (1-10)
  backgroundColor?: string; // Background color for text type
  textColor?: string; // Text color
  
  // Analytics
  views: number;
  clicks: number;
  
  // Visibility
  isActive: boolean;
  targetAudience?: 'all' | 'students' | 'teachers' | 'admins';
}

/**
 * Announcement creation form data
 */
export interface AnnouncementFormData {
  title: string;
  description: string;
  type: AnnouncementType;
  redirectUrl: string;
  openInNewTab: boolean;
  expiryDays: number;
  priority: number;
  backgroundColor: string;
  textColor: string;
  targetAudience: 'all' | 'students' | 'teachers' | 'admins';
  
  // Files
  imageFile?: File;
  videoFile?: File;
  content?: string;
}

/**
 * Announcement filter options
 */
export interface AnnouncementFilters {
  status?: AnnouncementStatus;
  type?: AnnouncementType;
  createdBy?: string;
  targetAudience?: 'all' | 'students' | 'teachers' | 'admins';
}
