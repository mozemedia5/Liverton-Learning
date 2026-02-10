import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, GraduationCap, School, Users, MessageCircle, CreditCard, Brain } from 'lucide-react';

export default function About() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: 'eLearning Platform',
      description: 'Access quality courses, video lessons, and interactive quizzes from expert teachers.',
    },
    {
      icon: <School className="w-6 h-6" />,
      title: 'School Management',
      description: 'Comprehensive tools for schools to manage students, teachers, attendance, and fees.',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Course Marketplace',
      description: 'Teachers can create and sell courses, earning from their expertise.',
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: 'Internal Communication',
      description: 'Built-in chat system for seamless communication between all users.',
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: 'Secure Payments',
      description: 'Integrated payment system for course purchases and subscriptions.',
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'AI Assistant (Coming Soon)',
      description: 'Hanna AI will provide personalized learning assistance and support.',
    },
  ];

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
          <span className="text-lg font-semibold">About Liverton Learning</span>
        </div>
        <div className="w-20"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-black dark:bg-white rounded-xl flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white dark:text-black" />
              </div>
            </div>
            <h1 className="text-4xl font-bold">About Liverton Learning</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              A comprehensive educational platform that connects students, teachers, and schools 
              in a seamless learning ecosystem designed for the modern age.
            </p>
          </div>

          {/* Mission */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-8">
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              At Liverton Learning, we believe education should be accessible, engaging, and effective. 
              Our mission is to bridge the gap between traditional schooling and modern technology, 
              creating a platform where knowledge flows freely between students, teachers, and institutions.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center">What We Offer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-black dark:hover:border-white transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* For Different Users */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center">Who Is It For?</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button 
                onClick={() => navigate('/about/students')}
                className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl text-center hover:border-black dark:hover:border-white transition-colors"
              >
                <GraduationCap className="w-8 h-8 mx-auto mb-3" />
                <h3 className="font-semibold">Students</h3>
                <p className="text-sm text-gray-500 mt-1">Learn & Grow</p>
              </button>
              <button 
                onClick={() => navigate('/about/teachers')}
                className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl text-center hover:border-black dark:hover:border-white transition-colors"
              >
                <Users className="w-8 h-8 mx-auto mb-3" />
                <h3 className="font-semibold">Teachers</h3>
                <p className="text-sm text-gray-500 mt-1">Teach & Earn</p>
              </button>
              <button 
                onClick={() => navigate('/about/schools')}
                className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl text-center hover:border-black dark:hover:border-white transition-colors"
              >
                <School className="w-8 h-8 mx-auto mb-3" />
                <h3 className="font-semibold">Schools</h3>
                <p className="text-sm text-gray-500 mt-1">Manage & Monitor</p>
              </button>
              <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl text-center">
                <BookOpen className="w-8 h-8 mx-auto mb-3" />
                <h3 className="font-semibold">Parents</h3>
                <p className="text-sm text-gray-500 mt-1">Track Progress</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-8">
            <Button 
              size="lg"
              onClick={() => navigate('/get-started')}
              className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              Get Started Today
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-8 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500 dark:text-gray-500">
          © 2026 Liverton Learning. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
