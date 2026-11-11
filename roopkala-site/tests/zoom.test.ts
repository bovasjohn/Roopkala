import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampView, containSize, zoomAround, MAX_SCALE } from '../src/lib/zoom.ts';
import { parseSettings } from '../src/lib/data.ts';

test('containSize keeps the whole picture visible', () => {
  assert.deepEqual(containSize(400, 800, 1600, 1600), { w: 400, h: 400 });
  assert.deepEqual(containSize(800, 400, 1000, 2000), { w: 200, h: 400 });
  assert.ok(containSize(0, 0, 0, 0).w >= 1);
});
test('no panning when the picture is not zoomed', () => {
  assert.deepEqual(clampView({ scale: 1, x: 50, y: -50 }, 400, 800, 400, 400), { scale: 1, x: 0, y: 0 });
});
test('panning is limited to the picture edges when zoomed', () => {
  const v = clampView({ scale: 2, x: 999, y: 999 }, 400, 800, 400, 400);
  assert.equal(v.x, 200); assert.equal(v.y, 0);
});
test('zoom is limited to 1x..max', () => {
  assert.equal(zoomAround({ scale: 1, x: 0, y: 0 }, 0.2, 0, 0, 400, 800, 400, 400).scale, 1);
  assert.equal(zoomAround({ scale: 4, x: 0, y: 0 }, 10, 0, 0, 400, 800, 400, 400).scale, MAX_SCALE);
});
test('zooming keeps the point under the finger fixed', () => {
  const px = 100, py = 0;
  const v = zoomAround({ scale: 1, x: 0, y: 0 }, 2, px, py, 400, 800, 800, 800);
  // image point under finger before: (px - x)/scale = 100; after: (px - v.x)/v.scale must match
  assert.equal(Math.round((px - v.x) / v.scale), 100);
});
test('settings: unknown photo framing falls back to fill', () => {
  assert.equal(parseSettings([{ key: 'appearance', value: { fit: 'evil' } }]).appearance.fit, 'fill');
  assert.equal(parseSettings([{ key: 'appearance', value: { fit: 'whole' } }]).appearance.fit, 'whole');
  assert.equal(parseSettings([]).appearance.fit, 'fill');
});
