import { BRAND } from './config.ts';
import type { Product } from './data.ts';
import { stripMd } from './format.ts';

/** Serialise JSON-LD so a stray "</script>" in product text can never break out of the tag. */
export const ldString = (o: unknown): string => JSON.stringify(o).replace(/</g, '\\u003c');

export function productLd(p: Product, origin: string) {
  const images = p.gallery.slice(0, 5).map((i) => i.full);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.code,
    description: stripMd(p.description, 300) || undefined,
    image: images.length ? images : undefined,
    brand: { '@type': 'Brand', name: BRAND },
    category: p.categoryName || undefined,
    offers: {
      '@type': 'Offer',
      url: origin + p.url,
      priceCurrency: 'INR',
      price: p.price,
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

export const orgLd = (origin: string) => ({ '@context': 'https://schema.org', '@type': 'Organization', name: BRAND, url: origin });
export const siteLd = (origin: string) => ({ '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND, url: origin });

export function breadcrumbLd(origin: string, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: origin + it.path })),
  };
}
