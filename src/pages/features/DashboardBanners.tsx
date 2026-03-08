import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
  Upload,
  Video,
  Link as LinkIcon,
  ExternalLink,
  Calendar,
  Users,
  X,
  CheckCircle2,
  PlayCircle,
  Globe,
  Sparkles,
  ImageOff,
  Clock,
  ChevronDown,
  Megaphone,
  FileImage,
  Film
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
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Types ───────────────────────────────────────────────────────────────────

type MediaType = 'image' | 'video' | 'url';
type AudienceRole = 'student' | 'teacher' | 'parent' | 'school_admin' | 'all';

interface DashboardBanner {
  id: string;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  clickUrl: string;
  clickUrlType: 'internal' | 'external';
  targetRoles: AudienceRole[];
  isActive: boolean;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  order: number;
  // legacy fields (kept for backward compat but not shown in form)
  title?: string;
  message?: string;
}

interface FormState {
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string;
  clickUrl: string;
  clickUrlType: 'internal' | 'external';
  targetRoles: AudienceRole[];
  isActive: boolean;
  expiresAt: string; // ISO date string for input[type=date]
}

// ─── In-app route options ────────────────────────────────────────────────────

const inAppRoutes = [
  { value: '/features/hanna-ai', label: '🤖 Hanna AI' },
  { value: '/student/courses', label: '📚 Student Courses' },
  { value: '/student/quizzes', label: '📝 Student Quizzes' },
  { value: '/student/zoom-lessons', label: '🎥 Live Lessons' },
  { value: '/teacher/courses', label: '👩‍🏫 Teacher Courses' },
  { value: '/teacher/my-quiz', label: '✏️ Teacher Quizzes' },
  { value: '/calendar', label: '📅 Calendar' },
  { value: '/announcements', label: '📢 Announcements' },
  { value: '/chat', label: '💬 Chat' },
  { value: '/profile', label: '👤 Profile' },
  { value: '/features/calculator', label: '🧮 Calculator' },
  { value: '/features/analytics', label: '📊 Analytics' },
];

const audienceOptions: { id: AudienceRole; label: string; icon: string; color: string }[] = [
  { id: 'all', label: 'Everyone', icon: '🌍', color: 'bg-gradient-to-br from-violet-500 to-purple-600' },
  { id: 'student', label: 'Students', icon: '🎓', color: 'bg-gradient-to-br from-blue-500 to-cyan-600' },
  { id: 'teacher', label: 'Teachers', icon: '👩‍🏫', color: 'bg-gradient-to-br from-green-500 to-emerald-600' },
  { id: 'parent', label: 'Parents', icon: '👨‍👩‍👧', color: 'bg-gradient-to-br from-orange-500 to-amber-600' },
  { id: 'school_admin', label: 'School Admins', icon: '🏫', color: 'bg-gradient-to-br from-pink-500 to-rose-600' },
];

// ─── URL Preview fetcher ─────────────────────────────────────────────────────

async function fetchUrlMeta(url: string): Promise<{ title: string; image: string; description: string } | null> {
  try {
    // Use allorigins proxy to bypass CORS
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const html = data.contents as string;
    if (!html) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const getMetaContent = (selectors: string[]): string => {
      for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el) {
          const content = el.getAttribute('content') || el.textContent || '';
          if (content.trim()) return content.trim();
        }
      }
      return '';
    };

    const title =
      getMetaContent(['meta[property="og:title"]', 'meta[name="twitter:title"]', 'title']) ||
      url;

    const image =
      getMetaContent(['meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[itemprop="image"]']);

    const description =
      getMetaContent(['meta[property="og:description"]', 'meta[name="twitter:description"]', 'meta[name="description"]']);

    return { title, image, description };
  } catch {
    return null;
  }
}

// ─── Helper ──────────────────────────────────────────────────────────────────

