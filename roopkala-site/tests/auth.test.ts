import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jwtSub, parseAuthHash, needsRefresh, googleLoginUrl, sessionFromTokenResponse } from '../src/lib/auth.ts';

const jwt = (p: object) => `h.${Buffer.from(JSON.stringify(p)).toString('base64url')}.s`;
const T = jwt({ sub: 'user-1' });

test('jwtSub', () => { assert.equal(jwtSub(T), 'user-1'); assert.equal(jwtSub('junk'), ''); assert.equal(jwtSub(jwt({})), ''); });
test('parseAuthHash', () => {
  const s = parseAuthHash(`#access_token=${T}&refresh_token=r&expires_at=2000&token_type=bearer`, 1000)!;
  assert.deepEqual(s, { access_token: T, refresh_token: 'r', expires_at: 2000, user_id: 'user-1' });
  assert.equal(parseAuthHash(`#access_token=${T}&expires_in=100`, 1000), null);
  assert.equal(parseAuthHash('#access_token=bad&refresh_token=r'), null);
  assert.equal(parseAuthHash(`#access_token=${T}&refresh_token=r&expires_in=100`, 1000)!.expires_at, 1100);
});
test('needsRefresh', () => { const s = { access_token: T, refresh_token: 'r', expires_at: 1000, user_id: 'u' }; assert.ok(needsRefresh(s, 950)); assert.ok(!needsRefresh(s, 900)); });
test('googleLoginUrl encodes redirect', () => assert.equal(googleLoginUrl('https://x.supabase.co', 'https://a.in/admin'), 'https://x.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fa.in%2Fadmin'));
test('sessionFromTokenResponse', () => { assert.equal(sessionFromTokenResponse({}), null); assert.equal(sessionFromTokenResponse({ access_token: T, refresh_token: 'r', expires_at: 5 })!.user_id, 'user-1'); });
