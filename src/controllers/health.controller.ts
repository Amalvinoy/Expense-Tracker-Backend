import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';
import mongoose from 'mongoose';

/**
 * Health check controller
 * Confirms API operational status and MongoDB connectivity
 */
export const healthController = {
  getHealth(_req: Request, res: Response): Response {
    const isDbConnected = mongoose.connection.readyState === 1;

    return sendSuccess({
      res,
      message: 'Expense Tracker API is running',
      data: {
        status: 'healthy',
        database: isDbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
      },
    });
  },
};
