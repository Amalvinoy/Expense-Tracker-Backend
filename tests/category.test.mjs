import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';
const BASE_V1_URL = 'http://localhost:5000/api/v1';

console.log('=====================================================');
console.log('RUNNING EXPENSE TRACKER BACKEND CATEGORY MODULE TESTS');
console.log('=====================================================\n');

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

const userA = await createTestUser('catUserA');
const userB = await createTestUser('catUserB');

console.log('Initialized Test Users:');
console.log(`- User A: ${userA.id} (${userA.email})`);
console.log(`- User B: ${userB.id} (${userB.email})\n`);

// ----------------------------------------------------
// 1. AUTHENTICATION GUARDS
// ----------------------------------------------------
console.log('--- 1. Testing Authentication Guards ---');

{
  const res = await fetch(`${BASE_URL}/categories`);
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: GET /api/categories without token rejected with 401');
}

{
  const res = await fetch(`${BASE_URL}/categories/66ed3c101c8e9b4d1a2f3101`);
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: GET /api/categories/:id without token rejected with 401');
}

{
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Coffee', icon: 'coffee', color: '#8B4513' }),
  });
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: POST /api/categories without token rejected with 401');
}

{
  const res = await fetch(`${BASE_URL}/categories/66ed3c101c8e9b4d1a2f3101`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'New Name' }),
  });
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: PUT /api/categories/:id without token rejected with 401');
}

{
  const res = await fetch(`${BASE_URL}/categories/66ed3c101c8e9b4d1a2f3101`, {
    method: 'DELETE',
  });
  assert.strictEqual(res.status, 401);
  console.log('✔ Auth Guard: DELETE /api/categories/:id without token rejected with 401');
}

// ----------------------------------------------------
// 2. SYSTEM DEFAULT CATEGORIES
// ----------------------------------------------------
console.log('\n--- 2. Testing System Default Categories ---');

let defaultFoodCategory = null;

{
  // 2.1 Fetch categories and verify default categories exist
  const res = await fetch(`${BASE_URL}/categories`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.data.categories));
  assert.ok(data.data.categories.length >= 11, 'Should contain at least 11 system categories');

  // Verify system categories structure
  defaultFoodCategory = data.data.categories.find((c) => c.name === 'Food');
  assert.ok(defaultFoodCategory, 'Food category must exist');
  assert.strictEqual(defaultFoodCategory.isDefault, true);
  assert.strictEqual(defaultFoodCategory.userId, null);
  assert.strictEqual(defaultFoodCategory.isActive, true);

  const expectedNames = [
    'Food',
    'Transport',
    'Shopping',
    'Rent',
    'Bills',
    'Health',
    'Education',
    'Entertainment',
    'Travel',
    'Groceries',
    'Other',
  ];

  for (const name of expectedNames) {
    const found = data.data.categories.find((c) => c.name === name);
    assert.ok(found, `Default category "${name}" must be present`);
  }
  console.log('✔ Default Categories: All 11 system categories present with userId: null');
}

{
  // 2.2 Attempt to modify a default category -> 400 Bad Request
  const res = await fetch(`${BASE_URL}/categories/${defaultFoodCategory.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({ name: 'Hacked Food Name' }),
  });
  assert.strictEqual(res.status, 400, 'Modifying system category must return 400');
  console.log('✔ Immutability: Attempt to update default category rejected with 400');
}

{
  // 2.3 Attempt to delete a default category -> 400 Bad Request
  const res = await fetch(`${BASE_URL}/categories/${defaultFoodCategory.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 400, 'Deleting system category must return 400');
  console.log('✔ Immutability: Attempt to delete default category rejected with 400');
}

// ----------------------------------------------------
// 3. CATEGORY VALIDATION TESTS
// ----------------------------------------------------
console.log('\n--- 3. Testing Category Validation ---');

{
  // 3.1 Missing name
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ icon: 'coffee', color: '#8B4513' }),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Missing name rejected with 400');
}

{
  // 3.2 Name too short (< 2 chars)
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ name: 'A', icon: 'coffee', color: '#8B4513' }),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Name < 2 chars rejected with 400');
}

{
  // 3.3 Name too long (> 50 chars)
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ name: 'A'.repeat(51), icon: 'coffee', color: '#8B4513' }),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Name > 50 chars rejected with 400');
}

{
  // 3.4 Invalid hex color code
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ name: 'Coffee', icon: 'coffee', color: 'blue' }),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Invalid hex color rejected with 400');
}

{
  // 3.5 Missing icon
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ name: 'Coffee', color: '#8B4513' }),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Missing icon rejected with 400');
}

