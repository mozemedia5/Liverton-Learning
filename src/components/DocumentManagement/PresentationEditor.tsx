/**
 * Presentation Editor Component
 * Microsoft PowerPoint-style presentation editor with full editing tools
 */

import React, { useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Download,
  Play,
  ChevronLeft,
  ChevronRight,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Layers,
  Group,
  Ungroup,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Scissors,
  Image,
  Type,
  Square,
  Sparkles,
  Clock,
  MousePointer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface SlideObject {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style?: React.CSSProperties;
}

interface Slide {
  id: string;
  title: string;
  content: string;
  layout: 'title' | 'content' | 'two-column' | 'blank';
  backgroundColor: string;
  objects: SlideObject[];
  animation?: string;
  transition?: string;
}

interface PresentationEditorProps {
  document?: EnhancedDocumentMeta;
  readOnly?: boolean;
  onSave?: (slides: Slide[], metadata: Partial<EnhancedDocumentMeta>) => void;
}

const animations = [
  'none',
  'fade',
  'slide',
  'zoom',
  'bounce',
  'flip',
  'rotate',
];

const transitions = [
  'none',
  'fade',
  'slide',
  'push',
  'wipe',
  'cover',
  'dissolve',
];

const layouts = [
  { id: 'title', name: 'Title Slide', icon: 'T' },
  { id: 'content', name: 'Content', icon: 'C' },
  { id: 'two-column', name: 'Two Column', icon: '2' },
  { id: 'blank', name: 'Blank', icon: 'B' },
  { id: 'title-content', name: 'Title & Content', icon: 'TC' },
  { id: 'image-left', name: 'Image Left', icon: 'IL' },
  { id: 'image-right', name: 'Image Right', icon: 'IR' },
];

const backgroundColors = [
  '#ffffff', '#f3f4f6', '#dbeafe', '#ddd6fe', '#fce7f3',
  '#fef3c7', '#dcfce7', '#f0fdfa', '#fee2e2', '#f3e8ff',
];

/**
 * Presentation Editor with PowerPoint-style interface and full editing tools
 * Supports slide management, layouts, animations, and object editing
 */
export const PresentationEditor: React.FC<PresentationEditorProps> = ({
  document,
  readOnly = false,
  onSave,
}) => {
  const [slides, setSlides] = useState<Slide[]>([
    {
      id: '1',
      title: 'Presentation Title',
      content: 'Subtitle goes here',
      layout: 'title',
      backgroundColor: '#ffffff',
      objects: [],
      animation: 'none',
      transition: 'fade',
    },
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [animationDialogOpen, setAnimationDialogOpen] = useState(false);
  const [transitionDialogOpen, setTransitionDialogOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const slideRef = useRef<HTMLDivElement>(null);

  const currentSlide = slides[currentSlideIndex];

  // Slide Editing Tools
  const handleAddSlide = (layout: string = 'content') => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      title: 'New Slide',
      content: 'Add your content here',
      layout: layout as any,
      backgroundColor: '#ffffff',
      objects: [],
      animation: 'none',
      transition: 'fade',
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length > 1) {
      const newSlides = slides.filter((_, i) => i !== index);
      setSlides(newSlides);
      if (currentSlideIndex >= newSlides.length) {
        setCurrentSlideIndex(newSlides.length - 1);
      }
    }
  };

  const handleDuplicateSlide = (index: number) => {
    const slide = slides[index];
    const newSlide: Slide = {
      ...slide,
      id: Date.now().toString(),
    };
    setSlides([...slides.slice(0, index + 1), newSlide, ...slides.slice(index + 1)]);
  };

  const handleReorderSlides = (fromIndex: number, toIndex: number) => {
    const newSlides = [...slides];
    const [movedSlide] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, movedSlide);
    setSlides(newSlides);
    setCurrentSlideIndex(toIndex);
  };

  const handleUpdateSlide = (updates: Partial<Slide>) => {
    const newSlides = [...slides];
    newSlides[currentSlideIndex] = { ...currentSlide, ...updates };
    setSlides(newSlides);

    if (onSave && document) {
      onSave(newSlides, { updatedAt: new Date() });
    }
  };

  // Object Editing Tools
  const handleAddTextBox = () => {
    const newObject: SlideObject = {
      id: Date.now().toString(),
      type: 'text',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      content: 'New Text Box',
    };
    handleUpdateSlide({
      objects: [...currentSlide.objects, newObject],
    });
    setSelectedObject(newObject.id);
  };

  const handleAddShape = () => {
    const newObject: SlideObject = {
      id: Date.now().toString(),
      type: 'shape',
      x: 150,
      y: 150,
      width: 150,
      height: 150,
      content: '',
      style: { backgroundColor: '#3b82f6', borderRadius: '8px' },
    };
    handleUpdateSlide({
      objects: [...currentSlide.objects, newObject],
    });
    setSelectedObject(newObject.id);
  };

  const handleDeleteObject = () => {
    if (selectedObject) {
      handleUpdateSlide({
        objects: currentSlide.objects.filter(obj => obj.id !== selectedObject),
      });
      setSelectedObject(null);
    }
  };

  // Object Alignment Tools
  const handleAlignObjects = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedObject) return;
    
    const obj = currentSlide.objects.find(o => o.id === selectedObject);
    if (!obj || !slideRef.current) return;

    const slideWidth = slideRef.current.offsetWidth;
    const slideHeight = slideRef.current.offsetHeight;
    
    let updates: Partial<SlideObject> = {};
    
    switch (alignment) {
      case 'left':
        updates = { x: 20 };
        break;
      case 'center':
        updates = { x: (slideWidth - obj.width) / 2 };
        break;
      case 'right':
        updates = { x: slideWidth - obj.width - 20 };
        break;
      case 'top':
        updates = { y: 20 };
        break;
      case 'middle':
        updates = { y: (slideHeight - obj.height) / 2 };
        break;
      case 'bottom':
        updates = { y: slideHeight - obj.height - 20 };
        break;
    }

    handleUpdateSlide({
      objects: currentSlide.objects.map(o =>
        o.id === selectedObject ? { ...o, ...updates } : o
      ),
    });
  };

  // Object Arrangement Tools
  const handleBringToFront = () => {
    if (!selectedObject) return;
    const obj = currentSlide.objects.find(o => o.id === selectedObject);
    if (obj) {
      const newObjects = currentSlide.objects.filter(o => o.id !== selectedObject);
      newObjects.push(obj);
      handleUpdateSlide({ objects: newObjects });
    }
  };

  const handleSendToBack = () => {
    if (!selectedObject) return;
    const obj = currentSlide.objects.find(o => o.id === selectedObject);
    if (obj) {
      const newObjects = currentSlide.objects.filter(o => o.id !== selectedObject);
      newObjects.unshift(obj);
      handleUpdateSlide({ objects: newObjects });
    }
  };

  // Animation Tools
  const handleSetAnimation = (animation: string) => {
    handleUpdateSlide({ animation });
    setAnimationDialogOpen(false);
  };

  const handleSetTransition = (transition: string) => {
    handleUpdateSlide({ transition });
    setTransitionDialogOpen(false);
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent, objectId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    setSelectedObject(objectId);
    const obj = currentSlide.objects.find(o => o.id === objectId);
    if (obj) {
      setDragOffset({
        x: e.clientX - obj.x,
        y: e.clientY - obj.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectedObject || readOnly) return;
    
    handleUpdateSlide({
      objects: currentSlide.objects.map(obj =>
        obj.id === selectedObject
          ? { ...obj, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
          : obj
      ),
    });
  };

  const handleDownload = () => {
    const json = JSON.stringify(slides, null, 2);
    const element = window.document.createElement('a');
    const file = new Blob([json], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `${document?.title || 'presentation'}.json`;
    window.document.body.appendChild(element);
    element.click();
    window.document.body.removeChild(element);
  };

  const renderSlidePreview = (slide: Slide, isPreview: boolean = false) => (
    <div
      ref={isPreview ? slideRef : undefined}
      className="w-full h-full flex flex-col relative overflow-hidden rounded"
      style={{ backgroundColor: slide.backgroundColor }}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setSelectedObject(null)}
    >
      {/* Slide Objects */}
      {slide.objects.map(obj => (
        <div
          key={obj.id}
          className={`absolute cursor-move ${selectedObject === obj.id ? 'ring-2 ring-blue-500' : ''}`}
          style={{
            left: obj.x,
            top: obj.y,
            width: obj.width,
            height: obj.height,
            ...obj.style,
          }}
          onMouseDown={(e) => handleMouseDown(e, obj.id)}
        >
          {obj.type === 'text' && (
            <div className="w-full h-full p-2 overflow-hidden" style={{ color: obj.style?.color || '#000' }}>
              {obj.content}
            </div>
          )}
          {obj.type === 'shape' && (
            <div className="w-full h-full" />
          )}
        </div>
      ))}
      
      {/* Default Content */}
      {slide.layout !== 'blank' && slide.objects.length === 0 && (
        <div className="flex flex-col justify-center items-center p-8 flex-1">
          <h3 className={`text-center mb-4 ${isPreview ? 'text-4xl' : 'text-lg'} font-bold text-slate-900`}>
            {slide.title}
          </h3>
          <p className={`text-center text-slate-600 ${isPreview ? 'text-xl' : 'text-sm'}`}>
            {slide.content}
          </p>
        </div>
      )}
    </div>
  );

  if (isPreviewMode) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl aspect-video rounded-lg overflow-hidden shadow-2xl">
          {renderSlidePreview(currentSlide, true)}
        </div>
        <div className="mt-8 flex gap-4">
          <Button
            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
            disabled={currentSlideIndex === 0}
            variant="outline"
            className="bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-white text-center min-w-20 flex items-center">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <Button
            onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
            disabled={currentSlideIndex === slides.length - 1}
            variant="outline"
            className="bg-white"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setIsPreviewMode(false)} variant="outline" className="mt-8 bg-white">
          Exit Preview
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Slide Thumbnails */}
      <div className="w-48 bg-white border-r border-slate-200 overflow-y-auto p-4 space-y-3">
        <h3 className="font-semibold text-sm text-slate-900 mb-4">Slides</h3>
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('slideIndex', index.toString())}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const fromIndex = parseInt(e.dataTransfer.getData('slideIndex'));
              handleReorderSlides(fromIndex, index);
            }}
            className={`cursor-pointer rounded border-2 overflow-hidden transition-all ${
              currentSlideIndex === index ? 'border-blue-500 shadow-md' : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => setCurrentSlideIndex(index)}
          >
            <div
              className="w-full aspect-video flex items-center justify-center p-2"
              style={{ backgroundColor: slide.backgroundColor }}
            >
              <p className="text-xs font-semibold text-slate-900 text-center truncate">
                {slide.title}
              </p>
            </div>
            <div className="bg-slate-50 px-2 py-1 text-xs text-slate-600 text-center">
              Slide {index + 1}
            </div>
          </div>
        ))}
        <Button onClick={() => handleAddSlide()} disabled={readOnly} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Slide
        </Button>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar - Slide Editing */}
        <div className="bg-white border-b border-slate-200 p-3 flex gap-2 flex-wrap">
          <span className="text-xs text-slate-500 mr-1 font-semibold flex items-center">SLIDE:</span>
          
          <Button onClick={() => handleDuplicateSlide(currentSlideIndex)} disabled={readOnly} variant="outline" size="sm" className="gap-1">
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
          
          <Button onClick={() => handleDeleteSlide(currentSlideIndex)} disabled={readOnly || slides.length === 1} variant="outline" size="sm" className="gap-1 text-red-600">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>

          <Select value={currentSlide.layout} onValueChange={(v) => handleUpdateSlide({ layout: v as any })} disabled={readOnly}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {layouts.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <Button onClick={() => setAnimationDialogOpen(true)} variant="outline" size="sm" className="gap-1">
            <Sparkles className="h-4 w-4" />
            Animation
          </Button>
          
          <Button onClick={() => setTransitionDialogOpen(true)} variant="outline" size="sm" className="gap-1">
            <Clock className="h-4 w-4" />
            Transition
          </Button>

          <div className="flex-1" />

          <Button onClick={() => setIsPreviewMode(true)} variant="outline" size="sm" className="gap-1">
            <Play className="h-4 w-4" />
            Preview
          </Button>
          
          <Button onClick={handleDownload} variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Object Editing Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-2 flex-wrap">
          <span className="text-xs text-slate-500 mr-1 font-semibold flex items-center">OBJECT:</span>
          
          <Button onClick={handleAddTextBox} disabled={readOnly} variant="ghost" size="sm" className="gap-1">
            <Type className="h-4 w-4" />
            Text
          </Button>
          
          <Button onClick={handleAddShape} disabled={readOnly} variant="ghost" size="sm" className="gap-1">
            <Square className="h-4 w-4" />
            Shape
          </Button>
          
          <Button onClick={handleDeleteObject} disabled={readOnly || !selectedObject} variant="ghost" size="sm" className="gap-1 text-red-600">
            <Scissors className="h-4 w-4" />
            Delete
          </Button>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <span className="text-xs text-slate-400 flex items-center">Align:</span>
          
          <Button onClick={() => handleAlignObjects('left')} disabled={!selectedObject} variant="ghost" size="sm" className="h-8 w-8 p-0" title="Align Left">
            <AlignLeft className="h-4 w-4" />
          </Button>
          
          <Button onClick={() => handleAlignObjects('center')} disabled={!selectedObject} variant="ghost" size="sm" className="h-8 w-8 p-0" title="Align Center">
            <AlignCenter className="h-4 w-4" />
          </Button>
          
          <Button onClick={() => handleAlignObjects('right')} disabled={!selectedObject} variant="ghost" size="sm" className="h-8 w-8 p-0" title="Align Right">
            <AlignRight className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <span className="text-xs text-slate-400 flex items-center">Arrange:</span>
          
          <Button onClick={handleBringToFront} disabled={!selectedObject} variant="ghost" size="sm" className="h-8 gap-1" title="Bring to Front">
            <Layers className="h-4 w-4" />
            Front
          </Button>
          
          <Button onClick={handleSendToBack} disabled={!selectedObject} variant="ghost" size="sm" className="h-8 gap-1" title="Send to Back">
            <Layers className="h-4 w-4 rotate-180" />
            Back
          </Button>
        </div>

        {/* Slide Editor */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Slide Preview */}
            <div className="rounded-lg shadow-lg overflow-hidden aspect-video bg-white">
              {renderSlidePreview(currentSlide, true)}
            </div>

            {/* Slide Properties */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">Slide Title</label>
                <Input
                  value={currentSlide.title}
                  onChange={e => handleUpdateSlide({ title: e.target.value })}
                  disabled={readOnly}
                  className="text-lg"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">Content</label>
                <Textarea
                  value={currentSlide.content}
                  onChange={e => handleUpdateSlide({ content: e.target.value })}
                  disabled={readOnly}
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">Background Color</label>
                <div className="flex gap-2 flex-wrap">
                  {backgroundColors.map(color => (
                    <button
                      key={color}
                      onClick={() => handleUpdateSlide({ backgroundColor: color })}
                      disabled={readOnly}
                      className={`w-8 h-8 rounded border-2 transition-all ${
                        currentSlide.backgroundColor === color ? 'border-blue-500 ring-2 ring-blue-300' : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t border-slate-200 px-8 py-3 flex items-center justify-between text-sm text-slate-600">
          <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
          <div className="flex gap-4">
            {currentSlide.animation !== 'none' && <span className="text-purple-600">Animation: {currentSlide.animation}</span>}
            {currentSlide.transition !== 'none' && <span className="text-blue-600">Transition: {currentSlide.transition}</span>}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))} disabled={currentSlideIndex === 0} variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))} disabled={currentSlideIndex === slides.length - 1} variant="ghost" size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Animation Dialog */}
      <Dialog open={animationDialogOpen} onOpenChange={setAnimationDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Slide Animation</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-2 pt-4">
            {animations.map(anim => (
              <Button
                key={anim}
                onClick={() => handleSetAnimation(anim)}
                variant={currentSlide.animation === anim ? 'default' : 'outline'}
                className="capitalize"
              >
                {anim}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transition Dialog */}
      <Dialog open={transitionDialogOpen} onOpenChange={setTransitionDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Slide Transition</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-2 pt-4">
            {transitions.map(trans => (
              <Button
                key={trans}
                onClick={() => handleSetTransition(trans)}
                variant={currentSlide.transition === trans ? 'default' : 'outline'}
                className="capitalize"
              >
                {trans}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PresentationEditor;
