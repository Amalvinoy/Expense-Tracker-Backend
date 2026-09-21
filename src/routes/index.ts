import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { expenseRouter } from './expense.routes.js';
import { categoryRouter } from './category.routes.js';
import { budgetRouter } from './budget.routes.js';
import { reportRouter } from './report.routes.js';
import { notificationRouter } from './notification.routes.js';
import { reminderRouter } from './reminder.routes.js';
import { lendingRouter } from './lending.routes.js';
import { incomeRouter } from './income.routes.js';

export const apiRouter = Router();

// Mount Health Check endpoint at /api/health
apiRouter.use(healthRouter);

// Mount Authentication endpoints at /api/auth/*
apiRouter.use('/auth', authRouter);

// Mount Expense endpoints at /api/expenses/*
apiRouter.use('/expenses', expenseRouter);

// Mount Category endpoints at /api/categories/*
apiRouter.use('/categories', categoryRouter);

// Mount Budget endpoints at /api/budgets/*
apiRouter.use('/budgets', budgetRouter);

// Mount Report endpoints at /api/reports/*
apiRouter.use('/reports', reportRouter);

// Mount Notification endpoints at /api/notifications/*
apiRouter.use('/notifications', notificationRouter);

// Mount Reminder endpoints at /api/reminders/*
apiRouter.use('/reminders', reminderRouter);

// Mount Lending endpoints at /api/lendings/*
apiRouter.use('/lendings', lendingRouter);

// Mount Income endpoints at /api/income/*
apiRouter.use('/income', incomeRouter);

