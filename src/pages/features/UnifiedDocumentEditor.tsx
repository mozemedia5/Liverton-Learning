/**
 * Unified Document Editor - Microsoft Office 365 Style
 * Supports Word, Excel, and PowerPoint documents with ribbon interface
 */

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Table,
  Presentation,
  Save,
  Download,
  Share2,
  ArrowLeft,
  Printer,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image,
  Link,
  Highlighter,
  Type,
  Palette,
  Grid3X3,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Play,
  MoreHorizontal,
  Settings,
  Users,
  MessageSquare,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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

const fonts = ['Arial', 'Times New Roman', 'Calibri', 'Georgia', 'Verdana', 'Helvetica'];
const fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '28', '32', '36', '48', '72'];
const colors = ['#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
                '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff'];

export const UnifiedDocumentEditor: React.FC = () => {
  const { type, docId } = useParams<{ type: EditorType; docId: string }>();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  
  // Word Editor State
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState('12');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('transparent');
  
  // Excel Editor State
  const [spreadsheetData, setSpreadsheetData] = useState<Cell[][]>(() => {
    return Array(50).fill(null).map(() =>
      Array(26).fill(null).map(() => ({ value: '', format: 'text' }))
    );
  });
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState('');
  
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
    if (docId !== 'new') {
      setDocumentTitle('Sample Document');
    }
  }, [docId]);

  // Auto-save functionality
  useEffect(() => {
    const interval = setInterval(() => {
      handleSave();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setLastSaved(new Date());
    setIsSaving(false);
    toast.success('Document saved');
  };

  // Word Editor Functions
  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateToolbarState();
  };

  const updateToolbarState = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));
  };

  const handleFontChange = (font: string) => {
    setFontFamily(font);
    execCommand('fontName', font);
  };

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    execCommand('fontSize', size);
  };

  // Excel Editor Functions
  const getColumnLabel = (index: number) => String.fromCharCode(65 + index);
  
  const handleCellChange = (row: number, col: number, value: string) => {
    const newData = [...spreadsheetData];
    newData[row] = [...newData[row]];
    newData[row][col] = { ...newData[row][col], value };
    setSpreadsheetData(newData);
    
    // Auto-save
    setTimeout(handleSave, 1000);
  };

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ row, col });
    setEditingCell(null);
    setFormulaBarValue(spreadsheetData[row][col].value);
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    setEditingCell({ row, col });
  };

  // PowerPoint Functions
  const handleAddSlide = () => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      title: 'New Slide',
      content: 'Add content here',
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

  const handleUpdateSlide = (updates: Partial<Slide>) => {
    const newSlides = [...slides];
    newSlides[currentSlideIndex] = { ...currentSlide, ...updates };
    setSlides(newSlides);
  };

  const handleDuplicateSlide = () => {
    const newSlide: Slide = { ...currentSlide, id: Date.now().toString() };
    setSlides([...slides.slice(0, currentSlideIndex + 1), newSlide, ...slides.slice(currentSlideIndex + 1)]);
  };

  // Render Ribbon
  const renderRibbon = () => (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center px-2">
          <TabsList className="bg-transparent">
            <TabsTrigger value="home" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900 dark:data-[state=active]:text-blue-300">Home</TabsTrigger>
            <TabsTrigger value="insert" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900 dark:data-[state=active]:text-blue-300">Insert</TabsTrigger>
            <TabsTrigger value="layout" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900 dark:data-[state=active]:text-blue-300">Layout</TabsTrigger>
            <TabsTrigger value="view" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900 dark:data-[state=active]:text-blue-300">View</TabsTrigger>
          </TabsList>
        </div>
        
        <Separator />
        
        <TabsContent value="home" className="mt-0">
          <div className="flex items-center gap-1 p-2">
            {/* Clipboard Group */}
            <div className="flex flex-col items-center px-2 border-r border-gray-200 dark:border-gray-800">
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('undo')}>
                  <Undo className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('redo')}>
                  <Redo className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-[10px] text-gray-500 mt-1">Clipboard</span>
            </div>

            {/* Font Group */}
            <div className="flex flex-col px-2 border-r border-gray-200 dark:border-gray-800">
              <div className="flex gap-1 mb-1">
                <Select value={fontFamily} onValueChange={handleFontChange}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fonts.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={fontSize} onValueChange={handleFontSizeChange}>
                  <SelectTrigger className="w-16 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1">
                <Button variant={isBold ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => execCommand('bold')}>
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant={isItalic ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => execCommand('italic')}>
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant={isUnderline ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => execCommand('underline')}>
                  <Underline className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Palette className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="grid grid-cols-5 gap-1 p-2">
                    {colors.map(c => (
                      <button
                        key={c}
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: c }}
                        onClick={() => execCommand('foreColor', c)}
                      />
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <span className="text-[10px] text-gray-500 mt-1 text-center">Font</span>
            </div>

            {/* Paragraph Group */}
            <div className="flex flex-col items-center px-2 border-r border-gray-200 dark:border-gray-800">
              <div className="flex gap-1 mb-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('justifyLeft')}>
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('justifyCenter')}>
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('justifyRight')}>
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('insertUnorderedList')}>
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('insertOrderedList')}>
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-[10px] text-gray-500 mt-1">Paragraph</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="insert" className="mt-0">
          <div className="flex items-center gap-4 p-2">
            <Button variant="ghost" className="flex flex-col items-center h-16 w-20" onClick={() => execCommand('insertImage', false, 'https://via.placeholder.com/150')}>
              <Image className="h-6 w-6 mb-1" />
              <span className="text-xs">Picture</span>
            </Button>
            <Button variant="ghost" className="flex flex-col items-center h-16 w-20" onClick={() => execCommand('createLink', false, 'https://')}>
              <Link className="h-6 w-6 mb-1" />
              <span className="text-xs">Link</span>
            </Button>
            <Button variant="ghost" className="flex flex-col items-center h-16 w-20">
              <Table className="h-6 w-6 mb-1" />
              <span className="text-xs">Table</span>
            </Button>
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
            onInput={updateToolbarState}
            suppressContentEditableWarning
          >
            <p>Start typing your document...</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Excel Editor
  const renderExcelEditor = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Formula Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <span className="text-sm text-gray-500 w-16">
          {selectedCell ? `${getColumnLabel(selectedCell.col)}${selectedCell.row + 1}` : ''}
        </span>
        <Input
          value={formulaBarValue}
          onChange={(e) => {
            setFormulaBarValue(e.target.value);
            if (selectedCell) {
              handleCellChange(selectedCell.row, selectedCell.col, e.target.value);
            }
          }}
          className="flex-1 h-8"
          placeholder="Enter formula or value"
        />
      </div>
      
      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto">
        <div className="inline-block min-w-full">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="w-12 h-8 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"></th>
                {Array.from({ length: 26 }, (_, i) => (
                  <th key={i} className="w-24 h-8 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {getColumnLabel(i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spreadsheetData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="w-12 h-6 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 text-center">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, colIndex) => (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      className={`w-24 h-6 border border-gray-300 dark:border-gray-700 p-0 cursor-pointer ${
                        selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                          ? 'ring-2 ring-blue-500 ring-inset'
                          : ''
                      }`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                    >
                      {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                        <input
                          type="text"
                          value={cell.value}
                          onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingCell(null);
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          autoFocus
                          className="w-full h-full px-1 border-none outline-none bg-white"
                        />
                      ) : (
                        <div className="w-full h-full px-1 text-sm truncate flex items-center">
                          {cell.value}
                        </div>
                      )}
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
    <div className="flex-1 flex overflow-hidden">
      {/* Slide Thumbnails */}
      <div className="w-48 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-4">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`mb-4 cursor-pointer transition-all ${
              currentSlideIndex === index ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setCurrentSlideIndex(index)}
          >
            <div className="text-xs text-gray-500 mb-1">{index + 1}</div>
            <div 
              className="aspect-video bg-white dark:bg-gray-800 rounded shadow-sm p-2 overflow-hidden"
              style={{ backgroundColor: slide.backgroundColor }}
            >
              <div className="text-[8px] font-bold truncate">{slide.title}</div>
              <div className="text-[6px] truncate">{slide.content}</div>
            </div>
          </div>
        ))}
        <Button onClick={handleAddSlide} className="w-full mt-2" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New Slide
        </Button>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col bg-gray-200 dark:bg-gray-950">
        {/* Slide Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <Button variant="outline" size="sm" onClick={handleDuplicateSlide}>
            <Copy className="w-4 h-4 mr-1" />
            Duplicate
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleDeleteSlide(currentSlideIndex)}
            disabled={slides.length === 1}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
          <div className="flex-1"></div>
          <Button variant="outline" size="sm" onClick={() => setIsPreviewMode(true)}>
            <Play className="w-4 h-4 mr-1" />
            Present
          </Button>
        </div>

        {/* Slide Canvas */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
          <div 
            className="w-full max-w-4xl aspect-video bg-white dark:bg-gray-800 shadow-2xl rounded-lg p-8"
            style={{ backgroundColor: currentSlide.backgroundColor }}
          >
            <input
              type="text"
              value={currentSlide.title}
              onChange={(e) => handleUpdateSlide({ title: e.target.value })}
              className="w-full text-4xl font-bold text-center bg-transparent border-none outline-none mb-4 text-gray-900 dark:text-white"
              placeholder="Click to add title"
            />
            <textarea
              value={currentSlide.content}
              onChange={(e) => handleUpdateSlide({ content: e.target.value })}
              className="w-full h-64 text-xl text-center bg-transparent border-none outline-none resize-none text-gray-700 dark:text-gray-300"
              placeholder="Click to add content"
            />
          </div>
        </div>

        {/* Properties Panel */}
        <div className="h-48 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="flex gap-8">
            <div>
              <label className="text-sm font-medium mb-2 block">Layout</label>
              <Select value={currentSlide.layout} onValueChange={(v: any) => handleUpdateSlide({ layout: v })}>
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
            <div>
              <label className="text-sm font-medium mb-2 block">Background</label>
              <div className="flex gap-2 flex-wrap">
                {['#ffffff', '#f3f4f6', '#dbeafe', '#ddd6fe', '#fce7f3', '#fef3c7', '#dcfce7', '#1e293b'].map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 ${currentSlide.backgroundColor === color ? 'border-blue-500' : 'border-gray-300'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleUpdateSlide({ backgroundColor: color })}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isPreviewMode) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <div 
          className="w-full max-w-5xl aspect-video rounded-lg overflow-hidden shadow-2xl flex flex-col items-center justify-center p-12"
          style={{ backgroundColor: currentSlide.backgroundColor }}
        >
          <h1 className="text-5xl font-bold text-center mb-8 text-gray-900 dark:text-white">{currentSlide.title}</h1>
          <p className="text-2xl text-center text-gray-700 dark:text-gray-300">{currentSlide.content}</p>
        </div>
        <div className="mt-8 flex items-center gap-4">
          <Button onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))} variant="outline" className="bg-white">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-white">{currentSlideIndex + 1} / {slides.length}</span>
          <Button onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))} variant="outline" className="bg-white">
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <Button onClick={() => setIsPreviewMode(false)} variant="outline" className="mt-8 bg-white">
          Exit Presentation
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-black">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-blue-600 dark:bg-blue-900">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-blue-700" onClick={() => navigate('/features/document-workspace')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {editorType === 'word' && <FileText className="w-5 h-5 text-white" />}
            {editorType === 'excel' && <Table className="w-5 h-5 text-white" />}
            {editorType === 'powerpoint' && <Presentation className="w-5 h-5 text-white" />}
            <Input
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="bg-transparent border-none text-white placeholder:text-blue-200 font-semibold w-64 focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && <span className="text-blue-200 text-sm">Saving...</span>}
          {lastSaved && !isSaving && <span className="text-blue-200 text-sm">Saved {lastSaved.toLocaleTimeString()}</span>}
          <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700">
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Share with people</DropdownMenuItem>
              <DropdownMenuItem>Get link</DropdownMenuItem>
              <DropdownMenuItem>Email</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Ribbon */}
      {renderRibbon()}

      {/* Editor Content */}
      {editorType === 'word' && renderWordEditor()}
      {editorType === 'excel' && renderExcelEditor()}
      {editorType === 'powerpoint' && renderPowerPointEditor()}
    </div>
  );
};

export default UnifiedDocumentEditor;