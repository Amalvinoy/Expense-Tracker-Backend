import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';
const BASE_V1_URL = 'http://localhost:5000/api/v1';

console.log('====================================================');
console.log('RUNNING EXPENSE TRACKER BACKEND REPORTS MODULE TESTS');
console.log('====================================================\n');

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

const userA = await createTestUser('rptUserA');
const userB = await createTestUser('rptUserB');

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

// User B creates a private custom category
const userBCatRes = await fetch(`${BASE_URL}/categories`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
  body: JSON.stringify({ name: 'User B Secret Category', icon: 'shield', color: '#6366F1' }),
});
const userBCatBody = await userBCatRes.json();
const userBCategoryId = userBCatBody.data.category.id;

// ----------------------------------------------------
// 1. AUTHENTICATION GUARDS
// ----------------------------------------------------
console.log('--- 1. Testing Authentication Guards ---');

{
  const endpoints = ['', '/summary', '/categories', '/payment-methods', '/monthly', '/daily'];
  for (const ep of endpoints) {
    const res = await fetch(`${BASE_URL}/reports${ep}`);
    assert.strictEqual(res.status, 401, `GET /reports${ep} without auth must return 401`);
  }
  console.log('✔ Auth Guard: All /reports endpoints reject unauthenticated access with 401');
}

// ----------------------------------------------------
// 2. QUERY VALIDATION TESTS
// ----------------------------------------------------
console.log('\n--- 2. Testing Query Validation ---');

{
  // 2.1 Invalid startDate format
  const res = await fetch(`${BASE_URL}/reports?startDate=invalid-date`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 400, 'Invalid startDate must return 400');
  console.log('✔ Validation: Invalid startDate format rejected with 400');
}

{
  // 2.2 Invalid endDate format
  const res = await fetch(`${BASE_URL}/reports?endDate=invalid-date`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 400, 'Invalid endDate must return 400');
  console.log('✔ Validation: Invalid endDate format rejected with 400');
}

{
  // 2.3 startDate > endDate
  const res = await fetch(`${BASE_URL}/reports?startDate=2026-10-01&endDate=2026-09-01`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 400, 'startDate > endDate must return 400');
  console.log('✔ Validation: startDate > endDate rejected with 400');
}

{
  // 2.4 Date range exceeding max allowed days (>731 days)
  const res = await fetch(`${BASE_URL}/reports?startDate=2020-01-01&endDate=2024-01-01`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 400, 'Date range > 731 days must return 400');
  console.log('✔ Validation: Date range > 731 days (~2 years) rejected with 400');
}

{
  // 2.5 Invalid categoryId format
  const res = await fetch(`${BASE_URL}/reports?categoryId=123nothex`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 400, 'Malformed categoryId must return 400');
  console.log('✔ Validation: Malformed categoryId format rejected with 400');
}

{
  // 2.6 Invalid paymentMethod
  const res = await fetch(`${BASE_URL}/reports?paymentMethod=BITCOIN`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 400, 'Unsupported paymentMethod must return 400');
  console.log('✔ Validation: Unsupported paymentMethod rejected with 400');
}

