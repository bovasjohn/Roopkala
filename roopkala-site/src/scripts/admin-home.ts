// Admin: Homepage screen — top carousel slides, homepage product sections, categories.
import { cleanSlides, MAX_SLIDES, moveItem, validateSlides, type SlideForm } from '../lib/adminSettings.ts';
import { imgUrl } from '../lib/data.ts';
import { esc, slugOk } from '../lib/format.ts';
import { slugify } from '../lib/adminForm.ts';
import { rand, removeObjects, upload, type Ctx } from './admin-product.ts';
import { field, loadSettings, saveSetting, showErrors } from './admin-util.ts';
import { processImage } from './image.ts';

interface Cat { id: string; name: string; slug: string; sort: number }
interface Prod { id: string; name: string; code: string }
interface Sec { id: string; key: string; title: string; items: { product_id: string; sort: number }[] }

export async function homepage(ctx: Ctx): Promise<void> {
  ctx.shell('<p class="empty">Loading…</p>', 'h');
  const [settings, cats, prods, secs] = await Promise.all([
    loadSettings(ctx),
    ctx.api<Cat[]>('GET', 'categories?select=id,name,slug,sort&order=sort.asc'),
    ctx.api<Prod[]>('GET', 'products?select=id,name,code&order=name.asc&limit=1000'),
    ctx.api<Sec[]>('GET', 'homepage_sections?select=id,key,title,items:homepage_products(product_id,sort)&order=sort.asc'),
  ]);
  ctx.shell('<div id="c-slides" class="adm-card"></div><div id="c-secs"></div><div id="c-cats" class="adm-card"></div>', 'h');
  slidesCard(ctx, settings.hero);
  sectionsCard(ctx, secs, prods);
  categoriesCard(ctx, cats);
}

