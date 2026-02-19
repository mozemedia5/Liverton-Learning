/**
 * Parent Students Management Page
 * Manage linked children and their information
 * Features:
 * - View all linked children
 * - Add new children
 * - Edit child information
 * - Remove children
 * - View child details
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Edit2, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { getLinkedStudents, unlinkStudentFromParent, verifyStudentExists, linkStudentToParent } from '@/lib/parentService';
import { toast } from 'sonner';
import type { LinkedStudent } from '@/lib/parentService';

/**
 * Parent Students Component
 * Displays and manages all linked students for the parent
 */
export default function ParentStudents() {
  const { currentUser } = useAuth();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  
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
      
      // Reload students list
      await loadStudents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to link student');
    } finally {
      setAddingStudent(false);
    }
  };

  /**
   * Remove a student from parent account
   */
  const handleRemoveStudent = async (studentId: string) => {
    if (!currentUser) return;

    if (!window.confirm('Are you sure you want to remove this student?')) {
      return;
    }

    try {
      await unlinkStudentFromParent(currentUser.uid, studentId);
      toast.success('Student removed successfully');
      await loadStudents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove student');
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="p-4 md:p-8 lg:ml-0">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Children</h1>
            <p className="text-gray-600 mt-1">Manage your children's accounts and information</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Child
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : linkedStudents.length === 0 ? (
          /* Empty State */
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No children linked yet</h3>
              <p className="text-gray-600 mb-6">
                Link your children's accounts to start managing their education.
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Link Your First Child
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Students List */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {linkedStudents.map(student => (
              <Card key={student.studentId} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{student.studentName}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{student.relationship}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStudent(student.studentId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Email */}
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Email</p>
                    <p className="text-sm font-medium">{student.studentEmail}</p>
                  </div>

                  {/* Contact Number */}
                  {student.contactNumber && (
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Contact</p>
                      <p className="text-sm font-medium">{student.contactNumber}</p>
                    </div>
                  )}

                  {/* Linked Date */}
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Linked Since</p>
                    <p className="text-sm font-medium">
                      {new Date(student.linkedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 pt-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Student Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Child</DialogTitle>
            <DialogDescription>
              Enter your child's details to link their account to yours.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Student Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Child's Name</Label>
              <Input
                id="name"
                placeholder="Enter child's full name"
                value={newStudent.name}
                onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
              />
            </div>

            {/* Student Email with Verification */}
            <div className="space-y-2">
              <Label htmlFor="email">Child's Email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter child's email"
                  value={newStudent.email}
                  onChange={e => {
                    setNewStudent({ ...newStudent, email: e.target.value });
                    setEmailVerified(false);
                  }}
                  disabled={emailVerified}
                />
                <Button
                  variant="outline"
                  onClick={handleVerifyEmail}
                  disabled={verifyingEmail || emailVerified || !newStudent.email}
                >
                  {verifyingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>
              </div>
              {emailVerified && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Student account verified
                </p>
              )}
            </div>

            {/* Relationship */}
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <Select
                value={newStudent.relationship}
                onValueChange={value => setNewStudent({ ...newStudent, relationship: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Father">Father</SelectItem>
                  <SelectItem value="Mother">Mother</SelectItem>
                  <SelectItem value="Guardian">Guardian</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number (Optional)</Label>
              <Input
                id="contact"
                placeholder="Enter contact number"
                value={newStudent.contactNumber}
                onChange={e => setNewStudent({ ...newStudent, contactNumber: e.target.value })}
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              {addingStudent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Link Child
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
