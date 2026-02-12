/**
 * Enhanced Document Management System
 * Provides comprehensive document creation, editing, and management features
 * with Microsoft Office-style UI/UX and Firestore integration
 */

import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DocumentType, DocumentMeta } from '@/types';

/**
 * Enhanced document metadata structure with comprehensive fields
 * Includes creation tracking, editing history, and collaboration features
 */
export interface EnhancedDocumentMeta extends DocumentMeta {
  // Document identification and organization
  description?: string;
  tags?: string[];
  category?: string;
  
  // Timestamps with server synchronization
  createdAt: Date;
  updatedAt: Date;
  lastEditedBy?: string;
  lastEditedAt?: Date;
  
  // Collaboration and sharing
  collaborators?: string[];
  collaboratorPermissions?: Record<string, 'view' | 'edit' | 'comment'>;
  
  // Document statistics
  wordCount?: number;
  characterCount?: number;
  pageCount?: number;
  
  // Formatting and styling
  theme?: string;
  language?: string;
  
  // Document status
  isArchived?: boolean;
  isPinned?: boolean;
  isFavorite?: boolean;
  
  // Access control
  requiresPassword?: boolean;
  passwordHash?: string;
  
  // Metadata for search and filtering
  searchKeywords?: string[];
  lastAccessedAt?: Date;
  accessCount?: number;
}

/**
 * Document creation with enhanced metadata
 * Stores comprehensive document information in Firestore
 * 
 * @param params - Document creation parameters
 * @returns Document ID
 */
export async function createEnhancedDocument(params: {
  title: string;
  type: DocumentType;
  ownerId: string;
  ownerName: string;
  description?: string;
  tags?: string[];
  category?: string;
  schoolId?: string;
  folderId?: string | null;
  visibility?: 'private' | 'internal' | 'public';
  theme?: string;
  language?: string;
}): Promise<string> {
  try {
    // Create document with enhanced metadata
    const docRef = await addDoc(collection(db, 'documents'), {
      // Basic information
      title: params.title,
      type: params.type,
      description: params.description || '',
      
      // Owner information
      ownerId: params.ownerId,
      ownerName: params.ownerName,
      role: 'teacher', // Default role, can be customized
      
      // Organization
      schoolId: params.schoolId,
      folderId: params.folderId ?? null,
      tags: params.tags || [],
      category: params.category || 'General',
      
      // Sharing and visibility
      visibility: params.visibility || 'private',
      sharedWith: [],
      collaborators: [],
      collaboratorPermissions: {},
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastEditedBy: params.ownerId,
      lastEditedAt: serverTimestamp(),
      lastAccessedAt: serverTimestamp(),
      
      // Document statistics
      wordCount: 0,
      characterCount: 0,
      pageCount: 1,
      accessCount: 0,
      
      // Styling
      theme: params.theme || 'default',
      language: params.language || 'en',
      
      // Status flags
      isArchived: false,
      isPinned: false,
      isFavorite: false,
      
      // Version control
      version: 1,
      
      // Default content based on type
      content: getDefaultEnhancedContent(params.type),
      
      // Search optimization
      searchKeywords: generateSearchKeywords(params.title, params.description),
    });

    // Create initial version record
    await addDoc(collection(db, 'documents', docRef.id, 'versions'), {
      version: 1,
      createdAt: serverTimestamp(),
      createdBy: params.ownerId,
      createdByName: params.ownerName,
      content: getDefaultEnhancedContent(params.type),
      changeDescription: 'Initial document creation',
    });

    // Create activity log entry
    await addDoc(collection(db, 'documents', docRef.id, 'activity'), {
      action: 'created',
      userId: params.ownerId,
      userName: params.ownerName,
      timestamp: serverTimestamp(),
      details: {
        title: params.title,
        type: params.type,
      },
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating enhanced document:', error);
    throw error;
  }
}

/**
 * Get default content structure based on document type
 * Provides rich starting templates for each document type
 */
function getDefaultEnhancedContent(type: DocumentType) {
  switch (type) {
    case 'doc':
      return {
        kind: 'doc',
        html: `
          <div class="document-container">
            <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 16px;">Untitled Document</h1>
            <p style="font-size: 14px; color: #666; margin-bottom: 24px;">Start typing your content here...</p>
          </div>
        `,
        formatting: {
          fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
          fontSize: 14,
          lineHeight: 1.5,
          color: '#000000',
          backgroundColor: '#ffffff',
        },
      };

    case 'sheet':
      return {
        kind: 'sheet',
        cells: {
          A1: 'Column 1',
          B1: 'Column 2',
          C1: 'Column 3',
          A2: '',
          B2: '',
          C2: '',
        },
        formatting: {
          defaultFontSize: 12,
          defaultFontFamily: 'Segoe UI',
          headerBackgroundColor: '#f0f0f0',
          headerTextColor: '#000000',
        },
        metadata: {
          rows: 100,
          columns: 26,
          frozenRows: 1,
          frozenColumns: 0,
        },
      };

    case 'presentation':
      return {
        kind: 'presentation',
        slides: [
          {
            id: crypto.randomUUID(),
            layout: 'title',
            elements: [
              {
                id: crypto.randomUUID(),
                type: 'text',
                x: 80,
                y: 80,
                w: 640,
                h: 80,
                text: 'Untitled Presentation',
                fontSize: 44,
                bold: true,
                align: 'center',
                fontFamily: 'Segoe UI',
              },
              {
                id: crypto.randomUUID(),
                type: 'text',
                x: 80,
                y: 200,
                w: 640,
                h: 40,
                text: 'Click to add subtitle',
                fontSize: 24,
                align: 'center',
                fontFamily: 'Segoe UI',
                color: '#666666',
              },
            ],
          },
        ],
        theme: 'default',
        slideSize: { width: 960, height: 540 },
      };

    default:
      return { kind: 'doc', html: '<p>New Document</p>' };
  }
}

/**
 * Generate search keywords from document title and description
 * Improves document discoverability
 */
function generateSearchKeywords(title: string, description?: string): string[] {
  const keywords: Set<string> = new Set();
  
  // Add title words
  title.toLowerCase().split(/\s+/).forEach(word => {
    if (word.length > 2) keywords.add(word);
  });
  
  // Add description words
  if (description) {
    description.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) keywords.add(word);
    });
  }
  
  return Array.from(keywords);
}

