import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDb, parseSettings, DEFAULT_SETTINGS, shapeProduct, imgUrl, thumbPath, getProductBySlug, loadHome, type RawProduct } from '../src/lib/data.ts';
import { ldString, productLd, breadcrumbLd } from '../src/lib/seo.ts';

const B = 'https://x.supabase.co';
const raw = (over: Partial<RawProduct> = {}): RawProduct => ({
  id: 'p1', slug: 'silk-saree', code: 'RK-1', name: 'Silk Saree', description: 'Nice </script>', price_inr: 12500,
  size_enabled: true, color_enabled: true, tint_mode: 'auto', tint_color: '#aa3322', meta_title: null, meta_description: null,
  category: { id: 'c1', name: 'Textiles', slug: 'textiles' },
  variants: [
    { id: 'v2', size: 'L', color_name: 'Red', color_hex: '#f00', stock: 0, sort: 2 },
    { id: 'v1', size: 'M', color_name: 'Red', color_hex: '#f00', stock: 2, sort: 1 },
    { id: 'v3', size: 'M', color_name: 'Blue', color_hex: '#00f', stock: 0, sort: 3 },
  ],
  images: [
    { id: 'i2', path: 'products/p1/b.webp', width: 1, height: 1, color_name: 'Blue', sort: 2 },
    { id: 'i1', path: 'products/p1/a.webp', width: 1, height: 1, color_name: null, sort: 1 },
  ], ...over,
});

test('imgUrl / thumbPath', () => {
  assert.equal(imgUrl('products/a b/x.webp', B), `${B}/storage/v1/object/public/product-images/products/a%20b/x.webp`);
  assert.equal(thumbPath('products/p/x.webp'), 'products/p/x-thumb.webp');
});
test('parseSettings merges defaults and ignores junk', () => {
  const s = parseSettings([{ key: 'general', value: { whatsapp: '91900', low_stock: '5' } }, { key: 'evil', value: { a: 1 } }, { key: 'about', value: null }]);
  assert.equal(s.general.whatsapp, '91900'); assert.equal(s.general.low_stock, 5); assert.equal(s.general.ga_id, '');
  assert.deepEqual(s.about, DEFAULT_SETTINGS.about); assert.ok(!('evil' in s));
  assert.equal(parseSettings([{ key: 'social', value: { instagram: 'https://i' } }]).social.show_in.footer, true);
});
test('shapeProduct', () => {
  const p = shapeProduct(raw(), 3, B);
  assert.deepEqual(p.sizes, ['M', 'L']); assert.deepEqual(p.colours.map((c) => c.name), ['Red', 'Blue']);
  assert.equal(p.stock, 2); assert.equal(p.status, 'low'); assert.equal(p.url, '/textiles/silk-saree');
  assert.equal(p.cover!.full, `${B}/storage/v1/object/public/product-images/products/p1/a.webp`);
  assert.equal(p.colours[1]!.img, 1);
  assert.equal(shapeProduct(raw({ variants: [] }), 3, B).status, 'out');
  assert.equal(shapeProduct(raw(), 1, B).status, 'in');
  assert.equal(shapeProduct(raw({ category: null }), 3, B).url, '/shop/silk-saree');
});
test('makeDb sends keys and builds URL; errors on non-200', async () => {
  const calls: { url: string; h: any }[] = [];
  const db = makeDb({ url: B, key: 'K', fetch: (async (u: any, i: any) => { calls.push({ url: String(u), h: i.headers }); return new Response('[1]', { status: 200 }); }) as any });
  assert.deepEqual(await db.get('products', { select: 'a,b', slug: 'eq.x' }), [1]);
  assert.equal(calls[0]!.url, `${B}/rest/v1/products?select=a%2Cb&slug=eq.x`);
  assert.equal(calls[0]!.h.apikey, 'K'); assert.equal(calls[0]!.h.Authorization, 'Bearer K');
  const bad = makeDb({ url: B, key: 'K', fetch: (async () => new Response('x', { status: 500 })) as any });
  await assert.rejects(bad.get('products', {}), /500/);
});
test('getProductBySlug validates slug and handles empty', async () => {
  let n = 0;
  const db = { get: async () => { n++; return [] as any; } };
  assert.equal(await getProductBySlug(db, '../x', 3), null); assert.equal(n, 0);
  assert.equal(await getProductBySlug(db, 'ok', 3), null); assert.equal(n, 1);
});
test('loadHome groups products and orders sections', async () => {
  const r1 = raw(), r2 = raw({ id: 'p2', slug: 'ring', category: { id: 'c2', name: 'Jewellery', slug: 'jewellery' } });
  const db = { get: async (t: string) => ({
    site_settings: [], categories: [{ id: 'c1', name: 'Textiles', slug: 'textiles' }, { id: 'c2', name: 'Jewellery', slug: 'jewellery' }],
    products: [r1, r2],
    homepage_sections: [{ key: 'carousel', title: 'Hot', sort: 1, items: [{ sort: 2, product: r2 }, { sort: 1, product: r1 }, { sort: 3, product: null }] }],
  } as any)[t] };
  const h = await loadHome(db as any);
  assert.deepEqual(h.cats.map((c) => c.products.length), [1, 1]);
  assert.equal(h.carousel.title, 'Hot'); assert.deepEqual(h.carousel.products.map((p) => p.slug), ['silk-saree', 'ring']);
  assert.equal(h.featured.title, 'New arrivals'); assert.equal(h.featured.products.length, 0);
});
test('JSON-LD is safe and correct', () => {
  const p = shapeProduct(raw(), 3, B);
  assert.ok(!ldString({ d: '</script><script>x' }).includes('<'));
  const ld: any = productLd(p, 'https://s.in');
  assert.equal(ld.offers.priceCurrency, 'INR'); assert.equal(ld.offers.price, 12500);
  assert.equal(ld.offers.availability, 'https://schema.org/InStock'); assert.equal(ld.offers.url, 'https://s.in/textiles/silk-saree');
  assert.equal((productLd(shapeProduct(raw({ variants: [] }), 3, B), 'https://s.in') as any).offers.availability, 'https://schema.org/OutOfStock');
  assert.equal((breadcrumbLd('https://s.in', [{ name: 'Home', path: '/' }]) as any).itemListElement[0].position, 1);
});
