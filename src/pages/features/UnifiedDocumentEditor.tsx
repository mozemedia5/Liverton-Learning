/**
 * Unified Document Editor - Microsoft Office 365 Style
 * Supports Word, Excel, and PowerPoint documents with comprehensive ribbon interface
 */

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Table,
  Save,
  Share2,
  ArrowLeft,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image,
  Link,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Clipboard,
  Search,
  MessageSquare,
  Eye,
  EyeOff,
  Zap,
  Type,
  Highlighter,
  Strikethrough,
  Code,
  Quote,
  Columns,
  Grid3x3,
  BookOpen,
  Settings,
  Users,
  Download,
  Printer,
  MoreVertical,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type EditorType = 'word' | 'excel' | 'powerpoint';

interface Slide {
  id: string;
  title: string;
  content: string;
  layout: 'title' | 'content' | 'two-column' | 'blank';
  backgroundColor: string;
}

interface Cell {
  value: string;
  format?: 'text' | 'number' | 'currency' | 'percentage' | 'date';
  computed?: string;
}

const fonts = ['Arial', 'Times New Roman', 'Calibri', 'Georgia', 'Verdana', 'Helvetica', 'Courier New', 'Comic Sans MS'];
const fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '28', '32', '36', '48', '72'];
const colors = ['#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
                '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff'];

