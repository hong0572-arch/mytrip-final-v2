import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { admin } from '../../../../lib/firebaseAdmin';
import { verifyUser } from '../../../../lib/verifyUser';

// 회원 탈퇴(개인정보보호법·구글 플레이 계정 삭제 요구). 로그인한 본인만, ID 토큰으로 확인한다.
// GET: 지워질 항목 미리 보기(숫자) · POST: 실제 삭제 { deleteFeeds: boolean }
// - 혼자 쓰는 일정은 지우고, 동행과 함께 쓰는 일정에서는 나만 빠진다(만든 사람이면 다음 멤버에게 넘긴다).
// - users/{uid}와 하위(포인트 내역·대화·일기·기억) · 안심 세션 · 보호자 초대(보낸·수락한) · 받은/보낸 요청 · 가격 알림 · (선택) 피드 글을 지운다.
// - 오디오 가이드 신고(audio_reports)·사용량(audio_usage), 내가 만든 공유 링크(shared_links.ownerUid)와 함께 쓰는 일정에 내가 만든 초대 링크도 지운다.
// - 마지막으로 Firebase 인증 계정을 지운다. (ownerUid가 없는 예전·비로그인 공유 링크는 남는다)
export const maxDuration = 60;
const db = admin.firestore();

async function collect(uid) {
  const [trips, sent, received, feeds, trackers, diaries, userSnap, invitesOwned, invitesAccepted, shareLinks, audioReports] = await Promise.all([
    db.collection('trips').where('memberIds', 'array-contains', uid).get(),
    db.collection('match_requests').where('senderId', '==', uid).get(),
    db.collection('match_requests').where('targetMateId', '==', uid).get(),
    db.collection('feeds').where('authorUid', '==', uid).get(),
    db.collection('flight_price_trackers').where('userId', '==', uid).get(),
    db.collection('users').doc(uid).collection('diaries').count().get(),
    db.collection('users').doc(uid).get(),
    db.collection('guardian_invites').where('ownerUid', '==', uid).get(),
    db.collection('guardian_invites').where('acceptedBy', '==', uid).get(),
    db.collection('shared_links').where('ownerUid', '==', uid).get(),
    db.collection('audio_reports').where('uid', '==', uid).get(),
  ]);
  const solo = trips.docs.filter((d) => (d.data().memberIds || []).length <= 1);
  const shared = trips.docs.filter((d) => (d.data().memberIds || []).length > 1);
  return { trips, solo, shared, sent, received, feeds, trackers, invites: [...invitesOwned.docs, ...invitesAccepted.docs], shareLinks: shareLinks.docs, audioReports: audioReports.docs, diaryCount: diaries.data().count, points: userSnap.exists ? userSnap.data().points || 0 : 0 };
}

export async function GET(req) {
  const auth = await verifyUser(req);
  if (auth.response) return auth.response;
  try {
    const c = await collect(auth.uid);
    return NextResponse.json({
      trips: c.solo.length,
      sharedTrips: c.shared.map((d) => d.data().tripTitle || d.data().destination || ''),
      diaries: c.diaryCount,
      points: c.points,
      feeds: c.feeds.size,
    });
  } catch (error) {
    console.error('[account/delete] summary failed:', error);
    return NextResponse.json({ error: 'summary failed' }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await verifyUser(req);
  if (auth.response) return auth.response;
  const uid = auth.uid;
  let deleteFeeds = false;
  try { ({ deleteFeeds = false } = await req.json()); } catch {}

  try {
    const c = await collect(uid);

    for (const d of c.solo) await db.recursiveDelete(d.ref);
    for (const d of c.shared) {
      const data = d.data();
      const remaining = (data.memberIds || []).filter((m) => m !== uid);
      const nextHost = data.hostId === uid || (!data.hostId && data.memberIds?.[0] === uid) ? remaining[0] || null : null;
      const update = {
        memberIds: FieldValue.arrayRemove(uid),
        membersInfo: (data.membersInfo || []).filter((m) => m?.uid !== uid),
        // 새로 넘겨받는 사람은 '함께 편집'이어야 한다
        viewerIds: (data.viewerIds || []).filter((v) => v !== uid && v !== nextHost),
      };
      if (nextHost) update.hostId = nextHost;
      await d.ref.update(update);
      const mine = await d.ref.collection('invites').where('createdBy', '==', uid).get();
      for (const inv of mine.docs) await inv.ref.delete();
    }

    const batchDelete = async (docs) => {
      for (let i = 0; i < docs.length; i += 400) {
        const batch = db.batch();
        docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    };
    await batchDelete([...c.sent.docs, ...c.received.docs, ...c.trackers.docs, ...c.invites, ...c.shareLinks, ...c.audioReports]);
    await db.collection('audio_usage').doc(uid).delete().catch(() => {});
    if (deleteFeeds) for (const d of c.feeds.docs) await db.recursiveDelete(d.ref);

    await db.collection('safemode_sessions').doc(uid).delete().catch(() => {});
    await db.recursiveDelete(db.collection('users').doc(uid));
    await admin.auth().deleteUser(uid);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[account/delete] failed:', error);
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }
}
