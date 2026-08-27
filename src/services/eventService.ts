import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDate } from '@/lib/date';
import type { UserRole } from '@/types';

export type EventCategory =
  | 'class'
  | 'exam'
  | 'meeting'
  | 'workshop'
  | 'social'
  | 'sports'
  | 'holiday'
  | 'other';

export type EventVisibility = 'public' | 'school' | 'private';

export interface AppEvent {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  date: string; // ISO date string (yyyy-mm-dd)
  time?: string; // HH:mm
  location?: string;
  category: EventCategory;
  visibility: EventVisibility;
  createdBy: string;
  creatorName?: string;
  creatorRole?: UserRole;
  schoolId?: string | null;
  attendees?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const EVENTS_COLLECTION = 'events';

interface FirestoreEventPayload extends Omit<AppEvent, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt?: unknown;
  updatedAt?: unknown;
}

function toAppEvent(id: string, data: Record<string, unknown>): AppEvent {
  return {
    id,
    title: (data.title as string) || 'Untitled Event',
    description: (data.description as string) || '',
    imageUrl: (data.imageUrl as string) || null,
    date: (data.date as string) || '',
    time: (data.time as string) || '',
    location: (data.location as string) || '',
    category: ((data.category as EventCategory) || 'other'),
    visibility: ((data.visibility as EventVisibility) || 'public'),
    createdBy: (data.createdBy as string) || '',
    creatorName: (data.creatorName as string) || '',
    creatorRole: (data.creatorRole as UserRole) || undefined,
    schoolId: (data.schoolId as string) || null,
    attendees: Array.isArray(data.attendees) ? (data.attendees as string[]) : [],
    createdAt: data.createdAt ? toDate(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined,
  };
}

export async function createEvent(
  params: Omit<AppEvent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  // Strip undefined values: Firestore addDoc rejects undefined fields.
  const payload: Record<string, unknown> = {
    title: params.title,
    description: params.description ?? '',
    imageUrl: params.imageUrl ?? null,
    date: params.date,
    time: params.time ?? '',
    location: params.location ?? '',
    category: params.category,
    visibility: params.creatorRole === 'platform_admin' ? params.visibility : 'private',
    createdBy: params.createdBy,
    creatorName: params.creatorName ?? '',
    creatorRole: params.creatorRole ?? null,
    schoolId: params.schoolId ?? null,
    attendees: params.attendees ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, EVENTS_COLLECTION), payload);
  return docRef.id;
}

export async function updateEvent(
  eventId: string,
  updates: Partial<FirestoreEventPayload>
): Promise<void> {
  const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) clean[key] = value;
  });
  await updateDoc(doc(db, EVENTS_COLLECTION, eventId), clean);
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, EVENTS_COLLECTION, eventId));
}

/**
 * Subscribe to events visible to the current user:
 * public events + events the user created + school-wide events.
 */
export function subscribeToEvents(
  userId: string,
  schoolId: string | null | undefined,
  onChange: (events: AppEvent[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  const eventsRef = collection(db, EVENTS_COLLECTION);
  const merged = new Map<string, AppEvent>();

  const emit = () => {
    const list = Array.from(merged.values()).sort((a, b) =>
      (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))
    );
    onChange(list);
  };

  const handleError = (error: unknown) => {
    console.error('Events subscription error:', error);
    onError?.(error instanceof Error ? error.message : 'Failed to load events');
  };

  const applySnapshot = (snapshot: { docs: { id: string; data: () => Record<string, unknown> }[] }) => {
    snapshot.docs.forEach((d) => {
      merged.set(d.id, toAppEvent(d.id, d.data()));
    });
    emit();
  };

  // Rules-compatible queries (equality filters only, merged + sorted client-side):
  // 1) public events  2) events created by me (incl. private)  3) school events
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(query(eventsRef, where('visibility', '==', 'public')), applySnapshot, handleError)
  );
  unsubs.push(
    onSnapshot(query(eventsRef, where('createdBy', '==', userId)), applySnapshot, handleError)
  );
  if (schoolId) {
    unsubs.push(
      onSnapshot(
        query(eventsRef, where('visibility', '==', 'school'), where('schoolId', '==', schoolId)),
        applySnapshot,
        handleError
      )
    );
  }

  return () => unsubs.forEach((u) => u());
}
