const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const lines = envLocal.split('\n');
let newLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith('FIREBASE_PRIVATE_KEY=')) {
    // Extract the raw string inside the quotes or after the equals sign
    let raw = line.substring('FIREBASE_PRIVATE_KEY='.length);
    if (raw.startsWith('"') && raw.endsWith('"')) {
      raw = raw.slice(1, -1);
    }
    // Convert literal \n to real newlines, because the original JSON had real newlines that config needs
    let realKey = raw.replace(/\\n/g, '\n');
    let b64 = Buffer.from(realKey).toString('base64');
    
    // Comment out the old one
    newLines.push('# FIREBASE_PRIVATE_KEY=' + line.substring('FIREBASE_PRIVATE_KEY='.length));
    // Add the new Base64 one
    newLines.push('FIREBASE_PRIVATE_KEY_BASE64="' + b64 + '"');
  } else {
    newLines.push(line);
  }
}

fs.writeFileSync('.env.local', newLines.join('\n'));
console.log("Successfully converted FIREBASE_PRIVATE_KEY to BASE64 in .env.local!");
