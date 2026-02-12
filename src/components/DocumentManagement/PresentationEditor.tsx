/**
 * Presentation Editor Component
 * Microsoft PowerPoint-style presentation editor
 */

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Download,
  Play,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface Slide {
  id: string;
  title: string;
  content: string;
  layout: 'title' | 'content' | 'two-column' | 'blank';
  backgroundColor: string;
}

interface PresentationEditorProps {
  document?: EnhancedDocumentMeta;
  readOnly?: boolean;
  onSave?: (slides: Slide[], metadata: Partial<EnhancedDocumentMeta>) => void;
}

/**
 * Presentation Editor with PowerPoint-style interface
 * Supports slide management, layouts, and formatting
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
    },
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const currentSlide = slides[currentSlideIndex];

  const handleAddSlide = () => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      title: 'New Slide',
      content: 'Add your content here',
      layout: 'content',
      backgroundColor: '#ffffff',
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

  const handleUpdateSlide = (updates: Partial<Slide>) => {
    const newSlides = [...slides];
    newSlides[currentSlideIndex] = { ...currentSlide, ...updates };
    setSlides(newSlides);

    // Auto-save
    if (onSave && document) {
      onSave(newSlides, {
        updatedAt: new Date(),
      });
    }
  };

  const handleDownload = () => {
    const json = JSON.stringify(slides, null, 2);
    // Use global document object to create download link
    const element = window.document.createElement('a');
    const file = new Blob([json], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `${document?.title || 'presentation'}.json`;
    window.document.body.appendChild(element);
    element.click();
    window.document.body.removeChild(element);
  };

  const backgroundColors = [
    '#ffffff',
    '#f3f4f6',
    '#dbeafe',
    '#ddd6fe',
    '#fce7f3',
    '#fef3c7',
    '#dcfce7',
    '#f0fdfa',
  ];

  const renderSlidePreview = (slide: Slide) => (
    <div
      className="w-full h-full flex flex-col justify-center items-center p-4 rounded"
      style={{ backgroundColor: slide.backgroundColor }}
    >
      <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
        {slide.title}
      </h3>
      {slide.layout !== 'blank' && (
        <p className="text-sm text-slate-600 text-center">{slide.content}</p>
      )}
    </div>
  );

  if (isPreviewMode) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl aspect-video rounded-lg overflow-hidden shadow-2xl">
          {renderSlidePreview(currentSlide)}
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
          <span className="text-white text-center min-w-20">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <Button
            onClick={() =>
              setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))
            }
            disabled={currentSlideIndex === slides.length - 1}
            variant="outline"
            className="bg-white"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={() => setIsPreviewMode(false)}
          variant="outline"
          className="mt-8 bg-white"
        >
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
            className={`cursor-pointer rounded border-2 overflow-hidden transition-all ${
              currentSlideIndex === index
                ? 'border-blue-500 shadow-md'
                : 'border-slate-200 hover:border-slate-300'
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
        <Button
          onClick={handleAddSlide}
          disabled={readOnly}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Slide
        </Button>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-slate-200 p-4 flex gap-2">
          <Button
            onClick={() => handleDuplicateSlide(currentSlideIndex)}
            disabled={readOnly}
            variant="outline"
            size="sm"
            className="gap-1"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
          <Button
            onClick={() => handleDeleteSlide(currentSlideIndex)}
            disabled={readOnly || slides.length === 1}
            variant="outline"
            size="sm"
            className="gap-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex-1" />
          <Button
            onClick={() => setIsPreviewMode(true)}
            variant="outline"
            size="sm"
            className="gap-1"
          >
            <Play className="h-4 w-4" />
            Preview
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Slide Editor */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            {/* Slide Preview */}
            <div className="mb-8 rounded-lg shadow-lg overflow-hidden aspect-video">
              {renderSlidePreview(currentSlide)}
            </div>

            {/* Slide Properties */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">
                  Slide Title
                </label>
                <Input
                  value={currentSlide.title}
                  onChange={e => handleUpdateSlide({ title: e.target.value })}
                  disabled={readOnly}
                  className="text-lg"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-2">
                  Content
                </label>
                <Textarea
                  value={currentSlide.content}
                  onChange={e => handleUpdateSlide({ content: e.target.value })}
                  disabled={readOnly}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-900 block mb-2">
                    Layout
                  </label>
                  <Select
                    value={currentSlide.layout}
                    onValueChange={(value: any) =>
                      handleUpdateSlide({ layout: value })
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title">Title Slide</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="two-column">Two Column</SelectItem>
                      <SelectItem value="blank">Blank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-900 block mb-2">
                    Background Color
                  </label>
                  <div className="flex gap-2">
                    {backgroundColors.map(color => (
                      <button
                        key={color}
                        onClick={() => handleUpdateSlide({ backgroundColor: color })}
                        disabled={readOnly}
                        className={`w-8 h-8 rounded border-2 transition-all ${
                          currentSlide.backgroundColor === color
                            ? 'border-blue-500 ring-2 ring-blue-300'
                            : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t border-slate-200 px-8 py-3 flex items-center justify-between text-sm text-slate-600">
          <span>
            Slide {currentSlideIndex + 1} of {slides.length}
          </span>
          <div className="flex gap-2">
            <Button
              onClick={() =>
                setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))
              }
              disabled={currentSlideIndex === 0}
              variant="ghost"
              size="sm"
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={() =>
                setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))
              }
              disabled={currentSlideIndex === slides.length - 1}
              variant="ghost"
              size="sm"
              className="h-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresentationEditor;
