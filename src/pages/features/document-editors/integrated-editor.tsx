/**
 * Integrated Document Editor Page
 * Demonstrates all document types (text, spreadsheet, presentation) with unified interface
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Sheet, Presentation } from 'lucide-react';
import { TextEditor } from '@/components/DocumentManagement/TextEditor';
import { SpreadsheetEditor } from '@/components/DocumentManagement/SpreadsheetEditor';
import { PresentationEditor } from '@/components/DocumentManagement/PresentationEditor';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

/**
 * Sample document metadata for demonstration
 * These objects represent typical document metadata with all required fields
 */
const SAMPLE_TEXT_METADATA: EnhancedDocumentMeta = {
  id: 'doc-1',
  title: 'Project Proposal',
  type: 'doc',
  ownerId: 'user-1',
  ownerName: 'John Doe',
  ownerEmail: 'john@example.com',
  role: 'teacher',
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
  type: 'sheet',
  ownerId: 'user-2',
  ownerName: 'Jane Smith',
  ownerEmail: 'jane@example.com',
  role: 'teacher',
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  totalVersions: 1,
  visibility: 'private',
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
  ownerId: 'user-3',
  ownerName: 'Mike Johnson',
  ownerEmail: 'mike@example.com',
  role: 'teacher',
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
  viewCount: 12,
  editCount: 3,
  comments: 0,
};

/**
 * Integrated Editor Page - Demonstrates all document types
 * Provides a tabbed interface to switch between text, spreadsheet, and presentation editors
 * Each editor is initialized with sample metadata and content
 */
export default function IntegratedEditorPage() {
  // Track which editor tab is currently active
  const [activeTab, setActiveTab] = useState('text');

  /**
   * Handle saving text document
   * @param content - The text content to save
   * @param metadata - Updated document metadata
   */
  const handleSaveText = async (content: string, metadata: Partial<EnhancedDocumentMeta>) => {
    console.log('Saving text document:', { content, metadata });
    // Simulate save delay to mimic API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Text document saved successfully');
  };

  /**
   * Handle saving spreadsheet document
   * @param data - The spreadsheet data (rows and cells)
   * @param metadata - Updated document metadata
   */
  const handleSaveSpreadsheet = async (
    data: any[],
    metadata: Partial<EnhancedDocumentMeta>
  ) => {
    console.log('Saving spreadsheet:', { data, metadata });
    // Simulate save delay to mimic API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Spreadsheet saved successfully');
  };

  /**
   * Handle saving presentation document
   * @param slides - The presentation slides
   * @param metadata - Updated document metadata
   */
  const handleSavePresentation = async (
    slides: any[],
    metadata: Partial<EnhancedDocumentMeta>
  ) => {
    console.log('Saving presentation:', { slides, metadata });
    // Simulate save delay to mimic API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Presentation saved successfully');
  };

  return (
    <div className="w-full h-screen bg-slate-50">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
        {/* Tab navigation header */}
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

        {/* Text Editor Tab */}
        <TabsContent value="text" className="w-full h-full m-0">
          <TextEditor
            document={SAMPLE_TEXT_METADATA}
            onSave={handleSaveText}
          />
        </TabsContent>

        {/* Spreadsheet Editor Tab */}
        <TabsContent value="spreadsheet" className="w-full h-full m-0">
          <SpreadsheetEditor
            document={SAMPLE_SPREADSHEET_METADATA}
            onSave={handleSaveSpreadsheet}
          />
        </TabsContent>

        {/* Presentation Editor Tab */}
        <TabsContent value="presentation" className="w-full h-full m-0">
          <PresentationEditor
            document={SAMPLE_PRESENTATION_METADATA}
            onSave={handleSavePresentation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
