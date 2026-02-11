import { DocumentEditorShell } from '@/pages/features/document-editors/DocumentEditorShell';
import { TextEditor } from '@/pages/features/document-editors/TextEditor';
import { SpreadsheetEditor } from '@/pages/features/document-editors/SpreadsheetEditor';
import { PresentationEditor } from '@/pages/features/document-editors/PresentationEditor';
import type { DocumentContent } from '@/types';

export default function DocumentEditor() {
  return (
    <DocumentEditorShell
      render={({ content, setContent, saving }) => {
        if (content.kind === 'doc') {
          return (
            <TextEditor
              content={content}
              saving={saving}
              onChange={(next) => setContent(next as DocumentContent)}
            />
          );
        }

        if (content.kind === 'sheet') {
          return (
            <SpreadsheetEditor
              content={content}
              saving={saving}
              onChange={(next) => setContent(next as DocumentContent)}
            />
          );
        }

        return (
          <PresentationEditor
            content={content}
            saving={saving}
            onChange={(next) => setContent(next as DocumentContent)}
          />
        );
      }}
    />
  );
}
