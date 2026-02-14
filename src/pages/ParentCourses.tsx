/**
 * Parent Courses Page
 * View all courses enrolled by linked children
 * Features:
 * - View all courses by child
 * - Course progress tracking
 * - Course details and materials
 * - Upcoming assignments
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, BookOpen, Clock, Users } from 'lucide-react';
import ParentSideNavbar from '@/components/ParentSideNavbar';
import { getLinkedStudents } from '@/lib/parentService';
import type { LinkedStudent } from '@/lib/parentService';

/**
 * Course interface for type safety
 */
interface Course {
  id: string;
  name: string;
  instructor: string;
  progress: number;
  status: 'active' | 'completed' | 'upcoming';
  startDate: string;
  endDate: string;
  students: number;
}

/**
 * Parent Courses Component
 * Displays all courses for linked students
 */
export default function ParentCourses() {
  const { currentUser } = useAuth();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  /**
   * Mock courses data - replace with actual API call
   */
  const mockCourses: Record<string, Course[]> = {
    student1: [
      {
        id: '1',
        name: 'Mathematics 101',
        instructor: 'Dr. Smith',
        progress: 75,
        status: 'active',
        startDate: '2024-01-15',
        endDate: '2024-05-30',
        students: 45,
      },
      {
        id: '2',
        name: 'English Literature',
        instructor: 'Ms. Johnson',
        progress: 60,
        status: 'active',
        startDate: '2024-01-15',
        endDate: '2024-05-30',
        students: 38,
      },
      {
        id: '3',
        name: 'Physics Basics',
        instructor: 'Prof. Williams',
        progress: 0,
        status: 'upcoming',
        startDate: '2024-06-01',
        endDate: '2024-09-30',
        students: 52,
      },
    ],
  };

  /**
   * Load linked students on component mount
   */
  useEffect(() => {
    loadStudents();
  }, [currentUser]);

  /**
   * Load linked students from Firebase
   */
  const loadStudents = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const students = await getLinkedStudents(currentUser.uid);
      setLinkedStudents(students);
      
      // Set first student as selected by default
      if (students.length > 0) {
        setSelectedStudent(students[0].studentId);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <ParentSideNavbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <ParentSideNavbar />
      <main className="flex-1 overflow-auto lg:ml-64">
        <div className="p-4 md:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Courses</h1>
            <p className="text-gray-600 mt-1">View all courses for your children</p>
          </div>

          {linkedStudents.length === 0 ? (
            /* Empty State */
            <Card className="border-dashed">
              <CardContent className="pt-12 pb-12 text-center">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                <p className="text-gray-600">
                  Link a child to view their courses
                </p>
              </CardContent>
            </Card>
          ) : (
            /* Courses View */
            <Tabs defaultValue={selectedStudent || ''} onValueChange={setSelectedStudent}>
              <TabsList className="mb-6">
                {linkedStudents.map(student => (
                  <TabsTrigger key={student.studentId} value={student.studentId}>
                    {student.studentName}
                  </TabsTrigger>
                ))}
              </TabsList>

              {linkedStudents.map(student => (
                <TabsContent key={student.studentId} value={student.studentId}>
                  <div className="space-y-6">
                    {/* Active Courses */}
                    <div>
                      <h2 className="text-xl font-semibold mb-4">Active Courses</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mockCourses.student1
                          ?.filter(course => course.status === 'active')
                          .map(course => (
                            <Card key={course.id} className="hover:shadow-lg transition-shadow">
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <CardTitle className="text-lg">{course.name}</CardTitle>
                                    <p className="text-sm text-gray-600 mt-1">{course.instructor}</p>
                                  </div>
                                  <Badge className={getStatusColor(course.status)}>
                                    {course.status}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* Progress */}
                                <div>
                                  <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium">Progress</span>
                                    <span className="text-sm text-gray-600">{course.progress}%</span>
                                  </div>
                                  <Progress value={course.progress} className="h-2" />
                                </div>

                                {/* Course Info */}
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                  <div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide">Duration</p>
                                    <p className="text-sm font-medium flex items-center gap-1 mt-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(course.startDate).toLocaleDateString()} - {new Date(course.endDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide">Students</p>
                                    <p className="text-sm font-medium flex items-center gap-1 mt-1">
                                      <Users className="h-3 w-3" />
                                      {course.students}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </div>

                    {/* Upcoming Courses */}
                    {mockCourses.student1?.some(c => c.status === 'upcoming') && (
                      <div>
                        <h2 className="text-xl font-semibold mb-4">Upcoming Courses</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {mockCourses.student1
                            ?.filter(course => course.status === 'upcoming')
                            .map(course => (
                              <Card key={course.id} className="opacity-75">
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <CardTitle className="text-lg">{course.name}</CardTitle>
                                      <p className="text-sm text-gray-600 mt-1">{course.instructor}</p>
                                    </div>
                                    <Badge className={getStatusColor(course.status)}>
                                      {course.status}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide">Starts</p>
                                    <p className="text-sm font-medium mt-1">
                                      {new Date(course.startDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 uppercase tracking-wide">Students Enrolled</p>
                                    <p className="text-sm font-medium flex items-center gap-1 mt-1">
                                      <Users className="h-3 w-3" />
                                      {course.students}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}
