// Site-wide behaviour: light/dark toggle, cart badge, home hero + category tabs, cookie consent.
import { loadGA } from './analytics.ts';
import { initCarousel } from './carousel.ts';
import { updateBadge } from './cart-store.ts';

const root = document.documentElement;

document.getElementById('theme')?.addEventListener('click', () => {
  const next = root.dataset.mode === 'dark' ? 'light' : 'dark';
  root.dataset.mode = next;
  try { localStorage.setItem('rk_theme', next); } catch { /* ignore */ }
});

updateBadge();
addEventListener('pageshow', updateBadge); // back/forward cache

// Home page: hero slides + category tabs (every category is already in the HTML, so crawlers see all of them)
const hs = document.querySelector('.hs');
if (hs) initCarousel(hs, '.hs-track', '.hs-dots', true);

const tabs = document.querySelectorAll<HTMLAnchorElement>('.tab[data-cat]');
tabs.forEach((tab) => tab.addEventListener('click', (e) => {
  e.preventDefault();
  const slug = tab.dataset.cat;
  const panels = document.querySelectorAll<HTMLElement>('[data-panel]');
  tabs.forEach((t) => t.classList.toggle('on', t === tab));
  panels.forEach((p) => { p.style.opacity = '0'; });
  setTimeout(() => {
    panels.forEach((p) => { p.hidden = p.dataset.panel !== slug; p.style.transition = 'opacity .18s'; p.style.opacity = '1'; });
  }, 160);
}));

// Analytics only after the visitor accepts cookies
const ga = document.body.dataset.ga || '';
const banner = document.getElementById('ck');
let consent: string | null = null;
try { consent = localStorage.getItem('rk_consent'); } catch { /* ignore */ }
if (ga && consent === 'yes') loadGA(ga);
if (ga && consent === null && banner) {
  banner.hidden = false;
  banner.querySelectorAll<HTMLElement>('[data-consent]').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.consent === 'yes' ? 'yes' : 'no';
    try { localStorage.setItem('rk_consent', v); } catch { /* ignore */ }
    if (v === 'yes') loadGA(ga);
    banner.hidden = true;
  }));
}
