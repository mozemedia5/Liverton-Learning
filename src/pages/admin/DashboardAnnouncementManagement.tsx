/**
 * Dashboard Announcement Management Page
 * Admin-only page for creating and managing dashboard announcements
 * Features: Create image/video/text announcements, set expiry, manage active announcements
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Plus,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Calendar,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { DashboardAnnouncement, AnnouncementType } from '@/types/announcement';

export default function DashboardAnnouncementManagement() {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  
  // Check if user is admin
  const isAdmin = userData?.role === 'admin' || userData?.isAdmin;
  
  // State
  const [announcements, setAnnouncements] = useState<DashboardAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form state
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>('image');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [expiryDays, setExpiryDays] = useState(2);
  const [priority, setPriority] = useState(5);
  const [backgroundColor, setBackgroundColor] = useState('#3B82F6');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [targetAudience, setTargetAudience] = useState<'all' | 'students' | 'teachers' | 'admins'>('all');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // Load announcements
  useEffect(() => {
    if (!currentUser || !isAdmin) return;

    const q = query(collection(db, 'dashboardAnnouncements'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcementsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DashboardAnnouncement[];
      
      // Sort by priority (descending) and creation date (descending)
      const sorted = announcementsList.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setAnnouncements(sorted);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading announcements:', error);
      toast.error('Failed to load announcements');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, isAdmin]);

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle video file selection
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video must be less than 50MB');
      return;
    }

    setVideoFile(file);
  };

  // Upload file to Firebase Storage
  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storage = getStorage();
    const fileRef = ref(storage, `announcements/${path}/${Date.now()}_${file.name}`);
    
    const snapshot = await uploadBytes(fileRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    return downloadUrl;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (announcementType === 'image' && !imageFile) {
      toast.error('Please select an image');
      return;
    }

    if (announcementType === 'video' && !videoFile) {
      toast.error('Please select a video');
      return;
    }

    if (announcementType === 'text' && !content.trim()) {
      toast.error('Content is required for text announcements');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let imageUrl = '';
      let videoUrl = '';

      // Upload files
      if (announcementType === 'image' && imageFile) {
        setUploadProgress(30);
        imageUrl = await uploadFile(imageFile, 'images');
        setUploadProgress(60);
      }

      if (announcementType === 'video' && videoFile) {
        setUploadProgress(30);
        videoUrl = await uploadFile(videoFile, 'videos');
        setUploadProgress(60);
      }

      setUploadProgress(80);

      // Calculate expiry date
      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      );

      // Create announcement
      const announcementData: Omit<DashboardAnnouncement, 'id'> = {
        title: title.trim(),
        description: description.trim(),
        type: announcementType,
        imageUrl,
        videoUrl,
        content: content.trim(),
        redirectUrl: redirectUrl.trim(),
        openInNewTab,
        createdBy: currentUser!.uid,
        createdByName: (userData as any)?.displayName || 'Admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt,
        expiryDays,
        status: 'active',
        priority,
        backgroundColor,
        textColor,
        views: 0,
        clicks: 0,
        isActive: true,
        targetAudience,
      };

      await addDoc(collection(db, 'dashboardAnnouncements'), announcementData);

      setUploadProgress(100);
      toast.success('Announcement created successfully!');
      
      // Reset form
      resetForm();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  // Reset form
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setContent('');
    setRedirectUrl('');
    setOpenInNewTab(true);
    setExpiryDays(2);
    setPriority(5);
    setBackgroundColor('#3B82F6');
    setTextColor('#FFFFFF');
    setTargetAudience('all');
    setImageFile(null);
    setVideoFile(null);
    setImagePreview('');
    setAnnouncementType('image');
  };

  // Toggle announcement active status
  const toggleAnnouncementStatus = async (announcementId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'dashboardAnnouncements', announcementId), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Announcement ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast.error('Failed to update announcement');
    }
  };

  // Delete announcement
  const deleteAnnouncement = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await deleteDoc(doc(db, 'dashboardAnnouncements', announcementId));
      toast.success('Announcement deleted');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Dashboard Announcements
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Create and manage promotional banners for user dashboards
              </p>
            </div>
          </div>
          {!showCreateForm && (
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </Button>
          )}
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create New Announcement
              </h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Announcement Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Announcement Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAnnouncementType('image')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                      announcementType === 'image'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-sm font-medium">Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnouncementType('video')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                      announcementType === 'video'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <VideoIcon className="w-6 h-6" />
                    <span className="text-sm font-medium">Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnnouncementType('text')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                      announcementType === 'text'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <FileText className="w-6 h-6" />
                    <span className="text-sm font-medium">Text</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter announcement title"
                  required
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description (optional)"
                  rows={2}
                  maxLength={200}
                />
              </div>

              {/* Image Upload */}
              {announcementType === 'image' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Image * (Max 5MB)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview('');
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click to upload image
                        </p>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Video Upload */}
              {announcementType === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Video * (Max 50MB)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                    {videoFile ? (
                      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                          <VideoIcon className="w-8 h-8 text-blue-500" />
                          <div className="text-left">
                            <p className="text-sm font-medium">{videoFile.name}</p>
                            <p className="text-xs text-gray-500">
                              {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVideoFile(null)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoChange}
                          className="hidden"
                        />
                        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click to upload video
                        </p>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Text Content */}
              {announcementType === 'text' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Content *
                    </label>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Enter announcement content"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Background Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="w-12 h-10 rounded border border-gray-300 dark:border-gray-700 cursor-pointer"
                        />
                        <Input
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Text Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-12 h-10 rounded border border-gray-300 dark:border-gray-700 cursor-pointer"
                        />
                        <Input
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Redirect URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Redirect URL (Optional)
                </label>
                <Input
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="openInNewTab"
                    checked={openInNewTab}
                    onChange={(e) => setOpenInNewTab(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="openInNewTab" className="text-sm text-gray-600 dark:text-gray-400">
                    Open in new tab
                  </label>
                </div>
              </div>

              {/* Settings Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Expiry Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Expiry (Days)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(parseInt(e.target.value) || 2)}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority (1-10)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) || 5)}
                  />
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="all">All Users</option>
                    <option value="students">Students</option>
                    <option value="teachers">Teachers</option>
                    <option value="admins">Admins</option>
                  </select>
                </div>
              </div>

              {/* Upload Progress */}
              {isSubmitting && uploadProgress > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Uploading... {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Announcement
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Announcements List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            All Announcements ({announcements.length})
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : announcements.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <ImageIcon className="w-16 h-16 mx-auto mb-2" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No announcements yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first dashboard announcement to get started
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Announcement
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {announcements.map((announcement) => (
                <Card key={announcement.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {announcement.type === 'image' && <ImageIcon className="w-5 h-5 text-blue-500" />}
                        {announcement.type === 'video' && <VideoIcon className="w-5 h-5 text-purple-500" />}
                        {announcement.type === 'text' && <FileText className="w-5 h-5 text-green-500" />}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {announcement.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          announcement.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {announcement.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {announcement.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {announcement.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {announcement.views} views
                        </span>
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
                          {announcement.clicks} clicks
                        </span>
                        <span>Priority: {announcement.priority}</span>
                        <span>Expires: {new Date(announcement.expiresAt?.toMillis?.() || 0).toLocaleDateString()}</span>
                        <span className="capitalize">Target: {announcement.targetAudience}</span>
                      </div>

                      {announcement.redirectUrl && (
                        <a
                          href={announcement.redirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:text-blue-600 mt-2 inline-flex items-center gap-1"
                        >
                          {announcement.redirectUrl}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleAnnouncementStatus(announcement.id, announcement.isActive)}
                        title={announcement.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {announcement.isActive ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteAnnouncement(announcement.id)}
                        className="text-red-500 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
