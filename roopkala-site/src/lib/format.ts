// Small pure helpers shared by the server pages and the browser scripts.

const ENT: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for safe use inside HTML. */
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ENT[c] as string);

/** Rupees with Indian digit grouping, e.g. ₹1,25,000. */
export const inr = (n: number): string => '₹' + Number(n || 0).toLocaleString('en-IN');

export const digits = (s: unknown): string => String(s ?? '').replace(/\D/g, '');
export const isHex = (s: unknown): s is string => typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s);
export const slugOk = (s: unknown): s is string => typeof s === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
export const uuidOk = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Only same-site paths or https links; anything else (javascript:, data:, //evil) falls back. */
export function safeHref(u: unknown, fallback = '/shop'): string {
  const s = String(u ?? '').trim();
  return /^(\/(?!\/)|https:\/\/)/.test(s) ? s : fallback;
}

/**
 * Tiny Markdown subset for product and About text: "# heading", "- bullet", blank line = new paragraph.
 * Every line is escaped FIRST, so raw HTML typed or pasted by an admin can never reach customers.
 */
export function md(text: string): string {
  let out = '';
  let list = false;
  for (const raw of String(text ?? '').trim().split('\n')) {
    const l = esc(raw.trim());
    if (l.startsWith('- ')) {
      if (!list) { out += '<ul>'; list = true; }
      out += '<li>' + l.slice(2) + '</li>';
      continue;
    }
    if (list) { out += '</ul>'; list = false; }
    if (!l) continue;
    out += l.startsWith('# ') ? '<h3>' + l.slice(2) + '</h3>' : '<p>' + l + '</p>';
  }
  if (list) out += '</ul>';
  return out;
}

/** Plain text from the Markdown subset, for meta descriptions. */
export function stripMd(text: string, max = 155): string {
  return String(text ?? '').replace(/^#+\s*/gm, '').replace(/^-\s+/gm, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const optionText = (size?: string | null, colour?: string | null): string =>
  [size ? 'Size: ' + size : '', colour ? 'Colour: ' + colour : ''].filter(Boolean).join(' | ');

export interface OrderLine { name: string; code: string; opt: string; qty: number; price: number }

export function waMessage(lines: OrderLine[]): string {
  let total = 0;
  const body = lines.map((l, n) => {
    const sub = l.price * l.qty;
    total += sub;
    return `${n + 1}. ${l.name} (${l.code})\n   ${l.opt || 'Standard'}\n   Qty: ${l.qty} × ${inr(l.price)} = ${inr(sub)}`;
  });
  return `Hello Roopkala, I'd like to order:\n\n${body.join('\n\n')}\n\nTotal: ${inr(total)}`;
}

export const waLink = (number: string, text: string): string =>
  `https://wa.me/${digits(number)}?text=${encodeURIComponent(text)}`;
