const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

  if (fs.existsSync(apiPath)) {
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
