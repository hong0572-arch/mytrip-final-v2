import { GoogleAnalytics } from '@next/third-parties/google' // 👈 공식 플러그인 가져오기
import "./globals.css";

export const metadata = {
  metadataBase: new URL('https://mytrip2.pro'),
  title: "My Trip Pro",
  description: "AI 여행 가이드",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>

      {/* ✅ body 태그 바깥에, 혹은 body 닫히기 직전에 이렇게 딱 한 줄만 씁니다. */}
      {/* Next.js가 알아서 가장 완벽한 타이밍에 삽입해줍니다. */}
      <GoogleAnalytics gaId="G-DC122J4LJL" />

    </html>
  );
}