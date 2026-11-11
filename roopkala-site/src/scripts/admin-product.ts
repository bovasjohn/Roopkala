// Admin: add / edit a product, its stock rows and its photos.
import { normaliseVariants, slugify, validateProduct, type PForm, type VForm } from '../lib/adminForm.ts';
import { imgUrl, thumbPath } from '../lib/data.ts';
import { esc } from '../lib/format.ts';
import { processImage } from './image.ts';

export interface Ctx {
  supa: string; key: string; root: HTMLElement;
  api<T = any>(method: string, path: string, body?: unknown, prefer?: string): Promise<T>;
  token(): Promise<string>;
  shell(inner: string, tab?: string): void;
  toast(msg: string): void;
}
interface DbV { id: string; size: string | null; color_name: string | null; color_hex: string | null; stock: number; sort: number }
interface DbImg { id: string; path: string; width: number | null; height: number | null; color_name: string | null; sort: number }
interface DbP {
  id: string; slug: string; code: string; name: string; description: string | null; category_id: string | null; price_inr: number;
  is_active: boolean; size_enabled: boolean; color_enabled: boolean; tint_mode: 'auto' | 'manual'; tint_color: string | null;
  meta_title: string | null; meta_description: string | null; variants: DbV[] | null; images: DbImg[] | null;
}

export const rand = () => Math.random().toString(36).slice(2, 10);
const val = (root: HTMLElement, sel: string): string => (root.querySelector<HTMLInputElement>(sel)?.value ?? '').trim();
const chk = (root: HTMLElement, sel: string): boolean => Boolean(root.querySelector<HTMLInputElement>(sel)?.checked);

