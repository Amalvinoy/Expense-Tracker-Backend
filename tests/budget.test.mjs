import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';
const BASE_V1_URL = 'http://localhost:5000/api/v1';

console.log('===================================================');
console.log('RUNNING EXPENSE TRACKER BACKEND BUDGET MODULE TESTS');
console.log('===================================================\n');

// Helper to create test user
async function createTestUser(prefix) {
  const email = `${prefix}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}@example.com`;
  const password = 'Password123!';
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `${prefix} User`,
      email,
      password,
    }),
  });
  const body = await res.json();
  assert.strictEqual(res.status, 201, `Failed to register user: ${JSON.stringify(body)}`);
  return {
    id: body.data.user.id,
    token: body.data.token,
    email,
  };
}

const userA = await createTestUser('bgtUserA');
const userB = await createTestUser('bgtUserB');

console.log('Initialized Test Users:');
console.log(`- User A: ${userA.id} (${userA.email})`);
console.log(`- User B: ${userB.id} (${userB.email})\n`);

// Fetch categories for User A
const catRes = await fetch(`${BASE_URL}/categories`, {
  headers: { Authorization: `Bearer ${userA.token}` },
});
const catBody = await catRes.json();
const foodCat = catBody.data.categories.find((c) => c.name === 'Food');
const transportCat = catBody.data.categories.find((c) => c.name === 'Transport');
assert.ok(foodCat, 'Food category must exist');
assert.ok(transportCat, 'Transport category must exist');

// User B creates a custom category
const userBCatRes = await fetch(`${BASE_URL}/categories`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
  body: JSON.stringify({ name: 'User B Only Category', icon: 'star', color: '#10B981' }),
});
const userBCatBody = await userBCatRes.json();
const userBCategoryId = userBCatBody.data.category.id;

// ----------------------------------------------------
// 1. AUTHENTICATION GUARDS
// ----------------------------------------------------
console.log('--- 1. Testing Authentication Guards ---');

{
  const res = await fetch(`${BASE_URL}/budgets`);
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: GET /api/budgets without token rejected with 401');
}

{
  const res = await fetch(`${BASE_URL}/budgets/current`);
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: GET /api/budgets/current without token rejected with 401');
}

{
  const res = await fetch(`${BASE_URL}/budgets/progress`);
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: GET /api/budgets/progress without token rejected with 401');
}

{
  const res = await fetch(`${BASE_URL}/budgets/66ed3c101c8e9b4d1a2f3101`);
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: GET /api/budgets/:id without token rejected with 401');
}

{
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'TOTAL', amount: 20000, year: 2026, month: 9 }),
  });
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: POST /api/budgets without token rejected with 401');
}

{
  const res = await fetch(`${BASE_URL}/budgets/66ed3c101c8e9b4d1a2f3101`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 25000 }),
  });
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: PUT /api/budgets/:id without token rejected with 401');
}

{
  const res = await fetch(`${BASE_URL}/budgets/66ed3c101c8e9b4d1a2f3101`, {
    method: 'DELETE',
  });
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: DELETE /api/budgets/:id without token rejected with 401');
}

// ----------------------------------------------------
// 2. VALIDATION TESTS
// ----------------------------------------------------
console.log('\n--- 2. Testing Request Validation ---');

{
  // 2.1 Invalid type
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ type: 'WEEKLY', amount: 5000, year: 2026, month: 9 }),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Invalid budget type rejected with 400');
}

{
  // 2.2 Invalid amount (<= 0)
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ type: 'TOTAL', amount: 0, year: 2026, month: 9 }),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Amount = 0 rejected with 400');
}

{
  // 2.3 Invalid month (13)
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ type: 'TOTAL', amount: 10000, year: 2026, month: 13 }),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Month 13 rejected with 400');
}

{
  // 2.4 Missing categoryId for CATEGORY budget
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ type: 'CATEGORY', amount: 5000, year: 2026, month: 9 }),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Missing categoryId for CATEGORY budget rejected with 400');
}

{
  // 2.5 Supplying categoryId for TOTAL budget
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ type: 'TOTAL', categoryId: foodCat.id, amount: 20000, year: 2026, month: 9 }),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: categoryId supplied for TOTAL budget rejected with 400');
}

