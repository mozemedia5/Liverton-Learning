import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { verifyOTP, resendOTP } from '@/lib/otpService';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

/**
 * VerifyStudentEmail Component
 * 
 * This page allows parents to verify their student's email address by entering
 * an OTP code that was sent to the student's email.
 * 
 * Flow:
 * 1. Parent enters student's email during registration
 * 2. OTP is sent to student's email
 * 3. Parent enters the OTP code on this page
 * 4. After verification, parent completes registration
 * 
 * Props passed via location state:
 * - studentEmail: The student's email address
 * - studentName: The student's name (for display)
 * - onVerificationSuccess: Callback function after successful verification
 */

interface LocationState {
  studentEmail: string;
  studentName: string;
  onVerificationSuccess?: (email: string) => void;
}

export default function VerifyStudentEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  // Form state
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Redirect if no student email provided
  useEffect(() => {
    if (!state?.studentEmail) {
      navigate('/register/parent');
    }
  }, [state, navigate]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  /**
   * Handle OTP verification
   * Validates the OTP code entered by parent
   */
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate OTP format (should be 6 digits)
      if (!/^\d{6}$/.test(otp)) {
        setError('Please enter a valid 6-digit code');
        setLoading(false);
        return;
      }

      // Verify OTP with backend
      const result = await verifyOTP(state.studentEmail, otp);

      if (!result.success) {
        setError(result.error || 'Invalid OTP. Please try again.');
        setLoading(false);
        return;
      }

      // OTP verified successfully
      setSuccess(true);
      setOtp('');

      // Call success callback if provided
      if (state.onVerificationSuccess) {
        state.onVerificationSuccess(state.studentEmail);
      }

      // Redirect to next step after 2 seconds
      setTimeout(() => {
        navigate('/register/parent', {
          state: {
            verifiedStudentEmail: state.studentEmail,
            verifiedStudentName: state.studentName,
          },
        });
      }, 2000);
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle resending OTP
   * Sends a new OTP code to the student's email
   */
  const handleResendOTP = async () => {
    setResendLoading(true);
    setError('');

    try {
      const result = await resendOTP(state.studentEmail, state.studentName);

      if (!result.success) {
        setError(result.error || 'Failed to resend OTP. Please try again.');
      } else {
        setError('');
        // Set 60-second cooldown before allowing resend again
        setResendCooldown(60);
      }
    } catch (err) {
      console.error('Error resending OTP:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  if (!state?.studentEmail) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Verify Email
            </h1>
            <p className="text-gray-600">
              Enter the code sent to your student's email
            </p>
          </div>

          {/* Student Email Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Student Email</p>
            <p className="text-lg font-semibold text-gray-900">
              {state.studentEmail}
            </p>
            {state.studentName && (
              <p className="text-sm text-gray-500 mt-1">
                Student: {state.studentName}
              </p>
            )}
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">
                  Email Verified!
                </p>
                <p className="text-sm text-green-700">
                  Redirecting you back to complete registration...
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* OTP Form */}
          {!success && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              {/* OTP Input */}
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    // Only allow digits, max 6 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                  }}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-mono"
                  disabled={loading}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the 6-digit code from the email
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </form>
          )}

          {/* Resend OTP Section */}
          {!success && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center mb-4">
                Didn't receive the code?
              </p>
              <Button
                type="button"
                onClick={handleResendOTP}
                disabled={resendLoading || resendCooldown > 0}
                variant="outline"
                className="w-full"
              >
                {resendCooldown > 0 ? (
                  <span className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    Resend in {resendCooldown}s
                  </span>
                ) : (
                  'Resend Code'
                )}
              </Button>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> The verification code will expire in 10 minutes. 
              Make sure to share the code with your student so they can provide it to you.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
