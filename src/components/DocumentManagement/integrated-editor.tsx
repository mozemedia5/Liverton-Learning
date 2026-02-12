/**
 * Integrated Document Editor
 * Unified interface for editing documents, spreadsheets, and presentations
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Sheet, Presentation } from 'lucide-react';
import { TextEditor } from './TextEditor';
import { SpreadsheetEditor } from './SpreadsheetEditor';
import { PresentationEditor } from './PresentationEditor';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface IntegratedEditorProps {
  document?: EnhancedDocumentMeta;
  readOnly?: boolean;
  onSave?: (content: any, metadata: Partial<EnhancedDocumentMeta>) => void;
}

/**
 * Integrated Editor Component
 * Provides unified interface for multiple document types
 * Supports text documents, spreadsheets, and presentations
 */
export const IntegratedEditor: React.FC<IntegratedEditorProps> = ({
  document,
  readOnly = false,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState('document');

  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      {/* Tab Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full flex-1 flex flex-col"
      >
        <TabsList className="w-full justify-start rounded-none border-b border-slate-200 bg-white px-4 py-0">
          <TabsTrigger
            value="document"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
          >
            <FileText className="h-4 w-4" />
            Document
          </TabsTrigger>
          <TabsTrigger
            value="spreadsheet"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
          >
            <Sheet className="h-4 w-4" />
            Spreadsheet
          </TabsTrigger>
          <TabsTrigger
            value="presentation"
            className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
          >
            <Presentation className="h-4 w-4" />
            Presentation
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="document" className="flex-1 m-0">
          <TextEditor
            document={document}
            readOnly={readOnly}
            onSave={onSave}
          />
        </TabsContent>

        <TabsContent value="spreadsheet" className="flex-1 m-0">
          <SpreadsheetEditor
            document={document}
            readOnly={readOnly}
            onSave={onSave}
          />
        </TabsContent>

        <TabsContent value="presentation" className="flex-1 m-0">
          <PresentationEditor
            document={document}
            readOnly={readOnly}
            onSave={onSave}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegratedEditor;
