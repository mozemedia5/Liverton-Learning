import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, GraduationCap, School, Users } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Navigation */}
      <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {/* Main Navigation Logo Container with custom style to hover cleanly and prevent cropping */}
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer">
            <img
              src="/logo.png"
              alt="Liverton Learning"
              className="w-[90%] h-[90%] object-contain transition-transform duration-300 hover:rotate-3"
            />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Liverton Learning
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/about')}
            className="hidden sm:inline-flex font-medium hover:bg-gray-100 dark:hover:bg-gray-900 rounded-xl"
          >
            About
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/login')}
            className="rounded-xl font-medium px-5 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-950"
          >
            Login
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-28">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Logo Large (Hero) - Styled with a beautiful pulsing shadow glow, hovers beautifully */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-3xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 border border-gray-100/50 dark:border-gray-800/50 transition-all duration-500 hover:scale-110 hover:rotate-3 hover:shadow-2xl hover:shadow-blue-500/20 shadow-xl relative group">
              <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
              <img
                src="/logo.png"
                alt="Liverton Learning Big Logo"
                className="w-[85%] h-[85%] object-contain transition-transform duration-500 relative z-10"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-b from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Liverton Learning
          </h1>

          {/* Short Description */}
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-lg mx-auto leading-relaxed font-normal">
            A comprehensive educational platform connecting students, teachers, and schools for seamless learning and management.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={() => navigate('/get-started')}
              className="bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 px-8 rounded-xl font-semibold shadow-lg shadow-blue-500/10 transition-all duration-300 hover:scale-105"
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="px-8 rounded-xl font-semibold border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-950 transition-all duration-300 hover:scale-105"
            >
              Login
            </Button>
          </div>
        </div>

        {/* Role Cards Preview */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto w-full">
          <div className="p-6 border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/20 rounded-2xl text-center hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group">
            <Users className="w-8 h-8 mx-auto mb-3 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Students</h3>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Learn & Grow</p>
          </div>
          <div className="p-6 border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/20 rounded-2xl text-center hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group">
            <GraduationCap className="w-8 h-8 mx-auto mb-3 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Teachers</h3>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Teach & Earn</p>
          </div>
          <div className="p-6 border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/20 rounded-2xl text-center hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group">
            <School className="w-8 h-8 mx-auto mb-3 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Schools</h3>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Manage & Monitor</p>
          </div>
          <div className="p-6 border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/20 rounded-2xl text-center hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group">
            <BookOpen className="w-8 h-8 mx-auto mb-3 text-gray-500 dark:text-gray-400 transition-colors group-hover:text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Parents</h3>
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
          <div className="flex flex-wrap gap-6 text-sm text-gray-500 dark:text-gray-500 justify-center">
            <button onClick={() => navigate('/about')} className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              About
            </button>
            <button onClick={() => navigate('/about/schools')} className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              For Schools
            </button>
            <button onClick={() => navigate('/about/teachers')} className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              For Teachers
            </button>
            <button onClick={() => navigate('/about/students')} className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              For Students
            </button>
            <button onClick={() => navigate("/support")} className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              Support
            </button>
            <button onClick={() => navigate("/privacy-policy")} className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
