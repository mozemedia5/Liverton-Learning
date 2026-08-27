import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  identity: { uid: 'student-1', email: 'student@example.com', name: 'Student One' },
  payment: {
    id: 'liverton-student-1-course-1-intent',
    txRef: 'liverton-student-1-course-1-intent',
    userId: 'student-1',
    courseId: 'course-1',
    amount: 25000,
    currency: 'UGX',
    status: 'pending',
  } as Record<string, unknown>,
  course: {
    id: 'course-1',
    title: 'Algebra One',
    teacherId: 'teacher-1',
    price: 25000,
    currency: 'UGX',
    status: 'active',
    visibility: 'public',
    enrolledStudents: [],
  } as Record<string, unknown>,
  documents: [] as Array<{ collection: string; id: string; data: Record<string, unknown> }>,
  notificationCounter: 0,
  providerTransaction: {
    id: 987654,
    status: 'successful',
    tx_ref: 'liverton-student-1-course-1-intent',
    amount: 25000,
    currency: 'UGX',
  } as Record<string, unknown>,
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { arrayUnion: (value: string) => ({ __arrayUnion: value }) },
}));

vi.mock('./_lib/server.js', () => ({
  applyCors: vi.fn(),
  getAdminFirestore: () => fakeDb,
  json: (res: FakeResponse, status: number, payload: Record<string, unknown>) => res.status(status).json(payload),
  parseBody: (req: { body?: Record<string, unknown> }) => req.body || {},
  requireIdentity: async () => state.identity,
  safeString: (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '',
}));

class FakeResponse {
  statusCode = 200;
  body: Record<string, unknown> = {};
  status(code: number) { this.statusCode = code; return this; }
  json(payload: Record<string, unknown>) { this.body = payload; return this; }
  end() { return this; }
  setHeader() { return this; }
}

type FakeRequest = { method: string; body?: Record<string, unknown>; headers?: Record<string, string> };

const snapshot = (data?: Record<string, unknown>) => ({ exists: Boolean(data), data: () => data });
const copy = (data: Record<string, unknown>) => JSON.parse(JSON.stringify(data)) as Record<string, unknown>;

const fakeDb = {
  collection(name: string) {
    return {
      doc(id?: string) {
        const documentId = id || `${name}-${state.documents.length + state.notificationCounter + 1}`;
        if (!id && name === 'notifications') state.notificationCounter += 1;
        return {
          id: documentId,
          async get() {
            if (name === 'payments' && documentId === state.payment.txRef) return snapshot(state.payment);
            if (name === 'courses' && documentId === state.course.id) return snapshot(state.course);
            const found = state.documents.find((item) => item.collection === name && item.id === documentId);
            return snapshot(found?.data);
          },
          async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
            if (name === 'payments' && documentId === state.payment.txRef) { Object.assign(state.payment, copy(data)); return; }
            if (name === 'courses' && documentId === state.course.id) { Object.assign(state.course, copy(data)); return; }
            const found = state.documents.find((item) => item.collection === name && item.id === documentId);
            if (found && options?.merge) found.data = { ...found.data, ...copy(data) };
            else if (found) found.data = copy(data);
            else state.documents.push({ collection: name, id: documentId, data: copy(data) });
          },
          async update(data: Record<string, unknown>) {
            if (name === 'courses' && documentId === state.course.id) Object.assign(state.course, copy(data));
            else if (name === 'payments' && documentId === state.payment.txRef) Object.assign(state.payment, copy(data));
          },
        };
      },
    };
  },
  async runTransaction(callback: (transaction: any) => Promise<void>) {
    const transaction = {
      get: async (reference: any) => reference.get(),
      update: async (reference: any, data: Record<string, unknown>) => {
        if (reference.id === state.course.id && (data.enrolledStudents as any)?.__arrayUnion) {
          state.course.enrolledStudents = [...new Set([...(state.course.enrolledStudents as string[]), (data.enrolledStudents as any).__arrayUnion])];
        } else await reference.update(data);
      },
      set: async (reference: any, data: Record<string, unknown>, options?: { merge?: boolean }) => reference.set(data, options),
    };
    await callback(transaction);
  },
  batch() {
    const writes: Array<{ reference: any; data: Record<string, unknown> }> = [];
    return {
      set(reference: any, data: Record<string, unknown>) { writes.push({ reference, data }); },
      async commit() { for (const write of writes) await write.reference.set(write.data); },
    };
  },
};

