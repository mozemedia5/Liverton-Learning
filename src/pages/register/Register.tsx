import { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { User, Mail, Lock, Eye, EyeOff, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';
import { getAuthErrorMessage, getDashboardRoute, getRoleLabel } from '@/lib/authNavigation';
import '../auth.css';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { register, signInWithGoogle, signInWithApple } = useAuth();

  // Deep-link destination preserved across auth transitions
  const intendedDestination = (location.state as { from?: string } | null)?.from;

  // Get role from query parameter (default to student)
  const role = searchParams.get('role') || 'student';

  // Form states
  const [fullName, setFullName] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Map legacy database role keys to inclusive public-facing labels.
  const roleLabel = getRoleLabel(role);
  const organizationTypes = [
    'Early-childhood centre', 'Primary or secondary school', 'College or university',
    'TVET or vocational institute', 'Adult or continuing education provider',
    'Tutoring, language, arts, or sports academy', 'Education ministry or local authority',
    'Examination, accreditation, or certification body', 'Textbook or academic publisher',
    'Library, archive, or open-education resource organization', 'EdTech or digital learning provider',
    'Device, connectivity, or accessibility provider', 'NGO, charity, or community learning organization',
    'Research centre, think tank, or professional association', 'Funder, foundation, or development partner',
    'Book supplier, distributor, printer, or equipment maker', 'Employer or apprenticeship provider',
    'Other education organization',
  ];

  // Get a role-specific dynamic description/tagline for registration
  const getRoleDescription = () => {
    const label = (
      <span className="font-semibold text-gray-800 dark:text-gray-200">
        {roleLabel}
      </span>
    );

    switch (role) {
      case 'student':
        return (
          <>
            Begin your journey of learning and discovery as a {label}
          </>
        );
      case 'teacher':
        return (
          <>
            Share knowledge, inspire minds, and manage courses as an {label}
          </>
        );
      case 'school_admin':
        return (
          <>
            Represent your organization, manage learning programs, and connect your community as an {label}
          </>
        );
      case 'parent':
        return (
          <>
            Monitor your child's activities and track their learning progress as a {label}
          </>
        );
      default:
        return (
          <>
            Begin your journey of learning and discovery as a {label}
          </>
        );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('❌ Passwords do not match');
      return;
    }

    if (!agreeTerms) {
      toast.error('❌ Please agree to the Terms and Privacy Policy');
      return;
    }

    setLoading(true);

    try {
      // 1. Register user
      const resolvedRole = await register(email, password, {
        fullName,
        ...(role === 'school_admin' ? { organizationType } : {}),
        role: role as any,
        sex: 'other',
        age: 18,
        country: 'Uganda',
      });

      // 2. Send verification email (Firebase Auth)
      if (auth.currentUser) {
        try {
          await sendEmailVerification(auth.currentUser);
          toast.success('✉️ Verification email sent! Please check your inbox.');
        } catch (emailErr: any) {
          console.error('Error sending verification email:', emailErr);
          toast.error('Could not send verification email, but account created.');
        }
      }

      // 3. Redirect to dashboard directly as email verification is handled in Profile
      toast.success('🎉 Registration successful! Redirecting to dashboard...');
      localStorage.setItem('show_setup_prompt', 'true');
      if (intendedDestination) {
        navigate(intendedDestination, { replace: true });
      } else {
        navigate(getDashboardRoute(resolvedRole) || '/', { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      toast.error('❌ Registration failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const resolvedRole = await signInWithGoogle(role as any);
      toast.success('✅ Signed up with Google successfully!');
      localStorage.setItem('show_setup_prompt', 'true');
      navigate(intendedDestination || getDashboardRoute(resolvedRole) || '/', { replace: true });
    } catch (err: any) {
      toast.error('❌ ' + getAuthErrorMessage(err, 'Google'));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const resolvedRole = await signInWithApple(role as any);
      toast.success('✅ Signed up with Apple successfully!');
      localStorage.setItem('show_setup_prompt', 'true');
      navigate(intendedDestination || getDashboardRoute(resolvedRole) || '/', { replace: true });
    } catch (err: any) {
      toast.error('❌ ' + getAuthErrorMessage(err, 'Apple'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <Card className="auth-card relative overflow-hidden">
        {/* Dismiss Button */}
        <button
          onClick={() => navigate('/get-started')}
          className="auth-close absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <CardContent className="auth-card-content flex flex-col items-center">
          {/* Brand Logo Container */}
          <div className="auth-brand-mark flex items-center justify-center mb-3">
            <img
              src="/liverton-mark.jpg"
              alt="Liverton Logo"
              className="w-full h-full object-cover"
            />
          </div>

          {/* App Title */}
          <h2 className="auth-wordmark">
            LIVERTON
          </h2>

          {/* Form Heading */}
          <h1 className="auth-heading text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Join Liverton
          </h1>
          <p className="auth-subcopy text-sm text-gray-500 dark:text-gray-400 mb-8 text-center max-w-[90%] leading-relaxed">
            {getRoleDescription()}
          </p>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="auth-form w-full">
            {/* Full Name */}
            <div className="auth-field relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <User className="w-5 h-5" />
              </span>
              <Input
                type="text"
                placeholder="Full Name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="auth-input pl-12 py-6 text-base"
              />
            </div>

            {role === 'school_admin' && (
              <div className="auth-field relative">
                <Input
                  type="text"
                  list="organization-types"
                  placeholder="Organization type (e.g. school, publisher, nonprofit, EdTech provider)"
                  required
                  value={organizationType}
                  onChange={(e) => setOrganizationType(e.target.value)}
                  className="auth-input px-4 py-6 text-base"
                />
                <datalist id="organization-types">
                  {organizationTypes.map((type) => <option key={type} value={type} />)}
                </datalist>
              </div>
            )}

            {/* Email */}
            <div className="auth-field relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail className="w-5 h-5" />
              </span>
              <Input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input pl-12 py-6 text-base"
              />
            </div>

            {/* Password */}
            <div className="auth-field relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </span>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input pl-12 pr-12 py-6 text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="auth-field relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </span>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input pl-12 pr-12 py-6 text-base"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Terms and Privacy Checkbox */}
            <div className="flex items-center space-x-3 pt-2 pl-1">
              <Checkbox
                id="terms"
                checked={agreeTerms}
                onCheckedChange={(checked) => setAgreeTerms(!!checked)}
                className="border-gray-300 dark:border-zinc-700 data-[state=checked]:bg-[#00A86B] data-[state=checked]:border-[#00A86B] rounded"
              />
              <label
                htmlFor="terms"
                className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-none cursor-pointer select-none"
              >
                I agree to the <span className="text-[#00A86B] hover:underline">Terms</span> and <span className="text-[#00A86B] hover:underline">Privacy Policy</span>
              </label>
            </div>

            {/* Create Account Button */}
            <Button
              type="submit"
              disabled={loading}
              className="auth-primary w-full text-white font-bold text-base mt-6"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Social Sign-up Separator */}
          <div className="w-full flex items-center justify-center my-6">
            <div className="border-t border-gray-100 dark:border-zinc-800 flex-grow"></div>
            <span className="px-3 text-xs text-gray-400 dark:text-zinc-600 font-semibold">or</span>
            <div className="border-t border-gray-100 dark:border-zinc-800 flex-grow"></div>
          </div>

          {/* Social Buttons */}
          <div className="w-full grid grid-cols-2 gap-3 mb-8">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignUp}
              className="auth-social flex items-center justify-center gap-2 py-3 px-4 border border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors font-semibold text-sm bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200"
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
              type="button"
              disabled={loading}
              onClick={handleAppleSignUp}
              className="auth-social flex items-center justify-center gap-2 py-3 px-4 transition-colors font-semibold text-sm bg-black dark:bg-zinc-800 hover:bg-gray-900 text-white"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.11.09 2.27-.56 2.95-1.39z" />
              </svg>
              Apple
            </button>
          </div>

          {/* Already have an account link */}
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login', { state: { from: intendedDestination } })}
                className="auth-link hover:underline font-semibold"
              >
                Sign In
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
