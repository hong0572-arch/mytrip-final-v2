import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
    let rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    let result = {
        hasKey: !!rawKey,
        rawLength: rawKey.length,
        hasLiteralSlashN: rawKey.includes('\\n'),
        hasRealNewline: rawKey.includes('\n'),
        startsWithQuotes: rawKey.startsWith('"'),
        cryptoSuccess: false,
        error: null,
    };

    let formatted = rawKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
    result.formattedLength = formatted.length;

    try {
        crypto.createPrivateKey(formatted);
        result.cryptoSuccess = true;
    } catch (err) {
        result.cryptoSuccess = false;
        result.error = err.message;
    }

    return NextResponse.json(result);
}
