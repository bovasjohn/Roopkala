// Pure helpers for the admin product form (validation, slugs, image sizing, dominant colour). Tested offline.
import { isHex, slugOk } from './format.ts';

export interface VForm { id?: string; size: string; color_name: string; color_hex: string; stock: number }
export interface PForm {
  name: string; slug: string; code: string; description: string; category_id: string; price: number;
  is_active: boolean; size_enabled: boolean; color_enabled: boolean; tint_mode: 'auto' | 'manual'; tint_color: string;
  meta_title: string; meta_description: string; variants: VForm[];
}

export const slugify = (s: string): string =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');

/** Applies the size/colour switches: switched-off options are cleared, and a product with neither keeps exactly one row. */
export function normaliseVariants(f: PForm): VForm[] {
  const vs = f.variants.map((v) => ({
    ...v,
    size: f.size_enabled ? v.size.trim() : '',
    color_name: f.color_enabled ? v.color_name.trim() : '',
    color_hex: f.color_enabled ? v.color_hex.trim() : '',
  }));
  return !f.size_enabled && !f.color_enabled ? vs.slice(0, 1) : vs;
}

export function validateProduct(f: PForm): string[] {
  const e: string[] = [];
  if (!f.name.trim() || f.name.length > 200) e.push('Enter a product name (up to 200 characters).');
  if (!slugOk(f.slug)) e.push('Web address must use only lowercase letters, numbers and single hyphens.');
  if (!f.code.trim()) e.push('Enter a product code.');
  if (!f.category_id) e.push('Choose a category.');
  if (!Number.isInteger(f.price) || f.price < 0) e.push('Price must be a whole number of rupees.');
  if (f.tint_mode === 'manual' && !isHex(f.tint_color)) e.push('Pick a background colour or switch to automatic.');
  const vs = normaliseVariants(f);
  if (vs.length === 0) e.push('Add at least one stock row.');
  const seen = new Set<string>();
  vs.forEach((v, i) => {
    const n = i + 1;
    if (f.size_enabled && !v.size) e.push(`Row ${n}: enter a size.`);
    if (f.color_enabled && !v.color_name) e.push(`Row ${n}: enter a colour name.`);
    if (v.color_hex && !isHex(v.color_hex)) e.push(`Row ${n}: colour swatch must look like #aa3322.`);
    if (!Number.isInteger(v.stock) || v.stock < 0) e.push(`Row ${n}: stock must be 0 or more.`);
    const k = `${v.size.toLowerCase()}|${v.color_name.toLowerCase()}`;
    if (seen.has(k)) e.push(`Row ${n}: this size and colour is already listed.`);
    seen.add(k);
  });
  return e;
}

export function fitSize(w: number, h: number, max: number): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/** Dominant colour of RGBA pixels, favouring colourful pixels over white/black/grey backgrounds. */
export function dominantHex(data: ArrayLike<number>): string | null {
  let R = 0, G = 0, B = 0, W = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const light = (mx + mn) / 510;
    const w = ((mx - mn) / 255 + 0.02) * (light < 0.08 || light > 0.95 ? 0.2 : 1);
    R += r * w; G += g * w; B += b * w; W += w;
  }
  if (W === 0) return null;
  const h = (x: number) => Math.round(x / W).toString(16).padStart(2, '0');
  return `#${h(R)}${h(G)}${h(B)}`;
}
