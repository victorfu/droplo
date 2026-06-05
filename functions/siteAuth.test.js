import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSessionCookie,
  createSessionToken,
  getRequestPassword,
  hashPassword,
  renderPasswordPage,
  verifyPassword,
  verifySessionToken,
} from './siteAuth.js';

test('hashPassword stores an encoded scrypt hash and verifyPassword checks it', async () => {
  const hash = await hashPassword('abcd');

  assert.match(hash, /^scrypt\$/);
  assert.equal(await verifyPassword('abcd', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
});

test('session tokens are tied to one site and password hash', async () => {
  const hash = await hashPassword('abcd');
  const otherHash = await hashPassword('wxyz');
  const token = createSessionToken('site123', hash);

  assert.equal(verifySessionToken(token, 'site123', hash), true);
  assert.equal(verifySessionToken(token, 'other-site', hash), false);
  assert.equal(verifySessionToken(token, 'site123', otherHash), false);
  assert.equal(verifySessionToken('bad-token', 'site123', hash), false);
});

test('buildSessionCookie creates a session-only HttpOnly cookie scoped to the site path', async () => {
  const hash = await hashPassword('abcd');
  const token = createSessionToken('site123', hash);
  const cookie = buildSessionCookie({ siteId: 'site123', token, secure: true });

  assert.match(cookie, /^droplo_site_auth=/);
  assert.match(cookie, /Path=\/s\/site123/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.doesNotMatch(cookie, /Max-Age=/);
  assert.doesNotMatch(cookie, /Expires=/);
});

test('buildSessionCookie rejects invalid site path siteIds before building a cookie', () => {
  let cookie = '';

  assert.throws(
    () => {
      cookie = buildSessionCookie({
        siteId: 'site123; Max-Age=3600',
        token: 'token',
        secure: true,
      });
    },
    /Invalid siteId/
  );
  assert.doesNotMatch(cookie, /Max-Age/);
});

test('getRequestPassword reads form-urlencoded passwords from rawBody', () => {
  const req = {
    rawBody: Buffer.from('password=abcd&ignored=value'),
  };

  assert.equal(getRequestPassword(req), 'abcd');
});

test('renderPasswordPage escapes dynamic values', () => {
  const html = renderPasswordPage({
    actionPath: '/s/site123/<script>',
    error: 'Wrong <password>',
  });

  assert.match(html, /Wrong &lt;password&gt;/);
  assert.match(html, /\/s\/site123\/&lt;script&gt;/);
  assert.doesNotMatch(html, /Wrong <password>/);
});
