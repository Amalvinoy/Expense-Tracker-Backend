import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';
const BASE_V1_URL = 'http://localhost:5000/api/v1';

console.log('==================================================================');
console.log('RUNNING EXPENSE TRACKER FULL E2E INTER-MODULE INTEGRATION TEST');
console.log('==================================================================\n');

// Helper to create test user
async function createTestUser(prefix) {
  const email = `${prefix}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}@example.com`;
  const password = 'Password123!';
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `${prefix} Test User`,
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

const userA = await createTestUser('integUserA');
const userB = await createTestUser('integUserB');

console.log('Initialized Test Users:');
console.log(`- User A: ${userA.id} (${userA.email})`);
console.log(`- User B: ${userB.id} (${userB.email})\n`);

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1; // 1-12
const todayDateStr = now.toISOString().split('T')[0];

let fineDiningCategory;
let currentBudget;
let expense1;
let expense2;
let expense3;
let expense4;
let expense5;

// ============================================================================
// Phase 1: Authentication & User Verification
// ============================================================================
console.log('--- 1. Testing User Authentication & Profile ---');
{
  const profileRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const profileBody = await profileRes.json();
  assert.strictEqual(profileRes.status, 200);
  assert.strictEqual(profileBody.success, true);
  assert.strictEqual(profileBody.data.user.id, userA.id);
  console.log('✔ Auth: User profile verified successfully');
}

// ============================================================================
// Phase 2: Category Management (Custom Category Lifecycle)
// ============================================================================
console.log('\n--- 2. Testing Category Lifecycle ---');
{
  // Create custom category for User A
  const catCreateRes = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      name: 'Fine Dining',
      icon: 'restaurant',
      color: '#E91E63',
      description: 'Gourmet dining and restaurants',
    }),
  });
  const catCreateBody = await catCreateRes.json();
  assert.strictEqual(catCreateRes.status, 201, `Category creation failed: ${JSON.stringify(catCreateBody)}`);
  assert.strictEqual(catCreateBody.success, true);
  fineDiningCategory = catCreateBody.data.category;
  assert.ok(fineDiningCategory.id);
  assert.strictEqual(fineDiningCategory.name, 'Fine Dining');
  assert.strictEqual(fineDiningCategory.isDefault, false);
  console.log(`✔ Category: Created custom category "${fineDiningCategory.name}" (${fineDiningCategory.id})`);

  // Verify category listing includes system + custom
  const listCatRes = await fetch(`${BASE_URL}/categories`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const listCatBody = await listCatRes.json();
  assert.strictEqual(listCatRes.status, 200);
  const categories = listCatBody.data.categories;
  assert.ok(categories.some((c) => c.id === fineDiningCategory.id));
  assert.ok(categories.some((c) => c.isDefault === true));
  console.log(`✔ Category: Listing contains system categories and custom category (${categories.length} total)`);
}

// ============================================================================
// Phase 3: Budget Creation & Initial Verification
// ============================================================================
console.log('\n--- 3. Testing Budget Creation & Dynamic Setup ---');
{
  // 3.1 Create TOTAL budget for current month ($1000)
  const totalBudgetRes = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      type: 'TOTAL',
      amount: 1000,
      year: currentYear,
      month: currentMonth,
    }),
  });
  const totalBudgetBody = await totalBudgetRes.json();
  assert.strictEqual(totalBudgetRes.status, 201, `TOTAL budget creation failed: ${JSON.stringify(totalBudgetBody)}`);
  assert.strictEqual(totalBudgetBody.success, true);
  const totalBudget = totalBudgetBody.data.budget;
  assert.strictEqual(totalBudget.amount, 1000);

  // 3.2 Create CATEGORY budget for Fine Dining ($500)
  const catBudgetRes = await fetch(`${BASE_URL}/budgets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      type: 'CATEGORY',
      categoryId: fineDiningCategory.id,
      amount: 500,
      year: currentYear,
      month: currentMonth,
    }),
  });
  const catBudgetBody = await catBudgetRes.json();
  assert.strictEqual(catBudgetRes.status, 201, `CATEGORY budget creation failed: ${JSON.stringify(catBudgetBody)}`);
  assert.strictEqual(catBudgetBody.success, true);
  currentBudget = catBudgetBody.data.budget;
  assert.strictEqual(currentBudget.amount, 500);

  // 3.3 Check initial progress
  const progRes = await fetch(`${BASE_URL}/budgets/progress?year=${currentYear}&month=${currentMonth}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const progBody = await progRes.json();
  assert.strictEqual(progRes.status, 200);
  assert.strictEqual(progBody.data.totalBudget.spent, 0);
  assert.strictEqual(progBody.data.totalBudget.percentageUsed, 0);
  console.log(`✔ Budget: Created TOTAL budget ($1000) and CATEGORY budget ($500) for ${currentYear}-${currentMonth}`);
}

