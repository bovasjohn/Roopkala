import { DEFAULT_THEME, THEMES } from './config.ts';
import { isHex } from './format.ts';

/** Only installed themes are ever used; anything else falls back to the default. */
export function themeId(v: unknown): string {
  return (THEMES as readonly string[]).includes(String(v)) ? String(v) : DEFAULT_THEME;
}

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
export function contrast(a: string, b: string): number {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** White or near-black text, whichever reads better on the colour. */
export const contrastText = (hex: string): string => (contrast(hex, '#ffffff') >= contrast(hex, '#2b2420') ? '#ffffff' : '#2b2420');

/**
 * Inline CSS variables for an admin-chosen accent colour. Empty when none is set,
 * so the theme's own accent applies. Only a strict #RRGGBB value is ever used,
 * which makes injecting other CSS impossible.
 */
export function accentStyle(accent: unknown): string {
  return isHex(accent) ? `--accent:${accent};--onacc:${contrastText(accent)}` : '';
}
