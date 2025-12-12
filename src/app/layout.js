import Script from "next/script"; // 👈 여기 주목! next/script를 씁니다.
import "./globals.css";

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
        url: "https://mytrip2.pro/og-final.jpg",
        width: 1200,
        height: 630,
        alt: "My Trip Pro Preview",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Trip Pro - AI 여행 플래너",
    description: "복잡한 여행 계획, 이제 AI에게 맡기세요.",
    images: ["https://mytrip2.pro/og-final.jpg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* ✅ 구글 애널리틱스 수동 설치 (Head 안에 직접 심기) */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=G-DC122J4LJL`} // 👈 여기에 사장님 ID 넣으세요!
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-DC122J4LJL'); // 👈 여기도 사장님 ID 넣으세요! (총 2군데)
          `}
        </Script>
      </head>
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}