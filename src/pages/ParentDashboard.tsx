/**
 * Parent Dashboard
 * Main dashboard for parents to manage their children's education
 * Features:
 * - Overview of all linked children
 * - Quick stats on children's progress
 * - Add/link new children
 * - View recent activities
 * - Quick access to important features
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, AlertCircle, CheckCircle, Trash2, Eye, TrendingUp, BookOpen, CreditCard, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getLinkedStudents, unlinkStudentFromParent, verifyStudentExists, linkStudentToParent } from '@/lib/parentService';
import { toast } from 'sonner';
import ParentSideNavbar from '@/components/ParentSideNavbar';
import type { LinkedStudent } from '@/lib/parentService';

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { userData, currentUser, logout } = useAuth();
  
  // State management
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Add student dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    relationship: '',
    school: '',
    contactNumber: '',
  });
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  /**
   * Load linked students on component mount
   */
  useEffect(() => {
    loadLinkedStudents();
  }, [currentUser]);

  /**
   * Fetch linked students from Firebase
   */
  const loadLinkedStudents = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError('');
      const students = await getLinkedStudents(currentUser.uid);
      setLinkedStudents(students);
    } catch (err: any) {
      setError(err.message || 'Failed to load linked students');
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify student email exists in system
   */
  const handleVerifyEmail = async () => {
    if (!newStudent.email.trim()) {
      toast.error('Please enter student email');
      return;
    }

    try {
      setVerifyingEmail(true);
      const student = await verifyStudentExists(newStudent.email);
      
      if (!student) {
        toast.error('Student not found. Please check the email address.');
        setEmailVerified(false);
        return;
      }

      setEmailVerified(true);
      toast.success('Student verified!');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
      setEmailVerified(false);
    } finally {
      setVerifyingEmail(false);
    }
  };

  /**
   * Add new student to parent account
   */
  const handleAddStudent = async () => {
    if (!currentUser) return;

    // Validate form
    if (!newStudent.name.trim()) {
      toast.error('Please enter student name');
      return;
    }
    if (!emailVerified) {
      toast.error('Please verify student email first');
      return;
    }
    if (!newStudent.relationship) {
      toast.error('Please select relationship');
      return;
    }
    if (!newStudent.school.trim()) {
      toast.error('Please select or enter school');
      return;
    }

    try {
      setAddingStudent(true);
      
      // Get student ID from email
      const student = await verifyStudentExists(newStudent.email);
      if (!student) {
        throw new Error('Student not found');
      }

      // Link student to parent
      await linkStudentToParent(currentUser.uid, student.uid, {
        studentName: newStudent.name,
        relationship: newStudent.relationship,
        school: newStudent.school,
        contactNumber: newStudent.contactNumber,
      });

      toast.success('Student linked successfully!');
      
      // Reset form and reload
      setNewStudent({ name: '', email: '', relationship: '', school: '', contactNumber: '' });
      setEmailVerified(false);
      setShowAddDialog(false);
      await loadLinkedStudents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add student');
    } finally {
      setAddingStudent(false);
    }
  };

  /**
   * Remove student from parent account
   */
  const handleRemoveStudent = async (studentId: string) => {
    if (!currentUser) return;

    if (!window.confirm('Are you sure you want to unlink this student?')) {
      return;
    }

    try {
      await unlinkStudentFromParent(currentUser.uid, studentId);
      toast.success('Student unlinked successfully');
      await loadLinkedStudents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove student');
    }
  };

  /**
   * View student details
   */
  const handleViewStudent = (studentId: string) => {
    navigate(`/parent/student/${studentId}`);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Side Navigation */}
      <ParentSideNavbar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto lg:ml-64">
        <div className="p-4 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome, {userData?.fullName || 'Parent'}!</h1>
            <p className="text-gray-600 mt-2">Manage your children's education and track their progress</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Children Linked</p>
                    <p className="text-3xl font-bold">{linkedStudents.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average Performance</p>
                    <p className="text-3xl font-bold">85%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Courses</p>
                    <p className="text-3xl font-bold">12</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Fees</p>
                    <p className="text-3xl font-bold">$450</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Children Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">My Children</h2>
              <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Link Child
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : linkedStudents.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Children Linked Yet</h3>
                  <p className="text-gray-600 mb-6">Link your children to start tracking their progress</p>
                  <Button onClick={() => setShowAddDialog(true)}>Link Your First Child</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {linkedStudents.map(student => (
                  <Card key={student.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{student.studentName}</CardTitle>
                      <CardDescription>{student.relationship}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">School</p>
                        <p className="font-medium">{student.school || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium text-sm">{student.studentEmail}</p>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={() => handleViewStudent(student.id)}
                          variant="outline"
                          className="flex-1 gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                        <Button
                          onClick={() => handleRemoveStudent(student.id)}
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/parent/performance')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">View your children's academic performance and progress</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/parent/courses')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  Courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Browse and purchase courses for your children</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/parent/fees')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-red-600" />
                  School Fees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Pay school fees and view payment history</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Add Student Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Your Child</DialogTitle>
            <DialogDescription>
              Add your child to your account to track their progress
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Student Name */}
            <div className="space-y-2">
              <Label htmlFor="studentName">Child's Name</Label>
              <Input
                id="studentName"
                placeholder="John Doe"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
              />
            </div>

            {/* Student Email */}
            <div className="space-y-2">
              <Label htmlFor="studentEmail">Child's Email</Label>
              <div className="flex gap-2">
                <Input
                  id="studentEmail"
                  type="email"
                  placeholder="john@school.com"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  disabled={emailVerified}
                />
                <Button
                  onClick={handleVerifyEmail}
                  disabled={verifyingEmail || emailVerified}
                  variant="outline"
                >
                  {verifyingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : emailVerified ? <CheckCircle className="h-4 w-4 text-green-600" /> : 'Verify'}
                </Button>
              </div>
            </div>

            {/* Relationship */}
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <Select value={newStudent.relationship} onValueChange={(value) => setNewStudent({ ...newStudent, relationship: value })}>
                <SelectTrigger id="relationship">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="son">Son</SelectItem>
                  <SelectItem value="daughter">Daughter</SelectItem>
                  <SelectItem value="ward">Ward</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* School */}
            <div className="space-y-2">
              <Label htmlFor="school">School</Label>
              <Input
                id="school"
                placeholder="e.g., Kampala High School"
                value={newStudent.school}
                onChange={(e) => setNewStudent({ ...newStudent, school: e.target.value })}
              />
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact Number (Optional)</Label>
              <Input
                id="contactNumber"
                type="tel"
                placeholder="+256 700 000000"
                value={newStudent.contactNumber}
                onChange={(e) => setNewStudent({ ...newStudent, contactNumber: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={addingStudent || !emailVerified}
            >
              {addingStudent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Link Child
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
