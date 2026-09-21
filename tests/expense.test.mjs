import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';
const BASE_V1_URL = 'http://localhost:5000/api/v1';

console.log('====================================================');
console.log('RUNNING EXPENSE TRACKER BACKEND EXPENSE MODULE TESTS');
console.log('====================================================\n');

// Helper to create test user and retrieve token
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
  assert.strictEqual(res.status, 201, `Failed to create test user: ${JSON.stringify(body)}`);
  return {
    id: body.data.user.id,
    token: body.data.token,
    email,
  };
}

const userA = await createTestUser('userA');
const userB = await createTestUser('userB');

console.log(`Initialized Test Users:`);
console.log(`- User A: ${userA.id} (${userA.email})`);
console.log(`- User B: ${userB.id} (${userB.email})\n`);

// Fetch seeded default categories
const catRes = await fetch(`${BASE_URL}/categories`, {
  headers: { Authorization: `Bearer ${userA.token}` },
});
const catBody = await catRes.json();
assert.strictEqual(catRes.status, 200, 'Should fetch categories');
const foodCat = catBody.data.categories.find((c) => c.name === 'Food');
const billsCat = catBody.data.categories.find((c) => c.name === 'Bills');
const shoppingCat = catBody.data.categories.find((c) => c.name === 'Shopping');

const CATEGORY_FOOD = foodCat ? foodCat.id : '66ed3c101c8e9b4d1a2f3101';
const CATEGORY_BILLS = billsCat ? billsCat.id : '66ed3c101c8e9b4d1a2f3102';
const CATEGORY_SHOPPING = shoppingCat ? shoppingCat.id : '66ed3c101c8e9b4d1a2f3103';

// ----------------------------------------------------
// 1. AUTHENTICATION GUARDS (UNAUTHENTICATED ACCESS)
// ----------------------------------------------------
console.log('--- 1. Testing Authentication Guards ---');

{
  // 1.1 POST /api/expenses without auth
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 100, categoryId: CATEGORY_FOOD, paymentMethod: 'UPI', date: '2026-09-19' }),
  });
  assert.strictEqual(res.status, 401, 'Unauthenticated POST /expenses must return 401');
  console.log('✔ Auth Guard: POST /api/expenses without token rejected with 401');
}

{
  // 1.2 GET /api/expenses without auth
  const res = await fetch(`${BASE_URL}/expenses`);
  assert.strictEqual(res.status, 401, 'Unauthenticated GET /expenses must return 401');
  console.log('✔ Auth Guard: GET /api/expenses without token rejected with 401');
}

{
  // 1.3 GET /api/expenses/:id without auth
  const res = await fetch(`${BASE_URL}/expenses/${CATEGORY_FOOD}`);
  assert.strictEqual(res.status, 401, 'Unauthenticated GET /expenses/:id must return 401');
  console.log('✔ Auth Guard: GET /api/expenses/:id without token rejected with 401');
}

