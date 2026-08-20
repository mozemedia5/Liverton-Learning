import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  FileText,
  Folder,
  ChevronRight,
  Plus,
  Search,
  MoreVertical,
  LayoutGrid,
  List,
  Upload,
  Loader2,
  Trash2,
  Edit2,
  FolderOpen,
  Move,
  Download,
  Share2,
  Star,
  Home,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/DashboardShell';
import { useDocuments } from '@/hooks/useDocuments';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import type { DocumentMeta } from '@/types';
import {
  createFolder,
  moveDocument,
  toggleDocumentFavorite,
  renameDocument,
  deleteDocument,
} from '@/lib/documents';
import { uploadToCloudinary } from '@/services/cloudinaryService';
import { SEO } from '@/components/SEO';

export default function Documents() {
  const navigate = useNavigate();
  const { currentUser, userRole, userData } = useAuth();

  const { documents, loading, error } = useDocuments({
    userId: currentUser?.uid,
    role: userRole,
    schoolId: (userData as any)?.schoolId,
  });

  // State Management
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'favorites'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');

  // Folder navigation hierarchy state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<DocumentMeta[]>([]);

  // Modals & Forms State
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderTitle, setFolderTitle] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentMeta | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  const [moveOpen, setMoveOpen] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string | 'root'>('root');
  const [isMoving, setIsMoving] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  // Upload Management State
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Continue Reading / Recently Opened List Cache
  const [continueReading, setContinueReading] = useState<Array<{
    docId: string;
    title: string;
    lastPageRead: number;
    totalPages: number;
    percentage: number;
    lastOpenedAt: string;
  }>>([]);

  // Fetch / Sync localStorage "Continue Reading" logs with Firestore on library mount
  useEffect(() => {
    if (!currentUser) return;
    const localKey = `liverton_recent_pdfs_${currentUser.uid}`;
    const recent = JSON.parse(localStorage.getItem(localKey) || '[]') as Array<{
      docId: string;
      title: string;
      lastPageRead: number;
      totalPages: number;
      percentage: number;
      lastOpenedAt: string;
    }>;
    setContinueReading(recent.slice(0, 4));
  }, [currentUser]);

  // Folder Breadcrumbs generator
  const currentBreadcrumbs = useMemo(() => {
    const crumbs = [{ id: null, title: 'All Files' }];
    folderPath.forEach((folder) => {
      crumbs.push({ id: folder.id as any, title: folder.title });
    });
    return crumbs;
  }, [folderPath]);

  // Filter Documents & Folders based on current directory level & search query
  const filteredContents = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Step 1: Filter by current folder level
    let levelDocs = documents.filter((d) => {
      // If root level, folderId must be null or undefined
      if (currentFolderId === null) {
        return !d.folderId;
      }
      return d.folderId === currentFolderId;
    });

    // Step 2: Apply Search query globally if text exists, ignoring directories
    if (q) {
      levelDocs = documents.filter((d) =>
        d.type !== 'folder' && d.title.toLowerCase().includes(q)
      );
    }

    // Step 3: Apply favorites tab filter
    if (filterType === 'favorites') {
      levelDocs = levelDocs.filter((d) => d.isFavorite);
    }

    // Step 4: Sorting logic
    return levelDocs.sort((a, b) => {
      if (sortBy === 'name') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'size') {
        const sizeA = (a as any).fileSize || 0;
        const sizeB = (b as any).fileSize || 0;
        return sizeB - sizeA;
      }
      // Default: date (newest first)
      const tA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
      const tB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
      return tB - tA;
    });
  }, [documents, query, currentFolderId, filterType, sortBy]);

  // List of all folders (useful for "Move to Folder" dropdown selection)
  const allFoldersList = useMemo(() => {
    return documents.filter((d) => d.type === 'folder');
  }, [documents]);

  // Navigate deeper into folder structure
  const handleOpenFolder = (folder: DocumentMeta) => {
    setCurrentFolderId(folder.id);
    setFolderPath((prev) => [...prev, folder]);
    setQuery(''); // Reset search
  };

  // Jump directly to folder in breadcrumbs path
  const handleBreadcrumbClick = (id: string | null) => {
    if (id === null) {
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      const index = folderPath.findIndex((f) => f.id === id);
      if (index !== -1) {
        const nextPath = folderPath.slice(0, index + 1);
        setCurrentFolderId(id);
        setFolderPath(nextPath);
      }
    }
    setQuery('');
  };

  // Drag and Drop files handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processUpload(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await processUpload(files[0]);
    }
  };

  // Direct PDF Upload Processor
  const processUpload = async (file: File) => {
    if (!currentUser || !userRole) return;

    // Strict validation: Reject non-PDFs
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are supported. Please select a valid PDF.');
      return;
    }

    // Size limit check: 50MB
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size exceeds the 50MB maximum limit.');
      return;
    }

    setUploadingName(file.name);
    setUploadProgress(1);

    try {
      // 1. Upload to Cloudinary using progress monitoring callback
      const fileUrl = await uploadToCloudinary(file, 'document', {
        onProgress: (percent) => setUploadProgress(percent),
        showErrorToast: false,
      });

      // 2. Create high-fidelity document meta entry in Firestore
      await addDoc(collection(db, 'documents'), {
        title: file.name.replace(/\.[^/.]+$/, ''), // Strip PDF extension
        type: 'pdf',
        ownerId: currentUser.uid,
        role: userRole,
        schoolId: (userData as any)?.schoolId ?? null,
        folderId: currentFolderId,
        sharedWith: [],
        visibility: 'private',
        fileUrl,
        fileSize: file.size,
        pageCount: 0, // Will be computed in the reader upon first render
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        version: 1,
      });

      toast.success(`${file.name} uploaded successfully!`);
      setUploadProgress(null);
      setUploadingName('');
    } catch (err) {
      console.error('File upload failed:', err);
      toast.error('Upload failed. Please check your network and retry.');
      setUploadProgress(null);
      setUploadingName('');
    }
  };

  // Folder Actions
  const handleCreateFolder = async () => {
    if (!currentUser || !userRole || !folderTitle.trim()) return;
    setIsCreatingFolder(true);
    try {
      await createFolder({
        title: folderTitle.trim(),
        ownerId: currentUser.uid,
        role: userRole,
        schoolId: (userData as any)?.schoolId,
        parentId: currentFolderId,
      });
      toast.success('Folder created successfully!');
      setFolderTitle('');
      setCreateFolderOpen(false);
    } catch (err) {
      toast.error('Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleRename = async () => {
    if (!selectedDoc || !renameTitle.trim()) return;
    setIsRenaming(true);
    try {
      await renameDocument(selectedDoc.id, renameTitle.trim());
      toast.success('Renamed successfully!');
      setRenameOpen(false);
      setSelectedDoc(null);
    } catch (err) {
      toast.error('Failed to rename document');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleMove = async () => {
    if (!selectedDoc) return;
    setIsMoving(true);
    try {
      const destId = targetFolderId === 'root' ? null : targetFolderId;
      if (selectedDoc.id === destId) {
        toast.error('Cannot move a folder inside itself.');
        return;
      }
      await moveDocument(selectedDoc.id, destId);
      toast.success('Moved successfully!');
      setMoveOpen(false);
      setSelectedDoc(null);
    } catch (err) {
      toast.error('Failed to move item');
    } finally {
      setIsMoving(false);
    }
  };

  const handleDelete = async (docMeta: DocumentMeta) => {
    const isFolder = docMeta.type === 'folder';
    const msg = isFolder
      ? `Are you sure you want to delete folder "${docMeta.title}"? Contents inside this folder will also be deleted.`
      : `Delete PDF document "${docMeta.title}"? This cannot be undone.`;

    if (!window.confirm(msg)) return;

    try {
      await deleteDocument(docMeta.id);
      toast.success('Deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleToggleFavorite = async (docMeta: DocumentMeta) => {
    try {
      await toggleDocumentFavorite(docMeta.id, !docMeta.isFavorite);
      toast.success(docMeta.isFavorite ? 'Removed from Bookmarks' : 'Marked as Bookmarked!');
    } catch (err) {
      toast.error('Could not update bookmarks');
    }
  };

  // Sharing handling simulation / direct hook
  const handleShare = async () => {
    if (!selectedDoc || !shareEmail.trim()) return;
    setIsSharing(true);
    try {
      // Simulate/Trigger Internal sharing
      // (in existing library, standard internal sharing updates sharedWith list)
      const refDoc = doc(db, 'documents', selectedDoc.id);
      await updateDoc(refDoc, {
        sharedWith: [...(selectedDoc.sharedWith || []), shareEmail.trim()],
        updatedAt: serverTimestamp(),
      });
      toast.success(`Shared document with ${shareEmail}`);
      setShareEmail('');
      setShareOpen(false);
      setSelectedDoc(null);
    } catch (err) {
      toast.error('Failed to share document');
    } finally {
      setIsSharing(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    if (mb < 0.1) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  // Header quick buttons
  const headerRight = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setLayout((l) => (l === 'grid' ? 'list' : 'grid'))}
        className="glass-card border-emerald-500/10 hover:border-emerald-500/30"
        title={layout === 'grid' ? 'List view' : 'Grid view'}
      >
        {layout === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadProgress !== null}
        className="glass-card border-amber-500/10 hover:border-amber-500/30 text-amber-500 hover:bg-amber-500/5"
        title="Upload PDF Document"
      >
        {uploadProgress !== null ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <Upload className="w-4 h-4" />}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="application/pdf"
        onChange={handleFileChange}
      />
      <Button
        onClick={() => setCreateFolderOpen(true)}
        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/10 hover:scale-[1.02] active:scale-98 transition-all"
      >
        <Plus className="w-4 h-4 mr-2" />
        New Folder
      </Button>
    </div>
  );

  return (
    <>
      <SEO title="Liverton Documents & PDF Reader" description="Professional PDF reader and document cloud on Liverton Learning." noIndex />
      <DashboardShell title="Documents Library" userRole={userRole} headerRight={headerRight}>
        <div className="px-4 lg:px-6 py-6 space-y-8 max-w-7xl mx-auto relative z-10">


          {/* Upload Progress Status Card */}
          {uploadProgress !== null && (
            <Card className="glass-card border-amber-500/30 bg-amber-500/5 animate-pulse">
              <CardContent className="pt-6 pb-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">Uploading "{uploadingName}"...</span>
                  </div>
                  <span className="text-amber-500 font-black">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2 bg-slate-200/50 dark:bg-slate-800/50 [&>div]:bg-amber-500" />
              </CardContent>
            </Card>
          )}

          {/* Continue Reading Section (Only rendered if there are history files) */}
          {continueReading.length > 0 && query.trim() === '' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">Continue Reading</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {continueReading.map((file) => (
                  <Card
                    key={file.docId}
                    onClick={() => navigate(`/dashboard/documents/${file.docId}`)}
                    className="group glass-card border-slate-200/50 dark:border-white/5 hover:border-emerald-500/30 bg-white/40 dark:bg-[#0e0e15]/40 hover:shadow-xl hover:-translate-y-1 cursor-pointer transition-all duration-300"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <Badge variant="secondary" className="text-[10px] py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                          {file.percentage}% read
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-500 transition-colors" title={file.title}>
                          {file.title}
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Last opened: {new Date(file.lastOpenedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                          <span>Page {file.lastPageRead}</span>
                          <span>of {file.totalPages}</span>
                        </div>
                        <Progress value={file.percentage} className="h-1 bg-slate-200/50 dark:bg-slate-800/50 [&>div]:bg-emerald-500" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Directory Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between bg-white/40 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 backdrop-blur-md">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search PDF files..."
                className="pl-10 glass-card bg-white/50 border-slate-200/50 dark:border-white/5 dark:bg-[#07070a]/50 text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)} className="w-auto">
                <TabsList className="bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200/30 dark:border-white/5">
                  <TabsTrigger value="all" className="text-xs">All Files</TabsTrigger>
                  <TabsTrigger value="favorites" className="text-xs flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Bookmarks
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="glass-card text-xs font-semibold flex items-center gap-1">
                    Sort: {sortBy === 'name' ? 'Name' : sortBy === 'size' ? 'Size' : 'Date'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-card">
                  <DropdownMenuItem onClick={() => setSortBy('name')}>Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('date')}>Upload Date</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('size')}>File Size</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Breadcrumbs Navigation */}
          {query.trim() === '' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold px-1 overflow-x-auto whitespace-nowrap">
              {currentBreadcrumbs.map((crumb, idx) => {
                const isLast = idx === currentBreadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.id || 'root'}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                    <button
                      onClick={() => handleBreadcrumbClick(crumb.id)}
                      disabled={isLast}
                      className={`hover:text-emerald-500 transition-colors flex items-center gap-1 ${
                        isLast ? 'text-slate-800 dark:text-white font-extrabold' : ''
                      }`}
                    >
                      {crumb.id === null ? <Home className="w-3.5 h-3.5" /> : null}
                      <span>{crumb.title}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Desktop Drag-And-Drop Zone Wrapping Card */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-3xl transition-all duration-300 ${
              isDragOver
                ? 'ring-4 ring-emerald-500/40 bg-emerald-500/5 border-2 border-dashed border-emerald-500'
                : 'border border-transparent'
            }`}
          >
            {isDragOver && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 dark:bg-[#09090f]/90 backdrop-blur-sm rounded-3xl pointer-events-none gap-2">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 animate-bounce">
                  <Upload className="w-8 h-8" />
                </div>
                <span className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">Drop PDF to Upload</span>
                <span className="text-xs text-slate-400">Supports up to 50MB</span>
              </div>
            )}

            {/* Main Library List / Grid view */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <p className="text-sm text-slate-500 font-semibold animate-pulse">Scanning documents library...</p>
              </div>
            ) : error ? (
              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="pt-6 text-red-500 font-bold text-sm text-center">{error}</CardContent>
              </Card>
            ) : filteredContents.length === 0 ? (
              <Card className="glass-card bg-white/30 dark:bg-white/[0.01] border-dashed border-slate-200/80 dark:border-white/5 rounded-3xl py-16 text-center">
                <CardContent className="space-y-4 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-600 mx-auto">
                    <FolderOpen className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Your folder is empty</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Upload PDF textbook worksheets, notes, or reference handbooks. Drag & drop files directly anywhere on this library screen!
                    </p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-black dark:bg-white text-white dark:text-black font-extrabold text-xs hover:scale-102 active:scale-98 transition-transform"
                  >
                    Select PDF File
                  </Button>
                </CardContent>
              </Card>
            ) : layout === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredContents.map((d) => {
                  const isFolder = d.type === 'folder';
                  return (
                    <Card
                      key={d.id}
                      className="group relative glass-card border-slate-200/50 dark:border-white/5 bg-white/60 dark:bg-[#0e0e15]/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                    >
                      {/* Interactive click area */}
                      <div
                        onClick={() => {
                          if (isFolder) {
                            handleOpenFolder(d);
                          } else {
                            navigate(`/dashboard/documents/${d.id}`);
                          }
                        }}
                        className="p-5 space-y-4 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                            isFolder
                              ? 'bg-amber-500/15 text-amber-500 dark:bg-amber-500/10'
                              : 'bg-emerald-500/15 text-emerald-500 dark:bg-emerald-500/10'
                          }`}>
                            {isFolder ? <Folder className="w-6 h-6 fill-amber-500/10" /> : <FileText className="w-6 h-6" />}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(d);
                            }}
                            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-amber-500 transition-colors"
                          >
                            <Star className={`w-4 h-4 ${d.isFavorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-500 transition-colors" title={d.title}>
                            {d.title}
                          </h3>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                            {isFolder ? (
                              <span>Folder Directory</span>
                            ) : (
                              <>
                                <span>PDF Document</span>
                                <span>•</span>
                                <span>{formatFileSize((d as any).fileSize)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Options menu in footer */}
                      <div className="absolute right-3 bottom-3 z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-card">
                            <DropdownMenuItem
                              onClick={() => {
                                if (isFolder) {
                                  handleOpenFolder(d);
                                } else {
                                  navigate(`/dashboard/documents/${d.id}`);
                                }
                              }}
                            >
                              Open
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedDoc(d);
                                setRenameTitle(d.title);
                                setRenameOpen(true);
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedDoc(d);
                                setTargetFolderId(d.folderId || 'root');
                                setMoveOpen(true);
                              }}
                            >
                              <Move className="w-3.5 h-3.5 mr-2" /> Move to...
                            </DropdownMenuItem>
                            {!isFolder && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDoc(d);
                                  setShareEmail('');
                                  setShareOpen(true);
                                }}
                              >
                                <Share2 className="w-3.5 h-3.5 mr-2" /> Share Link
                              </DropdownMenuItem>
                            )}
                            {!isFolder && (d as any).fileUrl && (
                              <DropdownMenuItem asChild>
                                <a href={(d as any).fileUrl} download={d.title + '.pdf'} target="_blank" rel="noreferrer">
                                  <Download className="w-3.5 h-3.5 mr-2" /> Download File
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="border-slate-200/50 dark:border-white/5" />
                            <DropdownMenuItem onClick={() => handleDelete(d)} className="text-red-500 hover:bg-red-500/10">
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              // List layout
              <div className="space-y-3">
                {filteredContents.map((d) => {
                  const isFolder = d.type === 'folder';
                  return (
                    <Card
                      key={d.id}
                      className="group glass-card border-slate-200/50 dark:border-white/5 bg-white/60 dark:bg-[#0e0e15]/60 hover:shadow-md transition-all duration-300 overflow-hidden"
                    >
                      <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                        <div
                          onClick={() => {
                            if (isFolder) {
                              handleOpenFolder(d);
                            } else {
                              navigate(`/dashboard/documents/${d.id}`);
                            }
                          }}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isFolder
                              ? 'bg-amber-500/15 text-amber-500 dark:bg-amber-500/10'
                              : 'bg-emerald-500/15 text-emerald-500 dark:bg-emerald-500/10'
                          }`}>
                            {isFolder ? <Folder className="w-5 h-5 fill-amber-500/10" /> : <FileText className="w-5 h-5" />}
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-500 transition-colors">
                              {d.title}
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-0.5">
                              {isFolder ? (
                                <span>Folder Directory</span>
                              ) : (
                                <>
                                  <span>PDF Document</span>
                                  <span>•</span>
                                  <span>{formatFileSize((d as any).fileSize)}</span>
                                  <span>•</span>
                                  <span>{d.updatedAt instanceof Date ? d.updatedAt.toLocaleDateString() : '—'}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleFavorite(d)}
                            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-amber-500 transition-colors mr-1"
                          >
                            <Star className={`w-4 h-4 ${d.isFavorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass-card">
                              <DropdownMenuItem
                                onClick={() => {
                                  if (isFolder) {
                                    handleOpenFolder(d);
                                  } else {
                                    navigate(`/dashboard/documents/${d.id}`);
                                  }
                                }}
                              >
                                Open
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDoc(d);
                                  setRenameTitle(d.title);
                                  setRenameOpen(true);
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-2" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDoc(d);
                                  setTargetFolderId(d.folderId || 'root');
                                  setMoveOpen(true);
                                }}
                              >
                                <Move className="w-3.5 h-3.5 mr-2" /> Move to...
                              </DropdownMenuItem>
                              {!isFolder && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedDoc(d);
                                    setShareEmail('');
                                    setShareOpen(true);
                                  }}
                                >
                                  <Share2 className="w-3.5 h-3.5 mr-2" /> Share Link
                                </DropdownMenuItem>
                              )}
                              {!isFolder && (d as any).fileUrl && (
                                <DropdownMenuItem asChild>
                                  <a href={(d as any).fileUrl} download={d.title + '.pdf'} target="_blank" rel="noreferrer">
                                    <Download className="w-3.5 h-3.5 mr-2" /> Download File
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="border-slate-200/50 dark:border-white/5" />
                              <DropdownMenuItem onClick={() => handleDelete(d)} className="text-red-500 hover:bg-red-500/10">
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Create Folder Modal */}
        <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
          <DialogContent className="glass-card sm:max-w-md border-slate-200/80 dark:border-white/10">
            <DialogHeader>
              <DialogTitle className="font-extrabold text-slate-800 dark:text-white">Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="folder-name" className="font-bold text-xs text-slate-500 uppercase tracking-widest">Folder Name</Label>
                <Input
                  id="folder-name"
                  value={folderTitle}
                  onChange={(e) => setFolderTitle(e.target.value)}
                  placeholder="E.g., Geography Notes, Past Exams..."
                  className="glass-card"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateFolderOpen(false)} className="glass-card">
                Cancel
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={isCreatingFolder || !folderTitle.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              >
                {isCreatingFolder ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Folder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rename Modal */}
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent className="glass-card sm:max-w-md border-slate-200/80 dark:border-white/10">
            <DialogHeader>
              <DialogTitle className="font-extrabold text-slate-800 dark:text-white">Rename Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="rename-title" className="font-bold text-xs text-slate-500 uppercase tracking-widest">New Title</Label>
                <Input
                  id="rename-title"
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  placeholder="Enter new title..."
                  className="glass-card"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameOpen(false)} className="glass-card">
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                disabled={isRenaming || !renameTitle.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              >
                {isRenaming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Move Item Modal */}
        <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
          <DialogContent className="glass-card sm:max-w-md border-slate-200/80 dark:border-white/10">
            <DialogHeader>
              <DialogTitle className="font-extrabold text-slate-800 dark:text-white">Move to Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label className="font-bold text-xs text-slate-500 uppercase tracking-widest">Select Destination Directory</Label>
                <select
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white/50 dark:bg-slate-900/50 p-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="root">Root Directory (All Files)</option>
                  {allFoldersList
                    .filter((f) => f.id !== selectedDoc?.id) // Do not let user move folder inside itself
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        📁 {f.title}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMoveOpen(false)} className="glass-card">
                Cancel
              </Button>
              <Button onClick={handleMove} disabled={isMoving} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
                {isMoving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Move Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Share Modal */}
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogContent className="glass-card sm:max-w-md border-slate-200/80 dark:border-white/10">
            <DialogHeader>
              <DialogTitle className="font-extrabold text-slate-800 dark:text-white">Share Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="share-email" className="font-bold text-xs text-slate-500 uppercase tracking-widest">Collaborator Email</Label>
                <Input
                  id="share-email"
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="glass-card"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleShare();
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShareOpen(false)} className="glass-card">
                Cancel
              </Button>
              <Button onClick={handleShare} disabled={isSharing || !shareEmail.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
                {isSharing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Share Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </DashboardShell>
    </>
  );
}
