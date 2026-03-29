const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env.local'));
let key = env.FIREBASE_PRIVATE_KEY;
console.log("Raw key length:", key ? key.length : "undefined");
if (!key) return;

// Test my logic
let formatted = key.replace(/^"|"$/g, '');
formatted = formatted.replace(/\\n/g, '\n');
console.log("After format:", formatted.substring(0, 50) + "...");
console.log("Has real newlines?", formatted.includes('\n'));
console.log("Has literal \\n?", formatted.includes('\\n'));
