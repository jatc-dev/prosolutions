import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import prismaClient from '../../src/prismaClient';
import { sendVerificationEmail } from '../../src/services/emailService';
import { register } from '../../src/controllers/authController';

jest.mock('../../src/prismaClient', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    emailVerificationToken: {
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
    },
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
    jwtExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
    frontendUrl: 'http://localhost:3000',
    isProduction: false,
  },
}));

// Loose mock function type for Prisma test doubles.
// Con @jest/globals v30, jest.Mock<T> tipa la funcion mockeada (no el valor de
// retorno como en @types/jest), por lo que hay que usar la firma de la funcion.
type MockedFn = jest.MockedFunction<(...args: any[]) => Promise<any>>;

const mockPrisma = prismaClient as unknown as {
  user: { findUnique: MockedFn; create: MockedFn };
  emailVerificationToken: { create: MockedFn };
  session: { create: MockedFn };
};

function mockResponse() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
    cookie: jest.fn(),
  };
  return res;
}

function mockRequest(body: Record<string, unknown>): Request {
  return {
    body,
    method: 'POST',
    path: '/api/auth/register',
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as Request;
}

const validBody = { email: 'new.user@example.com', password: 'Password123', name: 'New User' };

describe('authController - register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // emailService returns Promise<boolean> and never throws.
    (sendVerificationEmail as MockedFn).mockResolvedValue(true);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'new.user@example.com',
      name: 'New User',
      role: 'user',
      emailVerified: false,
    });
    mockPrisma.emailVerificationToken.create.mockResolvedValue({ id: 'token-1' });
    mockPrisma.session.create.mockResolvedValue({ id: 'session-1' });
  });

  it('creates the user and responds 201 without issuing any credentials', async () => {
    const res = mockResponse();

    await register(mockRequest(validBody), res as unknown as Response);

    expect(mockPrisma.user.create).toHaveBeenCalled();
    // No session, no refresh cookie and no token before email verification.
    expect(mockPrisma.session.create).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      message: expect.stringContaining('verification'),
      email: 'new.user@example.com',
    });
    expect(sendVerificationEmail).toHaveBeenCalled();
  });

  it('responds 201 even when the verification email never completes (email must not block registration)', async () => {
    // Regression test for production: a hanging SMTP connection used to leave
    // the register request open until the client gave up, even though the user
    // was already created (second attempt returned 409).
    (sendVerificationEmail as MockedFn).mockReturnValue(new Promise(() => {}));
    const res = mockResponse();

    await register(mockRequest(validBody), res as unknown as Response);

    expect(res.statusCode).toBe(201);
    expect(sendVerificationEmail).toHaveBeenCalled();
  });

  it('returns 409 when the email is already registered', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });
    const res = mockResponse();

    await register(mockRequest(validBody), res as unknown as Response);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ message: 'Email already registered' });
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid input', async () => {
    const res = mockResponse();

    await register(
      mockRequest({ email: 'not-an-email', password: 'x' }),
      res as unknown as Response,
    );

    expect(res.statusCode).toBe(400);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});
