/**
 * Student Zoom Lessons Component
 * 
 * Features:
 * - Browse and enroll in available Zoom lessons
 * - View enrolled lessons
 * - Access lesson history and previous lessons
 * - View learning outcomes
 * - See upcoming lesson schedule
 * - Access teacher information
 * - Join Zoom meetings
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  ExternalLink,
  Award,
  User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getAvailableLessons,
  getStudentEnrolledLessons,
  getStudentLessonHistory,
  getStudentUpcomingLessons,
  enrollStudentInLesson,
  type ZoomLesson,
} from '@/lib/zoomService';

/**
 * Student Zoom Lessons Component
 */
export default function StudentZoomLessons() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { theme } = useTheme();

  // State management
  const [availableLessons, setAvailableLessons] = useState<(ZoomLesson & { id: string })[]>([]);
  const [enrolledLessons, setEnrolledLessons] = useState<any[]>([]);
  const [upcomingLessons, setUpcomingLessons] = useState<(ZoomLesson & { id: string })[]>([]);
  const [lessonHistory, setLessonHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<(ZoomLesson & { id: string }) | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);

  /**
   * Load all lesson data on component mount
   */
  useEffect(() => {
    loadAllLessons();
  }, [userData?.uid]);

  /**
   * Load all lesson data
   */
  const loadAllLessons = async () => {
    if (!userData?.uid) return;

    try {
      setLoading(true);
      const [available, enrolled, upcoming, history] = await Promise.all([
        getAvailableLessons(),
        getStudentEnrolledLessons(userData.uid),
        getStudentUpcomingLessons(userData.uid),
        getStudentLessonHistory(userData.uid),
      ]);

      setAvailableLessons(available);
      setEnrolledLessons(enrolled);
      setUpcomingLessons(upcoming);
      setLessonHistory(history);
    } catch (error) {
      console.error('Error loading lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle lesson enrollment
   */
  const handleEnrollLesson = async (lesson: ZoomLesson & { id: string }) => {
    if (!userData?.uid) return;

    try {
      setIsEnrolling(true);
      await enrollStudentInLesson(
        lesson.id,
        userData.uid,
        userData.fullName || 'Student',
        lesson.enrollmentFee
      );
      setEnrollmentSuccess(true);
      setTimeout(() => {
        setEnrollmentSuccess(false);
        setSelectedLesson(null);
        loadAllLessons();
      }, 2000);
    } catch (error) {
      console.error('Error enrolling in lesson:', error);
    } finally {
      setIsEnrolling(false);
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
   * Lesson Card Component
   */
  const LessonCard = ({ lesson, isEnrolled = false, showEnrollButton = true }: any) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg">{lesson.title}</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {lesson.className}
            </p>
          </div>
          <Badge className={getStatusColor(lesson.status)}>
            {lesson.status}
          </Badge>
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

          {lesson.enrollmentFee > 0 && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <DollarSign className="w-4 h-4" />
              <span>${lesson.enrollmentFee}</span>
            </div>
          )}
        </div>

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

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          {isEnrolled && lesson.status === 'ongoing' && (
            <Button
              className="flex-1 gap-2"
              onClick={() => window.open(lesson.zoomLink, '_blank')}
            >
              <Video className="w-4 h-4" />
              Join Now
            </Button>
          )}

          {showEnrollButton && !isEnrolled && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  className="flex-1"
                  onClick={() => setSelectedLesson(lesson)}
                >
                  Enroll Now
                </Button>
              </DialogTrigger>

              {/* Enrollment Confirmation Dialog */}
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Enrollment</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded">
                    <h3 className="font-semibold mb-2">{lesson.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {lesson.description}
                    </p>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Date:</span>
                        <span className="font-medium">
                          {lesson.scheduledDate.toDate().toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Time:</span>
                        <span className="font-medium">{lesson.scheduledTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                        <span className="font-medium">{lesson.duration} minutes</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600 dark:text-gray-400">Enrollment Fee:</span>
                        <span className="font-semibold">
                          ${lesson.enrollmentFee.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={isEnrolling}
                      onClick={() => handleEnrollLesson(lesson)}
                    >
                      {isEnrolling ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        'Confirm Enrollment'
                      )}
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Cancel
                    </Button>
                  </div>

                  {enrollmentSuccess && (
                    <div className="p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        Successfully enrolled!
                      </span>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/student/zoom-lessons/${lesson.id}`)}
          >
            Details
          </Button>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Video className="w-8 h-8" />
          Zoom Lessons
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enroll in lessons, track your progress, and access learning materials
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upcoming">
            Upcoming
            {upcomingLessons.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {upcomingLessons.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="enrolled">
            Enrolled
            {enrolledLessons.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {enrolledLessons.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="available">
            Browse
            {availableLessons.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {availableLessons.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            History
            {lessonHistory.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {lessonHistory.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Lessons Tab */}
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingLessons.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No upcoming lessons</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Browse available lessons to enroll
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingLessons.map(lesson => (
                <LessonCard key={lesson.id} lesson={lesson} isEnrolled={true} showEnrollButton={false} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Enrolled Lessons Tab */}
        <TabsContent value="enrolled" className="space-y-4">
          {enrolledLessons.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No enrolled lessons yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Enroll in lessons from the Browse tab
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {enrolledLessons.map(({ lesson, enrollment }) => (
                <LessonCard key={lesson.id} lesson={lesson} isEnrolled={true} showEnrollButton={false} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Available Lessons Tab */}
        <TabsContent value="available" className="space-y-4">
          {availableLessons.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No available lessons</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Check back later for new lessons
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableLessons.map(lesson => (
                <LessonCard key={lesson.id} lesson={lesson} isEnrolled={false} showEnrollButton={true} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {lessonHistory.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Award className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No lesson history yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Your completed lessons will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {lessonHistory.map(history => (
                <Card key={history.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
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
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                        Feedback: {history.feedback}
                      </p>
                    )}
                    {history.rating && (
                      <div className="mt-3 flex items-center gap-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Rating:</span>
                        <span className="font-semibold">{history.rating}/5 ⭐</span>
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
