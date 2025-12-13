import Script from "next/script";
import "./globals.css";

export const metadata = {
  metadataBase: new URL('https://mytrip2.pro'),
  title: "My Trip Pro",
  description: "AI 여행 가이드",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }) {
  const GA_ID = "G-DC122J4LJL";

  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}

        {/* 1. 구글 스크립트 로드 (차단될 수 있음) */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        />

        {/* 2. 안전장치: dataLayer가 없어도 에러 안 나게 설정 */}
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            // 여기서 변수를 무조건 먼저 만듭니다.
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}