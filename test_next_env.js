const { loadEnvConfig } = require('@next/env');
const path = require('path');
const crypto = require('crypto');

// next.js 내부 로더를 모방하여 .env 로드
loadEnvConfig(path.resolve('.'));

console.log("Loaded Next.js ENV!");
const key = process.env.FIREBASE_PRIVATE_KEY;

if (!key) {
    console.error("No key loaded by Next.js");
    process.exit(1);
}

console.log("Raw Key Length:", key.length);
console.log("Starts:", key.substring(0, 30));
console.log("Ends:", key.substring(key.length - 28));
console.log("Contains literal \\n:", key.includes('\\n'));
console.log("Contains real newline:", key.includes('\n'));

let formatted = key;
if (key.startsWith('"') && key.endsWith('"')) {
    formatted = formatted.slice(1, -1);
}
formatted = formatted.replace(/\\n/g, '\n');

console.log("Formatted Length:", formatted.length);
console.log("Formatted Starts:", formatted.substring(0, 30));
console.log("Formatted Ends:", formatted.substring(formatted.length - 28));

try {
    crypto.createPrivateKey(formatted);
    console.log("Success with Next.js specific parsing!");
} catch (e) {
    console.log("Failed in Crypto:", e.message);
}
