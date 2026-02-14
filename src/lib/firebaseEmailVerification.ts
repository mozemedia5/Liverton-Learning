/**
 * Firebase Email Verification Service
 * Handles email verification for parent accounts
 */

import { 
  sendEmailVerification, 
  applyActionCode,
  checkActionCode,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

/**
 * Send verification email to user
 * @param user - Firebase user object
 * @returns Promise that resolves when email is sent
 */
export async function sendVerificationEmail(user: FirebaseUser): Promise<void> {
  try {
    const appUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'http://localhost:3000';
    
    await sendEmailVerification(user, {
      url: `${appUrl}/verify-email`,
      handleCodeInApp: true,
    });
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    throw new Error(error.message || 'Failed to send verification email');
  }
}

/**
 * Verify email using action code
 * @param actionCode - Code from email verification link
 * @returns Promise that resolves when email is verified
 */
export async function verifyEmailWithCode(actionCode: string): Promise<void> {
  try {
    // Verify the action code is valid
    await checkActionCode(auth, actionCode);
    
    // Apply the action code to verify the email
    await applyActionCode(auth, actionCode);
  } catch (error: any) {
    console.error('Error verifying email:', error);
    throw new Error(error.message || 'Failed to verify email');
  }
}

/**
 * Check if user's email is verified
 * @param user - Firebase user object
 * @returns Boolean indicating if email is verified
 */
export function isEmailVerified(user: FirebaseUser): boolean {
  return user.emailVerified;
}

/**
 * Get verification status
 * @param user - Firebase user object
 * @returns Object with verification status and email
 */
export function getVerificationStatus(user: FirebaseUser) {
  return {
    email: user.email,
    isVerified: user.emailVerified,
    verificationSentAt: user.metadata.creationTime,
  };
}
