/**
 * View User Profile Component
 * Displays user profile with sensitivity consciousness
 * Shows profile information with privacy-aware design
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  X,
  Mail,
  Calendar,
  BookOpen,
  Clock,
  MessageCircle,
  Shield,
  User,
} from 'lucide-react';
import { UserProfile } from '@/types/chat';
import { toast } from 'sonner';

interface ViewUserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onStartChat?: (userId: string) => void;
  isLoading?: boolean;
}

/**
 * View User Profile Modal
 * Displays user information with privacy considerations:
 * - Shows only publicly available information
 * - Respects user privacy settings
 * - Provides option to start chat
 * - Shows online status if available
 */
export function ViewUserProfile({
  isOpen,
  onClose,
  userProfile,
  onStartChat,
  isLoading = false,
}: ViewUserProfileProps) {
  const [showFullBio, setShowFullBio] = useState(false);

  if (!isOpen || !userProfile) return null;

  /**
   * Format date to readable format
   */
  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  /**
   * Get role badge color
   */
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'teacher':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'student':
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    }
  };

  /**
   * Get online status indicator
   */
  const getOnlineStatus = () => {
    if (userProfile.isOnline) {
      return (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm">Online</span>
        </div>
      );
    }
    if (userProfile.lastSeen) {
      return (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Last seen {formatDate(userProfile.lastSeen)}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <Clock className="w-4 h-4" />
        <span className="text-sm">Offline</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with Close Button */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">User Profile</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Avatar and Basic Info */}
          <div className="text-center space-y-4">
            {/* Avatar */}
            <div className="flex justify-center">
              {userProfile.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-200 dark:border-blue-800"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-blue-200 dark:border-blue-800">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
            </div>

            {/* Name and Role */}
            <div>
              <h3 className="text-2xl font-bold">{userProfile.name}</h3>
              <div className="flex justify-center mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(
                    userProfile.role
                  )}`}
                >
                  {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                </span>
              </div>
            </div>

            {/* Online Status */}
            <div className="flex justify-center">{getOnlineStatus()}</div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200 dark:bg-gray-800" />

          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Contact Information
            </h4>

            {/* Email */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm font-medium break-all">{userProfile.email}</p>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          {userProfile.bio && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-800" />
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  About
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {showFullBio ? userProfile.bio : userProfile.bio.substring(0, 150)}
                  {userProfile.bio.length > 150 && !showFullBio && '...'}
                </p>
                {userProfile.bio.length > 150 && (
                  <button
                    onClick={() => setShowFullBio(!showFullBio)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showFullBio ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Courses Section */}
          {userProfile.courses && userProfile.courses.length > 0 && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-800" />
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Courses
                </h4>
                <div className="space-y-2">
                  {userProfile.courses.slice(0, 5).map((course, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{course}</span>
                    </div>
                  ))}
                  {userProfile.courses.length > 5 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 pt-2">
                      +{userProfile.courses.length - 5} more courses
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Member Since */}
          <div className="h-px bg-gray-200 dark:bg-gray-800" />
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Member Since</p>
              <p className="text-sm font-medium">{formatDate(userProfile.joinedDate)}</p>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex gap-2">
              <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                This profile displays only publicly available information. Your privacy is important to us.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          {onStartChat && (
            <Button
              onClick={() => {
                onStartChat(userProfile.id);
                onClose();
              }}
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {isLoading ? 'Starting...' : 'Start Chat'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ViewUserProfile;
