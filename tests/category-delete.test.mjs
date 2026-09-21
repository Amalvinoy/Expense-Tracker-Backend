import assert from 'node:assert';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://127.0.0.1:5000/api';
const JWT_SECRET = 'development_secret_key_expense_tracker_secure_2026';
const userId = '6ab0bf0c371c6b2c09061dd8'; // Amal
const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' });

console.log('====================================================');
console.log('VERIFYING CATEGORY DELETE FLOW END-TO-END');
console.log('====================================================\n');

async function testCategoryDeleteFlow() {
  // 1. Initial categories
  const initialRes = await fetch(`${BASE_URL}/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(initialRes.status, 200);
  const initialData = await initialRes.json();
  const initialCount = initialData.data.categories.length;
  console.log(`Initial active categories for Amal: ${initialCount}`);

  // 2. Create custom category "Test Temporary Category"
  const createRes = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Test Temporary Category',
      icon: 'tag-outline',
      color: '#10B981',
    }),
  });
  assert.strictEqual(createRes.status, 201);
  const createData = await createRes.json();
  const createdCategory = createData.data.category;
  console.log(`✔ Created custom category: "${createdCategory.name}" (ID: ${createdCategory.id})`);

  // 3. Verify it appears in active listings
  const afterCreateRes = await fetch(`${BASE_URL}/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const afterCreateData = await afterCreateRes.json();
  assert.strictEqual(afterCreateData.data.categories.length, initialCount + 1);
  const foundAfterCreate = afterCreateData.data.categories.find((c) => c.id === createdCategory.id);
  assert.ok(foundAfterCreate, 'Newly created category must appear in active categories');
  console.log('✔ Category appears in active categories list');

  // 4. Delete the custom category
  const deleteRes = await fetch(`${BASE_URL}/categories/${createdCategory.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(deleteRes.status, 200);
  console.log('✔ DELETE /api/categories/:id returned HTTP 200');

  // 5. Verify it disappears immediately from active categories
  const afterDeleteRes = await fetch(`${BASE_URL}/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const afterDeleteData = await afterDeleteRes.json();
  assert.strictEqual(afterDeleteData.data.categories.length, initialCount);
  const foundAfterDelete = afterDeleteData.data.categories.find((c) => c.id === createdCategory.id);
  assert.strictEqual(foundAfterDelete, undefined, 'Deleted category must NOT appear in active categories');
  console.log('✔ Deleted category is immediately absent from GET /api/categories');

  // 6. Verify GET /api/categories/:id returns 404 for soft-deleted category
  const getByIdRes = await fetch(`${BASE_URL}/categories/${createdCategory.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(getByIdRes.status, 404);
  console.log('✔ Direct lookup GET /api/categories/:id returns HTTP 404');

  // 7. Verify system category cannot be deleted
  const systemCat = initialData.data.categories.find((c) => c.isDefault);
  if (systemCat) {
    const sysDelRes = await fetch(`${BASE_URL}/categories/${systemCat.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(sysDelRes.status, 400);
    console.log(`✔ System category "${systemCat.name}" deletion strictly rejected with HTTP 400`);
  }

  // 8. Verify existing expenses still load and are unaffected
  const expRes = await fetch(`${BASE_URL}/expenses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.strictEqual(expRes.status, 200);
  const expData = await expRes.json();
  console.log(`✔ Existing expenses load cleanly (${expData.data.expenses.length} expenses found)`);

  console.log('\n====================================================');
  console.log('ALL CATEGORY DELETE VERIFICATIONS PASSED (100% PASS)');
  console.log('====================================================\n');
}

testCategoryDeleteFlow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
