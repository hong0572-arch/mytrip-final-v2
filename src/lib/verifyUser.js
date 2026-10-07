import { NextResponse } from 'next/server';
import { admin } from './firebaseAdmin';

/**
 * Verifies the Firebase ID token in `Authorization: Bearer <token>`.
 * The token's uid is the only trusted user identity — a client-supplied
 * userId must match it or the request is rejected.
 *
 * @returns {Promise<{ uid: string } | { response: NextResponse }>}
 */
export async function verifyUser(req, claimedUserId, headers = {}) {
  const match = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers }) };
  }

  let uid;
  try {
    ({ uid } = await admin.auth().verifyIdToken(match[1]));
  } catch {
    return { response: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401, headers }) };
  }

  if (claimedUserId && claimedUserId !== uid) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403, headers }) };
  }

  return { uid };
}
