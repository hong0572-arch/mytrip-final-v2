import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace escaped newline characters if necessary (Standard Next.js \n handling)
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
        console.log("🔥 Firebase Admin Initialized successfully.");
    } catch (error) {
        console.error("🔥 Firebase Admin Initialization Error", error.stack);
    }
}

export { admin };
