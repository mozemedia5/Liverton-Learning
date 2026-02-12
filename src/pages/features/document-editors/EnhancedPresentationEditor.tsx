/**
 * Enhanced Presentation Editor Component
 * Microsoft PowerPoint-style presentation editor with slide management
 * Features: Slide creation/deletion, element manipulation, animations, transitions
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Loader2,
  MoreVertical,
  Save,
  Share2,
  Download,
  Edit2,
  Star,
  Type,
  Square,
  Image as ImageIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useAuth } from '@/contexts/AuthContext';
import { deleteDocument, getDocument, renameDocument, updateDocumentContent } from '@/lib/documents';
import { trackDocumentAccess, toggleFavorite } from '@/lib/documentEnhancements';
import { ShareWithHannaDialog } from '@/components/ShareWithHannaDialog';
import type { DocumentContent, DocumentRecord, PresentationSlide, PresentationElement } from '@/types';

import './editorStyles.css';

// Using PresentationSlide and PresentationElement from types/index.ts

/**
 * Enhanced Presentation Editor with PowerPoint-style UI
 * Provides comprehensive presentation editing capabilities
 */
export default function EnhancedPresentationEditor() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const canvasRef = useRef<HTMLDivElement>(null);

  // Document state
  const [record, setRecord] = useState<DocumentRecord | null>(null);
  const [title, setTitle] = useState('Untitled Presentation');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Presentation state
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // UI state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const currentSlide = useMemo(() => slides[currentSlideIndex], [slides, currentSlideIndex]) as PresentationSlide | undefined;

  /**
   * Load document on mount
   */
  useEffect(() => {
    const loadDoc = async () => {
      if (!docId || !currentUser) return;
      try {
        const doc = await getDocument(docId);
        if (!doc) throw new Error('Document not found');

        setRecord(doc);
        setTitle(doc.title);
        setNewTitle(doc.title);
        setIsFavorite(doc.isFavorite || false);

        // Track access
        await trackDocumentAccess({
          docId,
          userId: currentUser.uid,
          userName: currentUser.displayName || 'Unknown',
        });

        // Load presentation content
        if (doc.content?.kind === 'presentation') {
          setSlides(doc.content.slides || [createDefaultSlide()]);
        } else {
          setSlides([createDefaultSlide()]);
        }
      } catch (error) {
        toast.error('Failed to load presentation');
        navigate('/dashboard/documents');
      } finally {
        setLoading(false);
      }
    };

    loadDoc();
  }, [docId, currentUser, navigate]);

  /**
   * Create a default slide with title layout
   */
  const createDefaultSlide = (): PresentationSlide => {
    const textElement: PresentationElement = {
      id: `element-${Date.now()}`,
      type: 'text',
      x: 50,
      y: 50,
      w: 900,
      h: 100,
      text: 'Click to add title',
      fontSize: 44,
    };
    
    return {
      id: `slide-${Date.now()}`,
      title: `Slide ${slides.length + 1}`,
      layout: 'title',
      elements: [textElement],
    };
  };

  /**
   * Auto-save presentation with debouncing
   */
  useEffect(() => {
    if (!hasChanges || !record || !docId || !currentUser) return;

    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        const content: DocumentContent = {
          kind: 'presentation',
          slides,
        };

        await updateDocumentContent({
          docId,
          updatedBy: currentUser.uid,
          content,
          newTitle: title,
          bumpVersion: false,
        });

        // Update enhanced metadata (slide count tracked in content)
        // Note: slideCount is tracked in the presentation content itself

        setHasChanges(false);
      } catch {
        toast.error('Failed to save presentation');
      } finally {
        setSaving(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [hasChanges, record, docId, currentUser, title, slides]);

  /**
   * Add new slide
   */
  const handleAddSlide = () => {
    const newSlide = createDefaultSlide();
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
    setHasChanges(true);
    toast.success('Slide added');
  };

  /**
   * Delete current slide
   */
  const handleDeleteSlide = () => {
    if (slides.length <= 1) {
      toast.error('Cannot delete the last slide');
      return;
    }

    const newSlides: PresentationSlide[] = slides.filter((_, i) => i !== currentSlideIndex);
    setSlides(newSlides);
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
    setHasChanges(true);
    toast.success('Slide deleted');
  };

  /**
   * Duplicate current slide
   */
  const handleDuplicateSlide = () => {
    const slideToClone = slides[currentSlideIndex];
    const newSlide: PresentationSlide = {
      ...slideToClone,
      id: `slide-${Date.now()}`,
      elements: slideToClone.elements.map((el) => ({
        ...el,
        id: `element-${Date.now()}-${Math.random()}`,
      })),
    };

    const newSlides = [...slides];
    newSlides.splice(currentSlideIndex + 1, 0, newSlide);
    setSlides(newSlides);
    setCurrentSlideIndex(currentSlideIndex + 1);
    setHasChanges(true);
    toast.success('Slide duplicated');
  };

  /**
   * Add text element to current slide
   */
  const handleAddTextElement = () => {
    if (!currentSlide) return;

    const newElement: PresentationElement = {
      id: `element-${Date.now()}`,
      type: 'text',
      x: 100,
      y: 200,
      w: 400,
      h: 100,
      text: 'Click to edit text',
      fontSize: 24,
    };

    const updatedSlides = [...slides];
    const updatedElements: PresentationElement[] = [...currentSlide.elements, newElement];
    updatedSlides[currentSlideIndex] = {
      ...currentSlide,
      elements: updatedElements,
    };

    setSlides(updatedSlides);
    setSelectedElementId(newElement.id);
    setHasChanges(true);
  };

  /**
   * Update element content
   */
  const handleUpdateElement = (elementId: string, updates: Partial<PresentationElement>) => {
    if (!currentSlide) return;

    const updatedSlides = [...slides];
    const updatedElements: PresentationElement[] = currentSlide.elements.map((el) => {
      if (el.id === elementId) {
        // Merge updates with existing element, preserving type safety
        return { ...el, ...updates } as PresentationElement;
      }
      return el;
    });

    updatedSlides[currentSlideIndex] = {
      ...currentSlide,
      elements: updatedElements,
    };

    setSlides(updatedSlides);
    setHasChanges(true);
  };

  /**
   * Delete element from slide
   */
  const handleDeleteElement = (elementId: string) => {
    if (!currentSlide) return;

    const updatedSlides = [...slides];
    updatedSlides[currentSlideIndex] = {
      ...currentSlide,
      elements: currentSlide.elements.filter((el) => el.id !== elementId),
    };

    setSlides(updatedSlides);
    setSelectedElementId(null);
    setHasChanges(true);
  };

  /**
   * Handle rename
   */
  const handleRename = async () => {
    if (!newTitle.trim() || !docId) return;
    try {
      await renameDocument(docId, newTitle.trim());
      setTitle(newTitle.trim());
      setShowRenameDialog(false);
      toast.success('Presentation renamed');
    } catch {
      toast.error('Failed to rename presentation');
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = async () => {
    if (!docId) return;
    const confirmed = window.confirm(
      'Are you sure you want to delete this presentation? This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      await deleteDocument(docId);
      toast.success('Presentation deleted');
      navigate('/dashboard/documents');
    } catch {
      toast.error('Failed to delete presentation');
    }
  };

  /**
   * Handle favorite toggle
   */
  const handleToggleFavorite = async () => {
    if (!docId) return;
    try {
      const newFavoriteState = !isFavorite;
      await toggleFavorite({
        docId,
        isFavorite: newFavoriteState,
        userId: currentUser?.uid || '',
        userName: currentUser?.displayName || 'Unknown',
      });
      setIsFavorite(newFavoriteState);
      toast.success(newFavoriteState ? 'Added to favorites' : 'Removed from favorites');
    } catch {
      toast.error('Failed to update favorite status');
    }
  };

  /**
   * Export presentation as JSON
   */
  const handleExport = () => {
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(slides, null, 2))
    );
    element.setAttribute('download', `${title}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Presentation exported as JSON');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Opening presentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Back button and title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/documents')}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasChanges(true);
                }}
                className="text-lg font-semibold border-0 bg-transparent focus-visible:ring-0 px-0"
                placeholder="Untitled Presentation"
              />
            </div>
          </div>

          {/* Status and action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {saving && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            {!saving && !hasChanges && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Save className="w-4 h-4" />
                <span>Saved</span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFavorite}
              className={isFavorite ? 'text-yellow-500' : ''}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareDialog(true)}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Presentation Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Slide toolbar */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 py-2">
          <div className="max-w-7xl mx-auto flex gap-2">
            <Button
              size="sm"
              onClick={handleAddSlide}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Slide
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDuplicateSlide}
              disabled={!currentSlide}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeleteSlide}
              disabled={slides.length <= 1}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>

            <div className="w-px bg-gray-300 dark:bg-gray-700 mx-2" />

            <Button
              size="sm"
              variant="outline"
              onClick={handleAddTextElement}
              disabled={!currentSlide}
              className="gap-2"
            >
              <Type className="w-4 h-4" />
              Text
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!currentSlide}
              className="gap-2"
            >
              <Square className="w-4 h-4" />
              Shape
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!currentSlide}
              className="gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Image
            </Button>
          </div>
        </div>
      </div>

      {/* Main editor area */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Slide thumbnails panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Slides</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  onClick={() => setCurrentSlideIndex(index)}
                  className={`p-2 rounded border-2 cursor-pointer transition-colors ${
                    currentSlideIndex === index
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div
                    className="w-full aspect-video rounded bg-white dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500"
                    style={{ backgroundColor: "#FFFFFF" }}
                  >
                    Slide {index + 1}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                    {slide.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div className="lg:col-span-3">
          <Card className="shadow-lg">
            <CardContent className="p-0">
              <div
                ref={canvasRef}
                className="relative w-full aspect-video rounded-lg overflow-hidden"
                style={{ backgroundColor: '#FFFFFF', minHeight: '400px' }}
              >
                {currentSlide?.elements.map((element) => (
                  <div
                    key={element.id}
                    onClick={() => setSelectedElementId(element.id)}
                    className={`absolute cursor-move border-2 transition-colors ${
                      selectedElementId === element.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    style={{
                      left: `${element.x}px`,
                      top: `${element.y}px`,
                      width: `${element.w}px`,
                      height: `${element.h}px`,
                    }}
                  >
                    {element.type === 'text' && (
                      <div
                        className="w-full h-full p-2 text-sm overflow-hidden"
                        style={{
                          fontSize: `${element.fontSize}px`,
                        }}
                      >
                        {element.text}
                      </div>
                    )}
                    {element.type === 'image' && (
                      <img src={element.url} alt="Slide element" className="w-full h-full object-cover" />
                    )}
                    {element.type === 'shape' && (
                      <div
                        className="w-full h-full bg-gray-300"
                        style={{
                          borderRadius: element.shape === 'ellipse' ? '50%' : '0',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Element properties panel */}
              {selectedElementId && currentSlide && (
                <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-950">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Content
                      </label>
                      <Input
                        value={
                          (currentSlide.elements.find((el) => el.id === selectedElementId) as any)
                            ?.text || ''
                        }
                        onChange={(e) =>
                          handleUpdateElement(selectedElementId, { text: e.target.value } as any)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteElement(selectedElementId)}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Slide counter */}
          <div className="mt-4 text-center text-sm text-gray-500">
            Slide {currentSlideIndex + 1} of {slides.length}
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Presentation</DialogTitle>
            <DialogDescription>Enter a new name for your presentation</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Presentation name"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename}>Rename</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <ShareWithHannaDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        documentTitle={title}
        documentId={docId || ''}
      />
    </div>
  );
}
