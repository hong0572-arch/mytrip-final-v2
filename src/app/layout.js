import { SpeedInsights } from "@vercel/speed-insights/next";
// ✅ 공식 문서 권장: react 패키지에서 가져옵니다
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata = {
  metadataBase: new URL('https://mytrip2.pro'),
  title: "My Trip Pro - AI 맞춤 여행 가이드",
  description: "AI가 3초 만에 당신만을 위한 여행 계획을 짜드립니다.",
  icons: { icon: "/logo.png" },
  openGraph: {
    title: "설레는 여행의 시작, My Trip Pro",
    description: "AI가 짜주는 나만의 맞춤 여행 계획표!",
    url: "https://mytrip2.pro",
    siteName: "My Trip Pro",
    images: [{
      url: "https://mytrip2.pro/og-final.jpg",
      width: 1200,
      height: 630,
    }],
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  // 혹시 몰라 GA4 코드는 남겨둡니다 (보험용)
  const GA_ID = "G-DC122J4LJL";

  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900">

        {/* GA4 (보험용 - 차단될 수 있음) */}
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

        {/* ✅ Vercel 전용 도구들 (여기에 두면 무조건 작동합니다) */}
        <SpeedInsights />
        <Analytics />

      </body>
    </html>
  );
}