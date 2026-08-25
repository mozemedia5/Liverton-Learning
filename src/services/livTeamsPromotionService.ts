import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type LivTeamPromotionStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface LivTeamPromotion {
  id: string;
  teamId: string;
  teamName: string;
  createdBy: string;
  createdByName: string;
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
  status: LivTeamPromotionStatus;
  moderationNote?: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewerId?: string;
  expiresAt?: Date | null;
}

const toDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') return (value as { toDate: () => Date }).toDate();
  return new Date(value as string);
};

const mapPromotion = (snapshot: { id: string; data: () => DocumentData }): LivTeamPromotion => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    teamId: data.teamId || '',
    teamName: data.teamName || 'Liv Team',
    createdBy: data.createdBy || '',
    createdByName: data.createdByName || 'Team member',
    title: data.title || '',
    description: data.description || '',
    imageUrl: data.imageUrl || '',
    destinationUrl: data.destinationUrl || '',
    status: data.status || 'pending',
    moderationNote: data.moderationNote || undefined,
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
    reviewedAt: toDate(data.reviewedAt),
    reviewerId: data.reviewerId || undefined,
    expiresAt: toDate(data.expiresAt) || null,
  };
};

export async function submitLivTeamPromotion(input: {
  teamId: string;
  teamName: string;
  createdBy: string;
  createdByName: string;
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
  expiresAt?: Date | null;
}): Promise<string> {
  const created = Timestamp.now();
  const ref = await addDoc(collection(db, 'livTeamPromotions'), {
    ...input,
    status: 'pending',
    createdAt: created,
    updatedAt: created,
    expiresAt: input.expiresAt ? Timestamp.fromDate(input.expiresAt) : null,
  });
  return ref.id;
}

export async function getLivTeamPromotions(): Promise<LivTeamPromotion[]> {
  const snapshot = await getDocs(query(collection(db, 'livTeamPromotions'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map(mapPromotion);
}

export function subscribeToApprovedLivTeamPromotions(callback: (promotions: LivTeamPromotion[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'livTeamPromotions'), (snapshot: QuerySnapshot<DocumentData>) => {
    const now = new Date();
    const promotions = snapshot.docs
      .map(mapPromotion)
      .filter((promotion) => promotion.status === 'approved' && (!promotion.expiresAt || promotion.expiresAt > now))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    callback(promotions);
  });
}

export async function approveLivTeamPromotion(id: string, reviewerId: string, moderationNote = ''): Promise<void> {
  await updateDoc(doc(db, 'livTeamPromotions', id), {
    status: 'approved',
    moderationNote,
    reviewerId,
    reviewedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function rejectLivTeamPromotion(id: string, reviewerId: string, moderationNote: string): Promise<void> {
  await updateDoc(doc(db, 'livTeamPromotions', id), {
    status: 'rejected',
    moderationNote,
    reviewerId,
    reviewedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteLivTeamPromotion(id: string): Promise<void> {
  await deleteDoc(doc(db, 'livTeamPromotions', id));
}

export const promotionStatusLabel = (status: LivTeamPromotionStatus) => {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'expired') return 'Expired';
  return 'Pending review';
};
