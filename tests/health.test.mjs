import assert from 'node:assert';

console.log('Testing live server endpoints at http://localhost:5000...\n');

// 1. Health check
const healthRes = await fetch('http://localhost:5000/api/health');
const healthData = await healthRes.json();
console.log('GET /api/health response:', JSON.stringify(healthData, null, 2));

assert.strictEqual(healthRes.status, 200, 'Health check should return status 200');
assert.strictEqual(healthData.success, true, 'success flag should be true');
assert.strictEqual(healthData.message, 'Expense Tracker API is running');
assert.strictEqual(healthData.data.status, 'healthy');
assert.strictEqual(healthData.data.database, 'connected');
console.log('\n✔ GET /api/health passed! (status: healthy, database: connected)');

// 2. 404 handler
const notFoundRes = await fetch('http://localhost:5000/api/non-existent-endpoint');
const notFoundData = await notFoundRes.json();
console.log('\nGET /api/non-existent-endpoint response:', JSON.stringify(notFoundData, null, 2));

assert.strictEqual(notFoundRes.status, 404, 'Unknown route should return status 404');
assert.strictEqual(notFoundData.success, false, 'success flag should be false');
assert.strictEqual(Array.isArray(notFoundData.errors), true, 'errors should be an array');
console.log('✔ 404 Not Found handler passed!');

// 3. Root welcome endpoint
const rootRes = await fetch('http://localhost:5000/');
const rootData = await rootRes.json();
console.log('\nGET / response:', JSON.stringify(rootData, null, 2));
assert.strictEqual(rootRes.status, 200);
console.log('✔ Root welcome endpoint passed!');

console.log('\n=============================================');
console.log('ALL LIVE ENDPOINT TESTS PASSED SUCCESSFULLY!');
console.log('=============================================\n');
