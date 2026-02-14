/**
 * Parent Zoom Lessons Component
 * 
 * Features:
 * - View children's enrolled lessons
 * - Track lesson history and attendance
 * - Monitor learning outcomes
 * - View enrollment status and fees
 * - Access lesson details and schedules
 * - See teacher information
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Video,
  BookOpen,
  Calendar,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  Award,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getParentChildLessons,
  getStudentLessonHistory,
  type ZoomLesson,
} from '@/lib/zoomService';
import { getLinkedStudents } from '@/lib/parentService';
import type { LinkedStudent } from '@/lib/parentService';

/**
 * Parent Zoom Lessons Component
 */
export default function ParentZoomLessons() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();

  // State management
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [childLessons, setChildLessons] = useState<any[]>([]);
  const [childLessonHistory, setChildLessonHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [childLoading, setChildLoading] = useState(false);

  /**
   * Load linked students on component mount
   */
  useEffect(() => {
    loadLinkedStudents();
  }, [currentUser?.uid]);

  /**
   * Load child's lessons when selected child changes
   */
  useEffect(() => {
    if (selectedChildId) {
      loadChildLessons(selectedChildId);
    }
  }, [selectedChildId]);

  /**
   * Load linked students from Firebase
   */
  const loadLinkedStudents = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const students = await getLinkedStudents(currentUser.uid);
      setLinkedStudents(students);

      // Auto-select first child if available
      if (students.length > 0) {
        setSelectedChildId(students[0].id);
      }
    } catch (error) {
      console.error('Error loading linked students:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load child's lessons and history
   */
  const loadChildLessons = async (childId: string) => {
    try {
      setChildLoading(true);
      const [lessons, history] = await Promise.all([
        getParentChildLessons(currentUser?.uid || '', childId),
        getStudentLessonHistory(childId),
      ]);

      setChildLessons(lessons);
      setChildLessonHistory(history);
    } catch (error) {
      console.error('Error loading child lessons:', error);
    } finally {
      setChildLoading(false);
    }
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ongoing':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get payment status color
   */
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Lesson Card Component for Parent View
   */
  const ParentLessonCard = ({ lesson, enrollment }: any) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg">{lesson.title}</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {lesson.className}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge className={getStatusColor(lesson.status)}>
              {lesson.status}
            </Badge>
            <Badge className={getPaymentStatusColor(enrollment.paymentStatus)}>
              {enrollment.paymentStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Teacher Info */}
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
          <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {lesson.teacherName}
          </span>
        </div>

        {/* Lesson Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <BookOpen className="w-4 h-4" />
            <span>{lesson.mainTopic}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{lesson.scheduledDate.toDate().toLocaleDateString()}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{lesson.scheduledTime} ({lesson.duration} min)</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span>{lesson.enrolledStudents}/{lesson.maxStudents} students</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <DollarSign className="w-4 h-4" />
            <span>${enrollment.paymentAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Attendance Status */}
        {enrollment.attended && (
          <div className="p-2 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Attended on {enrollment.attendanceTime?.toDate().toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Learning Outcomes */}
        {lesson.learningOutcomes.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Learning Outcomes:
            </p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              {lesson.learningOutcomes.slice(0, 3).map((outcome: string, idx: number) => (
                <li key={idx}>• {outcome}</li>
              ))}
              {lesson.learningOutcomes.length > 3 && (
                <li>• +{lesson.learningOutcomes.length - 3} more</li>
              )}
            </ul>
          </div>
        )}

        {/* Description */}
        <div className="pt-2 border-t">
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {lesson.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (linkedStudents.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Video className="w-8 h-8" />
            Children's Zoom Lessons
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your children's online learning progress
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No linked children</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Link your children's accounts to view their lessons
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Video className="w-8 h-8" />
          Children's Zoom Lessons
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor your children's online learning progress and enrollment
        </p>
      </div>

      {/* Child Selection */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Select Child</label>
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a child" />
            </SelectTrigger>
            <SelectContent>
              {linkedStudents.map(student => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {childLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {childLessons.filter(l => l.lesson.status === 'scheduled').length}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Upcoming Lessons
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {childLessons.filter(l => l.enrollment.attended).length}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Attended
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    ${childLessons.reduce((sum, l) => sum + l.enrollment.paymentAmount, 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Total Enrolled
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{childLessonHistory.length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Completed
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="enrolled" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="enrolled">
                Enrolled
                {childLessons.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {childLessons.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="upcoming">
                Upcoming
                {childLessons.filter(l => l.lesson.status === 'scheduled').length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {childLessons.filter(l => l.lesson.status === 'scheduled').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">
                History
                {childLessonHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {childLessonHistory.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Enrolled Lessons Tab */}
            <TabsContent value="enrolled" className="space-y-4">
              {childLessons.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No enrolled lessons yet
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Your child hasn't enrolled in any lessons
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {childLessons.map(({ lesson, enrollment }) => (
                    <ParentLessonCard
                      key={lesson.id}
                      lesson={lesson}
                      enrollment={enrollment}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Upcoming Lessons Tab */}
            <TabsContent value="upcoming" className="space-y-4">
              {childLessons.filter(l => l.lesson.status === 'scheduled').length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No upcoming lessons
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {childLessons
                    .filter(l => l.lesson.status === 'scheduled')
                    .map(({ lesson, enrollment }) => (
                      <ParentLessonCard
                        key={lesson.id}
                        lesson={lesson}
                        enrollment={enrollment}
                      />
                    ))}
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              {childLessonHistory.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <Award className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No lesson history yet
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Completed lessons will appear here
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {childLessonHistory.map(history => (
                    <Card key={history.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{history.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Completed: {history.completedDate.toDate().toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Completed
                          </Badge>
                        </div>

                        {history.feedback && (
                          <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                              Teacher Feedback:
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {history.feedback}
                            </p>
                          </div>
                        )}

                        {history.rating && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Rating:
                            </span>
                            <span className="font-semibold">{history.rating}/5 ⭐</span>
                          </div>
                        )}

                        {history.certificateIssued && (
                          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded flex items-center gap-2">
                            <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm text-blue-700 dark:text-blue-300">
                              Certificate Issued
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