/* ---------- top carousel ---------- */
function slidesCard(ctx: Ctx, hero: any): void {
  const box = ctx.root.querySelector<HTMLElement>('#c-slides')!;
  let slides: SlideForm[] = (hero.slides?.length ? hero.slides : [hero]).map((s: any) => ({
    heading: String(s.heading ?? ''), text: String(s.text ?? ''), image_path: String(s.image_path ?? ''), cta: String(s.cta ?? ''), href: String(s.href ?? ''),
  }));
  const trash: string[] = [];

  const sync = () => box.querySelectorAll<HTMLElement>('.adm-slide').forEach((el, i) => {
    const g = (f: string) => (el.querySelector<HTMLInputElement>(`[data-f=${f}]`)?.value ?? '');
    if (slides[i]) slides[i] = { ...slides[i]!, heading: g('heading'), text: g('text'), cta: g('cta'), href: g('href') };
  });

  const draw = () => {
    box.innerHTML = `<div class="lbl" style="margin-top:0">Top carousel</div>
      <div class="cat" style="margin-bottom:10px">Up to ${MAX_SLIDES} slides. Wide photos work best (landscape). Photos are shrunk automatically.</div>
      ${slides.map((s, i) => `<div class="adm-slide adm-card" data-i="${i}">
        <div class="adm-slide-img">${s.image_path ? `<img src="${esc(imgUrl(s.image_path, ctx.supa))}" alt="">` : '<div class="cat">No photo yet</div>'}</div>
        <input type="file" accept="image/*" data-up="${i}">
        ${field('Heading', `<input data-f="heading" maxlength="120" value="${esc(s.heading)}">`)}
        ${field('Text', `<input data-f="text" maxlength="240" value="${esc(s.text)}">`)}
        <div class="adm-2">${field('Button text', `<input data-f="cta" maxlength="30" placeholder="Explore the collection" value="${esc(s.cta)}">`)}
          ${field('Button link', `<input data-f="href" placeholder="/shop or /textiles" value="${esc(s.href)}">`)}</div>
        <div class="adm-row" style="border:0;margin:0"><button type="button" class="btn sm ghost" data-mv="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="btn sm ghost" data-mv="${i}" data-d="1" ${i === slides.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="btn sm ghost" data-rm="${i}" style="margin-left:auto">Remove slide</button></div></div>`).join('')}
      <button type="button" class="btn sm ghost" id="add-slide" ${slides.length >= MAX_SLIDES ? 'disabled' : ''}>+ Add slide</button>
      <div class="adm-err" id="slide-errs" hidden></div>
      <div class="adm-row" style="border:0"><button type="button" class="btn" id="save-slides">Save carousel</button></div>`;

    box.querySelectorAll<HTMLInputElement>('[data-up]').forEach((inp) => inp.addEventListener('change', async () => {
      const file = inp.files?.[0]; if (!file) return;
      sync(); const i = Number(inp.dataset.up);
      try {
        ctx.toast('Preparing photo…');
        const out = await processImage(file, { max: 2000, target: 350_000, thumb: false });
        const path = `site/${rand()}.${out.ext}`;
        await upload(ctx, path, out.full);
        if (slides[i]!.image_path) trash.push(slides[i]!.image_path);
        slides[i]!.image_path = path; draw(); ctx.toast('Photo added. Press Save carousel.');
      } catch (e) { ctx.toast((e as Error).message); }
    }));
    box.querySelectorAll<HTMLButtonElement>('[data-mv]').forEach((b) => b.addEventListener('click', () => { sync(); slides = moveItem(slides, Number(b.dataset.mv), Number(b.dataset.d) as -1 | 1); draw(); }));
    box.querySelectorAll<HTMLButtonElement>('[data-rm]').forEach((b) => b.addEventListener('click', () => {
      sync(); const i = Number(b.dataset.rm);
      if (slides[i]!.image_path) trash.push(slides[i]!.image_path);
      slides.splice(i, 1); draw();
    }));
    box.querySelector('#add-slide')!.addEventListener('click', () => { sync(); slides.push({ heading: '', text: '', image_path: '', cta: '', href: '' }); draw(); });
    box.querySelector('#save-slides')!.addEventListener('click', async () => {
      sync();
      const errs = validateSlides(slides); showErrors(box.querySelector<HTMLElement>('#slide-errs')!, errs, esc);
      if (errs.length) return;
      try {
        const clean = cleanSlides(slides);
        await saveSetting(ctx, 'hero', { heading: clean[0]!.heading, text: clean[0]!.text, image_path: clean[0]!.image_path, slides: clean });
        const keep = new Set(clean.map((c) => c.image_path));
        for (const p of trash.splice(0)) if (!keep.has(p)) await removeObjects(ctx, p).catch(() => {});
        ctx.toast('Carousel saved');
      } catch (e) { ctx.toast((e as Error).message); }
    });
  };
  draw();
}

/* ---------- homepage product sections ---------- */
function sectionsCard(ctx: Ctx, secs: Sec[], prods: Prod[]): void {
  const wrap = ctx.root.querySelector<HTMLElement>('#c-secs')!;
  const name = new Map(prods.map((p) => [p.id, `${p.name} (${p.code})`]));
  wrap.innerHTML = secs.map((s) => `<div class="adm-card" data-sec="${esc(s.id)}"></div>`).join('');
  for (const s of secs) {
    const box = wrap.querySelector<HTMLElement>(`[data-sec="${s.id}"]`)!;
    let ids = [...s.items].sort((a, b) => a.sort - b.sort).map((i) => i.product_id).filter((id) => name.has(id));
    let title = s.title;
    const draw = () => {
      const free = prods.filter((p) => !ids.includes(p.id));
      box.innerHTML = `<div class="lbl" style="margin-top:0">Homepage section: ${s.key === 'carousel' ? 'swipe row' : 'grid'}</div>
        ${field('Section title', `<input data-title maxlength="60" value="${esc(title)}">`)}
        ${ids.map((id, i) => `<div class="adm-row"><span>${esc(name.get(id) ?? '')}</span>
          <button type="button" class="btn sm ghost" data-mv="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="btn sm ghost" data-mv="${i}" data-d="1" ${i === ids.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="btn sm ghost" data-rm="${i}">✕</button></div>`).join('') || '<div class="cat">No products chosen yet.</div>'}
        <div class="adm-row" style="border:0"><select data-pick>${free.map((p) => `<option value="${esc(p.id)}">${esc(name.get(p.id) ?? '')}</option>`).join('')}</select>
          <button type="button" class="btn sm ghost" data-add ${free.length ? '' : 'disabled'}>Add</button></div>
        <div class="adm-row" style="border:0"><button type="button" class="btn" data-save>Save section</button></div>`;
      const sync = () => { title = box.querySelector<HTMLInputElement>('[data-title]')!.value; };
      box.querySelectorAll<HTMLButtonElement>('[data-mv]').forEach((b) => b.addEventListener('click', () => { sync(); ids = moveItem(ids, Number(b.dataset.mv), Number(b.dataset.d) as -1 | 1); draw(); }));
      box.querySelectorAll<HTMLButtonElement>('[data-rm]').forEach((b) => b.addEventListener('click', () => { sync(); ids.splice(Number(b.dataset.rm), 1); draw(); }));
      box.querySelector('[data-add]')!.addEventListener('click', () => { sync(); const v = box.querySelector<HTMLSelectElement>('[data-pick]')!.value; if (v) ids.push(v); draw(); });
      box.querySelector('[data-save]')!.addEventListener('click', async () => {
        sync();
        if (!title.trim()) return ctx.toast('Enter a section title');
        try {
          await ctx.api('PATCH', `homepage_sections?id=eq.${encodeURIComponent(s.id)}`, { title: title.trim() });
          await ctx.api('DELETE', `homepage_products?section_id=eq.${encodeURIComponent(s.id)}`);
          if (ids.length) await ctx.api('POST', 'homepage_products', ids.map((id, i) => ({ section_id: s.id, product_id: id, sort: i })));
          ctx.toast('Section saved');
        } catch (e) { ctx.toast((e as Error).message); }
      });
    };
    draw();
  }
}

/* ---------- categories ---------- */
function categoriesCard(ctx: Ctx, initial: Cat[]): void {
  const box = ctx.root.querySelector<HTMLElement>('#c-cats')!;
  let cats = [...initial];
  const draw = () => {
    box.innerHTML = `<div class="lbl" style="margin-top:0">Categories</div>
      ${cats.map((c, i) => `<div class="adm-row"><input data-name="${esc(c.id)}" value="${esc(c.name)}" maxlength="60"><span class="cat">/${esc(c.slug)}</span>
        <button type="button" class="btn sm ghost" data-mv="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="btn sm ghost" data-mv="${i}" data-d="1" ${i === cats.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="btn sm ghost" data-del="${esc(c.id)}">✕</button></div>`).join('')}
      <div class="adm-row" style="border:0"><input id="new-cat" placeholder="New category name" maxlength="60"><button type="button" class="btn sm" id="add-cat">Add</button></div>
      <div class="cat">The web address of a category is set when it is created and cannot be changed later, so old links keep working.</div>`;
    box.querySelectorAll<HTMLInputElement>('[data-name]').forEach((inp) => inp.addEventListener('change', async () => {
      const name = inp.value.trim(); const c = cats.find((x) => x.id === inp.dataset.name)!;
      if (!name) { inp.value = c.name; return ctx.toast('Name cannot be empty'); }
      try { await ctx.api('PATCH', `categories?id=eq.${encodeURIComponent(c.id)}`, { name }); c.name = name; ctx.toast('Renamed'); }
      catch (e) { inp.value = c.name; ctx.toast(/duplicate|unique/i.test((e as Error).message) ? 'That name is already used' : (e as Error).message); }
    }));
    box.querySelectorAll<HTMLButtonElement>('[data-mv]').forEach((b) => b.addEventListener('click', async () => {
      const next = moveItem(cats, Number(b.dataset.mv), Number(b.dataset.d) as -1 | 1);
      try {
        for (const [i, c] of next.entries()) if (c.sort !== i) await ctx.api('PATCH', `categories?id=eq.${encodeURIComponent(c.id)}`, { sort: i });
        cats = next.map((c, i) => ({ ...c, sort: i })); draw();
      } catch (e) { ctx.toast((e as Error).message); }
    }));
    box.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      const c = cats.find((x) => x.id === b.dataset.del)!;
      if (!confirm(`Delete the category "${c.name}"?`)) return;
      try { await ctx.api('DELETE', `categories?id=eq.${encodeURIComponent(c.id)}`); cats = cats.filter((x) => x !== c); draw(); ctx.toast('Deleted'); }
      catch (e) { ctx.toast(/foreign|violates|referenced/i.test((e as Error).message) ? 'This category still has products. Move or delete them first.' : (e as Error).message); }
    }));
    box.querySelector('#add-cat')!.addEventListener('click', async () => {
      const name = box.querySelector<HTMLInputElement>('#new-cat')!.value.trim(); const slug = slugify(name);
      if (!name || !slugOk(slug)) return ctx.toast('Enter a category name using letters or numbers');
      try {
        const [row] = await ctx.api<Cat[]>('POST', 'categories', { name, slug, sort: cats.length }, 'return=representation');
        cats.push(row!); draw(); ctx.toast('Category added');
      } catch (e) { ctx.toast(/duplicate|unique/i.test((e as Error).message) ? 'A category with that name or address already exists' : (e as Error).message); }
    });
  };
  draw();
}
