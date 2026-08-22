import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { User } from '@/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { syncUserDirectory } from '@/services/userProfileService';

export type AccountSetupStepKey = 'username' | 'profilePhoto' | 'bio' | 'emailVerification';

export interface AccountSetupStep {
  key: AccountSetupStepKey;
  label: string;
  description: string;
  complete: boolean;
}

export interface AccountSetupStatus {
  percentage: number;
  completedCount: number;
  totalCount: number;
  steps: AccountSetupStep[];
  missingSteps: AccountSetupStep[];
}

export function getAccountSetupStatus(
  profile: Partial<User> | null | undefined,
  authUser: Pick<FirebaseUser, 'emailVerified'> | null | undefined,
): AccountSetupStatus {
  const steps: AccountSetupStep[] = [
    {
      key: 'username',
      label: 'Choose a username',
      description: 'Make it easy for classmates and teachers to find you safely.',
      complete: Boolean(profile?.username?.trim()),
    },
    {
      key: 'profilePhoto',
      label: 'Add a profile photo',
      description: 'Help people recognize the right account before they start a chat.',
      complete: Boolean(profile?.profileImageUrl || profile?.profilePicture),
    },
    {
      key: 'bio',
      label: 'Complete your profile',
      description: 'Add a short bio so your learning community knows who you are.',
      complete: Boolean(profile?.bio?.trim()),
    },
    {
      key: 'emailVerification',
      label: 'Verify your email',
      description: 'Keep your account recoverable and your notifications secure.',
      complete: Boolean(authUser?.emailVerified || profile?.emailVerified),
    },
  ];

  const completedCount = steps.filter((step) => step.complete).length;
  return {
    percentage: Math.round((completedCount / steps.length) * 100),
    completedCount,
    totalCount: steps.length,
    steps,
    missingSteps: steps.filter((step) => !step.complete),
  };
}

const getReminderDateKey = (date = new Date()): string =>
  date.toISOString().slice(0, 10);

export async function createAccountSetupReminder(
  profile: User,
  authUser: Pick<FirebaseUser, 'uid' | 'emailVerified'>,
  role: string,
): Promise<AccountSetupStatus> {
  const status = getAccountSetupStatus(profile, authUser);
  if (status.percentage >= 100) return status;

  const dateKey = getReminderDateKey();
  const reminderId = `account-setup-${authUser.uid}-${dateKey}`;
  const reminderRef = doc(db, 'notifications', reminderId);
  const message = `Your account is ${status.percentage}% complete. Finish your setup to secure your account and help your learning community find you.`;

  const existingReminder = await getDoc(reminderRef);
  const reminderData: Record<string, unknown> = {
    type: 'reminder',
    reminderKind: 'account_setup',
    title: 'Finish setting up your Liverton account',
    body: message,
    message,
    targetAudience: [],
    targetUsers: [authUser.uid],
    recipientId: authUser.uid,
    sender: 'Liverton Learning',
    senderId: 'liverton-system',
    senderRole: 'system',
    redirectUrl: '/profile',
    link: '/profile',
    setupPercentage: status.percentage,
    missingSteps: status.missingSteps.map((step) => step.key),
    role,
    isHidden: false,
    updatedAt: serverTimestamp(),
  };
  if (!existingReminder.exists()) {
    reminderData.isRead = false;
    reminderData.createdAt = serverTimestamp();
  }

  await setDoc(reminderRef, reminderData, { merge: true });
  return status;
}

export async function clearAccountSetupReminder(uid: string): Promise<void> {
  const reminderRef = doc(db, 'notifications', `account-setup-${uid}-${getReminderDateKey()}`);
  try {
    await updateDoc(reminderRef, {
      isHidden: true,
      isRead: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    if (error?.code !== 'not-found') throw error;
  }
}

/**
 * Keep the searchable directory current whenever a signed-in user opens the app.
 * The directory intentionally contains no private profile fields.
 */
export async function syncAccountIdentity(profile: User, authUser: Pick<FirebaseUser, 'uid' | 'email'>): Promise<void> {
  await syncUserDirectory({
    uid: authUser.uid,
    email: authUser.email || profile.email,
    fullName: profile.fullName,
    role: profile.role,
    username: profile.username,
    profilePicture: profile.profilePicture,
    profileImageUrl: profile.profileImageUrl,
  });
}
