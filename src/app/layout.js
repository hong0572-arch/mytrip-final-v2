import "./globals.css";
// 방금 만든 부품 가져오기
import GoogleAnalytics from "../components/GoogleAnalytics";

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
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}

        {/* ✅ 여기에 부품 조립! (매우 깔끔) */}
        <GoogleAnalytics />

      </body>
    </html>
  );
}