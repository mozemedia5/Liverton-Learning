import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { applyCors, getAdminFirestore, getAdminMessaging, json, parseBody, requireIdentity, safeString } from '../server.js';

export async function handleCourseEnroll(req: VercelRequest, res: VercelResponse) {
  try {
    const identity = await requireIdentity(req);
    const courseId = safeString(parseBody(req).courseId, 160);
    if (!courseId) return json(res, 400, { error: 'A module ID is required.' });

    const db = getAdminFirestore();
    const courseReference = db.collection('courses').doc(courseId);
    const courseSnapshot = await courseReference.get();
    if (!courseSnapshot.exists) return json(res, 404, { error: 'Module not found.' });
    const course = courseSnapshot.data() || {};
    const status = String(course.status || '');
    const visibility = String(course.visibility || 'public');
    const price = Number(course.price || 0);
    const isFree = course.isFree === true || price <= 0;

    if (status !== 'active' || visibility === 'private') return json(res, 404, { error: 'This module is not available for enrollment.' });
    if (!isFree) return json(res, 402, { error: 'This module requires paid checkout.', requiresPayment: true });
    if (Array.isArray(course.enrolledStudents) && course.enrolledStudents.includes(identity.uid)) return json(res, 200, { enrolled: true, alreadyEnrolled: true, courseId });

    const enrollmentReference = db.collection('enrollments').doc(`${courseId}_${identity.uid}`);
    await db.runTransaction(async (transaction) => {
      const freshCourse = await transaction.get(courseReference);
      const existingEnrollment = await transaction.get(enrollmentReference);
      if (!freshCourse.exists) throw new Error('MODULE_NOT_FOUND');
      const freshData = freshCourse.data() || {};
      if (String(freshData.status || '') !== 'active' || String(freshData.visibility || 'public') === 'private') throw new Error('MODULE_UNAVAILABLE');
      if (!(freshData.isFree === true || Number(freshData.price || 0) <= 0)) throw new Error('PAYMENT_REQUIRED');
      if (existingEnrollment.exists || (Array.isArray(freshData.enrolledStudents) && freshData.enrolledStudents.includes(identity.uid))) return;

      transaction.update(courseReference, { enrolledStudents: FieldValue.arrayUnion(identity.uid), updatedAt: new Date() });
      transaction.set(enrollmentReference, {
        id: `${courseId}_${identity.uid}`,
        courseId,
        studentId: identity.uid,
        studentName: identity.name || identity.email || 'Liverton learner',
        studentEmail: identity.email || '',
        teacherId: freshData.teacherId || '',
        enrolledAt: new Date(),
        progress: 0,
        status: 'active',
      }, { merge: true });
      transaction.set(db.collection('notifications').doc(), {
        type: 'course_enrollment',
        title: 'You joined a module',
        message: `You now have free access to ${freshData.title || 'your new module'}.`,
        targetUsers: [identity.uid],
        senderId: 'liverton-system',
        senderRole: 'system',
        courseId,
        createdAt: new Date(),
        read: false,
        hidden: false,
      });
    });

    return json(res, 200, { enrolled: true, courseId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message === 'AUTH_REQUIRED' || message.includes('auth/')) return json(res, 401, { error: 'Authentication required.' });
    if (message === 'MODULE_NOT_FOUND') return json(res, 404, { error: 'Module not found.' });
    if (message === 'MODULE_UNAVAILABLE') return json(res, 404, { error: 'This module is not available for enrollment.' });
    if (message === 'PAYMENT_REQUIRED') return json(res, 402, { error: 'This module requires paid checkout.', requiresPayment: true });
    if (message.startsWith('SERVER_CONFIG_MISSING')) return json(res, 503, { error: 'Server configuration is incomplete.' });
    console.error('Free enrollment error', message);
    return json(res, 500, { error: 'Could not enroll in the module.' });
  }
}

export async function handleCourseNotifyUpdate(req: VercelRequest, res: VercelResponse) {
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

    let pushDelivered = 0;
    try {
      const messaging = getAdminMessaging();
      await Promise.all(enrolledStudents.map(async (studentId) => {
        const tokenSnapshot = await db.collection('pushTokens').where('userId', '==', studentId).where('active', '==', true).get();
        await Promise.all(tokenSnapshot.docs.map(async (tokenDocument: any) => {
          const token = tokenDocument.data()?.token;
          if (!token) return;
          try {
            await messaging.send({
              token,
              notification: { title, body: message },
              data: { notificationId: tokenDocument.id, courseId, redirectUrl: `/student/courses/${courseId}` },
            });
            pushDelivered += 1;
          } catch (pushError) {
            console.warn('Push delivery failed for token:', pushError);
          }
        }));
      }));
    } catch (pushError) {
      console.warn('Push delivery is unavailable; in-app notifications were still recorded:', pushError);
    }
    return json(res, 200, { notified: enrolledStudents.length, pushDelivered });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message === 'AUTH_REQUIRED' || message.includes('auth/')) return json(res, 401, { error: 'Authentication required.' });
    if (message.startsWith('SERVER_CONFIG_MISSING')) return json(res, 503, { error: 'Server configuration is incomplete.' });
    console.error('Course update notification error', message);
    return json(res, 500, { error: 'Could not notify enrolled learners.' });
  }
}
