import { withUserContext } from '../dbContext';
import { cache } from '../utils/cache';

async function retryTransientRead<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const transient =
      /connection.*closed|closed.*connection|kind:\s*Closed|connection reset|server closed the connection unexpectedly/i.test(message);
    if (!transient) throw error;
    await new Promise(resolve => setTimeout(resolve, 200));
    return operation();
  }
}

export class CVService {
  static async getUserCVs(userId: string, page = 1, limit = 10): Promise<{
    cvs: Array<{
      id: string; userId: string; title: string; template: string; data: string;
      createdAt: Date; updatedAt: Date;
    }>;
    totalCount: number;
  }> {
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);
    const skip = (validatedPage - 1) * validatedLimit;
    const cacheKey = `user_cvs_${userId}_page_${validatedPage}_limit_${validatedLimit}`;
    const cached = cache.get<{ cvs: any[]; totalCount: number }>(cacheKey);
    if (cached) return cached as any;

    const result = await retryTransientRead(() => withUserContext(userId, async tx => {
      const [cvs, totalCount] = await Promise.all([
        tx.cV.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, skip, take: validatedLimit }),
        tx.cV.count({ where: { userId } }),
      ]);
      return { cvs, totalCount };
    }));
    cache.set(cacheKey, result, 30);
    return result;
  }

  static async getCVByIdAndUserId(cvId: string, userId: string) {
    const cacheKey = `cv_${cvId}_user_${userId}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) return cached;
    const cv = await withUserContext(userId, tx =>
      tx.cV.findFirst({ where: { id: cvId, userId } }),
    );
    cache.set(cacheKey, cv, 60);
    return cv;
  }

  static async createCV(userId: string, title: string, template: string, data: unknown) {
    const cv = await withUserContext(userId, tx => tx.cV.create({
      data: { userId, title, template: template || 'sidebar', data: JSON.stringify(data ?? {}) },
    }));
    cache.deleteByPrefix(`user_cvs_${userId}_page_`);
    return cv;
  }

  static async updateCV(cvId: string, userId: string, title?: string, template?: string, data?: unknown) {
    const updated = await withUserContext(userId, async tx => {
      const existing = await tx.cV.findFirst({ where: { id: cvId, userId } });
      if (!existing) throw new Error('CV not found');
      const next = await tx.cV.update({
        where: { id: cvId },
        data: {
          title: title ?? existing.title,
          template: template ?? existing.template,
          data: JSON.stringify(data ?? JSON.parse(existing.data ?? '{}')),
        },
      });
      await tx.cVVersion.create({
        data: { cvId: next.id, snapshot: JSON.stringify(JSON.parse(next.data ?? '{}')) },
      });
      return next;
    });
    cache.deleteByPrefix(`user_cvs_${userId}_page_`);
    cache.delete(`cv_${cvId}_user_${userId}`);
    cache.delete(`cv_export_${cvId}_user_${userId}`);
    cache.delete(`cv_versions_${cvId}_user_${userId}`);
    return updated;
  }

  static async deleteCV(cvId: string, userId: string) {
    await withUserContext(userId, async tx => {
      const cv = await tx.cV.findFirst({ where: { id: cvId, userId } });
      if (!cv) throw new Error('CV not found');
      await tx.cV.delete({ where: { id: cvId } });
    });
    cache.deleteByPrefix(`user_cvs_${userId}_page_`);
    cache.delete(`cv_${cvId}_user_${userId}`);
  }

  static async exportCVToPDF(cvId: string, userId: string) {
    const cacheKey = `cv_export_${cvId}_user_${userId}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) return cached;
    const cv = await withUserContext(userId, tx =>
      tx.cV.findFirst({ where: { id: cvId, userId } }),
    );
    if (!cv) throw new Error('CV not found');
    const result = { ...cv, data: JSON.parse(cv.data ?? '{}') };
    cache.set(cacheKey, result, 300);
    return result;
  }

  static async getCVVersions(cvId: string, userId: string) {
    const cacheKey = `cv_versions_${cvId}_user_${userId}`;
    const cached = cache.get<any[]>(cacheKey);
    if (cached) return cached;
    const versions = await withUserContext(userId, async tx => {
      const cv = await tx.cV.findFirst({ where: { id: cvId, userId }, select: { id: true } });
      if (!cv) throw new Error('CV not found');
      return tx.cVVersion.findMany({ where: { cvId }, orderBy: { createdAt: 'desc' } });
    });
    cache.set(cacheKey, versions, 60);
    return versions;
  }

  static async restoreCVVersion(cvId: string, userId: string, versionId: string) {
    const updated = await withUserContext(userId, async tx => {
      const cv = await tx.cV.findFirst({ where: { id: cvId, userId } });
      if (!cv) throw new Error('CV not found');
      const version = await tx.cVVersion.findFirst({ where: { id: versionId, cvId } });
      if (!version) throw new Error('Version not found');
      return tx.cV.update({ where: { id: cvId }, data: { data: version.snapshot } });
    });
    cache.deleteByPrefix(`user_cvs_${userId}_page_`);
    cache.delete(`cv_${cvId}_user_${userId}`);
    cache.delete(`cv_export_${cvId}_user_${userId}`);
    cache.delete(`cv_versions_${cvId}_user_${userId}`);
    return updated;
  }
}
