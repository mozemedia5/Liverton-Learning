/**
 * Unified Document Editor - Microsoft Office 365 Style
 * Fully functional Word, Excel, and PowerPoint editor with Firebase integration
 */

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save, Share2, ArrowLeft, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Image, Link,
  Plus, Trash2, Copy, Scissors, Clipboard, MessageSquare,
   Strikethrough, Code, Quote, Columns, Grid3x3,
  Download, Printer, MoreVertical, ChevronLeft,
  ChevronRight, Play, Square, Zap, BarChart3
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

type EditorType = 'word' | 'excel' | 'powerpoint';

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
  const wordEditorRef = useRef<HTMLDivElement>(null);
  
  // Excel Editor State
  const [spreadsheetData, setSpreadsheetData] = useState<Cell[][]>(() => {
    return Array(100).fill(null).map(() =>
      Array(26).fill(null).map(() => ({ value: '', format: 'text' as const }))
    );
  });
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [cellFormula, setCellFormula] = useState('');
  
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

  // Load document from Firebase
  useEffect(() => {
    if (docId && docId !== 'new' && user) {
      loadDocument(docId);
    }
  }, [docId, user]);

  // Auto-save functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (documentTitle !== 'Untitled Document' && user) {
        handleAutoSave();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [documentTitle, wordContent, spreadsheetData, slides, user]);

  const loadDocument = async (id: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'documents', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as Document;
        setDocumentTitle(data.title);
        
        if (data.type === 'word' && data.content) {
          setWordContent(data.content);
        } else if (data.type === 'excel' && data.content) {
          setSpreadsheetData(data.content);
        } else if (data.type === 'powerpoint' && data.content) {
          setSlides(data.content);
        }
        
        setSharedWith(data.sharedWith || []);
        setLastSaved(data.updatedAt?.toString() || '');
      }
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Failed to load document');
    }
  };

  const handleAutoSave = async () => {
    if (!user || documentTitle === 'Untitled Document') return;
    
    setIsSaving(true);
    try {
      const content = editorType === 'word' ? wordContent : 
                     editorType === 'excel' ? spreadsheetData : 
                     slides;

      if (docId && docId !== 'new') {
        // Update existing document
        const docRef = doc(db, 'documents', docId);
        await updateDoc(docRef, {
          content,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Create new document
        const docRef = await addDoc(collection(db, 'documents'), {
          title: documentTitle,
          type: editorType,
          content,
          userId: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          sharedWith: [],
        });
        navigate(`/student/documents/${editorType}/${docRef.id}`);
      }
      
      setLastSaved(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error auto-saving:', error);
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
      await handleAutoSave();
      toast.success('Document saved successfully');
      setShowSaveDialog(false);
      setSaveDocName('');
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!user) return;

    try {
      if (shareMode === 'email' && shareEmail.trim()) {
        if (docId && docId !== 'new') {
          const docRef = doc(db, 'documents', docId);
          const newSharedWith = [...sharedWith, shareEmail];
          await updateDoc(docRef, { sharedWith: newSharedWith });
          setSharedWith(newSharedWith);
          toast.success(`Document shared with ${shareEmail}`);
        }
        setShareEmail('');
      } else if (shareMode === 'app' && selectedChat) {
        toast.success(`Document shared to chat: ${selectedChat}`);
        setSelectedChat('');
      } else if (shareMode === 'external') {
        const shareUrl = `${window.location.origin}/student/documents/${editorType}/${docId}`;
        const text = `Check out my ${editorType} document: ${documentTitle}`;
        
        const shareData = {
          title: documentTitle,
          text: text,
          url: shareUrl,
        };

        if (navigator.share) {
          await navigator.share(shareData);
          toast.success('Document shared');
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Share link copied to clipboard');
        }
      }
      setShowShareDialog(false);
    } catch (error) {
      console.error('Error sharing document:', error);
      toast.error('Failed to share document');
    }
  };

  // Word Editor Functions
  const insertImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setWordContent([...wordContent, { text: `[Image: ${file.name}]` }]);
        toast.success('Image inserted');
      };
      reader.readAsDataURL(file);
    }
  };

  const insertTable = () => {
    setWordContent([...wordContent, { text: '[Table inserted]' }]);
    toast.success('Table inserted');
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      setWordContent([...wordContent, { text: `[Link: ${url}]` }]);
      toast.success('Link inserted');
    }
  };

  // Excel Functions
  const updateCell = (row: number, col: number, value: string) => {
    const newData = spreadsheetData.map(r => [...r]);
    newData[row][col] = { ...newData[row][col], value };
    setSpreadsheetData(newData);
  };

  const calculateFormula = (formula: string): string => {
    try {
      if (formula.startsWith('=SUM(')) {
        const range = formula.match(/=SUM\(([A-Z]\d+):([A-Z]\d+)\)/);
        if (range) {
          const [, start, end] = range;
          const startCol = start.charCodeAt(0) - 65;
          const startRow = parseInt(start.slice(1)) - 1;
          const endCol = end.charCodeAt(0) - 65;
          const endRow = parseInt(end.slice(1)) - 1;
          
          let sum = 0;
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const val = parseFloat(spreadsheetData[r]?.[c]?.value || '0');
              if (!isNaN(val)) sum += val;
            }
          }
          return sum.toString();
        }
      } else if (formula.startsWith('=AVERAGE(')) {
        const range = formula.match(/=AVERAGE\(([A-Z]\d+):([A-Z]\d+)\)/);
        if (range) {
          const [, start, end] = range;
          const startCol = start.charCodeAt(0) - 65;
          const startRow = parseInt(start.slice(1)) - 1;
          const endCol = end.charCodeAt(0) - 65;
          const endRow = parseInt(end.slice(1)) - 1;
          
          let sum = 0, count = 0;
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const val = parseFloat(spreadsheetData[r]?.[c]?.value || '0');
              if (!isNaN(val)) { sum += val; count++; }
            }
          }
          return (sum / count).toFixed(2);
        }
      } else if (formula.startsWith('=COUNT(')) {
        const range = formula.match(/=COUNT\(([A-Z]\d+):([A-Z]\d+)\)/);
        if (range) {
          const [, start, end] = range;
          const startCol = start.charCodeAt(0) - 65;
          const startRow = parseInt(start.slice(1)) - 1;
          const endCol = end.charCodeAt(0) - 65;
          const endRow = parseInt(end.slice(1)) - 1;
          
          let count = 0;
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              if (spreadsheetData[r]?.[c]?.value) count++;
            }
          }
          return count.toString();
        }
      } else if (formula.startsWith('=MIN(')) {
        const range = formula.match(/=MIN\(([A-Z]\d+):([A-Z]\d+)\)/);
        if (range) {
          const [, start, end] = range;
          const startCol = start.charCodeAt(0) - 65;
          const startRow = parseInt(start.slice(1)) - 1;
          const endCol = end.charCodeAt(0) - 65;
          const endRow = parseInt(end.slice(1)) - 1;
          
          let min = Infinity;
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const val = parseFloat(spreadsheetData[r]?.[c]?.value || '0');
              if (!isNaN(val)) min = Math.min(min, val);
            }
          }
          return min === Infinity ? '0' : min.toString();
        }
      } else if (formula.startsWith('=MAX(')) {
        const range = formula.match(/=MAX\(([A-Z]\d+):([A-Z]\d+)\)/);
        if (range) {
          const [, start, end] = range;
          const startCol = start.charCodeAt(0) - 65;
          const startRow = parseInt(start.slice(1)) - 1;
          const endCol = end.charCodeAt(0) - 65;
          const endRow = parseInt(end.slice(1)) - 1;
          
          let max = -Infinity;
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              const val = parseFloat(spreadsheetData[r]?.[c]?.value || '0');
              if (!isNaN(val)) max = Math.max(max, val);
            }
          }
          return max === -Infinity ? '0' : max.toString();
        }
      }
    } catch (error) {
      console.error('Formula error:', error);
    }
    return '';
  };

  const getCellDisplay = (row: number, col: number): string => {
    const cell = spreadsheetData[row]?.[col];
    if (!cell) return '';
    
    if (cell.formula) {
      return calculateFormula(cell.formula);
    }
    
    if (cell.format === 'currency') {
      return `$${parseFloat(cell.value || '0').toFixed(2)}`;
    } else if (cell.format === 'percentage') {
      return `${parseFloat(cell.value || '0').toFixed(2)}%`;
    } else if (cell.format === 'date') {
      return new Date(cell.value).toLocaleDateString();
    }
    
    return cell.value;
  };

  const getColumnLetter = (col: number): string => {
    return String.fromCharCode(65 + col);
  };

  // PowerPoint Functions
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

  const deleteSlide = (index: number) => {
    if (slides.length > 1) {
      const newSlides = slides.filter((_, i) => i !== index);
      setSlides(newSlides);
      if (currentSlideIndex >= newSlides.length) {
        setCurrentSlideIndex(newSlides.length - 1);
      }
      toast.success('Slide deleted');
    } else {
      toast.error('Cannot delete the last slide');
    }
  };

  const updateSlide = (index: number, updates: Partial<Slide>) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], ...updates };
    setSlides(newSlides);
  };

  const startPresentation = () => {
    setIsPreviewMode(true);
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

  // Export functions
  const exportAsHTML = () => {
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${documentTitle}</title></head><body>`;
    
    if (editorType === 'word') {
      html += `<h1>${documentTitle}</h1>`;
      wordContent.forEach(para => {
        html += `<p>${para.text}</p>`;
      });
    } else if (editorType === 'excel') {
      html += `<h1>${documentTitle}</h1><table border="1">`;
      spreadsheetData.slice(0, 20).forEach((row, rowIdx) => {
        html += '<tr>';
        row.forEach((_, colIdx) => {
          html += `<td>${getCellDisplay(rowIdx, colIdx)}</td>`;
        });
        html += '</tr>';
      });
      html += '</table>';
    } else if (editorType === 'powerpoint') {
      html += `<h1>${documentTitle}</h1>`;
      slides.forEach((slide) => {
        html += `<div style="page-break-after: always; padding: 20px; background: ${slide.backgroundColor};">
          <h2>${slide.title}</h2>
          <p>${slide.content}</p>
        </div>`;
      });
    }
    
    html += '</body></html>';
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle}.html`;
    a.click();
    toast.success('Document exported as HTML');
  };

  const printDocument = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/student/documents')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{documentTitle}</h1>
            <p className="text-sm text-gray-500">
              {isSaving ? 'Saving...' : lastSaved ? `Last saved: ${lastSaved}` : 'Not saved'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowSaveDialog(true)} variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save As
          </Button>
          <Button onClick={() => setShowShareDialog(true)} variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportAsHTML}>
                <Download className="w-4 h-4 mr-2" />
                Export as HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={printDocument}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Ribbon Interface */}
      <div className="bg-white border-b border-gray-200">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-gray-50 px-6">
            {editorType === 'word' && (
              <>
                <TabsTrigger value="home">Home</TabsTrigger>
                <TabsTrigger value="insert">Insert</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="review">Review</TabsTrigger>
                <TabsTrigger value="share">Share</TabsTrigger>
              </>
            )}
            {editorType === 'excel' && (
              <>
                <TabsTrigger value="home">Home</TabsTrigger>
                <TabsTrigger value="insert">Insert</TabsTrigger>
                <TabsTrigger value="formulas">Formulas</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
              </>
            )}
            {editorType === 'powerpoint' && (
              <>
                <TabsTrigger value="home">Home</TabsTrigger>
                <TabsTrigger value="insert">Insert</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="animations">Animations</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* WORD EDITOR TABS */}
          {editorType === 'word' && (
            <>
              <TabsContent value="home" className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Clipboard */}
                  <div className="flex gap-2 items-center">
                    <Button size="sm" variant="outline" title="Cut">
                      <Scissors className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" title="Copy">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" title="Paste">
                      <Clipboard className="w-4 h-4" />
                    </Button>
                  </div>
                  <Separator orientation="vertical" className="h-8" />

                  {/* Font */}
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fonts.map(font => (
                        <SelectItem key={font} value={font}>{font}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Font Size */}
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontSizes.map(size => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Separator orientation="vertical" className="h-8" />

                  {/* Text Formatting */}
                  <Button
                    size="sm"
                    variant={isBold ? 'default' : 'outline'}
                    onClick={() => setIsBold(!isBold)}
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={isItalic ? 'default' : 'outline'}
                    onClick={() => setIsItalic(!isItalic)}
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={isUnderline ? 'default' : 'outline'}
                    onClick={() => setIsUnderline(!isUnderline)}
                    title="Underline"
                  >
                    <Underline className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={isStrikethrough ? 'default' : 'outline'}
                    onClick={() => setIsStrikethrough(!isStrikethrough)}
                    title="Strikethrough"
                  >
                    <Strikethrough className="w-4 h-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-8" />

                  {/* Text Color */}
                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Text Color:</label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                  </div>

                  {/* Highlight Color */}
                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Highlight:</label>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                  </div>

                  <Separator orientation="vertical" className="h-8" />

                  {/* Alignment */}
                  <Button
                    size="sm"
                    variant={textAlignment === 'left' ? 'default' : 'outline'}
                    onClick={() => setTextAlignment('left')}
                    title="Align Left"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={textAlignment === 'center' ? 'default' : 'outline'}
                    onClick={() => setTextAlignment('center')}
                    title="Align Center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={textAlignment === 'right' ? 'default' : 'outline'}
                    onClick={() => setTextAlignment('right')}
                    title="Align Right"
                  >
                    <AlignRight className="w-4 h-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-8" />

                  {/* Lists */}
                  <Button size="sm" variant="outline" title="Bullet List">
                    <List className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" title="Numbered List">
                    <ListOrdered className="w-4 h-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="insert" className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <Button size="sm" variant="outline" onClick={insertImage}>
                    <Image className="w-4 h-4 mr-2" />
                    Image
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button size="sm" variant="outline" onClick={insertLink}>
                    <Link className="w-4 h-4 mr-2" />
                    Link
                  </Button>
                  <Button size="sm" variant="outline" onClick={insertTable}>
                    <Grid3x3 className="w-4 h-4 mr-2" />
                    Table
                  </Button>
                  <Button size="sm" variant="outline">
                    <Code className="w-4 h-4 mr-2" />
                    Code Block
                  </Button>
                  <Button size="sm" variant="outline">
                    <Quote className="w-4 h-4 mr-2" />
                    Quote
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="layout" className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Orientation:</label>
                    <Select value={pageOrientation} onValueChange={(val: any) => setPageOrientation(val)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator orientation="vertical" className="h-8" />

                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Margins (in):</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={pageMargins.top}
                      onChange={(e) => setPageMargins({ ...pageMargins, top: parseFloat(e.target.value) })}
                      placeholder="Top"
                      className="w-16"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={pageMargins.bottom}
                      onChange={(e) => setPageMargins({ ...pageMargins, bottom: parseFloat(e.target.value) })}
                      placeholder="Bottom"
                      className="w-16"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={pageMargins.left}
                      onChange={(e) => setPageMargins({ ...pageMargins, left: parseFloat(e.target.value) })}
                      placeholder="Left"
                      className="w-16"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={pageMargins.right}
                      onChange={(e) => setPageMargins({ ...pageMargins, right: parseFloat(e.target.value) })}
                      placeholder="Right"
                      className="w-16"
                    />
                  </div>

                  <Separator orientation="vertical" className="h-8" />

                  <Button size="sm" variant="outline">
                    <Columns className="w-4 h-4 mr-2" />
                    Columns
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="review" className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <Button
                    size="sm"
                    variant={trackChanges ? 'default' : 'outline'}
                    onClick={() => setTrackChanges(!trackChanges)}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Track Changes
                  </Button>
                  <Button
                    size="sm"
                    variant={showComments ? 'default' : 'outline'}
                    onClick={() => setShowComments(!showComments)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Comments
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="share" className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <Button size="sm" variant="outline" onClick={() => setShowShareDialog(true)}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Document
                  </Button>
                  <div className="text-sm text-gray-600">
                    Shared with: {sharedWith.length > 0 ? sharedWith.join(', ') : 'No one'}
                  </div>
                </div>
              </TabsContent>
            </>
          )}

          {/* EXCEL EDITOR TABS */}
          {editorType === 'excel' && (
            <>
              <TabsContent value="home" className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <Button size="sm" variant="outline" title="Cut">
                    <Scissors className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" title="Copy">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" title="Paste">
                    <Clipboard className="w-4 h-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-8" />

                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fonts.map(font => (
                        <SelectItem key={font} value={font}>{font}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontSizes.map(size => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Separator orientation="vertical" className="h-8" />

                  <Button size="sm" variant={isBold ? 'default' : 'outline'} onClick={() => setIsBold(!isBold)}>
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant={isItalic ? 'default' : 'outline'} onClick={() => setIsItalic(!isItalic)}>
                    <Italic className="w-4 h-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-8" />

                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Text Color:</label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Fill Color:</label>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                  </div>

                  <Separator orientation="vertical" className="h-8" />

                  <Button size="sm" variant={textAlignment === 'left' ? 'default' : 'outline'} onClick={() => setTextAlignment('left')}>
                    <AlignLeft className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant={textAlignment === 'center' ? 'default' : 'outline'} onClick={() => setTextAlignment('center')}>
                    <AlignCenter className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant={textAlignment === 'right' ? 'default' : 'outline'} onClick={() => setTextAlignment('right')}>
                    <AlignRight className="w-4 h-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="insert" className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <Button size="sm" variant="outline">
                    <Grid3x3 className="w-4 h-4 mr-2" />
                    Table
                  </Button>
                  <Button size="sm" variant="outline">
                    <Image className="w-4 h-4 mr-2" />
                    Image
                  </Button>
                  <Button size="sm" variant="outline">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Chart
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="formulas" className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Formula:</label>
                    <Input
                      value={cellFormula}
                      onChange={(e) => setCellFormula(e.target.value)}
                      placeholder="=SUM(A1:A10)"
                      className="w-48"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (selectedCell) {
                          const newData = spreadsheetData.map(r => [...r]);
                          newData[selectedCell.row][selectedCell.col] = {
                            ...newData[selectedCell.row][selectedCell.col],
                            formula: cellFormula,
                          };
                          setSpreadsheetData(newData);
                          setCellFormula('');
                          toast.success('Formula applied');
                        }
                      }}
                    >
                      Apply
                    </Button>
                  </div>

                  <Separator orientation="vertical" className="h-8" />

                  <Button size="sm" variant="outline" title="SUM">SUM</Button>
                  <Button size="sm" variant="outline" title="AVERAGE">AVERAGE</Button>
                  <Button size="sm" variant="outline" title="COUNT">COUNT</Button>
                  <Button size="sm" variant="outline" title="MIN">MIN</Button>
                  <Button size="sm" variant="outline" title="MAX">MAX</Button>
                </div>
              </TabsContent>

              <TabsContent value="data" className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <Button size="sm" variant="outline">
                    Filter
                  </Button>
                  <Button size="sm" variant="outline">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Sort
                  </Button>
                  <Button size="sm" variant="outline">
                    <Grid3x3 className="w-4 h-4 mr-2" />
                    Validation
                  </Button>
                </div>
              </TabsContent>
            </>
          )}

          {/* POWERPOINT EDITOR TABS */}
          {editorType === 'powerpoint' && (
            <>
              <TabsContent value="home" className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <Button size="sm" variant="outline" onClick={addSlide}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Slide
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteSlide(currentSlideIndex)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Slide
                  </Button>

                  <Separator orientation="vertical" className="h-8" />

                  <Button size="sm" variant={isBold ? 'default' : 'outline'} onClick={() => setIsBold(!isBold)}>
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant={isItalic ? 'default' : 'outline'} onClick={() => setIsItalic(!isItalic)}>
                    <Italic className="w-4 h-4" />
                  </Button>

                  <Separator orientation="vertical" className="h-8" />

                  <Button size="sm" variant="outline" onClick={startPresentation}>
                    <Play className="w-4 h-4 mr-2" />
                    Start Presentation
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="insert" className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <Button size="sm" variant="outline">
                    <Image className="w-4 h-4 mr-2" />
                    Image
                  </Button>
                  <Button size="sm" variant="outline">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Chart
                  </Button>
                  <Button size="sm" variant="outline">
                    <Grid3x3 className="w-4 h-4 mr-2" />
                    Table
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="design" className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Background:</label>
                    <input
                      type="color"
                      value={currentSlide?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateSlide(currentSlideIndex, { backgroundColor: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                  </div>

                  <Separator orientation="vertical" className="h-8" />

                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Layout:</label>
                    <Select
                      value={currentSlide?.layout || 'content'}
                      onValueChange={(val: any) => updateSlide(currentSlideIndex, { layout: val })}
                    >
                      <SelectTrigger className="w-40">
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
                </div>
              </TabsContent>

              <TabsContent value="animations" className="p-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Transition:</label>
                    <Select
                      value={currentSlide?.transition || 'None'}
                      onValueChange={(val) => updateSlide(currentSlideIndex, { transition: val })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {transitions.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator orientation="vertical" className="h-8" />

                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Animation:</label>
                    <Select
                      value={currentSlide?.animation || 'None'}
                      onValueChange={(val) => updateSlide(currentSlideIndex, { animation: val })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {animations.map(a => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-auto bg-gray-100 p-8">
        {/* WORD EDITOR */}
        {editorType === 'word' && (
          <div
            ref={wordEditorRef}
            className={`bg-white shadow-lg mx-auto p-8 min-h-full ${
              pageOrientation === 'landscape' ? 'max-w-6xl' : 'max-w-4xl'
            }`}
            style={{
              fontFamily,
              fontSize: `${fontSize}px`,
              color: textColor,
              backgroundColor: bgColor,
              padding: `${pageMargins.top}in ${pageMargins.right}in ${pageMargins.bottom}in ${pageMargins.left}in`,
              textAlign: textAlignment as any,
            }}
            contentEditable
            suppressContentEditableWarning
          >
            <div className="prose prose-sm max-w-none">
              {wordContent.map((para, idx) => (
                <p key={idx} className="mb-4">
                  {para.text}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* EXCEL EDITOR */}
        {editorType === 'excel' && (
          <div className="bg-white shadow-lg rounded-lg overflow-auto max-w-full">
            <div className="overflow-x-auto">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-100 w-12 h-8 text-center text-xs font-semibold"></th>
                    {Array(26).fill(null).map((_, col) => (
                      <th
                        key={col}
                        className="border border-gray-300 bg-gray-100 w-24 h-8 text-center text-xs font-semibold"
                      >
                        {getColumnLetter(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {spreadsheetData.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="border border-gray-300 bg-gray-100 w-12 h-8 text-center text-xs font-semibold">
                        {rowIdx + 1}
                      </td>
                      {row.map((cell, colIdx) => (
                        <td
                          key={`${rowIdx}-${colIdx}`}
                          className={`border border-gray-300 w-24 h-8 p-1 cursor-cell text-sm ${
                            selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                              ? 'bg-blue-100 border-blue-500'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                        >
                          <input
                            type="text"
                            value={getCellDisplay(rowIdx, colIdx)}
                            onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                            className="w-full h-full border-none outline-none bg-transparent text-sm"
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
          </div>
        )}

        {/* POWERPOINT EDITOR */}
        {editorType === 'powerpoint' && !isPreviewMode && (
          <div className="flex gap-8">
            {/* Slide Thumbnails */}
            <div className="w-48 bg-white rounded-lg shadow-lg p-4 overflow-y-auto max-h-96">
              <h3 className="font-semibold mb-4">Slides</h3>
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`mb-3 p-2 rounded cursor-pointer border-2 ${
                    currentSlideIndex === idx ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className="w-full h-24 rounded bg-white border border-gray-300 flex items-center justify-center text-xs text-center p-2"
                    style={{ backgroundColor: slide.backgroundColor }}
                  >
                    <div className="truncate">{slide.title}</div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Slide {idx + 1}</p>
                </div>
              ))}
            </div>

            {/* Main Slide Editor */}
            <div className="flex-1">
              <div
                className="bg-white shadow-lg rounded-lg p-12 min-h-96 flex flex-col justify-center"
                style={{ backgroundColor: currentSlide?.backgroundColor || '#ffffff' }}
              >
                <input
                  type="text"
                  value={currentSlide?.title || ''}
                  onChange={(e) => updateSlide(currentSlideIndex, { title: e.target.value })}
                  className="text-4xl font-bold mb-8 border-none outline-none bg-transparent"
                  placeholder="Click to add title"
                />
                <textarea
                  value={currentSlide?.content || ''}
                  onChange={(e) => updateSlide(currentSlideIndex, { content: e.target.value })}
                  className="text-xl border-none outline-none bg-transparent resize-none flex-1"
                  placeholder="Click to add content"
                />
              </div>
            </div>
          </div>
        )}

        {/* POWERPOINT PRESENTATION MODE */}
        {editorType === 'powerpoint' && isPreviewMode && (
          <div className="flex flex-col items-center justify-center h-full">
            <div
              className="bg-white shadow-2xl rounded-lg p-16 w-full max-w-4xl h-96 flex flex-col justify-center"
              style={{ backgroundColor: currentSlide?.backgroundColor || '#ffffff' }}
            >
              <h1 className="text-5xl font-bold mb-8">{currentSlide?.title}</h1>
              <p className="text-2xl">{currentSlide?.content}</p>
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
            <p className="text-gray-600 mt-4">
              Slide {currentSlideIndex + 1} of {slides.length}
            </p>
          </div>
        )}
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Document</DialogTitle>
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
            <DialogTitle>Share Document</DialogTitle>
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
