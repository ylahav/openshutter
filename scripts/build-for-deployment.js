#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

const PROJECT_ROOT = process.cwd();
const BUILD_DIR = path.join(PROJECT_ROOT, '.next');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'openshutter-deployment.zip');

// Files to include in deployment package
const FILES_TO_INCLUDE = [
  '.next',
  'public',
  'package.json',
  'pnpm-lock.yaml',
  'next.config.js',
  'ecosystem.config.js'
];

console.log('🚀 Building OpenShutter for PM2 deployment...\n');

// Step 1: Build the application
console.log('📦 Building Next.js application...');
try {
  execSync('pnpm build', { stdio: 'inherit', cwd: PROJECT_ROOT });
  console.log('✅ Build completed successfully\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 2: Create deployment package
console.log('📁 Creating deployment package...');

// Check if required files exist
const missingFiles = FILES_TO_INCLUDE.filter(file => {
  const filePath = path.join(PROJECT_ROOT, file);
  return !fs.existsSync(filePath);
});

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:', missingFiles.join(', '));
  process.exit(1);
}

// Create zip file
const output = fs.createWriteStream(OUTPUT_FILE);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`✅ Deployment package created: ${OUTPUT_FILE}`);
  console.log(`📊 Package size: ${sizeInMB} MB`);
  console.log('\n📋 Package contents:');
  FILES_TO_INCLUDE.forEach(file => {
    console.log(`   - ${file}`);
  });
  console.log('\n🚀 Ready for deployment!');
  console.log('\nNext steps:');
  console.log('1. Upload the zip file to your server');
  console.log('2. Run the deployment script on the server');
});

archive.on('error', (err) => {
  console.error('❌ Error creating package:', err);
  process.exit(1);
});

archive.pipe(output);

// Add files to archive
FILES_TO_INCLUDE.forEach(file => {
  const filePath = path.join(PROJECT_ROOT, file);
  const stat = fs.statSync(filePath);
  
  if (stat.isDirectory()) {
    archive.directory(filePath, file);
  } else {
    archive.file(filePath, { name: file });
  }
});

archive.finalize();
