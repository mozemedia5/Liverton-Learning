import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Lock, Eye, EyeOff, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signInWithGoogle, signInWithApple, userRole, loading: authLoading } = useAuth();

  // Deep-link destination preserved by ProtectedRoute (e.g. shared course/team links)
  const intendedDestination = (location.state as { from?: string } | null)?.from;

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  // Wait for auth to finish loading before showing the page
  useEffect(() => {
    if (!authLoading) {
      setPageReady(true);
    }
  }, [authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('✅ Login successful! Redirecting...', {
        duration: 3000,
      });
      
      // Redirect to the originally requested page first (deep links), then role dashboard
      setTimeout(() => {
        if (intendedDestination) {
          navigate(intendedDestination, { replace: true });
          return;
        }
        const effectiveRole = (email === 'infoliverton@gmail.com') ? 'platform_admin' : userRole;

        const dashboardRoutes: Record<string, string> = {
          student: '/student/dashboard',
          teacher: '/teacher/dashboard',
          school_admin: '/school-admin/dashboard',
          platform_admin: '/admin/dashboard',
          parent: '/student/dashboard',
        };

        if (effectiveRole && dashboardRoutes[effectiveRole]) {
          navigate(dashboardRoutes[effectiveRole]);
        } else {
          navigate('/');
        }
      }, 500);
    } catch (err) {
      const errorMessage = (err instanceof Error ? err.message : '') || 'Invalid email or password';
      toast.error('❌ ' + errorMessage, {
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success('✅ Signed in with Google successfully!');
      navigate(intendedDestination || '/', { replace: !!intendedDestination });
    } catch (err) {
      toast.error('❌ Google sign-in failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      toast.success('✅ Signed in with Apple successfully!');
      navigate(intendedDestination || '/', { replace: !!intendedDestination });
    } catch (err) {
      toast.error('❌ Apple sign-in failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (!pageReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A86B]"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white flex items-center justify-center p-4 transition-colors duration-300">
      <Card className="w-full max-w-md border border-gray-100 dark:border-gray-800 bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        {/* Dismiss Button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

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

          {/* Form Heading */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Welcome Back
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
            Sign in to continue your journey
          </p>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* Email Field */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail className="w-5 h-5" />
              </span>
              <Input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 py-6 bg-gray-50/50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-2xl focus-visible:ring-1 focus-visible:ring-[#00A86B] text-base"
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </span>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 pr-12 py-6 bg-gray-50/50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-2xl focus-visible:ring-1 focus-visible:ring-[#00A86B] text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end pr-1">
              <button
                type="button"
                onClick={() => toast.info('Forgot password feature is handled by standard reset email.')}
                className="text-sm text-[#00A86B] hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 bg-[#00A86B] hover:bg-[#00905B] text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-500/10 transition-colors duration-200 mt-6"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Social Separator */}
          <div className="w-full flex items-center justify-center my-6">
            <div className="border-t border-gray-100 dark:border-zinc-800 flex-grow"></div>
            <span className="px-3 text-xs text-gray-400 dark:text-zinc-600 font-semibold">or</span>
            <div className="border-t border-gray-100 dark:border-zinc-800 flex-grow"></div>
          </div>

          {/* Social Buttons */}
          <div className="w-full grid grid-cols-2 gap-3 mb-8">
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-2xl transition-colors font-semibold text-sm bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.63 15.02 1 12 1 7.35 1 3.39 3.65 1.39 7.54l3.87 3C6.18 7.39 8.87 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.45c-.28 1.48-1.11 2.74-2.36 3.58l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.53z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.26 14.54c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29l-3.87-3C.53 8.52 0 10.2 0 12s.53 3.48 1.39 5.04l3.87-3z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-4.3 1.09-3.13 0-5.82-2.35-6.74-5.5l-3.87 3C3.39 20.35 7.35 23 12 23z"
                />
              </svg>
              Google
            </button>
            <button
              onClick={handleAppleSignIn}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl transition-colors font-semibold text-sm bg-black dark:bg-zinc-800 hover:bg-gray-900 text-white"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.11.09 2.27-.56 2.95-1.39z" />
              </svg>
              Apple
            </button>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/get-started', { state: { from: intendedDestination } })}
                className="text-[#00A86B] hover:underline font-semibold"
              >
                Sign Up
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
