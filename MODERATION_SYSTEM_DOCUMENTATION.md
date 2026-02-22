# Content Moderation System Documentation

## Overview

The Content Moderation system is a comprehensive platform for administrators to manage and moderate all user-generated content across the Liverton Learning platform. It provides real-time monitoring, filtering, and moderation actions for courses, assignments, quizzes, lessons, events, and Zoom sessions.

## Features

### 1. Real-Time Content Fetching
- Fetches all content types from Firebase in real-time
- Supports the following content types:
  - **Courses**: Full course materials and descriptions
  - **Assignments**: Student assignments and submissions
  - **Quizzes**: Quiz questions and answers
  - **Activities**: Events, lessons, and Zoom sessions
  - **Documents**: Any shared documents

### 2. Content Discovery
- **Search Functionality**: Search by content title or author name
- **Type Filtering**: Filter by content type (courses, assignments, quizzes, lessons)
- **Status Filtering**: Filter by status (active, disabled, flagged)
- **Real-Time Statistics**: Dashboard showing total content, disabled content, flagged content, and pending reviews

### 3. Moderation Actions

#### Tag Content
- Add custom tags to content for categorization
- Tags help identify problematic content patterns
- Examples: "inappropriate", "spam", "low-quality", "needs-review"
- Multiple tags can be added to a single piece of content

#### Disable/Enable Content
- Hide content from users without deleting it
- Optionally add a reason for disabling
- Content can be re-enabled at any time
- Useful for temporary content removal pending review

#### Delete Content
- Permanently remove content from the platform
- Requires confirmation to prevent accidental deletion
- Deleted content cannot be recovered

#### Approve Content
- Remove content from moderation queue
- Reset flag count and mark as "active"
- Indicates content has been reviewed and approved

### 4. Moderation Statistics
The dashboard displays:
- **Total Content**: Total number of items on the platform
- **Disabled Content**: Number of items currently disabled
- **Flagged Content**: Number of items with flags
- **Pending Review**: Items awaiting moderation decision

## Implementation Details

### Files Created/Modified

#### 1. `src/services/moderationService.ts` (NEW)
Comprehensive service for all moderation operations:

**Functions:**
- `getAllCoursesForModeration()`: Fetch all courses
- `getAllAssignmentsForModeration()`: Fetch all assignments
- `getAllQuizzesForModeration()`: Fetch all quizzes
- `getAllActivitiesForModeration()`: Fetch all activities (events, lessons, zoom)
- `getAllContentForModeration()`: Fetch all content combined
- `subscribeToModerationContent()`: Real-time subscription to content updates
- `tagContent()`: Add tags to content
- `toggleContentVisibility()`: Disable or enable content
- `deleteContent()`: Permanently delete content
- `approveContent()`: Approve and remove from moderation queue
- `getModerationStats()`: Get moderation statistics

#### 2. `src/pages/admin/ContentModeration.tsx` (REWRITTEN)
Complete rewrite of the moderation page with:
- Real-time Firebase data integration
- Advanced filtering and search
- Moderation action dialogs
- Statistics dashboard
- Responsive UI with dark mode support

### Data Structure

Each moderated content item has the following structure:

```typescript
interface ModerationContent {
  id: string;
  type: 'course' | 'event' | 'lesson' | 'assignment' | 'quiz' | 'zoom_session' | 'document';
  title: string;
  description?: string;
  author: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'disabled' | 'pending_review';
  tags: string[];
  flagCount: number;
  isDisabled: boolean;
  moderationNotes?: string;
  rawData: any; // Original Firebase document data
}
```

### Firebase Schema Extensions

The following fields are added to content documents in Firebase:

- `moderationTags`: Array of string tags
- `moderationNotes`: String notes from moderators
- `isDisabled`: Boolean indicating if content is hidden
- `flagCount`: Number of times content has been flagged
- `status`: Current status ('active', 'disabled', 'pending_review')

## Usage Guide

### For Platform Administrators

1. **Navigate to Content Moderation**
   - Go to the Platform Admin Dashboard
   - Click on "Content Moderation" in the sidebar

2. **View Content Statistics**
   - See the dashboard cards showing:
     - Total content on platform
     - Number of disabled items
     - Number of flagged items
     - Items pending review

3. **Search and Filter Content**
   - Use the search bar to find content by title or author
   - Filter by content type (courses, assignments, quizzes, lessons)
   - Filter by status (active, disabled, flagged)

4. **Take Moderation Actions**
   - Click the menu button (⋮) on any content item
   - Select an action:
     - **Add Tags**: Categorize the content
     - **Disable/Enable**: Hide or show content
     - **Approve**: Mark as reviewed and approved
     - **Delete**: Permanently remove content

5. **Add Tags**
   - Click "Add Tags" from the menu
   - Enter comma-separated tags (e.g., "inappropriate, spam")
   - Tags help identify patterns and categorize content

6. **Disable Content**
   - Click "Disable" from the menu
   - Optionally enter a reason
   - Content will be hidden from users
   - Can be re-enabled later

7. **Delete Content**
   - Click "Delete" from the menu
   - Confirm the deletion
   - Content is permanently removed (cannot be recovered)

## Best Practices

### Tagging Strategy
- Use consistent tag names across the platform
- Create a standard set of tags for common issues
- Examples: "inappropriate-language", "copyright-violation", "low-quality", "spam", "needs-review"

### Moderation Workflow
1. Review flagged content first (highest priority)
2. Check for policy violations
3. Add appropriate tags for categorization
4. Decide on action: approve, disable, or delete
5. Document reason in moderation notes

### Performance Considerations
- The system fetches all content types in parallel for efficiency
- Real-time subscriptions update the UI automatically
- Filtering is done client-side for responsiveness
- Consider implementing pagination for very large datasets

## Firestore Rules Integration

The moderation system respects Firestore security rules:
- Only platform admins can modify content moderation fields
- Regular users cannot see moderation tags or notes
- Disabled content is filtered out for non-admin users (requires frontend logic)

## Future Enhancements

Potential improvements for the moderation system:

1. **Automated Flagging**: Implement AI-based content flagging
2. **Moderation Queue**: Priority-based queue for pending items
3. **Bulk Actions**: Perform actions on multiple items at once
4. **Audit Log**: Track all moderation actions with timestamps
5. **User Reports**: Integrate user-submitted content reports
6. **Appeal System**: Allow users to appeal moderation decisions
7. **Content Restoration**: Recover recently deleted content
8. **Moderation Analytics**: Detailed reports on moderation patterns

## Troubleshooting

### Content Not Loading
- Check Firebase connection
- Verify Firestore security rules allow admin access
- Check browser console for errors

### Actions Not Working
- Verify you have platform admin role
- Check Firestore rules allow write operations
- Ensure content ID is valid

### Performance Issues
- Consider implementing pagination
- Use filtering to reduce data load
- Check Firebase quota usage

## Support

For issues or questions about the moderation system:
1. Check the browser console for error messages
2. Verify Firestore connection and rules
3. Ensure you have platform admin permissions
4. Contact the development team for assistance
