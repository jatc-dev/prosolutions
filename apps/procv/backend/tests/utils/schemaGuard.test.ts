import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import prismaClient from '../../src/prismaClient';
import { ensureSchemaCompatibility } from '../../src/utils/schemaGuard';

jest.mock('../../src/prismaClient', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  },
}));

type QueryResult = Array<{ identity_account_exists: boolean }>;

const mockPrisma = prismaClient as unknown as {
  $queryRaw: jest.MockedFunction<
    (query: TemplateStringsArray, ...values: unknown[]) => Promise<QueryResult>
  >;
  $executeRawUnsafe: jest.MockedFunction<(query: string, ...values: unknown[]) => Promise<number>>;
};

describe('schemaGuard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates the IdentityAccount reference without changing the database', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ identity_account_exists: true }] as QueryResult);

    await expect(ensureSchemaCompatibility()).resolves.toBeUndefined();

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('fails startup readiness if the central identity reference is missing', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ identity_account_exists: false }] as QueryResult);

    await expect(ensureSchemaCompatibility()).rejects.toThrow(
      'ProCV database migration missing: public.IdentityAccount',
    );
    expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('propagates database-read errors instead of silently starting with an unknown schema', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('DB down'));

    await expect(ensureSchemaCompatibility()).rejects.toThrow('DB down');
    expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});
