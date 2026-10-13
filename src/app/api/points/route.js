import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { admin } from '../../../lib/firebaseAdmin';
import { verifyUser } from '../../../lib/verifyUser';

// 포인트 적립은 서버만 한다(보안 규칙이 앱의 points 직접 수정을 막는다). 하루 한도도 여기서 지킨다.
// POST { action: 'checkin' | 'quiz' | 'feed' }
const db = admin.firestore();
const RULES = {
  checkin: { amount: 50, reason: '출석 체크', field: 'lastCheckInDate', daily: 1 },
  quiz: { amount: 200, reason: '일일 퀴즈 보상 (만점)', field: 'quizStats', daily: 1 }, // TravelQuiz와 같은 값
  feed: { amount: 100, reason: '여행 일정 피드 공유 (일일 보상)', field: 'lastFeedRewardDate', daily: 1 },
};

// 한국 시간 기준 오늘(YYYY-MM-DD)
const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export async function POST(req) {
  const auth = await verifyUser(req);
  if (auth.response) return auth.response;
  let action = '';
  try { ({ action } = await req.json()); } catch {}
  const rule = RULES[action];
  if (!rule) return NextResponse.json({ error: 'unknown action' }, { status: 400 });

  const userRef = db.collection('users').doc(auth.uid);
  const today = todayKst();
  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? snap.data() : {};
      if (rule.field === 'quizStats') {
        const stats = data.quizStats || {};
        const count = stats.date === today ? stats.count || 0 : 0;
        if (count >= rule.daily) return { awarded: 0, reason: 'limit' };
        tx.set(userRef, { points: FieldValue.increment(rule.amount), quizStats: { date: today, count: count + 1 } }, { merge: true });
      } else {
        if (data[rule.field] === today) return { awarded: 0, reason: 'already' };
        tx.set(userRef, { points: FieldValue.increment(rule.amount), [rule.field]: today }, { merge: true });
      }
      tx.create(userRef.collection('point_history').doc(), { reason: rule.reason, amount: rule.amount, createdAt: FieldValue.serverTimestamp() });
      return { awarded: rule.amount, points: (data.points || 0) + rule.amount };
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[points] failed:', error);
    return NextResponse.json({ error: 'points failed' }, { status: 500 });
  }
}
