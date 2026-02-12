/**
 * Enhanced Document Management Library
 * Comprehensive Firestore integration for document management system
 * Supports text documents, spreadsheets, and presentations with full editing capabilities
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDate } from '@/lib/date';
import type {
  DocumentContent,
  DocumentType,
  DocumentVisibility,
  UserRole,
} from '@/types';
import type {
  EnhancedDocumentMeta,
  DocumentComment,
  DocumentActivity,
  TextDocumentProperties,
  SpreadsheetProperties,
  PresentationProperties,
  ExportOptions,
  BatchOperationResult,
  DocumentStatistics,
} from '@/types/documentManagement';

const DOCUMENTS_COLLECTION = 'documents';
const DOCUMENT_METADATA_COLLECTION = 'document_metadata';
const DOCUMENT_ACCESS_COLLECTION = 'document_access';
const DOCUMENT_COMMENTS_COLLECTION = 'document_comments';
const DOCUMENT_ACTIVITY_COLLECTION = 'document_activity';

/**
 * Create a new document with comprehensive metadata
 * Initializes Firestore document with all required fields
 */
export async function createEnhancedDocument(params: {
  title: string;
  description?: string;
  type: DocumentType;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  role: UserRole;
  schoolId?: string;
  folderId?: string | null;
  visibility?: DocumentVisibility;
  tags?: string[];
  category?: string;
  properties?: TextDocumentProperties | SpreadsheetProperties | PresentationProperties;
}): Promise<string> {
  try {
    // Create main document
    const docRef = await addDoc(collection(db, DOCUMENTS_COLLECTION), {
      title: params.title,
      description: params.description || '',
      type: params.type,
      ownerId: params.ownerId,
      ownerName: params.ownerName,
      ownerEmail: params.ownerEmail,
      role: params.role,
      schoolId: params.schoolId || null,
      folderId: params.folderId || null,
      sharedWith: [],
      sharedWithPermissions: {},
      visibility: params.visibility || 'private',
      publicToken: null,
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastEditedBy: params.ownerId,
      lastEditedAt: serverTimestamp(),
      
      // Version tracking
      version: 1,
      totalVersions: 1,
      
      // Document properties
      isFavorite: false,
      isArchived: false,
      tags: params.tags || [],
      category: params.category || '',
      
      // Statistics
      wordCount: 0,
      characterCount: 0,
      pageCount: 1,
      viewCount: 0,
      editCount: 0,
      
      // File information
      fileSize: 0,
      fileUrl: null,
      mimeType: null,
      
      // Collaboration
      collaborators: [params.ownerId],
      comments: 0,
      hasUnresolvedComments: false,
      
      // Access tracking
      lastAccessedBy: params.ownerId,
      lastAccessedAt: serverTimestamp(),
      
      // Document-specific properties
      properties: params.properties || {},
    });

    // Create metadata document
    await setDoc(doc(db, DOCUMENT_METADATA_COLLECTION, docRef.id), {
      documentId: docRef.id,
      title: params.title,
      type: params.type,
      ownerId: params.ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      searchableTitle: params.title.toLowerCase(),
      searchableDescription: (params.description || '').toLowerCase(),
    });

    // Log creation activity
    await logDocumentActivity({
      documentId: docRef.id,
      userId: params.ownerId,
      userName: params.ownerName,
      action: 'created',
      details: { type: params.type },
    });

    // Track initial access
    await trackDocumentAccess({
      documentId: docRef.id,
      userId: params.ownerId,
      userName: params.ownerName,
      userEmail: params.ownerEmail,
      action: 'view',
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating enhanced document:', error);
    throw error;
  }
}

/**
 * Get enhanced document with all metadata
 */
export async function getEnhancedDocument(docId: string): Promise<EnhancedDocumentMeta | null> {
  try {
    const snap = await getDoc(doc(db, DOCUMENTS_COLLECTION, docId));
    if (!snap.exists()) return null;

    const data = snap.data() as any;
    return {
      id: snap.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      lastEditedAt: data.lastEditedAt ? toDate(data.lastEditedAt) : undefined,
      lastAccessedAt: data.lastAccessedAt ? toDate(data.lastAccessedAt) : undefined,
    } as EnhancedDocumentMeta;
  } catch (error) {
    console.error('Error getting enhanced document:', error);
    throw error;
  }
}

/**
 * Update document content with version tracking
 */
export async function updateEnhancedDocumentContent(params: {
  docId: string;
  content: DocumentContent;
  updatedBy: string;
  updatedByName: string;
  newTitle?: string;
  bumpVersion?: boolean;
  wordCount?: number;
  characterCount?: number;
  pageCount?: number;
}): Promise<void> {
  try {
    const docRef = doc(db, DOCUMENTS_COLLECTION, params.docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Document not found');

    const current = snap.data() as any;
    const nextVersion = params.bumpVersion ? (current.version || 1) + 1 : (current.version || 1);

    // Update main document
    await updateDoc(docRef, {
      content: params.content,
      ...(params.newTitle ? { title: params.newTitle } : {}),
      version: nextVersion,
      totalVersions: nextVersion,
      updatedAt: serverTimestamp(),
      lastEditedBy: params.updatedBy,
      lastEditedAt: serverTimestamp(),
      ...(params.wordCount !== undefined ? { wordCount: params.wordCount } : {}),
      ...(params.characterCount !== undefined ? { characterCount: params.characterCount } : {}),
      ...(params.pageCount !== undefined ? { pageCount: params.pageCount } : {}),
      editCount: (current.editCount || 0) + 1,
    });

    // Create version snapshot
    if (params.bumpVersion) {
      await setDoc(
        doc(db, DOCUMENTS_COLLECTION, params.docId, 'versions', `v${nextVersion}`),
        {
          documentId: params.docId,
          version: nextVersion,
          createdAt: serverTimestamp(),
          createdBy: params.updatedBy,
          createdByName: params.updatedByName,
          content: params.content,
          title: params.newTitle || current.title,
        }
      );
    }

    // Log activity
    await logDocumentActivity({
      documentId: params.docId,
      userId: params.updatedBy,
      userName: params.updatedByName,
      action: 'edited',
      details: {
        version: nextVersion,
        wordCount: params.wordCount,
        characterCount: params.characterCount,
      },
    });
  } catch (error) {
    console.error('Error updating enhanced document content:', error);
    throw error;
  }
}

/**
 * Track document access for audit trail
 */
export async function trackDocumentAccess(params: {
  documentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'view' | 'edit' | 'comment' | 'share' | 'download' | 'delete';
  ipAddress?: string;
  deviceInfo?: string;
}): Promise<void> {
  try {
    await addDoc(collection(db, DOCUMENT_ACCESS_COLLECTION), {
      documentId: params.documentId,
      userId: params.userId,
      userName: params.userName,
      userEmail: params.userEmail,
      action: params.action,
      timestamp: serverTimestamp(),
      ipAddress: params.ipAddress || null,
      deviceInfo: params.deviceInfo || null,
    });

    // Update document access info
    await updateDoc(doc(db, DOCUMENTS_COLLECTION, params.documentId), {
      lastAccessedBy: params.userId,
      lastAccessedAt: serverTimestamp(),
      viewCount: params.action === 'view' ? (await getDoc(doc(db, DOCUMENTS_COLLECTION, params.documentId))).data()?.viewCount + 1 || 1 : undefined,
    });
  } catch (error) {
    console.error('Error tracking document access:', error);
    throw error;
  }
}

/**
 * Add comment to document
 */
export async function addDocumentComment(params: {
  documentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  content: string;
}): Promise<string> {
  try {
    const commentRef = await addDoc(collection(db, DOCUMENT_COMMENTS_COLLECTION), {
      documentId: params.documentId,
      userId: params.userId,
      userName: params.userName,
      userEmail: params.userEmail,
      content: params.content,
      resolved: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      replies: [],
    });

    // Update document comment count
    const docSnap = await getDoc(doc(db, DOCUMENTS_COLLECTION, params.documentId));
    const currentComments = docSnap.data()?.comments || 0;
    await updateDoc(doc(db, DOCUMENTS_COLLECTION, params.documentId), {
      comments: currentComments + 1,
      hasUnresolvedComments: true,
    });

    // Log activity
    await logDocumentActivity({
      documentId: params.documentId,
      userId: params.userId,
      userName: params.userName,
      action: 'commented',
      details: { commentId: commentRef.id },
    });

    return commentRef.id;
  } catch (error) {
    console.error('Error adding document comment:', error);
    throw error;
  }
}

/**
 * Get document comments
 */
export async function getDocumentComments(documentId: string): Promise<DocumentComment[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, DOCUMENT_COMMENTS_COLLECTION),
        where('documentId', '==', documentId),
        orderBy('createdAt', 'desc')
      )
    );

    return snap.docs.map((d) => (
      {
        id: d.id,
        ...d.data(),
        createdAt: toDate(d.data().createdAt),
        updatedAt: toDate(d.data().updatedAt),
      } as DocumentComment
    ));
  } catch (error) {
    console.error('Error getting document comments:', error);
    throw error;
  }
}

