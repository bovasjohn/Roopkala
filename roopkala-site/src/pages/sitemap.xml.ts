import type { APIRoute } from 'astro';
import { SITE_URL, configured } from '../lib/config.ts';
import { getCategories, getDb, getSettings } from '../lib/data.ts';
import { esc } from '../lib/format.ts';

export const GET: APIRoute = async ({ request }) => {
  const origin = SITE_URL || new URL(request.url).origin;
  const urls: { loc: string; lastmod?: string }[] = [{ loc: '/' }, { loc: '/shop' }];
  if (configured) {
    try {
      const db = getDb();
      const [settings, cats, prods] = await Promise.all([
        getSettings(db),
        getCategories(db),
        db.get<{ slug: string; updated_at: string; category: { slug: string } | null }[]>('products', {
          select: 'slug,updated_at,category:categories(slug)', order: 'updated_at.desc', limit: '1000',
        }),
      ]);
      if (settings.about.enabled) urls.push({ loc: '/about' });
      cats.forEach((c) => urls.push({ loc: `/${c.slug}` }));
      prods.forEach((p) => urls.push({ loc: `/${p.category?.slug ?? 'shop'}/${p.slug}`, lastmod: p.updated_at?.slice(0, 10) }));
    } catch (err) {
      console.error('sitemap load failed', err);
    }
  }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${esc(origin + u.loc)}</loc>${u.lastmod ? `<lastmod>${esc(u.lastmod)}</lastmod>` : ''}</url>`).join('\n') +
    '\n</urlset>\n';
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
  });
};
