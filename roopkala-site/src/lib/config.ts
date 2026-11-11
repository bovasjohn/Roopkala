// Public configuration. Everything here is safe to expose in the browser.
const env: Record<string, string | undefined> = (import.meta as any).env ?? {};

export const SUPABASE_URL = (env.PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY ?? '';
export const SITE_URL = (env.PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');
export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const BRAND = 'Roopkala';
export const BRAND_BY = 'Preetha Mary';
export const VERSION = '0.4.0';
export const STORAGE_BUCKET = 'product-images';

/** Installed themes (files in public/themes/<id>.css). The admin can only pick from this list. */
export interface ThemeInfo { id: string; label: string; vibe: string; swatch: [string, string, string] }
// To add a theme: drop public/themes/<id>.css and add one line here.
export const THEME_INFO: readonly ThemeInfo[] = [
  { id: 'luxe', label: 'Luxe', vibe: 'Warm ivory, muted rose and champagne — soft and quiet', swatch: ['#faf6f0', '#b5706b', '#c9a96e'] },
  { id: 'modern', label: 'Modern', vibe: 'Clean, crisp and minimal', swatch: ['#f4f4f1', '#1d3557', '#1d3557'] },
  { id: 'heritage', label: 'Heritage', vibe: 'Rich maroon and gold with traditional motifs', swatch: ['#f6ecdc', '#7b1e2b', '#b8903f'] },
  { id: 'christmas', label: 'Christmas', vibe: 'Falling snow, holly and bells — red, pine and gold', swatch: ['#fbf6f0', '#a61e2e', '#1d6b3b'] },
  { id: 'diwali', label: 'Diwali', vibe: 'Glowing diyas, rising sparks and lanterns — saffron, marigold and gold', swatch: ['#fff7e8', '#b3400a', '#c98a10'] },
  { id: 'onam', label: 'Onam', vibe: 'Drifting marigold petals and pookalam flowers — cream, green and gold', swatch: ['#fffaf0', '#1b6b43', '#e8a91c'] },
  { id: 'eid', label: 'Eid / Ramadan', vibe: 'Crescent moon, twinkling stars and lanterns — emerald and gold', swatch: ['#f5f8f4', '#0b6154', '#b58a22'] },
  { id: 'wedding', label: 'Wedding / Bridal', vibe: 'Blush petals, soft sparkle and gold — ivory, rose and champagne', swatch: ['#fdf6f3', '#a14661', '#b8913f'] },
  { id: 'valentine', label: 'Valentine / Love', vibe: 'Floating hearts with a soft heartbeat — rose, blush and cream', swatch: ['#fff4f5', '#b3153f', '#f08aa0'] },
  { id: 'newyear', label: 'New Year Gala', vibe: 'Confetti, fireworks and champagne sparkle — midnight navy and gold', swatch: ['#f6f5f0', '#1c2a6b', '#a8801f'] },
  { id: 'holi', label: 'Holi / Colour', vibe: 'Drifting coloured powder and bright gradients — bold and playful', swatch: ['#fffdf8', '#b0125f', '#ffb400'] },
  { id: 'celebration', label: 'Celebration', vibe: 'Balloons and confetti for any party, sale or milestone — purple and coral', swatch: ['#fbf8ff', '#6b2fb8', '#f26b5b'] },
  { id: 'noir', label: 'Noir — New Collection', vibe: 'Sharp black and white with a gold shimmer line — launches and new arrivals', swatch: ['#f7f6f3', '#111111', '#a67c2c'] },
] as const;
export const THEMES: readonly string[] = THEME_INFO.map((t) => t.id);
export const DEFAULT_THEME = 'luxe';

export const PLATS = [
  { k: 'instagram', n: 'Instagram', s: 'IG' },
  { k: 'facebook', n: 'Facebook', s: 'FB' },
  { k: 'pinterest', n: 'Pinterest', s: 'PI' },
  { k: 'youtube', n: 'YouTube', s: 'YT' },
  { k: 'tiktok', n: 'TikTok', s: 'TT' },
  { k: 'whatsapp', n: 'WhatsApp', s: 'WA' },
] as const;

/** Short shared cache so stock and prices stay fresh while repeat visits stay fast. */
export const PAGE_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

/** Themes that ship their own /themes/<id>.js (optional animations or effects). Add an id here to load its script. */
export const THEME_SCRIPTS: readonly string[] = [];
