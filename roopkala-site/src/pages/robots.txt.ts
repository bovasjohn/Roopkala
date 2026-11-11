import type { APIRoute } from 'astro';
import { SITE_URL } from '../lib/config.ts';

// Everything public is open to search engines AND AI crawlers on purpose.
// (Cloudflare's own "block AI bots" setting can override this file, so check it in the dashboard.)
export const GET: APIRoute = ({ request }) => {
  const origin = SITE_URL || new URL(request.url).origin;
  const body = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /account', 'Disallow: /api/', 'Disallow: /cart', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
