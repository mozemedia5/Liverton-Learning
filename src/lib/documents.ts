import {
  addDoc,
  collection,
  deleteDoc,
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
  type Unsubscribe,
} from 'firebase/firestore';
import {
  getDownloadURL,
  ref,
  uploadBytes,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { toDate } from '@/lib/date';
import type {
  DocumentContent,
  DocumentMeta,
  DocumentRecord,
  DocumentType,
  DocumentVisibility,
  DocumentVersion,
  UserRole,
} from '@/types';

const DOCUMENTS_COLLECTION = 'documents';
const HANNA_QUEUE_COLLECTION = 'hanna_queue';

export function getDefaultContent(type: DocumentType): DocumentContent {
  if (type === 'doc') {
    return {
      kind: 'doc',
      html: '<h1>New Document</h1><p>Start writing...</p>',
    };
  }

  if (type === 'sheet') {
    return {
      kind: 'sheet',
      cells: {
        A1: 'New Sheet',
      },
    };
  }

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
            text: 'New Presentation',
            fontSize: 40,
            bold: true,
            align: 'center',
          },
        ],
      },
    ],
  };
}

export function createEmptyDocumentMeta(params: {
  title: string;
  type: DocumentType;
  ownerId: string;
  role: UserRole;
  schoolId?: string;
  visibility?: DocumentVisibility;
  folderId?: string | null;
}): Omit<DocumentMeta, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: params.title,
    type: params.type,
    ownerId: params.ownerId,
    role: params.role,
    schoolId: params.schoolId,
    folderId: params.folderId ?? null,
    sharedWith: [],
    visibility: params.visibility ?? 'private',
    version: 1,
  };
}

