import { User, IUser } from '../../models/user.model.js';
import { passwordService } from './password.service.js';
import { tokenService } from './token.service.js';
import { RegisterInput, LoginInput } from '../../validators/auth.validators.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../utils/errors.js';
import { SafeUser, AuthResponseData } from '../../types/auth.types.js';

export const authService = {
  /**
   * Safe mapping helper that strictly filters out passwordHash and internal attributes
   */
  toSafeUser(user: IUser): SafeUser {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      currency: user.currency,
      timezone: user.timezone,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt ? user.updatedAt.toISOString() : undefined,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    };
  },

  /**
   * Registers a new user account and returns safe user details + JWT
   */
  async register(input: RegisterInput): Promise<AuthResponseData> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Check for existing account with this email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError('An account with this email address already exists.');
    }

    // 2. Hash password securely with bcrypt
    const passwordHash = await passwordService.hashPassword(input.password);

    // 3. Persist new user in MongoDB
    const newUser = await User.create({
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      isActive: true,
      lastLoginAt: new Date(),
    });

    // 4. Generate JWT with minimal sub claim
    const token = tokenService.generateToken(newUser._id.toString());

    return {
      user: this.toSafeUser(newUser),
      token,
    };
  },

  /**
   * Authenticates user credentials and returns safe user details + JWT
   */
  async login(input: LoginInput): Promise<AuthResponseData> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // 1. Find user by email and explicitly select passwordHash for verification
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    // 2. Constant-time check: generic error to prevent account enumeration
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // 3. Verify password hash
    const isPasswordValid = await passwordService.comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // 4. Verify account active state
    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled. Please contact support.');
    }

    // 5. Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // 6. Generate JWT
    const token = tokenService.generateToken(user._id.toString());

    return {
      user: this.toSafeUser(user),
      token,
    };
  },

  /**
   * Retrieves profile details for the authenticated user
   */
  async getMe(userId: string): Promise<SafeUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User profile not found.');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled.');
    }

    return this.toSafeUser(user);
  },
};
