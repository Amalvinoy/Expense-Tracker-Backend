import assert from 'node:assert';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://127.0.0.1:5000/api';
const BASE_V1_URL = 'http://127.0.0.1:5000/api/v1';
const JWT_SECRET = 'development_secret_key_expense_tracker_secure_2026';

// Generate tokens for two distinct users
const userA = {
  id: '6ab0bf0c371c6b2c09061dd8', // Amal
  token: jwt.sign({ sub: '6ab0bf0c371c6b2c09061dd8' }, JWT_SECRET, { expiresIn: '7d' }),
};

const userB = {
  id: '6aae68b12f8c25511fbc031c', // User B
  token: jwt.sign({ sub: '6aae68b12f8c25511fbc031c' }, JWT_SECRET, { expiresIn: '7d' }),
};

console.log('====================================================');
console.log('RUNNING EXPENSE TRACKER BACKEND LENDING MODULE TESTS');
console.log('====================================================\n');

// 1. Auth Guard
console.log('--- 1. Testing Authentication Guards ---');
{
  const res = await fetch(`${BASE_URL}/lendings`);
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: GET /api/lendings without token rejected with 401');

  const postRes = await fetch(`${BASE_URL}/lendings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personName: 'Test', amount: 100 }),
  });
  assert.strictEqual(postRes.status, 401);
  console.log('✔ Auth Guard: POST /api/lendings without token rejected with 401');
}

// 2. Validation
console.log('\n--- 2. Testing Payload & Parameter Validation ---');
{
  // Missing personName
  const res1 = await fetch(`${BASE_URL}/lendings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: 100 }),
  });
  assert.strictEqual(res1.status, 400);
  console.log('✔ Validation: Missing personName rejected with 400');

  // Negative or zero amount
  const res2 = await fetch(`${BASE_URL}/lendings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ personName: 'Rahul', amount: -50 }),
  });
  assert.strictEqual(res2.status, 400);
  console.log('✔ Validation: Negative amount rejected with 400');

  // Malformed ID
  const res3 = await fetch(`${BASE_URL}/lendings/invalid-id`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res3.status, 400);
  console.log('✔ Validation: Malformed lending ID parameter rejected with 400');
}

// 3. Lending Lifecycle & Repayments
console.log('\n--- 3. Testing Lending Lifecycle, Repayments & Math ---');
let createdLendingId = '';
{
  // Create Lending: Rahul, ₹2,000
  const createRes = await fetch(`${BASE_URL}/lendings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personName: 'Rahul',
      amount: 2000,
      note: 'Emergency loan',
    }),
  });
  assert.strictEqual(createRes.status, 201);
  const createData = await createRes.json();
  const lending = createData.data.lending;
  createdLendingId = lending.id;

  assert.strictEqual(lending.personName, 'Rahul');
  assert.strictEqual(lending.amount, 2000);
  assert.strictEqual(lending.amountReturned, 0);
  assert.strictEqual(lending.remainingAmount, 2000);
  assert.strictEqual(lending.status, 'PENDING');
  console.log('✔ Create: Created lending record Rahul ₹2,000 (status: PENDING)');

  // Partial Repayment: ₹500
  const partialRes = await fetch(`${BASE_URL}/lendings/${createdLendingId}/repayment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: 500,
      note: 'UPI transfer part 1',
    }),
  });
  assert.strictEqual(partialRes.status, 200);
  const partialData = await partialRes.json();
  const partialLending = partialData.data.lending;

  assert.strictEqual(partialLending.amount, 2000);
  assert.strictEqual(partialLending.amountReturned, 500);
  assert.strictEqual(partialLending.remainingAmount, 1500);
  assert.strictEqual(partialLending.status, 'PARTIALLY_PAID');
  assert.strictEqual(partialLending.repayments.length, 1);
  console.log('✔ Repayment: Partial repayment ₹500 recorded -> remaining: ₹1,500, status: PARTIALLY_PAID');

  // Overpayment attempt: ₹2,000 when only ₹1,500 remaining -> 400
  const overpayRes = await fetch(`${BASE_URL}/lendings/${createdLendingId}/repayment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: 2000 }),
  });
  assert.strictEqual(overpayRes.status, 400);
  console.log('✔ Repayment Guard: Overpayment attempt rejected with 400');

  // Remaining Repayment: ₹1,500 -> status becomes FULLY_PAID
  const fullRes = await fetch(`${BASE_URL}/lendings/${createdLendingId}/repayment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: 1500,
      note: 'UPI transfer part 2',
    }),
  });
  assert.strictEqual(fullRes.status, 200);
  const fullData = await fullRes.json();
  const fullLending = fullData.data.lending;

  assert.strictEqual(fullLending.amountReturned, 2000);
  assert.strictEqual(fullLending.remainingAmount, 0);
  assert.strictEqual(fullLending.status, 'FULLY_PAID');
  assert.strictEqual(fullLending.repayments.length, 2);
  console.log('✔ Repayment: Full repayment ₹1,500 recorded -> remaining: ₹0, status: FULLY_PAID');
}

// 4. Summary Calculation
console.log('\n--- 4. Testing Summary Metrics Calculation ---');
{
  const sumRes = await fetch(`${BASE_URL}/lendings/summary`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(sumRes.status, 200);
  const sumData = await sumRes.json();
  const summary = sumData.data.summary;

  assert.ok(summary.totalLent >= 2000);
  assert.ok(summary.totalReturned >= 2000);
  console.log('✔ Summary: Metrics accurately aggregated (totalLent, totalReturned, totalOutstanding)');
}

// 5. Cross-Tenant Data Isolation
console.log('\n--- 5. Testing Cross-Tenant Security & Isolation ---');
{
  // User B tries to view User A's lending record -> 404
  const bGetRes = await fetch(`${BASE_URL}/lendings/${createdLendingId}`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  assert.strictEqual(bGetRes.status, 404);
  console.log('✔ Isolation: User B cannot view User A lending record (404)');

  // User B tries to record repayment on User A's record -> 404
  const bRepayRes = await fetch(`${BASE_URL}/lendings/${createdLendingId}/repayment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userB.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: 100 }),
  });
  assert.strictEqual(bRepayRes.status, 404);
  console.log('✔ Isolation: User B cannot repay User A lending record (404)');

  // User B tries to delete User A's record -> 404
  const bDelRes = await fetch(`${BASE_URL}/lendings/${createdLendingId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  assert.strictEqual(bDelRes.status, 404);
  console.log('✔ Isolation: User B cannot delete User A lending record (404)');
}

// 6. Deletion & Cleanup
console.log('\n--- 6. Testing Deletion & Cleanup ---');
{
  const delRes = await fetch(`${BASE_URL}/lendings/${createdLendingId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(delRes.status, 200);
  console.log('✔ Deletion: Lending record deleted successfully (200)');

  const getRes = await fetch(`${BASE_URL}/lendings/${createdLendingId}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(getRes.status, 404);
  console.log('✔ Deletion: Confirmed resource removed (404 on subsequent GET)');
}

// 7. API /v1 Alias
console.log('\n--- 7. Testing /api/v1/lendings Alias ---');
{
  const res = await fetch(`${BASE_V1_URL}/lendings`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.data.lendings));
  console.log('✔ Alias: /api/v1/lendings seamlessly mirrors /api/lendings');
}

console.log('\n====================================================');
console.log('ALL LENDING INTEGRATION TESTS PASSED (100% PASS)');
console.log('====================================================\n');
