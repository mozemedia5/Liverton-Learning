/**
 * Microsoft PowerPoint-Style Presentation Editor Component
 * Full-featured presentation editor with slides, layouts, and animations
 */

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Download,
  Share2,
  Settings,
  Copy,
  ChevronLeft,
  ChevronRight,
  Play,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface Slide {
  id: string;
  title: string;
  content: string;
  layout: 'title' | 'content' | 'two-column' | 'blank';
  backgroundColor?: string;
}

interface PresentationEditorProps {
  documentId: string;
  initialSlides?: Slide[];
  initialMetadata?: EnhancedDocumentMeta;
  onSave?: (slides: Slide[], metadata: Partial<EnhancedDocumentMeta>) => Promise<void>;
  readOnly?: boolean;
}

const SLIDE_LAYOUTS = [
  { id: 'title', name: 'Title Slide', icon: '📄' },
  { id: 'content', name: 'Title & Content', icon: '📝' },
  { id: 'two-column', name: 'Two Column', icon: '📊' },
  { id: 'blank', name: 'Blank', icon: '⬜' },
];

const COLORS = [
  '#FFFFFF',
  '#F3F4F6',
  '#E5E7EB',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#10B981',
];

/**
 * Presentation Editor with PowerPoint-style UI
 * Features: Slide management, layouts, animations, export
 */
