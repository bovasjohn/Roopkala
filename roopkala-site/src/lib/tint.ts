import { isHex } from './format.ts';

/** HSL (h 0-360, s and l 0-100) from a #RRGGBB colour. */
export function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const M = Math.max(r, g, b), m = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (M + m) / 2;
  if (M !== m) {
    const d = M - m;
    s = l > 0.5 ? d / (2 - M - m) : d / (M + m);
    h = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

/**
 * Soft, muted page tints for a product page, derived from one stored colour.
 * "auto" = the photo's dominant colour (calmed down hard); "manual" = the admin's pick (calmed a little).
 * Returns a light-mode and a dark-mode colour, or null when no usable colour is stored.
 */
export function tintVars(hex: string | null | undefined, mode: 'auto' | 'manual' | string): { light: string; dark: string } | null {
  if (!isHex(hex)) return null;
  const [h, s] = hexToHsl(hex);
  const manual = mode === 'manual';
  const sat = manual ? Math.min(Math.round(s), 45) : Math.min(Math.round(s * 0.55), 30);
  const H = Math.round(h);
  return {
    light: `hsl(${H} ${sat}% ${manual ? 88 : 90}%)`,
    dark: `hsl(${H} ${sat}% ${manual ? 20 : 18}%)`,
  };
}
