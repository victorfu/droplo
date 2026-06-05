import assert from 'node:assert/strict';
import { scrypt as scryptCallback } from 'node:crypto';
import test from 'node:test';
import { promisify } from 'node:util';
import {
  buildSessionCookie,
  createSessionToken,
  getRequestPassword,
  getSessionToken,
  hashPassword,
  isCanonicalPasswordHash,
  renderPasswordPage,
  verifyPassword,
  verifySessionToken,
} from './siteAuth.js';

const scrypt = promisify(scryptCallback);

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

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

test('verifyPassword requires canonical scrypt params and decoded field lengths', async () => {
  const salt = Buffer.alloc(16, 1);
  const nonCanonicalKey = await scrypt('abcd', salt, 64, {
    N: 1024,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  const nonCanonicalHash = [
    'scrypt',
    '1024',
    '8',
    '1',
    toBase64Url(salt),
    toBase64Url(nonCanonicalKey),
  ].join('$');
  const canonicalHash = await hashPassword('abcd');
  const [, n, r, p, , hash] = canonicalHash.split('$');

  assert.equal(await verifyPassword('abcd', nonCanonicalHash), false);
  assert.equal(
    await verifyPassword('abcd', `scrypt$${n}$${r}$${p}$YQ$${hash}`),
    false
  );
  assert.equal(
    await verifyPassword(
      'abcd',
      `scrypt$${n}$${r}$${p}$${toBase64Url(salt)}$YQ`
    ),
    false
  );
});

test('isCanonicalPasswordHash validates generated hashes without throwing', async () => {
  const validHash = await hashPassword('abcd');

  assert.equal(isCanonicalPasswordHash(validHash), true);
  assert.equal(isCanonicalPasswordHash('not-a-hash'), false);
  assert.equal(isCanonicalPasswordHash(`${validHash}$extra`), false);
  assert.equal(isCanonicalPasswordHash(null), false);
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

test('session tokens require canonical password hashes', () => {
  assert.equal(verifySessionToken('v1.anything', 'site123', 'not-a-hash'), false);
  assert.throws(
    () => createSessionToken('site123', 'not-a-hash'),
    /Invalid password hash/
  );
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

test('getSessionToken keeps the first duplicate cookie value', () => {
  assert.equal(
    getSessionToken({
      headers: {
        cookie: 'droplo_site_auth=first; droplo_site_auth=second',
      },
    }),
    'first'
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
