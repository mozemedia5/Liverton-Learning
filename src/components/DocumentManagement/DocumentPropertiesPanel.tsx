/**
 * Document Properties Panel Component
 * Displays and manages document metadata, statistics, and properties
 * Includes word count, character count, page count, and collaboration info
 */

import React from 'react';
import {
  FileText,
  Users,
  Clock,
  Eye,
  Edit3,
  MessageSquare,
  Share2,
  Tag,
  Folder,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface DocumentPropertiesPanelProps {
  document: EnhancedDocumentMeta;
  onClose?: () => void;
}

/**
 * Document Properties Panel showing comprehensive document information
 */
export const DocumentPropertiesPanel: React.FC<DocumentPropertiesPanelProps> = ({
  document,
  onClose,
}) => {
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg border border-slate-200">
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Document Properties
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Document Title and Type */}
          <div>
            <h3 className="font-semibold text-sm text-slate-700 mb-1">Title</h3>
            <p className="text-sm text-slate-900 font-medium">{document.title}</p>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-slate-700 mb-1">Type</h3>
            <Badge variant="outline" className="capitalize">
              {document.type}
            </Badge>
          </div>

          <Separator />

          {/* Owner Information */}
          <div>
            <h3 className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Owner
            </h3>
            <div className="text-sm space-y-1">
              <p className="text-slate-900">{document.ownerName}</p>
              <p className="text-slate-500 text-xs">{document.ownerEmail}</p>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="space-y-2">
            <div>
              <h3 className="font-semibold text-sm text-slate-700 mb-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created
              </h3>
              <p className="text-sm text-slate-600">{formatDate(document.createdAt)}</p>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-slate-700 mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Last Modified
              </h3>
              <p className="text-sm text-slate-600">{formatDate(document.updatedAt)}</p>
              {document.lastEditedBy && (
                <p className="text-xs text-slate-500 mt-1">by {document.lastEditedBy}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Statistics */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-2 rounded">
                <p className="text-xs text-slate-600">Words</p>
                <p className="text-lg font-semibold text-blue-600">
                  {document.wordCount || 0}
                </p>
              </div>
              <div className="bg-green-50 p-2 rounded">
                <p className="text-xs text-slate-600">Characters</p>
                <p className="text-lg font-semibold text-green-600">
                  {document.characterCount || 0}
                </p>
              </div>
              <div className="bg-purple-50 p-2 rounded">
                <p className="text-xs text-slate-600">Pages</p>
                <p className="text-lg font-semibold text-purple-600">
                  {document.pageCount || 1}
                </p>
              </div>
              <div className="bg-orange-50 p-2 rounded">
                <p className="text-xs text-slate-600">Size</p>
                <p className="text-lg font-semibold text-orange-600">
                  {formatFileSize(document.fileSize)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity Metrics */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-slate-700">Activity</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-2 rounded">
                <Eye className="h-4 w-4 mx-auto text-slate-600 mb-1" />
                <p className="text-xs text-slate-600">Views</p>
                <p className="text-sm font-semibold">{document.viewCount || 0}</p>
              </div>
              <div className="bg-slate-50 p-2 rounded">
                <Edit3 className="h-4 w-4 mx-auto text-slate-600 mb-1" />
                <p className="text-xs text-slate-600">Edits</p>
                <p className="text-sm font-semibold">{document.editCount || 0}</p>
              </div>
              <div className="bg-slate-50 p-2 rounded">
                <MessageSquare className="h-4 w-4 mx-auto text-slate-600 mb-1" />
                <p className="text-xs text-slate-600">Comments</p>
                <p className="text-sm font-semibold">{document.comments || 0}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sharing Information */}
          <div>
            <h3 className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Sharing
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-600">Visibility</p>
                <Badge variant="secondary" className="capitalize mt-1">
                  {document.visibility}
                </Badge>
              </div>
              {document.sharedWith && document.sharedWith.length > 0 && (
                <div>
                  <p className="text-xs text-slate-600">Shared with {document.sharedWith.length} user(s)</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {document.sharedWith.slice(0, 3).map((userId) => (
                      <Badge key={userId} variant="outline" className="text-xs">
                        {userId}
                      </Badge>
                    ))}
                    {document.sharedWith.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{document.sharedWith.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Tags and Category */}
          {(document.tags?.length || 0) > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-1">
                {document.tags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {document.category && (
            <div>
              <h3 className="font-semibold text-sm text-slate-700 mb-1 flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Category
              </h3>
              <p className="text-sm text-slate-600">{document.category}</p>
            </div>
          )}

          {/* Version Information */}
          <Separator />
          <div>
            <h3 className="font-semibold text-sm text-slate-700 mb-1">Version</h3>
            <p className="text-sm text-slate-600">
              v{document.version} ({document.totalVersions || 1} total versions)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentPropertiesPanel;
