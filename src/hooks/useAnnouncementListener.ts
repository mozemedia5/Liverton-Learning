import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Custom hook to listen for new announcements in real-time
 * and display a notification toast to the user.
 */
export const useAnnouncementListener = () => {
  const { userRole, isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();
  const lastProcessedTime = useRef<number>(Date.now());
  const isInitialLoad = useRef<boolean>(true);

  useEffect(() => {
    if (!isAuthenticated || !userRole) return;

    // Query for the most recent announcements
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Skip the very first snapshot to avoid notifying about old announcements on login
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        if (!snapshot.empty) {
          const latest = snapshot.docs[0].data();
          const createdAt = latest.createdAt as Timestamp;
          if (createdAt) {
            lastProcessedTime.current = createdAt.toMillis();
          }
        }
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const announcement = change.doc.data();
          const createdAt = announcement.createdAt as Timestamp;
          const announcementTime = createdAt ? createdAt.toMillis() : Date.now();

          // Only process announcements created after the listener started or the last processed one
          if (announcementTime > lastProcessedTime.current) {
            // Update last processed time
            lastProcessedTime.current = announcementTime;

            const targetAudience = announcement.targetAudience as string[] || [];
            const senderId = announcement.senderId;
            
            // Don't notify the sender themselves
            if (senderId === currentUser?.uid) return;

            // Check if current user is in the target audience
            // Audience IDs are: 'students', 'teachers', 'parents', 'school_admins'
            const roleToAudienceMap: Record<string, string> = {
              'student': 'students',
              'teacher': 'teachers',
              'parent': 'parents',
              'school_admin': 'school_admins',
              'platform_admin': 'all' // Platform admins see everything
            };

            const userAudience = roleToAudienceMap[userRole] || '';
            const isTargeted = userRole === 'platform_admin' || 
                               targetAudience.includes(userAudience) || 
                               targetAudience.includes('all');

            if (isTargeted) {
              toast.info('New Announcement', {
                description: announcement.title,
                duration: 6000,
                action: {
                  label: 'View',
                  onClick: () => navigate('/announcements'),
                },
              });
            }
          }
        }
      });
    }, (error) => {
      console.error('Error listening for announcements:', error);
    });

    return () => unsubscribe();
  }, [isAuthenticated, userRole, navigate]);
};

export default useAnnouncementListener;