{
  // 2.6 Supplying another user's category
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ type: 'CATEGORY', categoryId: userBCategoryId, amount: 5000, year: 2026, month: 9 }),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Inaccessible category ID rejected with 400');
}

{
  // 2.7 Supplying nonexistent category ID
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ type: 'CATEGORY', categoryId: '66ed3c101c8e9b4d1a2f9999', amount: 5000, year: 2026, month: 9 }),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Nonexistent category ID rejected with 400');
}

// ----------------------------------------------------
// 3. BUDGET CREATION & UNIQUENESS
// ----------------------------------------------------
console.log('\n--- 3. Testing Budget Creation & Uniqueness ---');

let totalBudgetId = '';
let foodBudgetId = '';

{
  // 3.1 Create TOTAL budget for User A (Sept 2026)
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
      'x-user-id': 'hacker_override',
    },
    body: JSON.stringify({
      userId: 'malicious_user_id',
      type: 'TOTAL',
      amount: 20000,
      year: 2026,
      month: 9,
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.budget.userId, userA.id);
  assert.strictEqual(data.data.budget.type, 'TOTAL');
  assert.strictEqual(data.data.budget.categoryId, null);
  assert.strictEqual(data.data.budget.amount, 20000);
  assert.strictEqual(data.data.budget.year, 2026);
  assert.strictEqual(data.data.budget.month, 9);

  totalBudgetId = data.data.budget.id;
  console.log('✔ Creation: User A created monthly TOTAL budget (201)');
}

{
  // 3.2 Duplicate TOTAL budget for same user/period -> 409 Conflict
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      type: 'TOTAL',
      amount: 25000,
      year: 2026,
      month: 9,
    }),
  });
  assert.strictEqual(res.status, 409, 'Duplicate TOTAL budget must return 409 Conflict');
  console.log('✔ Uniqueness: Duplicate TOTAL budget rejected with 409 Conflict');
}

{
  // 3.3 Create CATEGORY budget for User A (Food, Sept 2026)
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      type: 'CATEGORY',
      categoryId: foodCat.id,
      amount: 5000,
      year: 2026,
      month: 9,
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.data.budget.type, 'CATEGORY');
  assert.strictEqual(data.data.budget.categoryId, foodCat.id);
  assert.strictEqual(data.data.budget.amount, 5000);

  foodBudgetId = data.data.budget.id;
  console.log('✔ Creation: User A created Food CATEGORY budget (201)');
}

{
  // 3.4 Duplicate CATEGORY budget for same user/category/period -> 409 Conflict
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      type: 'CATEGORY',
      categoryId: foodCat.id,
      amount: 6000,
      year: 2026,
      month: 9,
    }),
  });
  assert.strictEqual(res.status, 409, 'Duplicate CATEGORY budget must return 409 Conflict');
  console.log('✔ Uniqueness: Duplicate CATEGORY budget rejected with 409 Conflict');
}

{
  // 3.5 Different category budget for same user in same month -> Allowed
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      type: 'CATEGORY',
      categoryId: transportCat.id,
      amount: 2000,
      year: 2026,
      month: 9,
    }),
  });
  assert.strictEqual(res.status, 201);
  console.log('✔ Multi-Category: User A created Transport budget in same month (201)');
}

{
  // 3.6 User B can create a budget for the same category in the same month (independent tenant)
  const res = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
    body: JSON.stringify({
      type: 'CATEGORY',
      categoryId: foodCat.id,
      amount: 7000,
      year: 2026,
      month: 9,
    }),
  });
  assert.strictEqual(res.status, 201);
  console.log('✔ Multi-Tenant: User B independently created Food budget in same month (201)');
}

// ----------------------------------------------------
// 4. CROSS-TENANT ACCESS CONTROL
// ----------------------------------------------------
console.log('\n--- 4. Testing Cross-Tenant Access Control ---');

