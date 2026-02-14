/**
 * Student Zoom Lessons Component
 * 
 * Features:
 * - Browse available lessons
 * - Enroll in lessons
 * - View upcoming lessons
 * - Track lesson history
 * - Access learning materials
 * - Join Zoom meetings
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Video,
  BookOpen,
  Calendar,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  Loader2,
  Download,
  Award,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllLessons,
  enrollInLesson,
  getStudentEnrolledLessons,
  getStudentLessonHistory,
} from '@/lib/zoomService';

/**
 * Student Zoom Lessons Component
 */
export default function StudentZoomLessons() {
  const { currentUser } = useAuth();

  // State management
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [enrolledLessons, setEnrolledLessons] = useState<any[]>([]);
  const [lessonHistory, setLessonHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);

  // Fetch all lessons on component mount
  useEffect(() => {
    const fetchLessons = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        const lessons = await getAllLessons();
        setAllLessons(lessons);

        // Fetch enrolled lessons
        const enrolled = await getStudentEnrolledLessons(currentUser.uid);
        setEnrolledLessons(enrolled);

        // Fetch lesson history
        const history = await getStudentLessonHistory(currentUser.uid);
        setLessonHistory(history);
      } catch (err) {
        console.error('Error fetching lessons:', err);
        setError('Failed to load lessons');
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [currentUser?.uid]);

  // Handle lesson enrollment
  const handleEnroll = async (lessonId: string) => {
    if (!currentUser?.uid) return;

    try {
      setEnrolling(lessonId);
      await enrollInLesson(currentUser.uid, lessonId);

      // Refresh enrolled lessons
      const enrolled = await getStudentEnrolledLessons(currentUser.uid);
      setEnrolledLessons(enrolled);

      setEnrollmentSuccess(true);
      setShowEnrollDialog(false);

      // Reset success message after 3 seconds
      setTimeout(() => setEnrollmentSuccess(false), 3000);
    } catch (err) {
      console.error('Error enrolling in lesson:', err);
      setError('Failed to enroll in lesson');
    } finally {
      setEnrolling(null);
    }
  };

  // Get available lessons (not enrolled)
  const availableLessons = allLessons.filter(
    (lesson) => !enrolledLessons.some((enrolled) => enrolled.id === lesson.id)
  );

  // Get upcoming lessons

  if (loading && allLessons.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading lessons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Zoom Lessons</h1>
        <p className="text-muted-foreground">
          Browse and enroll in lessons from expert teachers
        </p>
      </div>

      {/* Success Message */}
      {enrollmentSuccess && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800">Successfully enrolled in lesson!</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse Lessons</TabsTrigger>
          <TabsTrigger value="enrolled">
            Enrolled ({enrolledLessons.length})
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Browse Lessons Tab */}
        <TabsContent value="browse" className="space-y-4">
          {availableLessons.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Available Lessons</h3>
                <p className="text-muted-foreground">
                  All available lessons have been enrolled. Check back soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableLessons.map((lesson) => (
                <Card
                  key={lesson.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{lesson.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          by {lesson.teacherName || 'Unknown Teacher'}
                        </p>
                      </div>
                      <Badge variant="outline">Available</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Lesson Description */}
                    <p className="text-sm text-muted-foreground">
                      {lesson.description || 'No description available'}
                    </p>

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
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {lesson.enrolledCount || 0} /{' '}
                          {lesson.maxStudents || 'Unlimited'} students
                        </span>
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

                    {/* Enroll Button */}
                    <Button
                      onClick={() => handleEnroll(lesson.id)}
                      disabled={enrolling === lesson.id}
                      className="w-full"
                    >
                      {enrolling === lesson.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        'Enroll Now'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Enrolled Lessons Tab */}
        <TabsContent value="enrolled" className="space-y-4">
          {enrolledLessons.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Enrolled Lessons</h3>
                <p className="text-muted-foreground">
                  You haven't enrolled in any lessons yet. Browse available lessons to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrolledLessons.map((lesson) => (
                <Card
                  key={lesson.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{lesson.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          by {lesson.teacherName || 'Unknown Teacher'}
                        </p>
                      </div>
                      <Badge variant="default">Enrolled</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                    </div>

                    {/* Learning Outcomes */}
                    {lesson.outcomes && lesson.outcomes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          Learning Outcomes
                        </h4>
                        <ul className="text-sm space-y-1">
                          {lesson.outcomes.slice(0, 3).map((outcome: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Course Materials */}
                    {lesson.materials && lesson.materials.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Materials</h4>
                        <div className="space-y-1">
                          {lesson.materials.map((material: any, idx: number) => (
                            <button
                              key={idx}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2 text-sm"
                            >
                              <Download className="w-4 h-4" />
                              {material.name || `Material ${idx + 1}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Join Lesson Button */}
                    {new Date(lesson.scheduledDate) > new Date() && (
                      <Button className="w-full" variant="default">
                        <Video className="w-4 h-4 mr-2" />
                        Join Lesson
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Lesson History Tab */}
        <TabsContent value="history" className="space-y-4">
          {lessonHistory.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Lesson History</h3>
                <p className="text-muted-foreground">
                  You haven't completed any lessons yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {lessonHistory.map((history) => (
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

      {/* Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Enrollment</DialogTitle>
            <DialogDescription>
              Are you sure you want to enroll in this lesson?
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
