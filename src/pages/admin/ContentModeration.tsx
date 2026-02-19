import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface FlaggedContent {
  id: string;
  type: 'post' | 'comment' | 'document';
  author: string;
  content: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  flaggedDate: string;
}

export default function ContentModeration() {
  const [flaggedContent] = useState<FlaggedContent[]>([
    {
      id: '1',
      type: 'post',
      author: 'User123',
      content: 'Sample post content...',
      reason: 'Inappropriate language',
      status: 'pending',
      flaggedDate: '2026-02-11',
    },
    {
      id: '2',
      type: 'comment',
      author: 'User456',
      content: 'Sample comment content...',
      reason: 'Spam',
      status: 'pending',
      flaggedDate: '2026-02-10',
    },
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Content Moderation</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Review and moderate user-generated content</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">245</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">18</div>
          </CardContent>
        </Card>
      </div>

      {/* Flagged Content */}
      <Card>
        <CardHeader>
          <CardTitle>Flagged Content</CardTitle>
          <CardDescription>Content awaiting moderation review</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {flaggedContent.map((item) => (
            <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)} by {item.author}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.flaggedDate}</p>
                  </div>
                </div>
                <Badge className={getStatusBadge(item.status)}>
                  {item.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{item.content}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                Reason: <span className="font-medium">{item.reason}</span>
              </p>
              {item.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-green-600 border-green-600">
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-600">
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
