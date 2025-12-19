import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { GoogleAnalytics } from '@next/third-parties/google';



// ✅ [핵심] Vercel 환경 변수 연결 (없으면 기본값 사용)
const SITE_TITLE = process.env.NEXT_PUBLIC_OG_TITLE || "My Trip Pro - AI 맞춤 여행 가이드";
const SITE_DESC = process.env.NEXT_PUBLIC_OG_DESC || "AI가 3초 만에 당신만을 위한 여행 계획을 짜드립니다.";
const SITE_IMAGE = process.env.NEXT_PUBLIC_OG_IMAGE || "https://mytrip2.pro/og-final.jpg";

export const metadata = {
  metadataBase: new URL('https://mytrip2.pro'),
  title: SITE_TITLE,
  description: SITE_DESC,
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

        {/* GA4 (구글 애널리틱스) */}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=G-DC122J4LJL`}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-DC122J4LJL');
            `,
          }}
        />

        {children}

        {/* Vercel 전용 도구 */}
        <SpeedInsights />
        <Analytics />

      </body>
    </html>
  );
}