/**
 * Log document activity
 */
export async function logDocumentActivity(params: {
  documentId: string;
  userId: string;
  userName: string;
  action: string;
  details?: Record<string, any>;
}): Promise<void> {
  try {
    await addDoc(collection(db, DOCUMENT_ACTIVITY_COLLECTION), {
      documentId: params.documentId,
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      details: params.details || {},
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging document activity:', error);
    throw error;
  }
}

/**
 * Get document activity history
 */
export async function getDocumentActivity(documentId: string, limit: number = 50): Promise<DocumentActivity[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, DOCUMENT_ACTIVITY_COLLECTION),
        where('documentId', '==', documentId),
        orderBy('timestamp', 'desc')
      )
    );

    return snap.docs.slice(0, limit).map((d) => (
      {
        id: d.id,
        ...d.data(),
        timestamp: toDate(d.data().timestamp),
      } as DocumentActivity
    ));
  } catch (error) {
    console.error('Error getting document activity:', error);
    throw error;
  }
}

/**
 * Share document with users
 */
export async function shareDocumentWithUsers(params: {
  documentId: string;
  userIds: string[];
  permission: 'view' | 'edit' | 'comment';
  sharedBy: string;
  sharedByName: string;
}): Promise<void> {
  try {
    const docRef = doc(db, DOCUMENTS_COLLECTION, params.documentId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Document not found');

    const current = snap.data() as any;
    const existingShared = new Set([...(current.sharedWith || [])]);
    const permissions = { ...(current.sharedWithPermissions || {}) };

    params.userIds.forEach((id) => {
      existingShared.add(id);
      permissions[id] = params.permission;
    });

    await updateDoc(docRef, {
      sharedWith: Array.from(existingShared),
      sharedWithPermissions: permissions,
      updatedAt: serverTimestamp(),
    });

    // Log activity
    await logDocumentActivity({
      documentId: params.documentId,
      userId: params.sharedBy,
      userName: params.sharedByName,
      action: 'shared',
      details: {
        userIds: params.userIds,
        permission: params.permission,
      },
    });
  } catch (error) {
    console.error('Error sharing document:', error);
    throw error;
  }
}

/**
 * Subscribe to documents with real-time updates
 */
export function subscribeToEnhancedDocuments(params: {
  userId: string;
  role: UserRole;
  schoolId?: string;
  onChange: (docs: EnhancedDocumentMeta[]) => void;
  onError?: (message: string) => void;
}): Unsubscribe {
  try {
    const docsRef = collection(db, DOCUMENTS_COLLECTION);
    let q = query(docsRef, orderBy('updatedAt', 'desc'));

    if (params.role === 'school_admin' && params.schoolId) {
      q = query(
        docsRef,
        where('schoolId', '==', params.schoolId),
        orderBy('updatedAt', 'desc')
      );
    }

    return onSnapshot(
      q,
      (snap) => {
        const raw = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            ...data,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            lastEditedAt: data.lastEditedAt ? toDate(data.lastEditedAt) : undefined,
            lastAccessedAt: data.lastAccessedAt ? toDate(data.lastAccessedAt) : undefined,
          } as EnhancedDocumentMeta;
        });

        const filtered = raw.filter((d) => {
          if (params.role === 'platform_admin') return true;
          if (params.role === 'school_admin') return true;
          if (d.ownerId === params.userId) return true;
          if ((d.sharedWith || []).includes(params.userId)) return true;
          if (d.visibility === 'public') return true;
          if (d.visibility === 'internal') return true;
          return false;
        });

        params.onChange(filtered);
      },
      (err) => {
        params.onError?.(err instanceof Error ? err.message : 'Failed to load documents');
      }
    );
  } catch (error) {
    console.error('Error subscribing to enhanced documents:', error);
    throw error;
  }
}

