// Reads from Supabase's REST API using the public anon key. Row Level Security
// in the database decides what a visitor may see (active products only, no private tables).
import { BRAND, STORAGE_BUCKET, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.ts';
import { slugOk } from './format.ts';

/* ---------------- settings ---------------- */
export interface Slide { heading: string; text: string; image_path?: string | null; cta?: string; href?: string }
export interface Settings {
  general: { whatsapp: string; low_stock: number; image_quality: string; ga_id: string; logo_path: string };
  appearance: { theme: string; accent: string; fit: 'fill' | 'whole' };
  hero: { heading: string; text: string; image_path: string | null; slides?: Slide[] };
  about: { enabled: boolean; title: string; body: string; image_path: string | null };
  social: Record<string, any> & { show_in: { header: boolean; footer: boolean; about: boolean } };
  payments: { cod: boolean; cards: boolean; gpay: boolean; gateway_key_id: string };
}

export const DEFAULT_SETTINGS: Settings = {
  general: { whatsapp: '', low_stock: 3, image_quality: 'standard', ga_id: '', logo_path: '' },
  appearance: { theme: 'luxe', accent: '', fit: 'fill' },
  hero: { heading: 'Woven in tradition, worn with grace', text: 'Handcrafted textiles and fine jewellery, chosen for the moments that matter.', image_path: null },
  about: { enabled: false, title: 'Our story', body: '', image_path: null },
  social: { show_in: { header: false, footer: true, about: true } },
  payments: { cod: false, cards: false, gpay: false, gateway_key_id: '' },
};

export function parseSettings(rows: { key: string; value: any }[]): Settings {
  const s: Settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  for (const r of rows ?? []) {
    if (!(r.key in s) || typeof r.value !== 'object' || r.value === null) continue;
    const k = r.key as keyof Settings;
    (s as any)[k] = { ...(s as any)[k], ...r.value };
  }
  s.social.show_in = { ...DEFAULT_SETTINGS.social.show_in, ...(s.social.show_in ?? {}) };
  s.general.low_stock = Math.max(0, Number(s.general.low_stock) || 0);
  s.appearance.fit = s.appearance.fit === 'whole' ? 'whole' : 'fill';
  return s;
}

/* ---------------- database access ---------------- */
type FetchFn = typeof fetch;
export interface Db {
  get<T>(table: string, params: Record<string, string>): Promise<T>;
}

export function makeDb(opts: { url: string; key: string; fetch?: FetchFn }): Db {
  const f: FetchFn = opts.fetch ?? fetch;
  return {
    async get<T>(table: string, params: Record<string, string>): Promise<T> {
      const u = new URL(`${opts.url}/rest/v1/${table}`);
      for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
      const res = await f(u.toString(), {
        headers: { apikey: opts.key, Authorization: `Bearer ${opts.key}`, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Supabase ${table} failed (${res.status})`);
      return (await res.json()) as T;
    },
  };
}
export const getDb = (): Db => makeDb({ url: SUPABASE_URL, key: SUPABASE_ANON_KEY });

/** Public URL of an uploaded image. Thumbnails are stored beside the full image as "<name>-thumb.<ext>". */
export const imgUrl = (path: string, base: string = SUPABASE_URL): string =>
  `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
export const thumbPath = (path: string): string => path.replace(/(\.[a-z0-9]+)$/i, '-thumb$1');

/* ---------------- products ---------------- */
interface RawVariant { id: string; size: string | null; color_name: string | null; color_hex: string | null; stock: number; sort: number }
interface RawImage { id: string; path: string; width: number | null; height: number | null; color_name: string | null; sort: number }
interface RawCategory { id: string; name: string; slug: string }
export interface RawProduct {
  id: string; slug: string; code: string; name: string; description: string | null; price_inr: number;
  size_enabled: boolean; color_enabled: boolean; tint_mode: string; tint_color: string | null;
  meta_title: string | null; meta_description: string | null; updated_at?: string;
  category: RawCategory | null; variants: RawVariant[] | null; images: RawImage[] | null;
}

export interface Img { full: string; thumb: string; w: number | null; h: number | null; colour: string | null }
export interface Product {
  id: string; slug: string; code: string; name: string; description: string; price: number;
  category: RawCategory | null; categoryName: string; url: string;
  sizeOn: boolean; colorOn: boolean; sizes: string[]; colours: { name: string; hex: string | null; img: number }[];
  variants: RawVariant[]; gallery: Img[]; cover: Img | null;
  stock: number; status: 'in' | 'low' | 'out';
  tintMode: string; tintColor: string | null; metaTitle: string; metaDescription: string;
}

export const PRODUCT_SELECT =
  'id,slug,code,name,description,price_inr,size_enabled,color_enabled,tint_mode,tint_color,meta_title,meta_description,updated_at,' +
  'category:categories(id,name,slug),' +
  'variants:product_variants(id,size,color_name,color_hex,stock,sort),' +
  'images:product_images(id,path,width,height,color_name,sort)';

export function shapeProduct(raw: RawProduct, low: number, base: string = SUPABASE_URL): Product {
  const variants = [...(raw.variants ?? [])].sort((a, b) => a.sort - b.sort);
  const imgs = [...(raw.images ?? [])].sort((a, b) => a.sort - b.sort);
  const ordered = [...imgs.filter((i) => !i.color_name), ...imgs.filter((i) => i.color_name)];
  const gallery: Img[] = ordered.map((i) => ({
    full: imgUrl(i.path, base), thumb: imgUrl(thumbPath(i.path), base), w: i.width, h: i.height, colour: i.color_name,
  }));
  const sizes: string[] = [];
  const colours: Product['colours'] = [];
  for (const v of variants) {
    if (v.size && !sizes.includes(v.size)) sizes.push(v.size);
    if (v.color_name && !colours.some((c) => c.name === v.color_name)) {
      colours.push({ name: v.color_name, hex: v.color_hex, img: Math.max(0, ordered.findIndex((i) => i.color_name === v.color_name)) });
    }
  }
  const stock = variants.reduce((s, v) => s + v.stock, 0);
  const category = raw.category ?? null;
  return {
    id: raw.id, slug: raw.slug, code: raw.code, name: raw.name, description: raw.description ?? '', price: raw.price_inr,
    category, categoryName: category?.name ?? '', url: `/${category?.slug ?? 'shop'}/${raw.slug}`,
    sizeOn: raw.size_enabled && sizes.length > 0, colorOn: raw.color_enabled && colours.length > 0, sizes, colours,
    variants, gallery, cover: gallery[0] ?? null,
    stock, status: stock === 0 ? 'out' : stock <= low ? 'low' : 'in',
    tintMode: raw.tint_mode, tintColor: raw.tint_color,
    metaTitle: raw.meta_title ?? '', metaDescription: raw.meta_description ?? '',
  };
}

export async function getSettings(db: Db): Promise<Settings> {
  return parseSettings(await db.get<{ key: string; value: any }[]>('site_settings', { select: 'key,value' }));
}
export async function getCategories(db: Db): Promise<RawCategory[]> {
  return db.get<RawCategory[]>('categories', { select: 'id,name,slug,sort', order: 'sort.asc' });
}
export async function listProducts(db: Db, low: number): Promise<Product[]> {
  const rows = await db.get<RawProduct[]>('products', { select: PRODUCT_SELECT, order: 'created_at.desc', limit: '200' });
  return rows.map((r) => shapeProduct(r, low));
}
export async function getProductBySlug(db: Db, slug: string, low: number): Promise<Product | null> {
  if (!slugOk(slug)) return null;
  const rows = await db.get<RawProduct[]>('products', { select: PRODUCT_SELECT, slug: `eq.${slug}`, limit: '1' });
  return rows[0] ? shapeProduct(rows[0], low) : null;
}

export interface Section { key: string; title: string; products: Product[] }
export interface HomeData {
  settings: Settings;
  cats: (RawCategory & { products: Product[] })[];
  carousel: Section;
  featured: Section;
}

export async function loadHome(db: Db): Promise<HomeData> {
  const settings = await getSettings(db);
  const low = settings.general.low_stock;
  const [cats, products, secRows] = await Promise.all([
    getCategories(db),
    listProducts(db, low),
    db.get<{ key: string; title: string; sort: number; items: { sort: number; product: RawProduct | null }[] }[]>('homepage_sections', {
      select: `key,title,sort,items:homepage_products(sort,product:products(${PRODUCT_SELECT}))`, order: 'sort.asc',
    }),
  ]);
  const section = (key: string, fallback: string): Section => {
    const row = secRows.find((r) => r.key === key);
    const items = [...(row?.items ?? [])].sort((a, b) => a.sort - b.sort).map((i) => i.product).filter((p): p is RawProduct => !!p);
    return { key, title: row?.title ?? fallback, products: items.map((p) => shapeProduct(p, low)) };
  };
  return {
    settings,
    cats: cats.map((c) => ({ ...c, products: products.filter((p) => p.category?.id === c.id) })),
    carousel: section('carousel', 'Curated for you'),
    featured: section('featured', 'New arrivals'),
  };
}

export { BRAND };
