/**
 * Version snapshots without repeated photos.
 *
 * The profile photo is stored inside the CV (base64, tens to hundreds of KB)
 * and every save keeps a full copy of the previous content as a version, so
 * the same photo used to be stored once per version. Now, when a save does not
 * change the photo, the version keeps a marker instead of the image.
 *
 * Meaning of the marker: "same photo as the next newer version, or as the CV
 * itself for the newest one". When the photo changes, the version written by
 * that save holds the old photo in full, so older markers resolve to it.
 * Pruning only removes the oldest versions, which never breaks the chain.
 */
export const PHOTO_UNCHANGED = 'procv:photo-unchanged';

type Json = Record<string, unknown>;

function parseObject(raw: string | null | undefined): Json {
  try {
    const parsed = JSON.parse(raw ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Json) : {};
  } catch {
    return {};
  }
}

function photoOf(data: Json): unknown {
  const personal = data.personal;
  return personal && typeof personal === 'object' ? (personal as Json).profileImage : undefined;
}

function withPhoto(data: Json, photo: unknown): Json {
  const personal =
    data.personal && typeof data.personal === 'object' ? (data.personal as Json) : {};
  return { ...data, personal: { ...personal, profileImage: photo } };
}

/**
 * Snapshot of the content being replaced. The photo becomes a marker when the
 * new content keeps the same photo.
 */
export function versionSnapshot(previousRaw: string | null | undefined, next: unknown): string {
  const previous = parseObject(previousRaw);
  const photo = photoOf(previous);
  const nextPhoto = next && typeof next === 'object' ? photoOf(next as Json) : undefined;
  if (typeof photo === 'string' && photo.length > 0 && photo === nextPhoto) {
    return JSON.stringify(withPhoto(previous, PHOTO_UNCHANGED));
  }
  return JSON.stringify(previous);
}

/**
 * Restores the real photo in each snapshot. `versions` must be ordered newest
 * first and include every version newer than the ones that are needed.
 */
export function resolveVersionPhotos<T extends { snapshot: string }>(
  currentRaw: string | null | undefined,
  versions: T[],
): T[] {
  let newerPhoto = photoOf(parseObject(currentRaw));
  return versions.map(version => {
    const data = parseObject(version.snapshot);
    const photo = photoOf(data);
    if (photo === PHOTO_UNCHANGED) {
      return { ...version, snapshot: JSON.stringify(withPhoto(data, newerPhoto)) };
    }
    newerPhoto = photo;
    return version;
  });
}
