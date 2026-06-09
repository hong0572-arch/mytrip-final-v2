import PushInitializer from '../components/PushInitializer';
import PortraitOnly from '../components/PortraitOnly';
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import AuthContext from "../components/AuthContext";
import GlobalSafeMode from '../components/GlobalSafeMode';

// ✅ 환경 변수 및 설정
const SITE_TITLE = process.env.NEXT_PUBLIC_OG_TITLE || "Trip Maker - 내 AI 여행 가이드";
const SITE_DESC = process.env.NEXT_PUBLIC_OG_DESC || "일본, 중국, 동남아시아, 미국, 미주, 호주, 아프리카, 유럽 여행 코스 짜기 어렵고 귀찮다면? AI가 바로 즉시 당신만을 위한 여행 계획을 짜드립니다.";
const SITE_IMAGE = process.env.NEXT_PUBLIC_OG_IMAGE || "https://tripmaker.tips/og-image.jpg";
const GA_ID = "G-DC122J4LJL";

// ✅ [PWA & Metadata] 설정
export const viewport = {
  themeColor: "#1E1E24",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // 안드로이드 15 전체 화면 대응
};

export const metadata = {
  metadataBase: new URL('https://tripmaker.tips'),
  title: {
    default: SITE_TITLE,
    template: `%s | Trip Maker`
  },
  description: SITE_DESC,
  verification: {
    google: "8nAcn09V6787EXe4NIVWp49LJ6Ot--3wsQMrB3EdHfA",
    naver: "your-naver-verification-code" // 네이버 서치어드바이저용 (필요시 교체)
  },
  manifest: "/manifest.json",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  alternates: {
    canonical: 'https://tripmaker.tips',
    languages: {
      'x-default': 'https://tripmaker.tips',
      'ko-KR': 'https://tripmaker.tips',
      'en-US': 'https://tripmaker.tips/?lang=en',
    },
  },
  keywords: ["AI Trip Maker", "AI 여행 계획", "AI 여행 코스", "AI 여행 일정", "여행 일정 짜기", "여행 코스", "AI 여행 코스", "트립메이커", "Trip Maker", "유럽 여행 코스", "아프리카 여행 코스",
    "미주 여행 코스", "일본 여행 코스", "중국 여행 코스", "오사카 일정", "호주 여행 코스", "남미 여행 코스", "중남미 여행 코스", "여행 플래너",
    "PWA Travel App", "AI Life Coach", "Vibe Planner"],
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESC,
    url: "https://tripmaker.tips",
    siteName: "Trip Maker",
    images: [{ url: SITE_IMAGE, width: 1200, height: 630, alt: "Trip Maker AI Travel Guide" }],
    locale: "ko_KR",
    alternateLocale: ["en_US"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [SITE_IMAGE],
  },
  other: {
    "geo.region": "KR",
    "geo.placename": "Seoul",
    "geo.position": "37.5665;126.9780",
    "ICBM": "37.5665, 126.9780",
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  }
};

// ✅ [최종 합본 레이아웃] 중복 없이 하나로 통합!
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900" suppressHydrationWarning>
        {/* 카카오 로그인을 위한 AuthContext가 가장 바깥에서 감싸줍니다. 
            그 안에 푸시 알림, GA, 콘텐츠(children)가 모두 들어갑니다.
        */}
        <AuthContext>
          {/* 📱 모바일 세로 모드 권장 오버레이 */}
          <PortraitOnly />

          {/* 🔔 푸시 알림 초기화 */}
          <PushInitializer />

          {/* 🛡️ 글로벌 Safe Mode 안심 시스템 */}
          <GlobalSafeMode />

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

          {/* 실제 페이지 내용 */}
          {children}

          {/* ✨ JSON-LD 구조화 데이터 추가 (SEO 최적화) */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "Trip Maker",
                "operatingSystem": "Android, iOS, Web",
                "applicationCategory": "TravelApplication",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "KRW"
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4.9",
                  "ratingCount": "1024"
                },
                "description": SITE_DESC,
                "url": "https://tripmaker.tips",
                "author": {
                  "@type": "Organization",
                  "name": "Trip Maker Team"
                }
              })
            }}
          />

          {/* Vercel 도구 */}
          <SpeedInsights />
          <Analytics />
        </AuthContext>
      </body>
    </html>
  );
}