{
  // 3.6 Invalid category ID format
  const res = await fetch(`${BASE_URL}/categories/invalid-id`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Invalid category ID parameter rejected with 400');
}

{
  // 3.7 Empty update body
  const res = await fetch(`${BASE_URL}/categories/66ed3c101c8e9b4d1a2f3101`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({}),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Validation: Empty update payload rejected with 400');
}

// ----------------------------------------------------
// 4. CUSTOM CATEGORY LIFECYCLE & SECURITY
// ----------------------------------------------------
console.log('\n--- 4. Testing Custom Category Lifecycle & Ownership ---');

let userACategoryId = '';

{
  // 4.1 User A creates custom category with spoofed userId and isDefault
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
      'x-user-id': 'hacker_override',
    },
    body: JSON.stringify({
      userId: 'malicious_user_id',
      isDefault: true,
      name: 'Coffee & Snacks',
      icon: 'coffee',
      color: '#8B4513',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 201, `Failed to create category: ${JSON.stringify(data)}`);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.category.userId, userA.id, 'Must be assigned to authenticated user');
  assert.strictEqual(data.data.category.isDefault, false, 'isDefault must be false');
  assert.strictEqual(data.data.category.name, 'Coffee & Snacks');

  userACategoryId = data.data.category.id;
  console.log('✔ Creation: User A created custom category (201)');
  console.log('✔ Security: Client body userId and isDefault stripped and defeated');
}

{
  // 4.2 Duplicate name check (case-insensitive for same user) -> 409 Conflict
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      name: 'coffee & snacks', // lowercase duplicate
      icon: 'cup',
      color: '#A0522D',
    }),
  });
  assert.strictEqual(res.status, 409, 'Duplicate category for same user must return 409');
  console.log('✔ Uniqueness: Case-insensitive duplicate custom category rejected with 409 Conflict');
}

{
  // 4.3 Duplicate name against system default category -> 409 Conflict
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      name: 'Food', // matches system category
      icon: 'food',
      color: '#FF0000',
    }),
  });
  assert.strictEqual(res.status, 409, 'Duplicate category name against default category must return 409');
  console.log('✔ Uniqueness: Duplicate category name against system category rejected with 409 Conflict');
}

{
  // 4.4 User A retrieves their category by ID
  const res = await fetch(`${BASE_URL}/categories/${userACategoryId}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.category.id, userACategoryId);
  console.log('✔ Retrieval: User A retrieves own category (200)');
}

{
  // 4.5 User B attempts to view User A's custom category -> 404 Not Found
  const res = await fetch(`${BASE_URL}/categories/${userACategoryId}`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  assert.strictEqual(res.status, 404, 'User B must not see User A category');
  console.log('✔ Privacy: User B viewing User A category returns 404 Not Found');
}

{
  // 4.6 User B attempts to update User A's custom category -> 404 Not Found
  const res = await fetch(`${BASE_URL}/categories/${userACategoryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
    body: JSON.stringify({ name: 'Hacked by User B' }),
  });
  assert.strictEqual(res.status, 404);
  console.log('✔ Ownership: User B cannot update User A category (404 Not Found)');
}

{
  // 4.7 User B attempts to delete User A's custom category -> 404 Not Found
  const res = await fetch(`${BASE_URL}/categories/${userACategoryId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  assert.strictEqual(res.status, 404);
  console.log('✔ Ownership: User B cannot delete User A category (404 Not Found)');
}

{
  // 4.8 User B listing does NOT contain User A's category
  const res = await fetch(`${BASE_URL}/categories`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  const found = data.data.categories.find((c) => c.id === userACategoryId);
  assert.strictEqual(found, undefined, 'User B category list must not include User A custom category');
  console.log('✔ Isolation: User B category list excludes User A custom category');
}

{
  // 4.9 User A updates their category
  const res = await fetch(`${BASE_URL}/categories/${userACategoryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      name: 'Specialty Coffee',
      color: '#A0522D',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.category.name, 'Specialty Coffee');
  assert.strictEqual(data.data.category.color, '#A0522D');
  console.log('✔ Update: User A updates custom category (200)');
}

// ----------------------------------------------------
// 5. EXPENSE + CATEGORY RELATIONAL INTEGRATION
// ----------------------------------------------------
console.log('\n--- 5. Testing Expense + Category Relational Integration ---');

let expenseWithCustomCatId = '';

{
  // 5.1 Create expense with system default category -> categoryNameSnapshot auto-populated
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      amount: 150,
      categoryId: defaultFoodCategory.id,
      categoryNameSnapshot: 'Spoofed Fake Name', // Server must ignore and use DB name
      paymentMethod: 'UPI',
      date: '2026-09-19',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.data.expense.categoryId, defaultFoodCategory.id);
  assert.strictEqual(
    data.data.expense.categoryNameSnapshot,
    'Food',
    'categoryNameSnapshot must be populated from actual MongoDB category name'
  );
  console.log('✔ Relational: Expense with default category auto-populates categoryNameSnapshot');
  console.log('✔ Relational: Client-spoofed categoryNameSnapshot safely ignored');
}