/**
 * Get document statistics
 */
export async function getDocumentStatistics(userId: string): Promise<DocumentStatistics> {
  try {
    const snap = await getDocs(
      query(
        collection(db, DOCUMENTS_COLLECTION),
        where('ownerId', '==', userId)
      )
    );

    const docs = snap.docs.map((d) => d.data() as any);
    const byType: Record<DocumentType, number> = {
      doc: 0,
      sheet: 0,
      presentation: 0,
    };

    docs.forEach((d) => {
      byType[d.type as DocumentType]++;
    });

    return {
      totalDocuments: docs.length,
      documentsByType: byType,
      totalSize: docs.reduce((sum, d) => sum + (d.fileSize || 0), 0),
      averageSize: docs.length > 0 ? docs.reduce((sum, d) => sum + (d.fileSize || 0), 0) / docs.length : 0,
      mostActive: docs.sort((a, b) => (b.editCount || 0) - (a.editCount || 0)).slice(0, 5).map((d) => d.id),
      recentlyModified: docs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5).map((d) => d.id),
      mostShared: docs.sort((a, b) => (b.sharedWith?.length || 0) - (a.sharedWith?.length || 0)).slice(0, 5).map((d) => d.id),
    };
  } catch (error) {
    console.error('Error getting document statistics:', error);
    throw error;
  }
}

/**
 * Batch delete documents
 */
export async function batchDeleteDocuments(documentIds: string[]): Promise<BatchOperationResult> {
  const result: BatchOperationResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    const batch = writeBatch(db);

    for (const docId of documentIds) {
      try {
        batch.delete(doc(db, DOCUMENTS_COLLECTION, docId));
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          documentId: docId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await batch.commit();
    return result;
  } catch (error) {
    console.error('Error batch deleting documents:', error);
    throw error;
  }
}

/**
 * Export document
 */
export async function exportDocument(params: {
  documentId: string;
  options: ExportOptions;
}): Promise<Blob> {
  try {
    const doc = await getEnhancedDocument(params.documentId);
    if (!doc) throw new Error('Document not found');

    // This is a placeholder - actual export logic would depend on format
    // In production, you'd use libraries like pdfkit, docx, xlsx, etc.
    const content = JSON.stringify(doc, null, 2);
    return new Blob([content], { type: 'application/json' });
  } catch (error) {
    console.error('Error exporting document:', error);
    throw error;
  }
}
