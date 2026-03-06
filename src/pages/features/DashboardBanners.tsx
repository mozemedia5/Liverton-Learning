import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  BookOpen, 
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
  Upload,
  Save,
  FileText,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { db, storage } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  Timestamp,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DashboardBanner {
  id: string;
  title: string;
  message: string;
  imageUrl: string;
  backgroundColor: string;
  textColor: string;
  linkType: 'internal' | 'external' | 'none';
  link?: string;
  isActive: boolean;
  isDraft: boolean;
  targetRoles: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  order: number;
}

// In-app link options
const inAppLinks = [
  { value: '/features/hanna-ai', label: 'Hanna AI' },
  { value: '/student/courses', label: 'Courses' },
  { value: '/student/quizzes', label: 'Quizzes' },
  { value: '/student/zoom-lessons', label: 'Live Lessons' },
  { value: '/teacher/courses', label: 'Teacher Courses' },
  { value: '/teacher/my-quiz', label: 'Teacher Quizzes' },
  { value: '/teacher/zoom-lessons', label: 'Teacher Live Lessons' },
  { value: '/calendar', label: 'Calendar' },
  { value: '/announcements', label: 'Announcements' },
  { value: '/chat', label: 'Chat' },
  { value: '/profile', label: 'Profile' },
  { value: '/settings', label: 'Settings' },
  { value: '/features/calculator', label: 'Calculator' },
  { value: '/features/analytics', label: 'Analytics' },
];

