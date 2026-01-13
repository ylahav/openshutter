#!/usr/bin/env node

/**
 * Cleanup Storage Configs Script
 * 
 * This script cleans up storage configuration records in the database by:
 * - Removing isEnabled from config objects (it should only be at root level)
 * - Removing duplicate top-level fields (clientId, clientSecret, etc.)
 * 
 * Usage:
 *   node scripts/cleanup-storage-configs.cjs
 *   OR
 *   pnpm run cleanup-storage-configs
 * 
 * Prerequisites:
 *   - Backend must be built: pnpm --filter openshutter-backend build
 *   - MongoDB must be accessible (via MONGODB_URI env var or .env file)
 */

const path = require('path');
const fs = require('fs');

// Load environment variables from .env file if it exists
function loadEnvFile(envPath) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
}

// Try loading from backend/.env
const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
loadEnvFile(backendEnvPath);

// Also try root .env
const rootEnvPath = path.join(__dirname, '..', '.env');
loadEnvFile(rootEnvPath);

// Import the cleanup function directly
async function runCleanup() {
  try {
    console.log('🧹 Starting storage config cleanup...\n');
    
    // Check if backend is built
    const distPath = path.join(__dirname, '..', 'backend', 'dist', 'services', 'storage', 'config.js');
    if (!fs.existsSync(distPath)) {
      console.error('❌ Backend must be built first!');
      console.error('   Run: pnpm --filter openshutter-backend build');
      console.error('   Or: cd backend && pnpm build');
      process.exit(1);
    }
    
    // Dynamically import the storage config service
    const { storageConfigService } = require('../backend/dist/services/storage/config');
    
    console.log('📦 Running cleanup...');
    await storageConfigService.cleanupExistingConfigs();
    
    console.log('✅ Cleanup completed successfully!\n');
    
    // Get and display cleaned configs
    const configs = await storageConfigService.getAllConfigs();
    console.log(`📊 Found ${configs.length} storage configuration(s):`);
    configs.forEach(config => {
      const status = config.isEnabled ? '✅ Enabled' : '❌ Disabled';
      console.log(`  - ${config.name} (${config.providerId}): ${status}`);
    });
    
    console.log('\n✨ Done! Storage configs have been cleaned up.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

runCleanup();
