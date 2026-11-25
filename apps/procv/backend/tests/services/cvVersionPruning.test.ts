import { describe, it, expect, jest } from '@jest/globals';
import {
  MAX_CV_VERSIONS,
  pruneCvVersions,
  shouldCreateVersion,
  VERSION_INTERVAL_MS,
} from '../../src/services/cvService';

describe('pruneCvVersions', () => {
  it('keeps the newest versions and deletes the rest', async () => {
    const findMany = jest.fn(async (_args: unknown) => [{ id: 'old-1' }, { id: 'old-2' }]);
    const deleteMany = jest.fn(async (_args: unknown) => ({ count: 2 }));
    await pruneCvVersions({ cVVersion: { findMany, deleteMany } } as never, 'cv-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { cvId: 'cv-1' },
      orderBy: { createdAt: 'desc' },
      skip: MAX_CV_VERSIONS,
      select: { id: true },
    });
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['old-1', 'old-2'] } } });
  });

  it('does nothing while the CV is under the limit', async () => {
    const deleteMany = jest.fn(async () => ({ count: 0 }));
    await pruneCvVersions(
      { cVVersion: { findMany: jest.fn(async () => []), deleteMany } } as never,
      'cv-1',
    );
    expect(deleteMany).not.toHaveBeenCalled();
  });
});

describe('version spacing', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

  it('keeps at most 10 versions, one every 30 minutes of editing', () => {
    expect(MAX_CV_VERSIONS).toBe(10);
    expect(VERSION_INTERVAL_MS).toBe(30 * 60_000);
    expect(shouldCreateVersion(null, now, false)).toBe(true);
    expect(shouldCreateVersion(minutesAgo(5), now, false)).toBe(false);
    expect(shouldCreateVersion(minutesAgo(29), now, false)).toBe(false);
    expect(shouldCreateVersion(minutesAgo(30), now, false)).toBe(true);
  });

  it('always keeps a version when the save changes the photo', () => {
    expect(shouldCreateVersion(minutesAgo(1), now, true)).toBe(true);
  });
});
