/**
 * View User Profile Component
 * Displays user profile information in a privacy-conscious manner
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Mail, Phone, MapPin } from 'lucide-react';
import type { UserProfile } from '@/types/chat';

interface ViewUserProfileProps {
  profile: UserProfile;
  onClose: () => void;
}

/**
 * Renders a modal displaying user profile information
 * Shows name, email, phone, location, and bio
 */
export function ViewUserProfile({ profile, onClose }: ViewUserProfileProps) {
  const [isLoading] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        {/* Profile Header */}
        <div className="text-center mb-6">
          {profile.avatar && (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
            />
          )}
          <h2 className="text-2xl font-bold">{profile.name}</h2>
          <p className="text-gray-600 text-sm">{profile.status || 'Active'}</p>
        </div>

        {/* Profile Information */}
        <div className="space-y-4 mb-6">
          {/* Email */}
          {profile.email && (
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-gray-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Email</p>
                <p className="text-sm font-medium break-all">{profile.email}</p>
              </div>
            </div>
          )}

          {/* Phone */}
          {profile.phone && (
            <div className="flex items-start gap-3">
              <Phone size={18} className="text-gray-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Phone</p>
                <p className="text-sm font-medium">{profile.phone}</p>
              </div>
            </div>
          )}

          {/* Location */}
          {profile.location && (
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-gray-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Location</p>
                <p className="text-sm font-medium">{profile.location}</p>
              </div>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-2">Bio</p>
              <p className="text-sm text-gray-700">{profile.bio}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={isLoading}
          >
            Close
          </Button>
          <Button
            className="flex-1 bg-blue-500 hover:bg-blue-600"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Send Message'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
