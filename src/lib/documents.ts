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
  type DocumentData,
  type QueryDocumentSnapshot
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

const EXTENSION_TYPE_MAP: Record<string, DocumentType> = {
  pdf: 'pdf',
  doc: 'file',
  docx: 'file',
  xls: 'file',
  xlsx: 'file',
  ppt: 'file',
  pptx: 'file',
  txt: 'file',
  csv: 'file',
  zip: 'file',
  rar: 'file',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  m4v: 'video',
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  m4a: 'audio',
};

export function inferDocumentType(file: Pick<File, 'name' | 'type'>): DocumentType {
  const mime = file.type.toLowerCase();
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  const extension = file.name.toLowerCase().split('.').pop() || '';
  return EXTENSION_TYPE_MAP[extension] || 'file';
}

export function documentTypeLabel(type: DocumentType, fileName = ''): string {
  if (type === 'folder') return 'Folder';
  if (type === 'pdf') return 'PDF document';
  if (type === 'image') return 'Image';
  if (type === 'video') return 'Video';
  if (type === 'audio') return 'Audio';
  if (type === 'doc') return 'Text document';
  if (type === 'sheet') return 'Spreadsheet';
  if (type === 'presentation') return 'Presentation';
  const extension = fileName.toLowerCase().split('.').pop();
  return extension ? `${extension.toUpperCase()} file` : 'File';
}

