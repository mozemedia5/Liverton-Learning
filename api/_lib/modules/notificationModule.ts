import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, getAdminFirestore, getAdminMessaging, json, parseBody, requireIdentity, safeString } from '../server.js';

export async function handleNotificationDispatch(req: VercelRequest, res: VercelResponse) {
  try {
    const identity = await requireIdentity(req);
    const notificationId = safeString(parseBody(req).notificationId, 160);
    if (!notificationId) return json(res, 400, { error: 'A notification ID is required.' });
    const db = getAdminFirestore();
    const notificationSnapshot = await db.collection('notifications').doc(notificationId).get();
    if (!notificationSnapshot.exists) return json(res, 404, { error: 'Notification not found.' });
    const notification = notificationSnapshot.data() || {};
    if (notification.senderId !== identity.uid || identity.uid === '') return json(res, 403, { error: 'Only the notification sender can dispatch this alert.' });

    const audiences = Array.isArray(notification.targetAudience) ? notification.targetAudience : [];
    const tokenSnapshot = await db.collection('pushTokens').where('active', '==', true).get();
    const tokens = tokenSnapshot.docs.filter((document: any) => {
      const tokenData = document.data() || {};
      return audiences.includes('all') || audiences.includes(tokenData.role) || audiences.includes(`${tokenData.role}s`);
    }).map((document: any) => String(document.data()?.token || '')).filter(Boolean);
    if (tokens.length === 0) return json(res, 200, { delivered: 0 });

    let delivered = 0;
    const messaging = getAdminMessaging();
    for (let index = 0; index < tokens.length; index += 500) {
      const response = await messaging.sendEachForMulticast({
        tokens: tokens.slice(index, index + 500),
        notification: { title: String(notification.title || 'Liverton Learning'), body: String(notification.body || notification.message || '') },
        data: { notificationId, redirectUrl: String(notification.link || notification.redirectUrl || '/announcements') },
      });
      delivered += response.successCount;
    }
    return json(res, 200, { delivered });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message === 'AUTH_REQUIRED' || message.includes('auth/')) return json(res, 401, { error: 'Authentication required.' });
    if (message.startsWith('SERVER_CONFIG_MISSING')) return json(res, 503, { error: 'Server configuration is incomplete.' });
    console.error('Broadcast push dispatch error', message);
    return json(res, 500, { error: 'Could not dispatch push notifications.' });
  }
}

export async function handleNotificationRegisterToken(req: VercelRequest, res: VercelResponse) {
  try {
    const identity = await requireIdentity(req);
    const body = parseBody(req);
    const token = safeString(body.token, 4096);
    const role = safeString(body.role, 40);
    if (!token) return json(res, 400, { error: 'A push token is required.' });
    const db = getAdminFirestore();
    await db.collection('pushTokens').doc(`${identity.uid}_${token.slice(-80)}`).set({
      token,
      userId: identity.uid,
      email: identity.email || '',
      role,
      updatedAt: new Date(),
      active: true,
    }, { merge: true });
    return json(res, 200, { registered: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message === 'AUTH_REQUIRED' || message.includes('auth/')) return json(res, 401, { error: 'Authentication required.' });
    if (message.startsWith('SERVER_CONFIG_MISSING')) return json(res, 503, { error: 'Server configuration is incomplete.' });
    console.error('Push token registration error', message);
    return json(res, 500, { error: 'Could not register push notifications.' });
  }
}
