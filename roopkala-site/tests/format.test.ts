import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, inr, digits, isHex, slugOk, uuidOk, safeHref, md, stripMd, optionText, waMessage, waLink } from '../src/lib/format.ts';

test('esc escapes html', () => assert.equal(esc(`<a href="x">&'`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;'.replace('&#39;', esc("'"))));
test('inr uses Indian grouping', () => {
  assert.equal(inr(1250000), '₹12,50,000');
  assert.equal(inr(0), '₹0');
  assert.equal(inr(NaN), '₹0');
});
test('digits / isHex / slugOk / uuidOk', () => {
  assert.equal(digits('+91 90000-00000'), '919000000000');
  assert.ok(isHex('#a1B2c3')); assert.ok(!isHex('#abc')); assert.ok(!isHex('red;}body{'));
  assert.ok(slugOk('silk-saree-2')); assert.ok(!slugOk('Silk')); assert.ok(!slugOk('a--b')); assert.ok(!slugOk('../x'));
  assert.ok(uuidOk('123e4567-e89b-12d3-a456-426614174000')); assert.ok(!uuidOk('1,2'));
});
test('safeHref blocks unsafe schemes', () => {
  assert.equal(safeHref('/shop/x'), '/shop/x');
  assert.equal(safeHref('https://a.com'), 'https://a.com');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.com', 'http://a.com', '', null]) assert.equal(safeHref(bad), '/shop');
});
test('md escapes raw html and supports subset', () => {
  assert.equal(md('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.equal(md('# Hi\n- a\n- b\n\ntext'), '<h3>Hi</h3><ul><li>a</li><li>b</li></ul><p>text</p>');
  assert.ok(!md('- <img src=x onerror=1>').includes('<img'));
});
test('stripMd', () => {
  assert.equal(stripMd('# T\n- a\n- b'), 'T a b');
  assert.equal(stripMd('x'.repeat(300)).length, 155);
});
test('whatsapp message and link', () => {
  const m = waMessage([{ name: 'Saree', code: 'RK-1', opt: optionText('M', 'Red'), qty: 2, price: 1000 }]);
  assert.ok(m.includes('Size: M | Colour: Red') && m.includes('Qty: 2 × ₹1,000 = ₹2,000') && m.includes('Total: ₹2,000'));
  assert.ok(waMessage([{ name: 'A', code: 'B', opt: '', qty: 1, price: 5 }]).includes('Standard'));
  const l = waLink('+91 90000 00000', 'a b&c');
  assert.equal(l, 'https://wa.me/919000000000?text=a%20b%26c');
});
