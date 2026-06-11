import { NextResponse } from 'next/server';

export function middleware(request) {
    const { pathname, search, hostname } = request.nextUrl;
    const origin = request.headers.get('origin') || '';

    // Dynamic CORS Handling for API routes
    if (pathname.startsWith('/api/')) {
        const isAllowedOrigin = origin && (
            origin.includes('localhost') || 
            origin.includes('tripmaker.tips') ||
            origin.startsWith('capacitor://')
        );

        // Preflight OPTIONS Request handling
        if (request.method === 'OPTIONS') {
            const response = new NextResponse(null, { status: 204 });
            if (isAllowedOrigin) {
                response.headers.set('Access-Control-Allow-Origin', origin);
                response.headers.set('Access-Control-Allow-Credentials', 'true');
                response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
                response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
            }
            return response;
        }

        // Regular API Request handling
        const response = NextResponse.next();
        if (isAllowedOrigin) {
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Access-Control-Allow-Credentials', 'true');
            response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
        }
        return response;
    }

    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /Mobile|Android|iPhone|iPad|Tablet/i.test(userAgent);
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // PC/Tablet 유저가 메인 도메인(/)으로 접속 시 web.tripmaker.tips로 리다이렉트
    // (단, 로컬 개발 환경이 아닐 때만 작동하도록 조건 추가)
    if (!isLocalhost && !isMobile && pathname === '/') {
        return NextResponse.redirect(`https://web.tripmaker.tips${search}`);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/api/:path*'], // 메인 페이지와 API 라우트 매칭
};