import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Send, 
  Loader2,
  Upload,
  Image as ImageIcon,
  Video,
  X,
  ExternalLink,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createAnnouncement } from '@/services/announcementService';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function CreateAnnouncement() {
  const navigate = useNavigate();
  const { userRole, userData, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    mediaType: 'image' as 'image' | 'video',
    mediaUrl: '',
    mediaFile: null as File | null,
    redirectUrl: '',
    openInNewTab: true,
    targetAudience: [] as string[],
    expiryDays: 7,
  });

  const audienceOptions = [
    { id: 'students', label: 'Students', icon: '👨‍🎓' },
    { id: 'teachers', label: 'Teachers', icon: '👩‍🏫' },
    { id: 'parents', label: 'Parents', icon: '👨‍👩‍👧' },
    { id: 'school_admins', label: 'School Admins', icon: '👔' },
    { id: 'all', label: 'Everyone', icon: '🌍' },
  ];

  const handleAudienceChange = (id: string) => {
    setFormData(prev => {
      // If "all" is selected, clear others
      if (id === 'all') {
        return { ...prev, targetAudience: ['all'] };
      }
      
      // If selecting specific role, remove "all"
      let current = [...prev.targetAudience.filter(a => a !== 'all')];
      
      if (current.includes(id)) {
        current = current.filter(item => item !== id);
      } else {
        current.push(id);
      }
      
      return { ...prev, targetAudience: current };
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast.error('Please select an image or video file');
      return;
    }

    // Validate file size (max 50MB for videos, 10MB for images)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Max size: ${isVideo ? '50MB' : '10MB'}`);
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    setFormData(prev => ({
      ...prev,
      mediaFile: file,
      mediaUrl: previewUrl,
      mediaType: isVideo ? 'video' : 'image',
    }));

    toast.success('File selected successfully');
  };

  const handleUrlInput = () => {
    const url = prompt('Enter image or video URL (e.g., from Pinterest, Instagram, etc.):');
    if (!url) return;

    // Basic URL validation
    try {
      new URL(url);
      
      // Determine type from URL or extension
      const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('video');
      
      setFormData(prev => ({
        ...prev,
        mediaUrl: url,
        mediaFile: null,
        mediaType: isVideo ? 'video' : 'image',
      }));

      toast.success('URL added successfully');
    } catch {
      toast.error('Invalid URL format');
    }
  };

  const clearMedia = () => {
    if (formData.mediaUrl.startsWith('blob:')) {
      URL.revokeObjectURL(formData.mediaUrl);
    }
    setFormData(prev => ({
      ...prev,
      mediaUrl: '',
      mediaFile: null,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const storage = getStorage();
    const fileName = `banners/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    
    setUploadProgress(10);
    await uploadBytes(storageRef, file);
    setUploadProgress(80);
    
    const downloadUrl = await getDownloadURL(storageRef);
    setUploadProgress(100);
    
    return downloadUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.mediaUrl && !formData.mediaFile) {
      toast.error('Please select or enter a media URL');
      return;
    }

    if (formData.targetAudience.length === 0) {
      toast.error('Please select at least one target audience');
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);
      
      let finalMediaUrl = formData.mediaUrl;
      
      // Upload file to Firebase Storage if it's a local file
      if (formData.mediaFile) {
        toast.info('Uploading media...');
        finalMediaUrl = await uploadFile(formData.mediaFile);
        toast.success('Media uploaded successfully');
      }

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + formData.expiryDays);

      await createAnnouncement({
        mediaUrl: finalMediaUrl,
        mediaType: formData.mediaType,
        redirectUrl: formData.redirectUrl.trim() || undefined,
        openInNewTab: formData.openInNewTab,
        sender: userData?.fullName || userData?.name || 'Unknown',
        senderId: currentUser?.uid || '',
        senderRole: (userRole || 'unknown') as any,
        targetAudience: formData.targetAudience,
      });

      toast.success('Dashboard banner created successfully!');
      navigate('/announcements');
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create banner');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Dashboard Banner</h1>
            <p className="text-gray-600 dark:text-gray-400">Upload an image or video advertisement</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Banner Media</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Media Upload Section */}
              <div className="space-y-4">
                <Label>Upload Media (Image or Video) *</Label>
                
                {/* Preview */}
                {formData.mediaUrl && (
                  <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-800">
                    {formData.mediaType === 'image' ? (
                      <img 
                        src={formData.mediaUrl} 
                        alt="Banner preview" 
                        className="w-full h-auto max-h-96 object-contain bg-gray-100 dark:bg-gray-900"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          toast.error('Failed to load image. Please check the URL.');
                        }}
                      />
                    ) : (
                      <video 
                        src={formData.mediaUrl} 
                        controls 
                        className="w-full h-auto max-h-96 bg-gray-100 dark:bg-gray-900"
                        onError={() => {
                          toast.error('Failed to load video. Please check the URL.');
                        }}
                      >
                        Your browser does not support video playback.
                      </video>
                    )}
                    
                    <button
                      type="button"
                      onClick={clearMedia}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                {/* Upload Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 h-auto py-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-semibold">Upload File</div>
                      <div className="text-xs text-gray-500">From your device</div>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 h-auto py-4"
                    onClick={handleUrlInput}
                  >
                    <ExternalLink className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-semibold">Enter URL</div>
                      <div className="text-xs text-gray-500">From external source</div>
                    </div>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 h-auto py-4"
                    disabled={!formData.mediaUrl}
                    onClick={() => {
                      if (formData.mediaUrl) {
                        window.open(formData.mediaUrl, '_blank');
                      }
                    }}
                  >
                    <Eye className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-semibold">Preview</div>
                      <div className="text-xs text-gray-500">Open in new tab</div>
                    </div>
                  </Button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  💡 Tip: You can upload images/videos from your device or use direct URLs from Pinterest, Instagram, Ideogram, Facebook, or other platforms
                </p>
              </div>

              {/* Media Type */}
              <div className="space-y-2">
                <Label>Media Type</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={formData.mediaType === 'image' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, mediaType: 'image' })}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Image
                  </Button>
                  <Button
                    type="button"
                    variant={formData.mediaType === 'video' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, mediaType: 'video' })}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Video
                  </Button>
                </div>
              </div>

              {/* Redirect URL */}
              <div className="space-y-2">
                <Label htmlFor="redirectUrl">Redirect URL (Optional)</Label>
                <Input 
                  id="redirectUrl" 
                  type="text"
                  placeholder="https://example.com or /courses/123" 
                  value={formData.redirectUrl}
                  onChange={e => setFormData({ ...formData, redirectUrl: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="openInNewTab"
                    checked={formData.openInNewTab}
                    onChange={e => setFormData({ ...formData, openInNewTab: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="openInNewTab" className="cursor-pointer text-sm">
                    Open in new tab
                  </Label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  When users click the banner, they will be redirected to this URL
                </p>
              </div>

              {/* Target Audience */}
              <div className="space-y-3">
                <Label>Target Audience *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {audienceOptions.map(opt => (
                    <div 
                      key={opt.id}
                      onClick={() => handleAudienceChange(opt.id)}
                      className={`
                        flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-105
                        ${formData.targetAudience.includes(opt.id) 
                          ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white' 
                          : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-900 dark:border-gray-800 hover:border-gray-400'}
                      `}
                    >
                      <span className="text-2xl mb-2">{opt.icon}</span>
                      <span className="text-sm font-medium text-center">{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expiry Days */}
              <div className="space-y-2">
                <Label htmlFor="expiryDays">Expiry (Days)</Label>
                <Input 
                  id="expiryDays" 
                  type="number"
                  min="1"
                  max="365"
                  value={formData.expiryDays}
                  onChange={e => setFormData({ ...formData, expiryDays: parseInt(e.target.value) || 7 })}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Banner will automatically hide after {formData.expiryDays} days
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Create Banner
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
