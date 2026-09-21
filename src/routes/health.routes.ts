import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';

export const healthRouter = Router();

/**
 * @route GET /api/health
 * @desc API Health and service diagnostic status
 * @access Public
 */
healthRouter.get('/health', healthController.getHealth);
