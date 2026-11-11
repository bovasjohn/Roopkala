import { parseSettings, type Settings } from '../lib/data.ts';
import type { Ctx } from './admin-product.ts';

export async function loadSettings(ctx: Ctx): Promise<Settings> {
  return parseSettings(await ctx.api<{ key: string; value: any }[]>('GET', 'site_settings?select=key,value'));
}

/** Creates or replaces one settings row (public read, admin write by database rule). */
export async function saveSetting(ctx: Ctx, key: string, value: unknown): Promise<void> {
  await ctx.api('POST', 'site_settings?on_conflict=key', { key, value, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates');
}

export const field = (label: string, inner: string, hint = '') =>
  `<label class="adm-f"><span>${label}</span>${inner}${hint ? `<small>${hint}</small>` : ''}</label>`;

export const showErrors = (box: HTMLElement, errs: string[], esc: (s: unknown) => string): void => {
  box.hidden = errs.length === 0; box.innerHTML = errs.map((m) => `<div>${esc(m)}</div>`).join('');
};