// ============================================================================
// Phase 4: Expense Creation & Automated Budget Alert Threshold Evaluation
// ============================================================================
console.log('\n--- 4. Testing Expense Creation & Budget Alert Triggering ---');
{
  // Verify 0 initial notifications
  const initialNotifRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const initialNotifBody = await initialNotifRes.json();
  assert.strictEqual(initialNotifBody.data.unreadCount, 0);
  console.log('✔ Notifications: Initial unread count is 0');

  // 1. Expense #1: $200 on Fine Dining (Spend = $200 / $500 = 40%, Total = $200 / $1000 = 20%)
  const exp1Res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      amount: 200,
      categoryId: fineDiningCategory.id,
      date: todayDateStr,
      description: 'Business lunch',
      paymentMethod: 'CREDIT_CARD',
    }),
  });
  const exp1Body = await exp1Res.json();
  assert.strictEqual(exp1Res.status, 201);
  expense1 = exp1Body.data.expense;

  // Check notifications: still 0 (under 80%)
  const notifAfterExp1 = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual((await notifAfterExp1.json()).data.unreadCount, 0);
  console.log('✔ Alert Evaluation: Expense 1 ($200, 40%) created; no alert triggered (under 80%)');

  // 2. Expense #2: $220 on Fine Dining (Category spend = $420 / $500 = 84%) -> Triggers 80% Alert!
  const exp2Res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      amount: 220,
      categoryId: fineDiningCategory.id,
      date: todayDateStr,
      description: 'Family dinner',
      paymentMethod: 'DEBIT_CARD',
    }),
  });
  const exp2Body = await exp2Res.json();
  assert.strictEqual(exp2Res.status, 201);
  expense2 = exp2Body.data.expense;

  // Verify notification triggered for 80% threshold
  const notifAfterExp2 = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const notifList2 = (await notifAfterExp2.json()).data.notifications;
  assert.strictEqual(notifList2.length, 1, 'Expected 1 notification for 80% budget warning');
  assert.strictEqual(notifList2[0].type, 'BUDGET_WARNING');
  assert.strictEqual(notifList2[0].data.threshold, 80);
  assert.strictEqual(notifList2[0].data.budgetId, currentBudget.id);
  console.log('✔ Alert Evaluation: Expense 2 ($220, total 84%) triggered 80% BUDGET_WARNING notification');

  // 3. Expense #3: $35 on Fine Dining (Category spend = $455 / $500 = 91%) -> Triggers 90% Alert!
  const exp3Res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      amount: 35,
      categoryId: fineDiningCategory.id,
      date: todayDateStr,
      description: 'Cocktails and dessert',
      paymentMethod: 'CASH',
    }),
  });
  const exp3Body = await exp3Res.json();
  assert.strictEqual(exp3Res.status, 201);
  expense3 = exp3Body.data.expense;

  // Verify 2 notifications now (80% and 90%)
  const notifAfterExp3 = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const notifList3 = (await notifAfterExp3.json()).data.notifications;
  assert.strictEqual(notifList3.length, 2, 'Expected 2 notifications (80% and 90%)');
  const alert90 = notifList3.find((n) => n.data?.threshold === 90);
  assert.ok(alert90, 'Found 90% budget warning alert');
  assert.strictEqual(alert90.type, 'BUDGET_WARNING');
  console.log('✔ Alert Evaluation: Expense 3 ($35, total 91%) triggered 90% BUDGET_WARNING notification');

  // 4. Expense #4: $50 on Fine Dining (Category spend = $505 / $500 = 101%) -> Triggers 100% Exceeded Alert!
  const exp4Res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      amount: 50,
      categoryId: fineDiningCategory.id,
      date: todayDateStr,
      description: 'Late night snack',
      paymentMethod: 'UPI',
    }),
  });
  const exp4Body = await exp4Res.json();
  assert.strictEqual(exp4Res.status, 201, `Expense 4 creation failed: ${JSON.stringify(exp4Body)}`);
  expense4 = exp4Body.data.expense;

  // Verify 3 notifications now (80%, 90%, and 100%)
  const notifAfterExp4 = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const notifList4 = (await notifAfterExp4.json()).data.notifications;
  assert.strictEqual(notifList4.length, 3, 'Expected 3 notifications (80%, 90%, and 100%)');
  const alert100 = notifList4.find((n) => n.data?.threshold === 100);
  assert.ok(alert100, 'Found 100% budget exceeded alert');
  assert.strictEqual(alert100.type, 'BUDGET_EXCEEDED');
  console.log('✔ Alert Evaluation: Expense 4 ($50, total 101%) triggered 100% BUDGET_EXCEEDED notification');

  // 5. Deduplication check: Expense #5: $10 on Fine Dining (Category spend = $515, 103%) -> No duplicate 100% alert!
  const exp5Res = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      amount: 10,
      categoryId: fineDiningCategory.id,
      date: todayDateStr,
      description: 'Coffee',
      paymentMethod: 'CASH',
    }),
  });
  const exp5Body = await exp5Res.json();
  assert.strictEqual(exp5Res.status, 201);
  expense5 = exp5Body.data.expense;

  const notifAfterExp5 = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const notifList5 = (await notifAfterExp5.json()).data.notifications;
  assert.strictEqual(notifList5.length, 3, 'Deduplication passed: notification count remained 3 without duplicate');
  console.log('✔ Alert Evaluation: Expense 5 ($10, 103%) did NOT create duplicate 100% notification (deduplication active)');
}

