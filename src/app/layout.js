import { SpeedInsights } from "@vercel/speed-insights/next"; // ✅ 추가하신 부분
import "./globals.css";

// 1. 메타데이터 & OG 태그 (Next.js 표준 방식)
export const metadata = {
  metadataBase: new URL('https://mytrip2.pro'), // 도메인 필수
  title: "My Trip Pro - AI 맞춤 여행 가이드",
  description: "AI가 3초 만에 당신만을 위한 여행 계획을 짜드립니다.",
  icons: { icon: "/logo.png" },

  openGraph: {
    title: "설레는 여행의 시작, My Trip Pro",
    description: "AI가 짜주는 나만의 맞춤 여행 계획표!",
    url: "https://mytrip2.pro",
    siteName: "My Trip Pro",
    images: [
      {
        url: "https://mytrip2.pro/og-final.jpg", // public 폴더에 있는 이미지
        width: 1200,
        height: 630,
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  // 사장님 GA4 ID
  const GA_ID = "G-DC122J4LJL";

  return (
    <html lang="ko">
      <head>
        {/* Next.js가 metadata를 여기에 넣습니다. */}
      </head>

      <body className="antialiased bg-gray-50 text-gray-900">

        {/* 2. GA4 수동 설치 (body 시작하자마자 강제 주입) */}
        {/* 브라우저 차단 외에는 무조건 실행되는 '생 HTML' 방식 */}
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

        {/* 3. 페이지 내용 */}
        {children}

        {/* 4. SpeedInsights (방금 추가하신 것 - 여기에 넣어야 작동합니다) */}
        <SpeedInsights />

      </body>
    </html>
  );
}