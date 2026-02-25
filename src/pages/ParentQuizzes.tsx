import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { getLinkedStudents, type LinkedStudent } from '@/lib/parentService';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Trophy, Calendar, CheckCircle } from 'lucide-react';

interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle?: string;
  score: number;
  completedAt: { seconds: number; nanoseconds: number } | null;
  totalQuestions: number;
  correctAnswers: number;
}

export default function ParentQuizzes() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const fetchStudents = async () => {
      try {
        const linked = await getLinkedStudents(currentUser.uid);
        setStudents(linked);
        if (linked.length > 0) {
          setSelectedStudentId(linked[0].studentId);
        } else {
            setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        setLoading(false);
      }
    };

    fetchStudents();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedStudentId) return;

    const fetchAttempts = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'quiz_attempts'), where('studentId', '==', selectedStudentId));
        const snapshot = await getDocs(q);

        const attemptsData = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
            const data = docSnapshot.data();
            let quizTitle = 'Unknown Quiz';

            // Fetch quiz title
            try {
                const quizDoc = await getDoc(doc(db, 'quizzes', data.quizId));
                if (quizDoc.exists()) {
                    quizTitle = quizDoc.data().title;
                }
            } catch (e) {
                console.error("Error fetching quiz details", e);
            }

            return {
                id: docSnapshot.id,
                ...data,
                quizTitle
            } as QuizAttempt;
        }));

        // Sort by date descending
        attemptsData.sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0));

        setAttempts(attemptsData);
      } catch (error) {
        console.error("Error fetching attempts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
  }, [selectedStudentId]);

  if (loading && students.length === 0) {
      return (
        <AuthenticatedLayout>
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        </AuthenticatedLayout>
      );
  }

  return (
    <AuthenticatedLayout>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Student Quizzes</h1>
          </div>

          {students.length > 1 && (
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.studentId} value={student.studentId}>
                    {student.studentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {students.length === 0 ? (
            <Card>
                <CardContent className="p-8 text-center text-gray-500">
                    No students linked to your account.
                </CardContent>
            </Card>
        ) : (
            <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Quizzes Taken</p>
                                <p className="text-2xl font-bold">{attempts.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-lg text-green-600">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Average Score</p>
                                <p className="text-2xl font-bold">
                                    {attempts.length > 0
                                        ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
                                        : 0}%
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Recent Activity</h2>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : attempts.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center text-gray-500">
                                No quiz attempts found for this student.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {attempts.map((attempt) => (
                                <Card key={attempt.id}>
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-lg">{attempt.quizTitle}</h3>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {attempt.completedAt ? new Date(attempt.completedAt.seconds * 1000).toLocaleDateString() : 'Unknown date'}
                                                </span>
                                                <span>
                                                    {attempt.correctAnswers}/{attempt.totalQuestions} Correct
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`text-xl font-bold ${
                                            attempt.score >= 80 ? 'text-green-600' :
                                            attempt.score >= 50 ? 'text-blue-600' :
                                            'text-orange-600'
                                        }`}>
                                            {attempt.score}%
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
