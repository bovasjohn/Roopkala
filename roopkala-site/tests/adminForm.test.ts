import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, normaliseVariants, validateProduct, fitSize, dominantHex, type PForm } from '../src/lib/adminForm.ts';

const base = (o: Partial<PForm> = {}): PForm => ({
  name: 'Silk Saree', slug: 'silk-saree', code: 'RK-1', description: '', category_id: 'c1', price: 1200, is_active: true,
  size_enabled: false, color_enabled: false, tint_mode: 'auto', tint_color: '', meta_title: '', meta_description: '',
  variants: [{ size: '', color_name: '', color_hex: '', stock: 2 }], ...o,
});

test('slugify', () => {
  assert.equal(slugify('  Kanjivaram Silk — Saree (Red)! '), 'kanjivaram-silk-saree-red');
  assert.equal(slugify('Café'), 'cafe');
  assert.equal(slugify('!!!'), '');
});
test('fitSize never upscales', () => {
  assert.deepEqual(fitSize(4000, 3000, 1600), { w: 1600, h: 1200 });
  assert.deepEqual(fitSize(800, 600, 1600), { w: 800, h: 600 });
});
test('valid simple product', () => assert.deepEqual(validateProduct(base()), []));
test('validation catches problems', () => {
  const e = validateProduct(base({ name: '', slug: 'Bad Slug', code: '', category_id: '', price: 1.5 }));
  assert.equal(e.length, 5);
  assert.ok(validateProduct(base({ tint_mode: 'manual', tint_color: 'red' })).length === 1);
});
test('size/colour switches', () => {
  const f = base({ size_enabled: true, variants: [{ size: 'M', color_name: 'x', color_hex: '', stock: 1 }, { size: 'm', color_name: '', color_hex: '', stock: 1 }] });
  assert.equal(normaliseVariants(f)[0]!.color_name, '');
  assert.ok(validateProduct(f).some((m) => /already listed/.test(m)));
  assert.ok(validateProduct(base({ size_enabled: true, variants: [{ size: '', color_name: '', color_hex: '', stock: 0 }] })).some((m) => /size/.test(m)));
  assert.equal(normaliseVariants(base({ variants: [{ size: 'a', color_name: '', color_hex: '', stock: 1 }, { size: 'b', color_name: '', color_hex: '', stock: 1 }] })).length, 1);
  assert.ok(validateProduct(base({ color_enabled: true, variants: [{ size: '', color_name: 'Red', color_hex: 'red', stock: 1 }] })).some((m) => /swatch/.test(m)));
  assert.ok(validateProduct(base({ variants: [{ size: '', color_name: '', color_hex: '', stock: -1 }] })).length === 1);
});
test('dominantHex prefers colour over white background', () => {
  const px: number[] = [];
  for (let i = 0; i < 90; i++) px.push(255, 255, 255, 255);
  for (let i = 0; i < 10; i++) px.push(200, 30, 30, 255);
  const h = dominantHex(px)!;
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16);
  assert.ok(r > g + 60, h);
  assert.equal(dominantHex([0, 0, 0, 0]), null);
});
