import { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Quiz {
  id: string;
  title: string;
  subject: string;
  questions: number;
  timeLimit: number;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'available' | 'completed' | 'locked';
  score?: number;
  completedAt?: string;
}

const mockQuizzes: Quiz[] = [
  {
    id: '1',
    title: 'Algebra Basics',
    subject: 'Mathematics',
    questions: 20,
    timeLimit: 30,
    difficulty: 'easy',
    status: 'completed',
    score: 85,
    completedAt: '2026-02-08',
  },
  {
    id: '2',
    title: 'Newton\'s Laws',
    subject: 'Physics',
    questions: 15,
    timeLimit: 25,
    difficulty: 'medium',
    status: 'completed',
    score: 92,
    completedAt: '2026-02-06',
  },
  {
    id: '3',
    title: 'Chemical Reactions',
    subject: 'Chemistry',
    questions: 25,
    timeLimit: 40,
    difficulty: 'hard',
    status: 'available',
  },
  {
    id: '4',
    title: 'Grammar & Composition',
    subject: 'English',
    questions: 30,
    timeLimit: 35,
    difficulty: 'medium',
    status: 'available',
  },
  {
    id: '5',
    title: 'World War II',
    subject: 'History',
    questions: 20,
    timeLimit: 30,
    difficulty: 'medium',
    status: 'locked',
  },
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default: return '';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
    case 'available': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Available</Badge>;
    case 'locked': return <Badge variant="secondary">Locked</Badge>;
    default: return null;
  }
};

export default function Quizzes() {
  const navigate = useNavigate();
  useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');

  const filteredQuizzes = mockQuizzes.filter(quiz => 
    activeTab === 'available' ? quiz.status !== 'completed' : quiz.status === 'completed'
  );

  const handleStartQuiz = (quiz: Quiz) => {
    if (quiz.status === 'locked') {
      toast.error('Complete previous quizzes to unlock this one!');
      return;
    }
    toast.info(`Starting ${quiz.title}...`);
  };

  const averageScore = mockQuizzes
    .filter(q => q.status === 'completed' && q.score)
    .reduce((sum, q) => sum + (q.score || 0), 0) / 
    mockQuizzes.filter(q => q.status === 'completed').length || 0;

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
                  <p className="text-xl font-bold">{mockQuizzes.filter(q => q.status === 'completed').length}</p>
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
                  <p className="text-xl font-bold">{mockQuizzes.filter(q => q.status === 'available').length}</p>
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
                  <p className="text-xl font-bold">{mockQuizzes.length}</p>
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
                  {getStatusBadge(quiz.status)}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {quiz.questions} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {quiz.timeLimit} min
                  </span>
                  <Badge className={getDifficultyColor(quiz.difficulty)}>
                    {quiz.difficulty}
                  </Badge>
                </div>

                {quiz.status === 'completed' && quiz.score && (
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
                  disabled={quiz.status === 'locked'}
                  className="w-full"
                  variant={quiz.status === 'completed' ? 'outline' : 'default'}
                >
                  {quiz.status === 'completed' ? (
                    <><BarChart3 className="w-4 h-4 mr-2" /> View Results</>
                  ) : quiz.status === 'locked' ? (
                    <><AlertCircle className="w-4 h-4 mr-2" /> Locked</>
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
