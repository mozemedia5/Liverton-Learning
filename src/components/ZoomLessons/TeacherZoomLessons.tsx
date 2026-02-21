/**
 * Teacher Zoom Lessons Component
 * 
 * Features:
 * - Create new lessons with comprehensive details
 * - Set enrollment fees and student capacity
 * - Define learning outcomes
 * - Add course materials
 * - Edit lesson details
 * - Delete lessons
 * - View all created lessons
 * - Track student enrollments
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Video,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  createLesson,
  getTeacherLessons,
  updateLesson,
  deleteLesson,
  type ZoomLesson,
} from '@/lib/zoomService';

/**
 * Teacher Zoom Lessons Component
 */
export default function TeacherZoomLessons() {
  const { currentUser } = useAuth();

  // State management
  const [lessons, setLessons] = useState<ZoomLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<ZoomLesson | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    duration: '',
    enrollmentFee: '',
    maxStudents: '',
    outcomes: [] as string[],
    materials: [] as any[],
  });

  const [newOutcome, setNewOutcome] = useState('');
  const [newMaterial, setNewMaterial] = useState('');

  // Fetch teacher's lessons on component mount
  useEffect(() => {
    const fetchLessons = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        const teacherLessons = await getTeacherLessons(currentUser.uid);
        setLessons(teacherLessons);
      } catch (err) {
        console.error('Error fetching lessons:', err);
        setError('Failed to load lessons');
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [currentUser?.uid]);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Add outcome
  const handleAddOutcome = () => {
    if (newOutcome.trim()) {
      setFormData((prev) => ({
        ...prev,
        outcomes: [...prev.outcomes, newOutcome],
      }));
      setNewOutcome('');
    }
  };

  // Remove outcome
  const handleRemoveOutcome = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      outcomes: prev.outcomes.filter((_, i) => i !== index),
    }));
  };

  // Add material
  const handleAddMaterial = () => {
    if (newMaterial.trim()) {
      setFormData((prev) => ({
        ...prev,
        materials: [...prev.materials, { name: newMaterial, url: '' }],
      }));
      setNewMaterial('');
    }
  };

  // Remove material
  const handleRemoveMaterial = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  };

  // Handle lesson creation/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser?.uid) return;

    try {
      setSubmitting(true);

      const lessonData = {
        title: formData.title,
        description: formData.description,
        scheduledDate: formData.scheduledDate,
        duration: parseInt(formData.duration) || 0,
        enrollmentFee: parseFloat(formData.enrollmentFee) || 0,
        maxStudents: parseInt(formData.maxStudents) || 0,
        outcomes: formData.outcomes,
        materials: formData.materials,
        teacherId: currentUser.uid,
        teacherName: currentUser.displayName || 'Unknown Teacher',
      };

      if (editingLesson) {
        // Update existing lesson
        await updateLesson(editingLesson.id, lessonData);
        setLessons((prev) =>
          prev.map((lesson) =>
            lesson.id === editingLesson.id
              ? { ...lesson, ...lessonData }
              : lesson
          )
        );
      } else {
        // Create new lesson
        const newLesson = await createLesson(lessonData);
        setLessons((prev) => [...prev, newLesson]);
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        scheduledDate: '',
        duration: '',
        enrollmentFee: '',
        maxStudents: '',
        outcomes: [],
        materials: [],
      });
      setEditingLesson(null);
      setShowCreateDialog(false);
    } catch (err) {
      console.error('Error saving lesson:', err);
      setError('Failed to save lesson');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle lesson deletion
  const handleDelete = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
      await deleteLesson(lessonId);
      setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
    } catch (err) {
      console.error('Error deleting lesson:', err);
      setError('Failed to delete lesson');
    }
  };

  // Handle edit
  const handleEdit = (lesson: ZoomLesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      description: lesson.description || '',
      scheduledDate: lesson.scheduledDate,
      duration: lesson.duration?.toString() || '',
      enrollmentFee: lesson.enrollmentFee?.toString() || '',
      maxStudents: lesson.maxStudents?.toString() || '',
      outcomes: lesson.outcomes || [],
      materials: lesson.materials || [],
    });
    setShowCreateDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your lessons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Zoom Lessons</h1>
          <p className="text-muted-foreground">
            Create and manage your online lessons
          </p>
        </div>

        {/* Create Lesson Button */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingLesson(null);
                setFormData({
                  title: '',
                  description: '',
                  scheduledDate: '',
                  duration: '',
                  enrollmentFee: '',
                  maxStudents: '',
                  outcomes: [],
                  materials: [],
                });
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Lesson
            </Button>
          </DialogTrigger>

          {/* Create/Edit Dialog */}
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
              </DialogTitle>
              <DialogDescription>
                {editingLesson
                  ? 'Update your lesson details'
                  : 'Fill in the details to create a new lesson'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Lesson Title *
                </label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Introduction to Biology"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your lesson..."
                  rows={3}
                />
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Scheduled Date *
                </label>
                <Input
                  type="datetime-local"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Duration (minutes) *
                </label>
                <Input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  placeholder="60"
                  required
                />
              </div>

              {/* Enrollment Fee */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Enrollment Fee ($)
                </label>
                <Input
                  type="number"
                  name="enrollmentFee"
                  value={formData.enrollmentFee}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.01"
                />
              </div>

              {/* Max Students */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Students
                </label>
                <Input
                  type="number"
                  name="maxStudents"
                  value={formData.maxStudents}
                  onChange={handleInputChange}
                  placeholder="Unlimited"
                />
              </div>

              {/* Learning Outcomes */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Learning Outcomes
                </label>
                <div className="space-y-2">
                  {formData.outcomes.map((outcome, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <span className="text-sm">{outcome}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOutcome(index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newOutcome}
                    onChange={(e) => setNewOutcome(e.target.value)}
                    placeholder="Add learning outcome..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOutcome();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddOutcome}
                    variant="outline"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Course Materials */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Course Materials
                </label>
                <div className="space-y-2">
                  {formData.materials.map((material, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <span className="text-sm">{material.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newMaterial}
                    onChange={(e) => setNewMaterial(e.target.value)}
                    placeholder="Add material name..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMaterial();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddMaterial}
                    variant="outline"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingLesson ? (
                  'Update Lesson'
                ) : (
                  'Create Lesson'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Lessons Grid */}
      {lessons.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Lessons Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first lesson to get started
            </p>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>Create Your First Lesson</Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lessons.map((lesson) => (
            <Card
              key={lesson.id}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{lesson.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(lesson.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">{lesson.status || 'scheduled'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Description */}
                {lesson.description && (
                  <p className="text-sm text-muted-foreground">
                    {lesson.description}
                  </p>
                )}

                {/* Lesson Info */}
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Duration:</span>{' '}
                    {lesson.duration} minutes
                  </div>
                  <div>
                    <span className="font-medium">Fee:</span> ${lesson.enrollmentFee}
                  </div>
                  <div>
                    <span className="font-medium">Max Students:</span>{' '}
                    {lesson.maxStudents || 'Unlimited'}
                  </div>
                </div>

                {/* Outcomes Count */}
                {lesson.outcomes && lesson.outcomes.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Outcomes:</span>{' '}
                    {lesson.outcomes.length}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleEdit(lesson)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(lesson.id)}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
