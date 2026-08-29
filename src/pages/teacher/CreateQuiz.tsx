import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
}

export default function CreateQuiz() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [timeLimit, setTimeLimit] = useState(60); // seconds per question
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', text: '', options: ['', '', '', ''], correctOptionIndex: 0 }
  ]);
  const [loading, setLoading] = useState(false);

  const subjects = ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Physics', 'Chemistry', 'Biology', 'Computer Science'];

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now().toString(),
        text: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    setQuestions(newQuestions);
  };

  const updateQuestion = (index: number, field: keyof Question, value: string | number) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (questions.length < 10) {
      toast.error('You must add at least 10 questions.');
      return;
    }

    // Validate all questions have text and options
    for (const q of questions) {
        if (!q.text.trim()) {
            toast.error('All questions must have text.');
            return;
        }
        if (q.options.some(opt => !opt.trim())) {
            toast.error('All options must be filled.');
            return;
        }
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'quizzes'), {
        title,
        description,
        subject,
        teacherId: currentUser.uid,
        teacherName: currentUser.displayName || 'Unknown Teacher',
        questions,
        timeLimitPerQuestion: timeLimit,
        createdAt: serverTimestamp(),
        status: 'published',
        questionCount: questions.length
      });

      toast.success('Quiz created successfully!');
      navigate('/teacher/dashboard');
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error('Failed to create quiz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Create New Quiz</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Algebra Basics"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the quiz..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={subject} onValueChange={setSubject} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="timeLimit">Time per Question (seconds)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="10"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
              <Button type="button" onClick={addQuestion} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>

            {questions.map((question, qIndex) => (
              <Card key={question.id}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 grid gap-2">
                      <Label>Question {qIndex + 1}</Label>
                      <Input
                        value={question.text}
                        onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                        placeholder="Enter question text"
                        required
                      />
                    </div>
                    {questions.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeQuestion(qIndex)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          question.correctOptionIndex === oIndex
                            ? 'bg-green-100 text-green-800 border-2 border-green-500'
                            : 'bg-gray-100 text-gray-500 border border-gray-200 cursor-pointer'
                        }`}
                        onClick={() => updateQuestion(qIndex, 'correctOptionIndex', oIndex)}
                        title="Click to set as correct answer"
                        >
                          {String.fromCharCode(65 + oIndex)}
                        </div>
                        <Input
                          value={option}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                          required
                          className={question.correctOptionIndex === oIndex ? 'border-green-500 ring-1 ring-green-500' : ''}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Click the letter circle to mark the correct answer.</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-4 pb-8">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <span className="animate-spin mr-2">⏳</span> : <Save className="w-4 h-4 mr-2" />}
              Create Quiz
            </Button>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  );
}
