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
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { getLinkedStudents } from '@/lib/parentService';
import { subscribeToStudentCourses, type Course } from '@/services/courseService';
import type { LinkedStudent } from '@/lib/parentService';

/**
 * Parent Courses Component
 * Displays all courses for linked students
 */
export default function ParentCourses() {
  const { currentUser } = useAuth();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [studentCourses, setStudentCourses] = useState<Record<string, Course[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  /**
   * Load linked students on component mount
   */
  useEffect(() => {
    loadStudents();
  }, [currentUser]);

  /**
   * Subscribe to courses for each linked student
   */
  useEffect(() => {
    if (linkedStudents.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    linkedStudents.forEach(student => {
      const unsubscribe = subscribeToStudentCourses(
        student.studentId,
        (courses) => {
          setStudentCourses(prev => ({
            ...prev,
            [student.studentId]: courses
          }));
        }
      );
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [linkedStudents]);

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
      <AuthenticatedLayout>
        <div className="flex-1 flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="p-4 md:p-8 lg:ml-0">
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

            {linkedStudents.map(student => {
              const courses = studentCourses[student.studentId] || [];
              
              return (
                <TabsContent key={student.studentId} value={student.studentId}>
                  <div className="space-y-6">
                    {courses.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="pt-12 pb-12 text-center">
                          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                          <p className="text-gray-600">
                            {student.studentName} hasn't enrolled in any courses yet
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => (
                          <Card key={course.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg">{course.title}</CardTitle>
                                  <p className="text-sm text-gray-600 mt-1">{course.teacherName}</p>
                                </div>
                                <Badge className={getStatusColor(course.status)}>
                                  {course.status}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {course.description}
                              </p>

                              {/* Course Info */}
                              <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                  <p className="text-xs text-gray-600 uppercase tracking-wide">Subject</p>
                                  <p className="text-sm font-medium mt-1">
                                    {course.subject}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 uppercase tracking-wide">Materials</p>
                                  <p className="text-sm font-medium flex items-center gap-1 mt-1">
                                    <BookOpen className="h-3 w-3" />
                                    {course.materials?.length || 0} files
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
