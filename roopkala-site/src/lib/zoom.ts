// Zoom and pan maths for the full-screen photo viewer. Pure functions so they can be tested without a browser.
export interface View { scale: number; x: number; y: number }
export const MAX_SCALE = 5;

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Size of a picture shown "contained" (whole picture visible) inside a viewport. Never enlarged beyond its own pixels x2. */
export function containSize(vw: number, vh: number, iw: number, ih: number): { w: number; h: number } {
  if (iw <= 0 || ih <= 0 || vw <= 0 || vh <= 0) return { w: Math.max(vw, 1), h: Math.max(vh, 1) };
  const k = Math.min(vw / iw, vh / ih);
  return { w: iw * k, h: ih * k };
}

/** Keeps zoom within limits and the picture from being dragged away from the screen. */
export function clampView(v: View, vw: number, vh: number, w: number, h: number): View {
  const scale = clamp(v.scale, 1, MAX_SCALE);
  const maxX = Math.max(0, (w * scale - vw) / 2);
  const maxY = Math.max(0, (h * scale - vh) / 2);
  return { scale, x: clamp(v.x, -maxX, maxX) + 0, y: clamp(v.y, -maxY, maxY) + 0 };
}

/** Zooms by `factor` keeping the point (px, py), measured from the viewport centre, fixed under the finger or cursor. */
export function zoomAround(v: View, factor: number, px: number, py: number, vw: number, vh: number, w: number, h: number): View {
  const scale = clamp(v.scale * factor, 1, MAX_SCALE);
  const k = scale / v.scale;
  return clampView({ scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k }, vw, vh, w, h);
}
