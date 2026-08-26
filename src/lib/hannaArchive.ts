export type HannaArchiveSession = {
  id: string;
  title?: string;
  archived?: boolean;
  updatedAt?: { toMillis?: () => number; toDate?: () => Date } | Date | null;
  pinnedBy?: string[];
};

function timestampMillis(value: HannaArchiveSession['updatedAt']) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return 0;
}

export function filterHannaSessions<T extends HannaArchiveSession>(
  sessions: T[],
  archived: boolean,
  searchQuery = '',
  currentUserId = '',
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return sessions
    .filter(session => Boolean(session.archived) === archived)
    .filter(session => (session.title || '').toLowerCase().includes(normalizedQuery))
    .sort((a, b) =>
      Number(Boolean(b.pinnedBy?.includes(currentUserId))) - Number(Boolean(a.pinnedBy?.includes(currentUserId)))
      || timestampMillis(b.updatedAt) - timestampMillis(a.updatedAt),
    );
}
