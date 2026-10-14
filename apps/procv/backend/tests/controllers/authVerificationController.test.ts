import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import crypto from 'crypto';
import prismaClient from '../../src/prismaClient';
import { sendVerificationEmail } from '../../src/services/emailService';
import {
  verifyEmail,
  resendVerification,
  getVerificationCooldown,
} from '../../src/controllers/authController';

jest.mock('../../src/prismaClient', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    emailVerificationToken: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../src/services/emailService', () => ({
  __esModule: true,
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/config', () => ({
  __esModule: true,
  config: {
    jwtSecret: 'test-jwt-secret-for-testing-only-32chars',
    jwtExpiresIn: '1h',
    jwtRefreshExpiresIn: '7d',
    frontendUrl: 'http://localhost:3000',
  },
}));

// Loose mock function type for Prisma test doubles.
type MockedFn = jest.Mock<any>;

const mockPrisma = prismaClient as unknown as {
  user: { findUnique: MockedFn; update: MockedFn };
  emailVerificationToken: {
    findUnique: MockedFn;
    findFirst: MockedFn;
    create: MockedFn;
    deleteMany: MockedFn;
    update: MockedFn;
  };
  session: { create: MockedFn };
  $transaction: MockedFn;
};

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    cookie: jest.fn(),
  } as unknown as Response;
}

