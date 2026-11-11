// Live price and stock for the variants in a visitor's cart. Reads only public data (RLS applies).
import type { APIRoute } from 'astro';
import { configured } from '../../lib/config.ts';
import { getDb } from '../../lib/data.ts';
import { uuidOk } from '../../lib/format.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const GET: APIRoute = async ({ url }) => {
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(uuidOk).slice(0, 50);
  if (!ids.length || !configured) return json([]);
  try {
    const rows = await getDb().get<{ id: string; stock: number; product: { price_inr: number; is_active: boolean } | null }[]>(
      'product_variants',
      { select: 'id,stock,product:products(price_inr,is_active)', id: `in.(${ids.join(',')})` },
    );
    // Variants of hidden products are invisible to the public, so they simply do not appear here.
    return json(rows.filter((r) => r.product).map((r) => ({ id: r.id, stock: r.stock, price: r.product!.price_inr, active: r.product!.is_active })));
  } catch (err) {
    console.error('variants lookup failed', err);
    return json({ error: 'unavailable' }, 503);
  }
};
