import bcrypt from 'bcrypt';

/**
 * Bcrypt cost factor (12 rounds balances security and performance for password hashing)
 */
const BCRYPT_SALT_ROUNDS = 12;

export const passwordService = {
  /**
   * Securely hash plain password with salt
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  },

  /**
   * Constant-time comparison between plain password and stored hash
   */
  async comparePassword(plainPassword: string, passwordHash: string): Promise<boolean> {
    if (!plainPassword || !passwordHash) {
      return false;
    }
    return bcrypt.compare(plainPassword, passwordHash);
  },
};
