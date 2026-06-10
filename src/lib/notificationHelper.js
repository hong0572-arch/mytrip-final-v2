import { Capacitor } from '@capacitor/core';

// 🔔 알림 권한 획득 요청
export async function requestNotificationPermission() {
  if (typeof window === 'undefined') return false;

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const perm = await LocalNotifications.requestPermissions();
      return perm.display === 'granted';
    } catch (e) {
      console.error('❌ Native Notification Permission Request Error:', e);
      return false;
    }
  } else {
    // 🌐 Web 환경
    if (!('Notification' in window)) {
      console.warn('이 브라우저는 데스크톱 알림을 지원하지 않습니다.');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.error('❌ Web Notification Permission Request Error:', e);
      return false;
    }
  }
}

// 🔔 즉시 알림 발송
export async function sendLocalNotification(title, body, notificationId = Math.floor(Math.random() * 10000)) {
  if (typeof window === 'undefined') return false;

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      // 권한 재확인
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return false;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 500) }, // 0.5초 후 즉시 실행
            sound: 'beep.wav',
            actionTypeId: '',
            extra: null
          }
        ]
      });
      return true;
    } catch (e) {
      console.error('❌ Native Local Notification Error:', e);
      return false;
    }
  } else {
    // 🌐 Web 브라우저 환경
    if (!('Notification' in window)) return false;

    if (Notification.permission === 'granted') {
      new Notification(title, { body: body, icon: '/logo1.png' });
      return true;
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body: body, icon: '/logo1.png' });
        return true;
      }
    }
    return false;
  }
}

// 🔔 예약 알림 발송 (초 단위 지연)
export async function sendScheduledNotification(title, body, delaySeconds = 3, notificationId = Math.floor(Math.random() * 10000)) {
  if (typeof window === 'undefined') return false;

  const isNative = Capacitor.isNativePlatform();
  const triggerTime = new Date(Date.now() + delaySeconds * 1000);

  if (isNative) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: notificationId,
            schedule: { at: triggerTime },
            sound: 'beep.wav'
          }
        ]
      });
      return true;
    } catch (e) {
      console.error('❌ Native Scheduled Notification Error:', e);
      return false;
    }
  } else {
    // Web 브라우저에서는 setTimeout으로 시뮬레이션
    setTimeout(() => {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: body, icon: '/logo1.png' });
      } else {
        console.log(`[Web Alert Fallback] ${title}: ${body}`);
      }
    }, delaySeconds * 1000);
    return true;
  }
}
