import assert from 'node:assert';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://127.0.0.1:5000/api';
const BASE_V1_URL = 'http://127.0.0.1:5000/api/v1';
const JWT_SECRET = 'development_secret_key_expense_tracker_secure_2026';

const userA = {
  id: '6ab0bf0c371c6b2c09061dd8',
  token: jwt.sign({ sub: '6ab0bf0c371c6b2c09061dd8' }, JWT_SECRET, { expiresIn: '7d' }),
};

const userB = {
  id: '6aae68b12f8c25511fbc031c',
  token: jwt.sign({ sub: '6aae68b12f8c25511fbc031c' }, JWT_SECRET, { expiresIn: '7d' }),
};

console.log('====================================================');
console.log('RUNNING EXPENSE TRACKER BACKEND INCOME MODULE TESTS');
console.log('====================================================\n');

// Clean up any test records for the test months
async function cleanup() {
  for (const user of [userA, userB]) {
    const res = await fetch(`${BASE_URL}/income?year=2026`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (res.ok) {
      const json = await res.json();
      for (const item of json.data?.incomes || []) {
        if ([9, 10, 11].includes(item.month)) {
          await fetch(`${BASE_URL}/income/${item.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${user.token}` },
          });
        }
      }
    }
  }
}

await cleanup();

// 1. Auth Guard
console.log('--- 1. Testing Authentication Guards ---');
{
  const res = await fetch(`${BASE_URL}/income`);
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: GET /api/income without token rejected with 401');

  const postRes = await fetch(`${BASE_URL}/income`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year: 2026, month: 9, amount: 30000 }),
  });
  assert.strictEqual(postRes.status, 401);
  console.log('✔ Auth Guard: POST /api/income without token rejected with 401');
}

// 2. Validation
console.log('\n--- 2. Testing Payload & Parameter Validation ---');
{
  // Missing amount
  const res1 = await fetch(`${BASE_URL}/income`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ year: 2026, month: 9 }),
  });
  assert.strictEqual(res1.status, 400);
  console.log('✔ Validation: Missing amount rejected with 400');

  // Invalid month (month > 12)
  const res2 = await fetch(`${BASE_URL}/income`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ year: 2026, month: 13, amount: 50000 }),
  });
  assert.strictEqual(res2.status, 400);
  console.log('✔ Validation: Month > 12 rejected with 400');

  // Negative amount
  const res3 = await fetch(`${BASE_URL}/income`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ year: 2026, month: 9, amount: -100 }),
  });
  assert.strictEqual(res3.status, 400);
  console.log('✔ Validation: Negative amount rejected with 400');

  // Malformed ID param
  const res4 = await fetch(`${BASE_URL}/income/not-an-id`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res4.status, 400);
  console.log('✔ Validation: Invalid ID format rejected with 400');
}

// 3. Create & Upsert Monthly Income
console.log('\n--- 3. Testing Create & Upsert Monthly Income ---');
let sepIncomeId = '';
{
  // Create September 2026 Income
  const res1 = await fetch(`${BASE_URL}/income`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      year: 2026,
      month: 9,
      amount: 30000,
      source: 'Salary',
      note: 'Main Job',
    }),
  });
  assert.strictEqual(res1.status, 201);
  const json1 = await res1.json();
  assert.strictEqual(json1.success, true);
  assert.strictEqual(json1.data.income.year, 2026);
  assert.strictEqual(json1.data.income.month, 9);
  assert.strictEqual(json1.data.income.amount, 30000);
  assert.strictEqual(json1.data.income.source, 'Salary');
  sepIncomeId = json1.data.income.id;
  console.log('✔ Created September 2026 Income: ₹30,000 (ID:', sepIncomeId, ')');

  // Upsert again for September 2026 with new amount: 35000
  const res2 = await fetch(`${BASE_URL}/income`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      year: 2026,
      month: 9,
      amount: 35000,
      source: 'Salary + Bonus',
    }),
  });
  assert.strictEqual(res2.status, 201);
  const json2 = await res2.json();
  assert.strictEqual(json2.data.income.amount, 35000);
  assert.strictEqual(json2.data.income.source, 'Salary + Bonus');
  assert.strictEqual(json2.data.income.id, sepIncomeId);
  console.log('✔ Upserted September 2026 Income seamlessly: updated to ₹35,000 without duplicate');

  // Create October 2026 Income: 42000
  const res3 = await fetch(`${BASE_URL}/income`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      year: 2026,
      month: 10,
      amount: 42000,
      source: 'Salary',
    }),
  });
  assert.strictEqual(res3.status, 201);
  const json3 = await res3.json();
  assert.strictEqual(json3.data.income.month, 10);
  assert.strictEqual(json3.data.income.amount, 42000);
  console.log('✔ Created October 2026 Income: ₹42,000');
}

