// Admin: Settings screen — general, appearance, About page, social links, payments (locked).
import { validateAbout, validateAppearance, validateGeneral, validateSocial } from '../lib/adminSettings.ts';
import { PLATS, THEMES, THEME_INFO } from '../lib/config.ts';
import { imgUrl } from '../lib/data.ts';
import { digits, esc, isHex } from '../lib/format.ts';
import { rand, removeObjects, upload, type Ctx } from './admin-product.ts';
import { field, loadSettings, saveSetting, showErrors } from './admin-util.ts';
import { processImage } from './image.ts';

const v = (r: ParentNode, s: string) => (r.querySelector<HTMLInputElement>(s)?.value ?? '').trim();
const c = (r: ParentNode, s: string) => Boolean(r.querySelector<HTMLInputElement>(s)?.checked);

export async function settingsScreen(ctx: Ctx): Promise<void> {
  ctx.shell('<p class="empty">Loading…</p>', 's');
  const S = await loadSettings(ctx);
  const errBox = (id: string) => `<div class="adm-err" id="${id}" hidden></div>`;
  const save = (id: string) => `<div class="adm-row" style="border:0"><button type="button" class="btn" id="${id}">Save</button></div>`;
  const hasAccent = isHex(S.appearance.accent);

  ctx.shell(`
  <div class="adm-card" id="g"><div class="lbl" style="margin-top:0">General</div>
    <div class="lbl" style="margin-top:0">Logo</div><div id="g-logo"></div><input type="file" accept="image/*" id="g-logofile">
    <div class="cat" style="margin-bottom:12px">Shown in the header and footer in place of the text name. A wide, transparent logo works best.</div>
    ${field('WhatsApp number', `<input id="g-wa" inputmode="numeric" value="${esc(S.general.whatsapp)}">`, 'Digits with country code, e.g. 919876543210. Orders and enquiries open WhatsApp on this number.')}
    ${field('"Few left" shows at or below', `<input id="g-low" type="number" min="0" max="50" step="1" value="${S.general.low_stock}">`, 'Total stock of a product. Shown as a "Few left" label.')}
    ${field('Google Analytics ID', `<input id="g-ga" placeholder="G-XXXXXXXXXX" value="${esc(S.general.ga_id)}">`, 'Optional. Only loads after a visitor accepts cookies.')}
    ${errBox('g-err')}${save('g-save')}</div>

  <div class="adm-card" id="a"><div class="lbl" style="margin-top:0">Look</div>
    <div class="lbl">Theme</div><input type="hidden" id="a-theme" value="${esc(S.appearance.theme)}">
    <div class="adm-themes" id="a-themes">${THEME_INFO.map((t) => `<div class="adm-th ${t.id === S.appearance.theme ? 'on' : ''}" data-id="${t.id}" role="button" tabindex="0" aria-pressed="${t.id === S.appearance.theme}"><div class="sw">${t.swatch.map((c) => `<i style="background:${c}"></i>`).join('')}</div><b>${esc(t.label)}</b><small>${esc(t.vibe)}</small><a href="/?theme_preview=${t.id}" target="_blank" rel="noopener">Preview ↗</a></div>`).join('')}</div>
    <div class="cat" style="margin:6px 0 12px">Changes colours, fonts and decorations. The layout stays the same. Tap a theme, then Save. Preview opens the shop in that theme without changing anything for visitors.</div>
    ${field('Photo framing', `<select id="a-fit"><option value="fill" ${S.appearance.fit !== 'whole' ? 'selected' : ''}>Fill the square (crops, keeps the top of the photo)</option><option value="whole" ${S.appearance.fit === 'whole' ? 'selected' : ''}>Show the whole photo (empty space at the sides)</option></select>`, 'Tap-to-zoom on the product page always shows the whole photo.')}
    <div class="adm-checks"><label><input type="checkbox" id="a-own" ${hasAccent ? 'checked' : ''}> Use my own accent colour</label>
      <input type="color" id="a-accent" value="${hasAccent ? esc(S.appearance.accent) : '#7a1f2b'}"></div>
    ${errBox('a-err')}${save('a-save')}</div>

  <div class="adm-card" id="ab"><div class="lbl" style="margin-top:0">About page</div>
    <div class="adm-checks"><label><input type="checkbox" id="ab-on" ${S.about.enabled ? 'checked' : ''}> Show the About page</label></div>
    ${field('Title', `<input id="ab-title" maxlength="80" value="${esc(S.about.title)}">`)}
    ${field('Text', `<textarea id="ab-body" rows="8">${esc(S.about.body)}</textarea>`, 'Use "# Heading" and "- bullet" lines. Blank line = new paragraph.')}
    <div id="ab-img"></div><input type="file" accept="image/*" id="ab-file">
    ${errBox('ab-err')}${save('ab-save')}</div>

  <div class="adm-card" id="so"><div class="lbl" style="margin-top:0">Social links</div>
    ${PLATS.map((p) => field(p.n, `<input data-soc="${p.k}" placeholder="https://" value="${esc(S.social[p.k] ?? '')}">`)).join('')}
    <div class="cat">Show the icons in:</div>
    <div class="adm-checks"><label><input type="checkbox" id="so-h" ${S.social.show_in.header ? 'checked' : ''}> Header</label>
      <label><input type="checkbox" id="so-f" ${S.social.show_in.footer ? 'checked' : ''}> Footer</label>
      <label><input type="checkbox" id="so-a" ${S.social.show_in.about ? 'checked' : ''}> About page</label></div>
    ${errBox('so-err')}${save('so-save')}</div>

  <div class="adm-card"><div class="lbl" style="margin-top:0">Payments</div>
    <div class="adm-checks"><label><input type="checkbox" disabled ${S.payments.cod ? 'checked' : ''}> Cash on delivery</label>
      <label><input type="checkbox" disabled> Cards (Razorpay)</label><label><input type="checkbox" disabled> Google Pay</label></div>
    <div class="cat">Online payments are locked until a payment gateway is connected and checked on the server. Orders go through WhatsApp for now.</div></div>`, 's');

  const R = ctx.root;
  const done = (id: string) => (e: unknown) => { void id; ctx.toast(e instanceof Error ? e.message : 'Saved'); };

  let logo = S.general.logo_path ?? '';
  const logoTrash: string[] = [];
  const drawLogo = () => { R.querySelector('#g-logo')!.innerHTML = logo
    ? `<img src="${esc(imgUrl(logo, ctx.supa))}" alt="" style="max-height:60px;max-width:240px;display:block;margin:6px 0"><button type="button" class="btn sm ghost" id="g-logorm">Remove logo</button>` : '<div class="cat">No logo. The text name is shown.</div>';
    R.querySelector('#g-logorm')?.addEventListener('click', () => { logoTrash.push(logo); logo = ''; drawLogo(); }); };
  drawLogo();
  R.querySelector<HTMLInputElement>('#g-logofile')!.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
    try {
      ctx.toast('Preparing logo…');
      const out = await processImage(file, { max: 600, target: 60_000, thumb: false });
      const path = `site/logo-${rand()}.${out.ext}`; await upload(ctx, path, out.full);
      if (logo) logoTrash.push(logo);
      logo = path; drawLogo(); ctx.toast('Logo added. Press Save.');
    } catch (err) { ctx.toast((err as Error).message); }
  });

  R.querySelector('#g-save')!.addEventListener('click', async () => {
    const f = { whatsapp: v(R, '#g-wa'), low_stock: Number(v(R, '#g-low')), ga_id: v(R, '#g-ga') };
    const errs = validateGeneral(f); showErrors(R.querySelector<HTMLElement>('#g-err')!, errs, esc); if (errs.length) return;
    try { await saveSetting(ctx, 'general', { ...S.general, whatsapp: digits(f.whatsapp), low_stock: f.low_stock, ga_id: f.ga_id.toUpperCase(), logo_path: logo });
      for (const p of logoTrash.splice(0)) if (p !== logo) await removeObjects(ctx, p).catch(() => {});
      ctx.toast('Saved'); } catch (e) { done('g')(e); }
  });

  const pick = (el: HTMLElement) => {
    const id = el.dataset.id; if (!id) return;
    (R.querySelector('#a-theme') as HTMLInputElement).value = id;
    R.querySelectorAll('.adm-th').forEach((n) => { n.classList.toggle('on', n === el); n.setAttribute('aria-pressed', String(n === el)); });
  };
  R.querySelector('#a-themes')!.addEventListener('click', (e) => { const t = e.target as HTMLElement; if (t.closest('a')) return; const el = t.closest('.adm-th'); if (el) pick(el as HTMLElement); });
  R.querySelector('#a-themes')!.addEventListener('keydown', (e) => { const k = (e as KeyboardEvent).key; if (k !== 'Enter' && k !== ' ') return; const el = (e.target as HTMLElement).closest('.adm-th'); if (el) { e.preventDefault(); pick(el as HTMLElement); } });

  R.querySelector('#a-save')!.addEventListener('click', async () => {
    const f = { theme: v(R, '#a-theme'), accent: c(R, '#a-own') ? v(R, '#a-accent') : '', fit: v(R, '#a-fit') };
    const errs = validateAppearance(f, THEMES); showErrors(R.querySelector<HTMLElement>('#a-err')!, errs, esc); if (errs.length) return;
    try { await saveSetting(ctx, 'appearance', f); ctx.toast('Saved. Reload the shop to see it.'); } catch (e) { done('a')(e); }
  });

  let aboutImg = S.about.image_path ?? '';
  const aboutTrash: string[] = [];
  const drawAboutImg = () => { R.querySelector('#ab-img')!.innerHTML = aboutImg
    ? `<img src="${esc(imgUrl(aboutImg, ctx.supa))}" alt="" style="max-width:220px;border-radius:12px"><div><button type="button" class="btn sm ghost" id="ab-rm">Remove photo</button></div>` : '<div class="cat">No photo</div>';
    R.querySelector('#ab-rm')?.addEventListener('click', () => { aboutTrash.push(aboutImg); aboutImg = ''; drawAboutImg(); }); };
  drawAboutImg();
  R.querySelector<HTMLInputElement>('#ab-file')!.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
    try {
      ctx.toast('Preparing photo…');
      const out = await processImage(file, { max: 1400, target: 250_000, thumb: false });
      const path = `site/${rand()}.${out.ext}`; await upload(ctx, path, out.full);
      if (aboutImg) aboutTrash.push(aboutImg);
      aboutImg = path; drawAboutImg(); ctx.toast('Photo added. Press Save.');
    } catch (err) { ctx.toast((err as Error).message); }
  });
  R.querySelector('#ab-save')!.addEventListener('click', async () => {
    const f = { enabled: c(R, '#ab-on'), title: v(R, '#ab-title'), body: (R.querySelector<HTMLTextAreaElement>('#ab-body')?.value ?? '').trim(), image_path: aboutImg || null };
    const errs = validateAbout(f); showErrors(R.querySelector<HTMLElement>('#ab-err')!, errs, esc); if (errs.length) return;
    try {
      await saveSetting(ctx, 'about', f);
      for (const p of aboutTrash.splice(0)) if (p !== aboutImg) await removeObjects(ctx, p).catch(() => {});
      ctx.toast('Saved');
    } catch (e) { done('ab')(e); }
  });

  R.querySelector('#so-save')!.addEventListener('click', async () => {
    const links: Record<string, string> = {};
    R.querySelectorAll<HTMLInputElement>('[data-soc]').forEach((i) => { links[i.dataset.soc!] = i.value.trim(); });
    const errs = validateSocial(links); showErrors(R.querySelector<HTMLElement>('#so-err')!, errs, esc); if (errs.length) return;
    try { await saveSetting(ctx, 'social', { ...links, show_in: { header: c(R, '#so-h'), footer: c(R, '#so-f'), about: c(R, '#so-a') } }); ctx.toast('Saved'); } catch (e) { done('so')(e); }
  });
}
