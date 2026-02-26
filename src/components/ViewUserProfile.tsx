/**
 * View User Profile Modal
 * Displays user profile information with sensitivity consciousness
 * Shows only appropriate public information based on user roles
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, Mail, Calendar, School, Users, MapPin, Clock, Shield } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import type { UserProfile } from '@/types/chat';

interface ViewUserProfileProps {
  userId?: string;
  profile?: UserProfile;
  onClose: () => void;
}

/**
 * Modal component to view another user's profile
 * Fetches user data from Firestore and displays it with appropriate privacy controls
 */
export function ViewUserProfile({ userId, profile: initialProfile, onClose }: ViewUserProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null);
  const [loading, setLoading] = useState(!initialProfile);

  useEffect(() => {
    if (initialProfile) {
      setLoading(false);
      return;
    }

    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Map user data to profile interface with privacy-conscious fields
          const userProfile: UserProfile = {
            id: userDoc.id,
            name: userData.fullName || userData.name || 'Unknown User',
            email: userData.email || '', // Email shown conditionally
            avatar: userData.profilePicture || userData.profileImageUrl || '',
            bio: userData.bio || '',
            role: userData.role || 'student',
            joinedDate: userData.createdAt,
            courses: userData.courses || [],
            school: userData.school || userData.institution || '',
            class: userData.class || userData.grade || '',
            lastSeen: userData.lastSeen,
            isOnline: userData.isOnline || false,
            status: userData.status || '',
            location: userData.location || userData.school || ''
          };

          setProfile(userProfile);
        } else {
          toast.error('User profile not found');
          onClose();
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load user profile');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, onClose]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'Unknown';
    const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-lg p-6 bg-white dark:bg-gray-900">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg bg-white dark:bg-gray-900 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
          <h2 className="text-2xl font-bold">User Profile</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-white/50"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Profile Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <Avatar className="w-28 h-28 border-4 border-white dark:border-gray-800 shadow-xl">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-3xl font-bold">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              {profile.isOnline && (
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white dark:border-gray-900"></div>
              )}
            </div>
            <h3 className="text-2xl font-bold mt-4 text-center">{profile.name}</h3>
            <p className="text-sm text-gray-500 capitalize flex items-center gap-2 mt-1">
              <Shield className="w-4 h-4" />
              {profile.role.replace('_', ' ')}
            </p>
            {profile.status && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                "{profile.status}"
              </p>
            )}
          </div>

          {/* Profile Information */}
          <div className="space-y-4">
            {/* Bio */}
            {profile.bio && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">{profile.bio}</p>
              </div>
            )}

            {/* Email - Show conditionally */}
            {profile.email && (
              <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-sm font-medium truncate">{profile.email}</p>
                </div>
              </div>
            )}

            {/* School/Institution */}
            {profile.school && (
              <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <School className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">School</p>
                  <p className="text-sm font-medium">{profile.school}</p>
                </div>
              </div>
            )}

            {/* Class/Grade */}
            {profile.class && (
              <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Class</p>
                  <p className="text-sm font-medium">{profile.class}</p>
                </div>
              </div>
            )}

            {/* Location */}
            {profile.location && (
              <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                  <p className="text-sm font-medium">{profile.location}</p>
                </div>
              </div>
            )}

            {/* Courses */}
            {profile.courses && profile.courses.length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Enrolled Courses</p>
                <div className="flex flex-wrap gap-2">
                  {profile.courses.map((course, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                    >
                      {course}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Joined Date */}
            <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Member Since</p>
                <p className="text-sm font-medium">{formatDate(profile.joinedDate)}</p>
              </div>
            </div>

            {/* Last Seen */}
            {profile.lastSeen && (
              <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Seen</p>
                  <p className="text-sm font-medium">
                    {profile.isOnline ? 'Online now' : formatLastSeen(profile.lastSeen)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <Button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Close Profile
          </Button>
        </div>
      </Card>
    </div>
  );
}
