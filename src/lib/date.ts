import type { Timestamp } from 'firebase/firestore';

export function toDate(value: unknown): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  // Firestore Timestamp
  if (typeof value === 'object' && value && 'toDate' in (value as any) && typeof (value as any).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
}
