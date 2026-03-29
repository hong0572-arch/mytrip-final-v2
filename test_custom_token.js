const { loadEnvConfig } = require('@next/env');
const path = require('path');
loadEnvConfig(path.resolve('.'));

const admin = require('firebase-admin');

async function test() {
    try {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
            privateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('ascii');
        } else if (privateKey) {
            privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
        }

        console.log("Key length:", privateKey ? privateKey.length : 0);

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey,
                }),
            });
        }
        
        console.log("App initialized. Testing custom token...");
        const customToken = await admin.auth().createCustomToken("test-kakao-1234");
        console.log("SUCCESS! Token created:", customToken.substring(0, 15) + "...");
    } catch (e) {
        console.error("CRITICAL FAILURE:", e.message);
        if (e.stack) console.error(e.stack);
    }
}
test();