{
  // 1.4 PUT /api/expenses/:id without auth
  const res = await fetch(`${BASE_URL}/expenses/${CATEGORY_FOOD}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 150 }),
  });
  assert.strictEqual(res.status, 401, 'Unauthenticated PUT /expenses/:id must return 401');
  console.log('✔ Auth Guard: PUT /api/expenses/:id without token rejected with 401');
}

{
  // 1.5 DELETE /api/expenses/:id without auth
  const res = await fetch(`${BASE_URL}/expenses/${CATEGORY_FOOD}`, {
    method: 'DELETE',
  });
  assert.strictEqual(res.status, 401, 'Unauthenticated DELETE /expenses/:id must return 401');
  console.log('✔ Auth Guard: DELETE /api/expenses/:id without token rejected with 401');
}

// ----------------------------------------------------
// 2. VALIDATION TESTS
// ----------------------------------------------------
console.log('\n--- 2. Testing Request Validation ---');

{
  // 2.1 Missing amount
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      categoryId: CATEGORY_FOOD,
      paymentMethod: 'UPI',
      date: '2026-09-19',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 400);
  assert.ok(data.errors.some((e) => e.field === 'amount'));
  console.log('✔ Validation: Missing amount rejected with 400');
}

{
  // 2.2 Amount = 0
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      amount: 0,
      categoryId: CATEGORY_FOOD,
      paymentMethod: 'UPI',
      date: '2026-09-19',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 400);
  assert.ok(data.errors.some((e) => e.field === 'amount'));
  console.log('✔ Validation: Amount = 0 rejected with 400');
}

{
  // 2.3 Negative amount
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      amount: -50,
      categoryId: CATEGORY_FOOD,
      paymentMethod: 'UPI',
      date: '2026-09-19',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 400);
  assert.ok(data.errors.some((e) => e.field === 'amount'));
  console.log('✔ Validation: Negative amount rejected with 400');
}

{
  // 2.4 Invalid categoryId
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      amount: 100,
      categoryId: 'invalid-category-id',
      paymentMethod: 'UPI',
      date: '2026-09-19',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 400);
  assert.ok(data.errors.some((e) => e.field === 'categoryId'));
  console.log('✔ Validation: Invalid categoryId format rejected with 400');
}

{
  // 2.5 Invalid paymentMethod
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      amount: 100,
      categoryId: CATEGORY_FOOD,
      paymentMethod: 'BITCOIN',
      date: '2026-09-19',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 400);
  assert.ok(data.errors.some((e) => e.field === 'paymentMethod'));
  console.log('✔ Validation: Invalid paymentMethod rejected with 400');
}

{
  // 2.6 Invalid date
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      amount: 100,
      categoryId: CATEGORY_FOOD,
      paymentMethod: 'UPI',
      date: 'not-a-valid-date',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 400);
  assert.ok(data.errors.some((e) => e.field === 'date'));
  console.log('✔ Validation: Invalid date rejected with 400');
}

{
  // 2.7 Excessively long note (> 500 chars)
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      amount: 100,
      categoryId: CATEGORY_FOOD,
      paymentMethod: 'UPI',
      date: '2026-09-19',
      note: 'A'.repeat(501),
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 400);
  assert.ok(data.errors.some((e) => e.field === 'note'));
  console.log('✔ Validation: Note exceeding 500 chars rejected with 400');
}

{
  // 2.8 Invalid expense ID route parameter
  const res = await fetch(`${BASE_URL}/expenses/not-a-valid-id`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Invalid expense ID param rejected with 400');
}

{
  // 2.9 Empty update body
  const res = await fetch(`${BASE_URL}/expenses/${CATEGORY_FOOD}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({}),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Empty update payload rejected with 400');
}

{
  // 2.10 Query validation: limit > 100
  const res = await fetch(`${BASE_URL}/expenses?limit=150`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Query limit > 100 rejected with 400');
}

{
  // 2.11 Query validation: invalid sort field
  const res = await fetch(`${BASE_URL}/expenses?sortBy=nonExistentField`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Invalid sortBy field rejected with 400');
}

// ----------------------------------------------------
// 3. EXPENSE CREATION & IDENTITY ISOLATION
// ----------------------------------------------------
console.log('\n--- 3. Testing Expense Creation & Identity Enforcement ---');

let userAExpenseId = '';

{
  // 3.1 Create Expense with User A
  // Also attempt to inject malicious userId and arbitrary x-user-id header
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
      'x-user-id': 'hacker_user_id_override',
    },
    body: JSON.stringify({
      userId: 'spoofed_user_id_in_body',
      amount: 450.50,
      categoryId: CATEGORY_FOOD,
      categoryNameSnapshot: 'Food & Dining',
      paymentMethod: 'UPI',
      note: 'Lunch with colleagues',
      date: '2026-09-19T13:00:00.000Z',
    }),
  });

  const data = await res.json();
  assert.strictEqual(res.status, 201, `Failed to create expense: ${JSON.stringify(data)}`);
  assert.strictEqual(data.success, true);
  assert.ok(data.data.expense.id, 'Created expense must have an id');
  assert.strictEqual(data.data.expense.userId, userA.id, 'Expense userId MUST match authenticated JWT user');
  assert.strictEqual(data.data.expense.amount, 450.50);
  assert.strictEqual(data.data.expense.categoryNameSnapshot, 'Food', 'Must be actual DB category name');

  userAExpenseId = data.data.expense.id;
  console.log('✔ Creation: Expense created (201) with verified JWT user ownership');
  console.log('✔ Security: Client body userId and x-user-id header safely ignored');
}

// ----------------------------------------------------
// 4. CROSS-TENANT ACCESS CONTROL & OWNERSHIP
// ----------------------------------------------------
console.log('\n--- 4. Testing Cross-Tenant Access Control ---');