// 4. Isolation Between Months & Direct Month Queries
console.log('\n--- 4. Testing Month Isolation & Direct Queries ---');
{
  // Query September by URL params /month/2026/9
  const resSep = await fetch(`${BASE_URL}/income/month/2026/9`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(resSep.status, 200);
  const jsonSep = await resSep.json();
  assert.strictEqual(jsonSep.data.income.month, 9);
  assert.strictEqual(jsonSep.data.income.amount, 35000);
  console.log('✔ Month Isolation: GET /api/income/month/2026/9 returned ₹35,000');

  // Query October by URL params /month/2026/10
  const resOct = await fetch(`${BASE_URL}/income/month/2026/10`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(resOct.status, 200);
  const jsonOct = await resOct.json();
  assert.strictEqual(jsonOct.data.income.month, 10);
  assert.strictEqual(jsonOct.data.income.amount, 42000);
  console.log('✔ Month Isolation: GET /api/income/month/2026/10 returned ₹42,000');

  // Query November (no income recorded yet)
  const resNov = await fetch(`${BASE_URL}/income/month/2026/11`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(resNov.status, 200);
  const jsonNov = await resNov.json();
  assert.strictEqual(jsonNov.data.income, null);
  console.log('✔ Unrecorded Month: GET /api/income/month/2026/11 returned null gracefully');
}

// 5. User Data Isolation
console.log('\n--- 5. Testing User Isolation ---');
{
  // User B queries September 2026
  const resB = await fetch(`${BASE_URL}/income/month/2026/9`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  assert.strictEqual(resB.status, 200);
  const jsonB = await resB.json();
  assert.strictEqual(jsonB.data.income, null);
  console.log('✔ User Isolation: User B cannot see User A\'s income (got null)');

  // User B cannot access User A's income by ID
  const resBById = await fetch(`${BASE_URL}/income/${sepIncomeId}`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  assert.strictEqual(resBById.status, 404);
  console.log('✔ User Isolation: User B cannot access User A\'s income by ID (404)');
}

// 6. Update and Delete
console.log('\n--- 6. Testing Update and Delete ---');
{
  // Update via PUT /api/income/:id
  const putRes = await fetch(`${BASE_URL}/income/${sepIncomeId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: 36000, note: 'Updated note' }),
  });
  assert.strictEqual(putRes.status, 200);
  const putJson = await putRes.json();
  assert.strictEqual(putJson.data.income.amount, 36000);
  assert.strictEqual(putJson.data.income.note, 'Updated note');
  console.log('✔ PUT /api/income/:id updated amount to ₹36,000');

  // Delete via DELETE /api/income/:id
  const delRes = await fetch(`${BASE_URL}/income/${sepIncomeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(delRes.status, 200);
  console.log('✔ DELETE /api/income/:id returned 200');

  // Verify deletion
  const verifyRes = await fetch(`${BASE_URL}/income/${sepIncomeId}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(verifyRes.status, 404);
  console.log('✔ Confirmed deleted: subsequent GET returned 404');
}

// Clean up
await cleanup();

console.log('\n====================================================');
console.log('ALL BACKEND INCOME TESTS PASSED SUCCESSFULLY!');
console.log('====================================================\n');
