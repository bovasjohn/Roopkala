import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterProducts, parseShopQuery } from '../src/lib/shopFilter.ts';

const P = (name: string, price: number, extra: any = {}) => ({ name, price, code: 'RK-' + name.length, categoryName: 'Textiles', description: '', ...extra }) as any;
const list = [P('Silk Saree', 5000, { description: 'Pure kanjivaram' }), P('Gold Ring', 12000, { categoryName: 'Jewellery' }), P('Cotton Dupatta', 900)];

test('parseShopQuery cleans and validates', () => {
  assert.deepEqual(parseShopQuery(new URLSearchParams('q=%20%20silk   saree%20&sort=price-asc')), { q: 'silk saree', sort: 'price-asc' });
  assert.deepEqual(parseShopQuery(new URLSearchParams('sort=evil')), { q: '', sort: 'new' });
  assert.equal(parseShopQuery(new URLSearchParams('q=' + 'x'.repeat(200))).q.length, 60);
});
test('search matches name, category, description, code; all words required', () => {
  assert.deepEqual(filterProducts(list, 'ring', 'new').map((p) => p.name), ['Gold Ring']);
  assert.deepEqual(filterProducts(list, 'JEWELLERY', 'new').map((p) => p.name), ['Gold Ring']);
  assert.deepEqual(filterProducts(list, 'kanjivaram silk', 'new').map((p) => p.name), ['Silk Saree']);
  assert.deepEqual(filterProducts(list, 'silk ring', 'new'), []);
  assert.equal(filterProducts(list, 'rk-9', 'new').length, 1);
});
test('sorting does not change the original list', () => {
  assert.deepEqual(filterProducts(list, '', 'price-asc').map((p) => p.price), [900, 5000, 12000]);
  assert.deepEqual(filterProducts(list, '', 'price-desc').map((p) => p.price), [12000, 5000, 900]);
  assert.deepEqual(filterProducts(list, '', 'name').map((p) => p.name), ['Cotton Dupatta', 'Gold Ring', 'Silk Saree']);
  assert.deepEqual(filterProducts(list, '', 'new').map((p) => p.name), list.map((p) => p.name));
  assert.equal(list[0]!.name, 'Silk Saree');
});
