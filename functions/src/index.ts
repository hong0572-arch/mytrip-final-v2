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
            icon: "https://mytrip2.pro/icon-512.png", // 아이콘 고화질로 교체
            image: randomImage, // 안드로이드 알림창 하단에 크게 표시되는 배너 이미지
            badge: "https://mytrip2.pro/icon-192.png", // 상태바에 작게 표시되는 아이콘
            click_action: "https://mytrip2.pro/mypage",
            requireInteraction: true, // 알림이 자동으로 사라지지 않고 유지되도록 설정
            vibrate: [200, 100, 200]
          },
          fcmOptions: {
            link: "https://mytrip2.pro/mypage"
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
