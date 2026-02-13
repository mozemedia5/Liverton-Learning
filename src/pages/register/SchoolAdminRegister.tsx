import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Eye, EyeOff, Loader2, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const schoolTypes = [
  'Primary School',
  'Secondary School',
  'High School',
  'Vocational School',
  'University',
  'Private Institution',
  'Public Institution',
];

export default function SchoolAdminRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    schoolName: '',
    schoolRegistrationNumber: '',
    schoolType: '',
    country: 'Uganda',
    phone: '',
    address: '',
  });
  
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!licenseFile) {
      setError('Please upload school license/approval documents');
      return;
    }

    setLoading(true);

    try {
      // In a real implementation, you would upload files to Firebase Storage first
      await register(formData.email, formData.password, {
        fullName: formData.fullName,
        role: 'school_admin',
        schoolName: formData.schoolName,
        schoolRegistrationNumber: formData.schoolRegistrationNumber,
        schoolType: formData.schoolType,
        country: formData.country,
        contactInfo: {
          phone: formData.phone,
          address: formData.address,
        },
        studentCount: 0,
        teacherCount: 0,
      });

      toast.success('Registration successful! Your school will be reviewed shortly.');
      navigate('/school-admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300 pl-16 md:pl-0">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center border-b border-gray-200 dark:border-gray-800">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/get-started')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex-1 flex justify-center">
          <span className="text-lg font-semibold">School Admin Registration</span>
        </div>
        <div className="w-20"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <Card className="w-full max-w-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Register Your School</CardTitle>
            <CardDescription className="text-center">
              Create a school administrator account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-2">
                <h3 className="text-lg font-semibold">School Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name *</Label>
                  <Input
                    id="schoolName"
                    placeholder="Enter school name"
                    value={formData.schoolName}
                    onChange={(e) => handleChange('schoolName', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolRegistrationNumber">Registration Number *</Label>
                  <Input
                    id="schoolRegistrationNumber"
                    placeholder="School registration number"
                    value={formData.schoolRegistrationNumber}
                    onChange={(e) => handleChange('schoolRegistrationNumber', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolType">School Type *</Label>
                  <Select onValueChange={(value) => handleChange('schoolType', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select school type" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="Enter country"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">School Address *</Label>
                  <Input
                    id="address"
                    placeholder="Enter school address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="license">License / Ministry Approval Documents *</Label>
                <div className="relative">
                  <Input
                    id="license"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="license"
                    className="flex items-center justify-center gap-2 w-full p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-sm">
                      {licenseFile ? licenseFile.name : 'Upload License/Approval Documents'}
                    </span>
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Please upload official documents proving your school's registration and approval
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering School...
                  </>
                ) : (
                  'Register School'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Button 
                  variant="link" 
                  onClick={() => navigate('/login')}
                  className="p-0 h-auto font-semibold"
                >
                  Login here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
