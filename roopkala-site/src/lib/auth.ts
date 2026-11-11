// Pure helpers for Supabase sign-in (Google). No network here, so they can be tested offline.
export interface Session { access_token: string; refresh_token: string; expires_at: number; user_id: string }

function b64urlJson(part: string): any {
  const s = part.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

/** Reads the user id ("sub") out of a Supabase JWT. Only for display/queries; the server never trusts this. */
export function jwtSub(token: string): string {
  try { const sub = b64urlJson(token.split('.')[1] ?? '').sub; return typeof sub === 'string' ? sub : ''; } catch { return ''; }
}

/** Session from the URL fragment Supabase redirects back with (#access_token=...&refresh_token=...). */
export function parseAuthHash(hash: string, nowSec = Math.floor(Date.now() / 1000)): Session | null {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const access = p.get('access_token'), refresh = p.get('refresh_token');
  if (!access || !refresh) return null;
  const user_id = jwtSub(access);
  if (!user_id) return null;
  const exp = Number(p.get('expires_at')) || nowSec + (Number(p.get('expires_in')) || 3600);
  return { access_token: access, refresh_token: refresh, expires_at: exp, user_id };
}

export const needsRefresh = (s: Session, nowSec = Math.floor(Date.now() / 1000)): boolean => s.expires_at - nowSec < 60;

export const googleLoginUrl = (supaUrl: string, redirectTo: string): string =>
  `${supaUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;

export function sessionFromTokenResponse(r: any): Session | null {
  if (!r || typeof r.access_token !== 'string' || typeof r.refresh_token !== 'string') return null;
  const user_id = jwtSub(r.access_token);
  if (!user_id) return null;
  return { access_token: r.access_token, refresh_token: r.refresh_token, expires_at: Number(r.expires_at) || Math.floor(Date.now() / 1000) + (Number(r.expires_in) || 3600), user_id };
}

/** A friendly name for the signed-in customer: Google name, else the part of the email before the @. */
export function displayName(user: any): string {
  const m = user?.user_metadata ?? {};
  const name = [m.full_name, m.name].find((v) => typeof v === 'string' && v.trim());
  if (name) return String(name).trim().slice(0, 60);
  const email = typeof user?.email === 'string' ? user.email : '';
  return email.split('@')[0]?.slice(0, 60) || 'there';
}

/** Only an https picture URL is ever shown. */
export const safeAvatar = (user: any): string => {
  const u = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;
  return typeof u === 'string' && /^https:\/\//.test(u) ? u : '';
};
