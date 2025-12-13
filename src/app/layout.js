import "./globals.css";

export const metadata = {
  metadataBase: new URL('https://mytrip2.pro'),
  title: "My Trip Pro - AI 맞춤 여행 가이드",
  description: "어디로 떠날지 고민되시나요? AI가 3초 만에 여행 계획을 짜드립니다.",
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
  const GA_ID = "G-DC122J4LJL";

  return (
    <html lang="ko">
      {/* head 태그는 Next.js에게 맡기고 비워둡니다 */}
      <head />

      <body className="antialiased bg-gray-50 text-gray-900">

        {/* ✅ 전략 수정: Body 태그 시작하자마자 스크립트 박아넣기 */}
        {/* 이러면 소스 보기에서 무조건 보입니다. */}
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
      </body>
    </html>
  );
}