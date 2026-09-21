import assert from 'node:assert';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'development_secret_key_expense_tracker_secure_2026';

console.log('====================================================');
console.log('RUNNING EXPENSE TRACKER BACKEND AUTHENTICATION TESTS');
console.log('====================================================\n');

const testEmail = `test.user.${Date.now()}@example.com`;
const testPassword = 'SecurePassword123!';
let authToken = '';
let registeredUserId = '';

// ----------------------------------------------------
// 1. REGISTRATION TESTS
// ----------------------------------------------------
console.log('--- 1. Testing User Registration ---');

// 1.1 Missing fields
{
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 400, 'Empty register body should return 400');
  assert.strictEqual(data.success, false);
  assert.ok(data.errors.length >= 3, 'Should report missing name, email, password');
  console.log('✔ Registration: Missing fields properly rejected with 400 Bad Request');
}

// 1.2 Invalid email format
{
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Doe',
      email: 'not-an-email',
      password: 'validPassword123',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 400);
  assert.strictEqual(data.success, false);
  assert.ok(data.errors.some((e) => e.field === 'email'));
  console.log('✔ Registration: Invalid email format rejected');
}

// 1.3 Weak password (< 8 chars)
{
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Doe',
      email: 'valid.email@example.com',
      password: 'short',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 400);
  assert.strictEqual(data.success, false);
  assert.ok(data.errors.some((e) => e.field === 'password'));
  console.log('✔ Registration: Short password (< 8 chars) rejected');
}

// 1.4 Successful registration
{
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Amal',
      email: testEmail,
      password: testPassword,
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 201, 'Registration should return 201 Created');
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.message, 'Registration successful');
  assert.ok(data.data.token, 'Response must include JWT token');
  assert.ok(data.data.user, 'Response must include user profile');
  assert.strictEqual(data.data.user.email, testEmail.toLowerCase());
  assert.strictEqual(data.data.user.currency, 'INR');
  assert.strictEqual(data.data.user.timezone, 'Asia/Kolkata');
  assert.strictEqual(data.data.user.passwordHash, undefined, 'passwordHash must NEVER be returned');
  assert.strictEqual(data.data.user.password, undefined, 'password must NEVER be returned');

  authToken = data.data.token;
  registeredUserId = data.data.user.id;
  console.log('✔ Registration: Successful account creation (201 Created) with safe user data & JWT');
}

// 1.5 Duplicate email registration
{
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Another User',
      email: testEmail.toUpperCase(), // Test case-insensitive collision
      password: 'anotherPassword123',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 409, 'Duplicate email should return 409 Conflict');
  assert.strictEqual(data.success, false);
  console.log('✔ Registration: Duplicate email rejected with 409 Conflict');
}

// ----------------------------------------------------
// 2. LOGIN TESTS
// ----------------------------------------------------
console.log('\n--- 2. Testing User Login ---');

// 2.1 Nonexistent email
{
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nonexistent.user.12345@example.com',
      password: 'password123',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 401, 'Nonexistent email should return 401 Unauthorized');
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.message, 'Invalid email or password.', 'Should return generic error to prevent enumeration');
  console.log('✔ Login: Nonexistent email yields generic 401 error (prevents account enumeration)');
}

// 2.2 Wrong password
{
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'WrongPassword123!',
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 401, 'Incorrect password should return 401');
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.message, 'Invalid email or password.');
  console.log('✔ Login: Incorrect password yields identical generic 401 error');
}

// 2.3 Successful login
{
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200, 'Valid credentials should return 200 OK');
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.message, 'Login successful');
  assert.ok(data.data.token, 'Login must return JWT token');
  assert.ok(data.data.user.lastLoginAt, 'lastLoginAt must be populated');
  assert.strictEqual(data.data.user.passwordHash, undefined, 'passwordHash must NEVER be returned on login');

  authToken = data.data.token;
  console.log('✔ Login: Successful authentication (200 OK) with updated lastLoginAt');
}

// ----------------------------------------------------
// 3. JWT & AUTHENTICATION MIDDLEWARE TESTS
// ----------------------------------------------------
console.log('\n--- 3. Testing JWT & Auth Middleware ---');

// 3.1 Missing Authorization header
{
  const res = await fetch(`${BASE_URL}/auth/me`);
  const data = await res.json();
  assert.strictEqual(res.status, 401);
  assert.strictEqual(data.success, false);
  console.log('✔ JWT: Missing Authorization header rejected with 401');
}

// 3.2 Malformed Authorization header (missing Bearer prefix)
{
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: authToken },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 401);
  assert.strictEqual(data.success, false);
  console.log('✔ JWT: Malformed Authorization header (missing Bearer prefix) rejected');
}

// 3.3 Invalid / Tampered token signature
{
  const forgedToken = authToken.slice(0, -5) + 'abcde';
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${forgedToken}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 401);
  assert.strictEqual(data.success, false);
  console.log('✔ JWT: Tampered token rejected with 401 Unauthorized');
}

// 3.4 Expired token
{
  const expiredToken = jwt.sign({ sub: registeredUserId }, JWT_SECRET, { expiresIn: '-10s' });
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 401);
  assert.ok(data.message.toLowerCase().includes('expired'));
  console.log('✔ JWT: Expired token cleanly rejected with expiration message');
}

// 3.5 Token payload inspection (verify sub claim only)
{
  const decoded = jwt.decode(authToken);
  assert.strictEqual(decoded.sub, registeredUserId);
  assert.strictEqual(decoded.password, undefined);
  assert.strictEqual(decoded.passwordHash, undefined);
  assert.strictEqual(decoded.email, undefined);
  console.log('✔ JWT: Payload contains ONLY minimal identifier ({ sub: userId })');
}

// ----------------------------------------------------
// 4. CURRENT USER (/api/auth/me) & SECURITY TESTS
// ----------------------------------------------------
console.log('\n--- 4. Testing GET /api/auth/me & Security Rules ---');

// 4.1 Authenticated request to /api/auth/me
{
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.user.id, registeredUserId);
  assert.strictEqual(data.data.user.email, testEmail.toLowerCase());
  assert.strictEqual(data.data.user.passwordHash, undefined);
  console.log('✔ GET /api/auth/me: Returns current authenticated user');
}

// 4.2 Security: x-user-id header injection without valid JWT
{
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { 'x-user-id': registeredUserId },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 401);
  console.log('✔ Security: Client-supplied x-user-id header cannot bypass authentication');
}

// 4.3 Security: x-user-id header injection with different user ID
{
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'x-user-id': '66ed3b8f1c8e9b4d1a2f9999', // forged header
    },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.data.user.id, registeredUserId, 'User ID must strictly originate from verified JWT');
  console.log('✔ Security: Authenticated identity strictly originates from verified JWT');
}

// ----------------------------------------------------
// 5. LOGOUT TEST
// ----------------------------------------------------
console.log('\n--- 5. Testing POST /api/auth/logout ---');

{
  const res = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const data = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data, null);
  console.log('✔ Logout: POST /api/auth/logout returns standard success envelope with null data');
}

console.log('\n====================================================');
console.log('ALL AUTHENTICATION INTEGRATION TESTS PASSED (16/16)!');
console.log('====================================================\n');
