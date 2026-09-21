import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validators.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const authRouter = Router();

/**
 * @route POST /api/auth/register
 * @desc Register new user account
 * @access Public
 */
authRouter.post('/register', validateBody(registerSchema), authController.register);

/**
 * @route POST /api/auth/login
 * @desc Authenticate user with credentials
 * @access Public
 */
authRouter.post('/login', validateBody(loginSchema), authController.login);

/**
 * @route GET /api/auth/me
 * @desc Retrieve current authenticated user profile
 * @access Private (Bearer token required)
 */
authRouter.get('/me', requireAuth, authController.getMe);

/**
 * @route POST /api/auth/logout
 * @desc Stateless logout confirmation
 * @access Public / Authenticated
 */
authRouter.post('/logout', authController.logout);
