/** @type {import('next').NextConfig} */

// 1. PWA 설정 (가져오기 및 설정)
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  // 기본 캐시 규칙에 아래 규칙을 앞에 덧붙인다(여행 중 오프라인 대비)
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // 들은 오디오 가이드(MP3)는 기기에 남겨 둔다. 재생 위치 이동(Range 요청)도 캐시에서 처리
      {
        urlPattern: ({ url }) => url.hostname === "firebasestorage.googleapis.com" && url.pathname.includes("audio-guides"),
        handler: "CacheFirst",
        options: {
          cacheName: "tm-audio-guides",
          expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 60 },
          cacheableResponse: { statuses: [0, 200] },
          rangeRequests: true,
        },
      },
      // 일정 화면(/trip/?id=…)은 id가 달라도 같은 화면이라, 오프라인이면 한 번이라도 연 화면을 쓴다
      {
        urlPattern: ({ request, url }) => request.mode === "navigate" && /^\/(trip|trips|safety|chat)\/?$/.test(url.pathname),
        handler: "NetworkFirst",
        options: {
          cacheName: "tm-app-pages",
          networkTimeoutSeconds: 4,
          matchOptions: { ignoreSearch: true },
          expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
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

  // ✨ Next.js 16 Turbopack 호환 설정
  turbopack: {},

};

// 3. PWA 설정으로 감싸서 최종 내보내기 (중복 선언 없음!)
module.exports = withPWA(nextConfig);