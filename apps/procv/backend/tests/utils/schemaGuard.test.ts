import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import prismaClient from '../../src/prismaClient';
import { logger } from '../../src/utils/logger';
import { ensureSchemaCompatibility } from '../../src/utils/schemaGuard';

jest.mock('../../src/prismaClient', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  },
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

type QueryRawResult = Array<{ count: number }>;

const mockPrisma = prismaClient as unknown as {
  $queryRaw: jest.MockedFunction<
    (query: TemplateStringsArray, ...values: any[]) => Promise<QueryRawResult>
  >;
  $executeRawUnsafe: jest.MockedFunction<(query: string, ...values: any[]) => Promise<number>>;
};

describe('schemaGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureSchemaCompatibility', () => {
    it('no aplica DDL cuando todas las columnas y tablas ya existen', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // User.emailVerified
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // Session.lastAccessedAt
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // Session.revokedAt
        .mockResolvedValueOnce([{ count: 0 }] as QueryRawResult) // No legacy users need backfill
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // EmailVerificationToken
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult); // PasswordResetToken

      await ensureSchemaCompatibility();

      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Schema compatibility check completed');
    });

    it('aplica ALTER TABLE cuando falta una columna de usuario', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: 0 }] as QueryRawResult) // User.emailVerified falta
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // Session.lastAccessedAt existe
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // Session.revokedAt existe
        .mockResolvedValueOnce([{ count: 0 }] as QueryRawResult) // No legacy users need backfill
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // EmailVerificationToken
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult); // PasswordResetToken

      await ensureSchemaCompatibility();

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false',
      );
      const columnSql = (mockPrisma.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('');
      expect(columnSql).toContain('information_schema.columns');
      expect(mockPrisma.$queryRaw.mock.calls[0][1]).toBe('User');
      expect(mockPrisma.$queryRaw.mock.calls[0][2]).toBe('emailVerified');
    });


    it('restaura el acceso de cuentas anteriores al requisito de verificación', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // User.emailVerified existe
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // Session.lastAccessedAt existe
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // Session.revokedAt existe
        .mockResolvedValueOnce([{ count: 2 }] as QueryRawResult) // Dos cuentas legacy sin verificar
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // EmailVerificationToken existe
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult); // PasswordResetToken existe
      mockPrisma.$executeRawUnsafe.mockResolvedValue(2);

      await ensureSchemaCompatibility();

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "User"'),
      );
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("TIMESTAMP '2026-10-11 00:00:00'"),
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'Restored sign-in eligibility for 2 legacy accounts created before email verification rollout.',
      );
    });

    it('crea tablas cuando faltan', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // User.emailVerified existe
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // Session.lastAccessedAt existe
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // Session.revokedAt existe
        .mockResolvedValueOnce([{ count: 0 }] as QueryRawResult) // No legacy users need backfill
        .mockResolvedValueOnce([{ count: 0 }] as QueryRawResult) // EmailVerificationToken falta
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult); // PasswordResetToken existe

      await ensureSchemaCompatibility();

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS "EmailVerificationToken"'),
      );
      const tableSql = (mockPrisma.$queryRaw.mock.calls[4][0] as TemplateStringsArray).join('');
      expect(tableSql).toContain('information_schema.tables');
      expect(mockPrisma.$queryRaw.mock.calls[4][1]).toBe('EmailVerificationToken');
    });

    it('no falla ni propaga errores cuando $queryRaw falla', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('DB down'));

      await expect(ensureSchemaCompatibility()).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        'Schema compatibility check failed',
        expect.objectContaining({ error: 'DB down' }),
      );
    });

    it('no falla ni propaga errores cuando $executeRawUnsafe falla', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: 0 }] as QueryRawResult) // User.emailVerified falta -> dispara DDL
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult) // Session.lastAccessedAt existe
        .mockResolvedValueOnce([{ count: 1 }] as QueryRawResult); // Session.revokedAt existe
      mockPrisma.$executeRawUnsafe.mockRejectedValue(new Error('DDL failed'));

      await expect(ensureSchemaCompatibility()).resolves.not.toThrow();
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Schema compatibility check failed',
        expect.objectContaining({ error: 'DDL failed' }),
      );
    });
  });
});
