import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { applyCors, getAdminFirestore, json, parseBody, requireIdentity, safeString } from '../_lib/server.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const identity = await requireIdentity(req);
    const body = parseBody(req);
    const transactionId = safeString(body.transactionId, 160);
    const txRef = safeString(body.txRef, 240);
    if (!transactionId || !txRef) return json(res, 400, { error: 'A Flutterwave transaction ID and reference are required.' });

    const secretKey = process.env.FLW_SECRET_KEY?.trim();
    if (!secretKey) return json(res, 503, { error: 'Flutterwave verification is not configured on the server.' });
    const db = getAdminFirestore();
    const paymentReference = db.collection('payments').doc(txRef);
    const paymentSnapshot = await paymentReference.get();
    if (!paymentSnapshot.exists) return json(res, 404, { error: 'Payment intent not found.' });
    const payment = paymentSnapshot.data() || {};
    if (payment.userId !== identity.uid) return json(res, 403, { error: 'This payment does not belong to the signed-in learner.' });
    if (payment.status === 'completed') return json(res, 200, { verified: true, accessGranted: true, courseId: payment.courseId });

    const verificationResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    });
    const verificationBody = await verificationResponse.json().catch(() => ({}));
    const transaction = verificationBody?.data;
    const expectedAmount = Number(payment.amount || 0);
    const actualAmount = Number(transaction?.amount || 0);
    const expectedCurrency = String(payment.currency || 'UGX').toUpperCase();
    const actualCurrency = String(transaction?.currency || '').toUpperCase();
    const verified = verificationResponse.ok && verificationBody?.status === 'success' && transaction?.status === 'successful' && String(transaction?.tx_ref || '') === txRef && actualAmount === expectedAmount && actualCurrency === expectedCurrency;
    if (!verified) {
      await paymentReference.set({ status: transaction?.status === 'failed' ? 'failed' : 'pending', lastVerificationAt: new Date(), updatedAt: new Date() }, { merge: true });
      return json(res, 400, { verified: false, accessGranted: false, error: 'Flutterwave could not verify this payment against the intended module.' });
    }

    const courseId = String(payment.courseId || '');
    if (!courseId) return json(res, 400, { error: 'Payment is missing its module reference.' });
    const courseReference = db.collection('courses').doc(courseId);
    const courseSnapshot = await courseReference.get();
    if (!courseSnapshot.exists) return json(res, 404, { error: 'The intended module no longer exists.' });
    const course = courseSnapshot.data() || {};
    if (Number(course.price || 0) !== expectedAmount || String(course.currency || 'UGX').toUpperCase() !== expectedCurrency) return json(res, 400, { error: 'The module price changed before verification. Access was not granted.' });

    await db.runTransaction(async transactionWriter => {
      const currentPayment = await transactionWriter.get(paymentReference);
      if (currentPayment.data()?.status === 'completed') return;
      transactionWriter.update(courseReference, {
        enrolledStudents: FieldValue.arrayUnion(identity.uid),
        updatedAt: new Date(),
      });
      transactionWriter.set(db.collection('enrollments').doc(`${courseId}_${identity.uid}`), {
        id: `${courseId}_${identity.uid}`,
        courseId,
        studentId: identity.uid,
        studentName: identity.name || identity.email || 'Liverton learner',
        teacherId: course.teacherId || '',
        enrolledAt: new Date(),
        progress: 0,
        status: 'active',
        paymentId: txRef,
      }, { merge: true });
      transactionWriter.set(paymentReference, {
        status: 'completed',
        provider: 'flutterwave',
        providerReference: String(transaction.id || transactionId),
        verifiedAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
    });
    return json(res, 200, { verified: true, accessGranted: true, courseId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message === 'AUTH_REQUIRED' || message.includes('auth/')) return json(res, 401, { error: 'Authentication required.' });
    if (message.startsWith('SERVER_CONFIG_MISSING')) return json(res, 503, { error: 'Server configuration is incomplete.' });
    console.error('Flutterwave verify error', message);
    return json(res, 500, { error: 'Could not verify payment.' });
  }
}
