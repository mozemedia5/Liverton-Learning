import { Bell, ChevronRight, MessageCircle, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAccountSetupStatus } from '@/services/accountSetupService';
import { useUnreadChatsCount } from '@/hooks/useUnreadChats';
import { useUnreadNotificationsCount } from '@/hooks/useUnreadNotifications';

export default function ActivitySummaryCard() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const unreadChats = useUnreadChatsCount();
  const unreadNotifications = useUnreadNotificationsCount();
  const setup = getAccountSetupStatus(userData, currentUser);
  const total = unreadChats + unreadNotifications;

  return (
    <section className="liv-card liv-activity-summary" aria-label="Activity summary">
      <div className="liv-section-head" style={{ margin: 0 }}>
        <div><span className="liv-eyebrow">Your activity</span><h2>Stay up to date</h2></div>
        {total > 0 && <span className="liv-activity-total">{total > 99 ? '99+' : total}</span>}
      </div>
      <div className="liv-activity-grid">
        <button className="liv-list-row" onClick={() => navigate('/chat')}>
          <span className="liv-row-icon"><MessageCircle size={17} /></span>
          <span><strong>{unreadChats || 'No new'} Chat {unreadChats === 1 ? 'message' : 'messages'}</strong><small>Open your conversation inbox</small></span>
          <ChevronRight size={16} />
        </button>
        <button className="liv-list-row" onClick={() => navigate('/announcements')}>
          <span className="liv-row-icon"><Bell size={17} /></span>
          <span><strong>{unreadNotifications || 'No new'} announcement{unreadNotifications === 1 ? '' : 's'}</strong><small>Review updates, reminders, and approvals</small></span>
          <ChevronRight size={16} />
        </button>
        {setup.progress < 100 && <button className="liv-list-row" onClick={() => navigate('/profile')}>
          <span className="liv-row-icon"><UserRound size={17} /></span>
          <span><strong>Complete your profile</strong><small>{setup.progress}% complete · {setup.missingSteps[0] || 'one step'} remaining</small></span>
          <ChevronRight size={16} />
        </button>}
      </div>
    </section>
  );
}
