/**
 * Document Properties Panel Component
 * Displays comprehensive document metadata and statistics
 */

import React from 'react';
import {
  FileText,
  Calendar,
  User,
  Eye,
  Edit,
  MessageSquare,
  Tag,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { EnhancedDocumentMeta } from '@/types/documentManagement';

interface DocumentPropertiesPanelProps {
  document: EnhancedDocumentMeta;
}

/**
 * Panel displaying document properties and metadata
 */
export const DocumentPropertiesPanel: React.FC<DocumentPropertiesPanelProps> = ({
  document,
}) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'bg-green-100 text-green-800';
      case 'shared':
        return 'bg-blue-100 text-blue-800';
      case 'private':
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-lg shadow-lg border border-slate-200">
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Properties
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Document Title */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Title</p>
            <p className="text-sm font-medium text-slate-900 mt-1">{document.title}</p>
          </div>

          <Separator />

          {/* Document Type */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Type</p>
            <Badge className="mt-1 capitalize">{document.type}</Badge>
          </div>

          <Separator />

          {/* Owner Information */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Owner</p>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-600" />
              <div>
                <p className="text-sm font-medium text-slate-900">{document.ownerName}</p>
                <p className="text-xs text-slate-500">{document.ownerEmail}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="space-y-2">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Created</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-slate-600" />
                <p className="text-sm text-slate-700">{formatDate(document.createdAt)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Last Modified</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-slate-600" />
                <p className="text-sm text-slate-700">{formatDate(document.updatedAt)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded">
              <p className="text-xs text-slate-600 mb-1">Views</p>
              <p className="text-lg font-semibold text-slate-900">{document.viewCount}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded">
              <p className="text-xs text-slate-600 mb-1">Edits</p>
              <p className="text-lg font-semibold text-slate-900">{document.editCount}</p>
            </div>
            {document.wordCount && (
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-600 mb-1">Words</p>
                <p className="text-lg font-semibold text-slate-900">{document.wordCount}</p>
              </div>
            )}
            {document.characterCount && (
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-600 mb-1">Characters</p>
                <p className="text-lg font-semibold text-slate-900">{document.characterCount}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Activity Metrics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-600" />
                <span className="text-sm text-slate-700">Views</span>
              </div>
              <span className="text-sm font-medium text-slate-900">{document.viewCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-slate-600" />
                <span className="text-sm text-slate-700">Edits</span>
              </div>
              <span className="text-sm font-medium text-slate-900">{document.editCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-600" />
                <span className="text-sm text-slate-700">Comments</span>
              </div>
              <span className="text-sm font-medium text-slate-900">{document.comments}</span>
            </div>
          </div>

          <Separator />

          {/* Visibility & Sharing */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Visibility</p>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-600" />
              <Badge className={getVisibilityColor(document.visibility)}>
                {document.visibility.charAt(0).toUpperCase() + document.visibility.slice(1)}
              </Badge>
            </div>
          </div>

          {document.sharedWith && document.sharedWith.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Shared With ({document.sharedWith.length})
                </p>
                <div className="space-y-1">
                  {document.sharedWith.slice(0, 3).map((user) => (
                    <p key={user} className="text-sm text-slate-700 truncate">
                      {user}
                    </p>
                  ))}
                  {document.sharedWith.length > 3 && (
                    <p className="text-sm text-slate-500 italic">
                      +{document.sharedWith.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {document.tags && document.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {document.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentPropertiesPanel;
