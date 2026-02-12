/**
 * Document Manager Component
 * Central hub for managing all document types (text, spreadsheet, presentation)
 * Handles document creation, selection, and routing to appropriate editor
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sheet,
  Presentation,
  Plus,
  Trash2,
  Share2,
  MoreVertical,
  Search,
  Filter,
  Grid,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface DocumentManagerProps {
  documents: EnhancedDocumentMeta[];
  onCreateDocument?: (type: 'text' | 'spreadsheet' | 'presentation', title: string) => void;
  onOpenDocument?: (documentId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onShareDocument?: (documentId: string) => void;
}

/**
 * Document Manager - Central hub for document management
 * Displays all documents, allows creation, filtering, and quick actions
 */
export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  onCreateDocument,
  onOpenDocument,
  onDeleteDocument,
  onShareDocument,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'text' | 'spreadsheet' | 'presentation'>(
    'all'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<'text' | 'spreadsheet' | 'presentation'>('text');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  // Handle create document
  const handleCreateDocument = () => {
    if (newDocTitle.trim()) {
      onCreateDocument?.(newDocType, newDocTitle);
      setNewDocTitle('');
      setShowCreateDialog(false);
    }
  };

  // Get document icon
  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'spreadsheet':
        return <Sheet className="h-5 w-5 text-green-600" />;
      case 'presentation':
        return <Presentation className="h-5 w-5 text-orange-600" />;
      case 'text':
      default:
        return <FileText className="h-5 w-5 text-blue-600" />;
    }
  };

  // Get document type badge color
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'spreadsheet':
        return 'bg-green-100 text-green-800';
      case 'presentation':
        return 'bg-orange-100 text-orange-800';
      case 'text':
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Format date
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Documents</h1>
              <p className="text-slate-600 mt-1">
                {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
              </p>
            </div>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Document</DialogTitle>
                  <DialogDescription>
                    Choose a document type and enter a title
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Document Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { type: 'text', label: 'Text', icon: FileText },
                        { type: 'spreadsheet', label: 'Spreadsheet', icon: Sheet },
                        { type: 'presentation', label: 'Presentation', icon: Presentation },
                      ].map(({ type, label, icon: Icon }) => (
                        <button
                          key={type}
                          onClick={() => setNewDocType(type as any)}
                          className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                            newDocType === type
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Document Title</label>
                    <Input
                      placeholder="Enter document title"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleCreateDocument();
                      }}
                    />
                  </div>

                  <Button onClick={handleCreateDocument} className="w-full">
                    Create Document
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1 bg-white">
              <Button
                size="sm"
                variant={filterType === 'all' ? 'default' : 'ghost'}
                onClick={() => setFilterType('all')}
                className="text-xs"
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filterType === 'text' ? 'default' : 'ghost'}
                onClick={() => setFilterType('text')}
                className="text-xs"
              >
                Text
              </Button>
              <Button
                size="sm"
                variant={filterType === 'spreadsheet' ? 'default' : 'ghost'}
                onClick={() => setFilterType('spreadsheet')}
                className="text-xs"
              >
                Sheets
              </Button>
              <Button
                size="sm"
                variant={filterType === 'presentation' ? 'default' : 'ghost'}
                onClick={() => setFilterType('presentation')}
                className="text-xs"
              >
                Slides
              </Button>
            </div>

            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-white">
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
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No documents found</h3>
            <p className="text-slate-600 mb-6">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first document to get started'}
            </p>
            {!searchQuery && filterType === 'all' && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Document
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => (
              <Card
                key={doc.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => onOpenDocument?.(doc.id)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getDocumentIcon(doc.type)}
                      <div>
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {doc.ownerName}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onShareDocument?.(doc.id)}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteDocument?.(doc.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getTypeBadgeColor(doc.type)}>
                        {doc.type}
                      </Badge>
                      {doc.visibility && (
                        <Badge variant="outline">{doc.visibility}</Badge>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p>Modified: {formatDate(doc.updatedAt)}</p>
                      <p>
                        {doc.wordCount || 0} words • {doc.characterCount || 0} characters
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-2">
            {filteredDocuments.map((doc) => (
              <Card
                key={doc.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onOpenDocument?.(doc.id)}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {getDocumentIcon(doc.type)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {doc.title}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {doc.ownerName} • Modified {formatDate(doc.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge className={getTypeBadgeColor(doc.type)}>
                        {doc.type}
                      </Badge>
                      {doc.visibility && (
                        <Badge variant="outline">{doc.visibility}</Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onShareDocument?.(doc.id)}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteDocument?.(doc.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentManager;