export function getDocumentDownloadName(document: Pick<DocumentMeta, 'title' | 'type' | 'fileName'>): string {
  if (document.fileName) return document.fileName;
  const extensionByType: Partial<Record<DocumentType, string>> = {
    pdf: 'pdf',
    image: 'jpg',
    video: 'mp4',
    audio: 'mp3',
  };
  const extension = extensionByType[document.type];
  return extension && !document.title.toLowerCase().endsWith(`.${extension}`)
    ? `${document.title}.${extension}`
    : document.title;
}

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
    // Firestore rejects `undefined` field values in addDoc, so always
    // coerce optional fields to null instead.
    schoolId: params.schoolId ?? null,
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
  content?: DocumentContent;
}): Promise<string> {
  try {
    const content = params.content ?? getDefaultContent(params.type);
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

  // Rules-compatible queries: broad collection scans are rejected by the
  // security rules for regular users, so we subscribe to constrained queries
  // (owned + shared-with-me) and merge them client-side.
  const toMeta = (d: QueryDocumentSnapshot<DocumentData>): DocumentMeta => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as DocumentMeta;
  };

  // Platform & school admins keep the broader (rules-permitted) queries
  if (params.role === 'platform_admin' || (params.role === 'school_admin' && params.schoolId)) {
    const q = params.role === 'platform_admin'
      ? query(docsRef, orderBy('updatedAt', 'desc'))
      : query(docsRef, where('schoolId', '==', params.schoolId), orderBy('updatedAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => params.onChange(snap.docs.map(toMeta)),
      (err) => params.onError?.(err instanceof Error ? err.message : 'Failed to load documents')
    );
  }

  const ownedQuery = query(docsRef, where('ownerId', '==', params.userId), orderBy('updatedAt', 'desc'));
  const sharedQuery = query(docsRef, where('sharedWith', 'array-contains', params.userId), orderBy('updatedAt', 'desc'));

  const ownedDocs = new Map<string, DocumentMeta>();
  const sharedDocs = new Map<string, DocumentMeta>();
  let ownedReady = false;
  let sharedReady = false;
  let errored = false;

  const emit = () => {
    if (!ownedReady || !sharedReady || errored) return;
    const merged = new Map<string, DocumentMeta>([...ownedDocs, ...sharedDocs]);
    const sorted = [...merged.values()].sort(
      (a, b) => (b.updatedAt?.getTime?.() || 0) - (a.updatedAt?.getTime?.() || 0)
    );
    params.onChange(sorted);
  };

  const handleError = (err: Error) => {
    if (errored) return;
    errored = true;
    params.onError?.(err.message || 'Failed to load documents');
  };

  const unsubOwned = onSnapshot(
    ownedQuery,
    (snap) => {
      ownedDocs.clear();
      snap.docs.forEach((d) => ownedDocs.set(d.id, toMeta(d)));
      ownedReady = true;
      emit();
    },
    handleError
  );

  const unsubShared = onSnapshot(
    sharedQuery,
    (snap) => {
      sharedDocs.clear();
      snap.docs.forEach((d) => sharedDocs.set(d.id, toMeta(d)));
      sharedReady = true;
      emit();
    },
    handleError
  );

  return () => {
    unsubOwned();
    unsubShared();
  };
}

export async function getDocument(docId: string): Promise<DocumentRecord | null> {
  try {
    console.log('Fetching document:', docId);
    const snap = await getDoc(doc(db, DOCUMENTS_COLLECTION, docId));
    
    if (!snap.exists()) {
      console.warn('Document not found:', docId);
      return null;
    }
    
    const data = snap.data() as DocumentData;
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
    const updateData: Record<string, unknown> = {
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
  userIds.filter(Boolean).forEach((id) => existing.add(id));
  await updateDoc(refDoc, {
    sharedWith: Array.from(existing),
    updatedAt: serverTimestamp(),
  });
}

export async function shareDocumentWithUsers(params: {
  docId: string;
  title: string;
  userIds: string[];
  senderId: string;
  senderName: string;
  senderRole: UserRole;
}): Promise<void> {
  const userIds = Array.from(new Set(params.userIds.filter((id) => id && id !== params.senderId)));
  if (userIds.length === 0) throw new Error('Choose at least one other user.');

  await shareInternally(params.docId, userIds);
  await Promise.all(userIds.map((userId) => addDoc(collection(db, 'notifications'), {
    title: `Document shared with you: ${params.title}`,
    body: `${params.senderName} shared “${params.title}” with you. Open it from Documents or use the link below.`,
    content: `${params.senderName} shared “${params.title}” with you.`,
    type: 'announcement',
    targetAudience: [],
    targetUsers: [userId],
    link: `/dashboard/documents/${params.docId}`,
    sender: params.senderName,
    senderId: params.senderId,
    senderRole: params.senderRole,
    createdAt: serverTimestamp(),
    isRead: false,
  })));
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

export interface UserReadingProgress {
  lastOpenedAt: any;
  lastPageRead: number;
  percentage: number;
  bookmarkedPages: number[];
  userId: string;
  documentId: string;
}

export async function createFolder(params: {
  title: string;
  ownerId: string;
  role: UserRole;
  schoolId?: string | null;
  parentId?: string | null;
}): Promise<string> {
  const docRef = await addDoc(collection(db, DOCUMENTS_COLLECTION), {
    title: params.title,
    type: 'folder',
    ownerId: params.ownerId,
    role: params.role,
    schoolId: params.schoolId ?? null,
    folderId: params.parentId ?? null,
    sharedWith: [],
    visibility: 'private',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function moveDocument(docId: string, targetFolderId: string | null): Promise<void> {
  await updateDoc(doc(db, DOCUMENTS_COLLECTION, docId), {
    folderId: targetFolderId,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleDocumentFavorite(docId: string, isFavorite: boolean): Promise<void> {
  await updateDoc(doc(db, DOCUMENTS_COLLECTION, docId), {
    isFavorite,
    updatedAt: serverTimestamp(),
  });
}

export async function updateReadingProgress(params: {
  docId: string;
  userId: string;
  lastPageRead: number;
  totalPages: number;
  bookmarkedPages?: number[];
}): Promise<void> {
  const progressRef = doc(db, DOCUMENTS_COLLECTION, params.docId, 'userProgress', params.userId);
  const percentage = params.totalPages > 0 ? Math.round((params.lastPageRead / params.totalPages) * 100) : 0;

  const data: Record<string, any> = {
    lastOpenedAt: serverTimestamp(),
    lastPageRead: params.lastPageRead,
    percentage,
    userId: params.userId,
    documentId: params.docId,
  };

  if (params.bookmarkedPages !== undefined) {
    data.bookmarkedPages = params.bookmarkedPages;
  }

  await setDoc(progressRef, data, { merge: true });
}

export async function getReadingProgress(docId: string, userId: string): Promise<UserReadingProgress | null> {
  const snap = await getDoc(doc(db, DOCUMENTS_COLLECTION, docId, 'userProgress', userId));
  if (!snap.exists()) return null;
  return snap.data() as UserReadingProgress;
}
