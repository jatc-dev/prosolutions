import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { logger } from './utils/logger';

const logConfig = config.isProduction
  ? [
      { emit: 'event' as const, level: 'warn' as const },
      { emit: 'event' as const, level: 'error' as const },
    ]
  : [
      { emit: 'event' as const, level: 'query' as const },
      { emit: 'event' as const, level: 'warn' as const },
      { emit: 'event' as const, level: 'error' as const },
    ];

const prisma = new PrismaClient({ log: logConfig });

prisma.$on('warn', (e: { message: string }) => {
  logger.warn('Prisma client warning', { message: e.message });
});

prisma.$on('error', (e: { message: string }) => {
  logger.error('Prisma client error', { message: e.message });
});

if (!config.isProduction) {
  prisma.$on('query', (e: { query: string; duration: number }) => {
    logger.debug('Prisma query', { query: e.query, durationMs: e.duration });
  });
}

export default prisma;
