/**
 * Teacher Quizzes Page
 * Displays all quizzes created by the teacher with real-time analytics
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  ArrowLeft,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  BarChart3,
  Eye,
  Loader2,
  HelpCircle,
  Users,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { subscribeToTeacherQuizzes, type Quiz } from '@/services/quizService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TeacherQuizzes() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Subscribe to teacher's quizzes
  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribeToTeacherQuizzes(currentUser.uid, (data) => {
        setQuizzes(data);
        setLoading(false);
      });
    } catch (error) {
      console.error('Error subscribing to quizzes:', error);
      toast.error('Failed to load quizzes');
      setLoading(false);
    }

    // Fallback timeout
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearTimeout(timeout);
    };
  }, [currentUser?.uid]);

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || quiz.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'quizzes', quizToDelete.id));
      toast.success('Quiz deleted successfully');
      setQuizToDelete(null);
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
    } finally {
      setDeleting(false);
    }
  };

  const renderQuizCard = (quiz: Quiz) => (
    <Card key={quiz.id} className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-32 bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center">
        <HelpCircle className="w-16 h-16 text-blue-400" />
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{quiz.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{quiz.subject}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/teacher/quizzes/${quiz.id}`)}>
                <Eye className="w-4 h-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/teacher/quizzes/${quiz.id}/analytics`)}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/teacher/quizzes/${quiz.id}/edit`)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setQuizToDelete(quiz)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {quiz.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-4 h-4" />
            {quiz.questionCount} questions
          </span>
          {quiz.totalAttempts && quiz.totalAttempts > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {quiz.totalAttempts} attempt{quiz.totalAttempts !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Badge variant={quiz.status === 'published' ? 'default' : 'secondary'}>
            {quiz.status}
          </Badge>
          {quiz.averageScore !== undefined && quiz.totalAttempts && quiz.totalAttempts > 0 && (
            <div className="flex items-center gap-1 text-sm font-semibold">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span>{quiz.averageScore.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <span className="font-semibold">My Quizzes</span>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold">My Quizzes</span>
            </div>
          </div>
          <Button
            onClick={() => navigate('/teacher/quizzes/create')}
            className="bg-black dark:bg-white text-white dark:text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Quiz
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6">
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Quizzes</p>
              <p className="text-2xl font-bold">{quizzes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-2xl font-bold">{quizzes.filter((q) => q.status === 'published').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Attempts</p>
              <p className="text-2xl font-bold">
                {quizzes.reduce((sum, q) => sum + (q.totalAttempts || 0), 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Avg Score</p>
              <p className="text-2xl font-bold">
                {quizzes.length > 0
                  ? (
                      quizzes.reduce((sum, q) => sum + (q.averageScore || 0), 0) / quizzes.length
                    ).toFixed(1)
                  : '0'}
                %
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quiz Grid */}
        {filteredQuizzes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {quizzes.length === 0 ? 'No quizzes yet' : 'No quizzes found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {quizzes.length === 0
                  ? 'Create your first quiz to get started'
                  : 'Try adjusting your search'}
              </p>
              {quizzes.length === 0 && (
                <Button
                  onClick={() => navigate('/teacher/quizzes/create')}
                  className="bg-black dark:bg-white text-white dark:text-black"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quiz
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map(renderQuizCard)}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!quizToDelete} onOpenChange={() => setQuizToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{quizToDelete?.title}"?
              This action cannot be undone and all quiz attempts will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuiz}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
