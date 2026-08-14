import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  BookOpen, 
  ArrowLeft, 
  Play, 
  Clock,
  Star,
  FileText,
  Loader2,
  Share2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { subscribeToAllCourses, type Course } from '@/services/courseService';
import ShareContentDialog, { type ShareContentItem } from '@/components/ShareContentDialog';

const subjects = ['All', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Computer Science'];

export default function Courses() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [shareItem, setShareItem] = useState<ShareContentItem | null>(null);
  const [showShare, setShowShare] = useState(false);

  const openShare = (course: Course) => {
    setShareItem({
      type:        'course',
      id:          course.id,
      title:       course.title,
      description: course.description,
      teacherName: course.teacherName,
      subject:     course.subject,
    });
    setShowShare(true);
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAllCourses((data) => {
      setCourses(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'All' || course.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const openModule = (course: Course) => {
    navigate(`/modules/${course.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 transition-transform duration-300 hover:scale-110">
                <img
                  src="/logo.png"
                  alt="Liverton Learning Logo"
                  className="w-[90%] h-[90%] object-contain"
                />
              </div>
              <span className="font-semibold">Modules</span>
            </div>
          </div>
          {userRole === 'teacher' && (
            <Button onClick={() => navigate('/modules/create')}>
              <BookOpen className="w-4 h-4 mr-2" />
              Create Module
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6">
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search modules or teachers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {subjects.map((subject) => (
              <Button
                key={subject}
                variant={selectedSubject === subject ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSubject(subject)}
                className="whitespace-nowrap"
              >
                {subject}
              </Button>
            ))}
          </div>
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
            <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-gray-400" />
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{course.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{course.teacherName}</p>
                  </div>
                    <Badge variant="secondary">{course.subject}</Badge>
                </div>
                  {/* Share button */}
                  <button
                    onClick={() => openShare(course)}
                    className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    aria-label="Share module"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {course.description}
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Play className="w-4 h-4" />
                    {course.lessons || 0} lessons
                  </span>
                  {course.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {course.duration}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">4.5</span>
                    <span className="text-sm text-gray-500">({course.enrolledStudents?.length || 0})</span>
                  </div>
                  <p className="text-xl font-bold">{course.currency || '$'}{course.price}</p>
                </div>

                {userRole === 'student' || userRole === 'parent' ? (
                  <Button 
                    className="w-full bg-black dark:bg-white text-white dark:text-black"
                    onClick={() => openModule(course)}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    View Module
                  </Button>
                ) : userRole === 'teacher' ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => toast.info('Edit course feature coming soon!')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Manage Module
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => openModule(course)}
                  >
                    View Details
                  </Button>
                )}
              </CardContent>
            </Card>
            ))}
          </div>
        )}

        {!loading && filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No modules found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}
      </main>

      {/* Share Dialog */}
      <ShareContentDialog
        open={showShare}
        onClose={() => setShowShare(false)}
        item={shareItem}
      />
    </div>
  );
}

