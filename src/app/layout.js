import Script from "next/script";
import "./globals.css";

export const metadata = {
  // 1. 도메인 주소 설정 (이게 있어야 이미지가 잘 뜹니다)
  metadataBase: new URL('https://mytrip2.pro'),

  title: "My Trip Pro - AI 맞춤 여행 가이드",
  description: "어디로 떠날지 고민되시나요? AI가 3초 만에 당신만을 위한 숙소, 맛집, 여행 일정을 완벽하게 계획해 드립니다.",
  icons: {
    icon: "/logo.png", // 로고 파일이 있다면 사용
  },

  // 2. 카카오톡/SNS 공유 설정 (OG)
  openGraph: {
    title: "설레는 여행의 시작, My Trip Pro",
    description: "AI가 짜주는 나만의 맞춤 여행 계획표! 예산, 취향, 동선까지 한 번에 해결하세요.",
    url: "https://mytrip2.pro",
    siteName: "My Trip Pro",
    images: [
      {
        // ✅ 사장님이 알려주신 파일명 적용 완료!
        url: "https://mytrip2.pro/og-final.jpg",
        width: 1200,
        height: 630,
        alt: "My Trip Pro Preview",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900">

        {/* 3. 구글 애널리틱스 (GA4) 설치 - 사장님 ID 적용 완료 */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=G-DC122J4LJL`}
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-DC122J4LJL');
          `}
        </Script>

        {children}
      </body>
    </html>
  );
}