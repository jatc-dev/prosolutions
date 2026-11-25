/**
 * Profile photos are stored inside the CV (base64), and every saved version
 * used to copy them, so a phone photo of several MB weighed a lot. Before it
 * is stored, the photo is shrunk to at most PHOTO_MAX_SIDE pixels and saved as
 * JPEG: plenty for a CV (shown at ~150 px, exported at 2×) and usually 40–80 KB.
 */
export const PHOTO_MAX_SIDE = 640;
export const PHOTO_JPEG_QUALITY = 0.86;
/** Larger files are rejected before decoding (they are shrunk anyway). */
export const PHOTO_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Target size keeping the aspect ratio; never enlarges. */
export function fitWithin(width: number, height: number, maxSide = PHOTO_MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo abrir la imagen"));
    image.src = src;
  });
}

/** Shrinks a photo to a JPEG data URL; returns the original when it is already smaller. */
export async function shrinkPhoto(file: Blob): Promise<string> {
  const original = await readAsDataUrl(file);
  try {
    const image = await loadImage(original);
    const { width, height } = fitWithin(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return original;
    // JPEG has no transparency: transparent PNG areas become white, not black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);
    const shrunk = canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY);
    return shrunk.startsWith("data:image/jpeg") && shrunk.length < original.length ? shrunk : original;
  } catch {
    // Formats the browser cannot draw (e.g. some HEIC) keep the original.
    return original;
  }
}
