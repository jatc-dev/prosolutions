import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import prismaClient from '../../src/prismaClient';
import { logger } from '../../src/utils/logger';
import { ensureSchemaCompatibility } from '../../src/utils/schemaGuard';

jest.mock('../../src/prismaClient', () => ({
  __esModule: true,
  default: { $queryRaw: jest.fn() },
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

type TableRows = Array<{ table_name: string }>;
const BUSINESS_TABLES = ['CV', 'CVVersion', 'CVAtsAnalysis', 'AuditLog', 'PlatformSetting'];

const mockPrisma = prismaClient as unknown as {
  $queryRaw: jest.MockedFunction<(query: TemplateStringsArray, ...values: unknown[]) => Promise<TableRows>>;
};

describe('ProCV schema guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts the complete business schema without issuing DDL', async () => {
    mockPrisma.$queryRaw.mockResolvedValue(BUSINESS_TABLES.map((table_name) => ({ table_name })));

    await expect(ensureSchemaCompatibility()).resolves.toBeUndefined();

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$queryRaw.mock.calls[0][0].join('')).toContain('information_schema.tables');
    expect(mockPrisma.$queryRaw.mock.calls[0][1]).toEqual(BUSINESS_TABLES);
    expect(logger.info).toHaveBeenCalledWith(
      'ProCV business schema check completed; no local authentication tables are managed by this service',
    );
  });

  it('reports missing business tables and does not recreate local authentication tables', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ table_name: 'CV' }, { table_name: 'AuditLog' }]);

    await expect(ensureSchemaCompatibility()).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'ProCV business schema is incomplete; apply Prisma migrations before serving CV requests',
      { missingTables: ['CVVersion', 'CVAtsAnalysis', 'PlatformSetting'] },
    );
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('contains database errors and logs a diagnostic', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('DB down'));

    await expect(ensureSchemaCompatibility()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'ProCV schema check failed',
      expect.objectContaining({ error: 'DB down' }),
    );
  });
});
