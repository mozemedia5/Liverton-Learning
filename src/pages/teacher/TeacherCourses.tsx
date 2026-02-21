/**
 * Teacher Courses Page
 * Displays and manages all courses created by the teacher
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  BookOpen, 
  ArrowLeft, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Users,
  Eye,
  Loader2,
  Video,
  FileText,
  Music,
  FileSpreadsheet,
  Presentation
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  subscribeToTeacherCourses, 
  deleteCourse,
  type Course 
} from '@/services/courseService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TeacherCourses() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Subscribe to teacher's courses
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribeToTeacherCourses(currentUser.uid, (data) => {
        setCourses(data);
        setLoading(false);
      });
    } catch (error) {
      console.error('Error subscribing to courses:', error);
      toast.error('Failed to load courses');
      setLoading(false);
    }

    // Fallback timeout
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearTimeout(timeout);
    };
  }, [currentUser?.uid]);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || course.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });



  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;

    setDeleting(true);
    try {
      await deleteCourse(courseToDelete.id);
      toast.success('Course deleted successfully');
      setCourseToDelete(null);
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    } finally {
      setDeleting(false);
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'spreadsheet': return <FileSpreadsheet className="w-4 h-4" />;
      case 'presentation': return <Presentation className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const renderCourseCard = (course: Course) => (
    <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
        <BookOpen className="w-16 h-16 text-gray-400" />
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{course.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{course.subject}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/teacher/courses/${course.id}`)}>
                <Eye className="w-4 h-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/teacher/courses/${course.id}/edit`)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setCourseToDelete(course)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {course.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {course.enrolledStudents?.length || 0} students
          </span>
          {course.materials && course.materials.length > 0 && (
            <span className="flex items-center gap-1">
              {getMaterialIcon(course.materials[0].type)}
              {course.materials.length} file{course.materials.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
            {course.status}
          </Badge>
          <p className="text-lg font-bold">
            {course.price > 0 ? `$${course.price}` : 'Free'}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <span className="font-semibold">My Courses</span>
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
              <span className="font-semibold">My Courses</span>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/teacher/courses/create')}
            className="bg-black dark:bg-white text-white dark:text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6">
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Courses</p>
              <p className="text-2xl font-bold">{courses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold">{courses.filter(c => c.status === 'active').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold">
                {courses.reduce((sum, c) => sum + (c.enrolledStudents?.length || 0), 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Materials</p>
              <p className="text-2xl font-bold">
                {courses.reduce((sum, c) => sum + (c.materials?.length || 0), 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Course Grid */}
        {filteredCourses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {courses.length === 0 ? 'No courses yet' : 'No courses found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {courses.length === 0 
                  ? 'Create your first course to get started' 
                  : 'Try adjusting your search'}
              </p>
              {courses.length === 0 && (
                <Button 
                  onClick={() => navigate('/teacher/courses/create')}
                  className="bg-black dark:bg-white text-white dark:text-black"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Course
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map(renderCourseCard)}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{courseToDelete?.title}"? 
              This action cannot be undone and all course materials will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
