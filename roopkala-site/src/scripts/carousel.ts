export interface Carousel { go(i: number): void }

/** Swipe/scroll-snap carousel with dots, optional thumbnails, arrows and optional autoplay. */
export function initCarousel(
  root: ParentNode, trackSel: string, dotSel: string, auto: boolean, thumbSel?: string,
): Carousel | null {
  const t = root.querySelector<HTMLElement>(trackSel);
  if (!t) return null;
  const dots = [...root.querySelectorAll<HTMLElement>(dotSel + ' i')];
  const th = thumbSel ? [...root.querySelectorAll<HTMLElement>(thumbSel)] : [];
  const n = t.children.length;
  let i = 0;
  let timer = 0;
  const go = (k: number) => {
    i = ((k % n) + n) % n;
    t.scrollTo({ left: t.clientWidth * i, behavior: 'smooth' });
  };
  t.addEventListener('scroll', () => {
    const k = Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
    i = k;
    dots.forEach((d, j) => d.classList.toggle('on', j === k));
    th.forEach((d, j) => d.classList.toggle('on', j === k));
  }, { passive: true });
  dots.forEach((d, j) => d.addEventListener('click', () => go(j)));
  th.forEach((d, j) => d.addEventListener('click', () => go(j)));
  root.querySelectorAll<HTMLElement>('.arw').forEach((b) => b.addEventListener('click', () => go(i + Number(b.dataset.hs))));
  if (auto && n > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const run = () => { clearInterval(timer); timer = window.setInterval(() => go(i + 1), 5000); };
    run();
    t.addEventListener('pointerdown', () => clearInterval(timer));
    t.addEventListener('pointerup', run);
  }
  return { go };
}
