import prisma from '../prismaClient';
import { cache } from '../utils/cache';

// Retry a single time only for transient PostgreSQL connection closures.
// This helper is used only by idempotent, read-only queries.
async function retryTransientRead<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isTransientConnectionClosure =
      /connection.*closed|closed.*connection|kind:\s*Closed|connection reset|server closed the connection unexpectedly/i.test(
        message,
      );

    if (!isTransientConnectionClosure) {
      throw error;
    }

    await new Promise(resolve => setTimeout(resolve, 200));
    return operation();
  }
}

/**
 * Service layer for CV operations
 * Separates business logic from controller logic
 */

export class CVService {
  /**
   * Get all CVs for a user with pagination and caching
   */
  static async getUserCVs(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    cvs: Array<{
      id: string;
      userId: string;
      title: string;
      template: string;
      data: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
    totalCount: number;
  }> {
    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100); // Cap at 100 items per page

    // Calculate skip value
    const skip = (validatedPage - 1) * validatedLimit;

    // Try to get from cache first
    const cacheKey = `user_cvs_${userId}_page_${validatedPage}_limit_${validatedLimit}`;
    const cached = cache.get<{
      cvs: Array<{
        id: string;
        userId: string;
        title: string;
        template: string;
        data: string;
        createdAt: Date;
        updatedAt: Date;
      }>;
      totalCount: number;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, fetch from database with pagination
    const result = await retryTransientRead(() =>
      prisma.$transaction([
        prisma.cV.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: validatedLimit,
        }),
        prisma.cV.count({
          where: { userId },
        }),
      ]),
    );
    const [cvs, totalCount] = result as [
      Array<{
        id: string;
        userId: string;
        title: string;
        template: string;
        data: string;
        createdAt: Date;
        updatedAt: Date;
      }>,
      number,
    ];

    // Store in cache for 30 seconds
    cache.set(cacheKey, { cvs, totalCount }, 30);
    return { cvs, totalCount };
  }

  /**
   * Get a specific CV by ID and user ID with caching
   */
  static async getCVByIdAndUserId(cvId: string, userId: string) {
    // Try to get from cache first
    const cacheKey = `cv_${cvId}_user_${userId}`;
    const cached = cache.get<{
      id: string;
      userId: string;
      title: string;
      template: string;
      data: string;
      createdAt: Date;
      updatedAt: Date;
    } | null>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, fetch from database
    const cv = await prisma.cV.findFirst({
      where: { id: cvId, userId },
    });

    // Store in cache for 60 seconds
    cache.set(cacheKey, cv, 60);
    return cv;
  }

  /**
   * Create a new CV
   * Note: This invalidates relevant cache entries
   */
  static async createCV(userId: string, title: string, template: string, data: unknown) {
    const cv = await prisma.cV.create({
      data: {
        userId,
        title,
        template: template || 'sidebar',
        data: JSON.stringify(data ?? {}),
      },
    });

    // Invalidate user's CVs cache
    cache.deleteByPrefix(`user_cvs_${userId}_page_`);

    return cv;
  }

  /**
   * Update an existing CV
   * Note: This invalidates relevant cache entries
   */
  static async updateCV(
    cvId: string,
    userId: string,
    title?: string,
    template?: string,
    data?: unknown,
  ) {
    const existing = await prisma.cV.findFirst({ where: { id: cvId, userId } });
    if (!existing) {
      throw new Error('CV not found');
    }

    const updated = await prisma.cV.update({
      where: { id: cvId },
      data: {
        title: title ?? existing.title,
        template: template ?? existing.template,
        data: JSON.stringify(data ?? JSON.parse(existing.data ?? '{}')),
      },
    });

    // Create version snapshot
    await prisma.cVVersion.create({
      data: {
        cvId: updated.id,
        snapshot: JSON.stringify(JSON.parse(updated.data ?? '{}')),
      },
    });

    // Invalidate relevant cache entries
    cache.deleteByPrefix(`user_cvs_${userId}_page_`);
    cache.delete(`cv_${cvId}_user_${userId}`);
    cache.delete(`cv_export_${cvId}_user_${userId}`);
    cache.delete(`cv_versions_${cvId}_user_${userId}`);

    return updated;
  }

  /**
   * Delete a CV
   * Note: This invalidates relevant cache entries
   */
  static async deleteCV(cvId: string, userId: string) {
    const cv = await prisma.cV.findFirst({ where: { id: cvId, userId } });
    if (!cv) {
      throw new Error('CV not found');
    }

    await prisma.cV.delete({ where: { id: cvId } });

    // Invalidate relevant cache entries
    cache.deleteByPrefix(`user_cvs_${userId}_page_`);
    cache.delete(`cv_${cvId}_user_${userId}`);
  }

  /**
   * Export CV to PDF
   * Note: This could be cached if PDF generation is expensive
   */
  static async exportCVToPDF(cvId: string, userId: string) {
    // Try to get from cache first
    const cacheKey = `cv_export_${cvId}_user_${userId}`;
    const cached = cache.get<{
      data: any;
      id: string;
      userId: string;
      title: string;
      template: string;
      createdAt: Date;
      updatedAt: Date;
    } | null>(cacheKey);
    if (cached) {
      return cached;
    }

    const cv = await prisma.cV.findFirst({ where: { id: cvId, userId } });
    if (!cv) {
      throw new Error('CV not found');
    }

    // This would normally call the PDF generation utilities
    // For now, we'll return the CV data
    const result = {
      ...cv,
      data: JSON.parse(cv.data ?? '{}'),
    };

    // Cache the result for 5 minutes (PDF generation can be expensive)
    cache.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Get CV versions with caching
   */
  static async getCVVersions(cvId: string, userId: string) {
    // Try to get from cache first
    const cacheKey = `cv_versions_${cvId}_user_${userId}`;
    const cached = cache.get<
      Array<{
        id: string;
        createdAt: Date;
        snapshot: string;
        cvId: string;
      }>
    >(cacheKey);
    if (cached) {
      return cached;
    }

    const cv = await prisma.cV.findFirst({ where: { id: cvId, userId } });
    if (!cv) {
      throw new Error('CV not found');
    }

    const versions = await prisma.cVVersion.findMany({
      where: { cvId },
      orderBy: { createdAt: 'desc' },
    });

    // Store in cache for 60 seconds
    cache.set(cacheKey, versions, 60);
    return versions;
  }

  /**
   * Restore CV version
   * Note: This invalidates relevant cache entries
   */
  static async restoreCVVersion(cvId: string, userId: string, versionId: string) {
    const cv = await prisma.cV.findFirst({ where: { id: cvId, userId } });
    if (!cv) {
      throw new Error('CV not found');
    }

    const version = await prisma.cVVersion.findFirst({ where: { id: versionId, cvId: cvId } });
    if (!version) {
      throw new Error('Version not found');
    }

    const updated = await prisma.cV.update({
      where: { id: cvId },
      data: { data: version.snapshot },
    });

    // Invalidate relevant cache entries
    cache.deleteByPrefix(`user_cvs_${userId}_page_`);
    cache.delete(`cv_${cvId}_user_${userId}`);
    cache.delete(`cv_export_${cvId}_user_${userId}`);
    cache.delete(`cv_versions_${cvId}_user_${userId}`);

    return updated;
  }
}
