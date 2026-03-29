import { NextResponse } from 'next/server';
import { admin } from '../../../../lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const customToken = await admin.auth().createCustomToken("test-kakao-1234");
        return NextResponse.json({ success: true, tokenPrefix: customToken.substring(0, 15) });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message, stack: error.stack });
    }
}
