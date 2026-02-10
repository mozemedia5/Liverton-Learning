import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  MessageSquare, 
  Bell, 
  CreditCard, 
  User, 
  Settings, 
  LogOut,
  TrendingUp,
  Award,
  Play,
  FileText,
  CheckCircle,
  Menu,
  X,
  Brain
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { logout, userData } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showHanna, setShowHanna] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const navItems = [
    { icon: <BookOpen className="w-5 h-5" />, label: 'Home', path: '/student/dashboard', active: true },
    { icon: <BookOpen className="w-5 h-5" />, label: 'Courses', path: '/student/courses' },
    { icon: <CheckCircle className="w-5 h-5" />, label: 'Quizzes', path: '/student/quizzes' },
    { icon: <Bell className="w-5 h-5" />, label: 'Announcements', path: '/announcements' },
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Chat', path: '/chat' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Payments', path: '/payments' },
    { icon: <User className="w-5 h-5" />, label: 'Profile', path: '/profile' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings' },
  ];

  // Mock data - would come from Firebase in real implementation
  const enrolledCourses = [
    { id: 1, title: 'Mathematics', progress: 75, totalLessons: 20, completedLessons: 15, teacher: 'Mr. Johnson' },
    { id: 2, title: 'Physics', progress: 45, totalLessons: 24, completedLessons: 11, teacher: 'Ms. Smith' },
    { id: 3, title: 'English', progress: 90, totalLessons: 15, completedLessons: 14, teacher: 'Mrs. Davis' },
  ];

  const recentQuizzes = [
    { id: 1, title: 'Algebra Basics', score: 85, total: 100, date: '2026-02-08' },
    { id: 2, title: 'Newton\'s Laws', score: 92, total: 100, date: '2026-02-06' },
    { id: 3, title: 'Grammar Test', score: 78, total: 100, date: '2026-02-04' },
  ];

  const announcements = [
    { id: 1, title: 'Term Exam Schedule', sender: 'School Admin', date: '2026-02-09', priority: 'high' },
    { id: 2, title: 'New Course Available', sender: 'Mr. Johnson', date: '2026-02-07', priority: 'normal' },
  ];

  const rankings = {
    school: 5,
    country: 127,
    global: 1543,
  };

  const stats = {
    videosWatched: 47,
    booksRead: 12,
    quizzesTaken: 15,
    examsTaken: 3,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold hidden sm:inline">Liverton Learning</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? '🌙' : '☀️'}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/announcements')}
            >
              <Bell className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/profile')}
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-[57px] left-0 z-40 w-64 h-[calc(100vh-57px)] 
          bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-200 lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left
                  transition-colors
                  ${item.active 
                    ? 'bg-black text-white dark:bg-white dark:text-black' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-900'
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </nav>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 space-y-6">
          {/* Welcome */}
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {userData?.fullName || 'Student'}!</h1>
            <p className="text-gray-600 dark:text-gray-400">Here's your learning progress</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Play className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Videos</p>
                    <p className="text-xl font-bold">{stats.videosWatched}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Books</p>
                    <p className="text-xl font-bold">{stats.booksRead}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Quizzes</p>
                    <p className="text-xl font-bold">{stats.quizzesTaken}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Exams</p>
                    <p className="text-xl font-bold">{stats.examsTaken}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rankings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Your Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">School</p>
                  <p className="text-3xl font-bold text-purple-600">#{rankings.school}</p>
                </div>
                <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Country</p>
                  <p className="text-3xl font-bold text-blue-600">#{rankings.country}</p>
                </div>
                <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Global</p>
                  <p className="text-3xl font-bold text-green-600">#{rankings.global}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enrolled Courses */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Courses</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/student/courses')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {enrolledCourses.map((course) => (
                  <div key={course.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{course.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {course.teacher} • {course.completedLessons}/{course.totalLessons} lessons
                        </p>
                      </div>
                      <Badge variant="secondary">{course.progress}%</Badge>
                    </div>
                    <Progress value={course.progress} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Quizzes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Quizzes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/student/quizzes')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentQuizzes.map((quiz) => (
                  <div 
                    key={quiz.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{quiz.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{quiz.date}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${quiz.score >= 80 ? 'text-green-600' : quiz.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {quiz.score}/{quiz.total}
                      </p>
                      <p className="text-xs text-gray-500">
                        {Math.round((quiz.score / quiz.total) * 100)}%
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Announcements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Announcements</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/announcements')}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.map((announcement) => (
                <div 
                  key={announcement.id} 
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <Bell className={`w-5 h-5 mt-0.5 ${announcement.priority === 'high' ? 'text-red-500' : 'text-blue-500'}`} />
                  <div className="flex-1">
                    <p className="font-medium">{announcement.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      From {announcement.sender} • {announcement.date}
                    </p>
                  </div>
                  {announcement.priority === 'high' && (
                    <Badge variant="destructive">Important</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Hanna AI Floating Button */}
      <button
        onClick={() => setShowHanna(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-green-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform z-50"
      >
        <Brain className="w-6 h-6" />
      </button>

      {/* Hanna AI Modal */}
      {showHanna && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-green-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Hanna AI</h3>
                  <p className="text-xs text-white/80">Coming Soon</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHanna(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-green-100 dark:from-purple-900 dark:to-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-10 h-10 text-purple-600" />
              </div>
              <h4 className="text-xl font-semibold mb-2">Hanna AI Assistant</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your personal AI learning assistant is coming soon. Hanna will help you with:
              </p>
              <ul className="text-left text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-6 max-w-xs mx-auto">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Answering study questions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Explaining difficult concepts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Personalized learning recommendations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  24/7 study support
                </li>
              </ul>
              <Button 
                onClick={() => setShowHanna(false)}
                className="w-full bg-gradient-to-r from-purple-600 to-green-600 text-white"
              >
                Got it!
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
