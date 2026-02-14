/**
 * Parent Dashboard
 * Displays parent's linked children and their academic progress
 * Features:
 * - View all linked children
 * - Add new children to account
 * - View child's academic progress
 * - Access child's courses and performance
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
import { Plus, Loader2, AlertCircle, CheckCircle, Trash2, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getLinkedStudents, unlinkStudentFromParent, verifyStudentExists, linkStudentToParent } from '@/lib/parentService';
import { toast } from 'sonner';
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
        contactNumber: newStudent.contactNumber,
      });

      toast.success('Student linked successfully!');
      
      // Reset form and reload
      setNewStudent({ name: '', email: '', relationship: '', contactNumber: '' });
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

    if (!confirm('Are you sure you want to remove this student?')) {
      return;
    }

    try {
      await unlinkStudentFromParent(currentUser.uid, studentId);
      toast.success('Student removed');
      await loadLinkedStudents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove student');
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      toast.error('Failed to logout');
    }
  };

  // Redirect if not authenticated or not a parent
  if (!currentUser || userData?.role !== 'parent') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You must be logged in as a parent to access this page.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate('/login')}
              className="w-full mt-4"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="w-full px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Parent Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Welcome, {userData?.fullName}</p>
          </div>
          <Button 
            variant="outline"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Add Student Button */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Your Children</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Manage and monitor your children's academic progress
              </p>
            </div>
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Child
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}

          {/* Empty State */}
          {!loading && linkedStudents.length === 0 && (
            <Card className="border border-gray-200 dark:border-gray-800">
              <CardContent className="pt-12 pb-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Children Added Yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Add your children to start monitoring their academic progress
                </p>
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Child
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Students Grid */}
          {!loading && linkedStudents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {linkedStudents.map((student) => (
                <Card key={student.studentId} className="border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{student.studentName}</CardTitle>
                        <CardDescription>{student.studentEmail}</CardDescription>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Student Info */}
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Relationship</p>
                        <p className="font-semibold capitalize">{student.relationship}</p>
                      </div>
                      {student.contactNumber && (
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Contact</p>
                          <p className="font-semibold">{student.contactNumber}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Linked Since</p>
                        <p className="font-semibold">
                          {new Date(student.linkedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                      <Button 
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/parent/student/${student.studentId}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Progress
                      </Button>
                      <Button 
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveStudent(student.studentId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Student Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a Child</DialogTitle>
            <DialogDescription>
              Link your child's account to monitor their progress
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Child Name */}
            <div className="space-y-2">
              <Label htmlFor="childName">Child's Full Name *</Label>
              <Input
                id="childName"
                placeholder="Enter child's full name"
                value={newStudent.name}
                onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Child Email */}
            <div className="space-y-2">
              <Label htmlFor="childEmail">Child's Email *</Label>
              <div className="flex gap-2">
                <Input
                  id="childEmail"
                  type="email"
                  placeholder="Enter child's email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                  disabled={emailVerified}
                />
                <Button
                  type="button"
                  onClick={handleVerifyEmail}
                  disabled={verifyingEmail || emailVerified || !newStudent.email}
                  className="whitespace-nowrap"
                >
                  {verifyingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : emailVerified ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    'Verify'
                  )}
                </Button>
              </div>
              {emailVerified && (
                <p className="text-sm text-green-600">Email verified ✓</p>
              )}
            </div>

            {/* Relationship */}
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship *</Label>
              <Select 
                value={newStudent.relationship}
                onValueChange={(value) => setNewStudent(prev => ({ ...prev, relationship: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="son">Son</SelectItem>
                  <SelectItem value="daughter">Daughter</SelectItem>
                  <SelectItem value="ward">Ward</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact Number (Optional)</Label>
              <Input
                id="contactNumber"
                type="tel"
                placeholder="Child's contact number"
                value={newStudent.contactNumber}
                onChange={(e) => setNewStudent(prev => ({ ...prev, contactNumber: e.target.value }))}
              />
            </div>

            {/* Info */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your child must have a registered account in the system. 
                Verify their email to link their account.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={addingStudent || !emailVerified}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {addingStudent ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Child'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
