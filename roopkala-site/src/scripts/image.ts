// Shrinks a photo in the browser before upload: full size (max 1600px, ~250KB) and a 480px thumbnail.
// Re-drawing on a canvas also strips location/camera data (EXIF).
import { dominantHex, fitSize } from '../lib/adminForm.ts';

export interface Processed { ext: 'webp' | 'jpg'; full: Blob; w: number; h: number; thumb: Blob; tint: string | null }

function encode(bmp: ImageBitmap, max: number, target: number, hardMax: number, type: string): Promise<{ blob: Blob; w: number; h: number }> {
  return new Promise(async (resolve, reject) => {
    let side = max;
    for (let round = 0; round < 4; round++) {
      const { w, h } = fitSize(bmp.width, bmp.height, side);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      if (!g) return reject(new Error('Cannot process image in this browser'));
      g.drawImage(bmp, 0, 0, w, h);
      let blob: Blob | null = null;
      for (let q = 0.82; q >= 0.4; q -= 0.1) {
        blob = await new Promise<Blob | null>((r) => c.toBlob(r, type, q));
        if (blob && blob.size <= target) break;
      }
      if (blob && blob.size <= hardMax) return resolve({ blob, w, h });
      side = Math.round(side * 0.85);
    }
    reject(new Error('Photo is too large even after shrinking'));
  });
}

export interface ProcessOpts { max?: number; target?: number; thumb?: boolean }

export async function processImage(file: File, opts: ProcessOpts = {}): Promise<Processed> {
  if (!/^image\//.test(file.type)) throw new Error(`${file.name} is not an image`);
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    // Browsers that cannot make WebP (older Safari) silently return PNG, so check what we got.
    const probe = document.createElement('canvas'); probe.width = probe.height = 1;
    const webp = await new Promise<Blob | null>((r) => probe.toBlob(r, 'image/webp', 0.8));
    const type = webp?.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const full = await encode(bmp, opts.max ?? 1600, opts.target ?? 250_000, 900_000, type);
    const thumb = opts.thumb === false ? full : await encode(bmp, 480, 40_000, 200_000, type);
    const s = document.createElement('canvas'); s.width = s.height = 32;
    const sg = s.getContext('2d', { willReadFrequently: true });
    let tint: string | null = null;
    if (sg) { sg.drawImage(bmp, 0, 0, 32, 32); tint = dominantHex(sg.getImageData(0, 0, 32, 32).data); }
    return { ext: type === 'image/webp' ? 'webp' : 'jpg', full: full.blob, w: full.w, h: full.h, thumb: thumb.blob, tint };
  } finally { bmp.close(); }
}
