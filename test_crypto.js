const fs = require('fs');
const crypto = require('crypto');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const lines = envLocal.split('\n');
let rawKey = '';
for (const line of lines) {
  if (line.startsWith('FIREBASE_PRIVATE_KEY=')) {
    rawKey = line.substring('FIREBASE_PRIVATE_KEY='.length);
  }
}

if (!rawKey) {
  console.log("No key found");
  process.exit(1);
}

// simulate Next.js dotenv and our parser
let key = rawKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

console.log("Key format test:");
console.log("Key starts with:", key.substring(0, 30));
console.log("Key ends with:", key.substring(key.length - 28));
console.log("Key string length:", key.length);

console.log("Trying to load into crypto...");
try {
  crypto.createPrivateKey(key);
  console.log("Successfully created private key in crypto!");
} catch (e) {
  console.error("Failed to parse private key:", e.message);
}
