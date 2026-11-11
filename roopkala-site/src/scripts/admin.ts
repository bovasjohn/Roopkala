// Admin: sign in with Google, then manage stock and enquiries. Everything is enforced by database
// rules (RLS), so even if someone edits this page they cannot do anything a non-admin may not.
import { googleLoginUrl, needsRefresh, parseAuthHash, sessionFromTokenResponse, type Session } from '../lib/auth.ts';
import { esc, inr, digits } from '../lib/format.ts';
import { VERSION } from '../lib/config.ts';
import { homepage } from './admin-home.ts';
import { editProduct, type Ctx } from './admin-product.ts';
import { settingsScreen } from './admin-settings.ts';

const root = document.getElementById('admin-root') as HTMLElement;
const SUPA = root.dataset.url ?? '';
const KEY = root.dataset.key ?? '';
const SK = 'rk_admin_session';
let session: Session | null = null;

const load = (): Session | null => { try { return JSON.parse(localStorage.getItem(SK) || 'null'); } catch { return null; } };
const store = (s: Session | null) => { try { s ? localStorage.setItem(SK, JSON.stringify(s)) : localStorage.removeItem(SK); } catch { /* private mode */ } };

async function refresh(): Promise<void> {
  if (!session) return;
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const s = r.ok ? sessionFromTokenResponse(await r.json()) : null;
  session = s; store(s);
}

