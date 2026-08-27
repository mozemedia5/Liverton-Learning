import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { isNotificationVisibleToUser, requestNotificationPermission, showNotification, subscribeToVisibleNotifications } from '@/services/notificationService';
import { registerPushToken } from '@/services/pushNotificationService';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardHeaderProps {
  /** Optional small caption under the greeting, defaults to today's date */
  subtitle?: string;
}

/**
 * DashboardHeader - mobile-app style top bar for every dashboard.
 * Greeting on the left ("Hello, <name>"), notification bell with an
 * unread badge in the upper right corner and the user avatar.
 */
export function DashboardHeader({ subtitle }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { userData, userRole, currentUser } = useAuth();
  const [unread, setUnread] = useState(0);

  const firstName = useMemo(() => {
    const full = userData?.fullName?.trim();
    if (!full) return 'there';
    return full.split(/\s+/)[0];
  }, [userData?.fullName]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    []
  );

  useEffect(() => {
    if (!currentUser?.uid) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') void registerPushToken();
  }, [currentUser?.uid, currentUser?.email]);

  // Live unread notification count for the bell badge
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = subscribeToVisibleNotifications(currentUser.uid, currentUser.email, userRole, (notifications) => {
        const now = new Date();
        let count = 0;
        notifications.forEach((data) => {
          if (data.isHidden) return;
          const expiresAt = data.expiresAt?.toDate?.() as Date | undefined;
          if (expiresAt && expiresAt <= now) return;
          if (!isNotificationVisibleToUser(data, currentUser.uid, currentUser.email, userRole)) return;

          const readBy: string[] = Array.isArray(data.readBy) ? data.readBy : [];
          const isUserRead = readBy.includes(currentUser.uid) || data.isRead === true;
          if (!isUserRead) count += 1;
        });
        setUnread(count);
      },
      (error) => {
        console.error('Notification badge error:', error);
      },
      (notification) => {
        if (notification.isHidden || notification.isRead === true) return;
        showNotification({
          title: String(notification.title || 'Liverton Learning'),
          message: String(notification.message || 'You have a new notification.'),
          tag: `notification-${notification.id}`,
          data: { redirectUrl: notification.redirectUrl || '/announcements' },
        });
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, currentUser?.email, userRole]);

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Greeting */}
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate">
          {subtitle || today}
        </p>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
          Hello, {firstName}
        </h1>
      </div>

      {/* Upper-right actions: search (desktop), notifications bell, avatar */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <button
          onClick={() => navigate('/courses')}
          className="hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm transition-colors"
          title="Search courses"
        >
          <Search className="w-5 h-5" />
        </button>

        <button
          onClick={() => { void requestNotificationPermission().then(() => registerPushToken()); navigate('/announcements'); }}
          className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md text-white font-bold"
          title="Profile"
        >
          {userData?.fullName?.charAt(0).toUpperCase() || 'U'}
        </button>
      </div>
    </div>
  );
}

export default DashboardHeader;
