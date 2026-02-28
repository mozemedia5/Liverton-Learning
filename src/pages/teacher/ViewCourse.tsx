/**
 * View Course Page - Teacher Interface
 * Allows teachers to view course details, materials, enrolled students, and analytics
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  BookOpen, 
  Edit,
  Users,
  TrendingUp,
  Download,
  Eye,
  Loader2,
  Video,
  FileText,
  Music,
  FileSpreadsheet,
  Presentation,
  Image,
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  getCourse, 
  subscribeToCourseMaterials,
  subscribeToEnrollmentsForCourse,
  type Course,
  type CourseMaterial
} from '@/services/courseService';

interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  enrolledAt: Date;
  progress: number;
  lastAccessed?: Date;
}

export default function ViewCourse() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const { currentUser } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!courseId || !currentUser?.uid) return;

    const loadCourse = async () => {
      try {
        setLoading(true);
        const courseData = await getCourse(courseId);
        
        // Check if user is the owner
        if (courseData.teacherId !== currentUser.uid) {
          toast.error('You do not have permission to view this course');
          navigate('/teacher/courses');
          return;
        }
        
        setCourse(courseData);
      } catch (error) {
        console.error('Error loading course:', error);
        toast.error('Failed to load course');
        navigate('/teacher/courses');
      }
    };

    loadCourse();

    // Subscribe to materials
    const unsubMaterials = subscribeToCourseMaterials(courseId, (data) => {
      setMaterials(data);
    });

    // Subscribe to enrollments
    const unsubEnrollments = subscribeToEnrollmentsForCourse(courseId, (data) => {
      setEnrollments(data);
      setLoading(false);
    });

    const timeout = setTimeout(() => setLoading(false), 5000);

    return () => {
      unsubMaterials();
      unsubEnrollments();
      clearTimeout(timeout);
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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
              <span className="font-semibold">Course Details</span>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const totalRevenue = enrollments.length * course.price;
  const avgProgress = enrollments.length > 0 
    ? enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length 
    : 0;

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
              <span className="font-semibold">Course Details</span>
            </div>
          </div>
          <Button 
            onClick={() => navigate(`/teacher/courses/${courseId}/edit`)}
            className="bg-black dark:bg-white text-white dark:text-black"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Course
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 max-w-6xl mx-auto">
        {/* Course Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                  {course.status}
                </Badge>
                <span className="text-gray-600 dark:text-gray-400">{course.subject}</span>
                {course.grade && (
                  <span className="text-gray-600 dark:text-gray-400">• {course.grade}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {course.price > 0 ? `${course.currency || 'USD'} ${course.price}` : 'Free'}
              </p>
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300">{course.description}</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
                  <p className="text-xl font-bold">{enrollments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-xl font-bold">{course.currency || 'USD'} {totalRevenue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Progress</p>
                  <p className="text-xl font-bold">{avgProgress.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Materials</p>
                  <p className="text-xl font-bold">{materials.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="materials">
              Materials ({materials.length})
            </TabsTrigger>
            <TabsTrigger value="students">
              Students ({enrollments.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Subject</p>
                    <p className="font-medium">{course.subject}</p>
                  </div>
                  {course.grade && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Grade/Level</p>
                      <p className="font-medium">{course.grade}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Price</p>
                    <p className="font-medium">
                      {course.price > 0 ? `${course.currency} ${course.price}` : 'Free'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                      {course.status}
                    </Badge>
                  </div>
                  {course.maxStudents && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Max Students</p>
                      <p className="font-medium">{course.maxStudents}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                    <p className="font-medium">
                      {course.createdAt ? formatDate(course.createdAt) : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Materials</CardTitle>
                <CardDescription>
                  All uploaded materials for this course
                </CardDescription>
              </CardHeader>
              <CardContent>
                {materials.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No materials uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {materials.map((material) => (
                      <div 
                        key={material.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
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
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(material.url, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = material.url;
                              link.download = material.name;
                              link.click();
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Enrolled Students</CardTitle>
                <CardDescription>
                  Students currently enrolled in this course
                </CardDescription>
              </CardHeader>
              <CardContent>
                {enrollments.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No students enrolled yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {enrollments.map((enrollment) => (
                      <div 
                        key={enrollment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{enrollment.studentName}</p>
                          <p className="text-sm text-gray-500">
                            Enrolled {formatDate(enrollment.enrolledAt)}
                            {enrollment.lastAccessed && 
                              ` • Last accessed ${formatDate(enrollment.lastAccessed)}`
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{enrollment.progress || 0}%</p>
                          <p className="text-sm text-gray-500">Progress</p>
                        </div>
                      </div>
                    ))}
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
