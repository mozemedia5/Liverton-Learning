import { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DashboardBanner {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  link?: string;
  isActive: boolean;
  targetRoles: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export default function DashboardBanners() {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [banners, setBanners] = useState<DashboardBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<DashboardBanner | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    imageUrl: '',
    backgroundColor: '#3B82F6',
    textColor: '#FFFFFF',
    link: '',
    isActive: true,
    targetRoles: [] as string[],
  });

  const isAdmin = userRole === 'platform_admin' || userRole === 'school_admin';

  const roleOptions = [
    { id: 'student', label: 'Students' },
    { id: 'teacher', label: 'Teachers' },
    { id: 'parent', label: 'Parents' },
    { id: 'school_admin', label: 'School Admins' },
  ];

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'dashboardBanners'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const bannersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as DashboardBanner[];
      setBanners(bannersData);
    } catch (error) {
      console.error('Error loading banners:', error);
      toast.error('Failed to load dashboard banners');
    } finally {
      setLoading(false);
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

  const handleCreateBanner = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.targetRoles.length === 0) {
      toast.error('Please select at least one target role');
      return;
    }

    if (!currentUser?.uid) {
      toast.error('You must be logged in to create banners');
      return;
    }

    try {
      await addDoc(collection(db, 'dashboardBanners'), {
        ...formData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: currentUser.uid,
      });

      toast.success('Dashboard banner created successfully!');
      setShowCreateDialog(false);
      resetForm();
      loadBanners();
    } catch (error) {
      console.error('Error creating banner:', error);
      toast.error('Failed to create dashboard banner');
    }
  };

  const handleUpdateBanner = async () => {
    if (!selectedBanner?.id) return;

    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.targetRoles.length === 0) {
      toast.error('Please select at least one target role');
      return;
    }

    try {
      const bannerRef = doc(db, 'dashboardBanners', selectedBanner.id);
      await updateDoc(bannerRef, {
        ...formData,
        updatedAt: Timestamp.now(),
      });

      toast.success('Dashboard banner updated successfully!');
      setShowCreateDialog(false);
      setSelectedBanner(null);
      resetForm();
      loadBanners();
    } catch (error) {
      console.error('Error updating banner:', error);
      toast.error('Failed to update dashboard banner');
    }
  };

  const handleToggleActive = async (banner: DashboardBanner) => {
    try {
      const bannerRef = doc(db, 'dashboardBanners', banner.id);
      await updateDoc(bannerRef, {
        isActive: !banner.isActive,
        updatedAt: Timestamp.now(),
      });

      toast.success(`Banner ${!banner.isActive ? 'activated' : 'deactivated'} successfully!`);
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
      toast.success('Dashboard banner deleted successfully!');
      setShowDeleteDialog(false);
      setSelectedBanner(null);
      loadBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error('Failed to delete dashboard banner');
    }
  };

  const handleEditBanner = (banner: DashboardBanner) => {
    setSelectedBanner(banner);
    setFormData({
      title: banner.title,
      message: banner.message,
      imageUrl: banner.imageUrl || '',
      backgroundColor: banner.backgroundColor,
      textColor: banner.textColor,
      link: banner.link || '',
      isActive: banner.isActive,
      targetRoles: banner.targetRoles,
    });
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      imageUrl: '',
      backgroundColor: '#3B82F6',
      textColor: '#FFFFFF',
      link: '',
      isActive: true,
      targetRoles: [],
    });
    setSelectedBanner(null);
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
            Only Platform Admins and School Admins can access this feature.
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
            Manage banners that appear on user dashboards. Control who sees them and what they display.
          </p>
        </div>

        {/* Banners List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-gray-400 mb-4" />
              <p className="text-gray-500">Loading dashboard banners...</p>
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold">No dashboard banners yet</h3>
              <p className="text-gray-600 dark:text-gray-400">Create your first banner to display on user dashboards</p>
            </div>
          ) : (
            banners.map((banner) => (
              <Card 
                key={banner.id}
                className={`${!banner.isActive ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Banner Preview */}
                    <div 
                      className="flex-1 p-6 rounded-lg"
                      style={{ 
                        backgroundColor: banner.backgroundColor,
                        color: banner.textColor 
                      }}
                    >
                      {banner.imageUrl && (
                        <img 
                          src={banner.imageUrl} 
                          alt={banner.title}
                          className="w-full h-32 object-cover rounded-lg mb-4"
                        />
                      )}
                      <h3 className="text-xl font-bold mb-2">{banner.title}</h3>
                      <p className="text-sm opacity-90">{banner.message}</p>
                      {banner.link && (
                        <p className="text-xs mt-2 opacity-75">Link: {banner.link}</p>
                      )}
                    </div>

                    {/* Banner Info */}
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
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBanner ? 'Edit Dashboard Banner' : 'Create Dashboard Banner'}
            </DialogTitle>
            <DialogDescription>
              Create banners that will be displayed on user dashboards
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL (Optional)</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
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
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.backgroundColor}
                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                    placeholder="#3B82F6"
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
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.textColor}
                    onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Link (Optional)</Label>
              <Input
                id="link"
                type="text"
                placeholder="/courses or https://example.com"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label>Target Roles *</Label>
              <div className="grid grid-cols-2 gap-3">
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Banner is active (visible to users)
              </Label>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div 
                className="p-4 rounded-lg"
                style={{ 
                  backgroundColor: formData.backgroundColor,
                  color: formData.textColor 
                }}
              >
                <h4 className="font-bold">{formData.title || 'Banner Title'}</h4>
                <p className="text-sm mt-1">{formData.message || 'Banner message will appear here'}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={selectedBanner ? handleUpdateBanner : handleCreateBanner}>
              {selectedBanner ? 'Update Banner' : 'Create Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dashboard Banner</DialogTitle>
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
