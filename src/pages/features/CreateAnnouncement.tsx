import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Send, 
  Loader2,
  Bell,
  Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export default function CreateAnnouncement() {
  const navigate = useNavigate();
  const { userRole, userData, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetAudience: [] as string[],
    priority: 'normal' as 'normal' | 'urgent' | 'info',
  });

  const audienceOptions = [
    { id: 'students', label: 'Students', icon: '👨‍🎓' },
    { id: 'teachers', label: 'Teachers', icon: '👩‍🏫' },
    { id: 'parents', label: 'Parents', icon: '👨‍👩‍👧' },
    { id: 'school_admins', label: 'School Admins', icon: '👔' },
    { id: 'all', label: 'Everyone', icon: '🌍' },
  ];

  const priorityOptions = [
    { id: 'info', label: 'ℹ️ Info', description: 'General information' },
    { id: 'normal', label: '📢 Normal', description: 'Standard announcement' },
    { id: 'urgent', label: '🚨 Urgent', description: 'Requires immediate attention' },
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
      toast.error('Please enter an announcement title');
      return;
    }

    if (!formData.message.trim()) {
      toast.error('Please enter an announcement message');
      return;
    }

    if (formData.targetAudience.length === 0) {
      toast.error('Please select at least one target audience');
      return;
    }

    try {
      setLoading(true);

      // Calculate expiry date (30 days for announcements)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await addDoc(collection(db, 'textAnnouncements'), {
        title: formData.title.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        targetAudience: formData.targetAudience,
        sender: userData?.fullName || userData?.name || 'Unknown',
        senderId: currentUser?.uid || '',
        senderRole: userRole || 'unknown',
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt),
        isHidden: false,
      });

      toast.success('Announcement created successfully!');
      navigate('/announcements');
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-blue-600" />
              Create Announcement
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Send a message or notification to your audience
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Announcement Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g. School Closure Notice, Exam Timetable Released..."
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  maxLength={100}
                />
                <p className="text-xs text-gray-500">{formData.title.length}/100 characters</p>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Type your announcement here. Be clear and concise..."
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500">{formData.message.length}/1000 characters</p>
              </div>

              {/* Priority */}
              <div className="space-y-3">
                <Label>Priority Level</Label>
                <div className="grid grid-cols-3 gap-3">
                  {priorityOptions.map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setFormData({ ...formData, priority: opt.id as any })}
                      className={`
                        flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${formData.priority === opt.id 
                          ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white' 
                          : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-900 dark:border-gray-800 hover:border-gray-400'}
                      `}
                    >
                      <span className="text-sm font-semibold">{opt.label}</span>
                      <span className="text-xs mt-1 opacity-70 text-center">{opt.description}</span>
                    </div>
                  ))}
                </div>
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
                        flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-105
                        ${formData.targetAudience.includes(opt.id) 
                          ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white' 
                          : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-900 dark:border-gray-800 hover:border-gray-400'}
                      `}
                    >
                      <span className="text-2xl mb-2">{opt.icon}</span>
                      <span className="text-sm font-medium text-center">{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sender Info Preview */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm">
                <p className="font-medium text-gray-700 dark:text-gray-300">Announcement will be sent by:</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {userData?.fullName || userData?.name || 'You'} 
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full capitalize">
                    {userRole?.replace('_', ' ')}
                  </span>
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Announcement
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
