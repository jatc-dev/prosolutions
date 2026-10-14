// Basic monitoring utilities for the application
// In production, you might want to use more sophisticated solutions like Prometheus, Datadog, etc.
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { logger } from './logger';

const DEFAULT_HEALTH_DB_TIMEOUT_MS = 2500;

function getHealthDbTimeoutMs(): number {
  const rawTimeout = process.env.HEALTH_DB_TIMEOUT_MS;
  if (!rawTimeout) {
    return DEFAULT_HEALTH_DB_TIMEOUT_MS;
  }

  const parsed = Number(rawTimeout);
  if (!Number.isInteger(parsed) || parsed < 100 || parsed > 30000) {
    return DEFAULT_HEALTH_DB_TIMEOUT_MS;
  }

  return parsed;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

interface Metrics {
  requestCount: number;
  errorCount: number;
  responseTimes: number[];
  startTime: number;
}

class Monitoring {
  private static instance: Monitoring;
  private metrics: Metrics;

  private constructor() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      responseTimes: [],
      startTime: Date.now(),
    };
  }

  public static getInstance(): Monitoring {
    if (!Monitoring.instance) {
      Monitoring.instance = new Monitoring();
    }
    return Monitoring.instance;
  }

  public incrementRequestCount(): void {
    this.metrics.requestCount++;
  }

  public incrementErrorCount(): void {
    this.metrics.errorCount++;
  }

  public recordResponseTime(timeMs: number): void {
    this.metrics.responseTimes.push(timeMs);
    // Keep only the last 1000 response times to prevent memory growth
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes.shift();
    }
  }

  public getMetrics(): Metrics {
    return { ...this.metrics };
  }

  public getAverageResponseTime(): number {
    if (this.metrics.responseTimes.length === 0) {
      return 0;
    }
    const sum = this.metrics.responseTimes.reduce((acc, time) => acc + time, 0);
    return sum / this.metrics.responseTimes.length;
  }

  public getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.metrics.startTime) / 1000);
  }

  public reset(): void {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      responseTimes: [],
      startTime: Date.now(),
    };
  }
}

export const monitoring = Monitoring.getInstance();

// Middleware to monitor requests
export function monitorRequests(): RequestHandler {
  return function (_req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    // Increment request counter
    monitoring.incrementRequestCount();

    // Record response time when finished
    res.on('finish', () => {
      const responseTime = Date.now() - start;
      monitoring.recordResponseTime(responseTime);
    });

    // Count errors
    res.on('close', () => {
      if (res.statusCode >= 400) {
        monitoring.incrementErrorCount();
      }
    });

    next();
  };
}

// Health check endpoint handler
export async function healthCheck(_req: Request, res: Response) {
  const uptime = monitoring.getUptimeSeconds();
  const avgResponseTime = monitoring.getAverageResponseTime();
  const dbTimeoutMs = getHealthDbTimeoutMs() || 10000;

  // Check database connectivity
  let databaseStatus: string;
  let databaseError: string | null = null;

  try {
    // Import prisma dynamically to avoid circular imports
    const { default: prisma } = await import('../prismaClient');
    await withTimeout(
      prisma.$queryRaw`SELECT 1`,
      dbTimeoutMs,
      `Database health check timed out after ${dbTimeoutMs}ms`,
    );
    databaseStatus = 'CONNECTED';
  } catch (error: unknown) {
    databaseStatus = 'ERROR';
    databaseError = error instanceof Error ? error.message : 'Unknown database error';
    logger.error('Database connection error during health check', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const status = databaseStatus === 'CONNECTED' ? 'OK' : 'DEGRADED';

  res.status(databaseStatus === 'CONNECTED' ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: uptime,
    database: {
      status: databaseStatus,
      error: databaseError,
    },
    metrics: {
      requestCount: monitoring.getMetrics().requestCount,
      errorCount: monitoring.getMetrics().errorCount,
      averageResponseTimeMs: avgResponseTime,
    },
  });
}
