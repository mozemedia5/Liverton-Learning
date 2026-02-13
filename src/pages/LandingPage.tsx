import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, GraduationCap, School, Users } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Navigation */}
      <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white dark:text-black" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Liverton Learning</span>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/about')}
            className="hidden sm:inline-flex"
          >
            About
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/login')}
          >
            Login
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 md:py-32">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Logo Large */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-black dark:bg-white rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-12 h-12 text-white dark:text-black" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Liverton Learning
          </h1>

          {/* Short Description */}
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
            A comprehensive educational platform connecting students, teachers, and schools for seamless learning and management.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/get-started')}
              className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-8"
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/login')}
              className="px-8"
            >
              Login
            </Button>
          </div>
        </div>

        {/* Role Cards Preview */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto w-full">
          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl text-center hover:border-black dark:hover:border-white transition-colors">
            <Users className="w-8 h-8 mx-auto mb-3 text-gray-600 dark:text-gray-400" />
            <h3 className="font-medium">Students</h3>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Learn & Grow</p>
          </div>
          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl text-center hover:border-black dark:hover:border-white transition-colors">
            <GraduationCap className="w-8 h-8 mx-auto mb-3 text-gray-600 dark:text-gray-400" />
            <h3 className="font-medium">Teachers</h3>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Teach & Earn</p>
          </div>
          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl text-center hover:border-black dark:hover:border-white transition-colors">
            <School className="w-8 h-8 mx-auto mb-3 text-gray-600 dark:text-gray-400" />
            <h3 className="font-medium">Schools</h3>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Manage & Monitor</p>
          </div>
          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl text-center hover:border-black dark:hover:border-white transition-colors">
            <BookOpen className="w-8 h-8 mx-auto mb-3 text-gray-600 dark:text-gray-400" />
            <h3 className="font-medium">Parents</h3>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Track Progress</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-8 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            © 2026 Liverton Learning. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-500">
            <button onClick={() => navigate('/about')} className="hover:text-black dark:hover:text-white transition-colors">
              About
            </button>
            <button onClick={() => navigate('/about/schools')} className="hover:text-black dark:hover:text-white transition-colors">
              For Schools
            </button>
            <button onClick={() => navigate('/about/teachers')} className="hover:text-black dark:hover:text-white transition-colors">
              For Teachers
            </button>
            <button onClick={() => navigate('/about/students')} className="hover:text-black dark:hover:text-white transition-colors">
              For Students
            <button onClick={() => navigate("/support")} className="hover:text-black dark:hover:text-white transition-colors">
              Support
            </button>
            <button onClick={() => navigate("/privacy-policy")} className="hover:text-black dark:hover:text-white transition-colors">
              Privacy Policy
            </button>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
