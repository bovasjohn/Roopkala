// The guest cart lives in this browser (localStorage). Signed-in carts sync to the database in a later stage.
export interface CartLine {
  vid: string; pid: string; url: string; code: string; name: string; price: number; opt: string; img: string; qty: number;
}
const KEY = 'rk_cart2';

const isLine = (l: any): l is CartLine =>
  l && typeof l.vid === 'string' && typeof l.name === 'string' && typeof l.code === 'string' &&
  Number.isFinite(l.price) && Number.isInteger(l.qty) && l.qty > 0 && l.qty < 100 &&
  typeof l.url === 'string' && l.url.startsWith('/');

export function loadCart(): CartLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter(isLine) : [];
  } catch { return []; }
}

export function saveCart(c: CartLine[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode or storage full */ }
  updateBadge();
}

export function updateBadge(): void {
  const n = loadCart().reduce((s, l) => s + l.qty, 0);
  const b = document.getElementById('cb');
  if (!b) return;
  b.textContent = String(n);
  b.style.display = n ? 'grid' : 'none';
}

/** Adds a line, merging with an existing one. Returns false when it would exceed available stock. */
export function addLine(line: CartLine, stock: number): boolean {
  const cart = loadCart();
  const ex = cart.find((l) => l.vid === line.vid);
  const q = (ex ? ex.qty : 0) + line.qty;
  if (q > stock) return false;
  if (ex) ex.qty = q; else cart.push(line);
  saveCart(cart);
  return true;
}
