import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      
      // Verify admin role on backend
      // For now, we'll assume the login validates the admin role
      toast.success('Admin login successful!');
      
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Invalid admin credentials');
      toast.error('Admin login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center border-b border-red-200 dark:border-red-800 bg-white/50 dark:bg-black/50 backdrop-blur">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/login')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Button>
        <div className="flex-1 flex justify-center">
          <span className="text-lg font-semibold">Liverton Learning - Admin Portal</span>
        </div>
        <div className="w-20"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md border-2 border-red-300 dark:border-red-700 bg-white dark:bg-black shadow-lg">
          <CardHeader className="space-y-1 border-b border-red-200 dark:border-red-800">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
              <CardTitle className="text-2xl font-bold text-center text-red-600 dark:text-red-400">Admin Access</CardTitle>
            </div>
            <CardDescription className="text-center">
              Restricted access for platform administrators only
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950">
                  <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-red-700 dark:text-red-300 font-semibold">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@liverton.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-2 border-red-300 dark:border-red-700 focus:border-red-500 dark:focus:border-red-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-red-700 dark:text-red-300 font-semibold">Admin Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-2 border-red-300 dark:border-red-700 focus:border-red-500 dark:focus:border-red-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600 dark:text-red-400 hover:text-red-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying Admin Access...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Access Admin Portal
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs text-red-700 dark:text-red-300 text-center">
                ⚠️ This is a restricted area. Unauthorized access attempts are logged and monitored.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-6 border-t border-red-200 dark:border-red-800 bg-white/50 dark:bg-black/50 backdrop-blur">
        <div className="max-w-6xl mx-auto text-center text-sm text-red-600 dark:text-red-400">
          © 2026 Liverton Learning Admin Portal. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