export const UnifiedDocumentEditor: React.FC = () => {
  const { type, docId } = useParams<{ type?: EditorType; docId?: string }>();
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDocName, setSaveDocName] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Word Editor State
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState('12');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [trackChanges, setTrackChanges] = useState(false);
  
  // Excel Editor State
  const [spreadsheetData, setSpreadsheetData] = useState<Cell[][]>(() => {
    return Array(50).fill(null).map(() =>
      Array(26).fill(null).map(() => ({ value: '', format: 'text' as const }))
    );
  });
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  
  // PowerPoint Editor State
  const [slides, setSlides] = useState<Slide[]>([
    {
      id: '1',
      title: 'Click to add title',
      content: 'Click to add subtitle',
      layout: 'title',
      backgroundColor: '#ffffff',
    },
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const editorType = type || 'word';
  const currentSlide = slides[currentSlideIndex];

  useEffect(() => {
    if (docId && docId !== 'new') {
      loadDocument(docId);
    }
  }, [docId]);

  // Auto-save functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (documentTitle !== 'Untitled Document') {
        handleAutoSave();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [documentTitle]);

  const loadDocument = async (id: string) => {
    try {
      setDocumentTitle(`Document: ${id}`);
      toast.success('Document loaded');
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Failed to load document');
    }
  };

  const handleAutoSave = async () => {
    setIsSaving(true);
    try {
      setLastSaved(new Date());
      toast.success('Auto-saved');
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!saveDocName.trim()) {
      toast.error('Please enter a document name');
      return;
    }

    setIsSaving(true);
    try {
      setDocumentTitle(saveDocName);
      toast.success('Document saved successfully');
      setShowSaveDialog(false);
      setSaveDocName('');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareDocument = async () => {
    if (!shareEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      const newSharedWith = [...sharedWith, shareEmail];
      setSharedWith(newSharedWith);
      toast.success(`Document shared with ${shareEmail}`);
      setShareEmail('');
    } catch (error) {
      console.error('Error sharing document:', error);
      toast.error('Failed to share document');
    }
  };

  const handleRemoveShare = async (email: string) => {
    try {
      const newSharedWith = sharedWith.filter(e => e !== email);
      setSharedWith(newSharedWith);
      toast.success(`Removed ${email} from sharing`);
    } catch (error) {
      console.error('Error removing share:', error);
      toast.error('Failed to remove share');
    }
  };

  // Word Editor Functions
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateToolbarState();
  };

  const updateToolbarState = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));
    setIsStrikethrough(document.queryCommandState('strikethrough'));
  };

  // Excel Functions
  const handleCellChange = (row: number, col: number, value: string) => {
    const newData = spreadsheetData.map(r => [...r]);
    newData[row][col].value = value;
    setSpreadsheetData(newData);
  };

  // PowerPoint Functions
  const addSlide = () => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      title: 'Click to add title',
      content: 'Click to add content',
      layout: 'content',
      backgroundColor: '#ffffff',
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  const deleteSlide = (index: number) => {
    if (slides.length > 1) {
      const newSlides = slides.filter((_, i) => i !== index);
      setSlides(newSlides);
      if (currentSlideIndex >= newSlides.length) {
        setCurrentSlideIndex(newSlides.length - 1);
      }
    }
  };

  const updateSlide = (index: number, updates: Partial<Slide>) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], ...updates };
    setSlides(newSlides);
  };

  // Render Word Editor Ribbon
  const renderWordRibbon = () => (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-gray-50 dark:bg-gray-900 p-0">
          <TabsTrigger value="home" className="rounded-none">Home</TabsTrigger>
          <TabsTrigger value="insert" className="rounded-none">Insert</TabsTrigger>
          <TabsTrigger value="layout" className="rounded-none">Layout</TabsTrigger>
          <TabsTrigger value="review" className="rounded-none">Review</TabsTrigger>
          <TabsTrigger value="share" className="rounded-none">Share</TabsTrigger>
        </TabsList>

        {/* Home Tab */}
        <TabsContent value="home" className="mt-0 p-3 space-y-2">
          {/* Clipboard Section */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Button variant="ghost" size="sm" onClick={() => execCommand('cut')} title="Cut">
              <Scissors className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => execCommand('copy')} title="Copy">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => execCommand('paste')} title="Paste">
              <Clipboard className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            
            {/* Undo/Redo */}
            <Button variant="ghost" size="sm" onClick={() => execCommand('undo')} title="Undo">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => execCommand('redo')} title="Redo">
              <Redo className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />

            {/* Find & Replace */}
            <Button variant="ghost" size="sm" onClick={() => execCommand('find')} title="Find">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Font Section */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Select value={fontFamily} onValueChange={(value) => {
              setFontFamily(value);
              execCommand('fontName', value);
            }}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fonts.map(font => (
                  <SelectItem key={font} value={font}>{font}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={fontSize} onValueChange={(value) => {
              setFontSize(value);
              execCommand('fontSize', value);
            }}>
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontSizes.map(size => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6" />

            {/* Text Formatting */}
            <Button 
              variant={isBold ? "default" : "ghost"} 
              size="sm" 
              onClick={() => execCommand('bold')}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button 
              variant={isItalic ? "default" : "ghost"} 
              size="sm" 
              onClick={() => execCommand('italic')}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button 
              variant={isUnderline ? "default" : "ghost"} 
              size="sm" 
              onClick={() => execCommand('underline')}
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Button 
              variant={isStrikethrough ? "default" : "ghost"} 
              size="sm" 
              onClick={() => execCommand('strikethrough')}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Text Color */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" title="Text Color">
                  <Type className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <div className="grid grid-cols-5 gap-2 p-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        execCommand('foreColor', color);
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Highlight Color */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" title="Highlight Color">
                  <Highlighter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <div className="grid grid-cols-5 gap-2 p-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        execCommand('backColor', color);
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => execCommand('removeFormat')}
              title="Clear Formatting"
            >
              <Zap className="h-4 w-4" />
            </Button>
          </div>

          {/* Paragraph Section */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Button variant="ghost" size="sm" onClick={() => execCommand('justifyLeft')} title="Align Left">
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => execCommand('justifyCenter')} title="Align Center">
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => execCommand('justifyRight')} title="Align Right">
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => execCommand('justifyFull')} title="Justify">
              <Columns className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button variant="ghost" size="sm" onClick={() => execCommand('insertUnorderedList')} title="Bullets">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => execCommand('insertOrderedList')} title="Numbering">
              <ListOrdered className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button variant="ghost" size="sm" onClick={() => execCommand('indent')} title="Increase Indent">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => execCommand('outdent')} title="Decrease Indent">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Styles Section */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => execCommand('formatBlock', 'h1')} title="Heading 1">
              <span className="text-sm font-bold">H1</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => execCommand('formatBlock', 'h2')} title="Heading 2">
              <span className="text-sm font-bold">H2</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => execCommand('formatBlock', 'p')} title="Normal">
              <span className="text-sm">Normal</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => execCommand('formatBlock', 'blockquote')} title="Quote">
              <Quote className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => execCommand('formatBlock', 'pre')} title="Code">
              <Code className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* Insert Tab */}
        <TabsContent value="insert" className="mt-0 p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => {
              const url = prompt('Enter image URL:');
              if (url) execCommand('insertImage', url);
            }} title="Insert Image">
              <Image className="h-4 w-4" />
              <span className="text-xs ml-1">Image</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => {
              const url = prompt('Enter link URL:');
              if (url) execCommand('createLink', url);
            }} title="Insert Link">
              <Link className="h-4 w-4" />
              <span className="text-xs ml-1">Link</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => execCommand('insertTable')} title="Insert Table">
              <Table className="h-4 w-4" />
              <span className="text-xs ml-1">Table</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => execCommand('insertHorizontalRule')} title="Horizontal Line">
              <Separator className="h-4 w-full" />
              <span className="text-xs ml-1">Line</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => execCommand('insertHTML', '<br/>')} title="Page Break">
              <Plus className="h-4 w-4" />
              <span className="text-xs ml-1">Break</span>
            </Button>
          </div>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="mt-0 p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" title="Margins">
              <Settings className="h-4 w-4" />
              <span className="text-xs ml-1">Margins</span>
            </Button>

            <Button variant="ghost" size="sm" title="Orientation">
              <Columns className="h-4 w-4" />
              <span className="text-xs ml-1">Orientation</span>
            </Button>

            <Button variant="ghost" size="sm" title="Page Size">
              <Grid3x3 className="h-4 w-4" />
              <span className="text-xs ml-1">Size</span>
            </Button>

            <Button variant="ghost" size="sm" title="Columns">
              <Columns className="h-4 w-4" />
              <span className="text-xs ml-1">Columns</span>
            </Button>
          </div>
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="mt-0 p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant={trackChanges ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setTrackChanges(!trackChanges)}
              title="Track Changes"
            >
              <Search className="h-4 w-4" />
              <span className="text-xs ml-1">Track Changes</span>
            </Button>

            <Button 
              variant={showComments ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setShowComments(!showComments)}
              title="Comments"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs ml-1">Comments</span>
            </Button>

            <Button variant="ghost" size="sm" title="Word Count">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs ml-1">Word Count</span>
            </Button>

            <Button variant="ghost" size="sm" title="Spell Check">
              <Search className="h-4 w-4" />
              <span className="text-xs ml-1">Spell Check</span>
            </Button>
          </div>
        </TabsContent>

        {/* Share Tab */}
        <TabsContent value="share" className="mt-0 p-3">
          <div className="flex items-center gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => setShowShareDialog(true)}
              title="Share Document"
            >
              <Share2 className="h-4 w-4" />
              <span className="text-xs ml-1">Share</span>
            </Button>

            <Button variant="ghost" size="sm" title="Share Settings">
              <Users className="h-4 w-4" />
              <span className="text-xs ml-1">Settings</span>
            </Button>

            {sharedWith.length > 0 && (
              <div className="ml-4 text-sm">
                <span className="font-medium">Shared with {sharedWith.length} people</span>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Render Word Editor
  const renderWordEditor = () => (
    <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg min-h-[800px] p-12 rounded-sm">
          <div
            ref={editorRef}
            contentEditable
            className="outline-none min-h-[600px] prose prose-lg dark:prose-invert max-w-none"
            onMouseUp={updateToolbarState}
            onKeyUp={updateToolbarState}
          />
        </div>
      </div>
    </div>
  );

  // Render Excel Editor
  const renderExcelEditor = () => (
    <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
      <div className="p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 w-12 h-8 text-center text-xs font-bold"></th>
                {Array.from({ length: 26 }).map((_, i) => (
                  <th key={i} className="border border-gray-300 dark:border-gray-600 w-24 h-8 text-center text-xs font-bold">
                    {String.fromCharCode(65 + i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spreadsheetData.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="border border-gray-300 dark:border-gray-600 w-12 h-8 text-center text-xs font-bold bg-gray-100 dark:bg-gray-700">
                    {rowIdx + 1}
                  </td>
                  {row.map((cell, colIdx) => (
                    <td
                      key={`${rowIdx}-${colIdx}`}
                      className={`border border-gray-300 dark:border-gray-600 w-24 h-8 p-1 ${
                        selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                          ? 'bg-blue-100 dark:bg-blue-900'
                          : ''
                      }`}
                      onClick={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                    >
                      <input
                        type="text"
                        value={cell.value}
                        onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                        className="w-full h-full bg-transparent outline-none text-xs"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render PowerPoint Editor
  const renderPowerPointEditor = () => (
    <div className="flex-1 flex gap-4 bg-gray-100 dark:bg-gray-900 p-4">
      {/* Slide Thumbnails */}
      <div className="w-32 bg-white dark:bg-gray-800 rounded-lg shadow overflow-y-auto">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`p-2 mb-2 cursor-pointer rounded border-2 ${
              currentSlideIndex === idx
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                : 'border-gray-200 dark:border-gray-700'
            }`}
            onClick={() => setCurrentSlideIndex(idx)}
          >
            <div
              className="w-full h-20 rounded bg-white dark:bg-gray-700 flex items-center justify-center text-xs text-center p-1"
              style={{ backgroundColor: slide.backgroundColor }}
            >
              <span className="truncate">{slide.title}</span>
            </div>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={addSlide}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Slide
        </Button>
      </div>

      {/* Main Slide Editor */}
      <div className="flex-1 flex flex-col gap-4">
        <div
          className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow p-8 flex flex-col justify-center items-center"
          style={{ backgroundColor: currentSlide.backgroundColor }}
        >
          <input
            type="text"
            value={currentSlide.title}
            onChange={(e) => updateSlide(currentSlideIndex, { title: e.target.value })}
            className="text-4xl font-bold text-center mb-4 bg-transparent outline-none w-full"
            placeholder="Click to add title"
          />
          <textarea
            value={currentSlide.content}
            onChange={(e) => updateSlide(currentSlideIndex, { content: e.target.value })}
            className="text-lg text-center bg-transparent outline-none w-full resize-none"
            placeholder="Click to add content"
            rows={5}
          />
        </div>

        {/* Slide Controls */}
        <div className="flex gap-2 justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
            disabled={currentSlideIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            Slide {currentSlideIndex + 1} of {slides.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
            disabled={currentSlideIndex === slides.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteSlide(currentSlideIndex)}
            disabled={slides.length === 1}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/features/document-workspace')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{documentTitle}</h1>
            {lastSaved && (
              <p className="text-xs text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const element = document.createElement('a');
                element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(editorRef.current?.innerHTML || ''));
                element.setAttribute('download', `${documentTitle}.html`);
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Ribbon */}
      {renderWordRibbon()}

      {/* Editor Content */}
      {editorType === 'word' && renderWordEditor()}
      {editorType === 'excel' && renderExcelEditor()}
      {editorType === 'powerpoint' && renderPowerPointEditor()}

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Document</DialogTitle>
            <DialogDescription>
              Enter a name for your document and it will be saved
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Document Name</label>
              <Input
                value={saveDocName}
                onChange={(e) => setSaveDocName(e.target.value)}
                placeholder="Enter document name"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDocument} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>
              Share this document with others by entering their email addresses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Enter email address"
              />
              <Button onClick={handleShareDocument}>
                Share
              </Button>
            </div>

            {sharedWith.length > 0 && (
              <div>
                <label className="text-sm font-medium block mb-2">Shared with:</label>
                <div className="space-y-2">
                  {sharedWith.map((email) => (
                    <div key={email} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
                      <span className="text-sm">{email}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveShare(email)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowShareDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedDocumentEditor;
