/**
 * Document Workspace - Microsoft Office 365 Style Interface
 * Unified document management system for Students, Teachers, and Admins
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileText,
  Table,
  Presentation,
  Plus,
  Folder,
  Clock,
  Star,
  Share2,
  MoreVertical,
  Grid,
  List,
  Search,
  Filter,
  Download,
  Trash2,
  Copy,
  Edit3,
  X,
  ChevronLeft,
  Settings,
  Users,
  Lock,
  Globe,
  Eye,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type DocumentType = 'word' | 'excel' | 'powerpoint';
type DocumentStatus = 'active' | 'archived' | 'shared';

interface Document {
  id: string;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  owner: string;
  ownerRole: string;
  size: string;
  thumbnail?: string;
  isPublic: boolean;
  sharedWith: string[];
  lastModifiedBy: string;
  tags: string[];
}

interface DocumentWorkspaceProps {
  userRole: 'student' | 'teacher' | 'school_admin';
}

const mockDocuments: Document[] = [
  {
    id: '1',
    title: 'Math Assignment - Algebra',
    type: 'word',
    status: 'active',
    createdAt: '2026-02-10',
    updatedAt: '2026-02-14',
    owner: 'John Smith',
    ownerRole: 'student',
    size: '24 KB',
    isPublic: false,
    sharedWith: ['teacher@school.com'],
    lastModifiedBy: 'John Smith',
    tags: ['assignment', 'math'],
  },
  {
    id: '2',
    title: 'Class Schedule 2026',
    type: 'excel',
    status: 'shared',
    createdAt: '2026-01-15',
    updatedAt: '2026-02-12',
    owner: 'Admin Office',
    ownerRole: 'school_admin',
    size: '156 KB',
    isPublic: true,
    sharedWith: ['all-students', 'all-teachers'],
    lastModifiedBy: 'Admin Office',
    tags: ['schedule', 'official'],
  },
  {
    id: '3',
    title: 'Physics Presentation - Waves',
    type: 'powerpoint',
    status: 'active',
    createdAt: '2026-02-08',
    updatedAt: '2026-02-13',
    owner: 'Sarah Johnson',
    ownerRole: 'teacher',
    size: '2.4 MB',
    isPublic: true,
    sharedWith: ['physics-class-2026'],
    lastModifiedBy: 'Sarah Johnson',
    tags: ['presentation', 'physics'],
  },
];

const typeIcons = {
  word: FileText,
  excel: Table,
  powerpoint: Presentation,
};

const typeColors = {
  word: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  excel: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  powerpoint: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
};

export const DocumentWorkspace: React.FC<DocumentWorkspaceProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const canCreateDocument = userRole === 'teacher' || userRole === 'school_admin' || userRole === 'student';
  const canDeleteAny = userRole === 'school_admin';
  const canSharePublic = userRole === 'teacher' || userRole === 'school_admin';

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'my-documents' && doc.owner === userData?.fullName) ||
                         (selectedFilter === 'shared' && doc.status === 'shared') ||
                         (selectedFilter === doc.type);
    return matchesSearch && matchesFilter;
  });

  const handleCreateDocument = (type: DocumentType) => {
    const newDocId = Date.now().toString();
    const editorRoutes = {
      word: `/editor/word/${newDocId}`,
      excel: `/editor/excel/${newDocId}`,
      powerpoint: `/editor/powerpoint/${newDocId}`,
    };
    navigate(editorRoutes[type]);
    setIsCreateModalOpen(false);
  };

  const handleOpenDocument = (doc: Document) => {
    const editorRoutes = {
      word: `/editor/word/${doc.id}`,
      excel: `/editor/excel/${doc.id}`,
      powerpoint: `/editor/powerpoint/${doc.id}`,
    };
    navigate(editorRoutes[doc.type]);
  };

  const handleDeleteDocument = () => {
    if (selectedDocument) {
      setDocuments(documents.filter(d => d.id !== selectedDocument.id));
      toast.success('Document deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedDocument(null);
    }
  };

  const handleDuplicateDocument = (doc: Document) => {
    const newDoc: Document = {
      ...doc,
      id: Date.now().toString(),
      title: `${doc.title} (Copy)`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setDocuments([newDoc, ...documents]);
    toast.success('Document duplicated successfully');
  };

  const renderDocumentCard = (doc: Document) => {
    const Icon = typeIcons[doc.type];
    const canDelete = canDeleteAny || doc.owner === userData?.fullName;

    return (
      <Card 
        key={doc.id}
        className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-gray-200 dark:border-gray-800"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-3 rounded-lg ${typeColors[doc.type]}`}>
              <Icon className="w-6 h-6" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenDocument(doc)}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicateDocument(doc)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedDocument(doc); setIsShareModalOpen(true); }}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => { setSelectedDocument(doc); setIsDeleteModalOpen(true); }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div onClick={() => handleOpenDocument(doc)}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
              {doc.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Edited {doc.updatedAt}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={doc.status === 'shared' ? 'default' : 'secondary'} className="text-xs">
                  {doc.status}
                </Badge>
                {doc.isPublic && (
                  <Globe className="w-3 h-3 text-green-500" />
                )}
              </div>
              <span className="text-xs text-gray-400">{doc.size}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDocumentList = (doc: Document) => {
    const Icon = typeIcons[doc.type];
    const canDelete = canDeleteAny || doc.owner === userData?.fullName;

    return (
      <div 
        key={doc.id}
        className="flex items-center p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
        onClick={() => handleOpenDocument(doc)}
      >
        <div className={`p-2 rounded-lg mr-4 ${typeColors[doc.type]}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">{doc.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)} • Edited {doc.updatedAt} by {doc.lastModifiedBy}
          </p>
        </div>

        <div className="flex items-center gap-4 mx-4">
          {doc.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 w-20 text-right">{doc.size}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleOpenDocument(doc)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicateDocument(doc)}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSelectedDocument(doc); setIsShareModalOpen(true); }}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => { setSelectedDocument(doc); setIsDeleteModalOpen(true); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Document Workspace
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>

              <div className="flex items-center border border-gray-200 dark:border-gray-800 rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {canCreateDocument && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="all" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all" onClick={() => setSelectedFilter('all')}>All Files</TabsTrigger>
              <TabsTrigger value="my" onClick={() => setSelectedFilter('my-documents')}>My Documents</TabsTrigger>
              <TabsTrigger value="shared" onClick={() => setSelectedFilter('shared')}>Shared</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>

            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="word">Word Documents</SelectItem>
                <SelectItem value="excel">Excel Spreadsheets</SelectItem>
                <SelectItem value="powerpoint">PowerPoint</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="all" className="mt-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDocuments.map(renderDocumentCard)}
              </div>
            ) : (
              <Card>
                {filteredDocuments.map(renderDocumentList)}
              </Card>
            )}

            {filteredDocuments.length === 0 && (
              <div className="text-center py-12">
                <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery ? 'Try adjusting your search' : 'Create your first document to get started'}
                </p>
                {canCreateDocument && !searchQuery && (
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Document
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my" className="mt-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDocuments.filter(d => d.owner === userData?.fullName).map(renderDocumentCard)}
              </div>
            ) : (
              <Card>
                {filteredDocuments.filter(d => d.owner === userData?.fullName).map(renderDocumentList)}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="shared" className="mt-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDocuments.filter(d => d.status === 'shared').map(renderDocumentCard)}
              </div>
            ) : (
              <Card>
                {filteredDocuments.filter(d => d.status === 'shared').map(renderDocumentList)}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...filteredDocuments].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(renderDocumentCard)}
              </div>
            ) : (
              <Card>
                {[...filteredDocuments].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(renderDocumentList)}
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Document Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>
              Choose the type of document you want to create
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            <button
              onClick={() => handleCreateDocument('word')}
              className="flex flex-col items-center p-6 rounded-lg border-2 border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
            >
              <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900 mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                <FileText className="w-8 h-8 text-blue-600 dark:text-blue-300" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">Word</span>
              <span className="text-xs text-gray-500">Document</span>
            </button>

            <button
              onClick={() => handleCreateDocument('excel')}
              className="flex flex-col items-center p-6 rounded-lg border-2 border-gray-200 dark:border-gray-800 hover:border-green-500 dark:hover:border-green-500 transition-colors group"
            >
              <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900 mb-3 group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                <Table className="w-8 h-8 text-green-600 dark:text-green-300" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">Excel</span>
              <span className="text-xs text-gray-500">Spreadsheet</span>
            </button>

            <button
              onClick={() => handleCreateDocument('powerpoint')}
              className="flex flex-col items-center p-6 rounded-lg border-2 border-gray-200 dark:border-gray-800 hover:border-orange-500 dark:hover:border-orange-500 transition-colors group"
            >
              <div className="p-4 rounded-lg bg-orange-100 dark:bg-orange-900 mb-3 group-hover:bg-orange-200 dark:group-hover:bg-orange-800 transition-colors">
                <Presentation className="w-8 h-8 text-orange-600 dark:text-orange-300" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">PowerPoint</span>
              <span className="text-xs text-gray-500">Presentation</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Delete Document
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedDocument?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDocument}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share Document
            </DialogTitle>
            <DialogDescription>
              Share "{selectedDocument?.title}" with others
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium text-sm">Anyone with the link</p>
                  <p className="text-xs text-gray-500">Can view</p>
                </div>
              </div>
              {canSharePublic && (
                <Button variant="outline" size="sm">
                  {selectedDocument?.isPublic ? 'Disable' : 'Enable'}
                </Button>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Share with specific people</label>
              <Input placeholder="Enter email addresses..." />
            </div>

            {selectedDocument?.sharedWith.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Currently shared with</label>
                <div className="space-y-2">
                  {selectedDocument.sharedWith.map((email, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span className="text-sm">{email}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => { toast.success('Sharing settings updated'); setIsShareModalOpen(false); }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentWorkspace;