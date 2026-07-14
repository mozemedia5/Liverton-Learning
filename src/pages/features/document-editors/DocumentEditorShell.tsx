import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import ShareContentDialog from '@/components/ShareContentDialog';
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
        console.log('Auto-saving document:', docId);
        await updateDocumentContent({
          docId,
          content,
          updatedBy: currentUser.uid,
          bumpVersion: bumpVersionRef.current,
        });
        
        bumpVersionRef.current = false;
        lastSavedRef.current = currentJson;
        setSaveState('saved');
        console.log('Document auto-saved successfully:', docId);
      } catch (e) {
        console.error('Auto-save failed:', e);
        setSaveState('error');
        toast.error('Failed to save document. Retrying...');
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setShareOpen(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            Send to Platforms
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSetVisibility('private')}>
            Private Access
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSetVisibility('internal')}>
            Internal Access
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSetVisibility('public')} disabled={!canSharePublic}>
            Public Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
        <ShareContentDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          item={docRecord ? {
            type: 'document',
            id: docRecord.id,
            title: docRecord.title,
          } : null}
        />

        {/* Visibility Dialog */}
        <Dialog open={!!publicLink || false} onOpenChange={(open) => !open && setPublicLink(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Public Access</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Anyone with this link can view the document.</p>
              {publicLink && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  <LinkIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <a className="text-sm underline break-all text-blue-600" href={publicLink} target="_blank" rel="noreferrer">
                    {publicLink}
                  </a>
                  <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={() => {
                    navigator.clipboard.writeText(publicLink);
                    toast.success('Link copied');
                  }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
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
