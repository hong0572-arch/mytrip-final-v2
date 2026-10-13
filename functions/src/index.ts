import {setGlobalOptions} from "firebase-functions";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({ maxInstances: 10 });

/**
 * 매일 오전 9시에 실행되어 사용자의 여행 D-Day 알림을 보냅니다.
 */
export const sendDailyDDayPush = onSchedule("0 * * * *", async (event) => {
  const db = admin.firestore();
  const now = new Date(); // 현재 UTC 시간

  try {
    // 1. D-Day 알림 설정이 된 모든 사용자 조회
    const usersSnapshot = await db.collection("users")
      .where("dDayTripId", "!=", null)
      .get();

    logger.info(`Found ${usersSnapshot.size} users with D-Day notifications set.`);

    const promises = usersSnapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;
      const startDateStr = userData.dDayStartDate;
      const tripTitle = userData.dDayTripTitle || "여행";
      const userTimezone = userData.timezone || "Asia/Seoul"; // 기본값 KST

      if (!fcmToken || !startDateStr) return;

      // 2. 사용자의 로컬 시간 확인
      let userHour = 0;
      let userToday = now;
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimezone,
          hour: 'numeric',
          hour12: false,
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        });
        const parts = formatter.formatToParts(now);
        const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
        
        userHour = parseInt(getPart('hour'), 10);
        // hour24 format can return 24 for midnight, adjust if needed (though we only check for 9)
        if (userHour === 24) userHour = 0;
        
        userToday = new Date(
          parseInt(getPart('year'), 10),
          parseInt(getPart('month'), 10) - 1,
          parseInt(getPart('day'), 10)
        );
      } catch (e) {
        logger.error(`Invalid timezone ${userTimezone} for user ${userDoc.id}`);
        return;
      }

      // 사용자 시간 기준으로 오전 9시인 경우에만 발송
      if (userHour !== 9) return;

      // 3. D-Day 계산
      // startDateStr은 보통 'YYYY-MM-DD' 형식
      const startDateParts = startDateStr.split('-');
      if (startDateParts.length !== 3) return;

      const tripDateLocal = new Date(
        parseInt(startDateParts[0]), 
        parseInt(startDateParts[1]) - 1, 
        parseInt(startDateParts[2])
      );
      
      const diffTime = tripDateLocal.getTime() - userToday.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let messageBody = "";
      let title = "";
      // 다양한 고화질 여행 이미지 배열 (랜덤 선택)
      const bannerImages = [
        "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1200&auto=format&fit=crop", // 비행기 날개
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop", // 예쁜 해변
        "https://images.unsplash.com/photo-1522083111333-6623fccb9c7b?q=80&w=1200&auto=format&fit=crop", // 여행 캐리어
        "https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=1200&auto=format&fit=crop"  // 구름 여행
      ];
      const randomImage = bannerImages[Math.floor(Math.random() * bannerImages.length)];

      if (diffDays > 0) {
        title = `✈️ '${tripTitle}' D-${diffDays}`;
        messageBody = `여행이 ${diffDays}일 남았습니다!\n어떤 옷을 챙길지, 일정은 잘 짜여 있는지 미리 확인해볼까요? 😉`;
      } else if (diffDays === 0) {
        title = `🎉 드디어 오늘! '${tripTitle}'`;
        messageBody = `기다리던 여행이 시작되는 날입니다.\n여권과 지갑을 꼭 챙기시고 안전하고 즐거운 여행 되세요! ✈️`;
      } else {
        // 여행이 이미 시작된 경우
        return;
      }

      // 4. FCM 발송 (Rich Push Notification 디자인 강화)
      const message = {
        notification: {
          title: title,
          body: messageBody,
        },
        token: fcmToken,
        webpush: {
          notification: {
            icon: "https://tripmaker.tips/icon-512.png", // 아이콘 고화질로 교체
            image: randomImage, // 안드로이드 알림창 하단에 크게 표시되는 배너 이미지
            badge: "https://tripmaker.tips/icon-192.png", // 상태바에 작게 표시되는 아이콘
            click_action: "https://tripmaker.tips/mypage",
            requireInteraction: true, // 알림이 자동으로 사라지지 않고 유지되도록 설정
            vibrate: [200, 100, 200]
          },
          fcmOptions: {
            link: "https://tripmaker.tips/mypage"
          }
        },
      };

      try {
        await admin.messaging().send(message);
        logger.info(`Notification sent to user ${userDoc.id} for trip ${tripTitle} in timezone ${userTimezone}`);
      } catch (error) {
        logger.error(`Failed to send notification to user ${userDoc.id}:`, error);
      }
    });

    await Promise.all(promises);
    logger.info("Hourly D-Day push notification process completed.");
  } catch (error) {
    logger.error("Error in sendDailyDDayPush:", error);
  }
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
