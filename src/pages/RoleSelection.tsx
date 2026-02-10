import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, Users, School, UserCircle, ArrowLeft } from 'lucide-react';

interface RoleOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

const roles: RoleOption[] = [
  {
    id: 'student',
    title: 'Student',
    description: 'Enroll in courses, take quizzes, and track your progress',
    icon: <GraduationCap className="w-8 h-8" />,
    path: '/register/student',
  },
  {
    id: 'teacher',
    title: 'Teacher',
    description: 'Create courses, upload lessons, and earn from your expertise',
    icon: <Users className="w-8 h-8" />,
    path: '/register/teacher',
  },
  {
    id: 'school-admin',
    title: 'School Administrator',
    description: 'Manage your school, students, teachers, and operations',
    icon: <School className="w-8 h-8" />,
    path: '/register/school-admin',
  },
  {
    id: 'parent',
    title: 'Parent',
    description: 'Monitor your child\'s performance and progress',
    icon: <UserCircle className="w-8 h-8" />,
    path: '/register/parent',
  },
];

export default function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center border-b border-gray-200 dark:border-gray-800">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex-1 flex justify-center">
          <span className="text-lg font-semibold">Liverton Learning</span>
        </div>
        <div className="w-20"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-3xl mx-auto w-full space-y-8">
          {/* Title */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold">Who are you?</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Select your role to create your account
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((role) => (
              <Card
                key={role.id}
                className="cursor-pointer border border-gray-200 dark:border-gray-800 hover:border-black dark:hover:border-white transition-all duration-200 hover:shadow-lg bg-white dark:bg-black"
                onClick={() => navigate(role.path)}
              >
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center flex-shrink-0">
                    {role.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{role.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {role.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Login Link */}
          <div className="text-center pt-4">
            <p className="text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Button 
                variant="link" 
                onClick={() => navigate('/login')}
                className="p-0 h-auto font-semibold"
              >
                Login here
              </Button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-6 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500 dark:text-gray-500">
          © 2026 Liverton Learning. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
