/**
 * View Profile Component
 * Displays user profile information with non-sensitive data only
 * Shows: Name, Role, Class/School, Avatar
 * Hides: Email, Phone, Sensitive personal information
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Mail, BookOpen, Building2, Calendar } from 'lucide-react';
import type { UserProfile } from '@/types/chat';

interface ViewProfileProps {
  user: UserProfile;
  onClose: () => void;
}

/**
 * Renders user profile with safe, non-sensitive information
 * Displays: Avatar, Name, Role, Class, School, Join Date
 * Does NOT display: Email, Phone, Sensitive data
 */
export function ViewProfile({ user, onClose }: ViewProfileProps) {
  // Format join date
  const formatJoinDate = (date: any): string => {
    if (!date) return 'Unknown';
    
    let dateObj: Date;
    if (date.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return 'Unknown';
    }

    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Determine role badge color
  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'student':
        return 'bg-blue-100 text-blue-800';
      case 'teacher':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 bg-white relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition"
        >
          <X size={20} />
        </button>

        {/* Profile Header */}
        <div className="text-center mb-6">
          {/* Avatar */}
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-blue-500"
            />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Name */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{user.name}</h2>

          {/* Role Badge */}
          <div className="inline-block">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${getRoleBadgeColor(
                user.role
              )}`}
            >
              {user.role}
            </span>
          </div>
        </div>

        {/* Profile Information */}
        <div className="space-y-4 mb-6">
          {/* Class/Grade */}
          {user.courses && user.courses.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <BookOpen size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Classes</p>
                <p className="text-gray-900">
                  {user.courses.join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* School/Institution */}
          {user.location && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Building2 size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600 font-medium">School/Institution</p>
                <p className="text-gray-900">{user.location}</p>
              </div>
            </div>
          )}

          {/* Join Date */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar size={20} className="text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-600 font-medium">Joined</p>
              <p className="text-gray-900">{formatJoinDate(user.joinedDate)}</p>
            </div>
          </div>

          {/* Bio/Status */}
          {user.status && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 font-medium mb-1">Status</p>
              <p className="text-gray-900 italic">"{user.status}"</p>
            </div>
          )}

          {/* Online Status */}
          {user.isOnline !== undefined && (
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span className="text-sm text-gray-600">
                {user.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            ℹ️ This profile shows only public information. Sensitive data is protected.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
