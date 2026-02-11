import { useEffect, useMemo, useState } from 'react';
import type { DocumentMeta, UserRole } from '@/types';
import { subscribeToDocuments } from '@/lib/documents';

export function useDocuments(params: { userId?: string; role?: UserRole | null; schoolId?: string }) {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(() => `${params.userId || ''}:${params.role || ''}:${params.schoolId || ''}`, [params.userId, params.role, params.schoolId]);

  useEffect(() => {
    if (!params.userId || !params.role) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsub = subscribeToDocuments({
      userId: params.userId,
      role: params.role,
      schoolId: params.schoolId,
      onChange: (docs) => {
        setDocuments(docs);
        setLoading(false);
      },
      onError: (message) => {
        setError(message);
        setLoading(false);
      },
    });

    return () => {
      unsub();
    };
  }, [key]);

  return { documents, loading, error };
}
