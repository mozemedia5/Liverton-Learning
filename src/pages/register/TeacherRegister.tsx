import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Eye, EyeOff, Loader2, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const educationLevels = [
  'Secondary / High School',
  'Diploma',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'PhD',
];

const availableSubjects = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Geography',
  'Computer Science',
  'Economics',
  'Business Studies',
  'Literature',
  'Art',
  'Music',
  'Physical Education',
];

export default function TeacherRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    sex: '',
    age: '',
    educationLevel: '',
    experience: '',
    schoolName: '',
    subjectsTaught: [] as string[],
    country: 'Uganda',
  });
  
  const [files, setFiles] = useState({
    cv: null as File | null,
    id: null as File | null,
    certificates: null as File | null,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => {
      if (prev.subjectsTaught.includes(subject)) {
        return {
          ...prev,
          subjectsTaught: prev.subjectsTaught.filter(s => s !== subject)
        };
      }
      if (prev.subjectsTaught.length >= 3) {
        toast.warning('You can only select up to 3 subjects');
        return prev;
      }
      return {
        ...prev,
        subjectsTaught: [...prev.subjectsTaught, subject]
      };
    });
  };

  const handleFileChange = (type: 'cv' | 'id' | 'certificates', file: File | null) => {
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.subjectsTaught.length === 0) {
      setError('Please select at least one subject');
      return;
    }

    if (!files.cv) {
      setError('Please upload your CV');
      return;
    }

    if (!files.certificates) {
      setError('Please upload your academic certificates');
      return;
    }

    setLoading(true);

    try {
      // In a real implementation, you would upload files to Firebase Storage first
      // and then save the URLs
      await register(formData.email, formData.password, {
        fullName: formData.fullName,
        role: 'teacher',
        sex: formData.sex as 'male' | 'female' | 'other',
        age: parseInt(formData.age),
        educationLevel: formData.educationLevel,
        experience: parseInt(formData.experience) || 0,
        schoolName: formData.schoolName || undefined,
        country: formData.country,
        subjectsTaught: formData.subjectsTaught,
        coursesCreated: [],
        earnings: { total: 0, pending: 0, history: [] },
        isVerified: false,
        // cvUrl, idUrl, certificatesUrl would be set after file upload
      });

      toast.success('Registration successful! Your account will be verified shortly.');
      navigate('/teacher/dashboard');
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
          <span className="text-lg font-semibold">Teacher Registration</span>
        </div>
        <div className="w-20"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <Card className="w-full max-w-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create Teacher Account</CardTitle>
            <CardDescription className="text-center">
              Join Liverton Learning as a teacher
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

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

                <div className="space-y-2">
                  <Label htmlFor="sex">Sex *</Label>
                  <Select onValueChange={(value) => handleChange('sex', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter your age"
                    value={formData.age}
                    onChange={(e) => handleChange('age', e.target.value)}
                    required
                    min="18"
                    max="80"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="educationLevel">Education Level *</Label>
                  <Select onValueChange={(value) => handleChange('educationLevel', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevels.map((level) => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience *</Label>
                  <Input
                    id="experience"
                    type="number"
                    placeholder="Years of teaching experience"
                    value={formData.experience}
                    onChange={(e) => handleChange('experience', e.target.value)}
                    required
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name (Optional)</Label>
                  <Input
                    id="schoolName"
                    placeholder="Enter your school name"
                    value={formData.schoolName}
                    onChange={(e) => handleChange('schoolName', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="Enter your country"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subjects You Teach (Max 3) *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                  {availableSubjects.map((subject) => (
                    <div key={subject} className="flex items-center space-x-2">
                      <Checkbox
                        id={`subject-${subject}`}
                        checked={formData.subjectsTaught.includes(subject)}
                        onCheckedChange={() => handleSubjectToggle(subject)}
                      />
                      <Label 
                        htmlFor={`subject-${subject}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {subject}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Selected: {formData.subjectsTaught.length}/3
                </p>
              </div>

              <div className="space-y-4">
                <Label>Required Documents</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cv" className="text-sm">CV/Resume *</Label>
                    <div className="relative">
                      <Input
                        id="cv"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileChange('cv', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label
                        htmlFor="cv"
                        className="flex items-center justify-center gap-2 w-full p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm truncate">
                          {files.cv ? files.cv.name : 'Upload CV'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="certificates" className="text-sm">Certificates *</Label>
                    <div className="relative">
                      <Input
                        id="certificates"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('certificates', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label
                        htmlFor="certificates"
                        className="flex items-center justify-center gap-2 w-full p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm truncate">
                          {files.certificates ? files.certificates.name : 'Upload Certificates'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="id" className="text-sm">National ID (Optional)</Label>
                    <div className="relative">
                      <Input
                        id="id"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('id', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label
                        htmlFor="id"
                        className="flex items-center justify-center gap-2 w-full p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm truncate">
                          {files.id ? files.id.name : 'Upload ID'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
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
