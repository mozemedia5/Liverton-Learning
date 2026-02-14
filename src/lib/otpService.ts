import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, Timestamp, updateDoc } from 'firebase/firestore';

/**
 * OTP Service for handling email-based OTP verification
 * Generates 6-digit OTP codes, sends them via email, and validates them
 */

interface OTPRecord {
  id?: string;
  email: string;
  otp: string; // Hashed OTP for security
  plainOtp?: string; // Only used during generation, never stored
  createdAt: Timestamp;
  expiresAt: Timestamp;
  attempts: number;
  verified: boolean;
}

/**
 * Generate a random 6-digit OTP code
 * @returns 6-digit OTP string
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash OTP for secure storage
 * Uses SHA-256 to hash the OTP before storing in database
 * @param otp - Plain text OTP to hash
 * @returns Hashed OTP
 */
function hashOTP(otp: string): string {
  // Simple hash function for browser environment
  // In production, use a proper hashing library
  let hash = 0;
  for (let i = 0; i < otp.length; i++) {
    const char = otp.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Send OTP email to student's email address
 * Uses Resend email service to deliver OTP
 * @param studentEmail - Student's email address
 * @param otp - OTP code to send
 * @param studentName - Student's name for personalization
 * @returns Success status
 */
export async function sendOTPEmail(
  studentEmail: string,
  otp: string,
  studentName: string = 'Student'
): Promise<boolean> {
  try {
    // Call our API route to send email via Resend
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: studentEmail,
        otp,
        studentName,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send OTP email:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
}

/**
 * Create and send OTP for student email verification
 * Generates OTP, stores it in database, and sends via email
 * @param studentEmail - Student's email to verify
 * @param studentName - Student's name for email personalization
 * @returns Success status and error message if failed
 */
export async function createAndSendOTP(
  studentEmail: string,
  studentName: string = 'Student'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete any existing OTP for this email (cleanup old attempts)
    const existingOTPs = await getDocs(
      query(collection(db, 'otpCodes'), where('email', '==', studentEmail))
    );

    for (const doc of existingOTPs.docs) {
      await deleteDoc(doc.ref);
    }

    // Generate new OTP
    const plainOtp = generateOTP();
    const hashedOtp = hashOTP(plainOtp);

    // Set expiration to 10 minutes from now
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(
      new Date(now.toDate().getTime() + 10 * 60 * 1000)
    );

    // Store OTP in database
    await addDoc(collection(db, 'otpCodes'), {
      email: studentEmail,
      otp: hashedOtp,
      createdAt: now,
      expiresAt,
      attempts: 0,
      verified: false,
    } as OTPRecord);

    // Send OTP via email
    const emailSent = await sendOTPEmail(studentEmail, plainOtp, studentName);

    if (!emailSent) {
      return {
        success: false,
        error: 'Failed to send OTP email. Please try again.',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating and sending OTP:', error);
    return {
      success: false,
      error: 'An error occurred while sending OTP. Please try again.',
    };
  }
}

/**
 * Verify OTP code entered by parent
 * Checks if OTP is valid, not expired, and hasn't exceeded max attempts
 * @param studentEmail - Student's email address
 * @param enteredOtp - OTP code entered by parent
 * @returns Success status and error message if failed
 */
export async function verifyOTP(
  studentEmail: string,
  enteredOtp: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find OTP record for this email
    const otpQuery = query(
      collection(db, 'otpCodes'),
      where('email', '==', studentEmail)
    );
    const otpDocs = await getDocs(otpQuery);

    if (otpDocs.empty) {
      return {
        success: false,
        error: 'No OTP found for this email. Please request a new one.',
      };
    }

    const otpDoc = otpDocs.docs[0];
    const otpData = otpDoc.data() as OTPRecord;

    // Check if OTP has expired
    const now = Timestamp.now();
    if (now.toDate() > otpData.expiresAt.toDate()) {
      // Delete expired OTP
      await deleteDoc(otpDoc.ref);
      return {
        success: false,
        error: 'OTP has expired. Please request a new one.',
      };
    }

    // Check if max attempts exceeded (5 attempts)
    if (otpData.attempts >= 5) {
      // Delete OTP after max attempts
      await deleteDoc(otpDoc.ref);
      return {
        success: false,
        error: 'Too many incorrect attempts. Please request a new OTP.',
      };
    }

    // Hash entered OTP and compare with stored hash
    const hashedEnteredOtp = hashOTP(enteredOtp);

    if (hashedEnteredOtp !== otpData.otp) {
      // Increment attempts
      const newAttempts = otpData.attempts + 1;
      await updateDoc(otpDoc.ref, {
        attempts: newAttempts,
      });

      const remainingAttempts = 5 - newAttempts;
      return {
        success: false,
        error: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
      };
    }

    // OTP is valid - mark as verified and delete
    await deleteDoc(otpDoc.ref);

    return { success: true };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      error: 'An error occurred while verifying OTP. Please try again.',
    };
  }
}

/**
 * Resend OTP to student's email
 * Useful if student didn't receive the first OTP
 * @param studentEmail - Student's email address
 * @param studentName - Student's name for email personalization
 * @returns Success status and error message if failed
 */
export async function resendOTP(
  studentEmail: string,
  studentName: string = 'Student'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing OTP
    const existingOTPs = await getDocs(
      query(collection(db, 'otpCodes'), where('email', '==', studentEmail))
    );

    for (const doc of existingOTPs.docs) {
      await deleteDoc(doc.ref);
    }

    // Create and send new OTP
    return await createAndSendOTP(studentEmail, studentName);
  } catch (error) {
    console.error('Error resending OTP:', error);
    return {
      success: false,
      error: 'An error occurred while resending OTP. Please try again.',
    };
  }
}
