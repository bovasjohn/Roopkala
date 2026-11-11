// Product page: option picker, stock-aware buttons, WhatsApp order, sold-out enquiry, sharing.
import { esc, inr, isHex, optionText, waLink, waMessage } from '../lib/format.ts';
import { track } from './analytics.ts';
import { addLine } from './cart-store.ts';
import { initCarousel, type Carousel } from './carousel.ts';
import { initLightbox } from './lightbox.ts';
import { toast } from './toast.ts';

interface PData {
  id: string; url: string; cat: string; code: string; name: string; price: number; thumb: string;
  sizeOn: boolean; colorOn: boolean; sizes: string[];
  colours: { name: string; hex: string | null; img: number }[];
  variants: { id: string; size: string | null; color_name: string | null; stock: number }[];
  low: number; wa: string; supaUrl: string; supaKey: string;
}

function init(): void {
  const el = document.getElementById('pdata');
  const buy = document.getElementById('buy');
  if (!el || !buy) return;
  const d: PData = JSON.parse(el.textContent || '{}');
  const gallery: Carousel | null = initCarousel(document, '.gal-track', '.gal-dots', false, '.thumbs img');
  initLightbox('.gal-track', '.gal-zoom');

  const first = d.variants.find((v) => v.stock > 0) ?? d.variants[0];
  let si = d.sizeOn ? Math.max(0, d.sizes.indexOf(first?.size ?? '')) : -1;
  let ci = d.colorOn ? Math.max(0, d.colours.findIndex((c) => c.name === first?.color_name)) : -1;
  let qty = 1;
  let enq = false;

  const size = () => (si >= 0 ? d.sizes[si] ?? null : null);
  const colour = () => (ci >= 0 ? d.colours[ci]?.name ?? null : null);
  const variant = () => d.variants.find((v) => v.size === size() && v.color_name === colour());
  const totalStock = () => d.variants.reduce((s, v) => s + v.stock, 0);

  function render(): void {
    const v = variant();
    const st = v?.stock ?? 0;
    qty = Math.max(1, Math.min(qty, st || 1));
    let h = '';
    if (d.colorOn) {
      h += `<div class="lbl">Colour${colour() ? ' · ' + esc(colour()) : ''}</div><div class="sw">` +
        d.colours.map((c, i) => {
          const out = !d.variants.some((x) => x.color_name === c.name && x.stock > 0 && (size() === null || x.size === size()));
          return `<button type="button" class="dot ${i === ci ? 'on' : ''} ${out ? 'out' : ''}" style="background:${isHex(c.hex) ? c.hex : '#cccccc'}" data-act="colour" data-i="${i}" aria-label="${esc(c.name)}"></button>`;
        }).join('') + '</div>';
    }
    if (d.sizeOn) {
      h += '<div class="lbl">Size</div><div class="sw">' +
        d.sizes.map((s, i) => {
          const out = !((d.variants.find((x) => x.size === s && x.color_name === colour())?.stock ?? 0) > 0);
          return `<button type="button" class="chip ${i === si ? 'on' : ''} ${out ? 'out' : ''}" data-act="size" data-i="${i}">${esc(s)}</button>`;
        }).join('') + '</div>';
    }
    h += '<div class="lbl">Availability</div><div>' +
      (st === 0 ? '<span class="pill out">Sold out</span>' : st <= d.low ? `<span class="pill low">Only ${st} left</span>` : '<span class="pill ok">In stock</span>') + '</div>';
    if (st > 0) {
      h += `<div class="lbl">Quantity</div><div class="qty"><button type="button" data-act="minus" aria-label="Less">−</button><span>${qty}</span><button type="button" data-act="plus" aria-label="More">+</button></div>
      <div class="actions"><button type="button" class="btn" data-act="add">Add to bag</button><button type="button" class="btn wa" data-act="wa">Order on WhatsApp</button></div>`;
    } else {
      h += `<div class="soldbox"><b>SOLD OUT</b><div class="note" style="margin-top:6px">${totalStock() > 0 ? 'This option is sold out — other options are available.' : 'This piece is currently unavailable.'} Ask us about restocking or something similar.</div>
      <div class="actions" style="margin-top:12px"><button type="button" class="btn" data-act="enq-toggle">Enquire about this product</button></div>
      ${enq ? `<div style="margin-top:14px"><div class="fld">Your name<input id="eq_n" type="text" maxlength="100" autocomplete="name"></div><div class="fld">Phone / WhatsApp<input id="eq_p" type="tel" maxlength="120" autocomplete="tel"></div><div class="fld">Message<textarea id="eq_m" rows="2" maxlength="1000">Is this available or can it be restocked?</textarea></div><input id="eq_h" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px"><button type="button" class="btn wa" data-act="enq-send">Send on WhatsApp</button></div>` : ''}
      <div class="fld" style="margin-top:16px">Or get notified when it's back<div class="row2"><input id="nt" type="email" maxlength="120" placeholder="you@email.com" style="flex:1;margin:6px 0 0"><button type="button" class="btn sm dark" style="margin-top:6px" data-act="notify">Notify me</button></div></div></div>`;
    }
    buy!.innerHTML = h;
  }

  /** Saves an enquiry for the shop owner. Failure never blocks the visitor: WhatsApp still opens. */
  async function saveEnquiry(row: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch(`${d.supaUrl}/rest/v1/enquiries`, {
        method: 'POST',
        headers: { apikey: d.supaKey, Authorization: `Bearer ${d.supaKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(row),
      });
      return res.ok;
    } catch { return false; }
  }
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
  const opt = () => optionText(size(), colour());

  buy.addEventListener('click', async (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t) return;
    const i = Number(t.dataset.i);
    switch (t.dataset.act) {
      case 'colour': ci = i; qty = 1; render(); gallery?.go(d.colours[i]?.img ?? 0); break;
      case 'size': si = i; qty = 1; render(); break;
      case 'minus': qty = Math.max(1, qty - 1); render(); break;
      case 'plus': qty = Math.min(variant()?.stock ?? 1, qty + 1); render(); break;
      case 'add': {
        const v = variant();
        if (!v) return;
        const ok = addLine({ vid: v.id, pid: d.id, url: d.url, code: d.code, name: d.name, price: d.price, opt: opt(), img: d.thumb, qty }, v.stock);
        toast(ok ? 'Added to your bag' : `Only ${v.stock} available`);
        if (ok) track('add_to_cart', { currency: 'INR', value: d.price * qty, items: [{ item_id: d.code, item_name: d.name, quantity: qty }] });
        break;
      }
      case 'wa':
        track('whatsapp_order_click', { item_id: d.code });
        window.open(waLink(d.wa, waMessage([{ name: d.name, code: d.code, opt: opt(), qty, price: d.price }])), '_blank', 'noopener');
        break;
      case 'enq-toggle': enq = !enq; render(); break;
      case 'enq-send': {
        const name = val('eq_n'), phone = val('eq_p'), msg = val('eq_m');
        if (val('eq_h')) return; // honeypot: a person never fills this field
        if (!name || phone.length < 3) { toast('Please add your name and phone'); return; }
        const saved = await saveEnquiry({ type: 'enquiry', product_id: d.id, option_text: opt().slice(0, 200), name, contact: phone, message: msg });
        track('enquiry', { item_id: d.code });
        const text = `Hello Roopkala, I'd like to enquire about:\n${d.name} (${d.code})\n${opt()}\n\nName: ${name}\nPhone: ${phone}\nMessage: ${msg}`;
        window.open(waLink(d.wa, text), '_blank', 'noopener');
        enq = false; render();
        toast(saved ? 'Enquiry saved' : 'Opening WhatsApp');
        break;
      }
      case 'notify': {
        const email = val('nt');
        if (!/^\S+@\S+\.\S+$/.test(email)) { toast('Enter a valid email'); return; }
        const saved = await saveEnquiry({ type: 'notify', product_id: d.id, option_text: opt().slice(0, 200), contact: email, message: 'Notify me when back in stock' });
        toast(saved ? "We'll let you know" : 'Could not save — please try again');
        break;
      }
    }
  });

  // sharing
  document.querySelectorAll<HTMLElement>('[data-share]').forEach((b) => b.addEventListener('click', () => {
    const url = location.origin + d.url;
    const u = encodeURIComponent(url), t = encodeURIComponent(d.name + ' — Roopkala');
    const w = b.dataset.share;
    if (w === 'wa') window.open('https://wa.me/?text=' + t + '%20' + u, '_blank', 'noopener');
    else if (w === 'fb') window.open('https://www.facebook.com/sharer/sharer.php?u=' + u, '_blank', 'noopener');
    else if (w === 'pin') window.open('https://pinterest.com/pin/create/button/?url=' + u + '&description=' + t, '_blank', 'noopener');
    else if (w === 'ig' && navigator.share) navigator.share({ title: d.name, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).then(() => toast(w === 'ig' ? 'Link copied — paste it in Instagram' : 'Link copied'));
  }));

  render();
  track('view_item', { currency: 'INR', value: d.price, items: [{ item_id: d.code, item_name: d.name }] });
}

init();
void inr; // (inr is exported for symmetry with the server; not needed here)