{
  // 2.7 Inaccessible categoryId (belonging to another user)
  const res = await fetch(`${BASE_URL}/reports?categoryId=${userBCategoryId}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 404, 'Querying with another user private category must return 404');
  console.log('✔ Security Guard: Filtering by another user private category returns 404');
}

// ----------------------------------------------------
// 3. EMPTY STATE VERIFICATION
// ----------------------------------------------------
console.log('\n--- 3. Testing Empty State ---');

{
  const res = await fetch(`${BASE_URL}/reports?startDate=2026-09-01&endDate=2026-10-01`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200, 'Empty reports request should succeed');
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.summary.totalSpent, 0);
  assert.strictEqual(body.data.summary.transactionCount, 0);
  assert.strictEqual(body.data.summary.averageExpense, 0);
  assert.strictEqual(body.data.summary.highestExpense, 0);
  assert.strictEqual(body.data.summary.lowestExpense, 0);
  assert.deepStrictEqual(body.data.categoryBreakdown, []);
  assert.deepStrictEqual(body.data.paymentMethodBreakdown, []);
  assert.deepStrictEqual(body.data.monthlyTrend, []);
  assert.deepStrictEqual(body.data.dailyTrend, []);
  console.log('✔ Empty State: Returns clean zeroed metrics and empty arrays');
}

// ----------------------------------------------------
// 4. SEEDING EXPENSES FOR USER A & USER B
// ----------------------------------------------------
console.log('\n--- 4. Seeding Expenses for Analytics ---');

async function createExpense(token, { amount, categoryId, paymentMethod, date, note }) {
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount, categoryId, paymentMethod, date, note }),
  });
  const body = await res.json();
  assert.strictEqual(res.status, 201, `Failed to create expense: ${JSON.stringify(body)}`);
  return body.data.expense;
}

// User A expenses in Sept 2026:
// 1. Food, ₹1000, UPI, 2026-09-05
await createExpense(userA.token, {
  amount: 1000,
  categoryId: foodCat.id,
  paymentMethod: 'UPI',
  date: '2026-09-05T12:00:00.000Z',
  note: 'Lunch with friends',
});
// 2. Food, ₹2000, CASH, 2026-09-05
await createExpense(userA.token, {
  amount: 2000,
  categoryId: foodCat.id,
  paymentMethod: 'CASH',
  date: '2026-09-05T19:00:00.000Z',
  note: 'Dinner banquet',
});
// 3. Transport, ₹500, UPI, 2026-09-10
await createExpense(userA.token, {
  amount: 500,
  categoryId: transportCat.id,
  paymentMethod: 'UPI',
  date: '2026-09-10T08:30:00.000Z',
  note: 'Cab fare',
});
// 4. Transport, ₹1500, CREDIT_CARD, 2026-09-20
await createExpense(userA.token, {
  amount: 1500,
  categoryId: transportCat.id,
  paymentMethod: 'CREDIT_CARD',
  date: '2026-09-20T14:00:00.000Z',
  note: 'Flight ticket portion',
});

// User A expense in Oct 2026 (outside Sept):
// 5. Food, ₹3000, UPI, 2026-10-02
await createExpense(userA.token, {
  amount: 3000,
  categoryId: foodCat.id,
  paymentMethod: 'UPI',
  date: '2026-10-02T10:00:00.000Z',
  note: 'Groceries store',
});

// User B expense (to test cross-tenant isolation):
await createExpense(userB.token, {
  amount: 9999,
  categoryId: foodCat.id,
  paymentMethod: 'UPI',
  date: '2026-09-05T12:00:00.000Z',
  note: 'User B private meal',
});

console.log('✔ Expenses Seeded: 4 expenses in Sept (User A), 1 in Oct (User A), 1 in Sept (User B)');

// ----------------------------------------------------
// 5. COMBINED REPORTS ENDPOINT CALCULATIONS
// ----------------------------------------------------
console.log('\n--- 5. Testing Combined Reports (GET /api/reports) ---');

{
  const res = await fetch(`${BASE_URL}/reports?startDate=2026-09-01&endDate=2026-10-01`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.success, true);

  const { summary, categoryBreakdown, paymentMethodBreakdown, monthlyTrend, dailyTrend } = body.data;

  // 5.1 Summary verification: total = 1000 + 2000 + 500 + 1500 = 5000
  assert.strictEqual(summary.totalSpent, 5000);
  assert.strictEqual(summary.transactionCount, 4);
  assert.strictEqual(summary.averageExpense, 1250);
  assert.strictEqual(summary.highestExpense, 2000);
  assert.strictEqual(summary.lowestExpense, 500);
  console.log('✔ Summary Math: totalSpent=5000, count=4, avg=1250, highest=2000, lowest=500');

  // 5.2 Category Breakdown:
  // Food: 3000 (60%), Transport: 2000 (40%)
  assert.strictEqual(categoryBreakdown.length, 2);
  assert.strictEqual(categoryBreakdown[0].categoryName, 'Food');
  assert.strictEqual(categoryBreakdown[0].amount, 3000);
  assert.strictEqual(categoryBreakdown[0].percentage, 60.0);
  assert.strictEqual(categoryBreakdown[0].transactionCount, 2);

  assert.strictEqual(categoryBreakdown[1].categoryName, 'Transport');
  assert.strictEqual(categoryBreakdown[1].amount, 2000);
  assert.strictEqual(categoryBreakdown[1].percentage, 40.0);
  assert.strictEqual(categoryBreakdown[1].transactionCount, 2);
  console.log('✔ Category Breakdown: Sorted descending with exact percentages (Food: 60%, Transport: 40%)');

  // 5.3 Payment Method Breakdown:
  // CASH: 2000 (40%), CREDIT_CARD: 1500 (30%), UPI: 1500 (30%)
  assert.strictEqual(paymentMethodBreakdown.length, 3);
  assert.strictEqual(paymentMethodBreakdown[0].paymentMethod, 'CASH');
  assert.strictEqual(paymentMethodBreakdown[0].amount, 2000);
  assert.strictEqual(paymentMethodBreakdown[0].percentage, 40.0);
  console.log('✔ Payment Method Breakdown: Sorted descending with percentages');

  // 5.4 Monthly Trend:
  // Sept 2026: 5000
  assert.strictEqual(monthlyTrend.length, 1);
  assert.strictEqual(monthlyTrend[0].year, 2026);
  assert.strictEqual(monthlyTrend[0].month, 9);
  assert.strictEqual(monthlyTrend[0].label, 'Sep 2026');
  assert.strictEqual(monthlyTrend[0].amount, 5000);
  assert.strictEqual(monthlyTrend[0].transactionCount, 4);
  console.log('✔ Monthly Trend: Formatted label Sep 2026, amount 5000, count 4');

  // 5.5 Daily Trend:
  // 2026-09-05: 3000 (count 2), 2026-09-10: 500 (count 1), 2026-09-20: 1500 (count 1)
  assert.strictEqual(dailyTrend.length, 3);
  assert.strictEqual(dailyTrend[0].date, '2026-09-05');
  assert.strictEqual(dailyTrend[0].amount, 3000);
  assert.strictEqual(dailyTrend[0].transactionCount, 2);

  assert.strictEqual(dailyTrend[1].date, '2026-09-10');
  assert.strictEqual(dailyTrend[1].amount, 500);
  assert.strictEqual(dailyTrend[1].transactionCount, 1);

  assert.strictEqual(dailyTrend[2].date, '2026-09-20');
  assert.strictEqual(dailyTrend[2].amount, 1500);
  assert.strictEqual(dailyTrend[2].transactionCount, 1);
  console.log('✔ Daily Trend: Chronological grouping by day (Sep 05: 3000, Sep 10: 500, Sep 20: 1500)');
}

// ----------------------------------------------------
// 6. FILTERING (CATEGORY & PAYMENT METHOD)
// ----------------------------------------------------
console.log('\n--- 6. Testing Report Filters ---');

{
  // 6.1 Filter by Category (Food only)
  const res = await fetch(
    `${BASE_URL}/reports?startDate=2026-09-01&endDate=2026-10-01&categoryId=${foodCat.id}`,
    { headers: { Authorization: `Bearer ${userA.token}` } }
  );
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.data.summary.totalSpent, 3000);
  assert.strictEqual(body.data.summary.transactionCount, 2);
  assert.strictEqual(body.data.categoryBreakdown.length, 1);
  assert.strictEqual(body.data.categoryBreakdown[0].categoryName, 'Food');
  console.log('✔ Filter: categoryId correctly scopes all report analytics');
}

{
  // 6.2 Filter by Payment Method (UPI only)
  const res = await fetch(
    `${BASE_URL}/reports?startDate=2026-09-01&endDate=2026-10-01&paymentMethod=UPI`,
    { headers: { Authorization: `Bearer ${userA.token}` } }
  );
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  // User A has 1000 + 500 = 1500 via UPI in Sept
  assert.strictEqual(body.data.summary.totalSpent, 1500);
  assert.strictEqual(body.data.summary.transactionCount, 2);
  assert.strictEqual(body.data.paymentMethodBreakdown.length, 1);
  assert.strictEqual(body.data.paymentMethodBreakdown[0].paymentMethod, 'UPI');
  console.log('✔ Filter: paymentMethod correctly scopes all report analytics');
}

// ----------------------------------------------------
// 7. MULTI-MONTH TREND SPAN
// ----------------------------------------------------
console.log('\n--- 7. Testing Multi-Month Trend ---');

{
  // Spanning Sept and Oct 2026
  const res = await fetch(`${BASE_URL}/reports/monthly?startDate=2026-09-01&endDate=2026-11-01`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  const trend = body.data.monthlyTrend;
  assert.strictEqual(trend.length, 2);
  assert.strictEqual(trend[0].label, 'Sep 2026');
  assert.strictEqual(trend[0].amount, 5000);
  assert.strictEqual(trend[1].label, 'Oct 2026');
  assert.strictEqual(trend[1].amount, 3000);
  console.log('✔ Multi-Month Trend: Correctly returns consecutive months (Sep 2026: 5000, Oct 2026: 3000)');
}

// ----------------------------------------------------
// 8. FOCUSED ENDPOINTS & DEDICATED ROUTES
// ----------------------------------------------------
console.log('\n--- 8. Testing Dedicated Endpoints ---');

{
  // 8.1 GET /api/reports/summary
  const res = await fetch(`${BASE_URL}/reports/summary?startDate=2026-09-01&endDate=2026-10-01`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.data.summary.totalSpent, 5000);
  console.log('✔ Focused Endpoint: GET /api/reports/summary returns summary envelope');
}

{
  // 8.2 GET /api/reports/categories
  const res = await fetch(`${BASE_URL}/reports/categories?startDate=2026-09-01&endDate=2026-10-01`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.data.categoryBreakdown.length, 2);
  console.log('✔ Focused Endpoint: GET /api/reports/categories returns categoryBreakdown envelope');
}

{
  // 8.3 GET /api/reports/payment-methods
  const res = await fetch(
    `${BASE_URL}/reports/payment-methods?startDate=2026-09-01&endDate=2026-10-01`,
    { headers: { Authorization: `Bearer ${userA.token}` } }
  );
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.data.paymentMethodBreakdown.length, 3);
  console.log('✔ Focused Endpoint: GET /api/reports/payment-methods returns payment breakdown envelope');
}

{
  // 8.4 GET /api/reports/daily
  const res = await fetch(`${BASE_URL}/reports/daily?startDate=2026-09-01&endDate=2026-10-01`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.data.dailyTrend.length, 3);
  console.log('✔ Focused Endpoint: GET /api/reports/daily returns daily trend envelope');
}

// ----------------------------------------------------
// 9. CROSS-TENANT DATA ISOLATION
// ----------------------------------------------------
console.log('\n--- 9. Testing Cross-Tenant Data Isolation ---');

{
  // User B's report in Sept 2026
  const resB = await fetch(`${BASE_URL}/reports?startDate=2026-09-01&endDate=2026-10-01`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  const bodyB = await resB.json();
  assert.strictEqual(resB.status, 200);
  // User B has only 1 expense of 9999
  assert.strictEqual(bodyB.data.summary.totalSpent, 9999);
  assert.strictEqual(bodyB.data.summary.transactionCount, 1);

  // User A's report does NOT include 9999
  const resA = await fetch(`${BASE_URL}/reports?startDate=2026-09-01&endDate=2026-10-01`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const bodyA = await resA.json();
  assert.strictEqual(bodyA.data.summary.totalSpent, 5000);
  assert.strictEqual(bodyA.data.summary.transactionCount, 4);

  console.log('✔ Tenant Isolation: User A and User B spendings and counts are strictly isolated');
}

// ----------------------------------------------------
// 10. API V1 ROUTE ALIASES
// ----------------------------------------------------
console.log('\n--- 10. Testing API v1 Aliases ---');

{
  const res = await fetch(`${BASE_V1_URL}/reports?startDate=2026-09-01&endDate=2026-10-01`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200, 'GET /api/v1/reports must return 200');
  assert.strictEqual(body.data.summary.totalSpent, 5000);
  console.log('✔ API v1 Alias: /api/v1/reports works identically');
}

console.log('\n====================================================');
console.log('ALL REPORT MODULE INTEGRATION TESTS PASSED (28/28)');
console.log('====================================================\n');
