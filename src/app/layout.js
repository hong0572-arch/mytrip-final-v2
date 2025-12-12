import Script from "next/script";
import "./globals.css";

// ✅ 메타데이터 (SEO & OG 썸네일)
export const metadata = {
  metadataBase: new URL('https://mytrip2.pro'),
  title: "My Trip Pro - AI 맞춤 여행 가이드",
  description: "어디로 떠날지 고민되시나요? AI가 3초 만에 당신만을 위한 숙소, 맛집, 여행 일정을 완벽하게 계획해 드립니다.",
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "설레는 여행의 시작, My Trip Pro",
    description: "AI가 짜주는 나만의 맞춤 여행 계획표! 예산, 취향, 동선까지 한 번에 해결하세요.",
    url: "https://mytrip2.pro",
    siteName: "My Trip Pro",
    images: [
      {
        // ⚠️ public 폴더에 있는 파일명과 똑같아야 합니다!
        url: "https://mytrip2.pro/og-image.jpg",
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

        {/* ✅ Google Analytics (가장 안전한 수동 설치 방식) */}
        {/* ID가 없으면 그냥 두셔도 에러는 안 납니다. */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=G-DC122J4LJL`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
        >
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