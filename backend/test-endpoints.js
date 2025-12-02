/**
 * Test script for NestJS API endpoints
 * Run with: node test-endpoints.js
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000/api';

async function testEndpoint(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  console.log(`\n${method} ${path}`);
  
  try {
    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    
    console.log(`  Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      console.log(`  ✅ Success`);
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        console.log(`  Response keys: ${Object.keys(data).slice(0, 5).join(', ')}${Object.keys(data).length > 5 ? '...' : ''}`);
      }
    } else {
      console.log(`  ❌ Error:`, data.message || data.error || JSON.stringify(data).substring(0, 100));
    }
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.log(`  ❌ Exception: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing NestJS API Endpoints');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('='.repeat(50));

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  // Test 1: Health Check
  const health = await testEndpoint('GET', '/health');
  if (health.success) results.passed++;
  else results.failed++;

  // Test 2: Get Photos (paginated)
  const photos = await testEndpoint('GET', '/photos?page=1&limit=5');
  if (photos.success) results.passed++;
  else results.failed++;

  // Test 3: Get Albums
  const albums = await testEndpoint('GET', '/albums');
  if (albums.success) results.passed++;
  else results.failed++;

  // Test 4: Get Albums with parentId filter
  const albumsWithParent = await testEndpoint('GET', '/albums?parentId=test');
  if (albumsWithParent.success) results.passed++;
  else results.failed++;

  // Test 5: Get Albums by alias (if we have one)
  // This will likely fail if no album with alias exists, which is OK
  const albumByAlias = await testEndpoint('GET', '/albums/by-alias/test-album');
  if (albumByAlias.success) {
    results.passed++;
  } else if (albumByAlias.status === 404) {
    results.skipped++;
    console.log('  ⚠️  Skipped (404 - album not found, expected)');
  } else {
    results.failed++;
  }

  // Test 6: Get Album Photos (if we have an album ID)
  // This will likely fail if no album exists, which is OK
  const albumPhotos = await testEndpoint('GET', '/albums/test-id/photos?page=1&limit=5');
  if (albumPhotos.success) {
    results.passed++;
  } else if (albumPhotos.status === 404) {
    results.skipped++;
    console.log('  ⚠️  Skipped (404 - album not found, expected)');
  } else {
    results.failed++;
  }

  // Test 7: Get Single Photo (if we have a photo ID)
  // This will likely fail if no photo exists, which is OK
  const photo = await testEndpoint('GET', '/photos/test-id');
  if (photo.success) {
    results.passed++;
  } else if (photo.status === 404) {
    results.skipped++;
    console.log('  ⚠️  Skipped (404 - photo not found, expected)');
  } else {
    results.failed++;
  }

  // Test 8: Get Single Album (if we have an album ID)
  // This will likely fail if no album exists, which is OK
  const album = await testEndpoint('GET', '/albums/test-id');
  if (album.success) {
    results.passed++;
  } else if (album.status === 404) {
    results.skipped++;
    console.log('  ⚠️  Skipped (404 - album not found, expected)');
  } else {
    results.failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Skipped: ${results.skipped}`);
  console.log(`Total: ${results.passed + results.failed + results.skipped}`);

  if (results.failed === 0) {
    console.log('\n🎉 All critical endpoints are working!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some endpoints failed. Check the output above.');
    process.exit(1);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with built-in fetch support');
  console.error('   Or install node-fetch: npm install node-fetch');
  process.exit(1);
}

runTests().catch((error) => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
