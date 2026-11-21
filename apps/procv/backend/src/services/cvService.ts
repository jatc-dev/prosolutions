import { withUserContext } from '../dbContext';
import { cache } from '../utils/cache';
import { writeAuditLog } from '../utils/auditLogger';

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
      withUserContext(userId, async tx =>
        Promise.all([
          tx.cV.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: validatedLimit,
          }),
          tx.cV.count({ where: { userId } }),
        ]),
      ),
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
    const cv = await withUserContext(userId, tx =>
      tx.cV.findFirst({ where: { id: cvId, userId } }),
    );

    // Store in cache for 60 seconds
    cache.set(cacheKey, cv, 60);
    return cv;
  }

  /**
   * Create a new CV
   * Note: This invalidates relevant cache entries
   */
  static async createCV(userId: string, title: string, template: string, data: unknown) {
    const cv = await withUserContext(userId, async tx => {
      const created = await tx.cV.create({
        data: {
          userId,
          title,
          template: template || 'sidebar',
          data: JSON.stringify(data ?? {}),
        },
      });
      await writeAuditLog(tx, {
        actorId: userId,
        action: 'create',
        resourceType: 'cv',
        resourceId: created.id,
      });
      return created;
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
    const updated = await withUserContext(userId, async tx => {
      const existing = await tx.cV.findFirst({ where: { id: cvId, userId } });
      if (!existing) {
        throw new Error('CV not found');
      }

      const saved = await tx.cV.update({
        where: { id: cvId },
        data: {
          title: title ?? existing.title,
          template: template ?? existing.template,
          data: JSON.stringify(data ?? JSON.parse(existing.data ?? '{}')),
        },
      });

      await tx.cVVersion.create({
        data: {
          cvId: saved.id,
          snapshot: JSON.stringify(JSON.parse(existing.data ?? '{}')),
        },
      });
      await writeAuditLog(tx, {
        actorId: userId,
        action: 'update',
        resourceType: 'cv',
        resourceId: saved.id,
      });
      return saved;
    });

    // Invalidate relevant cache entries
    cache.deleteByPrefix(`user_cvs_${userId}_page_`);
    cache.delete(`cv_${cvId}_user_${userId}`);
    cache.delete(`cv_versions_${cvId}_user_${userId}`);

    return updated;
  }

  /**
   * Delete a CV
   * Note: This invalidates relevant cache entries
   */
  static async deleteCV(cvId: string, userId: string) {
    await withUserContext(userId, async tx => {
      const cv = await tx.cV.findFirst({ where: { id: cvId, userId } });
      if (!cv) {
        throw new Error('CV not found');
      }
      await tx.cV.delete({ where: { id: cvId } });
      await writeAuditLog(tx, {
        actorId: userId,
        action: 'delete',
        resourceType: 'cv',
        resourceId: cvId,
      });
    });

    // Invalidate relevant cache entries
    cache.deleteByPrefix(`user_cvs_${userId}_page_`);
    cache.delete(`cv_${cvId}_user_${userId}`);
    cache.delete(`cv_versions_${cvId}_user_${userId}`);
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

    const versions = await withUserContext(userId, async tx => {
      const cv = await tx.cV.findFirst({ where: { id: cvId, userId } });
      if (!cv) {
        throw new Error('CV not found');
      }
      return tx.cVVersion.findMany({
        where: { cvId },
        orderBy: { createdAt: 'desc' },
      });
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
    const updated = await withUserContext(userId, async tx => {
      const cv = await tx.cV.findFirst({ where: { id: cvId, userId } });
      if (!cv) {
        throw new Error('CV not found');
      }

      const version = await tx.cVVersion.findFirst({ where: { id: versionId, cvId } });
      if (!version) {
        throw new Error('Version not found');
      }

      await tx.cVVersion.create({
        data: { cvId, snapshot: JSON.stringify(JSON.parse(cv.data ?? '{}')) },
      });
      const restored = await tx.cV.update({
        where: { id: cvId },
        data: { data: version.snapshot },
      });
      await writeAuditLog(tx, {
        actorId: userId,
        action: 'restore_version',
        resourceType: 'cv',
        resourceId: cvId,
        details: { versionId },
      });
      return restored;
    });

    // Invalidate relevant cache entries
    cache.deleteByPrefix(`user_cvs_${userId}_page_`);
    cache.delete(`cv_${cvId}_user_${userId}`);
    cache.delete(`cv_versions_${cvId}_user_${userId}`);

    return updated;
  }
}
