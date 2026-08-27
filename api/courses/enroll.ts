import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
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
