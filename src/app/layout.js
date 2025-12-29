import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
// import { GoogleAnalytics } from '@next/third-parties/google'; // 안 쓰시면 삭제하셔도 됩니다.

// ✅ [핵심] Vercel 환경 변수 연결 (없으면 기본값 사용)
const SITE_TITLE = process.env.NEXT_PUBLIC_OG_TITLE || "My Trip Pro - AI 맞춤 여행 가이드";
const SITE_DESC = process.env.NEXT_PUBLIC_OG_DESC || "AI가 3초 만에 당신만을 위한 여행 계획을 짜드립니다.";
const SITE_IMAGE = process.env.NEXT_PUBLIC_OG_IMAGE || "https://mytrip2.pro/og-final.jpg";

// ✅ [PWA 추가 1] 뷰포트 & 테마 컬러 설정 (모바일 앱 느낌)
export const viewport = {
  themeColor: "#4f46e5", // 안드로이드 상단바 색상 (보라색 계열)
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,   // 확대/축소 방지 (앱처럼 보이게)
};

export const metadata = {
  // 1. 실제 도메인 주소 설정
  metadataBase: new URL('https://mytrip2.pro'),

  title: SITE_TITLE,
  description: SITE_DESC,

  // ✅ [PWA 추가 2] 매니페스트 및 아이콘 연결
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png", // 아이폰 홈 화면 아이콘
  },

  // 구글 중복 문제 해결을 위한 표준 URL 설정
  alternates: {
    canonical: '/',
  },

  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESC,
    url: "https://mytrip2.pro",
    siteName: "My Trip Pro",
    images: [{
      url: SITE_IMAGE,
      width: 1200,
      height: 630,
    }],
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  const GA_ID = "G-DC122J4LJL";

  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900">

        {/* GA4 (구글 애널리틱스) - 기존 유지 */}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `,
          }}
        />

        {children}

        {/* Vercel 전용 도구 - 기존 유지 */}
        <SpeedInsights />
        <Analytics />

      </body>
    </html>
  );
}