const handlerRequest = (body: Record<string, unknown>): FakeRequest => ({ method: 'POST', body, headers: { authorization: 'Bearer test-token' } });

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const { default: verifyPayment } = await import('./flutterwave/verify');
const { default: notifyCourseUpdate } = await import('./courses/notify-update');

describe('payment verification and student notification integration', () => {
  beforeEach(() => {
    state.identity = { uid: 'student-1', email: 'student@example.com', name: 'Student One' };
    state.payment = { id: 'liverton-student-1-course-1-intent', txRef: 'liverton-student-1-course-1-intent', userId: 'student-1', courseId: 'course-1', amount: 25000, currency: 'UGX', status: 'pending' };
    state.course = { id: 'course-1', title: 'Algebra One', teacherId: 'teacher-1', price: 25000, currency: 'UGX', status: 'active', visibility: 'public', enrolledStudents: [] };
    state.documents.length = 0;
    state.notificationCounter = 0;
    state.providerTransaction = { id: 987654, status: 'successful', tx_ref: 'liverton-student-1-course-1-intent', amount: 25000, currency: 'UGX' };
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ status: 'success', data: state.providerTransaction }) });
    process.env.FLW_SECRET_KEY = 'test-secret';
  });

  it('verifies the provider transaction, enrolls the learner, and records completion atomically', async () => {
    const response = new FakeResponse();
    await verifyPayment(handlerRequest({ transactionId: '987654', txRef: state.payment.txRef }) as any, response as any);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ verified: true, accessGranted: true, courseId: 'course-1' });
    expect(state.course.enrolledStudents).toEqual(['student-1']);
    expect(state.payment).toMatchObject({ status: 'completed', providerReference: '987654' });
    expect(state.documents.some((item) => item.collection === 'enrollments' && item.id === 'course-1_student-1')).toBe(true);
  });

  it('rejects a transaction whose amount was tampered with and grants no access', async () => {
    state.providerTransaction.amount = 1;
    const response = new FakeResponse();
    await verifyPayment(handlerRequest({ transactionId: '987654', txRef: state.payment.txRef }) as any, response as any);

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({ verified: false, accessGranted: false });
    expect(state.course.enrolledStudents).toEqual([]);
    expect(state.payment.status).toBe('pending');
  });

  it('does not call Flutterwave again when the payment was already completed', async () => {
    state.payment.status = 'completed';
    const response = new FakeResponse();
    await verifyPayment(handlerRequest({ transactionId: '987654', txRef: state.payment.txRef }) as any, response as any);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({ verified: true, accessGranted: true, courseId: 'course-1' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('notifies every enrolled student only when the owning teacher requests the update', async () => {
    state.identity = { uid: 'teacher-1', email: 'teacher@example.com', name: 'Teacher One' };
    state.course.enrolledStudents = ['student-1', 'student-2'];
    const response = new FakeResponse();
    await notifyCourseUpdate(handlerRequest({ courseId: 'course-1' }) as any, response as any);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ notified: 2 });
    expect(state.documents.filter((item) => item.collection === 'notifications')).toHaveLength(2);
    expect(state.documents[0].data).toMatchObject({ targetUsers: ['student-1'], courseId: 'course-1', type: 'course_update' });
    expect(state.documents[1].data).toMatchObject({ targetUsers: ['student-2'], courseId: 'course-1', type: 'course_update' });
  });

  it('rejects notification requests from a non-owner', async () => {
    state.identity = { uid: 'teacher-2', email: 'other@example.com', name: 'Other Teacher' };
    const response = new FakeResponse();
    await notifyCourseUpdate(handlerRequest({ courseId: 'course-1' }) as any, response as any);

    expect(response.statusCode).toBe(403);
    expect(state.documents.filter((item) => item.collection === 'notifications')).toHaveLength(0);
  });
});