{
  // 5.2 Create expense with user's custom category -> categoryNameSnapshot matches custom category
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      amount: 220,
      categoryId: userACategoryId,
      paymentMethod: 'CASH',
      date: '2026-09-19',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(data.data.expense.categoryId, userACategoryId);
  assert.strictEqual(data.data.expense.categoryNameSnapshot, 'Specialty Coffee');

  expenseWithCustomCatId = data.data.expense.id;
  console.log('✔ Relational: Expense with custom category auto-populates categoryNameSnapshot');
}

{
  // 5.3 User B attempts to create expense using User A's custom category -> 400 Bad Request
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
    body: JSON.stringify({
      amount: 100,
      categoryId: userACategoryId,
      paymentMethod: 'UPI',
      date: '2026-09-19',
    }),
  });
  assert.strictEqual(res.status, 400, 'Using another user custom category must be rejected');
  console.log('✔ Relational: User B cannot use User A custom category (400 Bad Request)');
}

{
  // 5.4 Attempt to create expense with nonexistent category ID -> 400 Bad Request
  const res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      amount: 100,
      categoryId: '66ed3c101c8e9b4d1a2f9999',
      paymentMethod: 'UPI',
      date: '2026-09-19',
    }),
  });
  assert.strictEqual(res.status, 400);
  console.log('✔ Relational: Nonexistent category ID rejected with 400 Bad Request');
}

{
  // 5.5 Attempt to delete custom category that is in use by an expense -> 409 Conflict
  const res = await fetch(`${BASE_URL}/categories/${userACategoryId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 409, 'Deleting referenced category must return 409 Conflict');
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.message.includes('used by existing expenses'));
  console.log('✔ Deletion Protection: Deleting category used by expenses rejected with 409 Conflict');
}

{
  // 5.6 Verify historical expense still exists and retains categoryNameSnapshot
  const res = await fetch(`${BASE_URL}/expenses/${expenseWithCustomCatId}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.expense.categoryNameSnapshot, 'Specialty Coffee');
  console.log('✔ Historical Integrity: Expense record and categoryNameSnapshot intact');
}

{
  // 5.7 Update expense to a different category -> categoryNameSnapshot updates
  const res = await fetch(`${BASE_URL}/expenses/${expenseWithCustomCatId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      categoryId: defaultFoodCategory.id,
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.expense.categoryId, defaultFoodCategory.id);
  assert.strictEqual(data.data.expense.categoryNameSnapshot, 'Food');
  console.log('✔ Relational: Updating expense category updates categoryNameSnapshot');
}

{
  // 5.8 Now that userACategoryId is no longer used by any expenses, delete it -> Soft-deleted (200)
  const res = await fetch(`${BASE_URL}/categories/${userACategoryId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 200);
  console.log('✔ Soft-Delete: Unused custom category deleted successfully (200)');

  // 5.9 Verify soft-deleted category no longer appears in GET /api/categories
  const listRes = await fetch(`${BASE_URL}/categories`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const listData = await listRes.json();
  const found = listData.data.categories.find((c) => c.id === userACategoryId);
  assert.strictEqual(found, undefined, 'Soft-deleted category must not appear in active listings');

  // 5.10 Verify GET /api/categories/:id returns 404 for soft-deleted category
  const getRes = await fetch(`${BASE_URL}/categories/${userACategoryId}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(getRes.status, 404, 'Soft-deleted category should return 404');
  console.log('✔ Soft-Delete: Category cleanly hidden from list and ID lookup');
}

// ----------------------------------------------------
// 6. API /v1 ALIAS VERIFICATION
// ----------------------------------------------------
console.log('\n--- 6. Testing /api/v1/categories Alias ---');

{
  const res = await fetch(`${BASE_V1_URL}/categories`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.data.categories));
  console.log('✔ Alias: /api/v1/categories seamlessly mirrors /api/categories');
}

console.log('\n=====================================================');
console.log('ALL CATEGORY INTEGRATION TESTS PASSED SUCCESSFULLY!');
console.log('=====================================================\n');
