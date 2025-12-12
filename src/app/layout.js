import Script from "next/script";
import "./globals.css";

// ⚠️ 사장님 ID 입력 필수 (예: G-A1B2C3D4E5)
const GA_ID = "G-DC122J4LJL";

export const metadata = {
  metadataBase: new URL('https://mytrip2.pro'),
  title: "My Trip Pro - AI 맞춤 여행 가이드",
  description: "AI가 3초 만에 당신만을 위한 숙소, 맛집, 여행 일정을 완벽하게 계획해 드립니다.",
  icons: { icon: "/logo.png" },
  openGraph: {
    title: "설레는 여행의 시작, My Trip Pro",
    description: "복잡한 계획은 AI에게 맡기고 떠나세요!",
    url: "https://mytrip2.pro",
    siteName: "My Trip Pro",
    images: [{
      url: "https://mytrip2.pro/og-finaljpg", // 1단계에서 넣은 파일명
      width: 1200,
      height: 634,
    }],
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900">

        {/* 구글 애널리틱스 (강제 주입 방식) */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>

        {children}
      </body>
    </html>
  );
}