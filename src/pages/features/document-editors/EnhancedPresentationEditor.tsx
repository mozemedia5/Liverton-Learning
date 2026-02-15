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
  Layout,
  Play,
  Settings2,
  Palette,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize,
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';

import { useAuth } from '@/contexts/AuthContext';
import { deleteDocument, getDocument, renameDocument, updateDocumentContent } from '@/lib/documents';
import { trackDocumentAccess, toggleFavorite } from '@/lib/documentEnhancements';
import { ShareWithHannaDialog } from '@/components/ShareWithHannaDialog';
import type { DocumentContent, DocumentRecord, PresentationSlide, PresentationElement } from '@/types';

import './editorStyles.css';

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
  const selectedElement = useMemo(() => 
    currentSlide?.elements.find(el => el.id === selectedElementId),
    [currentSlide, selectedElementId]
  );

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
      bold: true,
      align: 'center',
    };
    
    return {
      id: `slide-${Date.now()}`,
      elements: [textElement],
      layout: 'title',
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
   * Add element to current slide
   */
  const handleAddElement = (type: 'text' | 'image' | 'shape') => {
    if (!currentSlide) return;

    let newElement: PresentationElement;

    if (type === 'text') {
      newElement = {
        id: `element-${Date.now()}`,
        type: 'text',
        x: 100,
        y: 200,
        w: 400,
        h: 100,
        text: 'Click to edit text',
        fontSize: 24,
      };
    } else if (type === 'image') {
      const url = window.prompt('Enter image URL:');
      if (!url) return;
      newElement = {
        id: `element-${Date.now()}`,
        type: 'image',
        x: 100,
        y: 100,
        w: 300,
        h: 200,
        url,
      };
    } else {
      newElement = {
        id: `element-${Date.now()}`,
        type: 'shape',
        x: 100,
        y: 100,
        w: 100,
        h: 100,
        shape: 'rect',
      };
    }

    const updatedSlides = [...slides];
    updatedSlides[currentSlideIndex] = {
      ...currentSlide,
      elements: [...currentSlide.elements, newElement],
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
    updatedSlides[currentSlideIndex] = {
      ...currentSlide,
      elements: currentSlide.elements.map((el) => el.id === elementId ? { ...el, ...updates } as PresentationElement : el),
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
    const confirmed = window.confirm('Are you sure you want to delete this presentation?');
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 shadow-sm z-40">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/documents')}>
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
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saving && <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></div>}
            <Button variant="ghost" size="sm" onClick={handleToggleFavorite} className={isFavorite ? 'text-yellow-500' : ''}>
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)} className="gap-2">
              <Share2 className="w-4 h-4" /><span className="hidden sm:inline">Share</span>
            </Button>
            <Button variant="default" size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Play className="w-4 h-4" /><span>Present</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowRenameDialog(true)}><Edit2 className="w-4 h-4 mr-2" />Rename</DropdownMenuItem>
                <DropdownMenuItem onClick={() => {}}><Download className="w-4 h-4 mr-2" />Export PDF</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Presentation Toolbar */}
        <div className="px-4 py-1 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1 px-2">
            <Button variant="ghost" size="sm" onClick={handleAddSlide} className="gap-2 text-blue-600 font-semibold">
              <Plus className="w-4 h-4" /> Slide
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDuplicateSlide} title="Duplicate Slide"><Copy className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleDeleteSlide} title="Delete Slide" className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1 px-2">
            <Button variant="ghost" size="sm" onClick={() => handleAddElement('text')} title="Add Text"><Type className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => handleAddElement('image')} title="Add Image"><ImageIcon className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => handleAddElement('shape')} title="Add Shape"><Square className="w-4 h-4" /></Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          
          {selectedElement?.type === 'text' && (
            <div className="flex items-center gap-1 px-2">
              <Button variant="ghost" size="sm" onClick={() => handleUpdateElement(selectedElementId!, { bold: !selectedElement.bold })} className={selectedElement.bold ? 'bg-gray-100' : ''}><Bold className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => handleUpdateElement(selectedElementId!, { italic: !selectedElement.italic })} className={selectedElement.italic ? 'bg-gray-100' : ''}><Italic className="w-4 h-4" /></Button>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Button variant="ghost" size="sm" onClick={() => handleUpdateElement(selectedElementId!, { align: 'left' })} className={selectedElement.align === 'left' ? 'bg-gray-100' : ''}><AlignLeft className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => handleUpdateElement(selectedElementId!, { align: 'center' })} className={selectedElement.align === 'center' ? 'bg-gray-100' : ''}><AlignCenter className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => handleUpdateElement(selectedElementId!, { align: 'right' })} className={selectedElement.align === 'right' ? 'bg-gray-100' : ''}><AlignRight className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Slide Thumbnails */}
        <div className="w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-4 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Slides</h3>
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              onClick={() => {
                setCurrentSlideIndex(index);
                setSelectedElementId(null);
              }}
              className={`relative aspect-video rounded-md border-2 cursor-pointer transition-all hover:border-blue-300 overflow-hidden ${
                currentSlideIndex === index ? 'border-blue-600 shadow-md' : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-[8px] text-gray-400 pointer-events-none p-2 bg-gray-50 dark:bg-gray-900">
                {slide.elements.find(el => el.type === 'text')?.text || 'Blank Slide'}
              </div>
              <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 rounded">{index + 1}</div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={handleAddSlide} className="w-full border-dashed"><Plus className="w-4 h-4 mr-2" /> Add Slide</Button>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 bg-gray-200 dark:bg-gray-900 p-8 overflow-auto flex items-center justify-center">
          <div 
            ref={canvasRef}
            className="bg-white dark:bg-black shadow-2xl relative overflow-hidden"
            style={{ width: '960px', height: '540px', minWidth: '960px', minHeight: '540px' }}
            onClick={() => setSelectedElementId(null)}
          >
            {currentSlide?.elements.map((el) => (
              <div
                key={el.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElementId(el.id);
                }}
                className={`absolute cursor-move transition-shadow ${selectedElementId === el.id ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:ring-1 hover:ring-gray-300'}`}
                style={{
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.w}px`,
                  height: `${el.h}px`,
                }}
              >
                {el.type === 'text' && (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleUpdateElement(el.id, { text: e.currentTarget.innerText })}
                    className="w-full h-full p-2 outline-none break-words"
                    style={{
                      fontSize: `${el.fontSize || 24}px`,
                      fontWeight: el.bold ? 'bold' : 'normal',
                      fontStyle: el.italic ? 'italic' : 'normal',
                      textAlign: el.align || 'left',
                    }}
                  >
                    {el.text}
                  </div>
                )}
                {el.type === 'image' && (
                  <img src={el.url} alt="slide element" className="w-full h-full object-contain pointer-events-none" />
                )}
                {el.type === 'shape' && (
                  <div 
                    className={`w-full h-full bg-blue-500/20 border-2 border-blue-500 ${el.shape === 'ellipse' ? 'rounded-full' : ''}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-72 bg-white dark:bg-black border-l border-gray-200 dark:border-gray-800 p-4">
          <Tabs defaultValue="properties">
            <TabsList className="w-full">
              <TabsTrigger value="properties" className="flex-1">Properties</TabsTrigger>
              <TabsTrigger value="layout" className="flex-1">Layout</TabsTrigger>
            </TabsList>
            
            <TabsContent value="properties" className="py-4 flex flex-col gap-4">
              {selectedElement ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">Element Properties</h3>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteElement(selectedElementId!)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500">Position & Size</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] text-gray-400">X</span>
                          <Input type="number" value={selectedElement.x} onChange={(e) => handleUpdateElement(selectedElementId!, { x: parseInt(e.target.value) })} className="h-8" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-gray-400">Y</span>
                          <Input type="number" value={selectedElement.y} onChange={(e) => handleUpdateElement(selectedElementId!, { y: parseInt(e.target.value) })} className="h-8" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-gray-400">Width</span>
                          <Input type="number" value={selectedElement.w} onChange={(e) => handleUpdateElement(selectedElementId!, { w: parseInt(e.target.value) })} className="h-8" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-gray-400">Height</span>
                          <Input type="number" value={selectedElement.h} onChange={(e) => handleUpdateElement(selectedElementId!, { h: parseInt(e.target.value) })} className="h-8" />
                        </div>
                      </div>
                    </div>
                    
                    {selectedElement.type === 'text' && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500">Text Settings</label>
                        <div className="space-y-1">
                          <span className="text-[10px] text-gray-400">Font Size: {selectedElement.fontSize}px</span>
                          <Slider 
                            value={[selectedElement.fontSize || 24]} 
                            min={8} max={120} step={1}
                            onValueChange={([val]) => handleUpdateElement(selectedElementId!, { fontSize: val })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400">
                  <Settings2 className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm">Select an element to edit its properties</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="layout" className="py-4">
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" className="justify-start h-auto py-3 px-4 gap-3">
                  <Layout className="w-5 h-5 text-blue-500" />
                  <div className="text-left">
                    <div className="text-sm font-bold">Title Slide</div>
                    <div className="text-[10px] text-gray-500">Main title and subtitle</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3 px-4 gap-3">
                  <Layout className="w-5 h-5 text-blue-500" />
                  <div className="text-left">
                    <div className="text-sm font-bold">Title & Content</div>
                    <div className="text-[10px] text-gray-500">Title with text or media</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3 px-4 gap-3">
                  <Layout className="w-5 h-5 text-blue-500" />
                  <div className="text-left">
                    <div className="text-sm font-bold">Blank</div>
                    <div className="text-[10px] text-gray-500">Empty canvas</div>
                  </div>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 px-4 py-1.5 text-xs text-gray-500 flex justify-between items-center z-40">
        <div className="flex gap-4">
          <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
          <span>{currentSlide?.elements.length || 0} Elements</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${saving ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`} />
          <span>{saving ? 'Saving...' : 'Saved'}</span>
        </div>
      </div>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Presentation</DialogTitle></DialogHeader>
          <div className="py-4"><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRename()} /></div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowRenameDialog(false)}>Cancel</Button><Button onClick={handleRename}>Rename</Button></div>
        </DialogContent>
      </Dialog>

      <ShareWithHannaDialog open={showShareDialog} onOpenChange={setShowShareDialog} documentId={docId || ''} documentTitle={title} />
    </div>
  );
}
