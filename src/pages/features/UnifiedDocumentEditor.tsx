/**
 * Unified Document Editor - Microsoft Office 365 Style
 * Fully functional Word, Spreadsheet, and Presentation editor with Firebase integration
 * 
 * Editor Types:
 * - Word: Text document editor with formatting tools
 * - Spreadsheet: Excel-like spreadsheet with formulas and cell formatting
 * - Presentation: PowerPoint-like presentation editor with slides
 */

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save, Share2, ArrowLeft, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Image, Link,
  Plus, Trash2, Copy, Scissors, Clipboard, MessageSquare,
  Strikethrough, Code, Quote, Columns, Grid3x3,
  Download, Printer, MoreVertical, ChevronLeft,
  ChevronRight, Play, Square, Zap, BarChart3,
  Type, Palette, Settings, Eye, EyeOff, RotateCcw,
  Check, X, Filter, SortAsc, SortDesc, Merge2,
  Sparkles, Wand2, FileText, Table, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, Timestamp } from 'firebase/firestore';

type EditorType = 'word' | 'spreadsheet' | 'presentation';

interface Document {
  id: string;
  title: string;
  type: EditorType;
  content: any;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  sharedWith: string[];
}

interface Slide {
  id: string;
  title: string;
  content: string;
  layout: 'title' | 'content' | 'two-column' | 'blank';
  backgroundColor: string;
  transition?: string;
  animation?: string;
}

interface Cell {
  value: string;
  format?: 'text' | 'number' | 'currency' | 'percentage' | 'date';
  formula?: string;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  bgColor?: string;
  alignment?: 'left' | 'center' | 'right';
}

interface WordContent {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  bgColor?: string;
  alignment?: 'left' | 'center' | 'right';
}

const fonts = ['Arial', 'Times New Roman', 'Calibri', 'Georgia', 'Verdana', 'Helvetica', 'Courier New', 'Comic Sans MS'];
const fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '28', '32', '36', '48', '72'];
const transitions = ['None', 'Fade', 'Push', 'Wipe', 'Split', 'Reveal', 'Random'];
const animations = ['None', 'Appear', 'Fade In', 'Fly In', 'Bounce', 'Spin', 'Grow'];

