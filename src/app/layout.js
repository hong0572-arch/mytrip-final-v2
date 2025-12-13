import "./globals.css";

// 1. OG 태그 (수동 설정과 동일한 효과)
// Next.js App Router에서는 이 방식이 '수동'의 정석입니다.
export const metadata = {
  // ✅ 도메인 주소 (필수! 이게 없으면 이미지가 깨집니다)
  metadataBase: new URL('https://mytrip2.pro'),

  title: "My Trip Pro - AI 맞춤 여행 가이드",
  description: "AI가 3초 만에 당신만을 위한 여행 계획을 짜드립니다.",

  // 오픈 그래프 (카톡/페이스북 공유용)
  openGraph: {
    title: "설레는 여행의 시작, My Trip Pro",
    description: "AI가 짜주는 나만의 맞춤 여행 계획표!",
    url: "https://mytrip2.pro",
    siteName: "My Trip Pro",
    images: [
      {
        // ⚠️ 중요: 파일명 앞에 도메인을 꼭 붙여서 '완전한 주소'로 적으세요.
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
  const GA_ID = "G-DC122J4LJL"; // 사장님 ID

  return (
    <html lang="ko">
      <head>
        {/* Next.js가 metadata를 여기에 자동으로 넣습니다. */}
      </head>

      <body className="antialiased bg-gray-50 text-gray-900">

        {/* 2. GA4 수동 설치 (Next.js 기능 끄고 생 HTML로 삽입) */}
        {/* 이렇게 하면 브라우저 차단 외에는 무조건 실행됩니다. */}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        ></script>

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