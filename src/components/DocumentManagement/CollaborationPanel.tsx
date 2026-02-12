/**
 * Collaboration Panel Component
 * Manages document sharing, comments, and real-time collaboration features
 */

import React, { useState } from 'react';
import {
  Users,
  MessageSquare,
  Share2,
  Plus,
  X,
  Check,
  AlertCircle,
  Edit,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { DocumentComment } from '@/types/documentManagement';

interface CollaborationPanelProps {
  documentId?: string;
  sharedWith: string[];
  sharedWithPermissions?: Record<string, 'view' | 'edit' | 'comment'>;
  comments?: DocumentComment[];
  onShare?: (userIds: string[], permission: 'view' | 'edit' | 'comment') => void;
  onAddComment?: (content: string) => void;
  onResolveComment?: (commentId: string) => void;
  onRemoveCollaborator?: (userId: string) => void;
}

/**
 * Collaboration Panel for managing document sharing and comments
 */
export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  sharedWith,
  sharedWithPermissions = {},
  comments = [],
  onShare,
  onAddComment,
  onResolveComment,
  onRemoveCollaborator,
}) => {
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit' | 'comment'>('view');
  const [newComment, setNewComment] = useState('');
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleShare = () => {
    if (shareEmail.trim()) {
      onShare?.([shareEmail], sharePermission);
      setShareEmail('');
      setShowShareDialog(false);
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'edit':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-green-600" />;
      case 'view':
      default:
        return <Users className="h-4 w-4 text-slate-600" />;
    }
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'edit':
        return 'Can Edit';
      case 'comment':
        return 'Can Comment';
      case 'view':
      default:
        return 'Can View';
    }
  };

  const unresolvedComments = comments.filter((c) => !c.resolved);

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg border border-slate-200">
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Collaboration
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Share Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Share Document
              </h3>
              <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 px-2">
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Document</DialogTitle>
                    <DialogDescription>
                      Share this document with others by entering their email address
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Email Address</label>
                      <Input
                        placeholder="user@example.com"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Permission</label>
                      <Select value={sharePermission} onValueChange={(value: any) => setSharePermission(value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">Can View</SelectItem>
                          <SelectItem value="comment">Can Comment</SelectItem>
                          <SelectItem value="edit">Can Edit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleShare} className="w-full">
                      Share
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {sharedWith.length > 0 ? (
              <div className="space-y-2">
                {sharedWith.map((userId) => (
                  <div
                    key={userId}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getPermissionIcon(sharedWithPermissions[userId] || 'view')}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{userId}</p>
                        <p className="text-xs text-slate-500">
                          {getPermissionLabel(sharedWithPermissions[userId] || 'view')}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-red-100"
                      onClick={() => onRemoveCollaborator?.(userId)}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">Not shared with anyone yet</p>
            )}
          </div>

          <Separator />

          {/* Comments Section */}
          <div>
            <h3 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments ({unresolvedComments.length})
            </h3>

            {unresolvedComments.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {unresolvedComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {comment.userName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-green-100"
                        onClick={() => onResolveComment?.(comment.id)}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                    </div>
                    <p className="text-sm text-slate-700">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No unresolved comments</p>
            )}

            <Separator className="my-3" />

            {/* Add Comment */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add Comment</label>
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="text-sm resize-none"
                rows={3}
              />
              <Button
                size="sm"
                onClick={() => {
                  onAddComment?.(newComment);
                  setNewComment('');
                }}
                disabled={!newComment.trim()}
                className="w-full"
              >
                Post Comment
              </Button>
            </div>
          </div>

          <Separator />

          {/* Collaboration Info */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Real-time Collaboration</p>
                <p className="text-xs">
                  Changes are automatically saved and synced with all collaborators
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollaborationPanel;
