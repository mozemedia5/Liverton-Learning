import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  ArrowLeft, 
  Bell, 
  Calendar,
  User,
  Plus,
  Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  message: string;
  sender: string;
  senderRole: string;
  targetAudience: string[];
  category: string;
  date: string;
  priority: 'low' | 'normal' | 'high';
}

const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Term 2 Examination Schedule',
    message: 'The Term 2 examinations will begin on March 15th. Please ensure all students are prepared and have reviewed the examination guidelines.',
    sender: 'Principal Williams',
    senderRole: 'school_admin',
    targetAudience: ['students', 'teachers', 'parents'],
    category: 'Academic',
    date: '2026-02-10',
    priority: 'high',
  },
  {
    id: '2',
    title: 'New Course: Advanced Physics',
    message: 'We are excited to announce a new Advanced Physics course starting next month. Enroll now to secure your spot!',
    sender: 'Mr. Johnson',
    senderRole: 'teacher',
    targetAudience: ['students'],
    category: 'Courses',
    date: '2026-02-09',
    priority: 'normal',
  },
  {
    id: '3',
    title: 'School Fee Payment Reminder',
    message: 'This is a reminder that Term 2 school fees are due by February 28th. Please make payments through the portal.',
    sender: 'Finance Office',
    senderRole: 'school_admin',
    targetAudience: ['students', 'parents'],
    category: 'Finance',
    date: '2026-02-08',
    priority: 'high',
  },
  {
    id: '4',
    title: 'Teacher Training Workshop',
    message: 'All teachers are invited to attend a professional development workshop on February 20th.',
    sender: 'Ms. Davis',
    senderRole: 'school_admin',
    targetAudience: ['teachers'],
    category: 'Professional Development',
    date: '2026-02-07',
    priority: 'normal',
  },
  {
    id: '5',
    title: 'Platform Maintenance Notice',
    message: 'The platform will undergo maintenance on February 15th from 2 AM to 4 AM UTC. Some features may be unavailable.',
    sender: 'Liverton Support',
    senderRole: 'platform_admin',
    targetAudience: ['students', 'teachers', 'school_admin', 'parents'],
    category: 'System',
    date: '2026-02-06',
    priority: 'low',
  },
];

const categories = ['All', 'Academic', 'Courses', 'Finance', 'System', 'Professional Development'];
const priorities = ['All', 'High', 'Normal', 'Low'];

export default function Announcements() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');

  const filteredAnnouncements = mockAnnouncements.filter(announcement => {
    const matchesCategory = selectedCategory === 'All' || announcement.category === selectedCategory;
    const matchesPriority = selectedPriority === 'All' || announcement.priority === selectedPriority.toLowerCase();
    return matchesCategory && matchesPriority;
  });

  const canCreateAnnouncement = userRole === 'school_admin' || userRole === 'teacher' || userRole === 'platform_admin';

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold">Announcements</span>
            </div>
          </div>
          {canCreateAnnouncement && (
            <Button onClick={() => toast.info('Create announcement feature coming soon!')}>
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Filter className="w-5 h-5 mt-2 text-gray-500" />
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {priorities.map((priority) => (
              <Button
                key={priority}
                variant={selectedPriority === priority ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPriority(priority)}
                className="whitespace-nowrap"
              >
                {priority}
              </Button>
            ))}
          </div>
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <Card key={announcement.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{announcement.title}</h3>
                      <Badge className={getPriorityColor(announcement.priority)}>
                        {announcement.priority}
                      </Badge>
                      <Badge variant="outline">{announcement.category}</Badge>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      {announcement.message}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {announcement.sender}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {announcement.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bell className="w-4 h-4" />
                        For: {announcement.targetAudience.join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No announcements found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters</p>
          </div>
        )}
      </main>
    </div>
  );
}
