import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocument } from '@/lib/documents';
import TextEditor from './document-editors/TextEditor';
import SpreadsheetEditor from './document-editors/SpreadsheetEditor';
import PresentationEditor from './document-editors/PresentationEditor';
import type { DocumentType } from '@/types';

export default function DocumentEditor() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState<DocumentType | null>(null);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Opening editor...</p>
        </div>
      </div>
    );
  }

  if (!docType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">Document not found.</p>
      </div>
    );
  }

  if (docType === 'sheet') return <SpreadsheetEditor />;
  if (docType === 'presentation') return <PresentationEditor />;
  return <TextEditor />;
}
