/**
 * Document Workspace - Main document management interface
 * Integrates with Firebase for document persistence and retrieval
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Trash2, Share2, Download, MoreVertical, FileText,
  Sheet, Presentation, Clock, User, Eye, Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface Document {
  id: string;
  title: string;
  type: 'word' | 'excel' | 'powerpoint';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  sharedWith: string[];
}

export const DocumentWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'word' | 'excel' | 'powerpoint'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<'word' | 'excel' | 'powerpoint'>('word');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load documents from Firebase
  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  // Filter documents based on search and type
  useEffect(() => {
    let filtered = documents;

    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.type === filterType);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredDocuments(filtered);
  }, [documents, searchQuery, filterType]);

  const loadDocuments = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'documents'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const docs: Document[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        docs.push({
          id: docSnap.id,
          title: data.title || 'Untitled',
          type: data.type || 'word',
          userId: data.userId,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          sharedWith: data.sharedWith || [],
        });
      });

      // Sort by updated date (newest first)
      docs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewDocument = () => {
    navigate(`/student/documents/${selectedDocType}/new`);
    setShowNewDocDialog(false);
  };

  const handleOpenDocument = (docId: string, type: string) => {
    navigate(`/student/documents/${type}/${docId}`);
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDoc(doc(db, 'documents', docId));
      setDocuments(documents.filter(d => d.id !== docId));
      setDeleteConfirmId(null);
      toast.success('Document deleted');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'word':
        return <FileText className="w-8 h-8 text-blue-500" />;
      case 'excel':
        return <Sheet className="w-8 h-8 text-green-500" />;
      case 'powerpoint':
        return <Presentation className="w-8 h-8 text-red-500" />;
      default:
        return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'word':
        return 'Word Document';
      case 'excel':
        return 'Excel Spreadsheet';
      case 'powerpoint':
        return 'PowerPoint Presentation';
      default:
        return 'Document';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
              <p className="text-gray-600 mt-1">Create, edit, and manage your documents</p>
            </div>
            <Button
              onClick={() => setShowNewDocDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Document
            </Button>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterType === 'word' ? 'default' : 'outline'}
                onClick={() => setFilterType('word')}
                size="sm"
              >
                <FileText className="w-4 h-4 mr-1" />
                Word
              </Button>
              <Button
                variant={filterType === 'excel' ? 'default' : 'outline'}
                onClick={() => setFilterType('excel')}
                size="sm"
              >
                <Sheet className="w-4 h-4 mr-1" />
                Excel
              </Button>
              <Button
                variant={filterType === 'powerpoint' ? 'default' : 'outline'}
                onClick={() => setFilterType('powerpoint')}
                size="sm"
              >
                <Presentation className="w-4 h-4 mr-1" />
                PowerPoint
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading documents...</p>
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <FileText className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? 'Try adjusting your search' : 'Create your first document to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowNewDocDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Document
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((document) => (
              <div
                key={document.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 overflow-hidden group"
              >
                {/* Document Preview */}
                <div
                  className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center cursor-pointer hover:from-gray-200 hover:to-gray-300 transition-colors"
                  onClick={() => handleOpenDocument(document.id, document.type)}
                >
                  {getDocumentIcon(document.type)}
                </div>

                {/* Document Info */}
                <div className="p-4">
                  <h3
                    className="font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600"
                    onClick={() => handleOpenDocument(document.id, document.type)}
                  >
                    {document.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {getDocumentTypeLabel(document.type)}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(document.updatedAt)}
                    </div>
                    {document.sharedWith.length > 0 && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Shared with {document.sharedWith.length}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleOpenDocument(document.id, document.type)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="px-2">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDocument(document.id, document.type)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteConfirmId(document.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Document Dialog */}
      <Dialog open={showNewDocDialog} onOpenChange={setShowNewDocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>Choose the type of document you want to create</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 py-6">
            {[
              { type: 'word' as const, label: 'Word', icon: FileText, color: 'text-blue-500' },
              { type: 'excel' as const, label: 'Excel', icon: Sheet, color: 'text-green-500' },
              { type: 'powerpoint' as const, label: 'PowerPoint', icon: Presentation, color: 'text-red-500' },
            ].map(({ type, label, icon: Icon, color }) => (
              <button
                key={type}
                onClick={() => setSelectedDocType(type)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedDocType === type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-8 h-8 ${color} mx-auto mb-2`} />
                <p className="font-semibold text-sm">{label}</p>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDocDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleNewDocument} className="bg-blue-600 hover:bg-blue-700">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteDocument(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentWorkspace;
