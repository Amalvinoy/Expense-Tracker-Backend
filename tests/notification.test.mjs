import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';
const BASE_V1_URL = 'http://localhost:5000/api/v1';

console.log('==================================================================');
console.log('RUNNING EXPENSE TRACKER BACKEND NOTIFICATIONS & REMINDERS TESTS');
console.log('==================================================================\n');

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

const userA = await createTestUser('notifUserA');
const userB = await createTestUser('notifUserB');

console.log('Initialized Test Users:');
console.log(`- User A: ${userA.id} (${userA.email})`);
console.log(`- User B: ${userB.id} (${userB.email})\n`);

// ----------------------------------------------------
// 1. AUTHENTICATION GUARDS
// ----------------------------------------------------
console.log('--- 1. Testing Authentication Guards ---');

{
  const notifEndpoints = [
    { method: 'GET', url: `${BASE_URL}/notifications` },
    { method: 'GET', url: `${BASE_URL}/notifications/unread-count` },
    { method: 'PATCH', url: `${BASE_URL}/notifications/read-all` },
    { method: 'GET', url: `${BASE_URL}/notifications/66ed3c101c8e9b4d1a2f3101` },
    { method: 'PATCH', url: `${BASE_URL}/notifications/66ed3c101c8e9b4d1a2f3101/read` },
    { method: 'DELETE', url: `${BASE_URL}/notifications/66ed3c101c8e9b4d1a2f3101` },
  ];

  for (const req of notifEndpoints) {
    const res = await fetch(req.url, { method: req.method });
    assert.strictEqual(res.status, 401, `${req.method} ${req.url} without token must return 401`);
  }
  console.log('✔ Auth Guard: All /notifications endpoints reject unauthenticated access with 401');

  const reminderEndpoints = [
    { method: 'GET', url: `${BASE_URL}/reminders` },
    { method: 'POST', url: `${BASE_URL}/reminders` },
    { method: 'GET', url: `${BASE_URL}/reminders/66ed3c101c8e9b4d1a2f3101` },
    { method: 'PUT', url: `${BASE_URL}/reminders/66ed3c101c8e9b4d1a2f3101` },
    { method: 'PATCH', url: `${BASE_URL}/reminders/66ed3c101c8e9b4d1a2f3101/toggle` },
    { method: 'DELETE', url: `${BASE_URL}/reminders/66ed3c101c8e9b4d1a2f3101` },
  ];

  for (const req of reminderEndpoints) {
    const res = await fetch(req.url, { method: req.method });
    assert.strictEqual(res.status, 401, `${req.method} ${req.url} without token must return 401`);
  }
  console.log('✔ Auth Guard: All /reminders endpoints reject unauthenticated access with 401');
}

// ----------------------------------------------------
// 2. NOTIFICATION VALIDATION & LIFECYCLE
// ----------------------------------------------------
console.log('\n--- 2. Testing Notification Validation & Lifecycle ---');

{
  // 2.1 Invalid notification type
  const res = await fetch(`${BASE_URL}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ type: 'INVALID_TYPE', title: 'Test', message: 'Hello' }),
  });
  assert.strictEqual(res.status, 400, 'Invalid notification type must return 400');
  console.log('✔ Validation: Invalid notification type rejected with 400');
}

{
  // 2.2 Invalid notification ID format
  const res = await fetch(`${BASE_URL}/notifications/invalid-id`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 400, 'Invalid notification ID format must return 400');
  console.log('✔ Validation: Malformed notification ID rejected with 400');
}

let notification1Id;
let notification2Id;

{
  // 2.3 Create notification 1 (BUDGET_WARNING)
  const res = await fetch(`${BASE_URL}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      type: 'BUDGET_WARNING',
      title: 'Approaching Budget Limit',
      message: 'You have used 85% of your Dining budget.',
      data: { budgetId: '66ed3c101c8e9b4d1a2f3101', percentageUsed: 85 },
    }),
  });
  const body = await res.json();
  assert.strictEqual(res.status, 201, 'Create notification should return 201');
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.notification.type, 'BUDGET_WARNING');
  assert.strictEqual(body.data.notification.isRead, false);
  assert.strictEqual(body.data.notification.readAt, null);
  notification1Id = body.data.notification.id;
  console.log('✔ Notification Creation: Created BUDGET_WARNING notification');
}

{
  // 2.4 Verify unread count = 1
  const res = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.data.unreadCount, 1);
  console.log('✔ Unread Count: Correctly returns 1');
}

