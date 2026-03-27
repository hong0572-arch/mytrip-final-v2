const fs = require('fs');

const fileContent = fs.readFileSync('src/components/AIResult.js', 'utf8');
const newReturnContent = fs.readFileSync('new_return.jsx', 'utf8');

const matchStart = fileContent.match(/ {4}return \([\s\S]*?<div className="min-h-screen bg-gray-100 flex justify-center/);
let startIdx = -1;
if (matchStart) {
    startIdx = matchStart.index;
}

const matchEnd = fileContent.match(/ {12}\{\/\* PDF 변환용 숨겨진 A4 서식 유지 \*\/\}/);
let endIdx = -1;
if (matchEnd) {
    endIdx = matchEnd.index;
}

if (startIdx !== -1 && endIdx !== -1) {
    let before = fileContent.substring(0, startIdx);
    let after = fileContent.substring(endIdx);
    
    // Check if newReturn needs a trailing newline
    const newContent = before + newReturnContent + '\n' + after;
    fs.writeFileSync('src/components/AIResult.js', newContent, 'utf8');
    console.log("Splice success!");
} else {
    console.log("Could not find targets:", { startStrFound: startIdx !== -1, endStrFound: endIdx !== -1 });
}
