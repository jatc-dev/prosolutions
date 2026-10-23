import 'dotenv/config';
import { config } from './config';
import { createApp } from './app';
import prisma from './prismaClient';
import { logger } from './utils/logger';
import { closeBrowser } from './utils/pdfGenerator';

const port = config.port;
const app = createApp();

let server: import('http').Server;

async function bootstrap() {
  server = app.listen(port, () => {
    logger.info(`🚀 ProCV backend listening on http://localhost:${port}`);
  });

  // HTTP resilience: keep-alive slightly above the proxy idle window so Render's
  // load balancer never reuses a socket the server is about to close.
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

  server.close(async serverError => {
    if (serverError) {
      logger.error('Error while closing HTTP server', { error: serverError.message });
    }

    try {
      await closeBrowser();
      logger.info('Puppeteer browser closed successfully');
    } catch (browserError) {
      logger.warn('Error closing browser during shutdown', {
        error: browserError instanceof Error ? browserError.message : String(browserError),
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

process.on('unhandledRejection', reason => {
  logger.error('Unhandled promise rejection', {
    error: reason instanceof Error ? reason.message : String(reason),
  });
});
