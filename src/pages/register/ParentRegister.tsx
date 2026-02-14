/**
 * Parent Registration Page
 * Allows parents to create an account and link to their children (students)
 * Features:
 * - Complete parent profile setup
 * - Student email verification via OTP
 * - Multiple student support
 * - Firebase integration with proper error handling
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Eye, EyeOff, Loader2, UserPlus, Plus, Trash2, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createAndSendOTP } from '@/lib/otpService';
import { toast } from 'sonner';

/**
 * Interface for student being linked during registration
 */
interface StudentToLink {
  id: string;
  name: string;
  email: string;
  relationship: string;
  verified: boolean;
  otpSent: boolean;
  verifying: boolean;
  error: string;
}

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
  
  // Students to link
  const [studentsToLink, setStudentsToLink] = useState<StudentToLink[]>([]);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    relationship: '',
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState<'parent' | 'students' | 'verify'>('parent');
  const [studentToVerify, setStudentToVerify] = useState<StudentToLink | null>(null);
  const [otpCode, setOtpCode] = useState('');

  /**
   * Handle parent form field changes
   */
  const handleParentChange = (field: string, value: string) => {
    setParentData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Handle new student field changes
   */
  const handleNewStudentChange = (field: string, value: string) => {
    setNewStudent(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Add student to linking list and send OTP
   * Validates student email and initiates OTP verification
   */
  const addStudent = async () => {
    // Validate student data
    if (!newStudent.name.trim()) {
      setError('Please enter student name');
      return;
    }
    if (!newStudent.email.trim()) {
      setError('Please enter student email');
      return;
    }
    if (!newStudent.relationship.trim()) {
      setError('Please select relationship');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStudent.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Create student record
      const studentId = `student_${Date.now()}`;
      const student: StudentToLink = {
        id: studentId,
        name: newStudent.name,
        email: newStudent.email,
        relationship: newStudent.relationship,
        verified: false,
        otpSent: false,
        verifying: true,
        error: '',
      };

      // Add to list
      setStudentsToLink(prev => [...prev, student]);

      // Send OTP to student's email
      const result = await createAndSendOTP(newStudent.email, newStudent.name);

      if (result.success) {
        // Update student to show OTP was sent
        setStudentsToLink(prev =>
          prev.map(s =>
            s.id === studentId
              ? { ...s, otpSent: true, verifying: false }
              : s
          )
        );

        // Clear form
        setNewStudent({ name: '', email: '', relationship: '' });
        toast.success(`OTP sent to ${newStudent.email}`);
      } else {
        // Remove student if OTP failed
        setStudentsToLink(prev => prev.filter(s => s.id !== studentId));
        setError(result.error || 'Failed to send OTP. Please try again.');
      }
    } catch (err) {
      console.error('Error adding student:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove student from linking list
   */
  const removeStudent = (studentId: string) => {
    setStudentsToLink(prev => prev.filter(s => s.id !== studentId));
  };

  /**
   * Start OTP verification for a student
   * Navigates to verification page where parent enters the OTP
   */
  const startVerification = (student: StudentToLink) => {
    if (!student.otpSent) {
      setError('OTP not sent yet. Please wait.');
      return;
    }
    setStudentToVerify(student);
    setCurrentStep('verify');
    setOtpCode('');
  };

  /**
   * Verify OTP code entered by parent
   * This confirms the student's email ownership
   */
  const verifyOTPCode = async () => {
    if (!studentToVerify) return;

    if (!/^\d{6}$/.test(otpCode)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Import verifyOTP from otpService
      const { verifyOTP } = await import('@/lib/otpService');
      const result = await verifyOTP(studentToVerify.email, otpCode);

      if (result.success) {
        // Mark student as verified
        setStudentsToLink(prev =>
          prev.map(s =>
            s.id === studentToVerify.id
              ? { ...s, verified: true, verifying: false }
              : s
          )
        );

        toast.success(`${studentToVerify.name}'s email verified!`);
        setCurrentStep('students');
        setStudentToVerify(null);
        setOtpCode('');
      } else {
        setError(result.error || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
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
   * Moves to student linking step
   */
  const handleParentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateParentForm()) {
      return;
    }

    // Move to student linking step
    setCurrentStep('students');
  };

  /**
   * Complete registration and create parent account
   * All students must be verified before completing
   */
  const completeRegistration = async () => {
    // Validate at least one student is verified
    const verifiedStudents = studentsToLink.filter(s => s.verified);
    if (verifiedStudents.length === 0) {
      setError('Please verify at least one student to complete registration');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Register parent account with proper type casting
      // The register function returns Promise<void>, so we wrap it in try-catch
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
          linkedStudentIds: verifiedStudents.map(s => s.email), // Store verified student emails
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
                Continue to Link Students
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

  // ============ RENDER STEP 2: STUDENT LINKING ============
  if (currentStep === 'students') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Link Your Children</CardTitle>
            <CardDescription>Add your children's email addresses for verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Add New Student Form */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add Student
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentName">Student Name</Label>
                  <Input
                    id="studentName"
                    placeholder="John Doe"
                    value={newStudent.name}
                    onChange={(e) => handleNewStudentChange('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentEmail">Student Email</Label>
                  <Input
                    id="studentEmail"
                    type="email"
                    placeholder="john@school.com"
                    value={newStudent.email}
                    onChange={(e) => handleNewStudentChange('email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Select value={newStudent.relationship} onValueChange={(value) => handleNewStudentChange('relationship', value)}>
                    <SelectTrigger id="relationship">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="son">Son</SelectItem>
                      <SelectItem value="daughter">Daughter</SelectItem>
                      <SelectItem value="ward">Ward</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={addStudent}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Add Student
                  </Button>
                </div>
              </div>
            </div>

            {/* Students List */}
            {studentsToLink.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Students to Verify</h3>
                {studentsToLink.map(student => (
                  <div key={student.id} className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-gray-600">{student.email}</p>
                      <p className="text-xs text-gray-500 mt-1">Relationship: {student.relationship}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {student.verified ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">Verified</span>
                        </div>
                      ) : student.otpSent ? (
                        <Button
                          onClick={() => startVerification(student)}
                          disabled={loading}
                          variant="outline"
                          size="sm"
                        >
                          {student.verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                          Verify
                        </Button>
                      ) : null}

                      <Button
                        onClick={() => removeStudent(student.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
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
                disabled={loading || studentsToLink.filter(s => s.verified).length === 0}
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

  // ============ RENDER STEP 3: OTP VERIFICATION ============
  if (currentStep === 'verify' && studentToVerify) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verify Student Email</CardTitle>
            <CardDescription>Enter the 6-digit code sent to {studentToVerify.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <Button
              onClick={verifyOTPCode}
              disabled={loading || otpCode.length !== 6}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verify Code
            </Button>

            <Button
              onClick={() => setCurrentStep('students')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
