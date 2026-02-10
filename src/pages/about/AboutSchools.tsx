import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, School, CheckCircle, Users, Calendar, CreditCard, BarChart3, Bell } from 'lucide-react';

export default function AboutSchools() {
  const navigate = useNavigate();

  const benefits = [
    'Complete student management system',
    'Teacher management and assignment',
    'Attendance tracking and reporting',
    'School fees payment monitoring',
    'Term schedules and academic calendar',
    'Academic performance overview',
    'Inter-school competitions management',
    'Direct communication with parents',
  ];

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Student Management',
      description: 'Enroll, track, and manage all your students',
    },
    {
      icon: <School className="w-6 h-6" />,
      title: 'Teacher Management',
      description: 'Manage teachers and their assignments',
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Attendance Tracking',
      description: 'Monitor daily attendance with ease',
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: 'Fee Management',
      description: 'Track and manage school fee payments',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Performance Analytics',
      description: 'View academic performance insights',
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: 'Announcements',
      description: 'Send announcements to students and parents',
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
          <span className="text-lg font-semibold">For Schools</span>
        </div>
        <div className="w-20"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Manage Your School Better</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              A comprehensive school management system that helps you organize students, 
              teachers, attendance, fees, and communication all in one place.
            </p>
          </div>

          {/* Benefits */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">School Management Features</h2>
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
            <h2 className="text-2xl font-semibold text-center">Key Features</h2>
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

          {/* Requirements */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">Registration Requirements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Required Information</h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">*</span> School name
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">*</span> Registration number
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">*</span> School type
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">*</span> Contact information
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Required Documents</h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">*</span> License / Ministry approval
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">*</span> Registration certificate
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-gray-400">*</span> Other supporting documents
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">1</div>
                <h3 className="font-semibold mb-1">Register</h3>
                <p className="text-sm text-gray-500">Create your school account</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">2</div>
                <h3 className="font-semibold mb-1">Verify</h3>
                <p className="text-sm text-gray-500">Submit documents for approval</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">3</div>
                <h3 className="font-semibold mb-1">Setup</h3>
                <p className="text-sm text-gray-500">Add students and teachers</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">4</div>
                <h3 className="font-semibold mb-1">Manage</h3>
                <p className="text-sm text-gray-500">Run your school efficiently</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-8">
            <Button 
              size="lg"
              onClick={() => navigate('/register/school-admin')}
              className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              Register Your School
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
