/**
 * Integrated Document Editor Page
 * Demonstrates all document types (text, spreadsheet, presentation) with unified interface
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Sheet, Presentation } from 'lucide-react';
import { TextEditor } from '@/components/DocumentManagement/TextEditor';
import { SpreadsheetEditor } from '@/components/DocumentManagement/SpreadsheetEditor';
import { PresentationEditor } from '@/components/DocumentManagement/PresentationEditor';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

/**
 * Sample document metadata for demonstration
 */
const SAMPLE_TEXT_METADATA: EnhancedDocumentMeta = {
  id: 'doc-1',
  title: 'Project Proposal',
  type: 'text',
  ownerName: 'John Doe',
  ownerEmail: 'john@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  totalVersions: 1,
  visibility: 'private',
  sharedWith: [],
  wordCount: 0,
  characterCount: 0,
  pageCount: 1,
  fileSize: 0,
  viewCount: 0,
  editCount: 0,
  comments: 0,
};

const SAMPLE_SPREADSHEET_METADATA: EnhancedDocumentMeta = {
  id: 'doc-2',
  title: 'Q1 Budget',
  type: 'spreadsheet',
  ownerName: 'Jane Smith',
  ownerEmail: 'jane@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  totalVersions: 1,
  visibility: 'shared',
  sharedWith: ['team@example.com'],
  wordCount: 0,
  characterCount: 0,
  pageCount: 1,
  fileSize: 0,
  viewCount: 5,
  editCount: 2,
  comments: 0,
};

const SAMPLE_PRESENTATION_METADATA: EnhancedDocumentMeta = {
  id: 'doc-3',
  title: 'Company Overview',
  type: 'presentation',
  ownerName: 'Mike Johnson',
  ownerEmail: 'mike@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  totalVersions: 1,
  visibility: 'public',
  sharedWith: [],
  wordCount: 0,
  characterCount: 0,
  pageCount: 1,
  fileSize: 0,
  viewCount: 12,
  editCount: 3,
  comments: 0,
};

/**
 * Integrated Editor Page - Demonstrates all document types
 */
export default function IntegratedEditorPage() {
  const [activeTab, setActiveTab] = useState('text');

  const handleSaveText = async (content: string, metadata: Partial<EnhancedDocumentMeta>) => {
    console.log('Saving text document:', { content, metadata });
    // Simulate save delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Text document saved successfully');
  };

  const handleSaveSpreadsheet = async (
    data: any[],
    metadata: Partial<EnhancedDocumentMeta>
  ) => {
    console.log('Saving spreadsheet:', { data, metadata });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Spreadsheet saved successfully');
  };

  const handleSavePresentation = async (
    slides: any[],
    metadata: Partial<EnhancedDocumentMeta>
  ) => {
    console.log('Saving presentation:', { slides, metadata });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Presentation saved successfully');
  };

  return (
    <div className="w-full h-screen bg-slate-50">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
        <div className="bg-white border-b border-slate-200 p-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Text</span>
            </TabsTrigger>
            <TabsTrigger value="spreadsheet" className="flex items-center gap-2">
              <Sheet className="h-4 w-4" />
              <span className="hidden sm:inline">Sheet</span>
            </TabsTrigger>
            <TabsTrigger value="presentation" className="flex items-center gap-2">
              <Presentation className="h-4 w-4" />
              <span className="hidden sm:inline">Slides</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="text" className="w-full h-full m-0">
          <TextEditor
            documentId="doc-1"
            initialContent="Start typing your document here..."
            initialMetadata={SAMPLE_TEXT_METADATA}
            onSave={handleSaveText}
          />
        </TabsContent>

        <TabsContent value="spreadsheet" className="w-full h-full m-0">
          <SpreadsheetEditor
            documentId="doc-2"
            initialMetadata={SAMPLE_SPREADSHEET_METADATA}
            onSave={handleSaveSpreadsheet}
          />
        </TabsContent>

        <TabsContent value="presentation" className="w-full h-full m-0">
          <PresentationEditor
            documentId="doc-3"
            initialMetadata={SAMPLE_PRESENTATION_METADATA}
            onSave={handleSavePresentation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
