const http = require('http');

async function runTests() {
  const baseUrl = 'http://localhost:3000';
  let passed = true;

  const request = (path, method = 'GET', body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
      const opts = { method, headers: { ...headers } };
      if (body) {
        opts.headers['Content-Type'] = 'application/json';
      }
      const req = http.request(baseUrl + path, opts, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  console.log('--- Running Tests ---');

  // Test 1: Unauthenticated request should fail with 401
  const test1 = await request('/api/auth/me');
  if (test1.status === 401) {
    console.log('✅ Test 1 Passed: Unauthenticated request rejected with 401.');
  } else {
    console.log(`❌ Test 1 Failed: Expected 401, got ${test1.status}`);
    passed = false;
  }

  // Test 2: Public database files should be 404 (handled by Vite static file fallback but shouldn't serve JSON)
  const test2 = await request('/safedrive.json');
  if (test2.status === 404 || test2.data.includes('<!DOCTYPE html>')) {
    console.log('✅ Test 2 Passed: Public database file not accessible (got 404 or HTML fallback).');
  } else {
    console.log(`❌ Test 2 Failed: Expected 404 or HTML, got ${test2.status}`);
    passed = false;
  }

  // Test 3: Register a new user
  const email = 'test' + Date.now() + '@example.com';
  const test3 = await request('/api/auth/register', 'POST', { name: 'Test', email, password: 'password123' });
  let token = null;
  if (test3.status === 201 && JSON.parse(test3.data).token) {
    console.log('✅ Test 3 Passed: Registration successful.');
    token = JSON.parse(test3.data).token;
  } else {
    console.log(`❌ Test 3 Failed: Registration failed. Status: ${test3.status} Data: ${test3.data}`);
    passed = false;
  }

  // Test 4: Login
  const test4 = await request('/api/auth/login', 'POST', { email, password: 'password123' });
  if (test4.status === 200 && JSON.parse(test4.data).token) {
    console.log('✅ Test 4 Passed: Login successful.');
    token = JSON.parse(test4.data).token;
  } else {
    console.log(`❌ Test 4 Failed: Login failed. Status: ${test4.status}`);
    passed = false;
  }

  // Test 5: Authenticated API access
  const test5 = await request('/api/auth/me', 'GET', null, { 'Authorization': `Bearer ${token}` });
  if (test5.status === 200) {
    console.log('✅ Test 5 Passed: Authenticated API access successful.');
  } else {
    console.log(`❌ Test 5 Failed: Expected 200, got ${test5.status}`);
    passed = false;
  }

  // Test 6: Database export should work with Auth
  const test6 = await request('/api/database/export', 'GET', null, { 'Authorization': `Bearer ${token}` });
  if (test6.status === 200) {
    const dbData = JSON.parse(test6.data);
    if (dbData.passwords) {
      console.log('❌ Test 6 Failed: Exported database contains passwords object!');
      passed = false;
    } else {
      console.log('✅ Test 6 Passed: Database export successful and does not contain passwords.');
    }
  } else {
    console.log(`❌ Test 6 Failed: Expected 200, got ${test6.status}`);
    passed = false;
  }

  // Test 7: Database export should FAIL without Auth
  const test7 = await request('/api/database/export', 'GET', null, {});
  if (test7.status === 401) {
    console.log('✅ Test 7 Passed: Unauthenticated database export rejected with 401.');
  } else {
    console.log(`❌ Test 7 Failed: Expected 401, got ${test7.status}`);
    passed = false;
  }

  if (passed) {
    console.log('--- ALL TESTS PASSED ---');
  } else {
    console.log('--- SOME TESTS FAILED ---');
  }
}

runTests().catch(console.error);
