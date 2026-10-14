import { describe, it, expect } from '@jest/globals';
import { verifyEmailSchema, resendVerificationSchema } from '../../src/validation/authValidation';

describe('authValidation - email verification', () => {
  describe('verifyEmailSchema', () => {
    it('accepts valid token', () => {
      const { error } = verifyEmailSchema.validate({ token: 'a'.repeat(64) });
      expect(error).toBeUndefined();
    });

    it('rejects missing token', () => {
      const { error } = verifyEmailSchema.validate({});
      expect(error).toBeDefined();
    });

    it('rejects empty token', () => {
      const { error } = verifyEmailSchema.validate({ token: '' });
      expect(error).toBeDefined();
    });

    it('rejects non-string token', () => {
      const { error } = verifyEmailSchema.validate({ token: 12345 });
      expect(error).toBeDefined();
    });
  });

  describe('resendVerificationSchema', () => {
    it('accepts valid email', () => {
      const { error } = resendVerificationSchema.validate({ email: 'test@example.com' });
      expect(error).toBeUndefined();
    });

    it('rejects invalid email format', () => {
      const { error } = resendVerificationSchema.validate({ email: 'not-an-email' });
      expect(error).toBeDefined();
    });

    it('rejects missing email', () => {
      const { error } = resendVerificationSchema.validate({});
      expect(error).toBeDefined();
    });

    it('rejects empty email', () => {
      const { error } = resendVerificationSchema.validate({ email: '' });
      expect(error).toBeDefined();
    });
  });
});
