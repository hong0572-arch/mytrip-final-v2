import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { admin } from '../../../lib/firebaseAdmin';
import { verifyUser } from '../../../lib/verifyUser';
import { synthesizeMp3 } from '../../../lib/audioGuide';

// 음성 대화의 '티미 목소리'(로그인 필요). POST { text } → audio/mpeg. 글은 저장하지 않는다.
// 한 사람당 하루 DAILY_LIMIT번(tts_usage/{uid}). 실패하면 화면은 기기 음성으로 대신 읽는다.
export const maxDuration = 30;
const db = admin.firestore();
const NO_STORE = { 'Cache-Control': 'no-store' };
const DAILY_LIMIT = 150;
const MAX_CHARS = 400;

const seoulDay = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export async function POST(req) {
  const auth = await verifyUser(req, undefined, NO_STORE);
  if (auth.response) return auth.response;
  let body = {};
  try { body = await req.json(); } catch {}
  const text = String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400, headers: NO_STORE });

  const ref = db.doc(`tts_usage/${auth.uid}`);
  const allowed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const day = seoulDay();
    const count = snap.exists && snap.data().day === day ? snap.data().count || 0 : 0;
    if (count >= DAILY_LIMIT) return false;
    tx.set(ref, { day, count: count + 1, updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
  if (!allowed) return NextResponse.json({ error: 'daily limit' }, { status: 429, headers: NO_STORE });

  try {
    const mp3 = await synthesizeMp3(text);
    return new NextResponse(mp3, { headers: { ...NO_STORE, 'Content-Type': 'audio/mpeg', 'Content-Length': String(mp3.length) } });
  } catch (error) {
    console.error('[tts] failed:', error);
    return NextResponse.json({ error: 'tts failed' }, { status: 502, headers: NO_STORE });
  }
}
