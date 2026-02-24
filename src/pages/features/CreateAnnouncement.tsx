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
  Link as LinkIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createAnnouncement } from '@/services/announcementService';

export default function CreateAnnouncement() {
  const navigate = useNavigate();
  const { userRole, userData, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'General',
    priority: 'normal' as 'low' | 'normal' | 'high',
    targetAudience: [] as string[],
    link: '', // Optional internal link
  });

  const audienceOptions = [
    { id: 'students', label: 'Students' },
    { id: 'teachers', label: 'Teachers' },
    { id: 'parents', label: 'Parents' },
    { id: 'school_admins', label: 'School Admins' },
  ];

  const categoryOptions = [
    'General',
    'Academic',
    'Financial',
    'Events',
    'System',
    'Urgent',
  ];

  const handleAudienceChange = (id: string) => {
    setFormData(prev => {
      const current = [...prev.targetAudience];
      if (current.includes(id)) {
        return { ...prev, targetAudience: current.filter(item => item !== id) };
      } else {
        return { ...prev, targetAudience: [...current, id] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.targetAudience.length === 0) {
      toast.error('Please select at least one target audience');
      return;
    }

    try {
      setLoading(true);
      await createAnnouncement({
        title: formData.title,
        message: formData.message,
        category: formData.category,
        priority: formData.priority,
        targetAudience: formData.targetAudience,
        sender: userData?.fullName || userData?.name || 'Unknown',
        senderId: currentUser?.uid || '',
        senderRole: (userRole || 'unknown') as any,
        link: formData.link.trim() || undefined, // Only include if not empty
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
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Announcement</h1>
            <p className="text-gray-600 dark:text-gray-400">Post a new update for the platform</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Announcement Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input 
                  id="title" 
                  placeholder="Enter announcement title" 
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select 
                    id="category"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categoryOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <select 
                    id="priority"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Target Audience *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {audienceOptions.map(opt => (
                    <div 
                      key={opt.id}
                      onClick={() => handleAudienceChange(opt.id)}
                      className={`
                        flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                        ${formData.targetAudience.includes(opt.id) 
                          ? 'bg-black text-white border-black dark:bg-white dark:text-black' 
                          : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-900 dark:border-gray-800'}
                      `}
                    >
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea 
                  id="message" 
                  placeholder="Type your announcement message here..." 
                  className="min-h-[200px]"
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link" className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Link (Optional)
                </Label>
                <Input 
                  id="link" 
                  type="text"
                  placeholder="e.g., /courses/123 or /lessons/456" 
                  value={formData.link}
                  onChange={e => setFormData({ ...formData, link: e.target.value })}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Add an internal link to redirect users to a specific course or lesson page
                </p>
              </div>

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
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Post Announcement
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
