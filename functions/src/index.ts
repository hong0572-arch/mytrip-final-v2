import {setGlobalOptions} from "firebase-functions";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({ maxInstances: 10 });

/**
 * 여행 출발 알림(매시 정각). 그 사람의 시간대 기준으로
 *  - D-7 오전 9시: 일주일 남았어요(숙소·환전·보험 점검)
 *  - D-1 저녁 7시: 내일 출발(체크리스트·안심 귀가·오프라인 준비)
 *  - D-day 오전 8시: 오늘 출발
 * 대상: trips.startDate('YYYY-MM-DD')가 해당 날짜인 일정의 동행 중 users/{uid}.notifyTrips === true 이고 fcmToken이 있는 사람.
 * 같은 알림은 reminder_log/{tripId}_{uid}_{kind}로 한 번만 보낸다(서버 전용 컬렉션).
 * 예전 sendDailyDDayPush(설정한 사람에게 매일 D-n 발송)를 대신한다.
 */
const REMIND = [
  { kind: "d7", daysBefore: 7, hour: 9 },
  { kind: "d1", daysBefore: 1, hour: 19 },
  { kind: "d0", daysBefore: 0, hour: 8 },
] as const;

const REMIND_TEXT = {
  ko: {
    d7: (t: string) => ({ title: `✈️ ${t}까지 일주일`, body: "숙소 위치, 환전, 여행자 보험을 한 번 점검해 볼까요?" }),
    d1: (t: string) => ({ title: `🧳 내일 ${t}로 떠나요`, body: "여권·충전기·상비약을 챙기고, 일정과 해설은 미리 한 번 열어 두면 오프라인에서도 볼 수 있어요." }),
    d0: (t: string) => ({ title: `🎉 오늘 ${t} 여행 시작!`, body: "늦은 시간 이동이 있다면 안심 귀가를 켜 두세요. 즐거운 여행 되세요." }),
    trip: "여행",
  },
  en: {
    d7: (t: string) => ({ title: `✈️ One week until ${t}`, body: "A good time to check your stay, currency and travel insurance." }),
    d1: (t: string) => ({ title: `🧳 You leave for ${t} tomorrow`, body: "Pack your passport, charger and meds. Open your itinerary and guides once so they work offline." }),
    d0: (t: string) => ({ title: `🎉 Your ${t} trip starts today!`, body: "Moving around late? Turn on safe return. Have a great trip." }),
    trip: "your trip",
  },
};

