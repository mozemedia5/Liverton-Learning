import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createBook,
  getBook,
  getAllPublishedBooks,
  createShort,
  getAllShorts,
  addReview,
  getReviewsForTarget,
  followTeacher,
  unfollowTeacher,
  checkIsFollowing,
  getEducatorWallet,
  requestWithdrawal,
  getTeacherBadges,
  isSupportedBookDocument
} from './tearnService';

// Mock Firebase Firestore methods
vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(),
    doc: vi.fn(),
    addDoc: vi.fn(() => Promise.resolve({ id: 'mock_doc_id' })),
    updateDoc: vi.fn(() => Promise.resolve()),
    getDoc: vi.fn(() => Promise.resolve({
      exists: () => true,
      id: 'mock_doc_id',
      data: () => ({
        title: 'Mock Quantum Physics Handbook',
        description: 'Exhaustive study guide',
        chapters: [],
        status: 'published',
        price: 19.99,
        ratingsCount: 0,
        averageRating: 0,
        balance: 1500,
        pending: 200,
        withdrawn: 100,
        followers: ['student_user_1']
      })
    })),
    getDocs: vi.fn(() => Promise.resolve({
      docs: [
        {
          id: 'doc_1',
          data: () => ({
            title: 'Mock Quantum Physics Handbook',
            chapters: [],
            status: 'published',
            price: 19.99,
            ratingsCount: 0,
            averageRating: 0,
            amount: 150,
            description: 'Sale transaction',
            createdAt: { toDate: () => new Date() }
          })
        }
      ]
    })),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    serverTimestamp: vi.fn(() => new Date()),
    increment: vi.fn((val) => val),
    arrayUnion: vi.fn((val) => [val]),
    arrayRemove: vi.fn((val) => [val]),
    onSnapshot: vi.fn((_q, callback) => {
      callback({
        docs: [
          {
            id: 'doc_1',
            data: () => ({
              title: 'Mock Quantum Physics Handbook',
              description: 'Exhaustive study guide',
              chapters: [],
              status: 'published',
              price: 19.99,
              ratingsCount: 0,
              averageRating: 0
            })
          }
        ]
      });
      return () => {};
    })
  };
});

vi.mock('@/lib/firebase', () => ({
  db: {}
}));

describe('TEARN Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Book document validation', () => {
    it('accepts PDF, DOC, and DOCX by MIME type or extension', () => {
      expect(isSupportedBookDocument({ name: 'guide.pdf', type: 'application/pdf' })).toBe(true);
      expect(isSupportedBookDocument({ name: 'guide.doc', type: '' })).toBe(true);
      expect(isSupportedBookDocument({ name: 'guide.DOCX', type: 'application/octet-stream' })).toBe(true);
      expect(isSupportedBookDocument({ name: 'guide.txt', type: 'text/plain' })).toBe(false);
    });
  });

  describe('Book Publishing', () => {
    it('creates and publishes a book draft', async () => {
      const bookId = await createBook('teacher_1', 'Prof. Liverton', {
        title: 'Mock Book',
        description: 'Exhaustive study guide',
        coverUrl: 'https://...',
        chapters: [],
        documentUrl: 'https://res.cloudinary.com/demo/raw/upload/guide.pdf',
        documentName: 'guide.pdf',
        documentType: 'application/pdf',
        status: 'draft',
        price: 15.99,
        currency: 'USD'
      });
      expect(bookId).toBe('mock_doc_id');
    });

    it('retrieves an educational book', async () => {
      const book = await getBook('mock_doc_id');
      expect(book).not.toBeNull();
      expect(book?.title).toBe('Mock Quantum Physics Handbook');
    });

    it('lists published books', async () => {
      const list = await getAllPublishedBooks();
      expect(list.length).toBe(1);
      expect(list[0].title).toBe('Mock Quantum Physics Handbook');
    });
  });

  describe('Educational Shorts', () => {
    it('creates educational Shorts successfully', async () => {
      const shortId = await createShort('teacher_1', 'Prof. Liverton', {
        title: 'Mock Physics in 60s',
        description: 'Mnemonic trick',
        videoUrl: 'https://...',
        courseId: 'course_1',
        learningLinkType: 'module',
        learningLinkTitle: 'Mock Physics module'
      });
      expect(shortId).toBe('mock_doc_id');
    });

    it('rejects educational Shorts without exactly one learning destination', async () => {
      await expect(createShort('teacher_1', 'Prof. Liverton', {
        title: 'Unlinked Short',
        videoUrl: 'https://...'
      })).rejects.toThrow('exactly one module or live lesson');
    });

    it('lists educational shorts', async () => {
      const list = await getAllShorts();
      expect(list.length).toBe(1);
    });
  });

  describe('Evaluations & Reviews', () => {
    it('adds reviews and evaluations on target contents', async () => {
      const revId = await addReview({
        type: 'book',
        targetId: 'book_1',
        studentId: 'student_1',
        studentName: 'Alex Mercer',
        rating: 5,
        comment: 'Brilliant textbook guide!'
      });
      expect(revId).toBe('mock_doc_id');
    });

    it('lists evaluations for target content', async () => {
      const list = await getReviewsForTarget('book_1');
      expect(list.length).toBe(1);
    });
  });

  describe('Educator Followers', () => {
    it('enables followers to follow educators', async () => {
      await expect(followTeacher('student_1', 'teacher_1')).resolves.not.toThrow();
    });

    it('enables followers to unfollow educators', async () => {
      await expect(unfollowTeacher('student_1', 'teacher_1')).resolves.not.toThrow();
    });

    it('checks follow states correctly', async () => {
      const isFollowing = await checkIsFollowing('student_user_1', 'teacher_1');
      expect(isFollowing).toBe(true);
    });
  });

  describe('Financial Wallet & Transactions', () => {
    it('retrieves educator wallet & transaction lists', async () => {
      const wallet = await getEducatorWallet('teacher_1');
      expect(wallet).not.toBeNull();
      expect(wallet.balance).toBe(1500);
    });

    it('creates withdrawals requests successfully', async () => {
      await expect(requestWithdrawal('teacher_1', 500)).resolves.not.toThrow();
    });
  });

  describe('Teaching Badges', () => {
    it('retrieves teacher badges list', async () => {
      const badges = await getTeacherBadges('teacher_1');
      expect(badges.length).toBeGreaterThan(0);
    });
  });
});