// ============================================================================
// Phase 5: Reports & Analytics Inter-Module Synchronization
// ============================================================================
console.log('\n--- 5. Testing Reports & Analytics Reflection ---');
{
  // Total expenses so far = 200 + 220 + 35 + 50 + 10 = $515
  const reportsRes = await fetch(`${BASE_URL}/reports`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const reportsBody = await reportsRes.json();
  assert.strictEqual(reportsRes.status, 200);
  assert.strictEqual(reportsBody.data.summary.totalSpent, 515);
  assert.strictEqual(reportsBody.data.summary.transactionCount, 5);
  const categorySummary = reportsBody.data.categoryBreakdown.find((c) => c.categoryId === fineDiningCategory.id);
  assert.ok(categorySummary);
  assert.strictEqual(categorySummary.amount, 515);
  console.log('✔ Reports: Combined report accurately reflects 5 expenses totalling $515');

  // Update Expense 5 amount from $10 to $30 (Total expenses become $535)
  const updateExpRes = await fetch(`${BASE_URL}/expenses/${expense5.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      amount: 30,
      categoryId: fineDiningCategory.id,
      date: todayDateStr,
      description: 'Specialty Coffee and cake',
      paymentMethod: 'CASH',
    }),
  });
  assert.strictEqual(updateExpRes.status, 200);

  const updatedReportsRes = await fetch(`${BASE_URL}/reports`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const updatedReportsBody = await updatedReportsRes.json();
  assert.strictEqual(updatedReportsBody.data.summary.totalSpent, 535);
  console.log('✔ Reports: Expense update to $30 immediately synchronized to report ($535 total)');

  // Delete Expense 5 (Total expenses return to $505)
  const delExpRes = await fetch(`${BASE_URL}/expenses/${expense5.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(delExpRes.status, 200);

  const afterDelReportsRes = await fetch(`${BASE_URL}/reports`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const afterDelReportsBody = await afterDelReportsRes.json();
  assert.strictEqual(afterDelReportsBody.data.summary.totalSpent, 505);
  console.log('✔ Reports: Expense deletion immediately synchronized to report ($505 total)');
}

// ============================================================================
// Phase 6: Reminders Scheduling & Due Processing with Deduplication
// ============================================================================
console.log('\n--- 6. Testing Reminders Scheduler & Idempotency ---');
{
  const testHour = String(now.getHours()).padStart(2, '0');
  const testMin = String(now.getMinutes()).padStart(2, '0');
  const scheduledTime = '00:00'; // Guaranteed to be <= current time

  // 1. Create a DAILY reminder
  const dailyRemRes = await fetch(`${BASE_URL}/reminders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      title: 'Daily Evening Expense Log',
      frequency: 'DAILY',
      time: scheduledTime,
      type: 'DAILY_EXPENSE_REMINDER',
    }),
  });
  const dailyRemBody = await dailyRemRes.json();
  assert.strictEqual(dailyRemRes.status, 201, `Failed to create reminder: ${JSON.stringify(dailyRemBody)}`);
  const dailyReminder = dailyRemBody.data.reminder;
  console.log(`✔ Reminders: Created DAILY reminder at ${scheduledTime} (${dailyReminder.id})`);

  // 2. Trigger Due Reminders Processing
  const processRes = await fetch(`${BASE_URL}/reminders/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      referenceDate: now.toISOString(),
    }),
  });
  const processBody = await processRes.json();
  assert.strictEqual(processRes.status, 200);
  assert.strictEqual(processBody.success, true);
  assert.ok(processBody.data.createdNotifications >= 1);
  console.log(`✔ Reminders: Scheduler processed due reminders; created ${processBody.data.createdNotifications} notification(s)`);

  // Record notification count after first scheduler run
  const notifCountRes1 = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const totalNotifsAfterFirstRun = (await notifCountRes1.json()).data.notifications.length;

  // 3. Second run with the EXACT SAME reference date -> Must produce 0 new notifications (Strict Deduplication)
  const processRes2 = await fetch(`${BASE_URL}/reminders/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      referenceDate: now.toISOString(),
    }),
  });
  const processBody2 = await processRes2.json();
  assert.strictEqual(processRes2.status, 200);
  assert.strictEqual(processBody2.data.createdNotifications, 0, 'Expected 0 notifications on duplicate run');

  const notifCountRes2 = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const totalNotifsAfterSecondRun = (await notifCountRes2.json()).data.notifications.length;
  assert.strictEqual(totalNotifsAfterSecondRun, totalNotifsAfterFirstRun, 'Notification total must not increase');
  console.log('✔ Reminders: Scheduler deduplication verified (0 duplicate notifications created on second run)');
}

// ============================================================================
// Phase 7: Notification Read Lifecycle
// ============================================================================
console.log('\n--- 7. Testing Notification Read Lifecycle ---');
{
  const unreadRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const unreadBefore = (await unreadRes.json()).data.unreadCount;
  assert.ok(unreadBefore > 0);

  // Mark all as read
  const markAllRes = await fetch(`${BASE_URL}/notifications/read-all`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual(markAllRes.status, 200);

  const unreadAfter = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  assert.strictEqual((await unreadAfter.json()).data.unreadCount, 0);
  console.log(`✔ Notifications: Marked all as read (unread count transitioned from ${unreadBefore} to 0)`);
}

// ============================================================================
// Phase 8: Cross-Tenant Isolation Across All Modules
// ============================================================================
console.log('\n--- 8. Testing Cross-Tenant Security & Isolation ---');
{
  // User B tries to read User A's expense -> 404
  const bReadExp = await fetch(`${BASE_URL}/expenses/${expense1.id}`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  assert.strictEqual(bReadExp.status, 404);

  // User B tries to update User A's expense -> 404
  const bUpdateExp = await fetch(`${BASE_URL}/expenses/${expense1.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userB.token}`,
    },
    body: JSON.stringify({ amount: 999 }),
  });
  assert.strictEqual(bUpdateExp.status, 404);

  // User B tries to delete User A's custom category -> 404
  const bDelCat = await fetch(`${BASE_URL}/categories/${fineDiningCategory.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  assert.strictEqual(bDelCat.status, 404);

  // User B tries to view User A's budget by ID -> 404
  const bBudget = await fetch(`${BASE_URL}/budgets/${currentBudget.id}`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  assert.strictEqual(bBudget.status, 404);

  console.log('✔ Cross-Tenant Isolation: User B cannot access, modify, or delete any of User A resources (Expenses, Categories, Budgets)');
}

console.log('\n==================================================================');
console.log('ALL INTER-MODULE INTEGRATION TESTS PASSED SUCCESSFULLY! (100% PASS)');
console.log('==================================================================\n');
