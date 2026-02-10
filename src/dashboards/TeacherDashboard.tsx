import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DollarSign,
  Users,
  Upload,
  Plus,
  Menu,
  X,
  Brain,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

export default function TeacherDashboard() {
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
    { icon: <BookOpen className="w-5 h-5" />, label: 'Home', path: '/teacher/dashboard', active: true },
    { icon: <BookOpen className="w-5 h-5" />, label: 'My Courses', path: '/teacher/courses' },
    { icon: <Users className="w-5 h-5" />, label: 'Students', path: '/teacher/students' },
    { icon: <Bell className="w-5 h-5" />, label: 'Announcements', path: '/announcements' },
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Chat', path: '/chat' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Earnings', path: '/payments' },
    { icon: <User className="w-5 h-5" />, label: 'Profile', path: '/profile' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings' },
  ];

  // Mock data
  const myCourses = [
    { id: 1, title: 'Advanced Mathematics', students: 45, revenue: 2250, status: 'active' },
    { id: 2, title: 'Physics Fundamentals', students: 32, revenue: 1600, status: 'active' },
    { id: 3, title: 'Algebra Basics', students: 28, revenue: 840, status: 'draft' },
  ];

  const earnings = {
    total: 4690,
    pending: 850,
    thisMonth: 1200,
  };

  const recentStudents = [
    { id: 1, name: 'John Doe', course: 'Advanced Mathematics', enrolled: '2026-02-05' },
    { id: 2, name: 'Jane Smith', course: 'Physics Fundamentals', enrolled: '2026-02-04' },
    { id: 3, name: 'Mike Johnson', course: 'Advanced Mathematics', enrolled: '2026-02-03' },
  ];

  const announcements = [
    { id: 1, title: 'New Course Guidelines', sender: 'Platform Admin', date: '2026-02-09' },
    { id: 2, title: 'Payment Processing Update', sender: 'Platform Admin', date: '2026-02-07' },
  ];

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
            <Button variant="ghost" size="icon" onClick={() => navigate('/announcements')}>
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {userData?.fullName || 'Teacher'}!</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your courses and students</p>
            </div>
            <Button 
              onClick={() => navigate('/teacher/courses')}
              className="bg-black dark:bg-white text-white dark:text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Course
            </Button>
          </div>

          {/* Earnings Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</p>
                    <p className="text-xl font-bold">${earnings.total.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                    <p className="text-xl font-bold">${earnings.thisMonth.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                    <p className="text-xl font-bold">${earnings.pending.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Courses */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Courses</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/courses')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {myCourses.map((course) => (
                  <div 
                    key={course.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{course.title}</p>
                        <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                          {course.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {course.students} students • ${course.revenue} earned
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Students */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Enrollments</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/students')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentStudents.map((student) => (
                  <div 
                    key={student.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {student.course}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{student.enrolled}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4">
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">Upload Lesson</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4">
                  <Plus className="w-6 h-6" />
                  <span className="text-sm">Add Quiz</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4">
                  <MessageSquare className="w-6 h-6" />
                  <span className="text-sm">Message Students</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4">
                  <Bell className="w-6 h-6" />
                  <span className="text-sm">Announcement</span>
                </Button>
              </div>
            </CardContent>
          </Card>

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
                  <Bell className="w-5 h-5 mt-0.5 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium">{announcement.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      From {announcement.sender} • {announcement.date}
                    </p>
                  </div>
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
                Your personal AI teaching assistant is coming soon. Hanna will help you with:
              </p>
              <ul className="text-left text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-6 max-w-xs mx-auto">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Creating lesson plans
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Generating quiz questions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Student progress insights
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Answering student queries
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