{
  // 2.5 Mark single notification as read
  const res = await fetch(`${BASE_URL}/notifications/${notification1Id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.data.notification.isRead, true);
  assert.ok(body.data.notification.readAt, 'readAt timestamp should be set');

  // Verify unread count is now 0
  const countRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const countBody = await countRes.json();
  assert.strictEqual(countBody.data.unreadCount, 0);
  console.log('✔ Mark Single Read: Marked notification as read and updated readAt');
}

{
  // 2.6 Create two additional unread notifications
  const res1 = await fetch(`${BASE_URL}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      type: 'DAILY_REMINDER',
      title: 'Log Today’s Expenses',
      message: 'Don’t forget to add today’s spending.',
    }),
  });
  const body1 = await res1.json();
  notification2Id = body1.data.notification.id;

  await fetch(`${BASE_URL}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      type: 'MONTHLY_SUMMARY',
      title: 'September Report Ready',
      message: 'Your monthly spending summary is available.',
    }),
  });

  const countRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const countBody = await countRes.json();
  assert.strictEqual(countBody.data.unreadCount, 2);
  console.log('✔ Batch Preparation: Created 2 unread notifications; unreadCount = 2');
}

{
  // 2.7 Mark all notifications as read
  const res = await fetch(`${BASE_URL}/notifications/read-all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.data.updatedCount, 2);

  const countRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const countBody = await countRes.json();
  assert.strictEqual(countBody.data.unreadCount, 0);
  console.log('✔ Mark All Read: Marked 2 remaining notifications as read; unreadCount = 0');
}

{
  // 2.8 Delete a notification
  const res = await fetch(`${BASE_URL}/notifications/${notification2Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 200);

  // Confirm deleted
  const getRes = await fetch(`${BASE_URL}/notifications/${notification2Id}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(getRes.status, 404);
  console.log('✔ Delete Notification: Removed notification successfully; subsequent GET returns 404');
}

// ----------------------------------------------------
// 3. REMINDER VALIDATION & LIFECYCLE
// ----------------------------------------------------
console.log('\n--- 3. Testing Reminder Validation & Lifecycle ---');

{
  // 3.1 Invalid time format (e.g. 25:00 or 12:65)
  const res = await fetch(`${BASE_URL}/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      type: 'DAILY_EXPENSE_REMINDER',
      title: 'Daily Logger',
      time: '25:00',
      frequency: 'DAILY',
    }),
  });
  assert.strictEqual(res.status, 400, 'Invalid time 25:00 must return 400');
  console.log('✔ Validation: Invalid 24-hour time rejected with 400');
}

{
  // 3.2 WEEKLY frequency without daysOfWeek
  const res = await fetch(`${BASE_URL}/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      type: 'BUDGET_REVIEW',
      title: 'Weekly Budget Check',
      time: '18:00',
      frequency: 'WEEKLY',
    }),
  });
  assert.strictEqual(res.status, 400, 'WEEKLY without daysOfWeek must return 400');
  console.log('✔ Validation: WEEKLY frequency without daysOfWeek rejected with 400');
}

{
  // 3.3 MONTHLY frequency without dayOfMonth
  const res = await fetch(`${BASE_URL}/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      type: 'MONTHLY_SUMMARY',
      title: 'Month End Review',
      time: '09:00',
      frequency: 'MONTHLY',
    }),
  });
  assert.strictEqual(res.status, 400, 'MONTHLY without dayOfMonth must return 400');
  console.log('✔ Validation: MONTHLY frequency without dayOfMonth rejected with 400');
}

let reminderDailyId;
let reminderWeeklyId;

{
  // 3.4 Create DAILY reminder
  const res = await fetch(`${BASE_URL}/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      type: 'DAILY_EXPENSE_REMINDER',
      title: 'Daily Expense Logging',
      message: 'Take 1 minute to record what you spent today.',
      time: '20:30',
      frequency: 'DAILY',
    }),
  });
  const body = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(body.data.reminder.frequency, 'DAILY');
  assert.strictEqual(body.data.reminder.enabled, true);
  reminderDailyId = body.data.reminder.id;
  console.log('✔ Reminder Creation: Created DAILY reminder');
}

{
  // 3.5 Create WEEKLY reminder
  const res = await fetch(`${BASE_URL}/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      type: 'BUDGET_REVIEW',
      title: 'Weekly Check-in',
      time: '10:00',
      frequency: 'WEEKLY',
      daysOfWeek: [1, 5], // Monday & Friday
    }),
  });
  const body = await res.json();
  assert.strictEqual(res.status, 201);
  assert.deepStrictEqual(body.data.reminder.daysOfWeek, [1, 5]);
  reminderWeeklyId = body.data.reminder.id;
  console.log('✔ Reminder Creation: Created WEEKLY reminder with daysOfWeek [1, 5]');
}

{
  // 3.6 Create MONTHLY reminder
  const res = await fetch(`${BASE_URL}/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({
      type: 'MONTHLY_SUMMARY',
      title: 'Monthly Summary Review',
      time: '09:00',
      frequency: 'MONTHLY',
      dayOfMonth: 28,
    }),
  });
  const body = await res.json();
  assert.strictEqual(res.status, 201);
  assert.strictEqual(body.data.reminder.dayOfMonth, 28);
  console.log('✔ Reminder Creation: Created MONTHLY reminder for day 28');
}

