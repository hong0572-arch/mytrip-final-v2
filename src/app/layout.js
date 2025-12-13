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
  // ✅ 사장님 ID (여기서 수정 가능)
  const GA_ID = "G-DC122J4LJL";

  return (
    <html lang="ko">
      <head>
        {/* 1. 구글 스크립트 로드 (HTML 표준 방식) */}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        ></script>

        {/* 2. 구글 설정 코드 (HTML 강제 주입) */}
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
      </head>
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}