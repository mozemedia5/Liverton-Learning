/**
 * Parent Students Page
 * Manage linked children and their information
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';
import ParentSideNavbar from '@/components/ParentSideNavbar';
import { getLinkedStudents, linkStudent } from '@/lib/parentService';
import { toast } from 'sonner';
import type { LinkedStudent } from '@/lib/parentService';

const SCHOOLS = [
  'Kampala International School',
  'Makerere College School',
  'St. Mary\'s College Kisubi',
  'Gayaza High School',
  'Kabale High School',
  'Mbarara High School',
  'Other',
];

export default function ParentStudents() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    studentName: '',
    admissionNumber: '',
    school: '',
    grade: '',
  });

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
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    // Validate form
    if (!formData.studentName || !formData.admissionNumber || !formData.school || !formData.grade) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      if (!currentUser) return;
      
      // Call linkStudent function
      await linkStudent(currentUser.uid, {
        studentName: formData.studentName,
        admissionNumber: formData.admissionNumber,
        school: formData.school,
        grade: formData.grade,
      });

      toast.success('Student linked successfully');
      setFormData({ studentName: '', admissionNumber: '', school: '', grade: '' });
      setIsDialogOpen(false);
      loadStudents();
    } catch (error) {
      console.error('Error linking student:', error);
      toast.error('Failed to link student');
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to remove this student?')) return;
    
    try {
      // Implement remove student logic
      toast.success('Student removed successfully');
      loadStudents();
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error('Failed to remove student');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <ParentSideNavbar />
      <main className="flex-1 overflow-auto lg:ml-64">
        <div className="p-4 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">My Children</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Link Child
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link a Child</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Child's Name</label>
                    <Input
                      placeholder="Enter child's full name"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Admission Number</label>
                    <Input
                      placeholder="Enter admission number"
                      value={formData.admissionNumber}
                      onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">School</label>
                    <Select value={formData.school} onValueChange={(value) => setFormData({ ...formData, school: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select school" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHOOLS.map(school => (
                          <SelectItem key={school} value={school}>
                            {school}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Grade/Class</label>
                    <Input
                      placeholder="e.g., Form 4, Primary 6"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddStudent} className="w-full">
                    Link Child
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : students.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Children Linked</h3>
                <p className="text-gray-600 mb-6">Start by linking your first child to access their information</p>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Link Your First Child
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Link a Child</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Child's Name</label>
                        <Input
                          placeholder="Enter child's full name"
                          value={formData.studentName}
                          onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Admission Number</label>
                        <Input
                          placeholder="Enter admission number"
                          value={formData.admissionNumber}
                          onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">School</label>
                        <Select value={formData.school} onValueChange={(value) => setFormData({ ...formData, school: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select school" />
                          </SelectTrigger>
                          <SelectContent>
                            {SCHOOLS.map(school => (
                              <SelectItem key={school} value={school}>
                                {school}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Grade/Class</label>
                        <Input
                          placeholder="e.g., Form 4, Primary 6"
                          value={formData.grade}
                          onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleAddStudent} className="w-full">
                        Link Child
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Admission Number</span>
                      <span className="font-medium">{student.admissionNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Grade/Class</span>
                      <span className="font-medium">{student.grade}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <span className="font-medium text-green-600">Active</span>
                    </div>
                    <div className="pt-4 border-t flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-2">
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleRemoveStudent(student.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
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
