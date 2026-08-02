import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Send, 
  Loader2,
  Bell,
  Users,
  Megaphone,
  BookOpen,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createNotification } from '@/services/announcementService';

export default function CreateAnnouncement() {
  const navigate = useNavigate();
  const { userRole, userData, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'announcement' as 'announcement' | 'quiz' | 'course' | 'reminder' | 'motivation',
    title: '',
    body: '',
    link: '',
    targetAudience: [] as string[],
  });

  const audienceOptions = [
    { id: 'students', label: 'Students', icon: '👨‍🎓' },
    { id: 'teachers', label: 'Teachers', icon: '👩‍🏫' },
    { id: 'parents', label: 'Parents', icon: '👨‍👩‍👧' },
    { id: 'school_admins', label: 'School Admins', icon: '👔' },
    { id: 'all', label: 'Everyone', icon: '🌍' },
  ];

  const typesOptions = [
    { value: 'announcement', label: 'Announcement', icon: Megaphone },
    { value: 'quiz', label: 'Quiz Alert', icon: Award },
    { value: 'course', label: 'Course Notification', icon: BookOpen },
    { value: 'reminder', label: 'General Reminder', icon: Clock },
    { value: 'motivation', label: 'Motivation Quote', icon: Sparkles },
  ];

  const handleAudienceChange = (id: string) => {
    setFormData(prev => {
      if (id === 'all') {
        return { ...prev, targetAudience: ['all'] };
      }
      let current = [...prev.targetAudience.filter(a => a !== 'all')];
      if (current.includes(id)) {
        current = current.filter(item => item !== id);
      } else {
        current.push(id);
      }
      return { ...prev, targetAudience: current };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a notification title');
      return;
    }

    if (!formData.body.trim()) {
      toast.error('Please enter notification content');
      return;
    }

    if (formData.targetAudience.length === 0) {
      toast.error('Please select at least one target audience');
      return;
    }

    try {
      setLoading(true);

      await createNotification({
        type: formData.type,
        title: formData.title.trim(),
        body: formData.body.trim(),
        link: formData.link.trim() || undefined,
        targetAudience: formData.targetAudience,
        sender: userData?.fullName || userData?.name || 'Unknown',
        senderId: currentUser?.uid || '',
        senderRole: userRole || 'unknown',
      });

      toast.success('Notification created successfully!');
      navigate('/announcements');
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('Failed to broadcast notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-blue-600" />
              New Broadcast Alert
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create and dispatch real-time system alerts to selected workspaces, like SALAF.
            </p>
          </div>
        </div>

        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Notification Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="type">Alert Category Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val: any) => setFormData({ ...formData, type: val })}
                >
                  <SelectTrigger className="w-full rounded-xl">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typesOptions.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <Icon className="w-4 h-4 text-blue-600" />
                            {opt.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Broadcast Title *</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g. System Maintenance, Exam Timetable, Study Motivation..."
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  maxLength={100}
                  className="rounded-xl"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label htmlFor="body">Notification Details / Content *</Label>
                <Textarea
                  id="body"
                  placeholder="Enter detailed message contents to broadcast..."
                  value={formData.body}
                  onChange={e => setFormData({ ...formData, body: e.target.value })}
                  rows={5}
                  maxLength={1000}
                  className="rounded-xl"
                />
              </div>

              {/* Destination Link */}
              <div className="space-y-2">
                <Label htmlFor="link">Reference Link / Action URL (Optional)</Label>
                <Input
                  id="link"
                  type="text"
                  placeholder="e.g. /student/courses, /teacher/my-quiz, or https://example.com"
                  value={formData.link}
                  onChange={e => setFormData({ ...formData, link: e.target.value })}
                  className="rounded-xl"
                />
                <p className="text-[11px] text-gray-500">Provide an internal route or external website link to attach to the alert card.</p>
              </div>

              {/* Target Audience */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Target Audience *
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {audienceOptions.map(opt => (
                    <div 
                      key={opt.id}
                      onClick={() => handleAudienceChange(opt.id)}
                      className={`
                        flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-105
                        ${formData.targetAudience.includes(opt.id) 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10'
                          : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-900 dark:border-gray-800 hover:border-gray-400'}
                      `}
                    >
                      <span className="text-2xl mb-2">{opt.icon}</span>
                      <span className="text-xs font-semibold text-center">{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-800">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(-1)}
                  disabled={loading}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Broadcast Alert
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}