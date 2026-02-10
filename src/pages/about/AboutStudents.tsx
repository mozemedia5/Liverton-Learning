import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, CheckCircle, Play, FileText, Trophy, MessageSquare } from 'lucide-react';

export default function AboutStudents() {
  const navigate = useNavigate();

  const benefits = [
    'Access to quality courses from expert teachers',
    'Interactive video lessons and study materials',
    'Topic-based quizzes and chapter completion tests',
    'Real-time progress tracking and analytics',
    'School, country, and global rankings',
    'Internal chat with teachers and classmates',
    'Payment history and course management',
    'Personalized learning recommendations',
  ];

  const features = [
    {
      icon: <Play className="w-6 h-6" />,
      title: 'Video Lessons',
      description: 'Watch high-quality video lessons at your own pace',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Study Materials',
      description: 'Access notes, PDFs, and reference materials',
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: 'Quizzes & Exams',
      description: 'Test your knowledge with interactive assessments',
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: 'Rankings',
      description: 'Compete with peers and track your progress',
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'Communication',
      description: 'Chat with teachers and fellow students',
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: 'Course Library',
      description: 'Enroll in multiple courses across subjects',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center border-b border-gray-200 dark:border-gray-800">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/about')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex-1 flex justify-center">
          <span className="text-lg font-semibold">For Students</span>
        </div>
        <div className="w-20"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Learn Without Limits</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Access quality education from anywhere. Enroll in courses, take quizzes, 
              track your progress, and connect with teachers and peers.
            </p>
          </div>

          {/* Benefits */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">What You'll Get</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl text-center hover:border-black dark:hover:border-white transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
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

          {/* How It Works */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">1</div>
                <h3 className="font-semibold mb-1">Register</h3>
                <p className="text-sm text-gray-500">Create your student account</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">2</div>
                <h3 className="font-semibold mb-1">Enroll</h3>
                <p className="text-sm text-gray-500">Choose courses you want to study</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">3</div>
                <h3 className="font-semibold mb-1">Learn</h3>
                <p className="text-sm text-gray-500">Watch videos and read materials</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">4</div>
                <h3 className="font-semibold mb-1">Progress</h3>
                <p className="text-sm text-gray-500">Take quizzes and track growth</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-8">
            <Button 
              size="lg"
              onClick={() => navigate('/register/student')}
              className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              Register as Student
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