export default function DashboardBanners() {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [banners, setBanners] = useState<DashboardBanner[]>([]);
  const [draftBanners, setDraftBanners] = useState<DashboardBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<DashboardBanner | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'published' | 'drafts'>('published');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    imageUrl: '',
    backgroundColor: '#3B82F6',
    textColor: '#FFFFFF',
    linkType: 'none' as 'internal' | 'external' | 'none',
    link: '',
    isActive: true,
    isDraft: false,
    targetRoles: [] as string[],
    order: 0,
  });

  const isAdmin = userRole === 'platform_admin';

  const roleOptions = [
    { id: 'student', label: 'Students' },
    { id: 'teacher', label: 'Teachers' },
    { id: 'parent', label: 'Parents' },
    { id: 'school_admin', label: 'School Admins' },
  ];

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    if (formData.imageUrl) {
      setImagePreview(formData.imageUrl);
    }
  }, [formData.imageUrl]);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'dashboardBanners'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const bannersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as DashboardBanner[];
      
      setBanners(bannersData.filter(b => !b.isDraft));
      setDraftBanners(bannersData.filter(b => b.isDraft));
    } catch (error) {
      console.error('Error loading banners:', error);
      toast.error('Failed to load dashboard banners');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const timestamp = Date.now();
      const fileName = `banners/${currentUser?.uid}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setFormData({ ...formData, imageUrl: downloadURL });
      setImagePreview(downloadURL);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => {
      const current = [...prev.targetRoles];
      if (current.includes(roleId)) {
        return { ...prev, targetRoles: current.filter(r => r !== roleId) };
      } else {
        return { ...prev, targetRoles: [...current, roleId] };
      }
    });
  };

  const validateForm = (isDraft: boolean) => {
    if (!isDraft) {
      if (!formData.title.trim()) {
        toast.error('Please enter a title');
        return false;
      }
      if (!formData.message.trim()) {
        toast.error('Please enter a message');
        return false;
      }
      if (!formData.imageUrl.trim()) {
        toast.error('Please upload an image or provide an image URL');
        return false;
      }
      if (formData.targetRoles.length === 0) {
        toast.error('Please select at least one target role');
        return false;
      }
      if (formData.linkType === 'internal' && !formData.link) {
        toast.error('Please select an in-app link');
        return false;
      }
      if (formData.linkType === 'external' && !formData.link) {
        toast.error('Please enter an external URL');
        return false;
      }
    }
    return true;
  };

  const handleSaveBanner = async (isDraft: boolean) => {
    if (!validateForm(isDraft)) return;
    if (!currentUser?.uid) {
      toast.error('You must be logged in');
      return;
    }

    try {
      const bannerData = {
        ...formData,
        isDraft,
        updatedAt: Timestamp.now(),
      };

      if (selectedBanner?.id) {
        // Update existing banner
        const bannerRef = doc(db, 'dashboardBanners', selectedBanner.id);
        await updateDoc(bannerRef, bannerData);
        toast.success(isDraft ? 'Banner saved as draft!' : 'Banner updated successfully!');
      } else {
        // Create new banner
        const maxOrder = Math.max(...banners.map(b => b.order), ...draftBanners.map(b => b.order), -1);
        await addDoc(collection(db, 'dashboardBanners'), {
          ...bannerData,
          createdAt: Timestamp.now(),
          createdBy: currentUser.uid,
          order: maxOrder + 1,
        });
        toast.success(isDraft ? 'Banner saved as draft!' : 'Banner created successfully!');
      }

      setShowCreateDialog(false);
      resetForm();
      loadBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Failed to save banner');
    }
  };

  const handleToggleActive = async (banner: DashboardBanner) => {
    try {
      const bannerRef = doc(db, 'dashboardBanners', banner.id);
      await updateDoc(bannerRef, {
        isActive: !banner.isActive,
        updatedAt: Timestamp.now(),
      });
      toast.success(`Banner ${!banner.isActive ? 'activated' : 'deactivated'}!`);
      loadBanners();
    } catch (error) {
      console.error('Error toggling banner:', error);
      toast.error('Failed to toggle banner status');
    }
  };

  const handleDeleteBanner = async () => {
    if (!selectedBanner?.id) return;

    try {
      await deleteDoc(doc(db, 'dashboardBanners', selectedBanner.id));
      toast.success('Banner deleted successfully!');
      setShowDeleteDialog(false);
      setSelectedBanner(null);
      loadBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error('Failed to delete banner');
    }
  };

  const handleEditBanner = (banner: DashboardBanner) => {
    setSelectedBanner(banner);
    setFormData({
      title: banner.title,
      message: banner.message,
      imageUrl: banner.imageUrl,
      backgroundColor: banner.backgroundColor,
      textColor: banner.textColor,
      linkType: banner.linkType,
      link: banner.link || '',
      isActive: banner.isActive,
      isDraft: banner.isDraft,
      targetRoles: banner.targetRoles,
      order: banner.order,
    });
    setImagePreview(banner.imageUrl);
    setShowCreateDialog(true);
  };

  const handlePublishDraft = async (banner: DashboardBanner) => {
    // Validate before publishing
    if (!banner.title || !banner.message || !banner.imageUrl || banner.targetRoles.length === 0) {
      toast.error('Please complete all required fields before publishing');
      handleEditBanner(banner);
      return;
    }

    try {
      const bannerRef = doc(db, 'dashboardBanners', banner.id);
      await updateDoc(bannerRef, {
        isDraft: false,
        isActive: true,
        updatedAt: Timestamp.now(),
      });
      toast.success('Draft published successfully!');
      loadBanners();
    } catch (error) {
      console.error('Error publishing draft:', error);
      toast.error('Failed to publish draft');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      imageUrl: '',
      backgroundColor: '#3B82F6',
      textColor: '#FFFFFF',
      linkType: 'none',
      link: '',
      isActive: true,
      isDraft: false,
      targetRoles: [],
      order: 0,
    });
    setImagePreview('');
    setSelectedBanner(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
        <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white dark:text-black" />
                </div>
                <span className="font-semibold">Dashboard Banners</span>
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            You don't have permission to manage dashboard banners.<br />
            Only Platform Admins can access this feature.
          </p>
          <Button onClick={() => navigate(-1)} className="mt-6">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold">Dashboard Banners</span>
            </div>
          </div>
          <Button onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Create Banner
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 lg:p-6 space-y-6">
        {/* Sub-Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard Banners</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create Jumia-style rotating banners for user dashboards
          </p>
        </div>

        {/* Tabs for Published and Drafts */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'published' | 'drafts')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="published">
              Published Banners ({banners.length})
            </TabsTrigger>
            <TabsTrigger value="drafts">
              Drafts ({draftBanners.length})
            </TabsTrigger>
          </TabsList>

          {/* Published Banners */}
          <TabsContent value="published" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-gray-400 mb-4" />
                <p className="text-gray-500">Loading banners...</p>
              </div>
            ) : banners.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold">No published banners yet</h3>
                <p className="text-gray-600 dark:text-gray-400">Create your first banner to display on user dashboards</p>
              </div>
            ) : (
              banners.map((banner) => (
                <Card key={banner.id} className={`${!banner.isActive ? 'opacity-60' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Banner Preview - Jumia Style */}
                      <div className="flex-1">
                        <div 
                          className="relative rounded-lg overflow-hidden shadow-lg"
                          style={{ 
                            backgroundColor: banner.backgroundColor,
                            minHeight: '200px'
                          }}
                        >
                          {banner.imageUrl && (
                            <img 
                              src={banner.imageUrl} 
                              alt={banner.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Failed to load banner image:', banner.imageUrl);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div 
                            className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent p-6 flex flex-col justify-center"
                          >
                            <h3 
                              className="text-2xl font-bold mb-2"
                              style={{ color: banner.textColor }}
                            >
                              {banner.title}
                            </h3>
                            <p 
                              className="text-sm mb-4"
                              style={{ color: banner.textColor, opacity: 0.9 }}
                            >
                              {banner.message}
                            </p>
                            {banner.link && (
                              <div className="flex items-center gap-1" style={{ color: banner.textColor }}>
                                {banner.linkType === 'external' && <ExternalLink className="w-4 h-4" />}
                                <span className="text-xs opacity-75">
                                  {banner.linkType === 'internal' ? 'In-app link' : 'External link'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Banner Info & Actions */}
                      <div className="lg:w-64 space-y-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Status</p>
                          <Badge variant={banner.isActive ? 'default' : 'secondary'}>
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Target Roles</p>
                          <div className="flex flex-wrap gap-1">
                            {banner.targetRoles.map(role => (
                              <Badge key={role} variant="outline" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Created: {banner.createdAt.toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Updated: {banner.updatedAt.toLocaleDateString()}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(banner)}
                            className="w-full"
                          >
                            {banner.isActive ? (
                              <><EyeOff className="w-4 h-4 mr-1" /> Deactivate</>
                            ) : (
                              <><Eye className="w-4 h-4 mr-1" /> Activate</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditBanner(banner)}
                            className="w-full"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedBanner(banner);
                              setShowDeleteDialog(true);
                            }}
                            className="w-full"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Draft Banners */}
          <TabsContent value="drafts" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-gray-400 mb-4" />
                <p className="text-gray-500">Loading drafts...</p>
              </div>
            ) : draftBanners.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold">No draft banners</h3>
                <p className="text-gray-600 dark:text-gray-400">Draft banners will appear here</p>
              </div>
            ) : (
              draftBanners.map((banner) => (
                <Card key={banner.id} className="border-dashed">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Draft Preview */}
                      <div className="flex-1">
                        <Badge variant="secondary" className="mb-2">Draft</Badge>
                        {banner.imageUrl ? (
                          <div 
                            className="relative rounded-lg overflow-hidden"
                            style={{ minHeight: '150px' }}
                          >
                            <img 
                              src={banner.imageUrl} 
                              alt={banner.title || 'Draft banner'}
                              className="w-full h-full object-cover opacity-70"
                            />
                          </div>
                        ) : (
                          <div className="bg-gray-200 dark:bg-gray-800 rounded-lg p-8 text-center">
                            <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">No image</p>
                          </div>
                        )}
                        <h4 className="font-semibold mt-2">{banner.title || 'Untitled'}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {banner.message || 'No message'}
                        </p>
                      </div>

                      {/* Draft Actions */}
                      <div className="lg:w-48 space-y-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Last saved: {banner.updatedAt.toLocaleString()}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handlePublishDraft(banner)}
                          className="w-full"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Publish
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditBanner(banner)}
                          className="w-full"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Continue Editing
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedBanner(banner);
                            setShowDeleteDialog(true);
                          }}
                          className="w-full"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBanner ? 'Edit Dashboard Banner' : 'Create Dashboard Banner'}
            </DialogTitle>
            <DialogDescription>
              Create Jumia-style banners that rotate on user dashboards
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
            {/* Left Column - Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter banner title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Enter banner message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label>Banner Image *</Label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  <div className="space-y-3">
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full"
                      >
                        {uploading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                        ) : (
                          <><Upload className="w-4 h-4 mr-2" /> Upload from Device</>
                        )}
                      </Button>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="imageUrl" className="text-xs">Image URL (Pinterest, Instagram, Google, etc.)</Label>
                      <Input
                        id="imageUrl"
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={formData.backgroundColor}
                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.backgroundColor}
                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="textColor"
                      type="color"
                      value={formData.textColor}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.textColor}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Link Configuration */}
              <div className="space-y-3">
                <Label>Banner Link</Label>
                <Select
                  value={formData.linkType}
                  onValueChange={(value: 'internal' | 'external' | 'none') => 
                    setFormData({ ...formData, linkType: value, link: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select link type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Link</SelectItem>
                    <SelectItem value="internal">In-App Link</SelectItem>
                    <SelectItem value="external">External Link</SelectItem>
                  </SelectContent>
                </Select>

                {formData.linkType === 'internal' && (
                  <Select
                    value={formData.link}
                    onValueChange={(value) => setFormData({ ...formData, link: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {inAppLinks.map(link => (
                        <SelectItem key={link.value} value={link.value}>
                          {link.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {formData.linkType === 'external' && (
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  />
                )}
              </div>

              {/* Target Roles */}
              <div className="space-y-3">
                <Label>Target Roles *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map(opt => (
                    <div 
                      key={opt.id}
                      onClick={() => handleRoleToggle(opt.id)}
                      className={`
                        flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                        ${formData.targetRoles.includes(opt.id) 
                          ? 'bg-black text-white border-black dark:bg-white dark:text-black' 
                          : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-900 dark:border-gray-800'}
                      `}
                    >
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Live Preview */}
            <div className="space-y-4">
              <Label>Live Preview (Jumia-style)</Label>
              <div 
                className="relative rounded-lg overflow-hidden shadow-xl"
                style={{ 
                  backgroundColor: formData.backgroundColor,
                  minHeight: '300px'
                }}
              >
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Failed to load image:', imagePreview);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-4">
                      <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-30" />
                      <p className="text-sm opacity-50">Upload image or add URL to preview</p>
                    </div>
                  </div>
                )}
                
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent p-6 flex flex-col justify-center"
                >
                  <h3 
                    className="text-2xl font-bold mb-2"
                    style={{ color: formData.textColor }}
                  >
                    {formData.title || 'Banner Title'}
                  </h3>
                  <p 
                    className="text-sm mb-4"
                    style={{ color: formData.textColor, opacity: 0.9 }}
                  >
                    {formData.message || 'Your banner message will appear here'}
                  </p>
                  {formData.link && (
                    <div className="flex items-center gap-1" style={{ color: formData.textColor }}>
                      {formData.linkType === 'external' && <ExternalLink className="w-4 h-4" />}
                      <span className="text-xs opacity-75">
                        {formData.linkType === 'internal' ? 'In-app link configured' : 'External link configured'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  💡 Tip: Banners rotate automatically on dashboards. Use high-quality images for best results.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleSaveBanner(true)}
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button onClick={() => handleSaveBanner(false)}>
              {selectedBanner ? 'Update Banner' : 'Publish Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Banner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this banner? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBanner}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
