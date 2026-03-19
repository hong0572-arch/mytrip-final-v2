import PushInitializer from '../components/PushInitializer';
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

// ✅ 환경 변수 및 설정
const SITE_TITLE = process.env.NEXT_PUBLIC_OG_TITLE || "Trip Maker - 내 AI 여행 가이드";
const SITE_DESC = process.env.NEXT_PUBLIC_OG_DESC || "일본, 중국, 동남아시아, 미국, 미주, 호주, 아프리카, 유럽 여행 코스 짜기 어렵고 귀찮다면? AI가 바로 즉시 당신만을 위한 여행 계획을 짜드립니다.";
const SITE_IMAGE = process.env.NEXT_PUBLIC_OG_IMAGE || "https://mytrip2.pro/og-final.jpg";
const GA_ID = "G-DC122J4LJL";

// ✅ [PWA & Metadata] 서버 컴포넌트에서만 가능
export const viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  metadataBase: new URL('https://mytrip2.pro'),
  title: SITE_TITLE,
  description: SITE_DESC,
  verification: { google: "8nAcn09V6787EXe4NIVWp49LJ6Ot--3wsQMrB3EdHfA" },
  manifest: "/manifest.json",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  alternates: { canonical: '/' },
  keywords: ["AI Trip Maker", "AI 여행 계획", "AI 여행 코스", "AI 여행 일정", "여행 일정 짜기", "여행 코스", "AI 여행 코스", "트립메이커", "Trip Maker", "유럽 여행 코스", "아프리카 여행 코스",
    "미주 여행 코스", "일본 여행 코스", "중국 여행 코스", "오사카 일정", "호주 여행 코스", "남미 여행 코스", "중남미 여행 코스", "여행 플래너",
    "월드컵", "월드컵 응원", "월드컵 코스"],
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESC,
    url: "https://mytrip2.pro",
    siteName: "Trip Maker",
    images: [{ url: SITE_IMAGE, width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
};

// ✅ [메인 레이아웃] 하나로 합친 최종 버전
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900" suppressHydrationWarning>
        {/* 🔔 푸시 알림 초기화 (클라이언트 컴포넌트) */}
        <PushInitializer />

        {/* GA4 (구글 애널리틱스) */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
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

        {/* Vercel 도구 */}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}