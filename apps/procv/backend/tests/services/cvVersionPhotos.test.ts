import { describe, it, expect } from '@jest/globals';
import {
  PHOTO_UNCHANGED,
  resolveVersionPhotos,
  versionSnapshot,
} from '../../src/services/cvVersionPhotos';

const cv = (summary: string, photo?: string) =>
  JSON.stringify({ personal: { summary, ...(photo ? { profileImage: photo } : {}) } });

describe('version snapshots without repeated photos', () => {
  it('stores a marker when the save keeps the same photo, the photo when it changes', () => {
    const same = JSON.parse(versionSnapshot(cv('v1', 'PHOTO_A'), JSON.parse(cv('v2', 'PHOTO_A'))));
    expect(same.personal).toEqual({ summary: 'v1', profileImage: PHOTO_UNCHANGED });

    const changed = JSON.parse(
      versionSnapshot(cv('v1', 'PHOTO_A'), JSON.parse(cv('v2', 'PHOTO_B'))),
    );
    expect(changed.personal.profileImage).toBe('PHOTO_A');

    const removed = JSON.parse(versionSnapshot(cv('v1', 'PHOTO_A'), JSON.parse(cv('v2'))));
    expect(removed.personal.profileImage).toBe('PHOTO_A');

    expect(
      JSON.parse(versionSnapshot(cv('v1'), JSON.parse(cv('v2')))).personal.profileImage,
    ).toBeUndefined();
  });

  it('resolves every version to the photo it really had', () => {
    // History: v1..v2 with photo A, v3 changed it to B, v4 (current) keeps B.
    const v1 = versionSnapshot(cv('v1', 'A'), JSON.parse(cv('v2', 'A')));
    const v2 = versionSnapshot(cv('v2', 'A'), JSON.parse(cv('v3', 'B')));
    const v3 = versionSnapshot(cv('v3', 'B'), JSON.parse(cv('v4', 'B')));
    const current = cv('v4', 'B');

    const resolved = resolveVersionPhotos(current, [
      { id: 'v3', snapshot: v3 },
      { id: 'v2', snapshot: v2 },
      { id: 'v1', snapshot: v1 },
    ]).map(version => JSON.parse(version.snapshot).personal);

    expect(resolved).toEqual([
      { summary: 'v3', profileImage: 'B' },
      { summary: 'v2', profileImage: 'A' },
      { summary: 'v1', profileImage: 'A' },
    ]);
  });
});
