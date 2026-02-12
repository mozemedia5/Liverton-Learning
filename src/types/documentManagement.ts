/**
 * Comprehensive Document Management System Types
 * Extended types for Microsoft Office-style document editing
 */

import type { DocumentType, DocumentVisibility, UserRole } from './index';

/**
 * Enhanced document metadata with comprehensive tracking
 */
export interface EnhancedDocumentMeta {
  id: string;
  title: string;
  description?: string;
  type: DocumentType;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  role: UserRole;
  schoolId?: string;
  folderId?: string | null;
  sharedWith: string[];
  sharedWithPermissions?: Record<string, 'view' | 'edit' | 'comment'>;
  visibility: DocumentVisibility;
  publicToken?: string;
  
  // Timestamps with comprehensive tracking
  createdAt: Date;
  updatedAt: Date;
  lastEditedBy?: string;
  lastEditedAt?: Date;
  
  // Version and collaboration
  version: number;
  totalVersions?: number;
  
  // Document properties
  isFavorite?: boolean;
  isArchived?: boolean;
  tags?: string[];
  category?: string;
  
  // Statistics
  wordCount?: number;
  characterCount?: number;
  pageCount?: number;
  viewCount?: number;
  editCount?: number;
  
  // File information
  fileSize?: number;
  fileUrl?: string;
  mimeType?: string;
  
  // Collaboration
  collaborators?: string[];
  comments?: number;
  hasUnresolvedComments?: boolean;
  
  // Access tracking
  lastAccessedBy?: string;
  lastAccessedAt?: Date;
  accessHistory?: DocumentAccess[];
}

/**
 * Document access tracking for audit trail
 */
export interface DocumentAccess {
  userId: string;
  userName: string;
  userEmail: string;
  action: 'view' | 'edit' | 'comment' | 'share' | 'download' | 'delete';
  timestamp: Date;
  ipAddress?: string;
  deviceInfo?: string;
}

/**
 * Document comment for collaboration
 */
export interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  content: string;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
  replies?: DocumentComment[];
}

/**
 * Document activity log entry
 */
export interface DocumentActivity {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  action: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * Text document specific properties
 */
export interface TextDocumentProperties {
  language?: string;
  pageSize?: 'letter' | 'a4' | 'legal';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  lineSpacing?: number;
  fontFamily?: string;
  fontSize?: number;
  theme?: string;
  trackChanges?: boolean;
  showComments?: boolean;
}

/**
 * Spreadsheet specific properties
 */
export interface SpreadsheetProperties {
  sheets?: SheetInfo[];
  activeSheet?: string;
  frozenRows?: number;
  frozenColumns?: number;
  showGridlines?: boolean;
  showHeaders?: boolean;
  theme?: string;
}

/**
 * Sheet information
 */
export interface SheetInfo {
  id: string;
  name: string;
  index: number;
  hidden?: boolean;
  color?: string;
}

/**
 * Presentation specific properties
 */
export interface PresentationProperties {
  slides?: SlideInfo[];
  activeSlide?: string;
  theme?: string;
  transition?: string;
  animationEnabled?: boolean;
  slideSize?: 'standard' | 'widescreen';
  aspectRatio?: '4:3' | '16:9';
}

/**
 * Slide information
 */
export interface SlideInfo {
  id: string;
  title?: string;
  index: number;
  thumbnail?: string;
  hidden?: boolean;
}

/**
 * Document template for quick creation
 */
export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  type: DocumentType;
  category?: string;
  thumbnail?: string;
  content: any;
  createdBy: string;
  isPublic?: boolean;
  tags?: string[];
  createdAt: Date;
}

/**
 * Document export options
 */
export interface ExportOptions {
  format: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'markdown' | 'csv';
  includeComments?: boolean;
  includeVersionHistory?: boolean;
  pageRange?: string;
  quality?: 'low' | 'medium' | 'high';
}

/**
 * Document import options
 */
export interface ImportOptions {
  format: string;
  overwrite?: boolean;
  preserveFormatting?: boolean;
  createNewVersion?: boolean;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    documentId: string;
    error: string;
  }>;
}

/**
 * Document search result
 */
export interface DocumentSearchResult {
  id: string;
  title: string;
  type: DocumentType;
  ownerId: string;
  ownerName: string;
  snippet?: string;
  relevance: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document statistics
 */
export interface DocumentStatistics {
  totalDocuments: number;
  documentsByType: Record<DocumentType, number>;
  totalSize: number;
  averageSize: number;
  mostActive: string[];
  recentlyModified: string[];
  mostShared: string[];
}
