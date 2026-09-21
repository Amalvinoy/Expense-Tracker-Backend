import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/auth/token.service.js';
import { User } from '../models/user.model.js';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Authentication Middleware
 * Enforces valid JWT Bearer authentication and attaches authenticated user to req.user.
 * Client-controlled identity headers (like x-user-id) are strictly ignored.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Authentication token missing. Please provide Authorization header.');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1].trim()) {
      throw new UnauthorizedError('Malformed Authorization header. Format must be: Bearer <token>');
    }

    const token = parts[1].trim();

    // 1. Verify token cryptographically
    const payload = tokenService.verifyToken(token);

    // 2. Fetch user from database to ensure account still exists and is active
    const user = await User.findById(payload.sub).select('+isActive');

    if (!user) {
      throw new UnauthorizedError('Account associated with this token no longer exists.');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled or deactivated. Please contact support.');
    }

    // 3. Attach trusted user identity to request object
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      currency: user.currency,
      timezone: user.timezone,
      isActive: user.isActive,
    };

    next();
  } catch (err) {
    next(err);
  }
}
