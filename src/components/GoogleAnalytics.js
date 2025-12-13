'use client';

import Script from "next/script";

export default function GoogleAnalytics() {
    // 사장님 ID
    const GA_ID = "G-DC122J4LJL";

    return (
        <>
            {/* 1. 구글 스크립트 로드 */}
            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            />

            {/* 2. 구글 설정 및 초기화 */}
            <Script
                id="google-analytics"
                strategy="afterInteractive"
            >
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
          });
        `}
            </Script>
        </>
    );
}