export async function createDocument(params: {
  title: string;
  type: DocumentType;
  ownerId: string;
  role: UserRole;
  schoolId?: string;
  folderId?: string | null;
  visibility?: DocumentVisibility;
}): Promise<string> {
  try {
    const content = getDefaultContent(params.type);
    const meta = createEmptyDocumentMeta({
      title: params.title,
      type: params.type,
      ownerId: params.ownerId,
      role: params.role,
      schoolId: params.schoolId,
      folderId: params.folderId,
      visibility: params.visibility,
    });

    console.log('Creating document:', params.title);
    const docRef = await addDoc(collection(db, DOCUMENTS_COLLECTION), {
      ...meta,
      content,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('Document created with ID:', docRef.id);

    // create first version
    try {
      await setDoc(doc(db, DOCUMENTS_COLLECTION, docRef.id, 'versions', 'v1'), {
        documentId: docRef.id,
        version: 1,
        createdAt: serverTimestamp(),
        createdBy: params.ownerId,
        content,
      });
      console.log('Initial version created for document:', docRef.id);
    } catch (versionError) {
      console.error('Failed to create initial version:', versionError);
      // Don't throw - version creation failure shouldn't block document creation
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating document:', error);
    throw new Error(`Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function subscribeToDocuments(params: {
  userId: string;
  role: UserRole;
  schoolId?: string;
  onChange: (docs: DocumentMeta[]) => void;
  onError?: (message: string) => void;
}): Unsubscribe {
  const docsRef = collection(db, DOCUMENTS_COLLECTION);

  // Basic permission scoping:
  // - Platform admin sees all
  // - School admin sees school docs
  // - Others see owned + shared + public/internal
  // NOTE: Firestore can't OR easily without multiple queries.
  // We'll subscribe to a broad-ish set per role and filter client-side.

  let q = query(docsRef, orderBy('updatedAt', 'desc'));

  if (params.role === 'school_admin' && params.schoolId) {
    q = query(docsRef, where('schoolId', '==', params.schoolId), orderBy('updatedAt', 'desc'));
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
        } as DocumentMeta;
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
}

export async function getDocument(docId: string): Promise<DocumentRecord | null> {
  try {
    console.log('Fetching document:', docId);
    const snap = await getDoc(doc(db, DOCUMENTS_COLLECTION, docId));
    
    if (!snap.exists()) {
      console.warn('Document not found:', docId);
      return null;
    }
    
    const data = snap.data() as any;
    const record = {
      id: snap.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as DocumentRecord;
    
    console.log('Document fetched successfully:', docId);
    return record;
  } catch (error) {
    console.error('Error fetching document:', error);
    throw new Error(`Failed to fetch document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateDocumentContent(params: {
  docId: string;
  content: DocumentContent;
  updatedBy: string;
  newTitle?: string;
  bumpVersion?: boolean;
}): Promise<void> {
  try {
    const docRef = doc(db, DOCUMENTS_COLLECTION, params.docId);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
      console.error('Document not found:', params.docId);
      throw new Error('Document not found');
    }

    const current = snap.data() as DocumentRecord;
    const nextVersion = params.bumpVersion ? (current.version || 1) + 1 : (current.version || 1);

    // Update document with proper error handling
    const updateData: any = {
      content: params.content,
      version: nextVersion,
      updatedAt: serverTimestamp(),
    };

    if (params.newTitle) {
      updateData.title = params.newTitle;
    }

    await updateDoc(docRef, updateData);
    console.log('Document updated successfully:', params.docId);

    // Create version history if requested
    if (params.bumpVersion) {
      try {
        await setDoc(doc(db, DOCUMENTS_COLLECTION, params.docId, 'versions', `v${nextVersion}`), {
          documentId: params.docId,
          version: nextVersion,
          createdAt: serverTimestamp(),
          createdBy: params.updatedBy,
          content: params.content,
        });
        console.log('Version history created:', `v${nextVersion}`);
      } catch (versionError) {
        console.error('Failed to create version history:', versionError);
        // Don't throw - version history failure shouldn't block save
      }
    }
  } catch (error) {
    console.error('Error updating document content:', error);
    throw new Error(`Failed to save document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteDocument(docId: string): Promise<void> {
  try {
    console.log('Deleting document:', docId);
    await deleteDoc(doc(db, DOCUMENTS_COLLECTION, docId));
    console.log('Document deleted successfully:', docId);
  } catch (error) {
    console.error('Error deleting document:', error);
    throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function renameDocument(docId: string, title: string): Promise<void> {
  try {
    console.log('Renaming document:', docId, 'to:', title);
    await updateDoc(doc(db, DOCUMENTS_COLLECTION, docId), {
      title,
      updatedAt: serverTimestamp(),
    });
    console.log('Document renamed successfully:', docId);
  } catch (error) {
    console.error('Error renaming document:', error);
    throw new Error(`Failed to rename document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function setVisibility(docId: string, visibility: DocumentVisibility, publicToken?: string): Promise<void> {
  try {
    console.log('Setting visibility for document:', docId, 'to:', visibility);
    await updateDoc(doc(db, DOCUMENTS_COLLECTION, docId), {
      visibility,
      ...(visibility === 'public' ? { publicToken: publicToken ?? crypto.randomUUID() } : { publicToken: null }),
      updatedAt: serverTimestamp(),
    });
    console.log('Visibility set successfully for document:', docId);
  } catch (error) {
    console.error('Error setting visibility:', error);
    throw new Error(`Failed to set visibility: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function shareInternally(docId: string, userIds: string[]): Promise<void> {
  const refDoc = doc(db, DOCUMENTS_COLLECTION, docId);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) throw new Error('Document not found');
  const current = snap.data() as DocumentMeta;
  const existing = new Set([...(current.sharedWith || [])]);
  userIds.forEach((id) => existing.add(id));
  await updateDoc(refDoc, {
    sharedWith: Array.from(existing),
    updatedAt: serverTimestamp(),
  });
}

export async function uploadFileToDocument(params: {
  docId: string;
  file: File;
}): Promise<string> {
  const objectRef = ref(storage, `documents/${params.docId}/${params.file.name}`);
  await uploadBytes(objectRef, params.file);
  const url = await getDownloadURL(objectRef);
  await updateDoc(doc(db, DOCUMENTS_COLLECTION, params.docId), {
    fileUrl: url,
    updatedAt: serverTimestamp(),
  });
  return url;
}

export async function deleteDocumentFile(params: { docId: string; filePath: string }): Promise<void> {
  const objectRef = ref(storage, params.filePath);
  await deleteObject(objectRef);
  await updateDoc(doc(db, DOCUMENTS_COLLECTION, params.docId), {
    fileUrl: null,
    updatedAt: serverTimestamp(),
  });
}

export async function listVersions(docId: string): Promise<DocumentVersion[]> {
  const versionsRef = collection(db, DOCUMENTS_COLLECTION, docId, 'versions');
  const snap = await getDocs(query(versionsRef, orderBy('version', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DocumentVersion, 'id'>) }));
}

export async function enqueueForHanna(params: {
  userId: string;
  documentId: string;
  payload: DocumentContent;
}): Promise<void> {
  await addDoc(collection(db, HANNA_QUEUE_COLLECTION), {
    status: 'pending',
    userId: params.userId,
    documentId: params.documentId,
    payload: params.payload,
    createdAt: serverTimestamp(),
  });
}
