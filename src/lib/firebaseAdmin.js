import admin from 'firebase-admin';

function formatPrivateKey(key) {
    if (!key) {
        console.error("🔥 Firebase Admin Error: FIREBASE_PRIVATE_KEY is entirely missing or undefined in process.env.");
        return undefined;
    }
    
    console.log("🔥 [DEBUG] Raw Key Length:", key.length);
    console.log("🔥 [DEBUG] Raw Key Start:", key.substring(0, 30));
    console.log("🔥 [DEBUG] Contains literal \\n:", key.includes('\\n'));
    console.log("🔥 [DEBUG] Contains real newline:", key.includes('\n'));
    
    // 1. 앞뒤 따옴표 제거
    let formatted = key.replace(/^"|"$/g, '');
    // 2. 이스케이프된 \n을 실제 개행 문자로 치환
    formatted = formatted.replace(/\\n/g, '\n');
    
    console.log("🔥 [DEBUG] Formatted Key Length:", formatted.length);
    console.log("🔥 [DEBUG] Formatted Key Start:", formatted.substring(0, 30));
    return formatted;
}

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
            }),
        });
        console.log("🔥 Firebase Admin Initialized successfully.");
    } catch (error) {
        console.error("🔥 Firebase Admin Initialization Error", error.stack);
    }
}

export { admin };
