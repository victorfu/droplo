import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

export const COOKIE_NAME = 'droplo_site_auth';
export const MIN_PASSWORD_LENGTH = 4;

const scrypt = promisify(scryptCallback);
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SITE_ID_PATH_PATTERN = /^[a-z0-9-]+$/i;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parsePositiveInteger(value) {
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) return null;
  return number;
}

function isBase64Urlish(value) {
  return typeof value === 'string' && BASE64URL_PATTERN.test(value);
}

function decodeCookieValue(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function validateCookiePathSiteId(siteId) {
  if (typeof siteId !== 'string' || !SITE_ID_PATH_PATTERN.test(siteId)) {
    throw new Error('Invalid siteId for site auth cookie path');
  }
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });

  return [
    'scrypt',
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    toBase64Url(salt),
    toBase64Url(derivedKey),
  ].join('$');
}

export async function verifyPassword(password, encodedHash) {
  const parts = String(encodedHash).split('$');
  if (parts.length !== 6) return false;

  const [algorithm, nValue, rValue, pValue, salt, hash] = parts;
  const n = parsePositiveInteger(nValue);
  const r = parsePositiveInteger(rValue);
  const p = parsePositiveInteger(pValue);

  if (
    algorithm !== 'scrypt' ||
    n === null ||
    r === null ||
    p === null ||
    !isBase64Urlish(salt) ||
    !isBase64Urlish(hash)
  ) {
    return false;
  }

  try {
    const derivedKey = await scrypt(password, fromBase64Url(salt), KEY_LENGTH, {
      N: n,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    });

    return safeEqual(toBase64Url(derivedKey), hash);
  } catch {
    return false;
  }
}

export function createSessionToken(siteId, passwordHash) {
  const signature = createHmac('sha256', passwordHash)
    .update(`site:${siteId}`)
    .digest('base64url');
  return `v1.${signature}`;
}

export function verifySessionToken(token, siteId, passwordHash) {
  if (typeof token !== 'string' || !token.startsWith('v1.')) return false;
  return safeEqual(token, createSessionToken(siteId, passwordHash));
}

export function parseCookies(cookieHeader = '') {
  const cookies = {};

  for (const part of String(cookieHeader).split(';')) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    const separator = trimmedPart.indexOf('=');
    const rawName =
      separator === -1 ? trimmedPart : trimmedPart.slice(0, separator);
    const rawValue = separator === -1 ? '' : trimmedPart.slice(separator + 1);
    const name = decodeCookieValue(rawName);
    const value = decodeCookieValue(rawValue);

    if (name === null || value === null) continue;
    cookies[name] = value;
  }

  return cookies;
}

export function getSessionToken(req) {
  return parseCookies(req.headers?.cookie)[COOKIE_NAME] ?? '';
}

export function buildSessionCookie({ siteId, token, secure }) {
  validateCookiePathSiteId(siteId);

  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Path=/s/${siteId}`,
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function getRequestPassword(req) {
  if (typeof req.body?.password === 'string') {
    return req.body.password;
  }

  if (Buffer.isBuffer(req.rawBody)) {
    return new URLSearchParams(req.rawBody.toString('utf8')).get('password') ?? '';
  }

  return '';
}

export function renderPasswordPage({ actionPath, error = '' }) {
  const escapedAction = escapeHtml(actionPath);
  const errorHtml = error
    ? `<p class="error" role="alert">${escapeHtml(error)}</p>`
    : '<p class="helper">Enter the password to view this site.</p>';

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Password Required - Droplo</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, system-ui, -apple-system, sans-serif; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #f8fafc; color: #111827; }
    main { width: min(100% - 32px, 420px); border: 1px solid #e5e7eb; border-radius: 16px; padding: 28px; background: #fff; box-shadow: 0 20px 60px rgb(15 23 42 / 0.08); }
    h1 { margin: 0 0 8px; font-size: 20px; }
    p { margin: 0 0 18px; color: #6b7280; }
    label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; }
    input { box-sizing: border-box; width: 100%; min-height: 44px; border-radius: 10px; border: 1px solid #d1d5db; padding: 0 12px; font: inherit; }
    button { width: 100%; min-height: 44px; margin-top: 14px; border: 0; border-radius: 10px; background: #111827; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
    .error { color: #dc2626; }
    .helper { color: #6b7280; }
    @media (prefers-color-scheme: dark) {
      body { background: #030712; color: #f9fafb; }
      main { background: #111827; border-color: #374151; }
      input { background: #030712; border-color: #4b5563; color: #f9fafb; }
      button { background: #f9fafb; color: #111827; }
    }
  </style>
</head>
<body>
  <main>
    <h1>需要密碼</h1>
    ${errorHtml}
    <form method="post" action="${escapedAction}">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" minlength="4" autocomplete="current-password" autofocus>
      <button type="submit">View site</button>
    </form>
  </main>
</body>
</html>`;
}
