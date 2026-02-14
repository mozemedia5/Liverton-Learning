# Zoom Lessons Plugin - Setup Guide

## Quick Start

### Step 1: File Structure
The plugin has been created with the following structure:

```
src/
├── components/
│   └── ZoomLessons/
│       ├── TeacherZoomLessons.tsx      # Teacher lesson management
│       ├── StudentZoomLessons.tsx      # Student enrollment & access
│       ├── ParentZoomLessons.tsx       # Parent monitoring
│       └── index.ts                    # Component exports
├── lib/
│   └── zoomService.ts                  # Firebase service functions
└── pages/
    └── zoom-lessons/
        ├── TeacherZoomLessonsPage.tsx
        ├── StudentZoomLessonsPage.tsx
        └── ParentZoomLessonsPage.tsx
```

### Step 2: Update Navigation

#### For Teachers - Update `src/components/TeacherSideNavbar.tsx`

Add this import at the top:
```tsx
import { Video } from 'lucide-react';
```

Add this navigation item in the navigation menu:
```tsx
<NavItem 
  icon={<Video className="w-5 h-5" />}
  label="Zoom Lessons"
  href="/teacher/zoom-lessons"
  description="Create and manage Zoom lessons"
/>
```

#### For Students - Update `src/components/SideNavbar.tsx`

Add this import at the top:
```tsx
import { Video } from 'lucide-react';
```

Add this navigation item in the navigation menu:
```tsx
<NavItem 
  icon={<Video className="w-5 h-5" />}
  label="Zoom Lessons"
  href="/student/zoom-lessons"
  description="Enroll in and attend lessons"
/>
```

#### For Parents - Update `src/components/ParentSideNavbar.tsx`

Add this import at the top:
```tsx
import { Video } from 'lucide-react';
```

Add this navigation item in the navigation menu:
```tsx
<NavItem 
  icon={<Video className="w-5 h-5" />}
  label="Zoom Lessons"
  href="/parent/zoom-lessons"
  description="Monitor children's lessons"
/>
```

### Step 3: Update Router Configuration

Find your router configuration file (likely `src/App.tsx` or `src/router.tsx`) and add these routes:

```tsx
import TeacherZoomLessonsPage from '@/pages/zoom-lessons/TeacherZoomLessonsPage';
import StudentZoomLessonsPage from '@/pages/zoom-lessons/StudentZoomLessonsPage';
import ParentZoomLessonsPage from '@/pages/zoom-lessons/ParentZoomLessonsPage';

// Add to your routes array:
{
  path: '/teacher/zoom-lessons',
  element: <TeacherZoomLessonsPage />,
  requireAuth: true,
  requiredRole: 'teacher'
},
{
  path: '/student/zoom-lessons',
  element: <StudentZoomLessonsPage />,
  requireAuth: true,
  requiredRole: 'student'
},
{
  path: '/parent/zoom-lessons',
  element: <ParentZoomLessonsPage />,
  requireAuth: true,
  requiredRole: 'parent'
}
```

### Step 4: Firestore Setup

Create these collections in your Firebase Firestore:

1. **zoomLessons** - Stores all lesson information
2. **studentEnrollments** - Tracks student enrollments
3. **lessonHistory** - Records completed lessons

#### Security Rules

Add these security rules to your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Zoom Lessons Collection
    match /zoomLessons/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth.token.role == 'teacher';
      allow update, delete: if request.auth.uid == resource.data.teacherId;
    }
    
    // Student Enrollments Collection
    match /studentEnrollments/{document=**} {
      allow read: if request.auth.uid == resource.data.studentId || 
                     request.auth.uid == resource.data.teacherId;
      allow create: if request.auth.uid == request.resource.data.studentId;
      allow update: if request.auth.uid == resource.data.studentId || 
                       request.auth.uid == resource.data.teacherId;
    }
    
    // Lesson History Collection
    match /lessonHistory/{document=**} {
      allow read: if request.auth.uid == resource.data.studentId || 
                     request.auth.uid == resource.data.teacherId;
      allow write: if request.auth.uid == resource.data.teacherId;
    }
  }
}
```

### Step 5: Test the Plugin

1. **As a Teacher:**
   - Navigate to `/teacher/zoom-lessons`
   - Click "Create Lesson"
   - Fill in all required fields
   - Click "Create Lesson"
   - Verify lesson appears in the list

2. **As a Student:**
   - Navigate to `/student/zoom-lessons`
   - Click "Browse" tab
   - Find a lesson and click "Enroll Now"
   - Confirm enrollment
   - Verify lesson appears in "Enrolled" tab

3. **As a Parent:**
   - Navigate to `/parent/zoom-lessons`
   - Select a child from dropdown
   - View child's enrolled lessons
   - Check statistics dashboard

## Features Checklist

### Teacher Dashboard
- [x] Create new lessons with all details
- [x] Set enrollment fees
- [x] Define learning outcomes
- [x] Add course materials
- [x] Edit lesson details
- [x] Delete lessons
- [x] View enrolled students
- [x] Track lesson status

### Student Dashboard
- [x] Browse available lessons
- [x] Enroll in lessons
- [x] View upcoming lessons
- [x] Access enrolled lessons
- [x] Join Zoom meetings
- [x] View learning outcomes
- [x] Access course materials
- [x] Track lesson history

### Parent Dashboard
- [x] Select child to monitor
- [x] View child's enrolled lessons
- [x] Track attendance
- [x] Monitor enrollment fees
- [x] View learning outcomes
- [x] See teacher feedback
- [x] Track lesson history
- [x] View statistics

## Customization

### Change Colors
Edit the `getStatusColor()` and `getPaymentStatusColor()` functions in the components to match your brand colors.

### Add More Fields
To add more fields to lessons:
1. Update the `ZoomLesson` interface in `zoomService.ts`
2. Add form fields in the create/edit dialog
3. Update Firestore security rules if needed

### Modify Enrollment Fee
The enrollment fee is stored in the lesson and can be:
- Set by teachers when creating lessons
- Modified when editing lessons
- Tracked in parent dashboard

## Troubleshooting

### Issue: Lessons not appearing
**Solution:** 
- Check Firestore collections exist
- Verify user is authenticated
- Check browser console for errors
- Verify security rules allow read access

### Issue: Can't create lessons
**Solution:**
- Verify user role is 'teacher'
- Check Firestore security rules
- Ensure all required fields are filled
- Check browser console for errors

### Issue: Enrollment not working
**Solution:**
- Verify student is authenticated
- Check lesson exists in Firestore
- Verify enrollment fee is set
- Check Firestore security rules

### Issue: Parent can't see child's lessons
**Solution:**
- Verify child is linked to parent account
- Check child ID is correct in database
- Verify parent has correct role
- Check Firestore security rules

## Next Steps

1. **Payment Integration** (Optional)
   - Integrate Stripe or PayPal
   - Process enrollment fees
   - Generate invoices

2. **Email Notifications** (Optional)
   - Send enrollment confirmations
   - Send lesson reminders
   - Send attendance notifications

3. **Lesson Recordings** (Optional)
   - Store Zoom recordings
   - Allow students to review
   - Track viewing history

4. **Certificates** (Optional)
   - Generate completion certificates
   - Track certificate issuance
   - Allow downloads

## Support

For issues or questions:
1. Check the console for error messages
2. Review the ZOOM_LESSONS_PLUGIN.md documentation
3. Verify Firestore setup
4. Check security rules

---

**Setup Date:** February 14, 2026
**Plugin Version:** 1.0.0
