import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, getAdminFirestore, json, parseBody, requireIdentity, safeString } from '../_lib/server.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const identity = await requireIdentity(req);
    const courseId = safeString(parseBody(req).courseId, 160);
    if (!courseId) return json(res, 400, { error: 'A module ID is required.' });

    const db = getAdminFirestore();
    const courseReference = db.collection('courses').doc(courseId);
    const courseSnapshot = await courseReference.get();
    if (!courseSnapshot.exists) return json(res, 404, { error: 'Module not found.' });

    const course = courseSnapshot.data() || {};
    if (course.teacherId !== identity.uid) return json(res, 403, { error: 'Only the module teacher can send this update.' });
    const enrolledStudents = Array.isArray(course.enrolledStudents) ? course.enrolledStudents.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
    if (enrolledStudents.length === 0) return json(res, 200, { notified: 0 });

    const batch = db.batch();
    const title = `New content in ${String(course.title || 'your module')}`;
    const message = `${identity.name || 'Your teacher'} added new learning content to ${String(course.title || 'your module')}.`;
    enrolledStudents.forEach((studentId) => {
      const notificationReference = db.collection('notifications').doc();
      batch.set(notificationReference, {
        type: 'course_update',
        title,
        message,
        targetUsers: [studentId],
        targetAudience: [],
        senderId: identity.uid,
        senderRole: 'teacher',
        senderName: identity.name || 'Your teacher',
        courseId,
        referenceId: courseId,
        redirectUrl: `/student/courses/${courseId}`,
        createdAt: new Date(),
        isRead: false,
        isHidden: false,
      });
    });
    await batch.commit();
    return json(res, 200, { notified: enrolledStudents.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message === 'AUTH_REQUIRED' || message.includes('auth/')) return json(res, 401, { error: 'Authentication required.' });
    if (message.startsWith('SERVER_CONFIG_MISSING')) return json(res, 503, { error: 'Server configuration is incomplete.' });
    console.error('Course update notification error', message);
    return json(res, 500, { error: 'Could not notify enrolled learners.' });
  }
}
