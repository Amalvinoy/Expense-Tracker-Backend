/**
 * Authentication Type Definitions
 */

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  currency: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
}

export interface AuthResponseData {
  user: SafeUser;
  token: string;
}

export interface UserProfileResponseData {
  user: SafeUser;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  currency: string;
  timezone: string;
  isActive: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