// 시간대별 지금 시각·오늘 날짜
function localNow(timeZone: string, now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "0";
  const hour = Number(get("hour")) % 24;
  return { hour, date: `${get("year")}-${get("month")}-${get("day")}` };
}
const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
};
const shortPlace = (trip: admin.firestore.DocumentData) =>
  String(trip.destination || trip.tripTitle || "").split(/[,#(]/)[0].trim().slice(0, 24);

export const sendTripReminders = onSchedule({ schedule: "0 * * * *", timeoutSeconds: 120, memory: "256MiB" }, async () => {
  const db = admin.firestore();
  const now = new Date();
  // UTC 기준 어제~모레 사이 날짜면 세계 어느 시간대든 해당 날짜를 포함한다
  const utcToday = now.toISOString().slice(0, 10);
  const candidates = new Set<string>();
  for (const r of REMIND) for (const off of [-1, 0, 1]) candidates.add(addDays(utcToday, off + r.daysBefore));
  const tripsSnap = await db.collection("trips").where("startDate", "in", [...candidates]).get();
  if (tripsSnap.empty) return;

  const userCache = new Map<string, admin.firestore.DocumentSnapshot>();
  const getUser = async (uid: string) => {
    if (!userCache.has(uid)) userCache.set(uid, await db.collection("users").doc(uid).get());
    return userCache.get(uid)!;
  };
  let sent = 0;

  for (const tripDoc of tripsSnap.docs) {
    const trip = tripDoc.data();
    const members: string[] = Array.isArray(trip.memberIds) ? trip.memberIds : [];
    for (const uid of members) {
      const user = await getUser(uid);
      if (!user.exists || user.get("notifyTrips") !== true) continue;
      const token = user.get("fcmToken");
      if (!token) continue;
      let local;
      try { local = localNow(user.get("timezone") || "Asia/Seoul", now); } catch { local = localNow("Asia/Seoul", now); }
      const rule = REMIND.find((r) => r.hour === local.hour && addDays(local.date, r.daysBefore) === trip.startDate);
      if (!rule) continue;

      // 한 번만 보내기
      try {
        await db.collection("reminder_log").doc(`${tripDoc.id}_${uid}_${rule.kind}`).create({ tripId: tripDoc.id, uid, kind: rule.kind, at: admin.firestore.FieldValue.serverTimestamp() });
      } catch {
        continue; // 이미 보냄
      }
      const t = REMIND_TEXT[user.get("language") === "en" ? "en" : "ko"];
      const { title, body } = t[rule.kind](shortPlace(trip) || t.trip);
      const link = `https://tripmaker.tips/trip/?id=${tripDoc.id}`;
      try {
        await admin.messaging().send({
          token,
          notification: { title, body },
          data: { link },
          webpush: { notification: { icon: "https://tripmaker.tips/icon-192.png", badge: "https://tripmaker.tips/icon-192.png" }, fcmOptions: { link } },
        });
        sent += 1;
      } catch (error: unknown) {
        const code = (error as { code?: string })?.code || "";
        // 더 이상 쓰지 않는 토큰은 지운다(다음 로그인 때 새로 받는다)
        if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
          await user.ref.update({ fcmToken: admin.firestore.FieldValue.delete() }).catch(() => {});
        }
        logger.warn(`trip reminder failed ${tripDoc.id}/${uid}`, code);
      }
    }
  }
  logger.info(`trip reminders: ${tripsSnap.size} trip(s) checked, ${sent} sent`);
});

/**
 * 안심 귀가 서버 감시(1분마다).
 * 이용자 휴대폰에서 앱이 닫혀 있으면 앱이 경보를 낼 수 없으므로, 서버가 약속 시간 + 유예(1분) + 여유(1분)가
 * 지난 'active' 세션을 찾아 'expired'로 바꾸고 보호자에게 앱 알림(match_requests)과 푸시를 보낸다.
 * 이용자에게도 '도착했나요?' 푸시를 보낸다. 이용자 앱이 열려 있으면 앱이 먼저 처리하므로 보통은 할 일이 없다.
 * 전화번호 보호자는 문자 발송 수단이 없어 서버가 알릴 수 없다(앱이 열릴 때 문자 화면을 띄운다).
 */
const SAFE_GRACE_MS = 60 * 1000;
const SAFE_SLACK_MS = 60 * 1000;

const SAFE_TEXT = {
  ko: {
    guardianTitle: (n: string) => `🚨 ${n}님에게 연락해 주세요`,
    guardianBody: "안심 귀가 약속 시간이 지났어요. 실시간 위치를 확인해 주세요.",
    wardTitle: "도착했나요?",
    wardBody: "약속 시간이 지나 보호자에게 알렸어요. 안전하면 앱에서 '안전해요'를 눌러 주세요.",
    inbox: (n: string) => `🚨 ${n}님의 안심 귀가 약속 시간이 지났어요. 바로 연락해 주세요.`,
    traveler: "여행자",
  },
  en: {
    guardianTitle: (n: string) => `🚨 Please contact ${n}`,
    guardianBody: "They missed their safe-return time. Check their live location.",
    wardTitle: "Did you arrive?",
    wardBody: "Your guardians were alerted because you missed your arrival time. Tap \"I'm safe\" in the app if you're OK.",
    inbox: (n: string) => `🚨 ${n} missed their safe-return time. Please contact them now.`,
    traveler: "Traveler",
  },
};

export const checkExpiredSafeSessions = onSchedule({ schedule: "every 1 minutes", timeoutSeconds: 60, memory: "256MiB" }, async () => {
  const db = admin.firestore();
  const now = Date.now();
  const cutoff = now - SAFE_GRACE_MS - SAFE_SLACK_MS;

  // 진행 중 세션은 많지 않으므로 상태로만 찾고 시간은 코드에서 거른다(복합 색인 불필요)
  const snap = await db.collection("safemode_sessions").where("status", "==", "active").get();
  const due = snap.docs.filter((d) => typeof d.get("endTime") === "number" && d.get("endTime") <= cutoff);
  if (!due.length) return;

  await Promise.all(due.map(async (docSnap) => {
    const data = docSnap.data();
    const uid = docSnap.id;
    // 다른 실행·앱과 겹치지 않게 트랜잭션으로 한 번만 바꾼다
    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(docSnap.ref);
      if (!fresh.exists || fresh.get("status") !== "active" || (fresh.get("endTime") || 0) > cutoff) return false;
      tx.update(docSnap.ref, { status: "expired", alertedBy: "server", alertedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return true;
    });
    if (!claimed) return;

    const t = SAFE_TEXT[data.language === "en" ? "en" : "ko"];
    const name = data.userName || t.traveler;
    const guardians: string[] = Array.from(new Set([...(data.guardianUserIds || []), data.guardianUserId].filter(Boolean)));
    const live = data.shareToken ? `https://tripmaker.tips/share/live_safemode?u=${encodeURIComponent(uid)}&t=${data.shareToken}` : "https://tripmaker.tips/safety";

    const push = async (targetUid: string, title: string, body: string, link: string) => {
      const user = await db.collection("users").doc(targetUid).get();
      const token = user.get("fcmToken");
      if (!token) return;
      try {
        await admin.messaging().send({
          token,
          notification: { title, body },
          webpush: {
            notification: { icon: "https://tripmaker.tips/icon-192.png", requireInteraction: true, vibrate: [300, 100, 300, 100, 300] },
            fcmOptions: { link },
          },
          android: { priority: "high" },
        });
      } catch (error) {
        logger.warn(`safe-return push failed for ${targetUid}`, error);
      }
    };

    await Promise.all(guardians.map(async (g) => {
      await db.collection("match_requests").add({
        type: "safemode_expired", senderId: uid, senderName: name, targetMateId: g, status: "pending",
        message: t.inbox(name), sessionUrl: live.replace("https://tripmaker.tips", ""), createdAt: admin.firestore.FieldValue.serverTimestamp(), bySystem: true,
      });
      await push(g, t.guardianTitle(name), t.guardianBody, live);
    }));
    await push(uid, t.wardTitle, t.wardBody, "https://tripmaker.tips/safety");
    logger.info(`safe-return expired by server: ${uid} → ${guardians.length} guardian(s)`);
  }));
});
