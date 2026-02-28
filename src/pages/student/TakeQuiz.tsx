import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Timer, Trophy, BarChart3, ArrowRight, CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
}

interface QuestionExplanation {
  questionIndex: number;
  explanation: string;
  loading: boolean;
  error?: string;
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
  const [quizStatus, setQuizStatus] = useState<'loading' | 'active' | 'completed' | 'review'>('loading');
  const [score, setScore] = useState(0);
  const [explanations, setExplanations] = useState<QuestionExplanation[]>([]);
  const [showReview, setShowReview] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Initialize audio for timer alert
  useEffect(() => {
    // Create audio element for timer alert (using a beep sound)
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0NVKzn77BfGgU7k9r1xnMqBSh+zPLaizsIGGS57OihUhELTqXh8bllHAU2jdXzzn0vBSp8yfHajjwIF2W67+mjUhENTqXh8bllHAU2jdXzzn0vBSp8yfHajjwIF2W67+mjUhENTqXh8bllHAU2jdXzzn0vBSp8yfHajjwIF2W67+mjUhENTqXh8bllHAU2jdXzzn0vBSp8yfHajjwIF2W67+mjUhENTqXh8bllHAU2jdXzzn0vBSp8yfHajjwIF2W67+mjUhENTqXh8bllHAU2jdXzzn0vBSp8yfHajjwIF2W67+mjUhENTqXh8bllHAU2jdXzzn0vBSp8yfHajjwIF2W67+mjUhENTqXh8bllHAU2jdXzzn0vBSp8yfHajjwIF2W67+mjUhENTqXh8bllHAU2jdXzzn0vBSp8yfHajjwIF2W67+mjUhENTqXh8bllHAU2jdXzzn0vBSp8yfHajjwIF2W67+mjUhENTqXh8bllHAU2jdXzzn0vBSp8yfHajjwIF2W67+mjUhENTqXh8bllHAU2jdXzzn0vBQ==');
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Timer Logic with sound alert
  useEffect(() => {
    if (quizStatus !== 'active' || !quiz) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        // Play alert sound when time is low (10 seconds remaining)
        if (prev === 10 && audioRef.current) {
          audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
        
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

  // Fetch explanation from internet using Wikipedia API or general search
  const fetchExplanation = async (questionText: string, correctAnswer: string): Promise<string> => {
    try {
      // Try to extract the main topic from the question
      const topic = questionText.split(' ').slice(0, 5).join(' ');
      
      // Use Wikipedia API to get explanation
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(correctAnswer)}`;
      const response = await fetch(searchUrl);
      
      if (response.ok) {
        const data = await response.json();
        return data.extract || 'No detailed explanation available.';
      }
      
      // Fallback: Try searching with the question topic
      const fallbackUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
      const fallbackResponse = await fetch(fallbackUrl);
      
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        return data.extract || 'No detailed explanation available.';
      }
      
      return `The correct answer is: ${correctAnswer}. For more information, please search online for detailed explanations about this topic.`;
    } catch (error) {
      console.error('Error fetching explanation:', error);
      return `The correct answer is: ${correctAnswer}. Unable to fetch detailed explanation at this time.`;
    }
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
    setQuizStatus('review');

    // Initialize explanations with loading state
    const initialExplanations: QuestionExplanation[] = quiz.questions.map((_, index) => ({
      questionIndex: index,
      explanation: '',
      loading: true
    }));
    setExplanations(initialExplanations);

    // Fetch explanations for all questions
    quiz.questions.forEach(async (question, index) => {
      const correctAnswer = question.options[question.correctOptionIndex];
      const explanation = await fetchExplanation(question.text, correctAnswer);
      
      setExplanations(prev => {
        const updated = [...prev];
        updated[index] = {
          questionIndex: index,
          explanation,
          loading: false
        };
        return updated;
      });
    });

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

  if (quizStatus === 'review') {
      return (
          <AuthenticatedLayout>
              <div className="max-w-4xl mx-auto p-6 space-y-6">
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
                      <Button 
                        onClick={() => setShowReview(!showReview)} 
                        variant="outline"
                        className="mb-4"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        {showReview ? 'Hide' : 'Show'} Answer Review
                      </Button>
                  </Card>

                  {showReview && quiz && (
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold">Answer Review</h3>
                      {quiz.questions.map((question, index) => {
                        const userAnswer = answers[index];
                        const isCorrect = userAnswer === question.correctOptionIndex;
                        const explanation = explanations.find(e => e.questionIndex === index);
                        
                        return (
                          <Card key={index} className={`border-2 ${
                            isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                          }`}>
                            <CardContent className="p-6 space-y-4">
                              <div className="flex items-start gap-3">
                                {isCorrect ? (
                                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                                ) : (
                                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-semibold text-lg mb-2">
                                    Question {index + 1}: {question.text}
                                  </h4>
                                  
                                  <div className="space-y-2 mb-4">
                                    {question.options.map((option, optIndex) => {
                                      const isUserAnswer = userAnswer === optIndex;
                                      const isCorrectAnswer = question.correctOptionIndex === optIndex;
                                      
                                      return (
                                        <div
                                          key={optIndex}
                                          className={`p-3 rounded-lg border-2 ${
                                            isCorrectAnswer
                                              ? 'border-green-500 bg-green-100'
                                              : isUserAnswer
                                              ? 'border-red-500 bg-red-100'
                                              : 'border-gray-200 bg-white'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold">
                                              {String.fromCharCode(65 + optIndex)}.
                                            </span>
                                            <span>{option}</span>
                                            {isCorrectAnswer && (
                                              <span className="ml-auto text-green-600 font-semibold">
                                                ✓ Correct
                                              </span>
                                            )}
                                            {isUserAnswer && !isCorrectAnswer && (
                                              <span className="ml-auto text-red-600 font-semibold">
                                                ✗ Your answer
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <Alert className="bg-blue-50 border-blue-200">
                                    <BookOpen className="h-4 w-4" />
                                    <AlertDescription>
                                      <strong className="font-semibold">Explanation:</strong>
                                      {explanation?.loading ? (
                                        <div className="flex items-center gap-2 mt-2">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          <span>Loading explanation...</span>
                                        </div>
                                      ) : (
                                        <p className="mt-2">{explanation?.explanation}</p>
                                      )}
                                    </AlertDescription>
                                  </Alert>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-4 justify-center pb-8">
                      <Button onClick={() => navigate('/student/quizzes')} variant="outline">
                          Back to Quizzes
                      </Button>
                      <Button onClick={() => window.location.reload()}>
                          Retake Quiz
                      </Button>
                  </div>
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
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold transition-all ${
                  timeLeft <= 10 
                    ? 'bg-red-100 text-red-700 animate-pulse border-2 border-red-500' 
                    : 'bg-blue-50 text-blue-700'
                }`}>
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
