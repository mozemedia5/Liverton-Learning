/**
 * Microsoft Office-Style Text Editor Component
 * Full-featured document editor with formatting, collaboration, and version control
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Save,
  Download,
  Share2,
  Undo2,
  Redo2,
  FileText,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MicrosoftToolbar } from './MicrosoftToolbar';
import { DocumentPropertiesPanel } from './DocumentPropertiesPanel';
import { CollaborationPanel } from './CollaborationPanel';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface TextEditorProps {
  documentId: string;
  initialContent?: string;
  initialMetadata?: EnhancedDocumentMeta;
  onSave?: (content: string, metadata: Partial<EnhancedDocumentMeta>) => Promise<void>;
  onShare?: (userIds: string[], permission: 'view' | 'edit' | 'comment') => void;
  readOnly?: boolean;
}

/**
 * Text Editor with Microsoft Office-style UI
 * Features: Rich text formatting, collaboration, version history, properties panel
 */
export const TextEditor: React.FC<TextEditorProps> = ({
  documentId,
  initialContent = '',
  initialMetadata,
  onSave,
  onShare,
  readOnly = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [history, setHistory] = useState<string[]>([initialContent]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);

  // Calculate word and character count
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter((w) => w.length > 0).length;
    const chars = content.length;
    setWordCount(words);
    setCharacterCount(chars);
  }, [content]);

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerText;
    setContent(newContent);

    // Add to history
    if (newContent !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
      if (editorRef.current) {
        editorRef.current.innerText = history[newIndex];
      }
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
      if (editorRef.current) {
        editorRef.current.innerText = history[newIndex];
      }
    }
  };

  // Save document
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.(content, {
        wordCount,
        characterCount,
        pageCount: Math.ceil(content.length / 3000),
        fileSize: new Blob([content]).size,
        updatedAt: new Date(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Download as text file
  const handleDownload = () => {
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
    );
    element.setAttribute('download', `${initialMetadata?.title || 'document'}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <FileText className="h-6 w-6 text-blue-600" />
              <Input
                type="text"
                placeholder="Document title"
                defaultValue={initialMetadata?.title}
                className="text-lg font-semibold border-0 focus:ring-0 px-0"
                readOnly={readOnly}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowProperties(!showProperties)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Properties
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCollaboration(!showCollaboration)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
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
          <MicrosoftToolbar
            onUndo={handleUndo}
            onRedo={handleRedo}
            onDownload={handleDownload}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            readOnly={readOnly}
          />
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div
              ref={editorRef}
              contentEditable={!readOnly}
              onInput={handleContentChange}
              className="min-h-96 p-6 bg-white rounded-lg shadow-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 leading-relaxed"
              style={{
                fontSize: '16px',
                fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
              }}
            >
              {initialContent}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t border-slate-200 px-8 py-3 flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-6">
            <span>Words: {wordCount}</span>
            <span>Characters: {characterCount}</span>
            <span>Pages: {Math.ceil(characterCount / 3000) || 1}</span>
          </div>
          <div className="flex items-center gap-2">
            {readOnly && (
              <div className="flex items-center gap-1 text-amber-600">
                <Eye className="h-4 w-4" />
                <span>Read-only</span>
              </div>
            )}
            <span>Last saved: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Properties & Collaboration */}
      <div className="w-80 bg-slate-50 border-l border-slate-200 overflow-y-auto">
        {showProperties && initialMetadata && (
          <div className="p-4">
            <DocumentPropertiesPanel document={initialMetadata} />
          </div>
        )}

        {showCollaboration && (
          <div className="p-4">
            <CollaborationPanel
              documentId={documentId}
              sharedWith={initialMetadata?.sharedWith || []}
              sharedWithPermissions={initialMetadata?.sharedWithPermissions}
              comments={initialMetadata?.comments}
              onShare={onShare}
            />
          </div>
        )}

        {!showProperties && !showCollaboration && (
          <div className="p-4 text-center text-slate-500">
            <p className="text-sm">
              Click "Properties" or "Share" to view document details and collaboration options
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextEditor;
