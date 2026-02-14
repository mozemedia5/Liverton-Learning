/**
 * Parent School Fees Page
 * Manage and pay school fees for children
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import ParentSideNavbar from '@/components/ParentSideNavbar';
import { getLinkedStudents } from '@/lib/parentService';
import { toast } from 'sonner';
import type { LinkedStudent } from '@/lib/parentService';

interface FeeRecord {
  id: string;
  studentId: string;
  term: string;
  amount: number;
  paid: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
}

export default function ParentFees() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      const studentsData = await getLinkedStudents(currentUser.uid);
      setStudents(studentsData);
      
      if (studentsData.length > 0) {
        setSelectedStudent(studentsData[0].id);
        loadFees(studentsData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadFees = async (studentId: string) => {
    try {
      // Mock fees data
      const mockFees: FeeRecord[] = [
        {
          id: '1',
          studentId,
          term: 'Term 1 2024',
          amount: 500,
          paid: 500,
          dueDate: '2024-02-28',
          status: 'paid',
        },
        {
          id: '2',
          studentId,
          term: 'Term 2 2024',
          amount: 500,
          paid: 250,
          dueDate: '2024-05-31',
          status: 'pending',
        },
        {
          id: '3',
          studentId,
          term: 'Term 3 2024',
          amount: 500,
          paid: 0,
          dueDate: '2024-08-31',
          status: 'pending',
        },
      ];
      setFees(mockFees);
    } catch (error) {
      console.error('Error loading fees:', error);
    }
  };

  const handlePayFees = (feeId: string) => {
    toast.success('Redirecting to payment gateway...');
    // Implement payment logic
  };

  const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const totalPaid = fees.reduce((sum, fee) => sum + fee.paid, 0);
  const totalPending = totalFees - totalPaid;

  return (
    <div className="flex h-screen bg-gray-50">
      <ParentSideNavbar />
      <main className="flex-1 overflow-auto lg:ml-64">
        <div className="p-4 md:p-8">
          <h1 className="text-3xl font-bold mb-8">School Fees</h1>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : students.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Students Linked</h3>
                <p className="text-gray-600">Link your children to view their school fees</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Student Selection */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {students.map(student => (
                  <Button
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student.id);
                      loadFees(student.id);
                    }}
                    variant={selectedStudent === student.id ? 'default' : 'outline'}
                  >
                    {student.studentName}
                  </Button>
                ))}
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600 mb-2">Total Fees</p>
                    <p className="text-3xl font-bold">${totalFees}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600 mb-2">Paid</p>
                    <p className="text-3xl font-bold text-green-600">${totalPaid}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600 mb-2">Pending</p>
                    <p className="text-3xl font-bold text-red-600">${totalPending}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Fees Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Fee Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {fees.map(fee => (
                      <div key={fee.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{fee.term}</h3>
                            <p className="text-sm text-gray-600">Due: {fee.dueDate}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${fee.amount}</p>
                            <p className={`text-sm ${
                              fee.status === 'paid' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {fee.status === 'paid' ? 'Paid' : `Paid: $${fee.paid}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-4">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(fee.paid / fee.amount) * 100}%` }}
                            />
                          </div>
                          {fee.status !== 'paid' && (
                            <Button
                              onClick={() => handlePayFees(fee.id)}
                              size="sm"
                              className="gap-2"
                            >
                              <CreditCard className="h-4 w-4" />
                              Pay
                            </Button>
                          )}
                          {fee.status === 'paid' && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-5 w-5" />
                              <span className="text-sm font-medium">Paid</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
