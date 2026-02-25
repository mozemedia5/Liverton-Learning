/**
 * Quiz Analytics Page
 * Displays detailed analytics for a specific quiz with student attempts
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Clock,
  Target,
  Loader2,
  Download,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { subscribeToQuizAnalytics, subscribeToTeacherQuizzes, type Quiz, type QuizAnalytics } from '@/services/quizService';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function QuizAnalytics() {
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  const { currentUser } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Subscribe to quiz data
  useEffect(() => {
    if (!currentUser?.uid || !quizId) return;

    setLoading(true);
    let unsubscribeQuizzes: (() => void) | undefined;
    let unsubscribeAnalytics: (() => void) | undefined;

    try {
      // Get the quiz first
      unsubscribeQuizzes = subscribeToTeacherQuizzes(currentUser.uid, (quizzes) => {
        const foundQuiz = quizzes.find((q) => q.id === quizId);
        if (foundQuiz) {
          setQuiz(foundQuiz);

          // Subscribe to analytics
          unsubscribeAnalytics = subscribeToQuizAnalytics(quizId, foundQuiz, (analyticsData) => {
            setAnalytics(analyticsData);
            setLoading(false);
          });
        }
      });
    } catch (error) {
      console.error('Error loading quiz analytics:', error);
      toast.error('Failed to load quiz analytics');
      setLoading(false);
    }

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      clearTimeout(timeout);
      if (unsubscribeQuizzes) unsubscribeQuizzes();
      if (unsubscribeAnalytics) unsubscribeAnalytics();
    };
  }, [currentUser?.uid, quizId]);

  const handleExportData = () => {
    if (!analytics) return;

    const csvContent = [
      ['Student Name', 'Email', 'Score', 'Correct Answers', 'Total Questions', 'Time Taken (seconds)', 'Date'],
      ...analytics.studentAttempts.map((attempt) => [
        attempt.studentName,
        attempt.studentEmail,
        attempt.score.toFixed(2),
        attempt.correctAnswers,
        attempt.totalQuestions,
        attempt.timeTaken,
        new Date(attempt.completedAt.toDate?.() || attempt.completedAt).toLocaleString(),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz?.title}-analytics.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Analytics exported successfully');
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

  if (!quiz || !analytics) {
    return (
      <AuthenticatedLayout>
        <div className="p-4 lg:p-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-gray-600">Quiz not found</p>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  // Prepare data for charts
  const scoreDistribution = [
    { range: '0-20%', count: analytics.studentAttempts.filter((a) => a.score < 20).length },
    { range: '20-40%', count: analytics.studentAttempts.filter((a) => a.score >= 20 && a.score < 40).length },
    { range: '40-60%', count: analytics.studentAttempts.filter((a) => a.score >= 40 && a.score < 60).length },
    { range: '60-80%', count: analytics.studentAttempts.filter((a) => a.score >= 60 && a.score < 80).length },
    { range: '80-100%', count: analytics.studentAttempts.filter((a) => a.score >= 80).length },
  ];

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

  return (
    <AuthenticatedLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{quiz.title} - Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">{quiz.subject}</p>
          </div>
          <Button onClick={handleExportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Attempts</p>
                  <p className="text-xl font-bold">{analytics.totalAttempts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Average Score</p>
                  <p className="text-xl font-bold">{analytics.averageScore.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Highest Score</p>
                  <p className="text-xl font-bold">{analytics.highestScore.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Time</p>
                  <p className="text-xl font-bold">{Math.round(analytics.averageTimeSpent)}s</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={scoreDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ range, count }) => `${range}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {scoreDistribution.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attempt Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{analytics.completedAttempts}</p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Abandoned</p>
                      <p className="text-2xl font-bold text-red-600">{analytics.abandonedAttempts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Questions Tab */}
          {activeTab === 'questions' && (
            <div className="space-y-6 mt-6">
              {analytics.questionAnalytics.map((qa, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Question {index + 1}: {qa.questionText}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Correct</p>
                        <p className="text-xl font-bold text-blue-600">{qa.correctCount}</p>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Incorrect</p>
                        <p className="text-xl font-bold text-red-600">{qa.incorrectCount}</p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                        <p className="text-xl font-bold text-green-600">{qa.correctPercentage.toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Answer Distribution:</p>
                      {qa.optionDistribution.map((count, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-12">
                            {String.fromCharCode(65 + optIndex)}:
                          </span>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                            <div
                              className={`h-full flex items-center justify-center text-xs font-bold text-white ${
                                optIndex === qa.mostSelectedOption
                                  ? 'bg-blue-600'
                                  : 'bg-gray-400'
                              }`}
                              style={{
                                width: `${
                                  qa.totalAnswered > 0
                                    ? (count / qa.totalAnswered) * 100
                                    : 0
                                }%`,
                              }}
                            >
                              {count > 0 && `${count}`}
                            </div>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                            {qa.totalAnswered > 0
                              ? ((count / qa.totalAnswered) * 100).toFixed(0)
                              : 0}
                            %
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Student Attempts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800">
                          <th className="text-left py-3 px-4 font-semibold">Student Name</th>
                          <th className="text-left py-3 px-4 font-semibold">Email</th>
                          <th className="text-center py-3 px-4 font-semibold">Score</th>
                          <th className="text-center py-3 px-4 font-semibold">Correct</th>
                          <th className="text-center py-3 px-4 font-semibold">Time (s)</th>
                          <th className="text-left py-3 px-4 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.studentAttempts.map((attempt) => (
                          <tr
                            key={attempt.id}
                            className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                          >
                            <td className="py-3 px-4">{attempt.studentName}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                              {attempt.studentEmail}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge
                                variant={
                                  attempt.score >= 70
                                    ? 'default'
                                    : attempt.score >= 50
                                    ? 'secondary'
                                    : 'destructive'
                                }
                              >
                                {attempt.score.toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center font-semibold">
                              {attempt.correctAnswers}/{attempt.totalQuestions}
                            </td>
                            <td className="py-3 px-4 text-center">{attempt.timeTaken}</td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                              {new Date(
                                attempt.completedAt.toDate?.() || attempt.completedAt
                              ).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}