describe('authController - email verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyEmail', () => {
    it('returns 400 for missing token', async () => {
      const req = { body: {} } as Request;
      const res = mockResponse();

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });

    it('returns 400 for empty token', async () => {
      const req = { body: { token: '' } } as Request;
      const res = mockResponse();

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 401 for invalid (non-existent) token', async () => {
      const token = 'a'.repeat(64);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue(null);

      const req = { body: { token } } as Request;
      const res = mockResponse();

      await verifyEmail(req, res);

      expect(mockPrisma.emailVerificationToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash },
        include: { user: true },
      });
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid or expired verification token',
      });
    });

    it('returns 401 for expired token', async () => {
      const token = 'b'.repeat(64);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const pastDate = new Date(Date.now() - 1000);

      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 1,
        userId: 'user1',
        tokenHash,
        expiresAt: pastDate,
        used: false,
        user: { id: 'user1', email: 'test@example.com' },
      });

      const req = { body: { token } } as Request;
      const res = mockResponse();

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 401 for already used token', async () => {
      const token = 'c'.repeat(64);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 2,
        userId: 'user2',
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
        used: true,
        user: { id: 'user2', email: 'used@example.com' },
      });

      const req = { body: { token } } as Request;
      const res = mockResponse();

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('verifies email successfully and issues a session', async () => {
      const token = 'd'.repeat(64);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const futureDate = new Date(Date.now() + 3600000);

      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 3,
        userId: 'user3',
        tokenHash,
        expiresAt: futureDate,
        used: false,
        user: { id: 'user3', email: 'new@example.com', name: 'New', role: 'user' },
      });

      mockPrisma.$transaction.mockResolvedValue([
        { id: 'user3', emailVerified: true },
        { id: 3, used: true },
      ]);
      mockPrisma.session.create.mockResolvedValue({ id: 'session-1' });

      const req = { body: { token } } as Request;
      const res = mockResponse();

      await verifyEmail(req, res);

      expect(mockPrisma.session.create).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Email verified successfully',
        accessToken: expect.any(String),
        user: {
          id: 'user3',
          email: 'new@example.com',
          name: 'New',
          role: 'user',
          emailVerified: true,
        },
      });
    });

    it('returns 500 on internal error', async () => {
      const token = 'e'.repeat(64);
      mockPrisma.emailVerificationToken.findUnique.mockRejectedValue(new Error('DB error'));

      const req = { body: { token } } as Request;
      const res = mockResponse();

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });
  });

  describe('resendVerification', () => {
    it('returns 400 for missing email', async () => {
      const req = { body: {} } as Request;
      const res = mockResponse();

      await resendVerification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for invalid email format', async () => {
      const req = { body: { email: 'not-an-email' } } as Request;
      const res = mockResponse();

      await resendVerification(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('does not leak whether user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req = { body: { email: 'nonexistent@example.com' } } as Request;
      const res = mockResponse();

      await resendVerification(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message:
          'If an account with that email exists and has not been verified, a verification link has been sent.',
        retryAfterSeconds: 60,
      });
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('sends verification email for existing user with no recent token', async () => {
      const user = { id: 'user1', email: 'test@example.com', emailVerified: false };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.emailVerificationToken.findFirst.mockResolvedValue(null);
      mockPrisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.emailVerificationToken.create.mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      const req = { body: { email: 'Test@Example.com' } } as Request;
      const res = mockResponse();

      await resendVerification(req, res);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPrisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: user.id },
      });
      expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalled();
      expect(sendVerificationEmail).toHaveBeenCalled();
    });

    it('sends verification email when the last token is older than the cooldown', async () => {
      const user = { id: 'user1', email: 'test@example.com', emailVerified: false };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.emailVerificationToken.findFirst.mockResolvedValue({
        id: 'old-token',
        createdAt: new Date(Date.now() - 61 * 1000),
      });
      mockPrisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.emailVerificationToken.create.mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      const req = { body: { email: 'test@example.com' } } as Request;
      const res = mockResponse();

      await resendVerification(req, res);

      expect(sendVerificationEmail).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(429);
    });

    it('blocks resend within the cooldown window with 429 and retryAfterSeconds', async () => {
      const user = { id: 'user1', email: 'test@example.com', emailVerified: false };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.emailVerificationToken.findFirst.mockResolvedValue({
        id: 'fresh-token',
        createdAt: new Date(Date.now() - 20 * 1000), // 20s ago
      });

      const req = { body: { email: 'test@example.com' } } as Request;
      const res = mockResponse();

      await resendVerification(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining('40'),
        retryAfterSeconds: 40,
      });
      expect(mockPrisma.emailVerificationToken.create).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('getVerificationCooldown', () => {
    it('returns 0 when the email is missing or invalid', async () => {
      const res = mockResponse();

      await getVerificationCooldown({ query: {} } as unknown as Request, res);

      expect(res.json).toHaveBeenCalledWith({ retryAfterSeconds: 0 });
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('returns 0 when the user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = mockResponse();

      await getVerificationCooldown(
        { query: { email: 'nobody@example.com' } } as unknown as Request,
        res,
      );

      expect(res.json).toHaveBeenCalledWith({ retryAfterSeconds: 0 });
    });

    it('returns 0 when there is no token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user1' });
      mockPrisma.emailVerificationToken.findFirst.mockResolvedValue(null);
      const res = mockResponse();

      await getVerificationCooldown(
        { query: { email: 'user@example.com' } } as unknown as Request,
        res,
      );

      expect(res.json).toHaveBeenCalledWith({ retryAfterSeconds: 0 });
    });

    it('returns the remaining seconds when the last email is recent', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user1' });
      mockPrisma.emailVerificationToken.findFirst.mockResolvedValue({
        id: 'fresh-token',
        createdAt: new Date(Date.now() - 20 * 1000), // 20s ago
      });
      const res = mockResponse();

      await getVerificationCooldown(
        { query: { email: 'user@example.com' } } as unknown as Request,
        res,
      );

      expect(res.json).toHaveBeenCalledWith({ retryAfterSeconds: 40 });
    });

    it('returns 0 when the last email is older than the cooldown', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user1' });
      mockPrisma.emailVerificationToken.findFirst.mockResolvedValue({
        id: 'old-token',
        createdAt: new Date(Date.now() - 61 * 1000),
      });
      const res = mockResponse();

      await getVerificationCooldown(
        { query: { email: 'user@example.com' } } as unknown as Request,
        res,
      );

      expect(res.json).toHaveBeenCalledWith({ retryAfterSeconds: 0 });
    });
  });
});
