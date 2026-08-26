import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, getAdminFirestore, json, parseBody, requireIdentity, safeString } from '../_lib/server.js';

function appUrl(req: VercelRequest) {
  return process.env.APP_URL?.trim() || process.env.PUBLIC_APP_URL?.trim() || (typeof req.headers.origin === 'string' ? req.headers.origin : '') || 'https://liverton-learning.vercel.app';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const identity = await requireIdentity(req);
    const body = parseBody(req);
    const courseId = safeString(body.courseId, 160);
    if (!courseId) return json(res, 400, { error: 'A module ID is required.' });

    const courseSnapshot = await getAdminFirestore().collection('courses').doc(courseId).get();
    if (!courseSnapshot.exists) return json(res, 404, { error: 'Module not found.' });
    const course = courseSnapshot.data() || {};
    if (course.status !== 'active' || course.visibility === 'private') return json(res, 404, { error: 'This module is not available for purchase.' });
    if (Array.isArray(course.enrolledStudents) && course.enrolledStudents.includes(identity.uid)) return json(res, 200, { alreadyEnrolled: true, courseId });

    const amount = Number(course.price || 0);
    const currency = safeString(course.currency || 'UGX', 12).toUpperCase();
    if (!Number.isFinite(amount) || amount <= 0) return json(res, 400, { error: 'This module does not have a valid paid price.' });
    const secretKey = process.env.FLW_SECRET_KEY?.trim();
    if (!secretKey) return json(res, 503, { error: 'Flutterwave checkout is not configured on the server.' });

    const txRef = `liverton-${identity.uid}-${courseId}-${randomUUID()}`;
    const redirectUrl = process.env.FLW_REDIRECT_URL?.trim() || `${appUrl(req)}/payments`;
    const customerName = identity.name || safeString(body.customerName, 120) || 'Liverton learner';
    const customerEmail = identity.email || safeString(body.customerEmail, 160);
    if (!customerEmail) return json(res, 400, { error: 'A verified learner email is required before checkout.' });

    const providerResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency,
        redirect_url: redirectUrl,
        customer: { email: customerEmail, name: customerName },
        customizations: { title: course.title || 'Liverton Learning module', description: `Access to ${course.title || 'this learning module'}` },
        meta: { courseId, userId: identity.uid, moduleId: courseId },
      }),
    });
    const providerBody = await providerResponse.json().catch(() => ({}));
    const checkoutUrl = providerBody?.data?.link;
    if (!providerResponse.ok || providerBody?.status !== 'success' || typeof checkoutUrl !== 'string') {
      console.error('Flutterwave initialize failed', { status: providerResponse.status, message: providerBody?.message });
      return json(res, 502, { error: 'Flutterwave could not start checkout. Please try again.' });
    }

    await getAdminFirestore().collection('payments').doc(txRef).set({
      id: txRef,
      txRef,
      userId: identity.uid,
      courseId,
      moduleId: courseId,
      item: course.title || 'Learning module',
      type: 'Course Purchase',
      amount,
      currency,
      status: 'pending',
      provider: 'flutterwave',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return json(res, 200, { checkoutUrl, txRef, courseId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message === 'AUTH_REQUIRED' || message.includes('auth/')) return json(res, 401, { error: 'Authentication required.' });
    if (message.startsWith('SERVER_CONFIG_MISSING')) return json(res, 503, { error: 'Server configuration is incomplete.' });
    console.error('Flutterwave initialize error', message);
    return json(res, 500, { error: 'Could not start checkout.' });
  }
}
