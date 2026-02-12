/**
 * Text Editor Component
 * Microsoft Word-style rich text editor
 */

import React, { useState, useRef } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MicrosoftToolbar } from './MicrosoftToolbar';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface TextEditorProps {
  document?: EnhancedDocumentMeta;
  readOnly?: boolean;
  onSave?: (content: string, metadata: Partial<EnhancedDocumentMeta>) => void;
}

/**
 * Text Editor with Word-style interface
 * Supports rich text editing with formatting controls
 */
export const TextEditor: React.FC<TextEditorProps> = ({
  document,
  readOnly = false,
  onSave,
}) => {
  const [content, setContent] = useState<string>('');
  const editorRef = useRef<HTMLDivElement>(null);

  // Handle text formatting commands
  const applyFormat = (command: string, value?: string) => {
    // Use the global document object to execute formatting commands
    if (typeof window !== 'undefined') {
      window.document.execCommand(command, false, value);
      editorRef.current?.focus();
    }
  };

  const handleBold = () => applyFormat('bold');
  const handleItalic = () => applyFormat('italic');
  const handleUnderline = () => applyFormat('underline');
  const handleAlignLeft = () => applyFormat('justifyLeft');
  const handleAlignCenter = () => applyFormat('justifyCenter');
  const handleAlignRight = () => applyFormat('justifyRight');
  const handleBulletList = () => applyFormat('insertUnorderedList');
  const handleNumberedList = () => applyFormat('insertOrderedList');

  const handleDownload = () => {
    // Get the HTML content from the editor
    const htmlContent = editorRef.current?.innerHTML || '';
    
    // Create a blob with the HTML content
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

      // Auto-save
      if (onSave && document) {
        onSave(newContent, {
          updatedAt: new Date(),
        });
      }
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 flex-col">
      {/* Toolbar */}
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
          <span>Words: {content.split(/\s+/).filter(w => w.length > 0).length}</span>
          <span>Characters: {content.length}</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="h-8 gap-1"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TextEditor;
