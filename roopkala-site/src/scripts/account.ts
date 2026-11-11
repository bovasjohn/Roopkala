// Optional customer sign-in with Google. Ordering never needs it. Nothing is stored except the sign-in session.
import { displayName, googleLoginUrl, needsRefresh, parseAuthHash, safeAvatar, sessionFromTokenResponse, type Session } from '../lib/auth.ts';
import { esc } from '../lib/format.ts';

const root = document.getElementById('account-root') as HTMLElement;
const SUPA = root.dataset.url ?? '';
const KEY = root.dataset.key ?? '';
const SK = 'rk_session';

const load = (): Session | null => { try { return JSON.parse(localStorage.getItem(SK) || 'null'); } catch { return null; } };
const store = (s: Session | null) => { try { s ? localStorage.setItem(SK, JSON.stringify(s)) : localStorage.removeItem(SK); } catch { /* private mode */ } };

const G = `<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>`;

function signedOut(note = ''): void {
  root.innerHTML = `<div class="acct"><h1>Welcome</h1>
    <p>Sign in with Google to keep your details handy. You can also order without signing in.</p>
    ${note ? `<p class="acct-note">${esc(note)}</p>` : ''}
    <a class="btn acct-g" id="g" href="${esc(googleLoginUrl(SUPA, location.origin + '/account'))}">${G}<span>Continue with Google</span></a>
    <p class="acct-small">We only use your name and email to say hello. We never post anything.</p></div>`;
}

function signedIn(user: any): void {
  const pic = safeAvatar(user);
  root.innerHTML = `<div class="acct">${pic ? `<img class="acct-pic" src="${esc(pic)}" alt="" referrerpolicy="no-referrer" width="72" height="72">` : ''}
    <h1>Hello, ${esc(displayName(user))}</h1><p>${esc(user.email ?? '')}</p>
    <a class="btn" href="/shop">Continue shopping</a>
    <button type="button" class="btn ghost" id="out" style="margin-top:10px">Sign out</button></div>`;
  document.getElementById('out')!.addEventListener('click', async () => {
    const s = load(); store(null);
    if (s) fetch(`${SUPA}/auth/v1/logout`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${s.access_token}` } }).catch(() => {});
    signedOut();
  });
}

async function refresh(s: Session): Promise<Session | null> {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  return r.ok ? sessionFromTokenResponse(await r.json()) : null;
}

async function start(): Promise<void> {
  if (!SUPA || !KEY) return signedOut('Sign-in is not available right now.');
  const err = new URLSearchParams(location.hash.replace(/^#/, '')).get('error_description') || new URLSearchParams(location.search).get('error_description');
  const fromUrl = parseAuthHash(location.hash);
  let s = fromUrl ?? load();
  if (fromUrl) { store(fromUrl); history.replaceState(null, '', location.pathname); }
  if (!s) return signedOut(err ? 'Sign-in did not complete. Please try again.' : '');
  try {
    if (needsRefresh(s)) { s = await refresh(s); store(s); if (!s) return signedOut(); }
    const res = await fetch(`${SUPA}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${s.access_token}` } });
    if (!res.ok) { store(null); return signedOut('Your session ended. Please sign in again.'); }
    signedIn(await res.json());
  } catch { signedOut('Could not reach the sign-in service. Please try again.'); }
}
void start();
