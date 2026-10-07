import { auth } from '../lib/firebase';

/**
 * Authorization header with the signed-in user's Firebase ID token.
 * getIdToken() refreshes the token automatically when it is about to expire.
 */
export async function authHeaders(extra = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  return { ...extra, Authorization: `Bearer ${token}` };
}