{
  // 4.1 User B attempts to view User A's budget -> 404 Not Found
  const res = await fetch(`${BASE_URL}/budgets/${foodBudgetId}`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  assert.strictEqual(res.status, 404);
  console.log('✔ Privacy: User B viewing User A budget returns 404 Not Found');
}

{
  // 4.2 User B attempts to update User A's budget -> 404 Not Found
  const res = await fetch(`${BASE_URL}/budgets/${foodBudgetId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
    body: JSON.stringify({ amount: 99999 }),
  });
  assert.strictEqual(res.status, 404);
  console.log('✔ Ownership: User B cannot update User A budget (404 Not Found)');
}

{
  // 4.3 User B attempts to delete User A's budget -> 404 Not Found
  const res = await fetch(`${BASE_URL}/budgets/${foodBudgetId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  assert.strictEqual(res.status, 404);
  console.log('✔ Ownership: User B cannot delete User A budget (404 Not Found)');
}

// ----------------------------------------------------
// 5. BUDGET UPDATES
// ----------------------------------------------------
console.log('\n--- 5. Testing Budget Updates ---');

{
  // 5.1 User A updates amount
  const res = await fetch(`${BASE_URL}/budgets/${foodBudgetId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      amount: 5500,
      type: 'TOTAL', // Must be ignored
      year: 2025, // Must be ignored
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.budget.amount, 5500);
  assert.strictEqual(data.data.budget.type, 'CATEGORY', 'Type must not change');
  assert.strictEqual(data.data.budget.year, 2026, 'Year must not change');
  console.log('✔ Update: Amount updated to 5500; immutable fields protected');
}

// ----------------------------------------------------
// 6. DYNAMIC BUDGET PROGRESS & SPENDING AGGREGATION
// ----------------------------------------------------
console.log('\n--- 6. Testing Dynamic Budget Progress & MongoDB Aggregation ---');

// Target month: September 2026
const YEAR = 2026;
const MONTH = 9;

{
  // 6.1 Check initial progress before expenses (Food budget = 5500, Transport budget = 2000, Total = 20000)
  const res = await fetch(`${BASE_URL}/budgets/progress?year=${YEAR}&month=${MONTH}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.totalBudget.spent, 0);
  assert.strictEqual(data.data.totalBudget.remaining, 20000);
  assert.strictEqual(data.data.totalBudget.percentageUsed, 0);
  assert.strictEqual(data.data.totalBudget.isOverBudget, false);

  const foodProg = data.data.categoryBudgets.find((b) => b.budget.id === foodBudgetId);
  assert.ok(foodProg, 'Food budget progress item must exist');
  assert.strictEqual(foodProg.spent, 0);
  assert.strictEqual(foodProg.remaining, 5500);
  assert.strictEqual(foodProg.amountOverBudget, 0);
  assert.strictEqual(foodProg.isOverBudget, false);
  console.log('✔ Progress: Initial 0-spending state computed cleanly');
}

let exp1Id = '';
let exp2Id = '';

{
  // 6.2 Add an expense of ₹2,000 for Food in Sept 2026
  const expRes = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      amount: 2000,
      categoryId: foodCat.id,
      paymentMethod: 'UPI',
      date: '2026-09-05T12:00:00.000Z',
    }),
  });
  const expData = await expRes.json();
  exp1Id = expData.data.expense.id;

  // Verify progress dynamically reflects the new expense
  const progRes = await fetch(`${BASE_URL}/budgets/progress?year=${YEAR}&month=${MONTH}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const progData = await progRes.json();
  assert.strictEqual(progData.data.totalBudget.spent, 2000);
  assert.strictEqual(progData.data.totalBudget.remaining, 18000);
  assert.strictEqual(progData.data.totalBudget.percentageUsed, 10);

  const foodProg = progData.data.categoryBudgets.find((b) => b.budget.id === foodBudgetId);
  assert.strictEqual(foodProg.spent, 2000);
  assert.strictEqual(foodProg.remaining, 3500); // 5500 - 2000
  assert.strictEqual(foodProg.amountOverBudget, 0);
  assert.strictEqual(foodProg.isOverBudget, false);
  assert.strictEqual(foodProg.percentageUsed, 36.36); // (2000/5500)*100 = 36.36%
  console.log('✔ Dynamic: Budget progress automatically updated after first expense (₹2,000)');
}

{
  // 6.3 Add a second expense of ₹4,000 for Food -> Exceeds budget (5500 < 6000)
  const expRes = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      amount: 4000,
      categoryId: foodCat.id,
      paymentMethod: 'UPI',
      date: '2026-09-15T18:00:00.000Z',
    }),
  });
  const expData = await expRes.json();
  exp2Id = expData.data.expense.id;

  const progRes = await fetch(`${BASE_URL}/budgets/progress?year=${YEAR}&month=${MONTH}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const progData = await progRes.json();
  const foodProg = progData.data.categoryBudgets.find((b) => b.budget.id === foodBudgetId);

  assert.strictEqual(foodProg.spent, 6000);
  assert.strictEqual(foodProg.remaining, 0, 'Remaining should be capped at 0 when over budget');
  assert.strictEqual(foodProg.amountOverBudget, 500); // 6000 - 5500
  assert.strictEqual(foodProg.isOverBudget, true);
  assert.strictEqual(foodProg.percentageUsed, 109.09); // (6000/5500)*100
  console.log('✔ Over-Budget: Over-budget condition detected (remaining: 0, amountOverBudget: 500, isOverBudget: true)');
}