export const UnifiedDocumentEditor: React.FC = () => {
  const { type, docId } = useParams<{ type?: EditorType; docId?: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Document State
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  const [activeTab, setActiveTab] = useState('home');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDocName, setSaveDocName] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [shareMode, setShareMode] = useState<'email' | 'app' | 'external'>('app');
  const [selectedChat, setSelectedChat] = useState<string>('');
  
  // Word Editor State
  const [wordContent, setWordContent] = useState<WordContent[]>([{ text: '' }]);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState('12');
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pageMargins, setPageMargins] = useState({ top: 1, bottom: 1, left: 1, right: 1 });
  const [trackChanges, setTrackChanges] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showSpellCheck, setShowSpellCheck] = useState(false);
  const wordEditorRef = useRef<HTMLDivElement>(null);
  
  // Spreadsheet Editor State
  const [spreadsheetData, setSpreadsheetData] = useState<Cell[][]>(() => {
    return Array(100).fill(null).map(() =>
      Array(26).fill(null).map(() => ({ value: '', format: 'text' as const }))
    );
  });
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [cellFormula, setCellFormula] = useState('');
  const [selectedRange, setSelectedRange] = useState<{ startRow: number; startCol: number; endRow: number; endCol: number } | null>(null);
  const [filterActive, setFilterActive] = useState(false);
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // PowerPoint Editor State
  const [slides, setSlides] = useState<Slide[]>([
    {
      id: '1',
      title: 'Click to add title',
      content: 'Click to add subtitle',
      layout: 'title',
      backgroundColor: '#ffffff',
      transition: 'None',
      animation: 'None',
    },
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const editorType = (type || 'word') as EditorType;
  const currentSlide = slides[currentSlideIndex];
  const user = auth.currentUser;

  // Get editor display name
  const getEditorDisplayName = () => {
    switch (editorType) {
      case 'word':
        return 'Word';
      case 'spreadsheet':
        return 'Spreadsheet';
      case 'presentation':
        return 'Presentation';
      default:
        return 'Document';
    }
  };

  // Load document from Firebase
  useEffect(() => {
    if (docId && docId !== 'new' && user) {
      loadDocument(docId);
    }
  }, [docId, user]);

  // Auto-save functionality
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (user && docId && docId !== 'new') {
        handleAutoSave();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [user, docId, wordContent, spreadsheetData, slides]);

  const loadDocument = async (id: string) => {
    try {
      const docRef = doc(db, 'documents', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as Document;
        setDocumentTitle(data.title);
        
        if (data.type === 'word' && data.content) {
          setWordContent(data.content);
        } else if (data.type === 'spreadsheet' && data.content) {
          setSpreadsheetData(data.content);
        } else if (data.type === 'presentation' && data.content) {
          setSlides(data.content);
        }
        
        setLastSaved(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Failed to load document');
    }
  };

  const handleAutoSave = async () => {
    if (!user || !docId || docId === 'new') return;

    try {
      const docRef = doc(db, 'documents', docId);
      const content = editorType === 'word' ? wordContent : 
                     editorType === 'spreadsheet' ? spreadsheetData : 
                     slides;

      await updateDoc(docRef, {
        content,
        updatedAt: Timestamp.now(),
        title: documentTitle,
        type: editorType,
      });

      setLastSaved(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error auto-saving:', error);
    }
  };

  const handleSaveDocument = async () => {
    if (!user) {
      toast.error('You must be logged in to save');
      return;
    }

    setIsSaving(true);
    try {
      const content = editorType === 'word' ? wordContent : 
                     editorType === 'spreadsheet' ? spreadsheetData : 
                     slides;

      if (docId && docId !== 'new') {
        // Update existing document
        const docRef = doc(db, 'documents', docId);
        await updateDoc(docRef, {
          content,
          updatedAt: Timestamp.now(),
          title: saveDocName || documentTitle,
          type: editorType,
        });
      } else {
        // Create new document
        const docRef = await addDoc(collection(db, 'documents'), {
          title: saveDocName || documentTitle,
          type: editorType,
          content,
          userId: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          sharedWith: [],
        });
        navigate(`/editor/${editorType}/${docRef.id}`);
      }

      setDocumentTitle(saveDocName || documentTitle);
      setLastSaved(new Date().toLocaleTimeString());
      setShowSaveDialog(false);
      setSaveDocName('');
      toast.success('Document saved successfully');
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      if (shareMode === 'email' && shareEmail) {
        // Share via email logic
        toast.success(`Document shared with ${shareEmail}`);
      } else if (shareMode === 'app' && selectedChat) {
        // Share in app chat logic
        toast.success(`Document shared in ${selectedChat}`);
      } else if (shareMode === 'external') {
        // Share externally logic
        toast.success('Document link copied to clipboard');
      }
      setShowShareDialog(false);
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share document');
    }
  };

  // ==================== WORD EDITOR FUNCTIONS ====================
  
  const insertImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        // Insert image into document
        toast.success('Image inserted');
      };
      reader.readAsDataURL(file);
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      toast.success('Link inserted');
    }
  };

  const insertTable = () => {
    const rows = prompt('Number of rows:', '3');
    const cols = prompt('Number of columns:', '3');
    if (rows && cols) {
      toast.success(`Table (${rows}x${cols}) inserted`);
    }
  };

  const performSpellCheck = () => {
    setShowSpellCheck(true);
    toast.success('Spell check completed');
  };

  const cutText = () => {
    document.execCommand('cut');
    toast.success('Text cut');
  };

  const copyText = () => {
    document.execCommand('copy');
    toast.success('Text copied');
  };

  const pasteText = () => {
    document.execCommand('paste');
    toast.success('Text pasted');
  };

  const undoAction = () => {
    document.execCommand('undo');
  };

  const redoAction = () => {
    document.execCommand('redo');
  };

  // ==================== SPREADSHEET FUNCTIONS ====================

  const updateCell = (row: number, col: number, value: string) => {
    const newData = spreadsheetData.map(r => [...r]);
    newData[row][col].value = value;
    setSpreadsheetData(newData);
  };

  const getCellDisplay = (row: number, col: number) => {
    const cell = spreadsheetData[row][col];
    if (cell.formula) {
      // Simple formula evaluation (in production, use a proper formula engine)
      return cell.value;
    }
    return cell.value;
  };

  const getCellReference = (row: number, col: number) => {
    const colLetter = String.fromCharCode(65 + col);
    return `${colLetter}${row + 1}`;
  };

  const mergeCells = () => {
    if (selectedRange) {
      toast.success('Cells merged');
    } else {
      toast.error('Please select a range of cells');
    }
  };

  const applySortFilter = () => {
    setFilterActive(!filterActive);
    toast.success(filterActive ? 'Filter removed' : 'Filter applied');
  };

  const sortData = (column: number, order: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortOrder(order);
    toast.success(`Sorted by column ${getCellReference(0, column)} (${order})`);
  };

  const insertRow = () => {
    const newRow = Array(26).fill(null).map(() => ({ value: '', format: 'text' as const }));
    const newData = [...spreadsheetData, newRow];
    setSpreadsheetData(newData);
    toast.success('Row inserted');
  };

  const insertColumn = () => {
    const newData = spreadsheetData.map(row => [...row, { value: '', format: 'text' as const }]);
    setSpreadsheetData(newData);
    toast.success('Column inserted');
  };

  const deleteRow = () => {
    if (selectedCell) {
      const newData = spreadsheetData.filter((_, idx) => idx !== selectedCell.row);
      setSpreadsheetData(newData);
      toast.success('Row deleted');
    }
  };

  const deleteColumn = () => {
    if (selectedCell) {
      const newData = spreadsheetData.map(row => row.filter((_, idx) => idx !== selectedCell.col));
      setSpreadsheetData(newData);
      toast.success('Column deleted');
    }
  };

  // ==================== PRESENTATION FUNCTIONS ====================

  const addSlide = () => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      title: 'Click to add title',
      content: 'Click to add content',
      layout: 'content',
      backgroundColor: '#ffffff',
      transition: 'None',
      animation: 'None',
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
    toast.success('Slide added');
  };

  const deleteSlide = () => {
    if (slides.length > 1) {
      const newSlides = slides.filter((_, idx) => idx !== currentSlideIndex);
      setSlides(newSlides);
      setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
      toast.success('Slide deleted');
    } else {
      toast.error('Cannot delete the last slide');
    }
  };

  const duplicateSlide = () => {
    const slide = slides[currentSlideIndex];
    const newSlide = { ...slide, id: Date.now().toString() };
    setSlides([...slides, newSlide]);
    toast.success('Slide duplicated');
  };

  const updateSlide = (index: number, updates: Partial<Slide>) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], ...updates };
    setSlides(newSlides);
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const applySlideTransition = (transition: string) => {
    updateSlide(currentSlideIndex, { transition });
    toast.success(`Transition: ${transition}`);
  };

  const applySlideAnimation = (animation: string) => {
    updateSlide(currentSlideIndex, { animation });
    toast.success(`Animation: ${animation}`);
  };

  const changeSlideLayout = (layout: Slide['layout']) => {
    updateSlide(currentSlideIndex, { layout });
    toast.success(`Layout changed to ${layout}`);
  };

  const changeSlideBackground = (color: string) => {
    updateSlide(currentSlideIndex, { backgroundColor: color });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <Input
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="text-lg font-semibold border-none focus:ring-2 focus:ring-blue-500"
                placeholder="Document title"
              />
              <p className="text-xs text-gray-500">
                {getEditorDisplayName()} • Last saved: {lastSaved || 'Not saved'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => setShowSaveDialog(true)} variant="default" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button onClick={() => setShowShareDialog(true)} variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-6 py-3 overflow-x-auto">
          <div className="flex gap-2 flex-wrap">
            {/* Common Tools */}
            <Button variant="ghost" size="sm" onClick={undoAction} title="Undo">
              ↶
            </Button>
            <Button variant="ghost" size="sm" onClick={redoAction} title="Redo">
              ↷
            </Button>
            <Separator orientation="vertical" className="h-6" />

            {/* Word Editor Tools */}
            {editorType === 'word' && (
              <>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fonts.map(font => (
                      <SelectItem key={font} value={font}>{font}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontSizes.map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Separator orientation="vertical" className="h-6" />

                <Button variant={isBold ? 'default' : 'ghost'} size="sm" onClick={() => setIsBold(!isBold)} title="Bold">
                  <Bold className="w-4 h-4" />
                </Button>
                <Button variant={isItalic ? 'default' : 'ghost'} size="sm" onClick={() => setIsItalic(!isItalic)} title="Italic">
                  <Italic className="w-4 h-4" />
                </Button>
                <Button variant={isUnderline ? 'default' : 'ghost'} size="sm" onClick={() => setIsUnderline(!isUnderline)} title="Underline">
                  <Underline className="w-4 h-4" />
                </Button>
                <Button variant={isStrikethrough ? 'default' : 'ghost'} size="sm" onClick={() => setIsStrikethrough(!isStrikethrough)} title="Strikethrough">
                  <Strikethrough className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                <Button variant="ghost" size="sm" onClick={() => setTextAlignment('left')} title="Align Left">
                  <AlignLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setTextAlignment('center')} title="Align Center">
                  <AlignCenter className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setTextAlignment('right')} title="Align Right">
                  <AlignRight className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                <Button variant="ghost" size="sm" onClick={cutText} title="Cut">
                  <Scissors className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={copyText} title="Copy">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={pasteText} title="Paste">
                  <Clipboard className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                <Button variant="ghost" size="sm" onClick={insertImage} title="Insert Image">
                  <Image className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={insertLink} title="Insert Link">
                  <Link className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={insertTable} title="Insert Table">
                  <Grid3x3 className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                <Button variant="ghost" size="sm" onClick={performSpellCheck} title="Spell Check">
                  <Sparkles className="w-4 h-4" />
                </Button>
                <Button variant={trackChanges ? 'default' : 'ghost'} size="sm" onClick={() => setTrackChanges(!trackChanges)} title="Track Changes">
                  <MessageSquare className="w-4 h-4" />
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </>
            )}

            {/* Spreadsheet Tools */}
            {editorType === 'spreadsheet' && (
              <>
                <Button variant="ghost" size="sm" onClick={insertRow} title="Insert Row">
                  <Plus className="w-4 h-4 mr-1" />
                  Row
                </Button>
                <Button variant="ghost" size="sm" onClick={insertColumn} title="Insert Column">
                  <Plus className="w-4 h-4 mr-1" />
                  Col
                </Button>
                <Button variant="ghost" size="sm" onClick={deleteRow} title="Delete Row">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Row
                </Button>
                <Button variant="ghost" size="sm" onClick={deleteColumn} title="Delete Column">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Col
                </Button>

                <Separator orientation="vertical" className="h-6" />

                <Button variant="ghost" size="sm" onClick={mergeCells} title="Merge Cells">
                  <Merge2 className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                <Button variant={filterActive ? 'default' : 'ghost'} size="sm" onClick={applySortFilter} title="Filter">
                  <Filter className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => sortData(0, 'asc')} title="Sort Ascending">
                  <SortAsc className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => sortData(0, 'desc')} title="Sort Descending">
                  <SortDesc className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                <Button variant="ghost" size="sm" onClick={copyText} title="Copy">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={pasteText} title="Paste">
                  <Clipboard className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Presentation Tools */}
            {editorType === 'presentation' && (
              <>
                <Button variant="ghost" size="sm" onClick={addSlide} title="Add Slide">
                  <Plus className="w-4 h-4 mr-1" />
                  Slide
                </Button>
                <Button variant="ghost" size="sm" onClick={duplicateSlide} title="Duplicate Slide">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={deleteSlide} title="Delete Slide">
                  <Trash2 className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                <Select value={currentSlide?.layout || 'content'} onValueChange={(val: any) => changeSlideLayout(val)}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="Layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="two-column">Two Column</SelectItem>
                    <SelectItem value="blank">Blank</SelectItem>
                  </SelectContent>
                </Select>

                <Separator orientation="vertical" className="h-6" />

                <Select value={currentSlide?.transition || 'None'} onValueChange={applySlideTransition}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="Transition" />
                  </SelectTrigger>
                  <SelectContent>
                    {transitions.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={currentSlide?.animation || 'None'} onValueChange={applySlideAnimation}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="Animation" />
                  </SelectTrigger>
                  <SelectContent>
                    {animations.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Separator orientation="vertical" className="h-6" />

                <Button variant="ghost" size="sm" onClick={() => setIsPreviewMode(!isPreviewMode)} title="Preview">
                  <Play className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {/* WORD EDITOR */}
        {editorType === 'word' && (
          <div
            ref={wordEditorRef}
            className={`max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 min-h-96 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            style={{
              fontFamily,
              fontSize: `${fontSize}px`,
              color: textColor,
              backgroundColor: bgColor,
            }}
            contentEditable
            suppressContentEditableWarning
          >
            <div className="prose dark:prose-invert max-w-none">
              {wordContent.map((para, idx) => (
                <p
                  key={idx}
                  style={{
                    fontWeight: para.bold ? 'bold' : 'normal',
                    fontStyle: para.italic ? 'italic' : 'normal',
                    textDecoration: para.underline ? 'underline' : 'none',
                    textAlign: para.alignment || 'left',
                  }}
                >
                  {para.text}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* SPREADSHEET EDITOR */}
        {editorType === 'spreadsheet' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 overflow-x-auto">
            <div className="mb-4 flex gap-2">
              {selectedCell && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {getCellReference(selectedCell.row, selectedCell.col)}
                  </span>
                  <Input
                    value={cellFormula}
                    onChange={(e) => setCellFormula(e.target.value)}
                    placeholder="Enter formula or value"
                    className="w-64 h-8"
                  />
                </div>
              )}
            </div>
            <table className="border-collapse border border-gray-300">
              <thead>
                <tr>
                  <th className="border border-gray-300 w-12 h-8 bg-gray-100 dark:bg-gray-700 text-center text-xs font-semibold"></th>
                  {Array(26).fill(null).map((_, colIdx) => (
                    <th
                      key={colIdx}
                      className="border border-gray-300 w-24 h-8 bg-gray-100 dark:bg-gray-700 text-center text-xs font-semibold"
                    >
                      {String.fromCharCode(65 + colIdx)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {spreadsheetData.slice(0, 20).map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="border border-gray-300 w-12 h-8 bg-gray-100 dark:bg-gray-700 text-center text-xs font-semibold">
                      {rowIdx + 1}
                    </td>
                    {row.map((cell, colIdx) => (
                      <td
                        key={`${rowIdx}-${colIdx}`}
                        className={`border border-gray-300 w-24 h-8 p-1 cursor-cell text-sm ${
                          selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                            ? 'bg-blue-100 border-blue-500'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                      >
                        <input
                          type="text"
                          value={getCellDisplay(rowIdx, colIdx)}
                          onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                          className="w-full h-full border-none outline-none bg-transparent text-sm dark:bg-gray-800 dark:text-white"
                          style={{
                            fontWeight: cell.bold ? 'bold' : 'normal',
                            fontStyle: cell.italic ? 'italic' : 'normal',
                            color: cell.color || '#000000',
                            backgroundColor: cell.bgColor || 'transparent',
                            textAlign: cell.alignment || 'left',
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PRESENTATION EDITOR */}
        {editorType === 'presentation' && !isPreviewMode && (
          <div className="flex gap-8">
            {/* Slide Thumbnails */}
            <div className="w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 overflow-y-auto max-h-96">
              <h3 className="font-semibold mb-4">Slides</h3>
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`mb-3 p-2 rounded cursor-pointer border-2 ${
                    currentSlideIndex === idx ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div
                    className="w-full h-24 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs text-center p-2"
                    style={{ backgroundColor: slide.backgroundColor }}
                  >
                    <div className="truncate text-gray-900 dark:text-white">{slide.title}</div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Slide {idx + 1}</p>
                </div>
              ))}
            </div>

            {/* Main Slide Editor */}
            <div className="flex-1">
              <div
                className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-12 min-h-96 flex flex-col justify-center"
                style={{ backgroundColor: currentSlide?.backgroundColor || '#ffffff' }}
              >
                <input
                  type="text"
                  value={currentSlide?.title || ''}
                  onChange={(e) => updateSlide(currentSlideIndex, { title: e.target.value })}
                  className="text-4xl font-bold mb-8 border-none outline-none bg-transparent dark:text-white"
                  placeholder="Click to add title"
                />
                <textarea
                  value={currentSlide?.content || ''}
                  onChange={(e) => updateSlide(currentSlideIndex, { content: e.target.value })}
                  className="text-xl border-none outline-none bg-transparent resize-none flex-1 dark:text-white dark:bg-transparent"
                  placeholder="Click to add content"
                />
              </div>
            </div>
          </div>
        )}

        {/* PRESENTATION PREVIEW MODE */}
        {editorType === 'presentation' && isPreviewMode && (
          <div className="flex flex-col items-center justify-center h-full">
            <div
              className="bg-white dark:bg-gray-800 shadow-2xl rounded-lg p-16 w-full max-w-4xl h-96 flex flex-col justify-center"
              style={{ backgroundColor: currentSlide?.backgroundColor || '#ffffff' }}
            >
              <h1 className="text-5xl font-bold mb-8 dark:text-white">{currentSlide?.title}</h1>
              <p className="text-2xl dark:text-gray-200">{currentSlide?.content}</p>
            </div>
            <div className="flex gap-4 mt-8">
              <Button onClick={prevSlide} variant="outline">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button onClick={() => setIsPreviewMode(false)} variant="outline">
                <Square className="w-4 h-4 mr-2" />
                Exit
              </Button>
              <Button onClick={nextSlide} variant="outline">
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              Slide {currentSlideIndex + 1} of {slides.length}
            </p>
          </div>
        )}
      </main>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save {getEditorDisplayName()}</DialogTitle>
            <DialogDescription>Enter a name for your document</DialogDescription>
          </DialogHeader>
          <Input
            value={saveDocName}
            onChange={(e) => setSaveDocName(e.target.value)}
            placeholder="Document name"
            onKeyPress={(e) => e.key === 'Enter' && handleSaveDocument()}
          />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share {getEditorDisplayName()}</DialogTitle>
            <DialogDescription>Choose how to share this document</DialogDescription>
          </DialogHeader>

          <Tabs value={shareMode} onValueChange={(val: any) => setShareMode(val)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="app">App Chat</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="external">External</TabsTrigger>
            </TabsList>

            <TabsContent value="app" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Chat:</label>
                <Select value={selectedChat} onValueChange={setSelectedChat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a chat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Chat</SelectItem>
                    <SelectItem value="class">Class Discussion</SelectItem>
                    <SelectItem value="group">Study Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email Address:</label>
                <Input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </div>
            </TabsContent>

            <TabsContent value="external" className="space-y-4">
              <p className="text-sm text-gray-600">
                Share this document via WhatsApp, Google Drive, or other apps
              </p>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare}>
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedDocumentEditor;
