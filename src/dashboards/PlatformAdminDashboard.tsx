import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Bell, 
  CreditCard, 
  User, 
  Settings, 
  LogOut,
  Users,
  GraduationCap,
  School,
  DollarSign,
  CheckCircle,
  XCircle,
  Menu,
  X,
  Brain
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

export default function PlatformAdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
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
    { icon: <BookOpen className="w-5 h-5" />, label: 'Dashboard', path: '/admin/dashboard', active: true },
    { icon: <Users className="w-5 h-5" />, label: 'Users', path: '/admin/users' },
    { icon: <GraduationCap className="w-5 h-5" />, label: 'Teachers', path: '/admin/teachers' },
    { icon: <School className="w-5 h-5" />, label: 'Schools', path: '/admin/schools' },
    { icon: <BookOpen className="w-5 h-5" />, label: 'Courses', path: '/admin/courses' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Payments', path: '/admin/payments' },
    { icon: <Bell className="w-5 h-5" />, label: 'Announcements', path: '/announcements' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings' },
  ];

  // Mock data
  const platformStats = {
    totalUsers: 5234,
    totalStudents: 4521,
    totalTeachers: 342,
    totalSchools: 89,
    totalParents: 382,
    totalRevenue: 125000,
    pendingVerifications: 23,
  };

  const pendingTeachers = [
    { id: 1, name: 'John Smith', email: 'john@example.com', subjects: 'Mathematics, Physics', applied: '2026-02-08' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah@example.com', subjects: 'English', applied: '2026-02-07' },
    { id: 3, name: 'Mike Davis', email: 'mike@example.com', subjects: 'Chemistry', applied: '2026-02-06' },
  ];

  const pendingSchools = [
    { id: 1, name: 'Sunshine Academy', country: 'Uganda', type: 'Secondary School', applied: '2026-02-08' },
    { id: 2, name: 'Bright Future School', country: 'Kenya', type: 'Primary School', applied: '2026-02-07' },
  ];

  const recentPayments = [
    { id: 1, user: 'Alice Johnson', type: 'Course Purchase', amount: 50, status: 'completed', date: '2026-02-09' },
    { id: 2, user: 'Bob Smith', type: 'School Subscription', amount: 500, status: 'completed', date: '2026-02-08' },
    { id: 3, user: 'Carol White', type: 'Course Purchase', amount: 75, status: 'pending', date: '2026-02-08' },
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
            <Badge variant="destructive" className="hidden sm:inline-flex">
              Admin
            </Badge>
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
            <h1 className="text-2xl font-bold">Platform Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage the entire Liverton Learning platform
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                    <p className="text-xl font-bold">{platformStats.totalUsers.toLocaleString()}</p>
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
                    <p className="text-xl font-bold">{platformStats.totalTeachers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <School className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Schools</p>
                    <p className="text-xl font-bold">{platformStats.totalSchools}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                    <p className="text-xl font-bold">${platformStats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gray-100 dark:bg-gray-900">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Students</p>
                <p className="text-2xl font-bold">{platformStats.totalStudents.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-100 dark:bg-gray-900">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Parents</p>
                <p className="text-2xl font-bold">{platformStats.totalParents.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-100 dark:bg-gray-900">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Verifications</p>
                <p className="text-2xl font-bold text-yellow-600">{platformStats.pendingVerifications}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-100 dark:bg-gray-900">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Courses</p>
                <p className="text-2xl font-bold">1,247</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Teacher Verifications */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pending Teacher Verifications</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/teachers')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingTeachers.map((teacher) => (
                  <div 
                    key={teacher.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{teacher.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {teacher.subjects} • Applied {teacher.applied}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-600">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600">
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pending School Approvals */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pending School Approvals</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/schools')}>
                  View All
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingSchools.map((school) => (
                  <div 
                    key={school.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{school.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {school.type} • {school.country} • Applied {school.applied}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-600">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600">
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Payments</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/payments')}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">{payment.user}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {payment.type} • {payment.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${payment.amount}</p>
                      <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
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
                Your AI platform management assistant is coming soon. Hanna will help you with:
              </p>
              <ul className="text-left text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-6 max-w-xs mx-auto">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Platform analytics & insights
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Automated user support
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Content moderation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Fraud detection
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
