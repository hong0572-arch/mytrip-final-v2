import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { admin } from '../../../lib/firebaseAdmin';
import { verifyUser } from '../../../lib/verifyUser';

// 일정 동행 초대 참여. 일정 문서는 멤버만 읽고 멤버 명단은 만든 사람만 바꿀 수 있어서, 참여는 여기서만 처리한다.
// 두 가지 초대:
//  k=<tripId>.<32자 키> : 링크 초대(1회성·기간 제한). trips/{tripId}/invites/{key}
//                         { createdBy, maxUses(0=제한 없음), uses, role: 'edit'|'view', expiresAt(ms), revoked }
//  r=<요청 id>          : 앱 안에서 특정 사람에게 보낸 초대(match_requests, type 'workspace_invite'). 받은 사람만 쓸 수 있다.
// GET  ?k= | ?r=  : 참여 전 미리보기 — 일정 이름·날짜·초대한 사람·인원·남은 기간·권한만 돌려준다(r은 로그인 필요).
// POST {k} | {r}  : 참여(로그인 필요) — 확인·횟수 차감·멤버 추가를 트랜잭션으로 한 번에 처리한다.
const db = admin.firestore();
const NO_STORE = { 'Cache-Control': 'no-store' };
const closed = () => NextResponse.json({ status: 'closed' }, { status: 404, headers: NO_STORE });

function parse({ k, r }) {
  const m = /^([A-Za-z0-9]{10,40})\.([0-9a-f]{32})$/.exec(String(k || ''));
  if (m) return { kind: 'link', tripId: m[1], key: m[2] };
  if (/^[A-Za-z0-9]{10,40}$/.test(String(r || ''))) return { kind: 'request', requestId: String(r) };
  return null;
}

// 쓸 수 있는 링크 초대인지. 이유는 구분하지 않고 'closed'로만 알린다(키 추측에 단서를 주지 않음).
function usableLink(inv) {
  if (!inv || inv.revoked) return false;
  if (typeof inv.expiresAt === 'number' && inv.expiresAt < Date.now()) return false;
  if (inv.maxUses > 0 && (inv.uses || 0) >= inv.maxUses) return false;
  return true;
}

// 초대와 일정을 읽어 쓸 수 있는지 판단한다. get은 트랜잭션(tx.get) 또는 일반 읽기.
async function load(p, uid, get) {
  if (p.kind === 'link') {
    const invRef = db.doc(`trips/${p.tripId}/invites/${p.key}`);
    const tripRef = db.doc(`trips/${p.tripId}`);
    const [invSnap, tripSnap] = await Promise.all([get(invRef), get(tripRef)]);
    const inv = invSnap.exists ? invSnap.data() : null;
    if (!tripSnap.exists || !usableLink(inv)) return null;
    return {
      tripRef, trip: tripSnap.data(), role: inv.role === 'view' ? 'view' : 'edit', inviterUid: inv.createdBy,
      expiresAt: typeof inv.expiresAt === 'number' ? inv.expiresAt : null,
      remaining: inv.maxUses > 0 ? Math.max(0, inv.maxUses - (inv.uses || 0)) : null,
      markUsed: (tx) => tx.update(invRef, { uses: FieldValue.increment(1), lastUsedAt: FieldValue.serverTimestamp(), usedBy: FieldValue.arrayUnion(uid) }),
    };
  }
  const reqRef = db.doc(`match_requests/${p.requestId}`);
  const reqSnap = await get(reqRef);
  const req = reqSnap.exists ? reqSnap.data() : null;
  if (!req || req.type !== 'workspace_invite' || req.targetMateId !== uid || !req.tripId || !['pending', 'accepted'].includes(req.status)) return null;
  const tripRef = db.doc(`trips/${req.tripId}`);
  const tripSnap = await get(tripRef);
  // 보낸 사람이 아직 그 일정의 동행(편집 가능)이어야 한다.
  const trip = tripSnap.exists ? tripSnap.data() : null;
  if (!trip || !(trip.memberIds || []).includes(req.senderId) || (trip.viewerIds || []).includes(req.senderId)) return null;
  return {
    tripRef, trip, role: 'edit', inviterUid: req.senderId, expiresAt: null, remaining: null,
    markUsed: (tx) => tx.update(reqRef, { status: 'accepted', acceptedAt: FieldValue.serverTimestamp() }),
  };
}

export async function GET(req) {
  const params = new URL(req.url).searchParams;
  const p = parse({ k: params.get('k'), r: params.get('r') });
  if (!p) return closed();
  let uid = null;
  if (p.kind === 'request') {
    const auth = await verifyUser(req, undefined, NO_STORE);
    if (auth.response) return auth.response;
    uid = auth.uid;
  }
  try {
    const found = await load(p, uid, (ref) => ref.get());
    if (!found) return closed();
    const { trip } = found;
    const members = Array.isArray(trip.membersInfo) ? trip.membersInfo : [];
    const inviter = members.find((m) => m?.uid === (found.inviterUid || trip.hostId)) || members[0] || {};
    return NextResponse.json({
      status: 'open',
      tripId: found.tripRef.id,
      title: trip.tripTitle || trip.destination || '',
      destination: trip.destination || '',
      startDate: trip.startDate || null,
      endDate: trip.endDate || null,
      inviter: inviter.name || '',
      memberNames: members.map((m) => m?.name).filter(Boolean).slice(0, 4),
      memberCount: (trip.memberIds || []).length,
      role: found.role,
      expiresAt: found.expiresAt,
      remaining: found.remaining,
    }, { headers: NO_STORE });
  } catch (error) {
    console.error('[invites] preview failed:', error);
    return NextResponse.json({ error: 'preview failed' }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(req) {
  const auth = await verifyUser(req, undefined, NO_STORE);
  if (auth.response) return auth.response;
  let body = {};
  try { body = await req.json(); } catch {}
  const p = parse(body);
  if (!p) return closed();

  try {
    const user = await admin.auth().getUser(auth.uid);
    const result = await db.runTransaction(async (tx) => {
      const found = await load(p, auth.uid, (ref) => tx.get(ref));
      if (!found) return { status: 'closed' };
      const tripId = found.tripRef.id;
      if ((found.trip.memberIds || []).includes(auth.uid)) return { status: 'joined', tripId, already: true };

      const update = {
        memberIds: FieldValue.arrayUnion(auth.uid),
        membersInfo: FieldValue.arrayUnion({ uid: auth.uid, name: user.displayName || '', avatar: user.photoURL || '' }),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (found.role === 'view') update.viewerIds = FieldValue.arrayUnion(auth.uid);
      tx.update(found.tripRef, update);
      found.markUsed(tx);
      return { status: 'joined', tripId };
    });
    return NextResponse.json(result, { status: result.status === 'closed' ? 404 : 200, headers: NO_STORE });
  } catch (error) {
    console.error('[invites] accept failed:', error);
    return NextResponse.json({ error: 'accept failed' }, { status: 500, headers: NO_STORE });
  }
}
