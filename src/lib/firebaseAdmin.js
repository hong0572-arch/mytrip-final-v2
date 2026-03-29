import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
            privateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('ascii');
        } else if (privateKey) {
            privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
        }

        if (!privateKey) {
            console.error("🔥 Firebase Admin Error: Private key is completely missing.");
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        console.log("🔥 Firebase Admin Initialized successfully with Base64/Raw Key.");
    } catch (error) {
        console.error("🔥 Firebase Admin Initialization Error", error.stack);
    }
}

export { admin };
