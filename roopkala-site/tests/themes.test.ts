import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { THEME_INFO, THEMES, DEFAULT_THEME } from '../src/lib/config.ts';

test('every registered theme has a css file, unique id and valid swatches', () => {
  assert.equal(new Set(THEMES).size, THEMES.length);
  assert.ok(THEMES.includes(DEFAULT_THEME));
  assert.ok(THEMES.length >= 13);
  for (const t of THEME_INFO) {
    assert.match(t.id, /^[a-z0-9-]+$/);
    assert.ok(existsSync(`public/themes/${t.id}.css`), t.id);
    assert.equal(t.swatch.length, 3);
    for (const c of t.swatch) assert.match(c, /^#[0-9a-f]{6}$/i);
  }
});

test('theme css: animations have keyframes, motion is disabled on request, dark mode exists', () => {
  for (const t of THEME_INFO) {
    const css = readFileSync(`public/themes/${t.id}.css`, 'utf8');
    assert.match(css, /:root\[data-mode=dark\]/, t.id);
    const used = new Set([...css.matchAll(/animation:([^;}]*)/g)].flatMap((m) => [...m[1]!.matchAll(/(rk-[a-z0-9-]+)/g)].map((x) => x[1]!)));
    for (const k of used) if (!k.startsWith('rk-') || css.includes(`@keyframes ${k}{`) === false) assert.fail(`${t.id}: missing @keyframes ${k}`);
    if (used.size) assert.match(css, /prefers-reduced-motion:reduce/, t.id);
    assert.ok(!/(<script|javascript:|expression\()/i.test(css), t.id);
  }
});

test('manifest and icons', () => {
  const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  assert.ok(m.icons.some((i: any) => i.purpose === 'maskable'));
  for (const i of m.icons) assert.ok(existsSync('public' + i.src), i.src);
  for (const f of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png']) assert.ok(existsSync('public/' + f), f);
});
