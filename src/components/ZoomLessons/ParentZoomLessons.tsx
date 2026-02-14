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

  Loader2,
  User,
  Award,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getParentChildLessons,
  getStudentLessonHistory,
} from '@/lib/zoomService';
import { getLinkedStudents } from '@/lib/parentService';
import type { LinkedStudent } from '@/lib/parentService';

/**
 * Parent Zoom Lessons Component
 */
export default function ParentZoomLessons() {
  const { currentUser } = useAuth();

  // State management
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [childLessons, setChildLessons] = useState<any[]>([]);
  const [childLessonHistory, setChildLessonHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch linked students on component mount
  useEffect(() => {
    const fetchLinkedStudents = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        const students = await getLinkedStudents(currentUser.uid);
        setLinkedStudents(students);
        
        // Auto-select first child if available
        if (students.length > 0) {
          setSelectedChildId(students[0].studentId);
        }
      } catch (err) {
        console.error('Error fetching linked students:', err);
        setError('Failed to load linked students');
      } finally {
        setLoading(false);
      }
    };

    fetchLinkedStudents();
  }, [currentUser?.uid]);

  // Fetch child's lessons when selected child changes
  useEffect(() => {
    const fetchChildLessons = async () => {
      if (!selectedChildId) return;

      try {
        setLoading(true);
        const lessons = await getParentChildLessons(selectedChildId);
        setChildLessons(lessons);

        // Fetch lesson history
        const history = await getStudentLessonHistory(selectedChildId);
        setChildLessonHistory(history);
      } catch (err) {
        console.error('Error fetching child lessons:', err);
        setError('Failed to load lessons');
      } finally {
        setLoading(false);
      }
    };

    fetchChildLessons();
  }, [selectedChildId]);

  // Get selected child info
  const selectedChild = linkedStudents.find(
    (student) => student.studentId === selectedChildId
  );

  // Calculate dashboard statistics
  const upcomingLessons = childLessons.filter(
    (lesson) => new Date(lesson.scheduledDate) > new Date()
  ).length;

  const attendedLessons = childLessonHistory.filter(
    (history) => history.status === 'completed'
  ).length;

  const totalEnrolled = childLessons.length;

  const totalFees = childLessons.reduce(
    (sum, lesson) => sum + (lesson.enrollmentFee || 0),
    0
  );

  if (loading && linkedStudents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your children's lessons...</p>
        </div>
      </div>
    );
  }

  if (linkedStudents.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Linked Children</h3>
            <p className="text-muted-foreground">
              You haven't linked any children yet. Please link a child to view their lessons.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Children's Lessons</h1>
        <p className="text-muted-foreground">
          Monitor your children's learning progress and lesson attendance
        </p>
      </div>

      {/* Child Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Child</label>
        <Select value={selectedChildId} onValueChange={setSelectedChildId}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="Choose a child" />
          </SelectTrigger>
          <SelectContent>
            {linkedStudents.map((student) => (
              <SelectItem key={student.studentId} value={student.studentId}>
                {student.studentName || 'Unknown Student'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Statistics */}
      {selectedChild && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Upcoming Lessons Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Lessons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingLessons}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Scheduled lessons
              </p>
            </CardContent>
          </Card>

          {/* Attended Lessons Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Attended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendedLessons}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Completed lessons
              </p>
            </CardContent>
          </Card>

          {/* Total Enrolled Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Enrolled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEnrolled}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All lessons
              </p>
            </CardContent>
          </Card>

          {/* Total Fees Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Fees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalFees.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Enrollment costs
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for Lessons and History */}
      <Tabs defaultValue="enrolled" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="enrolled">Enrolled Lessons</TabsTrigger>
          <TabsTrigger value="history">Lesson History</TabsTrigger>
        </TabsList>

        {/* Enrolled Lessons Tab */}
        <TabsContent value="enrolled" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : childLessons.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Enrolled Lessons</h3>
                <p className="text-muted-foreground">
                  {selectedChild?.studentName} hasn't enrolled in any lessons yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {childLessons.map((lesson) => (
                <Card key={lesson.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{lesson.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          by {lesson.teacherName || 'Unknown Teacher'}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {lesson.status || 'scheduled'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Lesson Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {new Date(lesson.scheduledDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{lesson.duration || 'N/A'} minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>${lesson.enrollmentFee || 0}</span>
                      </div>
                    </div>

                    {/* Learning Outcomes */}
                    {lesson.outcomes && lesson.outcomes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          Learning Outcomes
                        </h4>
                        <ul className="text-sm space-y-1">
                          {lesson.outcomes.map((outcome: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Join Lesson Button */}
                    {new Date(lesson.scheduledDate) > new Date() && (
                      <button className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                        <Video className="w-4 h-4" />
                        Join Lesson
                      </button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Lesson History Tab */}
        <TabsContent value="history" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : childLessonHistory.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Lesson History</h3>
                <p className="text-muted-foreground">
                  {selectedChild?.studentName} hasn't completed any lessons yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {childLessonHistory.map((history) => (
                <Card key={history.id} className="overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{history.lessonTitle}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(history.completedDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          history.status === 'completed' ? 'default' : 'secondary'
                        }
                      >
                        {history.status}
                      </Badge>
                    </div>

                    {/* Teacher Feedback */}
                    {history.teacherFeedback && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-semibold mb-1">Teacher Feedback</p>
                        <p className="text-sm text-muted-foreground">
                          {history.teacherFeedback}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
