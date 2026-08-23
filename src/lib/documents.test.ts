import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, storage: {} }));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
}));
vi.mock('firebase/storage', () => ({
  deleteObject: vi.fn(),
  getDownloadURL: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
}));

import { documentTypeLabel, getDocumentDownloadName, inferDocumentType } from './documents';

function fakeFile(name: string, type: string) {
  return { name, type } as File;
}

describe('document file contracts', () => {
  it('uses actual MIME types and extensions for viewer dispatch', () => {
    expect(inferDocumentType(fakeFile('lesson.pdf', 'application/pdf'))).toBe('pdf');
    expect(inferDocumentType(fakeFile('lesson.mp4', 'video/mp4'))).toBe('video');
    expect(inferDocumentType(fakeFile('lesson.png', 'image/png'))).toBe('image');
    expect(inferDocumentType(fakeFile('lesson.docx', 'application/octet-stream'))).toBe('file');
  });

  it('keeps real filenames stable for downloads', () => {
    expect(getDocumentDownloadName({ title: 'Revision Pack', type: 'pdf', fileName: undefined })).toBe('Revision Pack.pdf');
    expect(getDocumentDownloadName({ title: 'Revision Pack', type: 'pdf', fileName: 'revision-pack.pdf' })).toBe('revision-pack.pdf');
    expect(documentTypeLabel('video', 'lesson.mp4')).toBe('Video');
    expect(documentTypeLabel('file', 'notes.docx')).toBe('DOCX file');
  });
});