export async function editProduct(ctx: Ctx, id: string | null): Promise<void> {
  ctx.shell('<p class="empty">Loading…</p>', 'p');
  const cats = await ctx.api<{ id: string; name: string }[]>('GET', 'categories?select=id,name&order=sort.asc');
  const p: DbP | null = id
    ? (await ctx.api<DbP[]>('GET', `products?select=*,variants:product_variants(*),images:product_images(*)&id=eq.${encodeURIComponent(id)}`))[0] ?? null
    : null;
  if (id && !p) { ctx.shell('<p class="empty">Product not found.</p><a class="btn" href="#products">Back</a>', 'p'); return; }

  const vs: VForm[] = (p?.variants ?? []).sort((a, b) => a.sort - b.sort)
    .map((v) => ({ id: v.id, size: v.size ?? '', color_name: v.color_name ?? '', color_hex: v.color_hex ?? '', stock: v.stock }));
  if (vs.length === 0) vs.push({ size: '', color_name: '', color_hex: '', stock: 0 });
  const imgs = [...(p?.images ?? [])].sort((a, b) => a.sort - b.sort);

  const rowHtml = (v: VForm, i: number) => `<div class="adm-vrow" data-vi="${i}" ${v.id ? `data-id="${esc(v.id)}"` : ''}>
    <input data-f="size" placeholder="Size (M, 2.4m…)" value="${esc(v.size)}">
    <input data-f="color_name" placeholder="Colour name" value="${esc(v.color_name)}">
    <input data-f="color_hex" type="color" value="${esc(v.color_hex || '#999999')}" title="Colour swatch">
    <input data-f="stock" type="number" min="0" step="1" value="${v.stock}" title="Stock">
    <button type="button" class="btn sm ghost" data-rm="${i}">✕</button></div>`;

  const f = (label: string, inner: string, hint = '') => `<label class="adm-f"><span>${label}</span>${inner}${hint ? `<small>${hint}</small>` : ''}</label>`;
  const manual = p?.tint_mode === 'manual';
  const html = `<a href="#products" class="back">← Products</a><h1 style="font-size:30px;margin:6px 0 14px">${p ? 'Edit product' : 'New product'}</h1>
  <form id="pf" class="adm-card" novalidate>
    ${f('Name', `<input id="f-name" value="${esc(p?.name ?? '')}" maxlength="200">`)}
    <div class="adm-2">
      ${f('Code', `<input id="f-code" value="${esc(p?.code ?? 'RK-' + String(Math.floor(1000 + Math.random() * 9000)))}">`)}
      ${f('Web address', `<input id="f-slug" value="${esc(p?.slug ?? '')}">`, 'Made from the name. Changing it later breaks old links.')}
    </div>
    <div class="adm-2">
      ${f('Category', `<select id="f-cat">${cats.map((c) => `<option value="${esc(c.id)}" ${c.id === p?.category_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`)}
      ${f('Price (₹)', `<input id="f-price" type="number" min="0" step="1" value="${p?.price_inr ?? ''}">`)}
    </div>
    ${f('Description', `<textarea id="f-desc" rows="5">${esc(p?.description ?? '')}</textarea>`, 'Optional. Use "# Heading" and "- bullet" lines.')}
    <div class="adm-checks">
      <label><input type="checkbox" id="f-live" ${p?.is_active ? 'checked' : ''}> Show on the shop</label>
      <label><input type="checkbox" id="f-sz" ${p?.size_enabled ? 'checked' : ''}> Has sizes</label>
      <label><input type="checkbox" id="f-co" ${p?.color_enabled ? 'checked' : ''}> Has colours</label>
    </div>
    <div class="lbl">Stock</div>
    <div id="vrows">${vs.map(rowHtml).join('')}</div>
    <button type="button" class="btn sm ghost" id="addv" style="margin-top:8px">+ Add row</button>
    <div class="lbl">Page background tint</div>
    <div class="adm-checks">
      <label><input type="radio" name="tm" value="auto" ${manual ? '' : 'checked'}> Automatic (from the photo)</label>
      <label><input type="radio" name="tm" value="manual" ${manual ? 'checked' : ''}> I choose <input type="color" id="f-tint" value="${esc(p?.tint_color ?? '#c9a24a')}"></label>
    </div>
    ${f('Search title (optional)', `<input id="f-mt" value="${esc(p?.meta_title ?? '')}">`)}
    ${f('Search description (optional)', `<input id="f-md" value="${esc(p?.meta_description ?? '')}" maxlength="300">`)}
    <div id="errs" class="adm-err" hidden></div>
    <div class="adm-row" style="border:0"><button class="btn" id="save" type="submit">Save</button>${p ? '<button type="button" class="btn sm ghost" id="del" style="margin-left:auto">Delete product</button>' : ''}</div>
  </form>
  <div class="adm-card" id="photos"></div>`;
  ctx.shell(html, 'p');
  const R = ctx.root;

  // keep the web address in step with the name until the admin edits it themselves
  const slugEl = R.querySelector<HTMLInputElement>('#f-slug')!;
  let slugTouched = Boolean(p);
  slugEl.addEventListener('input', () => { slugTouched = true; });
  R.querySelector('#f-name')!.addEventListener('input', (e) => { if (!slugTouched) slugEl.value = slugify((e.target as HTMLInputElement).value); });

  const readRows = (): VForm[] => [...R.querySelectorAll<HTMLElement>('.adm-vrow')].map((r) => ({
    id: r.dataset.id,
    size: val(r, '[data-f=size]'), color_name: val(r, '[data-f=color_name]'), color_hex: val(r, '[data-f=color_hex]'),
    stock: Number(val(r, '[data-f=stock]')),
  }));
  const draw = (rows: VForm[]) => { R.querySelector('#vrows')!.innerHTML = rows.map(rowHtml).join(''); wireRows(); showOptionInputs(); };
  const wireRows = () => R.querySelectorAll<HTMLButtonElement>('[data-rm]').forEach((b) => b.addEventListener('click', () => {
    const rows = readRows(); rows.splice(Number(b.dataset.rm), 1); if (rows.length === 0) rows.push({ size: '', color_name: '', color_hex: '', stock: 0 }); draw(rows);
  }));
  const showOptionInputs = () => {
    const sz = chk(R, '#f-sz'), co = chk(R, '#f-co');
    R.querySelectorAll<HTMLElement>('[data-f=size]').forEach((e) => (e.hidden = !sz));
    R.querySelectorAll<HTMLElement>('[data-f=color_name],[data-f=color_hex]').forEach((e) => (e.hidden = !co));
    R.querySelector<HTMLElement>('#addv')!.hidden = !sz && !co;
  };
  wireRows(); showOptionInputs();
  R.querySelector('#f-sz')!.addEventListener('change', showOptionInputs);
  R.querySelector('#f-co')!.addEventListener('change', showOptionInputs);
  R.querySelector('#addv')!.addEventListener('click', () => draw([...readRows(), { size: '', color_name: '', color_hex: '', stock: 0 }]));

  R.querySelector('#pf')!.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form: PForm = {
      name: val(R, '#f-name'), slug: val(R, '#f-slug'), code: val(R, '#f-code'), description: (R.querySelector<HTMLTextAreaElement>('#f-desc')?.value ?? '').trim(),
      category_id: val(R, '#f-cat'), price: Number(val(R, '#f-price') === '' ? NaN : val(R, '#f-price')),
      is_active: chk(R, '#f-live'), size_enabled: chk(R, '#f-sz'), color_enabled: chk(R, '#f-co'),
      tint_mode: R.querySelector<HTMLInputElement>('[name=tm]:checked')?.value === 'manual' ? 'manual' : 'auto',
      tint_color: val(R, '#f-tint'), meta_title: val(R, '#f-mt'), meta_description: val(R, '#f-md'), variants: readRows(),
    };
    const errs = validateProduct(form);
    const box = R.querySelector<HTMLElement>('#errs')!;
    box.hidden = errs.length === 0; box.innerHTML = errs.map((m) => `<div>${esc(m)}</div>`).join('');
    if (errs.length) return;
    const btn = R.querySelector<HTMLButtonElement>('#save')!; btn.disabled = true;
    try {
      const row = {
        name: form.name, slug: form.slug, code: form.code, description: form.description || null, category_id: form.category_id,
        price_inr: form.price, is_active: form.is_active, size_enabled: form.size_enabled, color_enabled: form.color_enabled,
        tint_mode: form.tint_mode, tint_color: form.tint_mode === 'manual' ? form.tint_color : (p?.tint_color ?? null),
        meta_title: form.meta_title || null, meta_description: form.meta_description || null,
      };
      let pid = id;
      if (pid) await ctx.api('PATCH', `products?id=eq.${encodeURIComponent(pid)}`, row);
      else pid = (await ctx.api<{ id: string }[]>('POST', 'products', row, 'return=representation'))[0]!.id;

      const rows = normaliseVariants(form);
      const dbv = (v: VForm, i: number) => ({
        size: v.size || null, color_name: v.color_name || null, color_hex: v.color_name && /^#[0-9a-f]{6}$/i.test(v.color_hex) ? v.color_hex : null, stock: v.stock, sort: i,
      });
      const keep = new Set(rows.map((r) => r.id).filter(Boolean));
      const gone = (p?.variants ?? []).map((v) => v.id).filter((x) => !keep.has(x));
      if (gone.length) await ctx.api('DELETE', `product_variants?id=in.(${gone.map(encodeURIComponent).join(',')})`);
      for (const [i, v] of rows.entries()) if (v.id) await ctx.api('PATCH', `product_variants?id=eq.${encodeURIComponent(v.id)}`, dbv(v, i));
      const fresh = rows.map((v, i) => ({ v, i })).filter((x) => !x.v.id).map((x) => ({ product_id: pid, ...dbv(x.v, x.i) }));
      if (fresh.length) await ctx.api('POST', 'product_variants', fresh);
      ctx.toast(id ? 'Saved' : 'Saved. Now add photos');
      if (id) await editProduct(ctx, id); else location.hash = `#product/${pid}`;
    } catch (e) {
      const m = (e as Error).message;
      ctx.toast(/duplicate|unique/i.test(m) ? 'That code or web address is already used by another product' : m);
      btn.disabled = false;
    }
  });

  R.querySelector('#del')?.addEventListener('click', async () => {
    if (!id || !confirm('Delete this product and its photos? This cannot be undone.')) return;
    try {
      for (const i of imgs) await removeObjects(ctx, i.path).catch(() => {});
      await ctx.api('DELETE', `products?id=eq.${encodeURIComponent(id)}`);
      ctx.toast('Deleted'); location.hash = '#products';
    } catch (e) { ctx.toast((e as Error).message); }
  });

  if (id) photoSection(ctx, id, imgs, vs, p?.tint_mode ?? 'auto');
  else R.querySelector('#photos')!.innerHTML = '<div class="cat">Save the product first, then you can add photos.</div>';
}

