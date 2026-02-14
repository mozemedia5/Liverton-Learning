/**
 * Parent Performance Page
 * View children's academic performance and progress
 * Features:
 * - Grade tracking
 * - Performance analytics
 * - Subject-wise performance
 * - Progress over time
 * - Attendance tracking
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, BookOpen, Target } from 'lucide-react';
import ParentSideNavbar from '@/components/ParentSideNavbar';
import { getLinkedStudents } from '@/lib/parentService';
import type { LinkedStudent } from '@/lib/parentService';

/**
 * Subject interface for type safety
 */
interface Subject {
  name: string;
  grade: string;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Parent Performance Component
 * Displays academic performance for linked students
 */
export default function ParentPerformance() {
  const { currentUser } = useAuth();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  /**
   * Mock performance data - replace with actual API call
   */
  const mockPerformance: Record<string, Subject[]> = {
    student1: [
      {
        name: 'Mathematics',
        grade: 'A',
        percentage: 92,
        trend: 'up',
      },
      {
        name: 'English',
        grade: 'B+',
        percentage: 85,
        trend: 'stable',
      },
      {
        name: 'Science',
        grade: 'A-',
        percentage: 88,
        trend: 'up',
      },
      {
        name: 'History',
        grade: 'B',
        percentage: 80,
        trend: 'down',
      },
      {
        name: 'Physical Education',
        grade: 'A',
        percentage: 95,
        trend: 'stable',
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
   * Get grade color based on performance
   */
  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Get trend indicator
   */
  const getTrendIndicator = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default:
        return <div className="h-4 w-4 text-gray-400">—</div>;
    }
  };

  /**
   * Calculate overall average
   */
  const calculateOverallAverage = () => {
    const subjects = mockPerformance.student1 || [];
    if (subjects.length === 0) return 0;
    const total = subjects.reduce((sum, subject) => sum + subject.percentage, 0);
    return Math.round(total / subjects.length);
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
            <h1 className="text-3xl font-bold">Performance</h1>
            <p className="text-gray-600 mt-1">Track your children's academic progress</p>
          </div>

          {linkedStudents.length === 0 ? (
            /* Empty State */
            <Card className="border-dashed">
              <CardContent className="pt-12 pb-12 text-center">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No performance data</h3>
                <p className="text-gray-600">
                  Link a child to view their performance data
                </p>
              </CardContent>
            </Card>
          ) : (
            /* Performance View */
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
                    {/* Overall Performance Card */}
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Overall Performance</span>
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Average Score */}
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Average Score</p>
                            <div className="text-4xl font-bold text-blue-600">
                              {calculateOverallAverage()}%
                            </div>
                          </div>

                          {/* Subjects Count */}
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Subjects</p>
                            <div className="text-4xl font-bold text-indigo-600">
                              {mockPerformance.student1?.length || 0}
                            </div>
                          </div>

                          {/* Attendance */}
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Attendance</p>
                            <div className="text-4xl font-bold text-green-600">95%</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Subject Performance */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          Subject Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {mockPerformance.student1?.map(subject => (
                            <div key={subject.name} className="space-y-2">
                              {/* Subject Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium">{subject.name}</span>
                                  {getTrendIndicator(subject.trend)}
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge className="bg-blue-100 text-blue-800">
                                    {subject.grade}
                                  </Badge>
                                  <span className={`font-semibold ${getGradeColor(subject.percentage)}`}>
                                    {subject.percentage}%
                                  </span>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <Progress value={subject.percentage} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Performance Insights */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Insights</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="font-medium text-green-900">Strengths</p>
                            <p className="text-sm text-green-700 mt-1">
                              Excellent performance in Mathematics and Physical Education. Keep up the great work!
                            </p>
                          </div>

                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="font-medium text-yellow-900">Areas for Improvement</p>
                            <p className="text-sm text-yellow-700 mt-1">
                              History performance has declined slightly. Consider additional study sessions or tutoring support.
                            </p>
                          </div>

                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="font-medium text-blue-900">Recommendations</p>
                            <p className="text-sm text-blue-700 mt-1">
                              Overall performance is excellent. Continue current study habits and maintain consistent attendance.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
