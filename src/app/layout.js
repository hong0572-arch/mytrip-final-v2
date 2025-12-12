import "./globals.css";

// ✅ 메타데이터 설정 (검색엔진 & SNS 공유용)
export const metadata = {
  metadataBase: new URL('https://mytrip2.pro'), // 사장님 도메인
  title: "My Trip Pro - AI 맞춤 여행 가이드",
  description: "어디로 떠날지 고민되시나요? AI가 3초 만에 당신만을 위한 숙소, 맛집, 여행 일정을 완벽하게 계획해 드립니다.",
  icons: {
    icon: "/logo.png", // 파비콘
  },
  openGraph: {
    title: "설레는 여행의 시작, MyTrip.Pro",
    description: "AI가 짜주는 나만의 맞춤 여행 계획표! 예산, 취향, 동선까지 한 번에 해결하세요.",
    url: "https://mytrip2.pro",
    siteName: "MyTrip.Pro",
    images: [
      {
        url: "/og-image.png", // 👈 방금 넣으신 그 파일입니다!
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
    title: "MyTrip.Pro - AI 여행 플래너",
    description: "복잡한 여행 계획, 이제 AI에게 맡기세요.",
    images: ["/og-image.png"], // 👈 트위터용 이미지도 동일하게 설정
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}