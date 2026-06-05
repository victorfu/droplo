import {
  buildSessionCookie,
  createSessionToken,
  getRequestPassword,
  getSessionToken,
  isCanonicalPasswordHash,
  renderPasswordPage,
  verifyPassword,
  verifySessionToken,
} from './siteAuth.js';

const SITE_ID_PATTERN = /^[a-z0-9-]+$/i;
const REQUEST_TARGET_BASE = 'https://droplo.invalid';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

function getMimeType(filePath) {
  const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0];
  return (ext ? MIME_TYPES[ext] : undefined) ?? 'application/octet-stream';
}

export function isValidSiteId(siteId) {
  return typeof siteId === 'string' && SITE_ID_PATTERN.test(siteId);
}

function normalizeRelativeRequestTarget(candidate) {
  if (typeof candidate !== 'string') return null;

  try {
    const target = new URL(candidate, REQUEST_TARGET_BASE);
    if (!candidate.startsWith('/') || target.origin !== REQUEST_TARGET_BASE) {
      return null;
    }

    return `${target.pathname}${target.search}`;
  } catch {
    return null;
  }
}

function getRelativeRequestTarget(req) {
  const candidate =
    typeof req.originalUrl === 'string' ? req.originalUrl : req.url;
  const target = normalizeRelativeRequestTarget(candidate);
  if (target !== null) return target;

  return normalizeRelativeRequestTarget(req.path) ?? '/';
}

export async function findSiteBySiteId(siteId, firestore) {
  const snapshot = await firestore.collection('sites')
    .where('siteId', '==', siteId)
    .limit(2)
    .get();

  if (snapshot.empty) return { status: 'missing' };
  if (snapshot.size > 1) return { status: 'duplicate' };

  const doc = snapshot.docs[0];
  return {
    status: 'found',
    docId: doc.id,
    data: doc.data(),
  };
}

function isSecureRequest(req) {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

export function sendPasswordPage(res, status, pageHtml) {
  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.status(status).send(pageHtml);
}

export async function handleServeSiteRequest(req, res, {
  firestore,
  bucketFactory,
}) {
  const parts = req.path.replace(/^\/s\//, '').split('/');
  const siteId = parts[0];
  const filePath = parts.slice(1).join('/') || 'index.html';

  if (!siteId) {
    res.status(400).send('Missing site ID');
    return;
  }

  if (!isValidSiteId(siteId)) {
    res.status(400).send('Invalid site ID');
    return;
  }

  if (filePath.includes('..') || filePath.includes('\0')) {
    res.status(400).send('Invalid path');
    return;
  }

  const cleanPath = filePath.replace(/\/\/+/g, '/').replace(/^\/+/, '');
  const requestTarget = getRelativeRequestTarget(req);

  try {
    const site = await findSiteBySiteId(siteId, firestore);
    if (site.status === 'missing') {
      res.status(404).send('Not found');
      return;
    }

    if (site.status === 'duplicate') {
      res.status(500).send('Internal error');
      return;
    }

    const passwordProtected = site.data.passwordEnabled === true;
    if (passwordProtected) {
      const secretSnapshot = await firestore.collection('siteSecrets').doc(siteId).get();
      if (!secretSnapshot.exists) {
        res.status(500).send('Internal error');
        return;
      }

      const { passwordHash } = secretSnapshot.data();
      if (!isCanonicalPasswordHash(passwordHash)) {
        res.status(500).send('Internal error');
        return;
      }

      const sessionToken = getSessionToken(req);
      if (!verifySessionToken(sessionToken, siteId, passwordHash)) {
        if (req.method === 'POST') {
          const submittedPassword = getRequestPassword(req).trim();
          const passwordMatches = await verifyPassword(
            submittedPassword,
            passwordHash
          );

          if (passwordMatches) {
            let token;
            try {
              token = createSessionToken(siteId, passwordHash);
            } catch {
              res.status(500).send('Internal error');
              return;
            }

            res.setHeader(
              'Set-Cookie',
              buildSessionCookie({
                siteId,
                token,
                secure: isSecureRequest(req),
              })
            );
            res.redirect(303, requestTarget);
            return;
          }

          sendPasswordPage(
            res,
            401,
            renderPasswordPage({
              actionPath: requestTarget,
              error: '密碼錯誤',
            })
          );
          return;
        }

        if (req.method !== 'GET') {
          res.status(405).send('Method not allowed');
          return;
        }

        sendPasswordPage(
          res,
          401,
          renderPasswordPage({ actionPath: requestTarget })
        );
        return;
      }
    }

    const file = bucketFactory().file(`sites/${siteId}/${cleanPath}`);
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).send('Not found');
      return;
    }

    const [content] = await file.download();
    res.set({
      'Content-Type': getMimeType(cleanPath),
      'Cache-Control': passwordProtected ? 'no-store' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '0',
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; frame-ancestors 'self'",
    });
    res.status(200).send(content);
  } catch {
    res.status(500).send('Internal error');
  }
}

export function createServeSiteHandler(deps) {
  return (req, res) => handleServeSiteRequest(req, res, deps);
}