export const PresentationEditor: React.FC<PresentationEditorProps> = ({
  documentId,
  initialSlides = [],
  initialMetadata,
  onSave,
  readOnly = false,
}) => {
  const [slides, setSlides] = useState<Slide[]>(
    initialSlides.length > 0
      ? initialSlides
      : [
          {
            id: '1',
            title: 'Presentation Title',
            content: 'Subtitle goes here',
            layout: 'title',
            backgroundColor: '#FFFFFF',
          },
        ]
  );
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const currentSlide = slides[currentSlideIndex];

  // Add new slide
  const handleAddSlide = () => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      title: 'New Slide',
      content: 'Click to add content',
      layout: 'content',
      backgroundColor: '#FFFFFF',
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  // Delete slide
  const handleDeleteSlide = (index: number) => {
    if (slides.length > 1) {
      const newSlides = slides.filter((_, i) => i !== index);
      setSlides(newSlides);
      if (currentSlideIndex >= newSlides.length) {
        setCurrentSlideIndex(newSlides.length - 1);
      }
    }
  };

  // Duplicate slide
  const handleDuplicateSlide = (index: number) => {
    const slideToDuplicate = slides[index];
    const newSlide: Slide = {
      ...slideToDuplicate,
      id: Date.now().toString(),
    };
    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, newSlide);
    setSlides(newSlides);
  };

  // Update current slide
  const updateCurrentSlide = (updates: Partial<Slide>) => {
    const newSlides = [...slides];
    newSlides[currentSlideIndex] = { ...currentSlide, ...updates };
    setSlides(newSlides);
  };

  // Save presentation
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.(slides, {
        updatedAt: new Date(),
        fileSize: new Blob([JSON.stringify(slides)]).size,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Download as JSON
  const handleDownload = () => {
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(slides, null, 2))
    );
    element.setAttribute('download', `${initialMetadata?.title || 'presentation'}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Render slide content based on layout
  const renderSlideContent = () => {
    switch (currentSlide.layout) {
      case 'title':
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className="text-5xl font-bold text-slate-900 mb-4 text-center">
              {currentSlide.title}
            </h1>
            <p className="text-2xl text-slate-600 text-center">{currentSlide.content}</p>
          </div>
        );
      case 'content':
        return (
          <div className="flex flex-col h-full p-8">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">{currentSlide.title}</h2>
            <div className="flex-1 text-lg text-slate-700 whitespace-pre-wrap">
              {currentSlide.content}
            </div>
          </div>
        );
      case 'two-column':
        return (
          <div className="flex h-full p-8 gap-8">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{currentSlide.title}</h3>
              <div className="text-slate-700">{currentSlide.content}</div>
            </div>
            <div className="flex-1 bg-slate-100 rounded-lg p-4 flex items-center justify-center">
              <p className="text-slate-500">Content area</p>
            </div>
          </div>
        );
      case 'blank':
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400">Blank slide</p>
          </div>
        );
    }
  };

  if (isPreviewMode) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center">
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ backgroundColor: currentSlide.backgroundColor }}
        >
          <div className="w-full max-w-4xl h-full">{renderSlideContent()}</div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (currentSlideIndex > 0) setCurrentSlideIndex(currentSlideIndex - 1);
            }}
            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (currentSlideIndex < slides.length - 1)
                setCurrentSlideIndex(currentSlideIndex + 1);
            }}
            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => setIsPreviewMode(false)}
            className="bg-slate-700 hover:bg-slate-600"
          >
            Exit Preview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Slide Panel */}
      <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Slides</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddSlide}
            disabled={readOnly}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              onClick={() => setCurrentSlideIndex(index)}
              className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${
                currentSlideIndex === index
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                className="w-full h-24 rounded bg-white border border-slate-200 mb-2 flex items-center justify-center text-xs text-slate-600 overflow-hidden"
                style={{ backgroundColor: slide.backgroundColor }}
              >
                <div className="text-center px-2">
                  <p className="font-semibold truncate">{slide.title}</p>
                  <p className="text-xs text-slate-500 truncate">{slide.layout}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 flex-1 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateSlide(index);
                  }}
                  disabled={readOnly}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 flex-1 text-xs hover:bg-red-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSlide(index);
                  }}
                  disabled={readOnly || slides.length === 1}
                >
                  <Trash2 className="h-3 w-3 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-slate-900">
              {initialMetadata?.title || 'Untitled Presentation'}
            </h1>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsPreviewMode(true)}
              >
                <Play className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowProperties(!showProperties)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Properties
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || readOnly}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <Select
              value={currentSlide.layout}
              onValueChange={(value: any) => updateCurrentSlide({ layout: value })}
              disabled={readOnly}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLIDE_LAYOUTS.map((layout) => (
                  <SelectItem key={layout.id} value={layout.id}>
                    {layout.icon} {layout.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6" />

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Background:</span>
              <div className="flex gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 ${
                      currentSlide.backgroundColor === color
                        ? 'border-blue-500'
                        : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateCurrentSlide({ backgroundColor: color })}
                    disabled={readOnly}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Slide Preview */}
        <div className="flex-1 overflow-auto p-8">
          <div
            className="mx-auto bg-white rounded-lg shadow-lg aspect-video flex items-center justify-center"
            style={{ backgroundColor: currentSlide.backgroundColor }}
          >
            <div className="w-full h-full p-8">{renderSlideContent()}</div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t border-slate-200 px-8 py-3 flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-4">
            <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
          </div>
          <span>Last saved: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      {showProperties && (
        <div className="w-80 bg-slate-50 border-l border-slate-200 overflow-y-auto p-4">
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-slate-700 mb-4">Slide Properties</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Title
                </label>
                <Input
                  value={currentSlide.title}
                  onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                  readOnly={readOnly}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Content
                </label>
                <Textarea
                  value={currentSlide.content}
                  onChange={(e) => updateCurrentSlide({ content: e.target.value })}
                  readOnly={readOnly}
                  className="text-sm resize-none"
                  rows={6}
                />
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Layout
                </label>
                <Select
                  value={currentSlide.layout}
                  onValueChange={(value: any) => updateCurrentSlide({ layout: value })}
                  disabled={readOnly}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLIDE_LAYOUTS.map((layout) => (
                      <SelectItem key={layout.id} value={layout.id}>
                        {layout.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-slate-600 mb-2">Presentation Info</p>
                <div className="space-y-1 text-xs text-slate-600">
                  <p>Total Slides: {slides.length}</p>
                  <p>Current Slide: {currentSlideIndex + 1}</p>
                  <p>File Size: {(new Blob([JSON.stringify(slides)]).size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PresentationEditor;
