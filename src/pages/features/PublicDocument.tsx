import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DocumentRecord } from '@/types';
import { toDate } from '@/lib/date';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PublicDocument() {
  const { token } = useParams();
  const [docRecord, setDocRecord] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const docsRef = collection(db, 'documents');
        const snap = await getDocs(query(docsRef, where('publicToken', '==', token), limit(1)));
        const found = snap.docs[0];
        if (!found) {
          throw new Error('Document not found');
        }
        const data = found.data() as any;
        const rec: DocumentRecord = {
          id: found.id,
          ...data,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        } as DocumentRecord;
        if (!cancelled) {
          setDocRecord(rec);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load');
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm">Loading…</div>;
  }

  if (error || !docRecord) {
    return <div className="min-h-screen flex items-center justify-center text-sm">{error || 'Not found'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{docRecord.title}</h1>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Updated: {docRecord.updatedAt instanceof Date ? docRecord.updatedAt.toLocaleString() : '—'}
            </div>
          </div>
          <Badge variant="outline">Public</Badge>
        </div>

        <Card className="p-4">
          {docRecord.content?.kind === 'doc' ? (
            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: docRecord.content.html }} />
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Public viewing is currently supported for Text documents only.
            </div>
          )}
        </Card>

        {docRecord.fileUrl ? (
          <a className="text-sm underline" href={docRecord.fileUrl} target="_blank" rel="noreferrer">
            Download attached file
          </a>
        ) : null}
      </div>
    </div>
  );
}