export async function removeObjects(ctx: Ctx, path: string): Promise<void> {
  const tok = await ctx.token();
  for (const pth of [path, thumbPath(path)]) {
    await fetch(`${ctx.supa}/storage/v1/object/product-images/${pth.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'DELETE', headers: { apikey: ctx.key, Authorization: `Bearer ${tok}` },
    });
  }
}

export async function upload(ctx: Ctx, path: string, blob: Blob): Promise<void> {
  const tok = await ctx.token();
  const res = await fetch(`${ctx.supa}/storage/v1/object/product-images/${path}`, {
    method: 'POST', headers: { apikey: ctx.key, Authorization: `Bearer ${tok}`, 'Content-Type': blob.type, 'Cache-Control': 'max-age=31536000' }, body: blob,
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as any).message || `Upload failed (${res.status})`);
}

function photoSection(ctx: Ctx, pid: string, imgs: DbImg[], vs: VForm[], tintMode: string): void {
  const box = ctx.root.querySelector<HTMLElement>('#photos')!;
  const colours = [...new Set(vs.map((v) => v.color_name).filter(Boolean))];
  const draw = () => {
    box.innerHTML = `<div class="lbl" style="margin-top:0">Photos</div>
      <div class="cat" style="margin-bottom:10px">The first photo is the cover. Photos are shrunk automatically before upload.</div>
      <div class="adm-photos">${imgs.map((i, n) => `<div class="adm-ph"><img src="${esc(imgUrl(thumbPath(i.path), ctx.supa))}" alt="">
        ${n === 0 ? '<span class="pill">Cover</span>' : `<button type="button" class="btn sm ghost" data-cover="${esc(i.id)}">Make cover</button>`}
        ${colours.length ? `<select data-col="${esc(i.id)}"><option value="">All colours</option>${colours.map((c) => `<option ${c === i.color_name ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : ''}
        <button type="button" class="btn sm ghost" data-del="${esc(i.id)}">Remove</button></div>`).join('')}</div>
      <input type="file" id="pick" accept="image/*" multiple style="margin-top:12px"><div class="cat" id="up"></div>`;
    box.querySelector<HTMLInputElement>('#pick')!.addEventListener('change', async (e) => {
      const files = [...((e.target as HTMLInputElement).files ?? [])];
      const status = box.querySelector<HTMLElement>('#up')!;
      for (const [k, file] of files.entries()) {
        try {
          status.textContent = `Preparing ${k + 1} of ${files.length}…`;
          const out = await processImage(file);
          const name = `${rand()}.${out.ext}`;
          const path = `products/${pid}/${name}`;
          status.textContent = `Uploading ${k + 1} of ${files.length}…`;
          await upload(ctx, path, out.full);
          await upload(ctx, thumbPath(path), out.thumb);
          const sort = imgs.length ? Math.max(...imgs.map((i) => i.sort)) + 1 : 0;
          const [row] = await ctx.api<DbImg[]>('POST', 'product_images', { product_id: pid, path, width: out.w, height: out.h, sort }, 'return=representation');
          imgs.push(row!);
          if (sort === 0 && tintMode === 'auto' && out.tint) await ctx.api('PATCH', `products?id=eq.${encodeURIComponent(pid)}`, { tint_color: out.tint });
        } catch (err) { ctx.toast((err as Error).message); }
      }
      draw();
    });
    box.querySelectorAll<HTMLButtonElement>('[data-cover]').forEach((b) => b.addEventListener('click', async () => {
      try {
        const min = Math.min(...imgs.map((i) => i.sort));
        await ctx.api('PATCH', `product_images?id=eq.${encodeURIComponent(b.dataset.cover!)}`, { sort: min - 1 });
        imgs.find((i) => i.id === b.dataset.cover)!.sort = min - 1; imgs.sort((a, c) => a.sort - c.sort); draw();
      } catch (err) { ctx.toast((err as Error).message); }
    }));
    box.querySelectorAll<HTMLSelectElement>('[data-col]').forEach((s) => s.addEventListener('change', async () => {
      try { await ctx.api('PATCH', `product_images?id=eq.${encodeURIComponent(s.dataset.col!)}`, { color_name: s.value || null }); imgs.find((i) => i.id === s.dataset.col)!.color_name = s.value || null; ctx.toast('Saved'); }
      catch (err) { ctx.toast((err as Error).message); }
    }));
    box.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      const img = imgs.find((i) => i.id === b.dataset.del); if (!img || !confirm('Remove this photo?')) return;
      try {
        await ctx.api('DELETE', `product_images?id=eq.${encodeURIComponent(img.id)}`);
        await removeObjects(ctx, img.path).catch(() => {});
        imgs.splice(imgs.indexOf(img), 1); draw();
      } catch (err) { ctx.toast((err as Error).message); }
    }));
  };
  draw();
}
