import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Clock,
  Share2,
  Trash2,
  Link as LinkIcon,
  Upload,
  History,
  Bot,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { DocumentContent, DocumentRecord, DocumentVisibility } from '@/types';
import {
  deleteDocument,
  enqueueForHanna,
  getDocument,
  listVersions,
  renameDocument,
  setVisibility,
  shareInternally,
  updateDocumentContent,
  uploadFileToDocument,
} from '@/lib/documents';
import { DashboardShell } from '@/components/DashboardShell';
import './editorStyles.css';

export function DocumentEditorShell(props: {
  render: (args: {
    doc: DocumentRecord;
    content: DocumentContent;
    setContent: (c: DocumentContent) => void;
    saving: boolean;
  }) => React.ReactNode;
}) {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();

  const [docRecord, setDocRecord] = useState<DocumentRecord | null>(null);
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');

  const [shareOpen, setShareOpen] = useState(false);
  const [shareIds, setShareIds] = useState('');

  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<{ version: number; id: string; createdAt?: Date }[]>([]);

  const [publicLink, setPublicLink] = useState<string | null>(null);

  const lastSavedRef = useRef<string>('');
  const bumpVersionRef = useRef(false);

  const canSharePublic = useMemo(() => {
    if (!userRole) return false;
    if (userRole === 'teacher' || userRole === 'school_admin' || userRole === 'platform_admin') return true;
    return false;
  }, [userRole]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!docId) return;
      setLoading(true);
      try {
        const d = await getDocument(docId);
        if (!cancelled) {
          setDocRecord(d);
          setContent(d?.content ?? null);
          setLoading(false);
          lastSavedRef.current = d?.content ? JSON.stringify(d.content) : '';
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load document');
        setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  // Auto-save every 10 seconds when content changes
  useEffect(() => {
    if (!docId || !currentUser || !content) return;

    const interval = window.setInterval(async () => {
      const currentJson = JSON.stringify(content);
      if (!currentJson || currentJson === lastSavedRef.current) return;

      setSaving(true);
      setSaveState('saving');
      try {
        await updateDocumentContent({
          docId,
          content,
          updatedBy: currentUser.uid,
          bumpVersion: bumpVersionRef.current,
        });
        bumpVersionRef.current = false;
        lastSavedRef.current = currentJson;
        setSaveState('saved');
      } catch (e) {
        setSaveState('error');
      } finally {
        setSaving(false);
      }
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [docId, currentUser, content]);

  const onBumpVersion = () => {
    bumpVersionRef.current = true;
    toast.message('A new version will be created on next auto-save.');
  };

  const onRename = async () => {
    if (!docRecord) return;
    const next = window.prompt('Rename document', docRecord.title);
    if (!next) return;
    await renameDocument(docRecord.id, next);
    setDocRecord({ ...docRecord, title: next });
    toast.success('Renamed');
  };

  const onDelete = async () => {
    if (!docRecord) return;
    const ok = window.confirm(`Delete "${docRecord.title}"? This cannot be undone.`);
    if (!ok) return;
    await deleteDocument(docRecord.id);
    toast.success('Deleted');
    navigate('/dashboard/documents');
  };

  const onShareInternal = async () => {
    if (!docRecord) return;
    const ids = shareIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      toast.error('Enter at least one user ID');
      return;
    }
    await shareInternally(docRecord.id, ids);
    toast.success('Shared internally');
    setShareOpen(false);
  };

  const onSetVisibility = async (visibility: DocumentVisibility) => {
    if (!docRecord) return;

    if (visibility === 'public' && !canSharePublic) {
      toast.error('Public sharing is not allowed for your role.');
      return;
    }

    const token = visibility === 'public' ? crypto.randomUUID() : undefined;
    await setVisibility(docRecord.id, visibility, token);

    if (visibility === 'public') {
      const link = `${window.location.origin}/documents/public/${token}`;
      setPublicLink(link);
      toast.success('Public link generated');
    } else {
      setPublicLink(null);
      toast.success(`Visibility set to ${visibility}`);
    }
  };

  const onUpload = async () => {
    if (!docRecord) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await uploadFileToDocument({ docId: docRecord.id, file });
        toast.success('File uploaded');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Upload failed');
      }
    };
    input.click();
  };

  const onShowVersions = async () => {
    if (!docRecord) return;
    setVersionsOpen(true);
    try {
      const vs = await listVersions(docRecord.id);
      setVersions(vs.map((v) => ({ id: v.id, version: v.version, createdAt: v.createdAt })));
    } catch (e) {
      toast.error('Failed to load versions');
    }
  };

  const onShareWithHanna = async () => {
    if (!docRecord || !content || !currentUser) return;
    await enqueueForHanna({ userId: currentUser.uid, documentId: docRecord.id, payload: content });
    toast.success('Queued for Hanna');
  };

  if (loading || !docRecord || !content) {
    return (
      <DashboardShell title="Document" userRole={userRole} headerRight={null}>
        <div className="px-4 lg:px-6 py-10 text-sm text-gray-600 dark:text-gray-400">Loading...</div>
      </DashboardShell>
    );
  }

  const saveStatusText = saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save error' : 'Saved';

  const headerRight = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => navigate('/dashboard/documents')}>
        <ArrowLeft className="w-4 h-4" />
      </Button>

      <Button variant="outline" onClick={onRename}>
        Rename
      </Button>

      <Button variant="outline" onClick={onUpload}>
        <Upload className="w-4 h-4 mr-2" />
        Upload
      </Button>

      <Button variant="outline" onClick={() => setShareOpen(true)}>
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>

      <Button variant="outline" onClick={onShowVersions}>
        <History className="w-4 h-4 mr-2" />
        Versions
      </Button>

      <Button variant="outline" onClick={onBumpVersion}>
        <Clock className="w-4 h-4 mr-2" />
        New Version
      </Button>

      <Button variant="outline" onClick={onShareWithHanna}>
        <Bot className="w-4 h-4 mr-2" />
        Share with Hanna
      </Button>

      <Button variant="destructive" onClick={onDelete}>
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>

      <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Save className="w-4 h-4" />
        <span>{saveStatusText}</span>
      </div>
    </div>
  );

  return (
    <DashboardShell title={docRecord.title} userRole={userRole} headerRight={headerRight}>
      <div className="px-4 lg:px-6 py-6">
        <Card className="p-4">
          {props.render({ doc: docRecord, content, setContent, saving })}
        </Card>

        {/* Share Dialog */}
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Share internally (comma-separated user IDs)</Label>
                <Input value={shareIds} onChange={(e) => setShareIds(e.target.value)} placeholder="uid1, uid2" />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setShareOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={onShareInternal}>Share</Button>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-2">
                <div className="text-sm font-medium">Visibility</div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => onSetVisibility('private')}>
                    Private
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onSetVisibility('internal')}>
                    Internal
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onSetVisibility('public')} disabled={!canSharePublic}>
                    Public Link
                  </Button>
                </div>
                {publicLink && (
                  <div className="text-sm flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    <a className="underline break-all" href={publicLink} target="_blank" rel="noreferrer">
                      {publicLink}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Versions Dialog */}
        <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Version History</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {versions.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">No versions found.</div>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <div>v{v.version}</div>
                    <div className="text-gray-500">
                      {v.createdAt instanceof Date ? v.createdAt.toLocaleString() : v.id}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}
