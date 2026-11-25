import { describe, it, expect, jest } from '@jest/globals';
import { MAX_CV_VERSIONS, pruneCvVersions } from '../../src/services/cvService';

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
