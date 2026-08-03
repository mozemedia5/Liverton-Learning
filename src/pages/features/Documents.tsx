import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  FileText,
  Sheet,
  Presentation,
  Plus,
  Search,
  MoreVertical,
  LayoutGrid,
  List,
  Upload,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/DashboardShell';
import { useDocuments } from '@/hooks/useDocuments';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { DocumentMeta, DocumentType } from '@/types';
import { createDocument, renameDocument, deleteDocument } from '@/lib/documents';
import { templatesForType } from '@/lib/documentTemplates';
import { uploadToCloudinary, mapFileToCloudinaryType } from '@/services/cloudinaryService';
import { SEO } from '@/components/SEO';

function typeIcon(type: DocumentType) {
  if (type === 'doc') return FileText;
  if (type === 'sheet') return Sheet;
  return Presentation;
}

function typeLabel(type: DocumentType) {
  if (type === 'doc') return 'Text';
  if (type === 'sheet') return 'Spreadsheet';
  return 'Presentation';
}

export default function Documents() {
  const navigate = useNavigate();
  const { currentUser, userRole, userData } = useAuth();

  const { documents, loading, error } = useDocuments({
    userId: currentUser?.uid,
    role: userRole,
    schoolId: (userData as any)?.schoolId,
  });

  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | DocumentType>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('Untitled');
  const [createType, setCreateType] = useState<DocumentType>('doc');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [uploading, setUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents
      .filter((d) => (filterType === 'all' ? true : d.type === filterType))
      .filter((d) => (q ? d.title.toLowerCase().includes(q) : true));
  }, [documents, query, filterType]);

  const onCreate = async () => {
    if (!currentUser || !userRole) return;
    try {
      const template = templatesForType(createType).find(t => t.id === selectedTemplateId);
      const id = await createDocument({
        title: createTitle.trim() || template?.buildTitle() || 'Untitled',
        type: createType,
        ownerId: currentUser.uid,
        role: userRole,
        schoolId: (userData as any)?.schoolId,
        content: template?.buildContent(),
      });
      toast.success(template && !template.id.endsWith('-blank') ? 'Document created from template' : 'Document created');
      setCreateOpen(false);
      setSelectedTemplateId('');
      navigate(`/dashboard/documents/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create');
    }
  };

  const onRename = async (docMeta: DocumentMeta) => {
    const next = window.prompt('Rename document', docMeta.title);
    if (!next) return;
    try {
      await renameDocument(docMeta.id, next);
      toast.success('Renamed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to rename');
    }
  };

  const onDelete = async (docMeta: DocumentMeta) => {
    const ok = window.confirm(`Delete "${docMeta.title}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteDocument(docMeta.id);
      toast.success('Deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const onUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentUser || !userRole) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, mapFileToCloudinaryType(file, file.name));
      const id = await createDocument({
        title: file.name,
        type: 'doc',
        ownerId: currentUser.uid,
        role: userRole,
        schoolId: (userData as any)?.schoolId,
      });
      await updateDoc(doc(db, 'documents', id), { fileUrl: url });
      toast.success(`${file.name} uploaded`);
      navigate(`/dashboard/documents/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const headerRight = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => setLayout((l) => (l === 'grid' ? 'list' : 'grid'))}>
        {layout === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
      </Button>
      <Button variant="outline" size="icon" onClick={() => uploadInputRef.current?.click()} disabled={uploading} title="Upload a file">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
      </Button>
      <input
        ref={uploadInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
        onChange={onUploadFile}
      />
      <Button onClick={() => setCreateOpen(true)} className="bg-black dark:bg-white text-white dark:text-black">
        <Plus className="w-4 h-4 mr-2" />
        New
      </Button>
    </div>
  );

  return (
    <>
      <SEO title="Documents" description="Create, edit and share documents, spreadsheets and presentations on Liverton Learning." noIndex />
    <DashboardShell title="Documents" userRole={userRole} headerRight={headerRight}>
      <div className="px-4 lg:px-6 py-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents..." className="pl-10" />
          </div>

          <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="doc">Text</TabsTrigger>
              <TabsTrigger value="sheet">Sheets</TabsTrigger>
              <TabsTrigger value="presentation">Slides</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {error && (
          <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
            <CardContent className="pt-6 text-red-800 dark:text-red-200">{error}</CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">Loading documents...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-600 dark:text-gray-400">
              No documents yet. Create your first document.
            </CardContent>
          </Card>
        ) : layout === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((d) => {
              const Icon = typeIcon(d.type);
              return (
                <Card key={d.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{d.title}</CardTitle>
                          <div className="mt-1 flex gap-2">
                            <Badge variant="secondary">{typeLabel(d.type)}</Badge>
                            {d.visibility === 'public' && <Badge variant="outline">Public</Badge>}
                            {d.visibility === 'internal' && <Badge variant="outline">Internal</Badge>}
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/documents/${d.id}`)}>Open</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRename(d)}>Rename</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info('Sharing available inside editor.')}>Share</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(d)} className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs text-gray-500 dark:text-gray-500">
                    Updated: {d.updatedAt instanceof Date ? d.updatedAt.toLocaleString() : '—'}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((d) => {
              const Icon = typeIcon(d.type);
              return (
                <Card key={d.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{d.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-2">
                          <span>{typeLabel(d.type)}</span>
                          <span>•</span>
                          <span>{d.visibility}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/documents/${d.id}`)}>
                        Open
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onRename(d)}>Rename</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(d)} className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setSelectedTemplateId(''); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Untitled" />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button variant={createType === 'doc' ? 'default' : 'outline'} onClick={() => { setCreateType('doc'); setSelectedTemplateId(''); }}>
                  <FileText className="w-4 h-4 mr-2" />
                  Text
                </Button>
                <Button variant={createType === 'sheet' ? 'default' : 'outline'} onClick={() => { setCreateType('sheet'); setSelectedTemplateId(''); }}>
                  <Sheet className="w-4 h-4 mr-2" />
                  Sheet
                </Button>
                <Button
                  variant={createType === 'presentation' ? 'default' : 'outline'}
                  onClick={() => { setCreateType('presentation'); setSelectedTemplateId(''); }}
                >
                  <Presentation className="w-4 h-4 mr-2" />
                  Slides
                </Button>
              </div>
            </div>

            {/* WPS-style template gallery */}
            <div className="space-y-2">
              <Label>Start from a template</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {templatesForType(createType).map((tpl) => {
                  const Icon = typeIcon(tpl.type);
                  const selected = selectedTemplateId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        if (tpl.id.endsWith('-blank') === false) {
                          setCreateTitle(tpl.buildTitle());
                        }
                      }}
                      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                        selected
                          ? 'border-emerald-500 bg-emerald-500/5'
                          : 'border-gray-200 dark:border-gray-700 hover:border-emerald-500/50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{tpl.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{tpl.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={onCreate} className="bg-black dark:bg-white text-white dark:text-black">
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
    </>
  );
}
