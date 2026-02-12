import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocument } from '@/lib/documents';
import EnhancedTextEditor from './document-editors/EnhancedTextEditor';
import EnhancedSpreadsheetEditor from './document-editors/EnhancedSpreadsheetEditor';
import EnhancedPresentationEditor from './document-editors/EnhancedPresentationEditor';
import type { DocumentType } from '@/types';

/**
 * Document Editor Router Component
 * Routes to the appropriate enhanced editor based on document type
 * Supports: doc (text), sheet (spreadsheet), presentation (slides)
 */
export default function DocumentEditor() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState<DocumentType | null>(null);

  /**
   * Load document metadata to determine editor type
   * Redirects to documents page if document not found or user not authenticated
   */
  useEffect(() => {
    const run = async () => {
      if (!docId || !currentUser) {
        navigate('/dashboard/documents');
        return;
      }

      try {
        const rec = await getDocument(docId);
        if (!rec) {
          navigate('/dashboard/documents');
          return;
        }
        setDocType(rec.type);
      } catch {
        navigate('/dashboard/documents');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [docId, currentUser, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Opening editor...</p>
        </div>
      </div>
    );
  }

  if (!docType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-400">Document not found.</p>
      </div>
    );
  }

  /**
   * Route to appropriate enhanced editor based on document type
   * - 'sheet': Enhanced Spreadsheet Editor (Excel-style)
   * - 'presentation': Enhanced Presentation Editor (PowerPoint-style)
   * - 'doc': Enhanced Text Editor (Word-style) - default
   */
  if (docType === 'sheet') return <EnhancedSpreadsheetEditor />;
  if (docType === 'presentation') return <EnhancedPresentationEditor />;
  return <EnhancedTextEditor />;
}
