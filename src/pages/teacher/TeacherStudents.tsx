/**
 * Teacher Students Page
 * Displays all students enrolled in the teacher's courses
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Users,
  ArrowLeft, 
  Calendar,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  subscribeToTeacherEnrollments,
  type Enrollment
} from '@/services/analyticsService';

/**
 * TeacherStudents Component
 * Displays all students enrolled in teacher's courses with their progress
 */
export default function TeacherStudents() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  // Subscribe to teacher's enrollments
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    const unsubscribe = subscribeToTeacherEnrollments(currentUser.uid, (data) => {
      setEnrollments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Filter enrollments based on search and course selection
  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch = enrollment.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         enrollment.courseName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || enrollment.courseName === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  // Get unique courses
  const uniqueCourses = Array.from(new Set(enrollments.map(e => e.courseName)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <span className="font-semibold">My Students</span>
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
                <Users className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold">My Students</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
              <p className="text-2xl font-bold">{enrollments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Courses</p>
              <p className="text-2xl font-bold">{uniqueCourses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Progress</p>
              <p className="text-2xl font-bold">
                {enrollments.length > 0 
                  ? Math.round(enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length)
                  : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search students or courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-black"
          >
            <option value="all">All Courses</option>
            {uniqueCourses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
        </div>

        {/* Students List */}
        {filteredEnrollments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {enrollments.length === 0 ? 'No students yet' : 'No students found'}
              </h3>
              <p className="text-gray-600">
                {enrollments.length === 0 
                  ? 'Students will appear here once they enroll in your courses' 
                  : 'Try adjusting your search filters'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredEnrollments.map((enrollment) => (
              <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{enrollment.studentName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {enrollment.courseName}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{enrollment.progress}%</p>
                        <p className="text-xs text-gray-500">Progress</p>
                      </div>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3 w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${enrollment.progress}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
