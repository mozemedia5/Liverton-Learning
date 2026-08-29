import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, SlidersHorizontal, Sparkles, BookOpen, MessageSquare, FileText, Video, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  priority?: string;
  sender?: string;
  createdAt?: any;
}

export default function SalafDashboardHeader({
  searchPlaceholder = "Search courses, materials, quizzes...",
  onSearchChange,
  categoryButtons,
}: {
  searchPlaceholder?: string;
  onSearchChange?: (val: string) => void;
  categoryButtons?: Array<{ label: string; icon: any; path: string; color?: string }>;
}) {
  const navigate = useNavigate();
  const { userData, userRole } = useAuth();
  const [searchVal, setSearchVal] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Subscribe to textAnnouncements (now Motivations & Notifications)
  useEffect(() => {
    const q = query(collection(db, 'textAnnouncements'), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title || 'Motivation & Notice',
          message: d.message || '',
          priority: d.priority || 'normal',
          sender: d.sender || 'System',
          createdAt: d.createdAt?.toDate?.() || new Date(),
        } as NotificationItem;
      });
      setNotifications(list);
    }, (err) => {
      console.error('Notifications load error:', err);
    });
    return () => unsub();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearchChange?.(e.target.value);
  };

  const defaultCategories = [
    { label: 'Courses', icon: BookOpen, path: userRole === 'teacher' ? '/teacher/courses' : '/student/courses', color: 'bg-blue-600' },
    { label: 'Quizzes', icon: Award, path: userRole === 'teacher' ? '/teacher/quizzes' : '/student/quizzes', color: 'bg-indigo-600' },
    { label: 'Live Lessons', icon: Video, path: userRole === 'teacher' ? '/teacher/zoom-lessons' : '/student/zoom-lessons', color: 'bg-purple-600' },
    { label: 'Hanna AI', icon: Sparkles, path: '/features/hanna-ai', color: 'bg-pink-600' },
    { label: 'Chat', icon: MessageSquare, path: '/chat', color: 'bg-emerald-600' },
    { label: 'Documents', icon: FileText, path: '/documents', color: 'bg-amber-600' },
  ];

  const buttons = categoryButtons || defaultCategories;

  return (
    <div className="space-y-4 mb-6">
      {/* ── Top Row: Profile greeting & Corner Notification Bell ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            onClick={() => navigate('/profile')}
            className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-md cursor-pointer hover:scale-105 transition-transform bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
          >
            {userData?.profileImageUrl ? (
              <img src={userData.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-base font-bold text-blue-600">
                {(userData?.fullName || userData?.name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
              Hello 👋
            </p>
            <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-white leading-tight">
              {userData?.fullName || userData?.name || 'Learner'}
            </h2>
          </div>
        </div>

        {/* Corner Notification Bell */}
        <button
          onClick={() => setShowNotificationsModal(true)}
          className="relative w-11 h-11 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900 shadow">
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Capsule Search Bar ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchVal}
            onChange={handleSearch}
            placeholder={searchPlaceholder}
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/30 transition-all placeholder:text-gray-400 shadow-sm"
          />
        </div>
        <button
          onClick={() => navigate('/motivations')}
          className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md active:scale-95 transition-all flex-shrink-0"
          title="Motivations & Notices"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* ── Category Circles Row ── */}
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide py-2 px-1">
        {buttons.map((btn) => {
          const Icon = btn.icon;
          return (
            <div
              key={btn.label}
              onClick={() => navigate(btn.path)}
              className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group"
            >
              <div className={`w-14 h-14 rounded-full ${btn.color || 'bg-blue-600'} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {btn.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Notifications / Motivations Modal ── */}
      <Dialog open={showNotificationsModal} onOpenChange={setShowNotificationsModal}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="pb-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold">Motivations & Notifications</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-3 my-4 max-h-[60vh] overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No new motivations or notifications</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{item.title}</span>
                    <span className="text-[10px] text-gray-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Today'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{item.message}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
