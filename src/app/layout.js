import { GoogleAnalytics } from '@next/third-parties/google'; // 👈 이거 추가됨
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
        url: "https://mytrip2.pro/thumb-v2.png",
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
    images: ["https://mytrip2.pro/thumb-v2.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
        {/* 👇 여기에 사장님의 G-코드를 넣어주세요! */}
        <GoogleAnalytics gaId="G-DC122J4LJL" />
      </body>
    </html>
  );
}