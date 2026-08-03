import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/SEO';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Globe, Loader2, MapPin, School, Share2, User as UserIcon } from 'lucide-react';
import { getUserById } from '@/services/userService';
import { optimizeCloudinaryUrl } from '@/services/cloudinaryService';
import { absoluteUrl } from '@/lib/seo';
import type { User } from '@/types';

/**
 * Shareable public profile page (/profile/:userId).
 * Shows the public-facing profile of any Liverton Learning member.
 */
export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Viewing your own profile → use the full profile editor
    if (userId && currentUser?.uid === userId) {
      navigate('/profile', { replace: true });
      return;
    }
    const load = async () => {
      if (!userId) return;
      try {
        const data = await getUserById(userId);
        if (!data) {
          setNotFound(true);
        } else {
          setProfile(data as unknown as User);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, currentUser?.uid, navigate]);

  const handleShare = async () => {
    const url = absoluteUrl(`/profile/${userId}`);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied to clipboard');
    } catch {
      toast.info(url);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-slate-400">Loading profile...</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <UserIcon className="w-10 h-10 text-slate-300" />
        <p className="font-semibold">Profile not found</p>
        <Button variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Go back
        </Button>
      </div>
    );
  }

  const photo = profile.profilePicture || profile.profileImageUrl;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SEO
        title={`${profile.fullName} on Liverton Learning`}
        description={profile.bio?.slice(0, 155) || `${profile.fullName} — ${profile.role.replace('_', ' ')} on Liverton Learning.`}
        path={`/profile/${userId}`}
        image={photo ? optimizeCloudinaryUrl(photo, { width: 600, crop: 'fill', gravity: 'auto' }) : undefined}
        type="profile"
      />

      <Card className="overflow-hidden py-0 gap-0">
        <div className="h-28 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 relative">
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 left-4 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-1.5" /> Share
          </Button>
        </div>

        <CardContent className="p-6 pt-14 relative">
          <div className="absolute left-6 -top-10 w-20 h-20 rounded-2xl border-4 border-white dark:border-slate-900 bg-emerald-500 overflow-hidden shadow-xl">
            {photo ? (
              <img
                src={optimizeCloudinaryUrl(photo, { width: 160, crop: 'fill', gravity: 'auto' })}
                alt={profile.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{profile.fullName}</h1>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 capitalize">
                  {profile.role.replace('_', ' ')}
                </Badge>
              </div>
              {profile.bio && <p className="text-sm text-slate-500 dark:text-slate-400">{profile.bio}</p>}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1">
              {profile.country && (
                <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {profile.country}</span>
              )}
              {profile.schoolName && (
                <span className="flex items-center gap-1"><School className="w-3.5 h-3.5" /> {profile.schoolName}</span>
              )}
              {profile.address && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {profile.address}</span>
              )}
              {profile.subjectsTaught && profile.subjectsTaught.length > 0 && (
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {profile.subjectsTaught.join(', ')}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
