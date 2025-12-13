import "./globals.css";

export const metadata = {
  metadataBase: new URL('https://mytrip2.pro'),
  title: "My Trip Pro",
  description: "여행 가이드",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* 1. 구글 스크립트 (HTML 표준 방식) */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-DC122J4LJL"
        ></script>

        {/* 2. 설정 코드 (HTML 강제 주입) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-DC122J4LJL');
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