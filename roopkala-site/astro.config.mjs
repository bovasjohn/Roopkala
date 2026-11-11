import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Pages are rendered on the server at request time so prices and stock are
// always current and search engines receive finished HTML.
export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  site: process.env.PUBLIC_SITE_URL || undefined,
});