{
  // 4.1 User A can read their own expense
  const res = await fetch(`${BASE_URL}/expenses/${userAExpenseId}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.expense.id, userAExpenseId);
  console.log('✔ Ownership: User A successfully retrieves own expense (200)');
}

{
  // 4.2 User B attempts to read User A's expense -> 404 Not Found (privacy preserving)
  const res = await fetch(`${BASE_URL}/expenses/${userAExpenseId}`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  assert.strictEqual(res.status, 404, 'User B reading User A expense must return 404');
  console.log('✔ Privacy: User B reading User A expense returns 404 Not Found');
}

{
  // 4.3 User B attempts to update User A's expense -> 404 Not Found
  const res = await fetch(`${BASE_URL}/expenses/${userAExpenseId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userB.token}`,
    },
    body: JSON.stringify({ amount: 9999 }),
  });
  assert.strictEqual(res.status, 404, 'User B updating User A expense must return 404');
  console.log('✔ Ownership: User B cannot update User A expense (404 Not Found)');
}

{
  // 4.4 User B attempts to delete User A's expense -> 404 Not Found
  const res = await fetch(`${BASE_URL}/expenses/${userAExpenseId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  assert.strictEqual(res.status, 404, 'User B deleting User A expense must return 404');
  console.log('✔ Ownership: User B cannot delete User A expense (404 Not Found)');
}

{
  // 4.5 User B lists expenses -> list does NOT contain User A's expense
  const res = await fetch(`${BASE_URL}/expenses`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.expenses.length, 0, 'User B should have 0 expenses');
  console.log('✔ Isolation: User B list query is completely isolated from User A');
}

{
  // 4.6 User A updates their own expense
  const res = await fetch(`${BASE_URL}/expenses/${userAExpenseId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      amount: 520.00,
      note: 'Updated: Lunch + dessert with colleagues',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.expense.amount, 520);
  assert.strictEqual(data.data.expense.note, 'Updated: Lunch + dessert with colleagues');
  assert.strictEqual(data.data.expense.userId, userA.id, 'UserId must remain unchanged');
  console.log('✔ Update: User A successfully updates own expense (200)');
}

// ----------------------------------------------------
// 5. QUERYING, FILTERING, SORTING & PAGINATION
// ----------------------------------------------------
console.log('\n--- 5. Testing Querying, Filtering, Sorting & Pagination ---');

// Seed additional expenses for User A
const seedExpenses = [
  { amount: 100, categoryId: CATEGORY_FOOD, paymentMethod: 'UPI', note: 'Coffee break espresso', date: '2026-09-10T09:00:00.000Z' },
  { amount: 250, categoryId: CATEGORY_FOOD, paymentMethod: 'CASH', note: 'Lunch sandwich deli', date: '2026-09-12T12:30:00.000Z' },
  { amount: 1200, categoryId: CATEGORY_BILLS, paymentMethod: 'CREDIT_CARD', note: 'Electricity bill payment', date: '2026-09-15T15:00:00.000Z' },
  { amount: 450, categoryId: CATEGORY_FOOD, paymentMethod: 'UPI', note: 'Dinner pizza slice', date: '2026-09-18T20:00:00.000Z' },
  { amount: 3000, categoryId: CATEGORY_SHOPPING, paymentMethod: 'BANK_TRANSFER', note: 'Office ergonomic chair', date: '2026-09-19T10:00:00.000Z' },
];

for (const seed of seedExpenses) {
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify(seed),
  });
  assert.strictEqual(res.status, 201);
}
// User A now has 1 (from section 3) + 5 = 6 expenses.

{
  // 5.1 Date Range Filtering (2026-09-12 to 2026-09-16)
  const res = await fetch(
    `${BASE_URL}/expenses?startDate=2026-09-12T00:00:00.000Z&endDate=2026-09-16T23:59:59.000Z`,
    { headers: { Authorization: `Bearer ${userA.token}` } }
  );
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.expenses.length, 2);
  const notes = data.data.expenses.map((e) => e.note);
  assert.ok(notes.includes('Lunch sandwich deli'));
  assert.ok(notes.includes('Electricity bill payment'));
  console.log('✔ Query: Date range filtering correctly filters by startDate and endDate');
}

{
  // 5.2 Category Filtering (CATEGORY_BILLS)
  const res = await fetch(`${BASE_URL}/expenses?categoryId=${CATEGORY_BILLS}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.expenses.length, 1);
  assert.strictEqual(data.data.expenses[0].note, 'Electricity bill payment');
  console.log('✔ Query: Category filter isolates target category');
}

{
  // 5.3 Payment Method Filtering (BANK_TRANSFER)
  const res = await fetch(`${BASE_URL}/expenses?paymentMethod=BANK_TRANSFER`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.expenses.length, 1);
  assert.strictEqual(data.data.expenses[0].amount, 3000);
  console.log('✔ Query: PaymentMethod filter isolates target payment method');
}

{
  // 5.4 Amount Range Filtering (minAmount=200 & maxAmount=500)
  const res = await fetch(`${BASE_URL}/expenses?minAmount=200&maxAmount=500`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.expenses.length, 2); // 250 (sandwich) and 450 (pizza)
  console.log('✔ Query: Amount bounds (minAmount & maxAmount) work correctly');
}

{
  // 5.5 Text Keyword Search (search=pizza)
  const res = await fetch(`${BASE_URL}/expenses?search=pizza`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.expenses.length, 1);
  assert.strictEqual(data.data.expenses[0].note, 'Dinner pizza slice');
  console.log('✔ Query: Keyword search matches substring in note');
}

{
  // 5.6 Pagination (page=1, limit=2 and page=2, limit=2)
  const page1Res = await fetch(`${BASE_URL}/expenses?page=1&limit=2`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const page1Data = await page1Res.json();
  assert.strictEqual(page1Data.data.expenses.length, 2);
  assert.strictEqual(page1Data.data.pagination.page, 1);
  assert.strictEqual(page1Data.data.pagination.limit, 2);
  assert.strictEqual(page1Data.data.pagination.total, 6);
  assert.strictEqual(page1Data.data.pagination.totalPages, 3);

  const page2Res = await fetch(`${BASE_URL}/expenses?page=2&limit=2`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const page2Data = await page2Res.json();
  assert.strictEqual(page2Data.data.expenses.length, 2);
  assert.strictEqual(page2Data.data.pagination.page, 2);

  // Items on page 1 and page 2 must be mutually exclusive
  const p1Ids = new Set(page1Data.data.expenses.map((e) => e.id));
  for (const item of page2Data.data.expenses) {
    assert.ok(!p1Ids.has(item.id), 'Page 2 should contain different items than Page 1');
  }
  console.log('✔ Pagination: Correct page slice, limit, total count, and totalPages');
}

{
  // 5.7 Sorting by Amount (asc & desc)
  const ascRes = await fetch(`${BASE_URL}/expenses?sortBy=amount&sortOrder=asc&limit=6`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const ascData = await ascRes.json();
  assert.strictEqual(ascData.data.expenses[0].amount, 100, 'Ascending sort should start with lowest amount');

  const descRes = await fetch(`${BASE_URL}/expenses?sortBy=amount&sortOrder=desc&limit=6`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const descData = await descRes.json();
  assert.strictEqual(descData.data.expenses[0].amount, 3000, 'Descending sort should start with highest amount');
  console.log('✔ Sorting: Ascending and descending sort by amount verified');
}

// ----------------------------------------------------
// 6. DELETION & VERIFICATION
// ----------------------------------------------------
console.log('\n--- 6. Testing Expense Deletion ---');

{
  // 6.1 Delete User A expense
  const res = await fetch(`${BASE_URL}/expenses/${userAExpenseId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data, null);
  console.log('✔ Deletion: DELETE /api/expenses/:id returns 200 with null data');

  // 6.2 Confirm expense no longer exists
  const checkRes = await fetch(`${BASE_URL}/expenses/${userAExpenseId}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(checkRes.status, 404, 'Deleted expense should return 404');
  console.log('✔ Deletion: Confirmed resource deleted (404 on subsequent GET)');
}

// ----------------------------------------------------
// 7. API /v1 ALIAS COMPATIBILITY
// ----------------------------------------------------
console.log('\n--- 7. Testing /api/v1/expenses Alias ---');

{
  const res = await fetch(`${BASE_V1_URL}/expenses`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.data.expenses));
  console.log('✔ Alias: /api/v1/expenses seamlessly mirrors /api/expenses');
}

console.log('\n====================================================');
console.log('ALL EXPENSE INTEGRATION TESTS PASSED SUCCESSFULLY!');
console.log('====================================================\n');
