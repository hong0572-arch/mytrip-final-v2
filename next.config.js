/** @type {import('next').NextConfig} */

// 1. PWA 설정 (가져오기 및 설정)
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

// 2. 통합 설정 (환경변수 + CORS + 튕김방지)
const nextConfig = {
  reactStrictMode: true,

  // ✨ 핵심: 앱 환경에서 상세 페이지 진입 시 튕기는 현상을 막아줍니다.
  trailingSlash: true,

  // ✨ TWA/PWA 최적화: 앱 환경에서는 Next.js 서버 이미지 최적화가 안 되므로 끕니다.
  images: {
    unoptimized: true,
  },

  // ✨ 정적 내보내기 설정 (Capacitor 빌드할 때만 'export' 활성화, 웹 배포 시에는 API 라우트 사용을 위해 비활성화)
  output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,

  // 모든 환경 변수 유지
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  },


};

// 3. PWA 설정으로 감싸서 최종 내보내기 (중복 선언 없음!)
module.exports = withPWA(nextConfig);