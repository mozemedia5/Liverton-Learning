/**
 * Parent Performance Page
 * Displays children's academic performance and progress
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, TrendingUp, Award, AlertCircle } from 'lucide-react';
import ParentSideNavbar from '@/components/ParentSideNavbar';
import { getLinkedStudents } from '@/lib/parentService';
import type { LinkedStudent } from '@/lib/parentService';

export default function ParentPerformance() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, [currentUser]);

  const loadStudents = async () => {
    if (!currentUser) return;
    try {
      const data = await getLinkedStudents(currentUser.uid);
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <ParentSideNavbar />
      <main className="flex-1 overflow-auto lg:ml-64">
        <div className="p-4 md:p-8">
          <h1 className="text-3xl font-bold mb-8">Children's Performance</h1>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : students.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Students Linked</h3>
                <p className="text-gray-600">Link your children to view their performance</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {students.map(student => (
                <Card key={student.id}>
                  <CardHeader>
                    <CardTitle>{student.studentName}</CardTitle>
                    <CardDescription>{student.school}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Overall Grade</span>
                      <span className="text-2xl font-bold text-green-600">A</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Average Score</span>
                      <span className="text-2xl font-bold">85%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Attendance</span>
                      <span className="text-2xl font-bold text-blue-600">92%</span>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-600 mb-2">Recent Subjects</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Mathematics</span>
                          <span className="font-semibold">88%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>English</span>
                          <span className="font-semibold">92%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Science</span>
                          <span className="font-semibold">85%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
