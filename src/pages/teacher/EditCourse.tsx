/**
 * Edit Course Page - Teacher Interface
 * Allows teachers to update course information, materials, and settings
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  BookOpen, 
  Upload, 
  X, 
  Video, 
  FileText, 
  Music, 
  FileSpreadsheet,
  Presentation,
  Image,
  Trash2,
  Loader2,
  Save
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  getCourse,
  updateCourse,
  uploadCourseMaterial,
  deleteCourseMaterial,
  subscribeToCourseMaterials,
  type Course,
  type CourseMaterial
} from '@/services/courseService';

const SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Geography',
  'Computer Science',
  'Art',
  'Music',
  'Physical Education',
  'Other'
];

const GRADES = [
  'Senior 1',
  'Senior 2',
  'Senior 3',
  'Senior 4',
  'Senior 5',
  'Senior 6',
  'University',
  'Other'
];

interface UploadedFile {
  file: File;
  progress: number;
  material?: CourseMaterial;
  error?: string;
}

export default function EditCourse() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const { currentUser, userData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Course state
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [subjectOther, setSubjectOther] = useState('');
  const [grade, setGrade] = useState('');
  const [gradeOther, setGradeOther] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [maxStudents, setMaxStudents] = useState('');
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>('active');

  // Materials state
  const [existingMaterials, setExistingMaterials] = useState<CourseMaterial[]>([]);
  const [newFiles, setNewFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const CURRENCIES = [
    { code: 'USD', symbol: '$', label: 'US Dollar' },
    { code: 'UGX', symbol: 'USh', label: 'Ugandan Shilling' },
    { code: 'KES', symbol: 'KSh', label: 'Kenyan Shilling' },
    { code: 'TZS', symbol: 'TSh', label: 'Tanzanian Shilling' },
    { code: 'RWF', symbol: 'FRw', label: 'Rwandan Franc' }
  ];

  // Load course data
  useEffect(() => {
    if (!courseId || !currentUser?.uid) return;

    const loadCourse = async () => {
      try {
        setLoading(true);
        const courseData = await getCourse(courseId);
        
        // Check if user is the owner
        if (courseData.teacherId !== currentUser.uid) {
          toast.error('You do not have permission to edit this course');
          navigate('/teacher/courses');
          return;
        }
        
        setCourse(courseData);
        
        // Set form values
        setTitle(courseData.title);
        setDescription(courseData.description);
        setSubject(SUBJECTS.includes(courseData.subject) ? courseData.subject : 'Other');
        if (!SUBJECTS.includes(courseData.subject)) {
          setSubjectOther(courseData.subject);
        }
        setGrade(courseData.grade && GRADES.includes(courseData.grade) ? courseData.grade : (courseData.grade ? 'Other' : ''));
        if (courseData.grade && !GRADES.includes(courseData.grade)) {
          setGradeOther(courseData.grade);
        }
        setPrice(courseData.price?.toString() || '');
        setCurrency(courseData.currency || 'USD');
        setMaxStudents(courseData.maxStudents?.toString() || '');
        setStatus(courseData.status || 'active');
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading course:', error);
        toast.error('Failed to load course');
        navigate('/teacher/courses');
      }
    };

    loadCourse();

    // Subscribe to materials
    const unsubMaterials = subscribeToCourseMaterials(courseId, (data) => {
      setExistingMaterials(data);
    });

    return () => {
      unsubMaterials();
    };
  }, [courseId, currentUser?.uid, navigate]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      case 'spreadsheet': return <FileSpreadsheet className="w-5 h-5" />;
      case 'presentation': return <Presentation className="w-5 h-5" />;
      case 'image': return <Image className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFileObjs: UploadedFile[] = files.map(file => ({
      file,
      progress: 0
    }));
    setNewFiles(prev => [...prev, ...newFileObjs]);

    setUploading(true);

    for (let i = 0; i < newFileObjs.length; i++) {
      const fileObj = newFileObjs[i];
      const fileIndex = newFiles.length + i;

      try {
        const progressInterval = setInterval(() => {
          setNewFiles(prev => {
            const updated = [...prev];
            if (updated[fileIndex] && updated[fileIndex].progress < 90) {
              updated[fileIndex].progress += 10;
            }
            return updated;
          });
        }, 200);

        const material: CourseMaterial = {
          id: `temp_${Date.now()}_${i}`,
          name: fileObj.file.name,
          type: getFileType(fileObj.file.type) || 'document',
          url: '',
          size: fileObj.file.size,
          uploadedAt: new Date()
        };

        clearInterval(progressInterval);

        setNewFiles(prev => {
          const updated = [...prev];
          updated[fileIndex] = { ...fileObj, progress: 100, material };
          return updated;
        });

        toast.success(`${fileObj.file.name} ready to upload`);
      } catch (error) {
        setNewFiles(prev => {
          const updated = [...prev];
          updated[fileIndex] = { 
            ...fileObj, 
            progress: 0, 
            error: error instanceof Error ? error.message : 'Upload failed' 
          };
          return updated;
        });
        toast.error(`Failed to prepare ${fileObj.file.name}`);
      }
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileType = (mimeType: string): CourseMaterial['type'] | null => {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('word') || mimeType === 'text/plain') return 'document';
    return null;
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingMaterial = async (material: CourseMaterial) => {
    if (!courseId) return;
    
    try {
      await deleteCourseMaterial(courseId, material.id);
      toast.success('Material deleted successfully');
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Failed to delete material');
    }
  };

  const handleSubmit = async () => {
    if (!courseId) return;

    // Validation
    if (!title.trim()) {
      toast.error('Please enter a course title');
      setActiveTab('details');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a course description');
      setActiveTab('details');
      return;
    }

    if (!subject) {
      toast.error('Please select a subject');
      setActiveTab('details');
      return;
    }

    if (subject === 'Other' && !subjectOther.trim()) {
      toast.error('Please specify the other subject');
      setActiveTab('details');
      return;
    }

    if (grade === 'Other' && !gradeOther.trim()) {
      toast.error('Please specify the other grade/class');
      setActiveTab('details');
      return;
    }

    setSubmitting(true);

    try {
      // Update course
      const finalSubject = subject === 'Other' ? subjectOther.trim() : subject;
      const finalGrade = grade === 'Other' ? gradeOther.trim() : (grade || undefined);
      
      await updateCourse(courseId, {
        title: title.trim(),
        description: description.trim(),
        subject: finalSubject,
        grade: finalGrade,
        price: parseFloat(price) || 0,
        currency,
        status,
        ...(maxStudents ? { maxStudents: parseInt(maxStudents) } : {}),
        lessons: existingMaterials.length + newFiles.length
      });

      // Upload new materials
      for (const fileObj of newFiles) {
        try {
          await uploadCourseMaterial(courseId, fileObj.file);
        } catch (error) {
          console.error('Error uploading material:', error);
        }
      }

      toast.success('Course updated successfully!');
      navigate(`/teacher/courses/${courseId}`);
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('Failed to update course. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading || !course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <span className="font-semibold">Edit Course</span>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold">Edit Course</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/teacher/courses/${courseId}`)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-black dark:bg-white text-white dark:text-black"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Course Details</TabsTrigger>
            <TabsTrigger value="materials">
              Materials
              {(existingMaterials.length + newFiles.length) > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {existingMaterials.length + newFiles.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Course Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
                <CardDescription>
                  Update the basic details for your course
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Course Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., Advanced Mathematics"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what students will learn..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">
                      Subject <span className="text-red-500">*</span>
                    </Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBJECTS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade/Class Level</Label>
                    <Select value={grade} onValueChange={setGrade}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADES.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {grade === 'Other' && (
                  <div className="space-y-2">
                    <Label htmlFor="gradeOther">Please specify the grade/class</Label>
                    <Input
                      id="gradeOther"
                      placeholder="e.g., Form 1, Diploma, Certificate"
                      value={gradeOther}
                      onChange={(e) => setGradeOther(e.target.value)}
                    />
                  </div>
                )}

                {subject === 'Other' && (
                  <div className="space-y-2">
                    <Label htmlFor="subjectOther">Please specify the subject</Label>
                    <Input
                      id="subjectOther"
                      placeholder="e.g., Environmental Science, Digital Marketing"
                      value={subjectOther}
                      onChange={(e) => setSubjectOther(e.target.value)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.label} ({c.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price ({CURRENCIES.find(c => c.code === currency)?.symbol})</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00 (Free)"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxStudents">Max Students</Label>
                    <Input
                      id="maxStudents"
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={maxStudents}
                      onChange={(e) => setMaxStudents(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Course Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Materials</CardTitle>
                <CardDescription>
                  Manage videos, PDFs, documents, spreadsheets, presentations, and more
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium">Click to upload files</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Supports videos, PDFs, audio, documents, spreadsheets, presentations
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Maximum file size: 500MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="video/*,.pdf,audio/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
                  />
                </div>

                {/* Existing Materials */}
                {existingMaterials.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Current Materials</h4>
                    <div className="space-y-2">
                      {existingMaterials.map((material) => (
                        <div 
                          key={material.id}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            {getFileIcon(material.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{material.name}</p>
                            <p className="text-sm text-gray-500">
                              {material.type.charAt(0).toUpperCase() + material.type.slice(1)}
                              {material.size && ` • ${formatFileSize(material.size)}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeExistingMaterial(material)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Files to Upload */}
                {newFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">New Files (will be uploaded on save)</h4>
                    <div className="space-y-2">
                      {newFiles.map((fileObj, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            {fileObj.material ? 
                              getFileIcon(fileObj.material.type) : 
                              <Upload className="w-5 h-5" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{fileObj.file.name}</p>
                            <p className="text-sm text-gray-500">
                              {fileObj.material ? 
                                fileObj.material.type.charAt(0).toUpperCase() + fileObj.material.type.slice(1) : 
                                'Preparing...'
                              }
                              {' • '}
                              {formatFileSize(fileObj.file.size)}
                            </p>
                            {fileObj.progress < 100 && !fileObj.error && (
                              <Progress value={fileObj.progress} className="h-1 mt-1" />
                            )}
                            {fileObj.error && (
                              <p className="text-sm text-red-500">{fileObj.error}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeNewFile(index)}
                            disabled={uploading}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