/**
 * Update document with enhanced metadata
 * Tracks changes and updates timestamps
 */
export async function updateEnhancedDocument(params: {
  docId: string;
  updates: Partial<EnhancedDocumentMeta>;
  userId: string;
  userName: string;
}): Promise<void> {
  try {
    const docRef = doc(db, 'documents', params.docId);
    
    // Update document
    await updateDoc(docRef, {
      ...params.updates,
      updatedAt: serverTimestamp(),
      lastEditedBy: params.userId,
      lastEditedAt: serverTimestamp(),
    });

    // Log activity
    await addDoc(collection(db, 'documents', params.docId, 'activity'), {
      action: 'updated',
      userId: params.userId,
      userName: params.userName,
      timestamp: serverTimestamp(),
      details: params.updates,
    });
  } catch (error) {
    console.error('Error updating enhanced document:', error);
    throw error;
  }
}

/**
 * Add collaborator to document
 * Manages collaborative editing permissions
 */
export async function addCollaborator(params: {
  docId: string;
  collaboratorId: string;
  collaboratorName: string;
  permission: 'view' | 'edit' | 'comment';
  addedBy: string;
  addedByName: string;
}): Promise<void> {
  try {
    const docRef = doc(db, 'documents', params.docId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) throw new Error('Document not found');
    
    const data = docSnap.data() as any;
    const collaborators = data.collaborators || [];
    const permissions = data.collaboratorPermissions || {};
    
    if (!collaborators.includes(params.collaboratorId)) {
      collaborators.push(params.collaboratorId);
    }
    permissions[params.collaboratorId] = params.permission;
    
    await updateDoc(docRef, {
      collaborators,
      collaboratorPermissions: permissions,
      updatedAt: serverTimestamp(),
    });

    // Log activity
    await addDoc(collection(db, 'documents', params.docId, 'activity'), {
      action: 'collaborator_added',
      userId: params.addedBy,
      userName: params.addedByName,
      timestamp: serverTimestamp(),
      details: {
        collaboratorId: params.collaboratorId,
        collaboratorName: params.collaboratorName,
        permission: params.permission,
      },
    });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    throw error;
  }
}

/**
 * Track document access for analytics
 */
export async function trackDocumentAccess(params: {
  docId: string;
  userId: string;
  userName: string;
}): Promise<void> {
  try {
    const docRef = doc(db, 'documents', params.docId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return;
    
    const data = docSnap.data() as any;
    const accessCount = (data.accessCount || 0) + 1;
    
    await updateDoc(docRef, {
      lastAccessedAt: serverTimestamp(),
      accessCount,
    });

    // Log access
    await addDoc(collection(db, 'documents', params.docId, 'activity'), {
      action: 'accessed',
      userId: params.userId,
      userName: params.userName,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error tracking document access:', error);
  }
}

/**
 * Archive document
 */
export async function archiveDocument(params: {
  docId: string;
  userId: string;
  userName: string;
}): Promise<void> {
  try {
    const docRef = doc(db, 'documents', params.docId);
    
    await updateDoc(docRef, {
      isArchived: true,
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'documents', params.docId, 'activity'), {
      action: 'archived',
      userId: params.userId,
      userName: params.userName,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error archiving document:', error);
    throw error;
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(params: {
  docId: string;
  isFavorite: boolean;
  userId: string;
  userName: string;
}): Promise<void> {
  try {
    const docRef = doc(db, 'documents', params.docId);
    
    await updateDoc(docRef, {
      isFavorite: params.isFavorite,
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'documents', params.docId, 'activity'), {
      action: params.isFavorite ? 'favorited' : 'unfavorited',
      userId: params.userId,
      userName: params.userName,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw error;
  }
}
