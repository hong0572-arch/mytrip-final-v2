const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Vercel 환경인지 확인 (Vercel에서는 VERCEL=1 또는 VERCEL=true 환경변수가 주입됨)
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const isCapacitor = !isVercel;

if (isCapacitor) {
  // 모바일 Capacitor 앱용 빌드일 때만 'export' 활성화
  process.env.CAPACITOR_BUILD = 'true';
  console.log('Building for Capacitor: enabling static export...');
} else {
  console.log('Building for Vercel Web: enabling Next.js API serverless routes...');
}

const apiPath = path.join(__dirname, '../src/app/api');
const tempApiPath = path.join(__dirname, '../src/api-temp');

const nextCachePath = path.join(__dirname, '../.next');

let renamed = false;
let buildError = null;

try {
  if (fs.existsSync(nextCachePath)) {
    console.log('Cleaning .next cache directory to prevent type check errors...');
    fs.rmSync(nextCachePath, { recursive: true, force: true });
  }

  // 모바일 앱 빌드(Capacitor)일 때만 API 폴더 우회
  if (isCapacitor && fs.existsSync(apiPath)) {
    console.log('Renaming api directory to api-temp for static build...');
    fs.renameSync(apiPath, tempApiPath);
    renamed = true;
  }

  console.log('Running next build...');
  execSync('next build --webpack', { stdio: 'inherit' });

} catch (error) {
  buildError = error;
} finally {
  if (renamed && fs.existsSync(tempApiPath)) {
    console.log('Restoring api directory...');
    fs.renameSync(tempApiPath, apiPath);
  }
}

if (buildError) {
  console.error('Build failed:', buildError);
  process.exit(1);
}
