// Pure validation for the admin Homepage and Settings screens. Tested offline.
import { PLATS } from './config.ts';
import { digits, isHex, safeHref } from './format.ts';

export const MAX_SLIDES = 5;

export interface SlideForm { heading: string; text: string; image_path: string; cta: string; href: string }

export function validateSlides(slides: SlideForm[]): string[] {
  const e: string[] = [];
  if (slides.length === 0) e.push('Keep at least one slide.');
  if (slides.length > MAX_SLIDES) e.push(`Use at most ${MAX_SLIDES} slides.`);
  slides.forEach((s, i) => {
    const n = i + 1;
    if (!s.heading.trim()) e.push(`Slide ${n}: enter a heading.`);
    if (s.heading.length > 120) e.push(`Slide ${n}: heading is too long (120 characters max).`);
    if (s.text.length > 240) e.push(`Slide ${n}: text is too long (240 characters max).`);
    if (s.cta.length > 30) e.push(`Slide ${n}: button text is too long (30 characters max).`);
    if (s.href.trim() && safeHref(s.href, '') === '') e.push(`Slide ${n}: the button link must start with / or https://`);
  });
  return e;
}

/** Cleaned slides ready to store: trimmed, with a safe link and a default button label. */
export function cleanSlides(slides: SlideForm[]): { heading: string; text: string; image_path: string | null; cta: string; href: string }[] {
  return slides.map((s) => ({
    heading: s.heading.trim(), text: s.text.trim(), image_path: s.image_path || null,
    cta: s.cta.trim() || 'Explore the collection', href: safeHref(s.href.trim(), '/shop'),
  }));
}

export interface GeneralForm { whatsapp: string; low_stock: number; ga_id: string }
export function validateGeneral(g: GeneralForm): string[] {
  const e: string[] = [];
  const d = digits(g.whatsapp);
  if (d && (d.length < 8 || d.length > 15)) e.push('WhatsApp number must be 8 to 15 digits including the country code, for example 919876543210.');
  if (!Number.isInteger(g.low_stock) || g.low_stock < 0 || g.low_stock > 50) e.push('"Few left" level must be a whole number from 0 to 50.');
  if (g.ga_id.trim() && !/^G-[A-Z0-9]{4,14}$/i.test(g.ga_id.trim())) e.push('Google Analytics ID looks like G-XXXXXXXXXX.');
  return e;
}

export function validateAppearance(a: { theme: string; accent: string; fit?: string }, themes: readonly string[]): string[] {
  const e: string[] = [];
  if (a.fit !== undefined && a.fit !== 'fill' && a.fit !== 'whole') e.push('Choose how photos are framed.');
  if (!themes.includes(a.theme)) e.push('Choose one of the installed themes.');
  if (a.accent && !isHex(a.accent)) e.push('Accent colour must look like #7a1f2b.');
  return e;
}

export function validateSocial(s: Record<string, string>): string[] {
  return PLATS.filter((p) => (s[p.k] ?? '').trim() && !/^https:\/\/\S+$/i.test(s[p.k]!.trim()))
    .map((p) => `${p.n}: the link must start with https://`);
}

export function validateAbout(a: { title: string; body: string }): string[] {
  const e: string[] = [];
  if (!a.title.trim() || a.title.length > 80) e.push('Enter an About title (up to 80 characters).');
  if (a.body.length > 8000) e.push('About text is too long.');
  return e;
}

export const moveItem = <T,>(arr: T[], i: number, d: -1 | 1): T[] => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const out = [...arr]; [out[i], out[j]] = [out[j]!, out[i]!]; return out;
};
