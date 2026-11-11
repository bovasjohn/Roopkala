import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSlides, cleanSlides, validateGeneral, validateAppearance, validateSocial, validateAbout, moveItem, type SlideForm } from '../src/lib/adminSettings.ts';
import { VERSION } from '../src/lib/config.ts';

const slide = (o: Partial<SlideForm> = {}): SlideForm => ({ heading: 'Hello', text: '', image_path: '', cta: '', href: '', ...o });

test('slides validation', () => {
  assert.deepEqual(validateSlides([slide()]), []);
  assert.equal(validateSlides([]).length, 1);
  assert.equal(validateSlides(Array.from({ length: 6 }, () => slide())).length, 1);
  assert.equal(validateSlides([slide({ heading: ' ' })]).length, 1);
  assert.equal(validateSlides([slide({ href: 'javascript:alert(1)' })]).length, 1);
  assert.deepEqual(validateSlides([slide({ href: '/shop' }), slide({ href: 'https://a.com' })]), []);
  assert.equal(validateSlides([slide({ text: 'x'.repeat(241) })]).length, 1);
});
test('cleanSlides defaults and safe links', () => {
  const [a] = cleanSlides([slide({ heading: ' Hi ', href: '', cta: ' ' })]);
  assert.deepEqual(a, { heading: 'Hi', text: '', image_path: null, cta: 'Explore the collection', href: '/shop' });
  assert.equal(cleanSlides([slide({ href: '//evil.com' })])[0]!.href, '/shop');
});
test('general validation', () => {
  assert.deepEqual(validateGeneral({ whatsapp: '+91 98765 43210', low_stock: 3, ga_id: 'G-ABC123XYZ9' }), []);
  assert.deepEqual(validateGeneral({ whatsapp: '', low_stock: 0, ga_id: '' }), []);
  assert.equal(validateGeneral({ whatsapp: '123', low_stock: 3, ga_id: '' }).length, 1);
  assert.equal(validateGeneral({ whatsapp: '', low_stock: -1, ga_id: 'UA-1' }).length, 2);
});
test('appearance, social, about', () => {
  const themes = ['luxe', 'modern'];
  assert.deepEqual(validateAppearance({ theme: 'luxe', accent: '' }, themes), []);
  assert.equal(validateAppearance({ theme: 'x', accent: 'red' }, themes).length, 2);
  assert.deepEqual(validateSocial({ instagram: 'https://instagram.com/x', facebook: '' }), []);
  assert.equal(validateSocial({ instagram: 'http://x', youtube: 'javascript:1' }).length, 2);
  assert.equal(validateAbout({ title: '', body: '' }).length, 1);
});
test('moveItem', () => {
  assert.deepEqual(moveItem([1, 2, 3], 1, -1), [2, 1, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 0, -1), [1, 2, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 2, 1), [1, 2, 3]);
});
test('version matches package.json', () => assert.equal(JSON.parse(readFileSync('package.json', 'utf8')).version, VERSION));

test('photo framing validation', () => {
  assert.deepEqual(validateAppearance({ theme: 'luxe', accent: '', fit: 'whole' }, ['luxe']), []);
  assert.equal(validateAppearance({ theme: 'luxe', accent: '', fit: 'zoom' }, ['luxe']).length, 1);
});

import { displayName, safeAvatar } from '../src/lib/auth.ts';
test('displayName and safeAvatar', () => {
  assert.equal(displayName({ user_metadata: { full_name: ' Mary T ' } }), 'Mary T');
  assert.equal(displayName({ email: 'mary.t@gmail.com' }), 'mary.t');
  assert.equal(displayName(null), 'there');
  assert.equal(safeAvatar({ user_metadata: { picture: 'https://lh3.googleusercontent.com/a' } }), 'https://lh3.googleusercontent.com/a');
  assert.equal(safeAvatar({ user_metadata: { picture: 'javascript:alert(1)' } }), '');
});