{
  // 6.4 Update the second expense to ₹2,500 (total spent = 4500, under budget 5500)
  await fetch(`${BASE_URL}/expenses/${exp2Id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ amount: 2500 }),
  });

  const progRes = await fetch(`${BASE_URL}/budgets/progress?year=${YEAR}&month=${MONTH}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const progData = await progRes.json();
  const foodProg = progData.data.categoryBudgets.find((b) => b.budget.id === foodBudgetId);

  assert.strictEqual(foodProg.spent, 4500);
  assert.strictEqual(foodProg.remaining, 1000); // 5500 - 4500
  assert.strictEqual(foodProg.amountOverBudget, 0);
  assert.strictEqual(foodProg.isOverBudget, false);
  assert.strictEqual(foodProg.percentageUsed, 81.82);
  console.log('✔ Dynamic: Budget progress automatically recalculated upon expense update');
}

{
  // 6.5 Delete the second expense (total spent = 2000)
  await fetch(`${BASE_URL}/expenses/${exp2Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });

  const progRes = await fetch(`${BASE_URL}/budgets/progress?year=${YEAR}&month=${MONTH}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const progData = await progRes.json();
  const foodProg = progData.data.categoryBudgets.find((b) => b.budget.id === foodBudgetId);

  assert.strictEqual(foodProg.spent, 2000);
  assert.strictEqual(foodProg.remaining, 3500);
  assert.strictEqual(foodProg.percentageUsed, 36.36);
  console.log('✔ Dynamic: Budget progress automatically recalculated upon expense deletion');
}

// ----------------------------------------------------
// 7. CURRENT MONTH SUMMARY (GET /api/budgets/current)
// ----------------------------------------------------
console.log('\n--- 7. Testing Current Month Dashboard Summary ---');

{
  const res = await fetch(`${BASE_URL}/budgets/current`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.ok(data.data.year >= 2026);
  assert.ok(data.data.month >= 1 && data.data.month <= 12);
  assert.ok(Array.isArray(data.data.categoryBudgets));
  console.log('✔ Current Summary: GET /api/budgets/current returns structured summary');
}

// ----------------------------------------------------
// 8. DELETION & CLEANUP
// ----------------------------------------------------
console.log('\n--- 8. Testing Budget Deletion ---');

{
  const res = await fetch(`${BASE_URL}/budgets/${foodBudgetId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.data, null);
  console.log('✔ Deletion: DELETE /api/budgets/:id returns 200 with null data');

  // Verify subsequent GET returns 404
  const getRes = await fetch(`${BASE_URL}/budgets/${foodBudgetId}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(getRes.status, 404);
  console.log('✔ Deletion: Confirmed resource removed (404 on subsequent GET)');
}

// ----------------------------------------------------
// 9. API /v1 ALIAS COMPATIBILITY
// ----------------------------------------------------
console.log('\n--- 9. Testing /api/v1/budgets Alias ---');

{
  const res = await fetch(`${BASE_V1_URL}/budgets`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.data.budgets));
  console.log('✔ Alias: /api/v1/budgets seamlessly mirrors /api/budgets');
}

console.log('\n===================================================');
console.log('ALL BUDGET INTEGRATION TESTS PASSED SUCCESSFULLY!');
console.log('===================================================\n');
