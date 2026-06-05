import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSessionCookie,
  createSessionToken,
  getRequestPassword,
  getSessionToken,
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

test('verifyPassword fails closed for malformed encoded hashes', async () => {
  const validHash = await hashPassword('abcd');
  const [, n, r, p, salt, hash] = validHash.split('$');
  const malformedHashes = [
    `${validHash}$extra`,
    `scrypt$foo$${r}$${p}$${salt}$${hash}`,
    `scrypt$${n}$bar$${p}$${salt}$${hash}`,
    `scrypt$${n}$${r}$baz$${salt}$${hash}`,
    `scrypt$1$${r}$${p}$${salt}$${hash}`,
    `scrypt$${n}$${r}$0$${salt}$${hash}`,
    `scrypt$${n}$${r}$${p}`,
    `scrypt$${n}$${r}$${p}$$${hash}`,
    `scrypt$${n}$${r}$${p}$${salt}$`,
    `scrypt$${n}$${r}$${p}$%%%$${hash}`,
    `scrypt$${n}$${r}$${p}$${salt}$%%%`,
  ];

  for (const malformedHash of malformedHashes) {
    await assert.doesNotReject(async () => {
      assert.equal(await verifyPassword('abcd', malformedHash), false);
    });
  }
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

test('getSessionToken ignores malformed percent-encoded cookie parts', () => {
  assert.equal(
    getSessionToken({ headers: { cookie: 'droplo_site_auth=%' } }),
    ''
  );
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