{
  // 3.7 List user reminders
  const res = await fetch(`${BASE_URL}/reminders`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.data.reminders.length, 3);
  console.log('✔ Reminder Listing: Returns all 3 configured user reminders');
}

{
  // 3.8 Update reminder schedule
  const res = await fetch(`${BASE_URL}/reminders/${reminderDailyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ time: '21:15', title: 'Nightly Expense Check' }),
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.data.reminder.time, '21:15');
  assert.strictEqual(body.data.reminder.title, 'Nightly Expense Check');
  console.log('✔ Update Reminder: Updated time and title');
}

{
  // 3.9 Toggle reminder enabled status
  const res = await fetch(`${BASE_URL}/reminders/${reminderWeeklyId}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ enabled: false }),
  });
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.data.reminder.enabled, false);
  console.log('✔ Toggle Reminder: Toggled enabled to false');
}

{
  // 3.10 Delete reminder
  const res = await fetch(`${BASE_URL}/reminders/${reminderWeeklyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(res.status, 200);

  const getRes = await fetch(`${BASE_URL}/reminders/${reminderWeeklyId}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(getRes.status, 404);
  console.log('✔ Delete Reminder: Removed reminder; subsequent GET returns 404');
}

// ----------------------------------------------------
// 4. CROSS-TENANT DATA ISOLATION
// ----------------------------------------------------
console.log('\n--- 4. Testing Cross-Tenant Data Isolation ---');

// User B creates a notification & reminder
const userBNotifRes = await fetch(`${BASE_URL}/notifications`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
  body: JSON.stringify({ type: 'GENERAL', title: 'User B Notice', message: 'Confidential' }),
});
const userBNotifBody = await userBNotifRes.json();
const userBNotifId = userBNotifBody.data.notification.id;

const userBRemRes = await fetch(`${BASE_URL}/reminders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
  body: JSON.stringify({
    type: 'CUSTOM',
    title: 'User B Reminder',
    time: '12:00',
    frequency: 'DAILY',
  }),
});
const userBRemBody = await userBRemRes.json();
const userBRemId = userBRemBody.data.reminder.id;

{
  // User A attempts to access User B's notification
  const getRes = await fetch(`${BASE_URL}/notifications/${userBNotifId}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(getRes.status, 404, 'User A reading User B notification must return 404');

  const patchRes = await fetch(`${BASE_URL}/notifications/${userBNotifId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(patchRes.status, 404, 'User A marking User B notification read must return 404');

  const delRes = await fetch(`${BASE_URL}/notifications/${userBNotifId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(delRes.status, 404, 'User A deleting User B notification must return 404');
  console.log('✔ Tenant Isolation: User A cannot read, mark, or delete User B notifications (404)');
}

{
  // User A attempts to access User B's reminder
  const getRes = await fetch(`${BASE_URL}/reminders/${userBRemId}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(getRes.status, 404, 'User A reading User B reminder must return 404');

  const putRes = await fetch(`${BASE_URL}/reminders/${userBRemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ title: 'Hacked' }),
  });
  assert.strictEqual(putRes.status, 404, 'User A updating User B reminder must return 404');

  const toggleRes = await fetch(`${BASE_URL}/reminders/${userBRemId}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ enabled: false }),
  });
  assert.strictEqual(toggleRes.status, 404, 'User A toggling User B reminder must return 404');

  const delRes = await fetch(`${BASE_URL}/reminders/${userBRemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(delRes.status, 404, 'User A deleting User B reminder must return 404');
  console.log('✔ Tenant Isolation: User A cannot read, update, toggle, or delete User B reminders (404)');
}

// ----------------------------------------------------
// 5. API V1 ROUTE ALIASES
// ----------------------------------------------------
console.log('\n--- 5. Testing API v1 Aliases ---');

{
  const notifRes = await fetch(`${BASE_V1_URL}/notifications`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(notifRes.status, 200, 'GET /api/v1/notifications must return 200');

  const reminderRes = await fetch(`${BASE_V1_URL}/reminders`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(reminderRes.status, 200, 'GET /api/v1/reminders must return 200');
  console.log('✔ API v1 Aliases: /api/v1/notifications and /api/v1/reminders work seamlessly');
}

console.log('\n==================================================================');
console.log('ALL NOTIFICATIONS & REMINDERS INTEGRATION TESTS PASSED (28/28)');
console.log('==================================================================\n');
