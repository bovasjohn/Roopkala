// Shop search and sorting. Plain functions so they can be tested without a browser or database.
import type { Product } from './data.ts';

export type Sort = 'new' | 'price-asc' | 'price-desc' | 'name';
export const SORTS: { id: Sort; label: string }[] = [
  { id: 'new', label: 'Newest' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'name', label: 'Name A–Z' },
];

export function parseShopQuery(params: URLSearchParams): { q: string; sort: Sort } {
  const q = (params.get('q') ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const s = params.get('sort') ?? '';
  return { q, sort: (SORTS.some((x) => x.id === s) ? s : 'new') as Sort };
}

const hay = (p: Product): string => `${p.name} ${p.code} ${p.categoryName} ${p.description}`.toLowerCase();

/** Every word typed must appear somewhere in the product's name, code, category or description. */
export function filterProducts(products: Product[], q: string, sort: Sort): Product[] {
  const words = q.toLowerCase().split(' ').filter(Boolean);
  const out = words.length ? products.filter((p) => { const h = hay(p); return words.every((w) => h.includes(w)); }) : [...products];
  if (sort === 'price-asc') out.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') out.sort((a, b) => b.price - a.price);
  else if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return out;
}
