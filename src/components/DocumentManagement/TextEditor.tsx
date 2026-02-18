/**
 * Text Editor Component
 * Microsoft Word-style rich text editor with full editing tools
 */

import React, { useState, useRef, useCallback } from 'react';
import { Download, Undo, Redo, Scissors, Copy, Clipboard, Search, Mic, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MicrosoftToolbar } from './MicrosoftToolbar';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface TextEditorProps {
  document?: EnhancedDocumentMeta;
  readOnly?: boolean;
  onSave?: (content: string, metadata: Partial<EnhancedDocumentMeta>) => void;
}

/**
 * Text Editor with Word-style interface and full editing tools
 * Supports rich text editing with comprehensive formatting controls
 */
export const TextEditor: React.FC<TextEditorProps> = ({
  document,
  readOnly = false,
  onSave,
}) => {
  const [content, setContent] = useState<string>('');
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [findDialogOpen, setFindDialogOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Update statistics
  const updateStats = useCallback((text: string) => {
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(words);
    setCharCount(text.length);
  }, []);

  // Add to history for undo/redo
  const addToHistory = useCallback((newContent: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Handle text formatting commands
  const applyFormat = (command: string, value?: string) => {
    if (typeof window !== 'undefined') {
      window.document.execCommand(command, false, value);
      editorRef.current?.focus();
      const newContent = editorRef.current?.innerHTML || '';
      setContent(newContent);
      addToHistory(newContent);
      updateStats(editorRef.current?.innerText || '');
    }
  };

  // Text Manipulation Tools
  const handleBold = () => applyFormat('bold');
  const handleItalic = () => applyFormat('italic');
  const handleUnderline = () => applyFormat('underline');
  const handleAlignLeft = () => applyFormat('justifyLeft');
  const handleAlignCenter = () => applyFormat('justifyCenter');
  const handleAlignRight = () => applyFormat('justifyRight');
  const handleBulletList = () => applyFormat('insertUnorderedList');
  const handleNumberedList = () => applyFormat('insertOrderedList');

  // Cut, Copy, Paste
  const handleCut = () => {
    applyFormat('cut');
  };

  const handleCopy = () => {
    applyFormat('copy');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      applyFormat('insertText', text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  // Undo/Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const newContent = history[newIndex];
      setContent(newContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = newContent;
        updateStats(editorRef.current.innerText);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const newContent = history[newIndex];
      setContent(newContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = newContent;
        updateStats(editorRef.current.innerText);
      }
    }
  };

  // Select All
  const handleSelectAll = () => {
    applyFormat('selectAll');
  };

  // Find & Replace
  const handleFind = () => {
    setFindDialogOpen(true);
  };

  const handleFindNext = () => {
    if (editorRef.current && findText) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        // Use built-in find
        window.find(findText, false, false, true, false, true, false);
      }
    }
  };

  const handleReplace = () => {
    if (editorRef.current && findText) {
      const html = editorRef.current.innerHTML;
      const newHtml = html.replace(new RegExp(findText, 'g'), replaceText);
      editorRef.current.innerHTML = newHtml;
      setContent(newHtml);
      addToHistory(newHtml);
      updateStats(editorRef.current.innerText);
    }
  };

  const handleReplaceAll = () => {
    handleReplace();
  };

  // Voice Typing
  const handleVoiceTyping = () => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      alert('Voice typing is not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        if (editorRef.current) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(transcript));
            
            const newContent = editorRef.current.innerHTML;
            setContent(newContent);
            addToHistory(newContent);
            updateStats(editorRef.current.innerText);
          }
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Download
  const handleDownload = () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    const element = window.document.createElement('a');
    const file = new Blob([htmlContent], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `${document?.title || 'document'}.html`;
    window.document.body.appendChild(element);
    element.click();
    window.document.body.removeChild(element);
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      addToHistory(newContent);
      updateStats(editorRef.current.innerText);

      if (onSave && document) {
        onSave(newContent, { updatedAt: new Date() });
      }
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 flex-col">
      {/* Enhanced Toolbar with Editing Tools */}
      <div className="bg-white border-b border-slate-200">
        {/* Editing Tools Bar */}
        <div className="px-3 py-2 flex items-center gap-1 border-b border-slate-100 flex-wrap">
          <span className="text-xs text-slate-500 mr-2 font-semibold">EDIT:</span>
          
          <Button size="sm" variant="ghost" onClick={handleUndo} disabled={historyIndex === 0} className="h-8 gap-1" title="Undo (Ctrl+Z)">
            <Undo className="h-3.5 w-3.5" />
            <span className="text-xs">Undo</span>
          </Button>
          
          <Button size="sm" variant="ghost" onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="h-8 gap-1" title="Redo (Ctrl+Y)">
            <Redo className="h-3.5 w-3.5" />
            <span className="text-xs">Redo</span>
          </Button>
          
          <div className="w-px h-5 bg-slate-200 mx-1" />
          
          <Button size="sm" variant="ghost" onClick={handleCut} disabled={readOnly} className="h-8 gap-1" title="Cut (Ctrl+X)">
            <Scissors className="h-3.5 w-3.5" />
            <span className="text-xs">Cut</span>
          </Button>
          
          <Button size="sm" variant="ghost" onClick={handleCopy} className="h-8 gap-1" title="Copy (Ctrl+C)">
            <Copy className="h-3.5 w-3.5" />
            <span className="text-xs">Copy</span>
          </Button>
          
          <Button size="sm" variant="ghost" onClick={handlePaste} disabled={readOnly} className="h-8 gap-1" title="Paste (Ctrl+V)">
            <Clipboard className="h-3.5 w-3.5" />
            <span className="text-xs">Paste</span>
          </Button>
          
          <div className="w-px h-5 bg-slate-200 mx-1" />
          
          <Button size="sm" variant="ghost" onClick={handleSelectAll} className="h-8 gap-1" title="Select All (Ctrl+A)">
            <span className="text-xs font-semibold">Select All</span>
          </Button>
          
          <Button size="sm" variant="ghost" onClick={handleFind} className="h-8 gap-1" title="Find & Replace (Ctrl+F)">
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Find & Replace</span>
          </Button>
          
          <div className="w-px h-5 bg-slate-200 mx-1" />
          
          <Button 
            size="sm" 
            variant={isListening ? "default" : "ghost"} 
            onClick={handleVoiceTyping} 
            className="h-8 gap-1"
            title="Voice Typing"
          >
            <Mic className={`h-3.5 w-3.5 ${isListening ? 'animate-pulse' : ''}`} />
            <span className="text-xs">{isListening ? 'Listening...' : 'Voice'}</span>
          </Button>
        </div>
        
        {/* Formatting Toolbar */}
        <MicrosoftToolbar
          onBold={handleBold}
          onItalic={handleItalic}
          onUnderline={handleUnderline}
          onAlignLeft={handleAlignLeft}
          onAlignCenter={handleAlignCenter}
          onAlignRight={handleAlignRight}
          onBulletList={handleBulletList}
          onNumberedList={handleNumberedList}
          onDownload={handleDownload}
          readOnly={readOnly}
        />
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-96">
            <div
              ref={editorRef}
              contentEditable={!readOnly}
              onInput={handleContentChange}
              className="w-full h-full p-6 focus:outline-none prose prose-sm max-w-none"
              suppressContentEditableWarning
            >
              {content || 'Start typing...'}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-slate-200 px-8 py-3 flex items-center justify-between text-sm text-slate-600">
        <div className="flex gap-4">
          <span>Words: {wordCount}</span>
          <span>Characters: {charCount}</span>
          <span>Pages: ~{Math.ceil(wordCount / 500)}</span>
        </div>
        <div className="flex gap-2">
          {isListening && (
            <span className="text-red-500 flex items-center gap-1">
              <Mic className="h-3 w-3 animate-pulse" />
              Recording...
            </span>
          )}
          <Button size="sm" variant="outline" onClick={handleDownload} className="h-8 gap-1">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Find & Replace Dialog */}
      <Dialog open={findDialogOpen} onOpenChange={setFindDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Find & Replace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Find</label>
              <Input 
                value={findText} 
                onChange={(e) => setFindText(e.target.value)} 
                placeholder="Text to find..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Replace with</label>
              <Input 
                value={replaceText} 
                onChange={(e) => setReplaceText(e.target.value)} 
                placeholder="Replacement text..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setFindDialogOpen(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button variant="outline" onClick={handleFindNext}>
                <Search className="h-4 w-4 mr-1" />
                Find Next
              </Button>
              <Button onClick={handleReplace}>
                <Check className="h-4 w-4 mr-1" />
                Replace
              </Button>
              <Button onClick={handleReplaceAll} variant="default">
                Replace All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TextEditor;
