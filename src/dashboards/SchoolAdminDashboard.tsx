import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  MessageSquare, 
  Bell, 
  CreditCard, 
  User, 
  Settings, 
  LogOut,
  Users,
  GraduationCap,
  Calendar,
  Menu,
  X,
  Brain,
  Plus,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

export default function SchoolAdminDashboard() {
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
    { icon: <BookOpen className="w-5 h-5" />, label: 'Home', path: '/school-admin/dashboard', active: true },
    { icon: <Users className="w-5 h-5" />, label: 'Students', path: '/school-admin/students' },
    { icon: <GraduationCap className="w-5 h-5" />, label: 'Teachers', path: '/school-admin/teachers' },
    { icon: <Calendar className="w-5 h-5" />, label: 'Attendance', path: '/school-admin/attendance' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Fees', path: '/school-admin/fees' },
    { icon: <Bell className="w-5 h-5" />, label: 'Announcements', path: '/announcements' },
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Chat', path: '/chat' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings' },
  ];

  // Mock data
  const schoolStats = {
    totalStudents: 342,
    totalTeachers: 28,
    attendanceToday: 94,
    feesCollected: 45000,
    feesPending: 12000,
  };

  const recentStudents = [
    { id: 1, name: 'Alice Johnson', grade: 'Grade 10', joined: '2026-02-08' },
    { id: 2, name: 'Bob Smith', grade: 'Grade 9', joined: '2026-02-07' },
    { id: 3, name: 'Carol White', grade: 'Grade 11', joined: '2026-02-06' },
  ];

  const recentTeachers = [
    { id: 1, name: 'Mr. David Brown', subject: 'Mathematics', status: 'active' },
    { id: 2, name: 'Ms. Emma Davis', subject: 'English', status: 'active' },
    { id: 3, name: 'Mr. Frank Miller', subject: 'Physics', status: 'pending' },
  ];

  const announcements = [
    { id: 1, title: 'Term 2 Exam Schedule', target: 'All Students', date: '2026-02-09' },
    { id: 2, title: 'Teacher Meeting', target: 'All Teachers', date: '2026-02-08' },
  ];

  const feeSummary = [
    { grade: 'Grade 9', collected: 15000, pending: 4000 },
    { grade: 'Grade 10', collected: 18000, pending: 5000 },
    { grade: 'Grade 11', collected: 12000, pending: 3000 },
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
          <div>
            <h1 className="text-2xl font-bold">School Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {userData?.schoolName || 'Your School'} - Manage your institution
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Students</p>
                    <p className="text-xl font-bold">{schoolStats.totalStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Teachers</p>
                    <p className="text-xl font-bold">{schoolStats.totalTeachers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Attendance</p>
                    <p className="text-xl font-bold">{schoolStats.attendanceToday}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Fees Collected</p>
                    <p className="text-xl font-bold">${schoolStats.feesCollected.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Students */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Students</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/school-admin/students')}>
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
                          {student.grade}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{student.joined}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Teachers */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Teachers</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/school-admin/teachers')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentTeachers.map((teacher) => (
                  <div 
                    key={teacher.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">{teacher.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {teacher.subject}
                        </p>
                      </div>
                    </div>
                    <Badge variant={teacher.status === 'active' ? 'default' : 'secondary'}>
                      {teacher.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Fee Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fee Collection Summary</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/school-admin/fees')}>
                View Details
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feeSummary.map((grade) => (
                  <div key={grade.grade} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{grade.grade}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        ${grade.collected.toLocaleString()} collected
                      </span>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={(grade.collected / (grade.collected + grade.pending)) * 100} 
                        className="h-2"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      ${grade.pending.toLocaleString()} pending
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4">
                  <Plus className="w-6 h-6" />
                  <span className="text-sm">Add Student</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4">
                  <Plus className="w-6 h-6" />
                  <span className="text-sm">Add Teacher</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center gap-2 h-auto py-4">
                  <Calendar className="w-6 h-6" />
                  <span className="text-sm">Mark Attendance</span>
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
              <CardTitle>Recent Announcements</CardTitle>
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
                      Target: {announcement.target} • {announcement.date}
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
                Your AI school management assistant is coming soon. Hanna will help you with:
              </p>
              <ul className="text-left text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-6 max-w-xs mx-auto">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Student performance insights
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Attendance pattern analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Fee collection forecasts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Automated reporting
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
