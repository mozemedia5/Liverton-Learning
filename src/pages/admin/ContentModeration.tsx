/**
 * Content Moderation Page
 * Platform admin can view, tag, disable, and delete user-generated content
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  MoreVertical,
  Tag,
  Eye,
  EyeOff,
  Trash2,
  Flag,
  BookOpen,
  FileText,
  HelpCircle,
  Video,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAllContentForModeration,
  tagContent,
  toggleContentVisibility,
  deleteContent,
  approveContent,
  getModerationStats,
  type ModerationContent,
} from '@/services/moderationService';

export default function ContentModeration() {
  const [allContent, setAllContent] = useState<ModerationContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [stats, setStats] = useState({
    totalContent: 0,
    disabledContent: 0,
    flaggedContent: 0,
    pendingReview: 0,
  });

  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; content: ModerationContent | null }>({
    open: false,
    content: null,
  });
  const [tagDialog, setTagDialog] = useState<{ open: boolean; content: ModerationContent | null }>({
    open: false,
    content: null,
  });
  const [disableDialog, setDisableDialog] = useState<{ open: boolean; content: ModerationContent | null }>({
    open: false,
    content: null,
  });
  const [newTags, setNewTags] = useState('');
  const [disableReason, setDisableReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load content on mount
  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const [content, stats] = await Promise.all([
        getAllContentForModeration(),
        getModerationStats(),
      ]);
      setAllContent(content);
      setStats(stats);
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load content for moderation');
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = allContent.filter(content => {
    const matchesSearch =
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || content.type === selectedType;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'disabled' && content.isDisabled) ||
      (selectedStatus === 'active' && !content.isDisabled) ||
      (selectedStatus === 'flagged' && content.flagCount > 0);
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDeleteContent = async () => {
    if (!deleteDialog.content) return;

    setActionLoading(true);
    try {
      await deleteContent(deleteDialog.content.type, deleteDialog.content.id);
      toast.success('Content deleted successfully');
      setDeleteDialog({ open: false, content: null });
      loadContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTagContent = async () => {
    if (!tagDialog.content || !newTags.trim()) return;

    setActionLoading(true);
    try {
      const tags = newTags.split(',').map(tag => tag.trim());
      await tagContent(tagDialog.content.type, tagDialog.content.id, tags);
      toast.success('Content tagged successfully');
      setTagDialog({ open: false, content: null });
      setNewTags('');
      loadContent();
    } catch (error) {
      console.error('Error tagging content:', error);
      toast.error('Failed to tag content');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!disableDialog.content) return;

    setActionLoading(true);
    try {
      await toggleContentVisibility(
        disableDialog.content.type,
        disableDialog.content.id,
        !disableDialog.content.isDisabled,
        disableReason
      );
      toast.success(
        disableDialog.content.isDisabled ? 'Content enabled' : 'Content disabled'
      );
      setDisableDialog({ open: false, content: null });
      setDisableReason('');
      loadContent();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update content visibility');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveContent = async (content: ModerationContent) => {
    setActionLoading(true);
    try {
      await approveContent(content.type, content.id);
      toast.success('Content approved');
      loadContent();
    } catch (error) {
      console.error('Error approving content:', error);
      toast.error('Failed to approve content');
    } finally {
      setActionLoading(false);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-4 h-4" />;
      case 'assignment':
        return <FileText className="w-4 h-4" />;
      case 'quiz':
        return <HelpCircle className="w-4 h-4" />;
      case 'lesson':
        return <Video className="w-4 h-4" />;
      case 'zoom_session':
        return <Video className="w-4 h-4" />;
      case 'event':
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (content: ModerationContent) => {
    if (content.isDisabled) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Disabled</Badge>;
    }
    if (content.flagCount > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Flagged</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Content Moderation</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage and moderate all user-generated content</p>
        </div>
        <Button onClick={loadContent} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.disabledContent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Flagged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.flaggedContent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pendingReview}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="all">All Types</TabsTrigger>
                <TabsTrigger value="course">Courses</TabsTrigger>
                <TabsTrigger value="assignment">Assignments</TabsTrigger>
                <TabsTrigger value="quiz">Quizzes</TabsTrigger>
                <TabsTrigger value="lesson">Lessons</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="all">All Status</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="disabled">Disabled</TabsTrigger>
                <TabsTrigger value="flagged">Flagged</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      <Card>
        <CardHeader>
          <CardTitle>Content ({filteredContent.length})</CardTitle>
          <CardDescription>Review and moderate platform content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredContent.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No content found</p>
            </div>
          ) : (
            filteredContent.map((content) => (
              <div
                key={`${content.type}-${content.id}`}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1">{getContentIcon(content.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{content.title}</h3>
                        {content.isDisabled && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Disabled</Badge>
                        )}
                        {content.flagCount > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            <Flag className="w-3 h-3 mr-1" />
                            {content.flagCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {content.type.charAt(0).toUpperCase() + content.type.slice(1)} by {content.author}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Created: {new Date(content.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(content)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTagDialog({ open: true, content })}>
                          <Tag className="w-4 h-4 mr-2" />
                          Add Tags
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDisableDialog({ open: true, content })}>
                          {content.isDisabled ? (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Enable
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4 mr-2" />
                              Disable
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleApproveContent(content)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteDialog({ open: true, content })}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {content.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">{content.description}</p>
                )}

                {content.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {content.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {content.moderationNotes && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                    <span className="font-medium">Notes:</span> {content.moderationNotes}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{deleteDialog.content?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContent}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tag Dialog */}
      <AlertDialog open={tagDialog.open} onOpenChange={(open) => setTagDialog({ ...tagDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Tags to Content</AlertDialogTitle>
            <AlertDialogDescription>
              Add comma-separated tags to help categorize and moderate this content
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="e.g., inappropriate, spam, low-quality"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTagContent} disabled={actionLoading || !newTags.trim()}>
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Tags'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable Dialog */}
      <AlertDialog open={disableDialog.open} onOpenChange={(open) => setDisableDialog({ ...disableDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {disableDialog.content?.isDisabled ? 'Enable Content' : 'Disable Content'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {disableDialog.content?.isDisabled
                ? 'This will make the content visible to users again'
                : 'This will hide the content from all users'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Reason for disabling (optional)"
              value={disableReason}
              onChange={(e) => setDisableReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleVisibility} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : disableDialog.content?.isDisabled ? (
                'Enable'
              ) : (
                'Disable'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
