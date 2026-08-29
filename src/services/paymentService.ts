import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';

const API_BASE_URL = (import.meta.env.VITE_VERCEL_API_BASE_URL || '').replace(/\/$/, '');

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in before starting payment.');
  return { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' };
}

async function parseError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return new Error(typeof body.error === 'string' ? body.error : 'Payment service is unavailable.');
}

export interface PaymentRecord {
  id: string;
  item: string;
  type: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  date?: Date;
  reference: string;
  courseId?: string;
}

function asDate(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') return (value as { toDate: () => Date }).toDate();
  if (!value) return undefined;
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function subscribeToPaymentHistory(userId: string, callback: (payments: PaymentRecord[]) => void): Unsubscribe {
  const paymentQuery = query(collection(db, 'payments'), where('userId', '==', userId));
  return onSnapshot(paymentQuery, snapshot => {
    const payments = snapshot.docs.map(item => {
      const data = item.data();
      return { id: item.id, item: String(data.item || 'Learning module'), type: String(data.type || 'Course Purchase'), amount: Number(data.amount || 0), currency: String(data.currency || 'UGX'), status: (data.status || 'pending') as PaymentRecord['status'], date: asDate(data.createdAt), reference: String(data.providerReference || data.txRef || item.id), courseId: typeof data.courseId === 'string' ? data.courseId : undefined };
    });
    callback(payments.sort((left, right) => (right.date?.getTime() || 0) - (left.date?.getTime() || 0)));
  }, () => callback([]));
}

export async function initializeModulePayment(courseId: string) {
  const response = await fetch(`${API_BASE_URL}/api/flutterwave/initialize`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ courseId }),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<{ checkoutUrl?: string; txRef?: string; courseId: string; alreadyEnrolled?: boolean }>;
}

export async function verifyModulePayment(transactionId: string, txRef: string) {
  const response = await fetch(`${API_BASE_URL}/api/flutterwave/verify`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ transactionId, txRef }),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<{ verified: boolean; accessGranted: boolean; courseId?: string }>;
}
