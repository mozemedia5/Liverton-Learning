/**
 * Parent Dashboard
 * Main dashboard for parents to view overview of children's education
 * Features:
 * - Quick stats (children, courses, performance)
 * - Recent activity
 * - Upcoming events
 * - Quick links to other sections
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, BookOpen, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { getLinkedStudents } from '@/lib/parentService';
import type { LinkedStudent } from '@/lib/parentService';

/**
 * Activity interface for type safety
 */
interface Activity {
  id: string;
  type: 'assignment' | 'grade' | 'announcement' | 'event';
  title: string;
  description: string;
  timestamp: string;
  studentName: string;
}

/**
 * Parent Dashboard Component
 * Main overview page for parents
 */
export default function ParentDashboard() {
  const { currentUser } = useAuth();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Mock activity data - replace with actual API call
   */
  const mockActivities: Activity[] = [
    {
      id: '1',
      type: 'grade',
      title: 'Math Quiz Score',
      description: 'Scored 92% on Chapter 5 Quiz',
      timestamp: '2024-02-13',
      studentName: 'John Doe',
    },
    {
      id: '2',
      type: 'assignment',
      title: 'English Essay Due',
      description: 'Essay on Shakespeare due tomorrow',
      timestamp: '2024-02-14',
      studentName: 'John Doe',
    },
    {
      id: '3',
      type: 'announcement',
      title: 'School Event',
      description: 'Science Fair on February 20th',
      timestamp: '2024-02-12',
      studentName: 'Jane Doe',
    },
  ];

  /**
   * Load linked students on component mount
   */
  useEffect(() => {
    loadStudents();
  }, [currentUser]);

  /**
   * Load linked students from Firebase
   */
  const loadStudents = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const students = await getLinkedStudents(currentUser.uid);
      setLinkedStudents(students);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get activity icon based on type
   */
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'grade':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'assignment':
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case 'event':
        return <Calendar className="h-4 w-4 text-purple-600" />;
      case 'announcement':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex-1 flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="p-4 md:p-8 lg:ml-0">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's an overview of your children's education</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Children Count */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Children</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{linkedStudents.length}</div>
              <p className="text-xs text-gray-600 mt-1">Linked to your account</p>
            </CardContent>
          </Card>

          {/* Active Courses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {linkedStudents.length > 0 ? linkedStudents.length * 3 : 0}
              </div>
              <p className="text-xs text-gray-600 mt-1">Across all children</p>
            </CardContent>
          </Card>

          {/* Average Performance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">85%</div>
              <p className="text-xs text-gray-600 mt-1">Overall average</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockActivities.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No recent activity</p>
                  ) : (
                    mockActivities.map(activity => (
                      <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                        <div className="flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.studentName} • {new Date(activity.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/parent/students')}>
                  <Users className="h-4 w-4 mr-2" />
                  My Children
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/parent/performance')}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Performance
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/parent/courses')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Courses
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/parent/fees')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Fees & Payments
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
