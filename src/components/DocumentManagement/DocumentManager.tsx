/**
 * Document Manager Component
 * Central hub for document discovery, creation, and management
 */

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Grid,
  List,
  Trash2,
  Share2,
  FileText,
  Table,
  Presentation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface DocumentManagerProps {
  documents?: EnhancedDocumentMeta[];
  onCreateDocument?: (title: string, type: 'text' | 'spreadsheet' | 'presentation') => void;
  onOpenDocument?: (documentId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onShareDocument?: (documentId: string) => void;
}

/**
 * Document Manager for discovering and managing documents
 */
export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents = [],
  onCreateDocument,
  onOpenDocument,
  onDeleteDocument,
  onShareDocument,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'text' | 'spreadsheet' | 'presentation'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<'text' | 'spreadsheet' | 'presentation'>('text');

  // Filter documents based on search and type
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleCreateDocument = () => {
    if (newDocTitle.trim()) {
      onCreateDocument?.(newDocTitle, newDocType);
      setNewDocTitle('');
      setShowCreateDialog(false);
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'spreadsheet':
        return <Table className="h-5 w-5 text-green-600" />;
      case 'presentation':
        return <Presentation className="h-5 w-5 text-orange-600" />;
      case 'text':
      default:
        return <FileText className="h-5 w-5 text-blue-600" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'spreadsheet':
        return 'Spreadsheet';
      case 'presentation':
        return 'Presentation';
      case 'text':
      default:
        return 'Document';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Documents</h1>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 hidden sm:flex">
              <Plus className="h-4 w-4" />
              New Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
              <DialogDescription>
                Create a new document by selecting a type and entering a title
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Document Title</label>
                <Input
                  placeholder="Enter document title..."
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Document Type</label>
                <Select value={newDocType} onValueChange={(value: any) => setNewDocType(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Document</SelectItem>
                    <SelectItem value="spreadsheet">Spreadsheet</SelectItem>
                    <SelectItem value="presentation">Presentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateDocument} className="w-full">
                Create Document
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="w-full sm:flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="flex-1 sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="text">Documents</SelectItem>
              <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
              <SelectItem value="presentation">Presentations</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1 border border-slate-200 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <Button
        onClick={() => setShowCreateDialog(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl sm:hidden z-30 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center p-0"
        aria-label="Create new document"
      >
        <Plus className="w-7 h-7" />
      </Button>

      {/* Documents Display */}
      {filteredDocuments.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <Card
                key={doc.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onOpenDocument?.(doc.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getDocumentIcon(doc.type)}
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                        <p className="text-xs text-slate-500">
                          {getDocumentTypeLabel(doc.type)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Owner: {doc.ownerName}</p>
                    <p>
                      Modified:{' '}
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </p>
                    {doc.wordCount && <p>Words: {doc.wordCount}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShareDocument?.(doc.id);
                      }}
                    >
                      <Share2 className="h-3 w-3 mr-1" />
                      Share
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDocument?.(doc.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((doc) => (
              <Card
                key={doc.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onOpenDocument?.(doc.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getDocumentIcon(doc.type)}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 truncate">
                          {doc.title}
                        </p>
                        <p className="text-sm text-slate-500">
                          {doc.ownerName} •{' '}
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShareDocument?.(doc.id);
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDocument?.(doc.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No documents found
          </h3>
          <p className="text-slate-600 mb-4">
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first document to get started'}
          </p>
          {!searchQuery && filterType === 'all' && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Document
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
        </Card>
      )}
    </div>
  );
};

export default DocumentManager;
