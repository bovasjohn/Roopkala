// Cart page: renders the guest cart, re-checks live prices and stock, and builds the WhatsApp order.
import { esc, inr, waLink, waMessage, type OrderLine } from '../lib/format.ts';
import { loadCart, saveCart, type CartLine } from './cart-store.ts';
import { toast } from './toast.ts';
import { track } from './analytics.ts';

interface Live { id: string; stock: number; price: number; active: boolean }

async function refresh(cart: CartLine[]): Promise<Map<string, Live>> {
  const map = new Map<string, Live>();
  if (!cart.length) return map;
  try {
    const res = await fetch('/api/variants?ids=' + encodeURIComponent(cart.map((l) => l.vid).join(',')));
    if (res.ok) for (const r of (await res.json()) as Live[]) map.set(r.id, r);
  } catch { /* offline: show what we have */ }
  return map;
}

async function main(): Promise<void> {
  const rootEl = document.getElementById('cart-root');
  if (!rootEl) return;
  const wa = rootEl.dataset.wa || '';
  let cart = loadCart();
  let live = await refresh(cart);

  // Bring saved lines up to date: current price, never more than is in stock
  const sync = () => {
    cart = cart.filter((l) => !live.size || live.has(l.vid));
    for (const l of cart) {
      const r = live.get(l.vid);
      if (!r) continue;
      l.price = r.price;
      if (r.stock > 0) l.qty = Math.min(l.qty, r.stock);
    }
    saveCart(cart);
  };
  sync();

  const unavailable = (l: CartLine) => { const r = live.get(l.vid); return !!r && (r.stock <= 0 || !r.active); };

  function render(): void {
    if (!rootEl) return;
    if (!cart.length) {
      rootEl.innerHTML = '<div class="empty"><h2 style="font-size:32px">Your bag is empty</h2><p style="margin:10px 0 20px">Find something you love.</p><a class="btn" href="/shop">Continue shopping</a></div>';
      return;
    }
    const buyable = cart.filter((l) => !unavailable(l));
    const total = buyable.reduce((s, l) => s + l.price * l.qty, 0);
    rootEl.innerHTML = `<div class="sec"><h2>Your bag</h2></div><div class="lines">${cart.map((l, n) => `
      <div class="ln"><img src="${esc(l.img)}" alt=""><div class="i"><h3><a href="${esc(l.url)}">${esc(l.name)}</a></h3>
        <div class="code">${esc(l.code)} · ${esc(l.opt || 'Standard')}</div>
        ${unavailable(l) ? '<div style="margin-top:8px"><span class="pill out">No longer available</span></div>'
          : `<div class="qty" style="margin-top:8px"><button type="button" data-a="minus" data-n="${n}" aria-label="Less">−</button><span>${l.qty}</span><button type="button" data-a="plus" data-n="${n}" aria-label="More">+</button></div>`}
      </div><div style="text-align:right"><div class="price">${inr(l.price * l.qty)}</div><button type="button" class="code" data-a="rm" data-n="${n}" style="margin-top:8px;text-decoration:underline">Remove</button></div></div>`).join('')}</div>
      <div class="tot"><span class="serif">Total</span><b>${inr(total)}</b></div>
      <div class="actions"><button type="button" class="btn wa" data-a="wa" ${buyable.length ? '' : 'disabled'}>Order on WhatsApp</button></div>
      <p class="note">No account needed. Ordering on WhatsApp doesn't hold or reduce stock — we confirm availability with you in chat.</p>
      <a class="back" href="/shop">← Continue shopping</a>`;
  }

  rootEl.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-a]');
    if (!t) return;
    const n = Number(t.dataset.n);
    const l = cart[n];
    if (t.dataset.a === 'wa') {
      const lines: OrderLine[] = cart.filter((x) => !unavailable(x)).map((x) => ({ name: x.name, code: x.code, opt: x.opt, qty: x.qty, price: x.price }));
      if (!lines.length) return;
      track('whatsapp_order_click', { items: lines.length });
      window.open(waLink(wa, waMessage(lines)), '_blank', 'noopener');
      return;
    }
    if (!l) return;
    if (t.dataset.a === 'rm') cart.splice(n, 1);
    if (t.dataset.a === 'minus') l.qty = Math.max(1, l.qty - 1);
    if (t.dataset.a === 'plus') {
      const max = live.get(l.vid)?.stock ?? 99;
      if (l.qty >= max) toast(`Only ${max} available`); else l.qty += 1;
    }
    saveCart(cart);
    render();
  });

  render();
}

void main();
