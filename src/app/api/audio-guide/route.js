import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { admin } from '../../../lib/firebaseAdmin';
import { verifyUser } from '../../../lib/verifyUser';
import { createAiGuide, guideId } from '../../../lib/audioGuide';
import { findOdiiGuide } from '../../../lib/odii';

// 장소 오디오 가이드(로그인 필요).
// POST { name, query?, city?, category?, description?, lat?, lng?, lang }
//   → 한국 장소는 관광공사 오디(녹음 해설)를 먼저 찾고, 없으면 AI 해설(원고+음성)을 만든다.
//   → { id, source: 'odii'|'ai', title, teaser, tracks: [{ title, src, duration, script, cues? }] }
// POST { action: 'report', id, note? } → 틀린 내용 신고(audio_reports)
// 저장: audio_guides/{id}(서버 전용), 새로 만드는 AI 해설은 한 사람당 하루 DAILY_LIMIT개.
export const maxDuration = 60;
const db = admin.firestore();
const NO_STORE = { 'Cache-Control': 'no-store' };
const DAILY_LIMIT = 20;
const ODII_RECHECK_MS = 7 * 24 * 60 * 60 * 1000; // AI 해설로 저장된 한국 장소도 일주일마다 오디를 다시 확인

const text = (v, max) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : undefined);
const inKorea = (lat, lng) => lat >= 33 && lat <= 38.7 && lng >= 124.5 && lng <= 131;

function seoulDay() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

// 하루 한도 차감(넘으면 false)
async function takeQuota(uid) {
  const ref = db.doc(`audio_usage/${uid}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const day = seoulDay();
    const count = snap.exists && snap.data().day === day ? snap.data().count || 0 : 0;
    if (count >= DAILY_LIMIT) return false;
    tx.set(ref, { day, count: count + 1, updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
}

const publicOf = (id, g) => ({ id, source: g.source, title: g.title, teaser: g.teaser || '', credit: g.credit || null, tracks: g.tracks });

export async function POST(req) {
  const auth = await verifyUser(req, undefined, NO_STORE);
  if (auth.response) return auth.response;
  let body = {};
  try { body = await req.json(); } catch {}

  if (body.action === 'report') {
    const id = text(body.id, 40);
    if (!/^[0-9a-f]{24}$/.test(id)) return NextResponse.json({ error: 'bad id' }, { status: 400, headers: NO_STORE });
    await db.collection('audio_reports').add({ guideId: id, uid: auth.uid, note: text(body.note, 500), createdAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  const lang = body.lang === 'en' ? 'en' : 'ko';
  const name = text(body.name, 80);
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400, headers: NO_STORE });
  const input = {
    name,
    query: text(body.query, 120),
    city: text(body.city, 60),
    category: text(body.category, 40),
    description: text(body.description, 400),
    lat: num(body.lat),
    lng: num(body.lng),
    lang,
  };
  const korea = input.lat != null && input.lng != null ? inKorea(input.lat, input.lng) : /korea|한국|서울|seoul|부산|busan|제주|jeju/i.test(input.city);
  const id = guideId(input);
  const ref = db.doc(`audio_guides/${id}`);

  try {
    const snap = await ref.get();
    const cached = snap.exists ? snap.data() : null;
    const recheck = cached && cached.source === 'ai' && korea && Date.now() - (cached.odiiCheckedAt || 0) > ODII_RECHECK_MS;
    if (cached && !recheck) return NextResponse.json(publicOf(id, cached), { headers: NO_STORE });

    // 1) 한국 장소: 관광공사 오디
    if (korea) {
      const odii = await findOdiiGuide({ names: [input.name, input.query], lat: input.lat, lng: input.lng, lang }).catch((err) => {
        console.warn('[audio-guide] odii failed:', String(err?.message || err).slice(0, 120));
        return null;
      });
      if (odii) {
        const guide = { source: 'odii', title: odii.title, teaser: '', tracks: odii.tracks, credit: 'kto', name, city: input.city, lang, createdAt: FieldValue.serverTimestamp() };
        await ref.set(guide);
        return NextResponse.json(publicOf(id, guide), { headers: NO_STORE });
      }
      if (cached) {
        await ref.update({ odiiCheckedAt: Date.now() });
        return NextResponse.json(publicOf(id, cached), { headers: NO_STORE });
      }
    }

    // 2) AI 해설
    if (!(await takeQuota(auth.uid))) return NextResponse.json({ error: 'daily limit' }, { status: 429, headers: NO_STORE });
    const ai = await createAiGuide(id, input);
    const guide = { source: 'ai', ...ai, name, city: input.city, lang, odiiCheckedAt: korea ? Date.now() : 0, createdAt: FieldValue.serverTimestamp() };
    await ref.set(guide);
    return NextResponse.json(publicOf(id, guide), { headers: NO_STORE });
  } catch (error) {
    console.error('[audio-guide] failed:', error);
    return NextResponse.json({ error: 'guide failed' }, { status: 500, headers: NO_STORE });
  }
}
