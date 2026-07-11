const fs = require('fs');
const path = require('path');
const https = require('https');
const admin = require('firebase-admin');

// 1. .env.local 파일 직접 파싱
function loadEnv() {
    const envPath = path.join(__dirname, '../.env.local');
    if (!fs.existsSync(envPath)) {
        console.error("❌ .env.local file not found at", envPath);
        return false;
    }
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let val = match[2].trim();
            // 큰따옴표 제거
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1);
            }
            process.env[key] = val;
        }
    });
    return true;
}

function postRequest(url, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            },
            timeout: 5000
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: JSON.parse(body)
                });
            });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error("Request Timeout"));
        });
        req.write(data);
        req.end();
    });
}

async function verify() {
    if (!loadEnv()) return;

    console.log("=== Firebase Custom Token Cross-Verification ===");
    console.log("Project ID:", process.env.FIREBASE_PROJECT_ID);
    console.log("Client Email:", process.env.FIREBASE_CLIENT_EMAIL);

    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
        // Base64 디코딩 시 utf8 형식이 안전합니다.
        privateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
        console.log("✅ Decoded Private Key from Base64 successfully.");
    }

    if (!privateKey) {
        console.error("❌ Private key is missing.");
        return;
    }

    // 1. Firebase Admin SDK 초기화
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey
            })
        });
    }

    // 2. Custom Token 생성
    const uid = "test-verification-user";
    const customToken = await admin.auth().createCustomToken(uid);
    console.log("✅ Created Custom Token successfully.");

    // 3. 클라이언트 API Key 대조 검증
    // src/lib/firebase.js 에 기재된 apiKey
    const clientApiKey = "AIzaSyBlHvrHszUSCMBFx_w3rWvVNMFQ1oS7Ts0";
    console.log("Client API Key:", clientApiKey);

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${clientApiKey}`;
    
    try {
        const response = await postRequest(url, {
            token: customToken,
            returnSecureToken: true
        });

        if (response.statusCode === 200) {
            console.log("🎉 SUCCESS! Custom Token is VALID and match the API Key!");
            console.log("ID Token:", response.body.idToken ? "Present" : "Missing");
            console.log("Local ID:", response.body.localId);
        } else {
            console.error(`❌ ERROR! Verification failed with Status Code: ${response.statusCode}`);
            console.error("Response Body:", JSON.stringify(response.body, null, 2));
        }
    } catch (err) {
        console.error("🚨 Request Error:", err);
    }
}

verify();
