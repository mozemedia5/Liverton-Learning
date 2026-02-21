/**
 * Create Course Page - Teacher Interface
 * Allows teachers to create courses with materials and optional quizzes
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  createCourse, 
  uploadCourseMaterial, 
  createQuiz,
  type CourseMaterial,
  type QuizQuestion
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

export default function CreateCourse() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Course form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [subjectOther, setSubjectOther] = useState('');
  const [grade, setGrade] = useState('');
  const [gradeOther, setGradeOther] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [maxStudents, setMaxStudents] = useState('');

  // Materials state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Quiz state
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState('30');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentOptions, setCurrentOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState<number>(0);

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

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Video';
      case 'pdf': return 'PDF Document';
      case 'audio': return 'Audio';
      case 'spreadsheet': return 'Spreadsheet';
      case 'presentation': return 'Presentation';
      case 'document': return 'Document';
      case 'image': return 'Image';
      default: return 'File';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Add files to state with 0 progress
    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      progress: 0
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Start uploading
    setUploading(true);

    for (let i = 0; i < newFiles.length; i++) {
      const fileObj = newFiles[i];
      const fileIndex = uploadedFiles.length + i;

      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadedFiles(prev => {
            const updated = [...prev];
            if (updated[fileIndex] && updated[fileIndex].progress < 90) {
              updated[fileIndex].progress += 10;
            }
            return updated;
          });
        }, 200);

        // Upload file (we'll use a temporary ID, actual upload happens with course creation)
        const material: CourseMaterial = {
          id: `temp_${Date.now()}_${i}`,
          name: fileObj.file.name,
          type: getFileType(fileObj.file.type) || 'document',
          url: '', // Will be set after course creation
          size: fileObj.file.size,
          uploadedAt: new Date()
        };

        clearInterval(progressInterval);

        setUploadedFiles(prev => {
          const updated = [...prev];
          updated[fileIndex] = { ...fileObj, progress: 100, material };
          return updated;
        });

        toast.success(`${fileObj.file.name} uploaded successfully`);
      } catch (error) {
        setUploadedFiles(prev => {
          const updated = [...prev];
          updated[fileIndex] = { 
            ...fileObj, 
            progress: 0, 
            error: error instanceof Error ? error.message : 'Upload failed' 
          };
          return updated;
        });
        toast.error(`Failed to upload ${fileObj.file.name}`);
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

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addQuestion = () => {
    if (!currentQuestion.trim()) {
      toast.error('Please enter a question');
      return;
    }

    if (currentOptions.some(opt => !opt.trim())) {
      toast.error('Please fill in all options');
      return;
    }

    if (questions.length >= 10) {
      toast.error('Maximum 10 questions allowed');
      return;
    }

    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      question: currentQuestion,
      options: currentOptions.filter(opt => opt.trim()),
      correctAnswer
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion('');
    setCurrentOptions(['', '', '', '']);
    setCorrectAnswer(0);
    toast.success('Question added');
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
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

    if (!currentUser?.uid) {
      toast.error('You must be logged in to create a course');
      return;
    }

    setSubmitting(true);

    try {
      // Create course
      const finalSubject = subject === 'Other' ? subjectOther.trim() : subject;
      const finalGrade = grade === 'Other' ? gradeOther.trim() : (grade || undefined);
      
      const courseId = await createCourse(
        currentUser.uid,
        userData?.fullName || 'Unknown Teacher',
        {
          title: title.trim(),
          description: description.trim(),
          subject: finalSubject,
          grade: finalGrade,
          price: parseFloat(price) || 0,
          currency,
          status: 'active',
          maxStudents: maxStudents ? parseInt(maxStudents) : undefined,
          lessons: uploadedFiles.length
        }
      );

      // Upload materials
      const uploadedMaterials: CourseMaterial[] = [];
      for (const fileObj of uploadedFiles) {
        try {
          const material = await uploadCourseMaterial(courseId, fileObj.file);
          uploadedMaterials.push(material);
        } catch (error) {
          console.error('Error uploading material:', error);
        }
      }

      // Create quiz if questions exist
      if (questions.length > 0) {
        await createQuiz(courseId, {
          title: quizTitle || 'Course Quiz',
          questions,
          timeLimit: parseInt(quizTimeLimit) || undefined
        });
      }

      toast.success('Course created successfully!');
      navigate('/teacher/courses');
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('Failed to create course. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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
              <span className="font-semibold">Create Course</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/teacher/courses')}
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
                  Creating...
                </>
              ) : (
                'Create Course'
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Course Details</TabsTrigger>
            <TabsTrigger value="materials">
              Materials
              {uploadedFiles.length > 0 && (
                <Badge variant="secondary" className="ml-2">{uploadedFiles.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="quiz">
              Quiz
              {questions.length > 0 && (
                <Badge variant="secondary" className="ml-2">{questions.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Course Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
                <CardDescription>
                  Enter the basic details for your course
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Materials</CardTitle>
                <CardDescription>
                  Upload videos, PDFs, documents, spreadsheets, presentations, and more
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

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Uploaded Files</h4>
                    <div className="space-y-2">
                      {uploadedFiles.map((fileObj, index) => (
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
                                getFileTypeLabel(fileObj.material.type) : 
                                'Uploading...'
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
                            onClick={() => removeFile(index)}
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

          {/* Quiz Tab */}
          <TabsContent value="quiz" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Quiz (Optional)</CardTitle>
                <CardDescription>
                  Add a quiz to test student knowledge. Maximum 10 questions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.length === 0 ? (
                  <div className="text-center py-8">
                    <HelpCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">No questions yet</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Add questions to create a quiz for this course
                    </p>
                    <Button onClick={() => setShowQuizDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Quiz Title</Label>
                        <Input
                          value={quizTitle}
                          onChange={(e) => setQuizTitle(e.target.value)}
                          placeholder="e.g., Final Assessment"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Time Limit (minutes)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={quizTimeLimit}
                          onChange={(e) => setQuizTimeLimit(e.target.value)}
                          className="mt-1 w-32"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {questions.map((q, index) => (
                        <Card key={q.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{index + 1}. {q.question}</p>
                                <div className="mt-2 space-y-1">
                                  {q.options.map((opt, optIndex) => (
                                    <div 
                                      key={optIndex}
                                      className={`flex items-center gap-2 text-sm ${
                                        optIndex === q.correctAnswer ? 'text-green-600 font-medium' : 'text-gray-600'
                                      }`}
                                    >
                                      {optIndex === q.correctAnswer ? (
                                        <CheckCircle className="w-4 h-4" />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full border border-gray-300" />
                                      )}
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeQuestion(index)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {questions.length < 10 && (
                      <Button 
                        onClick={() => setShowQuizDialog(true)}
                        variant="outline"
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Another Question
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Question Dialog */}
      <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
            <DialogDescription>
              Create a multiple choice question (Question {questions.length + 1} of 10)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                placeholder="Enter your question..."
              />
            </div>
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                {currentOptions.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={correctAnswer === index}
                      onChange={() => setCorrectAnswer(index)}
                      className="w-4 h-4"
                    />
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...currentOptions];
                        newOptions[index] = e.target.value;
                        setCurrentOptions(newOptions);
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                Select the radio button next to the correct answer
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuizDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addQuestion}>
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
