/**
 * Parent Fees & Payments Page
 * View and manage school fees and payments
 * Features:
 * - View fee structure
 * - Payment history
 * - Outstanding balances
 * - Payment methods
 * - Invoice downloads
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, DollarSign, Download, AlertCircle, CheckCircle } from 'lucide-react';
import ParentSideNavbar from '@/components/ParentSideNavbar';
import { getLinkedStudents } from '@/lib/parentService';
import type { LinkedStudent } from '@/lib/parentService';

/**
 * Fee interface for type safety
 */
interface Fee {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  studentName: string;
}

/**
 * Payment interface for type safety
 */
interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  studentName: string;
}

/**
 * Parent Fees Component
 * Displays fees and payment information
 */
export default function ParentFees() {
  const { currentUser } = useAuth();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  /**
   * Mock fees data - replace with actual API call
   */
  const mockFees: Record<string, Fee[]> = {
    student1: [
      {
        id: '1',
        name: 'Tuition Fee - Term 1',
        amount: 5000,
        dueDate: '2024-01-31',
        status: 'paid',
        studentName: 'John Doe',
      },
      {
        id: '2',
        name: 'Tuition Fee - Term 2',
        amount: 5000,
        dueDate: '2024-04-30',
        status: 'pending',
        studentName: 'John Doe',
      },
      {
        id: '3',
        name: 'Activity Fee',
        amount: 500,
        dueDate: '2024-02-28',
        status: 'overdue',
        studentName: 'John Doe',
      },
    ],
  };

  /**
   * Mock payment history - replace with actual API call
   */
  const mockPayments: Record<string, Payment[]> = {
    student1: [
      {
        id: '1',
        amount: 5000,
        date: '2024-01-25',
        method: 'Bank Transfer',
        status: 'completed',
        studentName: 'John Doe',
      },
      {
        id: '2',
        amount: 500,
        date: '2024-02-10',
        method: 'Credit Card',
        status: 'completed',
        studentName: 'John Doe',
      },
    ],
  };

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
      
      // Set first student as selected by default
      if (students.length > 0) {
        setSelectedStudent(students[0].studentId);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'overdue':
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  /**
   * Calculate total outstanding balance
   */
  const calculateOutstandingBalance = () => {
    const fees = mockFees.student1 || [];
    return fees
      .filter(fee => fee.status !== 'paid')
      .reduce((total, fee) => total + fee.amount, 0);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <ParentSideNavbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <ParentSideNavbar />
      <main className="flex-1 overflow-auto lg:ml-64">
        <div className="p-4 md:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Fees & Payments</h1>
            <p className="text-gray-600 mt-1">Manage school fees and payment history</p>
          </div>

          {linkedStudents.length === 0 ? (
            /* Empty State */
            <Card className="border-dashed">
              <CardContent className="pt-12 pb-12 text-center">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No fees information</h3>
                <p className="text-gray-600">
                  Link a child to view their fees and payment information
                </p>
              </CardContent>
            </Card>
          ) : (
            /* Fees View */
            <Tabs defaultValue={selectedStudent || ''} onValueChange={setSelectedStudent}>
              <TabsList className="mb-6">
                {linkedStudents.map(student => (
                  <TabsTrigger key={student.studentId} value={student.studentId}>
                    {student.studentName}
                  </TabsTrigger>
                ))}
              </TabsList>

              {linkedStudents.map(student => (
                <TabsContent key={student.studentId} value={student.studentId}>
                  <div className="space-y-6">
                    {/* Outstanding Balance Card */}
                    <Card className="border-l-4 border-l-red-500 bg-red-50">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Outstanding Balance</span>
                          <DollarSign className="h-5 w-5 text-red-600" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-red-600">
                          ${calculateOutstandingBalance().toFixed(2)}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          Please settle outstanding fees to avoid late charges
                        </p>
                        <Button className="mt-4">Make Payment</Button>
                      </CardContent>
                    </Card>

                    {/* Fees & Payments Tabs */}
                    <Tabs defaultValue="fees">
                      <TabsList>
                        <TabsTrigger value="fees">Current Fees</TabsTrigger>
                        <TabsTrigger value="history">Payment History</TabsTrigger>
                      </TabsList>

                      {/* Current Fees */}
                      <TabsContent value="fees">
                        <Card>
                          <CardHeader>
                            <CardTitle>Current Fees</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {mockFees.student1?.map(fee => (
                                <div
                                  key={fee.id}
                                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium">{fee.name}</p>
                                    <p className="text-sm text-gray-600">
                                      Due: {new Date(fee.dueDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className="font-semibold">${fee.amount.toFixed(2)}</p>
                                      <Badge className={getStatusColor(fee.status)}>
                                        {fee.status}
                                      </Badge>
                                    </div>
                                    {fee.status !== 'paid' && (
                                      <Button size="sm" variant="outline">
                                        Pay Now
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Payment History */}
                      <TabsContent value="history">
                        <Card>
                          <CardHeader>
                            <CardTitle>Payment History</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {mockPayments.student1?.map(payment => (
                                <div
                                  key={payment.id}
                                  className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    {getStatusIcon(payment.status)}
                                    <div>
                                      <p className="font-medium">{payment.method}</p>
                                      <p className="text-sm text-gray-600">
                                        {new Date(payment.date).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold">${payment.amount.toFixed(2)}</p>
                                    <Badge className={getStatusColor(payment.status)}>
                                      {payment.status}
                                    </Badge>
                                  </div>
                                  <Button size="sm" variant="ghost" className="ml-4">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}
