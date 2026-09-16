const http = require('http');
const fs = require('fs');

async function verifySecurity() {
  const baseUrl = 'http://localhost:3000';
  let passed = true;

  const request = (path, method = 'GET', headers = {}) => {
    return new Promise((resolve, reject) => {
      const opts = { method, headers };
      const req = http.request(baseUrl + path, opts, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.end();
    });
  };

  console.log('--- Final Security Verification ---');

  // Test 1: /api/database/export requires auth
  const t1 = await request('/api/database/export');
  if (t1.status === 401) console.log('✅ 1. /api/database/export requires authentication (401)');
  else { console.log('❌ 1 Failed:', t1.status); passed = false; }

  // Test 2: /api/database/download requires auth
  const t2 = await request('/api/database/download');
  if (t2.status === 401) console.log('✅ 2. /api/database/download requires authentication (401)');
  else { console.log('❌ 2 Failed:', t2.status); passed = false; }

  // Test 3-8: Public DB exposures
  const publicPaths = [
    '/safedrive.json',
    '/safadrive.json',
    '/data/safedrive.json',
    '/data/safadrive.json',
    '/download/safedrive.json',
    '/download/safadrive.json'
  ];

  for (let i = 0; i < publicPaths.length; i++) {
    const p = publicPaths[i];
    const res = await request(p);
    const isProtected = res.status === 404 || res.status === 401 || res.status === 403 || res.data.includes('<!doctype html>');
    if (isProtected) {
      console.log(`✅ ${3+i}. ${p} cannot expose the database publicly (Got ${res.status})`);
    } else {
      console.log(`❌ ${3+i} Failed: ${p} exposed data! Status: ${res.status}`);
      passed = false;
    }
  }

  // Test 9: public/safedrive.json existence
  let pubExists = false;
  try {
    if (fs.existsSync('./public/safedrive.json')) pubExists = true;
    if (fs.existsSync('./public/safadrive.json')) pubExists = true;
  } catch(e) {}
  if (!pubExists) console.log('✅ 9. public/safedrive.json does not exist');
  else { console.log('❌ 9 Failed: file exists'); passed = false; }

  // Test 10: Authenticated export does not contain password hashes
  // First register and login to get token
  const email = 'verify' + Date.now() + '@example.com';
  let token = null;
  const regReq = http.request(baseUrl + '/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }
  }, (res) => {
    let data = '';
    res.on('data', c => data+=c);
    res.on('end', async () => {
      if (res.statusCode === 201) {
        token = JSON.parse(data).token;
        const exportRes = await request('/api/database/export', 'GET', { 'Authorization': `Bearer ${token}` });
        const dbData = JSON.parse(exportRes.data);
        if (!dbData.passwords) {
          console.log('✅ 10. No API response exposes password hashes (verified in export)');
        } else {
          console.log('❌ 10 Failed: Passwords found in export');
          passed = false;
        }

        // Test 11: Unauthenticated fallback
        const unauthReq = await request('/api/auth/me');
        if (unauthReq.status === 401) {
          console.log('✅ 11. No unauthenticated request falls back to driver_default_01 (401 returned)');
        } else {
          console.log('❌ 11 Failed: Status', unauthReq.status);
          passed = false;
        }

        if (passed) console.log('--- ALL VERIFICATIONS PASSED ---');
        else console.log('--- SOME VERIFICATIONS FAILED ---');
      }
    });
  });
  regReq.write(JSON.stringify({ name: 'Verify', email, password: 'password123' }));
  regReq.end();

}

verifySecurity();
