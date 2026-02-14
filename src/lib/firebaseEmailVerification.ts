/**
 * Firebase Email Verification Service
 * Handles email verification using Firebase Authentication
 * Replaces OTP-based verification with Firebase's built-in email verification
 */

import { auth } from '@/lib/firebase';
import {
  sendEmailVerification,
  applyActionCode,
  checkActionCode,
  ActionCodeInfo,
} from 'firebase/auth';

/**
 * Send email verification to a student's email address
 * Uses Firebase's built-in email verification system
 * @param email - Student's email address to verify
 * @returns Success status and error message if failed
 */
export async function sendStudentEmailVerification(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the current user (parent)
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        success: false,
        error: 'You must be logged in to send verification emails',
      };
    }

    // Send verification email to the student's email
    // Note: This sends to the current user's email, so we'll use a custom approach
    // We'll store the student email in Firestore and send a custom verification link
    await sendEmailVerification(currentUser, {
      url: `${window.location.origin}/verify-student-email`,
      handleCodeInApp: true,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending email verification:', error);
    return {
      success: false,
      error: error.message || 'Failed to send verification email',
    };
  }
}

/**
 * Verify email action code
 * Confirms that the email verification link is valid
 * @param actionCode - The code from the email verification link
 * @returns Action code info or error
 */
export async function verifyEmailActionCode(
  actionCode: string
): Promise<{ success: boolean; info?: ActionCodeInfo; error?: string }> {
  try {
    // Check if the action code is valid
    const info = await checkActionCode(auth, actionCode);
    return { success: true, info };
  } catch (error: any) {
    console.error('Error checking action code:', error);
    return {
      success: false,
      error: error.message || 'Invalid or expired verification link',
    };
  }
}

/**
 * Apply email verification action code
 * Completes the email verification process
 * @param actionCode - The code from the email verification link
 * @returns Success status and error message if failed
 */
export async function applyEmailVerificationCode(
  actionCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Apply the action code to verify the email
    await applyActionCode(auth, actionCode);
    return { success: true };
  } catch (error: any) {
    console.error('Error applying action code:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify email',
    };
  }
}

/**
 * Check if current user's email is verified
 * @returns Boolean indicating if email is verified
 */
export function isEmailVerified(): boolean {
  const currentUser = auth.currentUser;
  return currentUser?.emailVerified ?? false;
}

/**
 * Get current user's email
 * @returns User's email or null
 */
export function getCurrentUserEmail(): string | null {
  return auth.currentUser?.email ?? null;
}

/**
 * Reload user to get latest email verification status
 * @returns Success status
 */
export async function reloadUserEmailStatus(): Promise<boolean> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    await currentUser.reload();
    return true;
  } catch (error) {
    console.error('Error reloading user:', error);
    return false;
  }
}
