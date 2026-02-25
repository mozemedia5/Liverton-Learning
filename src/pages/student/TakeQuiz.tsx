import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Timer, Trophy, BarChart3, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  timeLimitPerQuestion: number;
}

export default function TakeQuiz() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<{[key: number]: number}>({}); // questionIndex -> optionIndex
  const [quizStatus, setQuizStatus] = useState<'loading' | 'active' | 'completed'>('loading');
  const [score, setScore] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch Quiz
  useEffect(() => {
    if (!id || !currentUser) return;

    const fetchQuiz = async () => {
      try {
        const docRef = doc(db, 'quizzes', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            setQuiz({ id: docSnap.id, ...data } as Quiz);
            setTimeLeft(data.timeLimitPerQuestion || 60);
            setQuizStatus('active');
        } else {
            toast.error("Quiz not found");
            navigate('/student/quizzes');
        }
      } catch (error) {
        console.error("Error fetching quiz:", error);
        toast.error("Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [id, currentUser]);

  // Timer Logic
  useEffect(() => {
    if (quizStatus !== 'active' || !quiz) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
           handleNextQuestion(true); // Auto-advance
           return quiz.timeLimitPerQuestion;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizStatus, currentQuestionIndex, quiz]);

  const handleNextQuestion = (auto = false) => {
    if (!quiz) return;

    // Save current answer if auto-advanced and none selected?
    // If auto-advanced, the answer remains undefined, which is counted as wrong.

    // Clear timer immediately to prevent race conditions
    if (timerRef.current) clearInterval(timerRef.current);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeLeft(quiz.timeLimitPerQuestion);
      if (auto) {
          toast('Time up! Moving to next question.');
      }
    } else {
      finishQuiz();
    }
  };

  const handleAnswer = (optionIndex: number) => {
    setAnswers(prev => ({
        ...prev,
        [currentQuestionIndex]: optionIndex
    }));
  };

  const finishQuiz = async () => {
    if (!quiz || !currentUser) return;

    if (timerRef.current) clearInterval(timerRef.current);

    // Calculate Score
    let correctCount = 0;
    quiz.questions.forEach((q, index) => {
        if (answers[index] === q.correctOptionIndex) {
            correctCount++;
        }
    });

    const finalScore = Math.round((correctCount / quiz.questions.length) * 100);
    setScore(finalScore);
    setQuizStatus('completed');

    // Save Attempt
    try {
        await addDoc(collection(db, 'quiz_attempts'), {
            quizId: quiz.id,
            studentId: currentUser.uid,
            studentName: currentUser.displayName,
            score: finalScore,
            answers,
            completedAt: serverTimestamp(),
            totalQuestions: quiz.questions.length,
            correctAnswers: correctCount
        });
        toast.success(`Quiz completed! Score: ${finalScore}%`);
    } catch (error) {
        console.error("Error saving attempt:", error);
        toast.error("Failed to save result");
    }
  };

  if (loading || !quiz) {
    return (
        <AuthenticatedLayout>
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        </AuthenticatedLayout>
    );
  }

  if (quizStatus === 'completed') {
      return (
          <AuthenticatedLayout>
              <div className="max-w-2xl mx-auto p-6 space-y-6">
                  <Card className="text-center p-8">
                      <div className="mb-4 flex justify-center">
                          {score >= 50 ? (
                              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                                  <Trophy className="w-10 h-10 text-green-600" />
                              </div>
                          ) : (
                              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                                  <BarChart3 className="w-10 h-10 text-orange-600" />
                              </div>
                          )}
                      </div>
                      <h2 className="text-3xl font-bold mb-2">Quiz Completed!</h2>
                      <p className="text-gray-600 mb-6">You scored</p>
                      <div className="text-6xl font-bold mb-6 text-blue-600">{score}%</div>
                      <p className="text-gray-600 mb-8">
                          {score >= 80 ? 'Excellent work!' : score >= 50 ? 'Good job!' : 'Keep practicing!'}
                      </p>
                      <div className="flex gap-4 justify-center">
                          <Button onClick={() => navigate('/student/quizzes')} variant="outline">
                              Back to Quizzes
                          </Button>
                          <Button onClick={() => window.location.reload()}>
                              Retake Quiz
                          </Button>
                      </div>
                  </Card>
              </div>
          </AuthenticatedLayout>
      );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / quiz.questions.length) * 100;

  return (
    <AuthenticatedLayout>
        <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold">{quiz.title}</h1>
                    <p className="text-sm text-gray-500">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-mono font-bold">
                    <Timer className="w-4 h-4" />
                    {timeLeft}s
                </div>
            </div>

            <Progress value={progress} className="h-2" />

            <Card>
                <CardContent className="p-6 space-y-6">
                    <h2 className="text-xl font-semibold">{currentQuestion.text}</h2>

                    <div className="grid gap-3">
                        {currentQuestion.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswer(index)}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                    answers[currentQuestionIndex] === index
                                    ? 'border-blue-600 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                        answers[currentQuestionIndex] === index
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {String.fromCharCode(65 + index)}
                                    </div>
                                    <span className="text-lg">{option}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    onClick={() => handleNextQuestion()}
                    disabled={answers[currentQuestionIndex] === undefined}
                    size="lg"
                    className="gap-2"
                >
                    {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    </AuthenticatedLayout>
  );
}
