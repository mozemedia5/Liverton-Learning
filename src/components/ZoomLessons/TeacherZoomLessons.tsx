/**
 * Teacher Zoom Lessons Component
 * 
 * Features:
 * - Create new Zoom lessons with all details
 * - View all created lessons
 * - Edit lesson details
 * - Delete lessons
 * - Track student enrollments
 * - Manage lesson status (scheduled, ongoing, completed, cancelled)
 * - View learning outcomes and materials
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Video, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  Calendar, 
  Clock, 
  DollarSign,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  createZoomLesson,
  getTeacherLessons,
  deleteZoomLesson,
  updateZoomLesson,
  type ZoomLesson,
} from '@/lib/zoomService';
import { Timestamp } from 'firebase/firestore';

/**
 * Teacher Zoom Lessons Component
 */
export default function TeacherZoomLessons() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { theme } = useTheme();

  // State management
  const [lessons, setLessons] = useState<(ZoomLesson & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<(ZoomLesson & { id: string }) | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    className: '',
    zoomLink: '',
    zoomMeetingId: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 60,
    enrollmentFee: 0,
    maxStudents: 30,
    mainTopic: '',
    learningOutcomes: [''],
    materials: [''],
  });

  /**
   * Load teacher's lessons on component mount
   */
  useEffect(() => {
    loadLessons();
  }, [userData?.uid]);

  /**
   * Fetch all lessons created by the teacher
   */
  const loadLessons = async () => {
    if (!userData?.uid) return;

    try {
      setLoading(true);
      const teacherLessons = await getTeacherLessons(userData.uid);
      setLessons(teacherLessons);
    } catch (error) {
      console.error('Error loading lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'enrollmentFee' || name === 'maxStudents' 
        ? parseInt(value) 
        : value,
    }));
  };

  /**
   * Handle array field changes (learning outcomes, materials)
   */
  const handleArrayChange = (field: 'learningOutcomes' | 'materials', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item),
    }));
  };

  /**
   * Add new learning outcome or material field
   */
  const addArrayField = (field: 'learningOutcomes' | 'materials') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  };

  /**
   * Remove learning outcome or material field
   */
  const removeArrayField = (field: 'learningOutcomes' | 'materials', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  /**
   * Handle lesson creation or update
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.uid) return;

    try {
      setIsSubmitting(true);

      const lessonData = {
        teacherId: userData.uid,
        teacherName: userData.fullName || 'Teacher',
        title: formData.title,
        description: formData.description,
        className: formData.className,
        zoomLink: formData.zoomLink,
        zoomMeetingId: formData.zoomMeetingId,
        scheduledDate: Timestamp.fromDate(new Date(formData.scheduledDate)),
        scheduledTime: formData.scheduledTime,
        duration: formData.duration,
        enrollmentFee: formData.enrollmentFee,
        maxStudents: formData.maxStudents,
        enrolledStudents: editingLesson?.enrolledStudents || 0,
        mainTopic: formData.mainTopic,
        learningOutcomes: formData.learningOutcomes.filter(o => o.trim()),
        materials: formData.materials.filter(m => m.trim()),
        status: 'scheduled' as const,
      };

      if (editingLesson) {
        // Update existing lesson
        await updateZoomLesson(editingLesson.id, lessonData);
      } else {
        // Create new lesson
        await createZoomLesson(lessonData);
      }

      // Reset form and reload lessons
      setFormData({
        title: '',
        description: '',
        className: '',
        zoomLink: '',
        zoomMeetingId: '',
        scheduledDate: '',
        scheduledTime: '',
        duration: 60,
        enrollmentFee: 0,
        maxStudents: 30,
        mainTopic: '',
        learningOutcomes: [''],
        materials: [''],
      });
      setEditingLesson(null);
      setIsCreateDialogOpen(false);
      await loadLessons();
    } catch (error) {
      console.error('Error saving lesson:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle lesson deletion
   */
  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
      await deleteZoomLesson(lessonId);
      await loadLessons();
    } catch (error) {
      console.error('Error deleting lesson:', error);
    }
  };

  /**
   * Handle edit lesson
   */
  const handleEditLesson = (lesson: ZoomLesson & { id: string }) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      description: lesson.description,
      className: lesson.className,
      zoomLink: lesson.zoomLink,
      zoomMeetingId: lesson.zoomMeetingId,
      scheduledDate: lesson.scheduledDate.toDate().toISOString().split('T')[0],
      scheduledTime: lesson.scheduledTime,
      duration: lesson.duration,
      enrollmentFee: lesson.enrollmentFee,
      maxStudents: lesson.maxStudents,
      mainTopic: lesson.mainTopic,
      learningOutcomes: lesson.learningOutcomes,
      materials: lesson.materials,
    });
    setIsCreateDialogOpen(true);
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ongoing':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Video className="w-8 h-8" />
            Zoom Lessons
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Create and manage your online lessons</p>
        </div>

        {/* Create Lesson Button */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingLesson(null);
                setFormData({
                  title: '',
                  description: '',
                  className: '',
                  zoomLink: '',
                  zoomMeetingId: '',
                  scheduledDate: '',
                  scheduledTime: '',
                  duration: 60,
                  enrollmentFee: 0,
                  maxStudents: 30,
                  mainTopic: '',
                  learningOutcomes: [''],
                  materials: [''],
                });
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Lesson
            </Button>
          </DialogTrigger>

          {/* Create/Edit Lesson Dialog */}
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLesson ? 'Edit Zoom Lesson' : 'Create New Zoom Lesson'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-2">
                <Label htmlFor="title">Lesson Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Advanced Calculus - Derivatives"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what students will learn in this lesson"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="className">Class Name *</Label>
                  <Input
                    id="className"
                    name="className"
                    value={formData.className}
                    onChange={handleInputChange}
                    placeholder="e.g., Grade 12 Math"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mainTopic">Main Topic *</Label>
                  <Input
                    id="mainTopic"
                    name="mainTopic"
                    value={formData.mainTopic}
                    onChange={handleInputChange}
                    placeholder="e.g., Calculus"
                    required
                  />
                </div>
              </div>

              {/* Zoom Details */}
              <div className="space-y-2">
                <Label htmlFor="zoomLink">Zoom Meeting Link *</Label>
                <Input
                  id="zoomLink"
                  name="zoomLink"
                  type="url"
                  value={formData.zoomLink}
                  onChange={handleInputChange}
                  placeholder="https://zoom.us/j/..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zoomMeetingId">Zoom Meeting ID *</Label>
                <Input
                  id="zoomMeetingId"
                  name="zoomMeetingId"
                  value={formData.zoomMeetingId}
                  onChange={handleInputChange}
                  placeholder="e.g., 123456789"
                  required
                />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Date *</Label>
                  <Input
                    id="scheduledDate"
                    name="scheduledDate"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledTime">Time *</Label>
                  <Input
                    id="scheduledTime"
                    name="scheduledTime"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* Duration and Enrollment */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    value={formData.duration}
                    onChange={handleInputChange}
                    min="15"
                    max="480"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enrollmentFee">Enrollment Fee ($) *</Label>
                  <Input
                    id="enrollmentFee"
                    name="enrollmentFee"
                    type="number"
                    value={formData.enrollmentFee}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxStudents">Max Students *</Label>
                  <Input
                    id="maxStudents"
                    name="maxStudents"
                    type="number"
                    value={formData.maxStudents}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* Learning Outcomes */}
              <div className="space-y-2">
                <Label>Learning Outcomes</Label>
                {formData.learningOutcomes.map((outcome, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={outcome}
                      onChange={(e) => handleArrayChange('learningOutcomes', index, e.target.value)}
                      placeholder={`Outcome ${index + 1}`}
                    />
                    {formData.learningOutcomes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArrayField('learningOutcomes', index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayField('learningOutcomes')}
                >
                  Add Outcome
                </Button>
              </div>

              {/* Materials */}
              <div className="space-y-2">
                <Label>Materials/Resources</Label>
                {formData.materials.map((material, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={material}
                      onChange={(e) => handleArrayChange('materials', index, e.target.value)}
                      placeholder={`Material ${index + 1} (URL or file name)`}
                    />
                    {formData.materials.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArrayField('materials', index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayField('materials')}
                >
                  Add Material
                </Button>
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingLesson ? 'Update Lesson' : 'Create Lesson'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lessons Grid */}
      {lessons.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Video className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No lessons created yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Create your first Zoom lesson to get started
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lessons.map(lesson => (
            <Card key={lesson.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{lesson.title}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {lesson.className}
                    </p>
                  </div>
                  <Badge className={getStatusColor(lesson.status)}>
                    {lesson.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Lesson Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <BookOpen className="w-4 h-4" />
                    <span>{lesson.mainTopic}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{lesson.scheduledDate.toDate().toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{lesson.scheduledTime} ({lesson.duration} min)</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{lesson.enrolledStudents}/{lesson.maxStudents} students</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <DollarSign className="w-4 h-4" />
                    <span>${lesson.enrollmentFee}</span>
                  </div>
                </div>

                {/* Learning Outcomes Preview */}
                {lesson.learningOutcomes.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Learning Outcomes:
                    </p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {lesson.learningOutcomes.slice(0, 2).map((outcome, idx) => (
                        <li key={idx}>• {outcome}</li>
                      ))}
                      {lesson.learningOutcomes.length > 2 && (
                        <li>• +{lesson.learningOutcomes.length - 2} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditLesson(lesson)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/teacher/zoom-lessons/${lesson.id}`)}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Students
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteLesson(lesson.id)}
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
  );
}
