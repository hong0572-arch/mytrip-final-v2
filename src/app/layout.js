import Script from "next/script";
import "./globals.css";
import { Analytics } from '@vercel/analytics/react'; // 이거 하나 추가
// ...
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Analytics /> {/* 이거 한 줄 추가 */}
      </body>
    </html>
  );
}


export const metadata = {
  metadataBase: new URL('https://mytrip2.pro'),
  title: "My Trip Pro - AI 맞춤 여행 가이드",
  description: "AI가 3초 만에 당신만을 위한 여행 계획을 짜드립니다.",
  icons: { icon: "/logo.png" },
  openGraph: {
    title: "설레는 여행의 시작, My Trip Pro",
    description: "AI 여행 가이드와 함께 떠나보세요.",
    url: "https://mytrip2.pro",
    siteName: "My Trip Pro",
    images: [{ url: "https://mytrip2.pro/og-final.jpg", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900">

        {/* ✅ 전략 수정: body 태그 바로 밑에 심습니다 (가장 안전함) */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=G-DC122J4LJL`} // 👈 1. 여기에 ID 넣기
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-DC122J4LJL'); // 👈 2. 여기에 ID 넣기
          `}
        </Script>

        {children}
      </body>
    </html>
  );
}