type OTPResult = { success: boolean; error?: string };

async function callOtpEndpoint(path: string, body: Record<string, string>): Promise<OTPResult> {
  try {
    const response = await fetch(`/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: typeof payload.error === 'string' ? payload.error : 'Verification service unavailable.' };
    }
    return { success: true };
  } catch (error) {
    console.error(`OTP ${path} request failed`, error);
    return { success: false, error: 'Could not reach the verification service. Please try again.' };
  }
}

/** Requests a server-generated verification code. The code is never accepted from the client. */
export async function createAndSendOTP(studentEmail: string, studentName = 'Student'): Promise<OTPResult> {
  return callOtpEndpoint('send-otp', { email: studentEmail, studentName });
}

export async function resendOTP(studentEmail: string, studentName = 'Student'): Promise<OTPResult> {
  return createAndSendOTP(studentEmail, studentName);
}

export async function verifyOTP(studentEmail: string, enteredOtp: string): Promise<OTPResult> {
  return callOtpEndpoint('verify-otp', { email: studentEmail, otp: enteredOtp });
}

/** @deprecated OTP generation is intentionally server-only. */
export function generateOTP(): never {
  throw new Error('OTP generation is server-only');
}
