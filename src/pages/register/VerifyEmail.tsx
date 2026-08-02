import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Loader2, ArrowLeft, RefreshCw, CheckCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { toast } from 'sonner';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, userRole } = useAuth();

  // Get email from state fallback to current logged in user
  const email = location.state?.email || auth.currentUser?.email || '';
  const role = location.state?.role || userRole || 'student';

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  // Poll for email verification status
  useEffect(() => {
    // If already verified, don't poll
    if (auth.currentUser?.emailVerified) {
      setIsVerified(true);
      return;
    }

    const intervalId = setInterval(async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setIsVerified(true);
          clearInterval(intervalId);
          toast.success('🎉 Email verified successfully! Redirecting...');

          // Redirect to appropriate dashboard
          setTimeout(() => {
            const dashboardRoutes: Record<string, string> = {
              student: '/student/dashboard',
              teacher: '/teacher/dashboard',
              school_admin: '/school-admin/dashboard',
              parent: '/student/dashboard',
              platform_admin: '/admin/dashboard',
            };
            navigate(dashboardRoutes[role] || '/');
          }, 1500);
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId);
  }, [navigate, role]);

  // Cooldown timer for resending
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setIsVerified(true);
          toast.success('🎉 Email verified successfully! Redirecting...');
          setTimeout(() => {
            const dashboardRoutes: Record<string, string> = {
              student: '/student/dashboard',
              teacher: '/teacher/dashboard',
              school_admin: '/school-admin/dashboard',
              parent: '/student/dashboard',
              platform_admin: '/admin/dashboard',
            };
            navigate(dashboardRoutes[role] || '/');
          }, 1500);
        } else {
          toast.error('❌ Email not verified yet. Please click the link in your email.');
        }
      } else {
        toast.error('❌ No active session. Please sign in again.');
        navigate('/login');
      }
    } catch (err: any) {
      toast.error('Error: ' + (err.message || 'Could not verify status'));
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        toast.success('✉️ Verification email sent! Please check your inbox.');
        setCooldown(60);
      } else {
        toast.error('❌ No active session. Please sign in again.');
        navigate('/login');
      }
    } catch (err: any) {
      toast.error('Error: ' + (err.message || 'Could not send verification email'));
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully.');
      navigate('/login');
    } catch (err) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white flex items-center justify-center p-4 transition-colors duration-300">
      <Card className="w-full max-w-md border border-gray-100 dark:border-gray-800 bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <CardContent className="p-8 md:p-10 flex flex-col items-center">
          {/* Brand Logo Container */}
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800 flex items-center justify-center bg-white p-2 mb-3">
            <img
              src="/logo.png"
              alt="Liverton Logo"
              className="w-full h-full object-contain"
            />
          </div>

          {/* App Title */}
          <h2 className="text-xl font-black tracking-widest text-[#00A86B] mb-6">
            LIVERTON
          </h2>

          {isVerified ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[#00A86B] mb-2 animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Email Verified!
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Welcome to Liverton Learning. We are redirecting you to your dashboard now...
              </p>
              <div className="pt-4">
                <Loader2 className="w-6 h-6 animate-spin text-[#00A86B]" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              {/* Main Heading */}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                Verify Your Email
              </h1>

              {/* Mail Icon Envelope */}
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-zinc-900 flex items-center justify-center text-[#00A86B] my-6">
                <Mail className="w-8 h-8 animate-pulse" />
              </div>

              {/* Description */}
              <div className="text-center space-y-3 mb-8">
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                  We've sent a verification email to:
                </p>
                <p className="font-bold text-gray-800 dark:text-white bg-gray-50 dark:bg-zinc-900 px-4 py-2 rounded-xl border border-gray-100 dark:border-zinc-800 inline-block">
                  {email || 'your email address'}
                </p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 max-w-sm leading-relaxed">
                  Please check your inbox (and spam folder) and click the confirmation link to activate your account.
                </p>
              </div>

              {/* Actions Grid */}
              <div className="w-full space-y-3">
                {/* Manual Check */}
                <Button
                  onClick={handleManualCheck}
                  disabled={checking}
                  className="w-full py-6 bg-[#00A86B] hover:bg-[#00905B] text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                >
                  {checking ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5" />
                  )}
                  I've Verified My Email
                </Button>

                {/* Resend Link */}
                <Button
                  onClick={handleResend}
                  disabled={resending || cooldown > 0}
                  variant="outline"
                  className="w-full py-6 border-gray-200 dark:border-zinc-800 rounded-2xl font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  {resending ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" /> Sending...
                    </span>
                  ) : cooldown > 0 ? (
                    `Resend Email in ${cooldown}s`
                  ) : (
                    'Resend Verification Email'
                  )}
                </Button>

                {/* Logout and start over */}
                <button
                  onClick={handleLogout}
                  className="w-full py-4 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center justify-center gap-2 transition-colors mt-4"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out / Sign In with another account
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
