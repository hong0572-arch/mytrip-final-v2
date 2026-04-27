import {setGlobalOptions} from "firebase-functions";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({ maxInstances: 10 });

/**
 * 매일 오전 9시에 실행되어 사용자의 여행 D-Day 알림을 보냅니다.
 */
export const sendDailyDDayPush = onSchedule("0 9 * * *", async (event) => {
  const db = admin.firestore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

      if (!fcmToken || !startDateStr) return;

      // 2. D-Day 계산
      const startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
      
      const diffTime = startDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let messageBody = "";
      if (diffDays > 0) {
        messageBody = `✈️ '${tripTitle}' 여행이 ${diffDays}일 남았습니다! 설레는 마음으로 준비해볼까요? 🐾`;
      } else if (diffDays === 0) {
        messageBody = `🎉 드디어 오늘! '${tripTitle}' 여행이 시작되는 날입니다. 즐겁고 안전한 여행 되세요! ✈️`;
      } else {
        // 여행이 이미 시작된 경우 (D-1 이후는 알림 중단하거나 해제 로직 추가 가능)
        return;
      }

      // 3. FCM 발송
      const message = {
        notification: {
          title: "트립메이커 D-Day 알림",
          body: messageBody,
        },
        token: fcmToken,
        webpush: {
          notification: {
            icon: "https://mytrip2.pro/icon-192.png",
            click_action: "https://mytrip2.pro/mypage",
          },
        },
      };

      try {
        await admin.messaging().send(message);
        logger.info(`Notification sent to user ${userDoc.id} for trip ${tripTitle}`);
      } catch (error) {
        logger.error(`Failed to send notification to user ${userDoc.id}:`, error);
      }
    });

    await Promise.all(promises);
    logger.info("Daily D-Day push notification process completed.");
  } catch (error) {
    logger.error("Error in sendDailyDDayPush:", error);
  }
});
