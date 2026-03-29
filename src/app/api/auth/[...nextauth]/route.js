import NextAuth from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import { admin } from "../../../../lib/firebaseAdmin";

export const runtime = 'nodejs';

const handler = NextAuth({
    providers: [
        KakaoProvider({
            clientId: process.env.KAKAO_CLIENT_ID,
            clientSecret: process.env.KAKAO_CLIENT_SECRET,
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async jwt({ token, user, account }) {
            // 카카오 로그인이 최초로 성공했을 때 한정
            if (account && user) {
                token.uid = `kakao:${user.id}`;
                try {
                    // Firebase 커스텀 토큰 발급
                    const customToken = await admin.auth().createCustomToken(token.uid);
                    token.firebaseToken = customToken;
                } catch (error) {
                    console.error("Firebase Custom Token 발급 에러:", error);
                }
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.uid || token.sub;
            session.firebaseToken = token.firebaseToken;
            return session;
        },
    },
    pages: {
        signIn: '/login', // 커스텀 로그인 페이지를 쓸 경우
    }
});

export { handler as GET, handler as POST };