async function api<T = any>(method: string, path: string, body?: unknown, prefer = ''): Promise<T> {
  if (session && needsRefresh(session)) await refresh();
  if (!session) throw new Error('signed-out');
  const res = await fetch(`${SUPA}/rest/v1/${path}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as any).message || `Request failed (${res.status})`);
  return res.status === 204 ? (undefined as T) : ((await res.json().catch(() => undefined)) as T);
}

async function token(): Promise<string> {
  if (session && needsRefresh(session)) await refresh();
  if (!session) throw new Error('signed-out');
  return session.access_token;
}

const toast = (m: string) => { const t = document.getElementById('toast'); if (!t) return; t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); };

function shell(inner: string, tab = ''): void {
  root.innerHTML = `<div class="adm"><div class="adm-top"><strong>Roopkala admin</strong><span><a href="/" class="btn sm ghost">View shop</a> <button class="btn sm ghost" id="out" type="button">Sign out</button></span></div>
  ${tab ? `<div class="tabs" style="margin:0 0 16px"><a class="tab ${tab === 'p' ? 'on' : ''}" href="#products">Products</a><a class="tab ${tab === 'e' ? 'on' : ''}" href="#enquiries">Enquiries</a><a class="tab ${tab === 'h' ? 'on' : ''}" href="#homepage">Homepage</a><a class="tab ${tab === 'l' ? 'on' : ''}" href="#stocklog">Stock log</a><a class="tab ${tab === 's' ? 'on' : ''}" href="#settings">Settings</a></div>` : ''}
  ${inner}<div class="cat" style="text-align:center;margin-top:24px">Roopkala v${VERSION}</div></div>`;
  document.getElementById('out')?.addEventListener('click', () => { store(null); session = null; signedOut(); });
}

const ctx: Ctx = { supa: SUPA, key: KEY, root, api, token, shell, toast };

function signedOut(msg = ''): void {
  root.innerHTML = `<div class="adm" style="max-width:420px;margin:60px auto;text-align:center"><h1 style="font-size:34px">Admin</h1><p style="margin:12px 0 20px">${esc(msg || 'Sign in with the Google account that owns the shop.')}</p><a class="btn" id="g" href="${esc(googleLoginUrl(SUPA, location.origin + '/admin'))}">Continue with Google</a></div>`;
}

/* ---------- products + stock ---------- */
interface V { id: string; size: string | null; color_name: string | null; stock: number }
interface P { id: string; code: string; name: string; is_active: boolean; price_inr: number; category: { name: string } | null; variants: V[] | null }

async function products(): Promise<void> {
  shell('<p class="empty">Loading…</p>', 'p');
  const rows = await api<P[]>('GET', 'products?select=id,code,name,is_active,price_inr,category:categories(name),variants:product_variants(id,size,color_name,stock)&order=code.asc&limit=500');
  const opt = (v: V) => [v.size, v.color_name].filter(Boolean).join(' · ') || 'Standard';
  const html = rows.map((p) => {
    const vs = p.variants ?? [];
    const total = vs.reduce((s, v) => s + v.stock, 0);
    return `<div class="adm-card" data-q="${esc((p.name + ' ' + p.code + ' ' + (p.category?.name ?? '')).toLowerCase())}"><div class="adm-h"><div><b>${esc(p.name)}</b> <span class="code">${esc(p.code)}</span><div class="cat">${esc(p.category?.name ?? '')} · ${inr(p.price_inr)}</div></div>
      <span class="pill ${p.is_active ? '' : 'low'}">${p.is_active ? 'Live' : 'Hidden'} · ${total} in stock</span></div>
      <div style="margin:6px 0"><a class="btn sm ghost" href="#product/${esc(p.id)}">Edit</a></div>
      ${vs.map((v) => `<div class="adm-row"><span>${esc(opt(v))}</span><span class="adm-stock" data-s="${v.id}">${v.stock}</span>
        <button type="button" class="btn sm ghost" data-adj="${esc(v.id)}" data-d="-1" ${v.stock < 1 ? 'disabled' : ''}>Sold 1</button>
        <button type="button" class="btn sm ghost" data-adj="${esc(v.id)}" data-d="1">+1</button></div>`).join('') || '<div class="adm-row cat">No variants yet</div>'}</div>`;
  }).join('');
  shell(`<div class="adm-row" style="border:0;margin:0 0 14px"><input id="psearch" type="search" placeholder="Search products by name, code or category"><a class="btn" href="#product/new">+ Add product</a></div>` + (html || '<p class="empty">No products yet. Click "Add product" to start.</p>'), 'p');
  root.querySelector<HTMLInputElement>('#psearch')?.addEventListener('input', (e) => {
    const q = (e.target as HTMLInputElement).value.toLowerCase().split(/\s+/).filter(Boolean);
    root.querySelectorAll<HTMLElement>('.adm-card[data-q]').forEach((c) => { c.hidden = !q.every((w) => (c.dataset.q ?? '').includes(w)); });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-adj]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      const n = await api<number>('POST', 'rpc/adjust_stock', { p_variant: b.dataset.adj, p_delta: Number(b.dataset.d), p_reason: Number(b.dataset.d) < 0 ? 'sold' : 'restock' });
      const el = root.querySelector(`[data-s="${b.dataset.adj}"]`); if (el) el.textContent = String(n);
      const minus = root.querySelector<HTMLButtonElement>(`[data-adj="${b.dataset.adj}"][data-d="-1"]`); if (minus) minus.disabled = n < 1;
      toast('Stock updated');
    } catch (e) { toast((e as Error).message); }
    if (Number(b.dataset.d) > 0) b.disabled = false;
  }));
}

/* ---------- enquiries ---------- */
interface E { id: string; type: 'enquiry' | 'notify'; option_text: string | null; name: string | null; contact: string; message: string | null; status: 'new' | 'done'; created_at: string; product: { name: string; code: string } | null }

async function enquiries(): Promise<void> {
  shell('<p class="empty">Loading…</p>', 'e');
  const rows = await api<E[]>('GET', 'enquiries?select=id,type,option_text,name,contact,message,status,created_at,product:products(name,code)&order=status.asc,created_at.desc&limit=200');
  const html = rows.map((e) => {
    const wa = e.type === 'enquiry' && digits(e.contact).length >= 8 ? `<a class="btn sm" target="_blank" rel="noopener noreferrer" href="https://wa.me/${digits(e.contact)}">WhatsApp</a>` : '';
    return `<div class="adm-card"><div class="adm-h"><div><b>${e.type === 'notify' ? 'Notify me' : 'Enquiry'}</b> · ${esc(e.product ? `${e.product.name} (${e.product.code})` : 'Removed product')}
      <div class="cat">${esc(new Date(e.created_at).toLocaleString('en-IN'))}${e.option_text ? ' · ' + esc(e.option_text) : ''}</div></div>
      <span class="pill ${e.status === 'new' ? 'low' : ''}">${e.status === 'new' ? 'New' : 'Done'}</span></div>
      <div style="margin:8px 0">${esc(e.name ?? '')} ${esc(e.contact)}</div>${e.message ? `<div class="desc">${esc(e.message)}</div>` : ''}
      <div class="adm-row">${wa}<button type="button" class="btn sm ghost" data-st="${esc(e.id)}" data-to="${e.status === 'new' ? 'done' : 'new'}">${e.status === 'new' ? 'Mark done' : 'Reopen'}</button></div></div>`;
  }).join('');
  shell(html || '<p class="empty">No enquiries yet.</p>', 'e');
  root.querySelectorAll<HTMLButtonElement>('[data-st]').forEach((b) => b.addEventListener('click', async () => {
    try { await api('PATCH', `enquiries?id=eq.${encodeURIComponent(b.dataset.st ?? '')}`, { status: b.dataset.to }); await enquiries(); }
    catch (e) { toast((e as Error).message); }
  }));
}

/* ---------- stock history ---------- */
async function stockLog(): Promise<void> {
  shell('<p class="empty">Loading…</p>', 'l');
  const rows = await api<{ id: string; label: string | null; delta: number; reason: string; created_at: string }[]>(
    'GET', 'inventory_movements?select=id,label,delta,reason,created_at&order=created_at.desc&limit=200');
  const html = rows.map((r) => `<div class="adm-row"><span><b>${esc(r.label ?? 'Removed item')}</b><div class="cat">${esc(new Date(r.created_at).toLocaleString('en-IN'))} · ${esc(r.reason)}</div></span>
    <span class="adm-stock" style="color:${r.delta < 0 ? '#b3261e' : '#1b7a3a'}">${r.delta > 0 ? '+' : ''}${r.delta}</span></div>`).join('');
  shell(`<div class="adm-card"><div class="lbl" style="margin-top:0">Latest 200 stock changes</div>${html || '<p class="empty">Nothing recorded yet.</p>'}</div>`, 'l');
}

/* ---------- start ---------- */
async function route(): Promise<void> {
  try {
    const h = location.hash;
    if (h === '#enquiries') await enquiries();
    else if (h === '#homepage') await homepage(ctx);
    else if (h === '#settings') await settingsScreen(ctx);
    else if (h === '#stocklog') await stockLog();
    else if (h === '#product/new') await editProduct(ctx, null);
    else if (/^#product\/[0-9a-f-]{36}$/i.test(h)) await editProduct(ctx, h.slice(9));
    else await products();
  }
  catch (e) { (e as Error).message === 'signed-out' ? signedOut('Your session ended. Please sign in again.') : shell(`<p class="empty">${esc((e as Error).message)}</p>`, location.hash === '#enquiries' ? 'e' : location.hash === '#homepage' ? 'h' : location.hash === '#settings' ? 's' : location.hash === '#stocklog' ? 'l' : 'p'); }
}

async function start(): Promise<void> {
  if (!SUPA || !KEY) return signedOut('The shop is not connected to Supabase yet.');
  const fromUrl = parseAuthHash(location.hash);
  if (fromUrl) { session = fromUrl; store(fromUrl); history.replaceState(null, '', location.pathname); }
  else session = load();
  if (!session) return signedOut();
  try {
    const me = await api<{ role: string }[]>('GET', `profiles?select=role&id=eq.${encodeURIComponent(session.user_id)}`);
    if (me[0]?.role !== 'admin') { store(null); session = null; return signedOut('This Google account is not an admin. Ask the shop owner to grant access.'); }
  } catch { store(null); session = null; return signedOut('Could not verify your account. Please sign in again.'); }
  addEventListener('hashchange', route);
  await route();
}
void start();
