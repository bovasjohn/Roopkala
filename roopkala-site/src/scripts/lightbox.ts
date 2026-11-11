// Full-screen photo viewer for the product gallery: pinch / wheel / double-tap zoom, drag, swipe, arrows, Esc.
import { clampView, containSize, zoomAround, type View } from '../lib/zoom.ts';

export function initLightbox(trackSel: string, openBtnSel: string): void {
  const track = document.querySelector<HTMLElement>(trackSel);
  if (!track) return;
  const photos = () => [...track.querySelectorAll<HTMLImageElement>('img')];

  let box: HTMLElement | null = null, stage!: HTMLElement, img!: HTMLImageElement, count!: HTMLElement;
  let idx = 0, open = false, W = 0, H = 0, lastFocus: Element | null = null;
  let view: View = { scale: 1, x: 0, y: 0 };

  const vw = () => stage.clientWidth, vh = () => stage.clientHeight;
  const apply = () => { img.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.scale})`; box!.classList.toggle('zoomed', view.scale > 1); };
  const layout = () => {
    const s = containSize(vw(), vh(), img.naturalWidth, img.naturalHeight);
    W = s.w; H = s.h;
    Object.assign(img.style, { width: `${W}px`, height: `${H}px`, marginLeft: `${-W / 2}px`, marginTop: `${-H / 2}px` });
    view = clampView(view, vw(), vh(), W, H); apply();
  };
  const zoom = (f: number, px = 0, py = 0) => { view = zoomAround(view, f, px, py, vw(), vh(), W, H); apply(); };

  const show = (i: number) => {
    const list = photos(); if (!list.length) return;
    idx = ((i % list.length) + list.length) % list.length;
    const src = list[idx]!;
    view = { scale: 1, x: 0, y: 0 };
    img.style.opacity = '0'; img.alt = src.alt;
    img.onload = () => { layout(); img.style.opacity = '1'; };
    img.src = src.currentSrc || src.src;
    if (img.complete && img.naturalWidth) img.onload?.(new Event('load'));
    count.textContent = list.length > 1 ? `${idx + 1} / ${list.length}` : '';
    box!.classList.toggle('single', list.length < 2);
    for (const d of [idx - 1, idx + 1]) { const n = list[(d + list.length) % list.length]; if (n) new Image().src = n.src; }
  };

  const build = () => {
    box = document.createElement('div');
    box.className = 'lb'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Photo viewer');
    box.innerHTML = `<div class="lb-stage"><img class="lb-img" alt="" draggable="false"></div>
      <button type="button" class="lb-x" aria-label="Close">✕</button>
      <button type="button" class="lb-n lb-prev" aria-label="Previous photo">‹</button><button type="button" class="lb-n lb-next" aria-label="Next photo">›</button>
      <div class="lb-count" aria-live="polite"></div>
      <div class="lb-tools"><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="in" aria-label="Zoom in">+</button></div>`;
    document.body.appendChild(box);
    stage = box.querySelector('.lb-stage')!; img = box.querySelector('.lb-img')!; count = box.querySelector('.lb-count')!;
    box.querySelector('.lb-x')!.addEventListener('click', () => close(true));
    box.querySelector('.lb-prev')!.addEventListener('click', () => show(idx - 1));
    box.querySelector('.lb-next')!.addEventListener('click', () => show(idx + 1));
    box.querySelector('[data-z=in]')!.addEventListener('click', () => zoom(1.6));
    box.querySelector('[data-z=out]')!.addEventListener('click', () => zoom(1 / 1.6));

    const pts = new Map<number, { x: number; y: number }>();
    let g = { sx: 0, sy: 0, ex: 0, ey: 0, moved: 0, multi: false }, lastDist = 0, lastTap = { t: 0, x: 0, y: 0 };
    const rel = (x: number, y: number) => { const r = stage.getBoundingClientRect(); return { x: x - (r.left + r.width / 2), y: y - (r.top + r.height / 2) }; };

    stage.addEventListener('pointerdown', (e) => {
      stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) g = { sx: e.clientX, sy: e.clientY, ex: e.clientX, ey: e.clientY, moved: 0, multi: false };
      if (pts.size === 2) { g.multi = true; const [a, b] = [...pts.values()] as [{ x: number; y: number }, { x: number; y: number }]; lastDist = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    stage.addEventListener('pointermove', (e) => {
      const prev = pts.get(e.pointerId); if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY }; pts.set(e.pointerId, cur);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()] as [{ x: number; y: number }, { x: number; y: number }];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastDist > 0) { const c = rel((a.x + b.x) / 2, (a.y + b.y) / 2); zoom(d / lastDist, c.x, c.y); }
        lastDist = d; g.moved += 99;
      } else if (pts.size === 1) {
        g.ex = cur.x; g.ey = cur.y; g.moved += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
        if (view.scale > 1) { view = clampView({ ...view, x: view.x + cur.x - prev.x, y: view.y + cur.y - prev.y }, vw(), vh(), W, H); apply(); }
      }
    });
    const end = (e: PointerEvent) => {
      if (!pts.delete(e.pointerId) || pts.size > 0 || g.multi) return;
      const dx = g.ex - g.sx, dy = g.ey - g.sy;
      if (g.moved >= 8) { if (view.scale === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(idx + (dx < 0 ? 1 : -1)); return; }
      const now = Date.now();
      if (now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
        const c = rel(e.clientX, e.clientY);
        if (view.scale > 1) { view = { scale: 1, x: 0, y: 0 }; apply(); } else zoom(2.5, c.x, c.y);
        lastTap = { t: 0, x: 0, y: 0 };
      } else {
        lastTap = { t: now, x: e.clientX, y: e.clientY };
        const r = img.getBoundingClientRect();
        const onPhoto = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!onPhoto) close(true);
      }
    };
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); });
    stage.addEventListener('wheel', (e) => { e.preventDefault(); const c = rel(e.clientX, e.clientY); zoom(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)), c.x, c.y); }, { passive: false });
    addEventListener('resize', () => { if (open) layout(); });
    document.addEventListener('keydown', (e) => {
      if (!open) return;
      if (e.key === 'Escape') close(true);
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === '+' || e.key === '=') zoom(1.6);
      else if (e.key === '-') zoom(1 / 1.6);
      else if (e.key === 'Tab') {
        const f = [...box!.querySelectorAll<HTMLElement>('button')].filter((b) => b.offsetParent !== null);
        if (!f.length) return;
        const first = f[0]!, last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    addEventListener('popstate', () => { if (open) close(false); });
  };

  const openAt = (i: number) => {
    if (!box) build();
    lastFocus = document.activeElement; open = true; box!.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    history.pushState({ lb: 1 }, '');
    show(i);
    box!.querySelector<HTMLElement>('.lb-x')!.focus();
  };
  function close(fromUser: boolean) {
    if (!open) return;
    open = false; box!.hidden = true; document.documentElement.style.overflow = '';
    if (fromUser && history.state?.lb) history.back();
    (lastFocus as HTMLElement | null)?.focus?.();
  }

  track.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('img'); if (!t) return;
    const i = photos().indexOf(t as HTMLImageElement); if (i >= 0) openAt(i);
  });
  document.querySelector(openBtnSel)?.addEventListener('click', () => openAt(Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
}
