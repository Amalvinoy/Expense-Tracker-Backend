import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../utils/errors.js';

export interface TokenPayload {
  sub: string;
}

export const tokenService = {
  /**
   * Generates a signed JWT containing only minimal identifier (sub: userId)
   */
  generateToken(userId: string): string {
    const payload: TokenPayload = {
      sub: userId,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  },

  /**
   * Cryptographically verifies JWT and returns decoded payload
   */
  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

      if (!decoded || typeof decoded.sub !== 'string' || !decoded.sub) {
        throw new UnauthorizedError('Invalid token payload.');
      }

      return {
        sub: decoded.sub,
      };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Your session has expired. Please log in again.');
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Authentication token is invalid or malformed.');
      }
      if (err instanceof UnauthorizedError) {
        throw err;
      }
      throw new UnauthorizedError('Authentication verification failed.');
    }
  },
};
