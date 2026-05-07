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
      if (diffDays > 0) {
        messageBody = `✈️ '${tripTitle}' 여행이 ${diffDays}일 남았습니다! 설레는 마음으로 준비해볼까요? 🐾`;
      } else if (diffDays === 0) {
        messageBody = `🎉 드디어 오늘! '${tripTitle}' 여행이 시작되는 날입니다. 즐겁고 안전한 여행 되세요! ✈️`;
      } else {
        // 여행이 이미 시작된 경우
        return;
      }

      // 4. FCM 발송
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
