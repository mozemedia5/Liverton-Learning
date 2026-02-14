/**
 * Parent Registration Page
 * Allows parents to create an account
 * Features:
 * - Complete parent profile setup
 * - Optional student linking (can be done later in dashboard)
 * - Firebase email verification
 * - Multiple student support
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Type for gender selection
 */
type GenderType = 'male' | 'female' | 'other';

export default function ParentRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  // Parent form data
  const [parentData, setParentData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    sex: '' as GenderType | '',
    age: '',
    country: 'Uganda',
    phone: '',
    address: '',
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState<'parent' | 'confirm'>('parent');

  /**
   * Handle parent form field changes
   */
  const handleParentChange = (field: string, value: string) => {
    setParentData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Validate parent registration form
   */
  const validateParentForm = (): boolean => {
    if (!parentData.fullName.trim()) {
      setError('Please enter your full name');
      return false;
    }
    if (!parentData.email.trim()) {
      setError('Please enter your email');
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parentData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!parentData.password) {
      setError('Please enter a password');
      return false;
    }
    if (parentData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (parentData.password !== parentData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!parentData.sex) {
      setError('Please select your gender');
      return false;
    }
    if (!parentData.age) {
      setError('Please enter your age');
      return false;
    }
    if (!parentData.phone.trim()) {
      setError('Please enter your phone number');
      return false;
    }
    return true;
  };

  /**
   * Handle parent registration submission
   * Moves to confirmation step
   */
  const handleParentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateParentForm()) {
      return;
    }

    // Move to confirmation step
    setCurrentStep('confirm');
  };

  /**
   * Complete registration and create parent account
   * Student linking is optional and can be done in the dashboard
   */
  const completeRegistration = async () => {
    setError('');
    setLoading(true);

    try {
      // Register parent account
      await register(
        parentData.email,
        parentData.password,
        {
          fullName: parentData.fullName,
          sex: parentData.sex as GenderType,
          age: parseInt(parentData.age, 10),
          country: parentData.country,
          phone: parentData.phone,
          address: parentData.address,
          linkedStudentIds: [], // Empty initially, can be added in dashboard
          role: 'parent',
        }
      );

      // If we reach here, registration was successful
      toast.success('Registration completed successfully!');
      navigate('/parent/dashboard');
    } catch (err) {
      console.error('Error completing registration:', err);
      // Extract error message from Firebase error if available
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during registration. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ============ RENDER STEP 1: PARENT INFO ============
  if (currentStep === 'parent') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Parent Registration</CardTitle>
            <CardDescription>Create your account to manage your children's learning</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleParentSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={parentData.fullName}
                  onChange={(e) => handleParentChange('fullName', e.target.value)}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={parentData.email}
                  onChange={(e) => handleParentChange('email', e.target.value)}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    value={parentData.password}
                    onChange={(e) => handleParentChange('password', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••"
                  value={parentData.confirmPassword}
                  onChange={(e) => handleParentChange('confirmPassword', e.target.value)}
                />
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="sex">Gender</Label>
                <Select value={parentData.sex} onValueChange={(value) => handleParentChange('sex', value)}>
                  <SelectTrigger id="sex">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Age */}
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="30"
                  value={parentData.age}
                  onChange={(e) => handleParentChange('age', e.target.value)}
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+256 700 000000"
                  value={parentData.phone}
                  onChange={(e) => handleParentChange('phone', e.target.value)}
                />
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  type="text"
                  value={parentData.country}
                  onChange={(e) => handleParentChange('country', e.target.value)}
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="123 Main Street"
                  value={parentData.address}
                  onChange={(e) => handleParentChange('address', e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue
              </Button>

              {/* Login Link */}
              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:underline"
                >
                  Login here
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ RENDER STEP 2: CONFIRMATION ============
  if (currentStep === 'confirm') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Confirm Your Details</CardTitle>
            <CardDescription>Review your information before completing registration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Display Summary */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-medium">{parentData.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{parentData.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{parentData.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Country</p>
                <p className="font-medium">{parentData.country}</p>
              </div>
            </div>

            {/* Info about student linking */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                You can link your children to your account anytime in the dashboard after registration.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => setCurrentStep('parent')}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={completeRegistration}
                disabled={loading}
                className="flex-1"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Complete Registration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
