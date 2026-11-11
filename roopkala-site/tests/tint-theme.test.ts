import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToHsl, tintVars } from '../src/lib/tint.ts';
import { themeId, accentStyle, contrast, contrastText } from '../src/lib/theme.ts';

test('hexToHsl', () => {
  assert.deepEqual(hexToHsl('#ff0000').map(Math.round), [0, 100, 50]);
  assert.deepEqual(hexToHsl('#ffffff').map(Math.round), [0, 0, 100]);
});
test('tintVars auto is calmer than manual and capped', () => {
  const a = tintVars('#ff0000', 'auto')!, m = tintVars('#ff0000', 'manual')!;
  assert.equal(a.light, 'hsl(0 30% 90%)'); assert.equal(a.dark, 'hsl(0 30% 18%)');
  assert.equal(m.light, 'hsl(0 45% 88%)'); assert.equal(m.dark, 'hsl(0 45% 20%)');
});
test('tintVars rejects bad input', () => {
  assert.equal(tintVars(null, 'auto'), null);
  assert.equal(tintVars('red', 'auto'), null);
});
test('themeId only allows installed themes', () => {
  assert.equal(themeId('modern'), 'modern');
  assert.equal(themeId('../../x'), 'luxe');
  assert.equal(themeId(undefined), 'luxe');
});
test('accentStyle only accepts strict hex', () => {
  assert.equal(accentStyle(''), '');
  assert.equal(accentStyle('red;background:url(x)'), '');
  assert.match(accentStyle('#7a1f2b'), /^--accent:#7a1f2b;--onacc:#ffffff$/);
  assert.equal(contrastText('#ffffff'), '#2b2420');
  assert.ok(contrast('#000000', '#ffffff') > 20.9);
});
