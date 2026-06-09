import type { CapacitorConfig } from '@capacitor/cli';

const config: any = {
  appId: "pro.mytrip2.twa",
  appName: "Trip Maker",
  webDir: "out",

  server: {
    // ✨ 중요: 안드로이드 보안 정책 및 파이어베이스(Firestore) 연결 안정성을 위해 https 권장
    androidScheme: "https",

    // 구글 로그인 및 외부 서비스 연동을 위한 허용 도메인
    allowNavigation: [
      "tripmaker.tips",
      "*.tripmaker.tips",
      "*.firebaseapp.com",
      "*.google.com",
      "accounts.google.com"
    ]
  },

  plugins: {
    // 1. 구글 네이티브 로그인 설정
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "817442711390-3l23qcluqvqdfpr7jadmjfutrfe0q7b4.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },

    // 2. 네이티브 스플래시 제어 (0초로 설정하여 Next.js 스플래시로 바로 연결)
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },

    // 3. AI 및 외부 API 통신 (CORS 에러를 네이티브 단에서 해결)
    CapacitorHttp: {
      enabled: false,
      // ✨ 아래 설정을 추가하여 파이어베이스 통신은 네이티브가 건드리지 않게 합니다.
      ignoredUrls: [
        "firestore.googleapis.com",
        "firebaseinstallations.googleapis.com",
        "identitytoolkit.googleapis.com",
        "securetoken.googleapis.com",
        "analytics.google.com",
        "firebaselogging-pa.googleapis.com",
        "firebase.google.com"
      ],
    },
  }
};

export default config;