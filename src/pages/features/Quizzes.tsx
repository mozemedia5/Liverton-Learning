import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  ArrowLeft, 
  CheckCircle, 
  Clock,
  Trophy,
  Play,
  BarChart3,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Quiz {
  id: string;
  title: string;
  subject: string;
  questions: unknown[]; // We just need count
  questionCount?: number;
  timeLimitPerQuestion: number; // in seconds
  status: 'published';
}

interface QuizAttempt {
  quizId: string;
  score: number;
  completedAt: { seconds: number; nanoseconds: number } | null;
}

interface ProcessedQuiz extends Quiz {
  studentStatus: 'available' | 'completed';
  score?: number;
  completedAt?: string;
}

export default function Quizzes() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');
  const [quizzes, setQuizzes] = useState<ProcessedQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all published quizzes
        const quizzesQuery = query(collection(db, 'quizzes'), where('status', '==', 'published'));
        const quizzesSnapshot = await getDocs(quizzesQuery);
        const quizzesData = quizzesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));

        // Fetch user attempts
        const attemptsQuery = query(collection(db, 'quiz_attempts'), where('studentId', '==', currentUser.uid));
        const attemptsSnapshot = await getDocs(attemptsQuery);
        const attemptsMap = new Map<string, QuizAttempt>();

        attemptsSnapshot.forEach(doc => {
            const data = doc.data();
            attemptsMap.set(data.quizId, {
                quizId: data.quizId,
                score: data.score,
                completedAt: data.completedAt
            });
        });

        // Combine data
        const processed: ProcessedQuiz[] = quizzesData.map(q => {
            const attempt = attemptsMap.get(q.id);
            return {
                ...q,
                studentStatus: attempt ? 'completed' : 'available',
                score: attempt?.score,
                completedAt: attempt?.completedAt ? new Date(attempt.completedAt.seconds * 1000).toLocaleDateString() : undefined
            };
        });

        setQuizzes(processed);
      } catch (error) {
        console.error("Error fetching quizzes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const filteredQuizzes = quizzes.filter(quiz =>
    activeTab === 'available' ? quiz.studentStatus !== 'completed' : quiz.studentStatus === 'completed'
  );

  const handleStartQuiz = (quiz: ProcessedQuiz) => {
    navigate(`/student/quiz/${quiz.id}`);
  };

  const completedQuizzes = quizzes.filter(q => q.studentStatus === 'completed');
  const averageScore = completedQuizzes.length > 0
    ? completedQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / completedQuizzes.length
    : 0;

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
    );
  }

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
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold">Quizzes</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-xl font-bold">{completedQuizzes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Score</p>
                  <p className="text-xl font-bold">{Math.round(averageScore)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Play className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
                  <p className="text-xl font-bold">{quizzes.filter(q => q.studentStatus === 'available').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-xl font-bold">{quizzes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'available' ? 'default' : 'outline'}
            onClick={() => setActiveTab('available')}
          >
            Available
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'default' : 'outline'}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </Button>
        </div>

        {/* Quiz List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{quiz.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{quiz.subject}</p>
                  </div>
                  {quiz.studentStatus === 'completed' ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>
                  ) : (
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Available</Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {quiz.questionCount || quiz.questions?.length || 0} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {quiz.timeLimitPerQuestion}s / q
                  </span>
                </div>

                {quiz.studentStatus === 'completed' && quiz.score !== undefined && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Score</span>
                      <span className="font-bold">{quiz.score}%</span>
                    </div>
                    <Progress value={quiz.score} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">Completed on {quiz.completedAt}</p>
                  </div>
                )}

                <Button
                  onClick={() => handleStartQuiz(quiz)}
                  className="w-full"
                  variant={quiz.studentStatus === 'completed' ? 'outline' : 'default'}
                >
                  {quiz.studentStatus === 'completed' ? (
                    <><BarChart3 className="w-4 h-4 mr-2" /> Retake Quiz</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> Start Quiz</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredQuizzes.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No quizzes found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {activeTab === 'available' ? 'You have completed all available quizzes!' : 'You haven\'t completed any quizzes yet.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
