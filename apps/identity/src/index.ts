import 'dotenv/config';
import { config } from './config';
import { createApp } from './app';
import prisma from './prismaClient';
import { logger } from './utils/logger';

const port = config.port;
const app = createApp();

let server: import('http').Server;

async function bootstrap() {
  server = app.listen(port, () => {
    logger.info(`🚀 ProIdentity listening on http://localhost:${port}`);
    logger.info(`   Issuer: ${config.issuer}`);
    logger.info(`   Audience: ${config.audience}`);
    logger.info(`   Environment: ${config.isProduction ? 'production' : 'development'}`);
  });

  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;
  server.requestTimeout = 300_000;
}

void bootstrap();

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  const forceExitTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000);
  forceExitTimeout.unref();

  server.close(async (serverError) => {
    if (serverError) {
      logger.error('Error while closing HTTP server', {
        error: serverError.message,
      });
    }

    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected successfully');
    } catch (dbError) {
      logger.error('Error while disconnecting Prisma', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }

    clearTimeout(forceExitTimeout);
    process.exit(serverError ? 1 : 0);
  });
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    error: reason instanceof Error ? reason.message : String(reason),
  });
});