const isImageUrl = (url: string) =>
  /\.(jpg|jpeg|png|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(url) ||
  url.includes('pinimg.com') ||
  url.includes('instagram.com') ||
  url.includes('fbcdn.net') ||
  url.includes('googleusercontent.com');

const isVideoUrl = (url: string) =>
  /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url) ||
  url.includes('youtube.com') ||
  url.includes('youtu.be') ||
  url.includes('vimeo.com');

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DashboardBanners() {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();

  const [banners, setBanners] = useState<DashboardBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<DashboardBanner | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [urlPreviewLoading, setUrlPreviewLoading] = useState(false);
  const [urlMeta, setUrlMeta] = useState<{ title: string; image: string; description: string } | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'expired'>('all');
  const [showInternalRoutes, setShowInternalRoutes] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const urlPreviewDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const defaultForm: FormState = {
    mediaType: 'image',
    mediaUrl: '',
    thumbnailUrl: '',
    clickUrl: '',
    clickUrlType: 'external',
    targetRoles: [],
    isActive: true,
    expiresAt: '',
  };

  const [form, setForm] = useState<FormState>(defaultForm);

  const isAdmin = userRole === 'platform_admin';

  // ── Load banners ──────────────────────────────────────────────────────────

  const loadBanners = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'dashboardBanners'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
        expiresAt: d.data().expiresAt?.toDate() || null,
        // migration: map old fields to new
        mediaType: d.data().mediaType || 'image',
        mediaUrl: d.data().mediaUrl || d.data().imageUrl || '',
        clickUrl: d.data().clickUrl || d.data().link || '',
        clickUrlType: d.data().clickUrlType || d.data().linkType || 'external',
        targetRoles: d.data().targetRoles || [],
      })) as DashboardBanner[];
      setBanners(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBanners(); }, []);

  // ── URL preview (debounced) ───────────────────────────────────────────────

  const triggerUrlPreview = useCallback((url: string) => {
    setUrlMeta(null);
    setPreviewError(false);
    if (!url) return;

    // Direct image — no need to fetch meta
    if (isImageUrl(url)) {
      setUrlMeta({ title: '', image: url, description: '' });
      return;
    }

    if (urlPreviewDebounce.current) clearTimeout(urlPreviewDebounce.current);
    urlPreviewDebounce.current = setTimeout(async () => {
      if (!url.startsWith('http')) return;
      setUrlPreviewLoading(true);
      const meta = await fetchUrlMeta(url);
      setUrlPreviewLoading(false);
      if (meta) {
        setUrlMeta(meta);
      } else {
        setPreviewError(true);
      }
    }, 700);
  }, []);

  useEffect(() => {
    if (form.mediaType === 'url') {
      triggerUrlPreview(form.mediaUrl);
    }
  }, [form.mediaUrl, form.mediaType, triggerUrlPreview]);

  // ── File upload ───────────────────────────────────────────────────────────

  const handleFileUpload = async (
    file: File,
    type: 'image' | 'video'
  ) => {
    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`${type === 'image' ? 'Image' : 'Video'} must be under ${type === 'image' ? '10MB' : '100MB'}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `banners/${currentUser?.uid || 'admin'}/${Date.now()}_${sanitizedName}`;
      const storageRef = ref(storage, path);

      // Use resumable upload with proper state tracking
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file, {
          contentType: file.type,
        });

        task.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Upload state error:', error.code, error.message);
            reject(error);
          },
          () => {
            // Upload completed successfully
            resolve();
          }
        );
      });

      // Get download URL only after upload fully completes
      const downloadUrl = await getDownloadURL(storageRef);

      setForm(prev => ({ ...prev, mediaUrl: downloadUrl, mediaType: type }));
      toast.success(`${type === 'image' ? 'Image' : 'Video'} uploaded successfully!`);
    } catch (err: unknown) {
      console.error('Upload error:', err);
      const errorCode = (err as { code?: string })?.code || '';
      if (errorCode === 'storage/unauthorized') {
        toast.error('Upload failed: Permission denied. Please check Firebase Storage rules.');
      } else if (errorCode === 'storage/canceled') {
        toast.error('Upload was cancelled.');
      } else if (errorCode === 'storage/retry-limit-exceeded') {
        toast.error('Upload failed: Network timeout. Please check your connection and try again.');
      } else {
        toast.error('Upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Audience toggle ───────────────────────────────────────────────────────

  const toggleRole = (role: AudienceRole) => {
    setForm(prev => {
      if (role === 'all') {
        return { ...prev, targetRoles: prev.targetRoles.includes('all') ? [] : ['all'] };
      }
      const filtered = prev.targetRoles.filter(r => r !== 'all');
      if (filtered.includes(role)) {
        return { ...prev, targetRoles: filtered.filter(r => r !== role) };
      }
      return { ...prev, targetRoles: [...filtered, role] };
    });
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.mediaUrl.trim()) {
      toast.error('Please add an image, video, or URL for the banner');
      return;
    }
    if (form.targetRoles.length === 0) {
      toast.error('Please select at least one target audience');
      return;
    }
    if (!currentUser?.uid) return;

    try {
      const expiresAt = form.expiresAt
        ? Timestamp.fromDate(new Date(form.expiresAt))
        : null;

      const payload = {
        mediaType: form.mediaType,
        mediaUrl: form.mediaUrl,
        thumbnailUrl: form.thumbnailUrl || '',
        clickUrl: form.clickUrl,
        clickUrlType: form.clickUrlType,
        targetRoles: form.targetRoles,
        isActive: form.isActive,
        expiresAt,
        updatedAt: Timestamp.now(),
        // legacy compat
        title: '',
        message: '',
        imageUrl: form.mediaType === 'image' ? form.mediaUrl : '',
        link: form.clickUrl,
        linkType: form.clickUrlType,
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        isDraft: false,
      };

      if (selectedBanner?.id) {
        await updateDoc(doc(db, 'dashboardBanners', selectedBanner.id), payload);
        toast.success('Banner updated!');
      } else {
        const maxOrder = Math.max(...banners.map(b => b.order), -1);
        await addDoc(collection(db, 'dashboardBanners'), {
          ...payload,
          createdAt: Timestamp.now(),
          createdBy: currentUser.uid,
          order: maxOrder + 1,
        });
        toast.success('Banner published!');
      }

      setShowCreateDialog(false);
      resetForm();
      loadBanners();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save banner');
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────

  const handleToggleActive = async (banner: DashboardBanner) => {
    try {
      await updateDoc(doc(db, 'dashboardBanners', banner.id), {
        isActive: !banner.isActive,
        updatedAt: Timestamp.now(),
      });
      toast.success(`Banner ${!banner.isActive ? 'activated' : 'deactivated'}`);
      loadBanners();
    } catch {
      toast.error('Failed to update banner status');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!selectedBanner?.id) return;
    try {
      await deleteDoc(doc(db, 'dashboardBanners', selectedBanner.id));
      toast.success('Banner deleted');
      setShowDeleteDialog(false);
      setSelectedBanner(null);
      loadBanners();
    } catch {
      toast.error('Failed to delete banner');
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const handleEdit = (banner: DashboardBanner) => {
    setSelectedBanner(banner);
    setForm({
      mediaType: banner.mediaType || 'image',
      mediaUrl: banner.mediaUrl || '',
      thumbnailUrl: banner.thumbnailUrl || '',
      clickUrl: banner.clickUrl || '',
      clickUrlType: banner.clickUrlType || 'external',
      targetRoles: banner.targetRoles || [],
      isActive: banner.isActive,
      expiresAt: banner.expiresAt
        ? banner.expiresAt.toISOString().split('T')[0]
        : '',
    });
    setUrlMeta(null);
    setPreviewError(false);
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setForm(defaultForm);
    setUrlMeta(null);
    setPreviewError(false);
    setSelectedBanner(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // ── Filter banners ────────────────────────────────────────────────────────

  const now = new Date();
  const filteredBanners = banners.filter(b => {
    if (activeTab === 'active') return b.isActive && (!b.expiresAt || b.expiresAt > now);
    if (activeTab === 'expired') return b.expiresAt && b.expiresAt <= now;
    return true;
  });

  // ── Access guard ──────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-black p-8">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-500 text-center mb-6">Only Platform Admins can manage dashboard banners.</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-black dark:text-white transition-colors">

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight">Dashboard Banners</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">Manage advertisement banners</p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => { resetForm(); setShowCreateDialog(true); }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Banner</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: banners.length, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Active', value: banners.filter(b => b.isActive).length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Expired', value: banners.filter(b => b.expiresAt && b.expiresAt <= now).length, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit">
          {(['all', 'active', 'expired'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-black dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Banner list ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-3" />
            <p className="text-gray-500">Loading banners…</p>
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-3xl flex items-center justify-center mb-4">
              <ImageIcon className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No banners yet</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
              Create your first advertisement banner to display on user dashboards.
            </p>
            <Button
              onClick={() => { resetForm(); setShowCreateDialog(true); }}
              className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" /> Create First Banner
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredBanners.map(banner => {
              const isExpired = banner.expiresAt && banner.expiresAt <= now;
              return (
                <Card
                  key={banner.id}
                  className={`overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 ${
                    !banner.isActive || isExpired ? 'opacity-60' : ''
                  }`}
                >
                  {/* Media preview */}
                  <div className="relative aspect-[16/7] bg-gray-900 overflow-hidden group">
                    {banner.mediaType === 'video' ? (
                      <>
                        <video
                          src={banner.mediaUrl}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                          onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
                          onMouseLeave={e => { (e.currentTarget as HTMLVideoElement).pause(); }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                          <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                            <PlayCircle className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img
                        src={banner.mediaUrl}
                        alt="Banner"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={e => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    )}
                    <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-800">
                      <ImageOff className="w-10 h-10 text-gray-500" />
                    </div>

                    {/* Overlay badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge
                        className={`text-white border-0 text-xs font-semibold shadow ${
                          banner.isActive && !isExpired
                            ? 'bg-green-500'
                            : isExpired
                            ? 'bg-red-500'
                            : 'bg-gray-500'
                        }`}
                      >
                        {isExpired ? '⏰ Expired' : banner.isActive ? '✅ Active' : '⏸ Inactive'}
                      </Badge>
                      <Badge className="bg-black/60 text-white border-0 text-xs capitalize">
                        {banner.mediaType === 'video' ? '🎬 Video' : '🖼 Image'}
                      </Badge>
                    </div>

                    {/* Click URL badge */}
                    {banner.clickUrl && (
                      <div className="absolute bottom-3 left-3">
                        <Badge className="bg-black/70 text-white border-0 text-xs gap-1 flex items-center">
                          <LinkIcon className="w-3 h-3" />
                          {banner.clickUrlType === 'external' ? 'External Link' : 'In-App Link'}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Target roles */}
                        <div className="flex flex-wrap gap-1">
                          {banner.targetRoles.map(role => {
                            const opt = audienceOptions.find(o => o.id === role);
                            return (
                              <span key={role} className="text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5 font-medium">
                                {opt?.icon} {opt?.label || role}
                              </span>
                            );
                          })}
                        </div>

                        {/* Expiry */}
                        {banner.expiresAt && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            Expires: {banner.expiresAt.toLocaleDateString()}
                          </div>
                        )}

                        {/* Click URL */}
                        {banner.clickUrl && (
                          <div className="flex items-center gap-1 text-xs text-blue-500 truncate">
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{banner.clickUrl}</span>
                          </div>
                        )}

                        <p className="text-xs text-gray-400">
                          Created {banner.createdAt.toLocaleDateString()}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(banner)}
                          className="h-8 px-3 text-xs"
                        >
                          {banner.isActive ? <><EyeOff className="w-3 h-3 mr-1" /> Off</> : <><Eye className="w-3 h-3 mr-1" /> On</>}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(banner)}
                          className="h-8 px-3 text-xs"
                        >
                          <Edit className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => { setSelectedBanner(banner); setShowDeleteDialog(true); }}
                          className="h-8 px-3 text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════
          CREATE / EDIT DIALOG
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={showCreateDialog} onOpenChange={open => { setShowCreateDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl">

          {/* Dialog Header */}
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  {selectedBanner ? 'Edit Banner' : 'Create New Banner'}
                </DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Upload media or paste a URL · Set audience · Add a link
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-8">

            {/* ── Section 1: Media Type Selector ── */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <FileImage className="w-4 h-4" /> Media Type
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'image', label: 'Image', icon: <ImageIcon className="w-5 h-5" />, desc: 'JPG, PNG, GIF, WebP' },
                  { value: 'video', label: 'Video', icon: <Film className="w-5 h-5" />, desc: 'MP4, WebM, MOV' },
                  { value: 'url', label: 'URL / Link', icon: <Globe className="w-5 h-5" />, desc: 'Any webpage URL' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, mediaType: opt.value, mediaUrl: '' }))}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                      form.mediaType === opt.value
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {opt.icon}
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <span className="text-xs opacity-70">{opt.desc}</span>
                    {form.mediaType === opt.value && (
                      <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-purple-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Section 2: Media Input ── */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {form.mediaType === 'image' && 'Upload Image or Paste Image URL'}
                {form.mediaType === 'video' && 'Upload Video or Paste Video URL'}
                {form.mediaType === 'url' && 'Paste Webpage URL'}
              </Label>

              {/* Image / Video upload zone */}
              {(form.mediaType === 'image' || form.mediaType === 'video') && (
                <div className="space-y-4">
                  {/* Drop zone */}
                  <div
                    onClick={() => form.mediaType === 'image' ? imageInputRef.current?.click() : videoInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all group ${
                      isUploading
                        ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
                    }`}
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'image'); }}
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'video'); }}
                    />

                    {isUploading ? (
                      <div className="space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
                        <p className="text-sm font-medium text-purple-600">Uploading… {uploadProgress}%</p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-xs mx-auto">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : form.mediaUrl ? (
                      <div className="space-y-2">
                        {form.mediaType === 'image' ? (
                          <img src={form.mediaUrl} alt="Preview" className="max-h-40 mx-auto rounded-xl object-contain" />
                        ) : (
                          <video src={form.mediaUrl} className="max-h-40 mx-auto rounded-xl" controls />
                        )}
                        <p className="text-xs text-gray-400">Click to replace</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                          {form.mediaType === 'image' ? (
                            <ImageIcon className="w-7 h-7 text-purple-500" />
                          ) : (
                            <Video className="w-7 h-7 text-purple-500" />
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Click to upload {form.mediaType}
                        </p>
                        <p className="text-xs text-gray-400">
                          {form.mediaType === 'image' ? 'JPG, PNG, GIF, WebP · max 10MB' : 'MP4, WebM, MOV · max 100MB'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* OR divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">or paste URL</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>

                  {/* URL input */}
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="url"
                      placeholder={
                        form.mediaType === 'image'
                          ? 'https://i.pinimg.com/… or any image URL'
                          : 'https://example.com/video.mp4 or YouTube/Vimeo URL'
                      }
                      value={form.mediaUrl.startsWith('http') && !form.mediaUrl.includes('firebasestorage') ? form.mediaUrl : ''}
                      onChange={e => setForm(prev => ({ ...prev, mediaUrl: e.target.value }))}
                      className="pl-10 rounded-xl h-11 border-gray-200 dark:border-gray-700 focus:border-purple-400"
                    />
                  </div>

                  {/* Image URL preview */}
                  {form.mediaType === 'image' && form.mediaUrl && !form.mediaUrl.includes('firebasestorage') && (
                    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <p className="text-xs font-medium text-gray-500 px-3 pt-3 pb-1">Live Preview</p>
                      <img
                        src={form.mediaUrl}
                        alt="URL Preview"
                        className="w-full max-h-48 object-cover"
                        onError={e => {
                          e.currentTarget.style.display = 'none';
                          (e.currentTarget.nextSibling as HTMLElement)?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden flex items-center gap-2 p-3 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4" /> Could not load image from this URL
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* URL / Webpage mode */}
              {form.mediaType === 'url' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="url"
                      placeholder="https://pinterest.com/pin/… or any webpage"
                      value={form.mediaUrl}
                      onChange={e => setForm(prev => ({ ...prev, mediaUrl: e.target.value }))}
                      className="pl-10 rounded-xl h-11 border-gray-200 dark:border-gray-700 focus:border-purple-400"
                    />
                    {form.mediaUrl && (
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, mediaUrl: '' }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* URL Preview card */}
                  {form.mediaUrl && (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {urlPreviewLoading && (
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900">
                          <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                          <span className="text-sm text-gray-500">Fetching preview…</span>
                        </div>
                      )}

                      {urlMeta && !urlPreviewLoading && (
                        <div className="bg-white dark:bg-gray-900">
                          {urlMeta.image && (
                            <div className="relative aspect-[2/1] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                              <img
                                src={urlMeta.image}
                                alt="Preview"
                                className="w-full h-full object-cover"
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                              />
                            </div>
                          )}
                          <div className="p-4">
                            {urlMeta.title && (
                              <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
                                {urlMeta.title}
                              </p>
                            )}
                            {urlMeta.description && (
                              <p className="text-xs text-gray-500 line-clamp-2">{urlMeta.description}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-2">
                              <Globe className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-400 truncate">
                                {new URL(form.mediaUrl).hostname}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {previewError && !urlPreviewLoading && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Preview unavailable</p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                              The link is saved but this site blocks previews. The banner will display the URL domain.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Section 3: Click-through URL ── */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> Click Action <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                When users click the banner, where should they go?
              </p>

              {/* Type toggle */}
              <div className="flex gap-2 mb-3">
                {(['external', 'internal'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, clickUrlType: type, clickUrl: '' }))}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      form.clickUrlType === type
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {type === 'external' ? <><ExternalLink className="w-3.5 h-3.5 inline mr-1.5" />External URL</> : <><Globe className="w-3.5 h-3.5 inline mr-1.5" />In-App Page</>}
                  </button>
                ))}
              </div>

              {form.clickUrlType === 'external' ? (
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="url"
                    placeholder="https://your-website.com/page"
                    value={form.clickUrl}
                    onChange={e => setForm(prev => ({ ...prev, clickUrl: e.target.value }))}
                    className="pl-10 rounded-xl h-11"
                  />
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowInternalRoutes(!showInternalRoutes)}
                    className="w-full flex items-center justify-between p-3 border-2 rounded-xl border-gray-200 dark:border-gray-700 hover:border-blue-400 transition-all text-left"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {form.clickUrl
                        ? inAppRoutes.find(r => r.value === form.clickUrl)?.label || form.clickUrl
                        : 'Select in-app destination…'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showInternalRoutes ? 'rotate-180' : ''}`} />
                  </button>
                  {showInternalRoutes && (
                    <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg">
                      {inAppRoutes.map(route => (
                        <button
                          key={route.value}
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ ...prev, clickUrl: route.value }));
                            setShowInternalRoutes(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${
                            form.clickUrl === route.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : ''
                          }`}
                        >
                          {form.clickUrl === route.value && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                          {route.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Section 4: Target Audience ── */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Target Audience <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Select who should see this banner on their dashboard.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {audienceOptions.map(opt => {
                  const selected = form.targetRoles.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleRole(opt.id)}
                      className={`relative flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                        selected
                          ? 'border-transparent ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-black'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-9 h-9 ${opt.color} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
                        {opt.icon}
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{opt.label}</span>
                      {selected && (
                        <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-purple-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              {form.targetRoles.length === 0 && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Select at least one audience
                </p>
              )}
            </div>

            {/* ── Section 5: Expiration & Status ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Expiration date */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Expiration Date <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Banner will auto-deactivate after this date.
                </p>
                <Input
                  type="date"
                  value={form.expiresAt}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="rounded-xl h-11"
                />
                {form.expiresAt && (
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, expiresAt: '' }))}
                    className="text-xs text-red-400 hover:text-red-500 mt-1 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Remove expiry
                  </button>
                )}
              </div>

              {/* Active toggle */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Visibility
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Control whether the banner is displayed.
                </p>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    form.isActive
                      ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${form.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className={`text-sm font-medium ${form.isActive ? 'text-green-700 dark:text-green-300' : 'text-gray-500'}`}>
                      {form.isActive ? 'Active — Visible to users' : 'Inactive — Hidden from users'}
                    </span>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-all ${form.isActive ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-all shadow ${form.isActive ? 'ml-5' : 'ml-1'}`} />
                  </div>
                </button>
              </div>
            </div>

            {/* ── Live Banner Preview ── */}
            {form.mediaUrl && (
              <div>
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Banner Preview
                </Label>
                <div className="rounded-2xl overflow-hidden shadow-xl aspect-[16/7] bg-gray-900 relative group cursor-pointer"
                  onClick={() => form.clickUrl && window.open(form.clickUrl, '_blank')}
                >
                  {form.mediaType === 'video' ? (
                    <video src={form.mediaUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                  ) : (
                    <img
                      src={form.mediaType === 'url' && urlMeta?.image ? urlMeta.image : form.mediaUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={e => { e.currentTarget.src = ''; }}
                    />
                  )}
                  {form.clickUrl && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="bg-white/90 rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                        <ExternalLink className="w-4 h-4" /> Click to open link
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    {form.targetRoles.map(role => {
                      const opt = audienceOptions.find(o => o.id === role);
                      return (
                        <span key={role} className="text-xs bg-black/60 text-white rounded-full px-2 py-0.5 backdrop-blur-sm">
                          {opt?.icon} {opt?.label}
                        </span>
                      );
                    })}
                  </div>
                  {form.expiresAt && (
                    <div className="absolute top-3 right-3">
                      <span className="text-xs bg-black/60 text-white rounded-full px-2.5 py-1 backdrop-blur-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Expires {new Date(form.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-center text-gray-400 mt-2">
                  This is how your banner will appear on user dashboards
                </p>
              </div>
            )}
          </div>

          {/* Dialog Footer */}
          <DialogFooter className="p-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => { setShowCreateDialog(false); resetForm(); }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isUploading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-lg gap-2 flex-1 sm:flex-none"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
              ) : selectedBanner ? (
                <><CheckCircle2 className="w-4 h-4" /> Update Banner</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Publish Banner</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <DialogTitle className="text-center">Delete Banner?</DialogTitle>
            <p className="text-sm text-gray-500 text-center pt-1">
              This action is permanent and cannot be undone.
            </p>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 mt-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="w-full rounded-xl"
            >
              Yes, Delete Banner
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="w-full rounded-xl"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
