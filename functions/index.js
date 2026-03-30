import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

const STORAGE_QUOTA = 5 * 1024 * 1024 * 1024; // 5GB
const SITE_TTL_DAYS = 7;

const db = getFirestore();

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

async function deleteSite(siteId, docId) {
  const bucket = getStorage().bucket();
  await bucket.deleteFiles({ prefix: `sites/${siteId}/` });
  if (docId) {
    await db.collection('sites').doc(docId).delete();
  }
}

export const cleanupExpiredSites = onSchedule(
  { schedule: 'every 24 hours', region: 'asia-east1', timeoutSeconds: 300 },
  async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - SITE_TTL_DAYS);

    const expired = await db.collection('sites')
      .where('createdAt', '<', cutoff)
      .get();

    const deletes = expired.docs.map((doc) => {
      const { siteId } = doc.data();
      return deleteSite(siteId, doc.id);
    });

    await Promise.all(deletes);
  }
);

export const prepareUpload = onCall(
  { region: 'asia-east1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '需要登入');
    }

    const { estimatedSize } = request.data;
    if (typeof estimatedSize !== 'number' || estimatedSize <= 0) {
      throw new HttpsError('invalid-argument', '無效的檔案大小');
    }

    // Delete expired sites first
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - SITE_TTL_DAYS);

    const expired = await db.collection('sites')
      .where('createdAt', '<', cutoff)
      .get();

    if (!expired.empty) {
      await Promise.all(
        expired.docs.map((doc) => deleteSite(doc.data().siteId, doc.id))
      );
    }

    // Check quota
    const allSites = await db.collection('sites')
      .orderBy('createdAt', 'asc')
      .get();

    let currentTotal = 0;
    for (const doc of allSites.docs) {
      currentTotal += doc.data().totalSize || 0;
    }

    // If room available, proceed
    if (currentTotal + estimatedSize <= STORAGE_QUOTA) {
      return { ok: true };
    }

    // Auto-delete oldest sites until there's room
    for (const doc of allSites.docs) {
      if (currentTotal + estimatedSize <= STORAGE_QUOTA) break;
      const data = doc.data();
      await deleteSite(data.siteId, doc.id);
      currentTotal -= data.totalSize || 0;
    }

    if (currentTotal + estimatedSize <= STORAGE_QUOTA) {
      return { ok: true };
    }

    return { ok: false, reason: '儲存空間不足，無法上傳' };
  }
);

export const serveSite = onRequest({ region: 'asia-east1' }, async (req, res) => {
  const parts = req.path.replace(/^\/s\//, '').split('/');
  const siteId = parts[0];
  const filePath = parts.slice(1).join('/') || 'index.html';

  if (!siteId) {
    res.status(400).send('Missing site ID');
    return;
  }

  if (!/^[a-z0-9-]+$/i.test(siteId)) {
    res.status(400).send('Invalid site ID');
    return;
  }

  if (filePath.includes('..') || filePath.includes('\0')) {
    res.status(400).send('Invalid path');
    return;
  }

  const cleanPath = filePath.replace(/\/\/+/g, '/').replace(/^\/+/, '');
  const file = getStorage().bucket().file(`sites/${siteId}/${cleanPath}`);

  try {
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).send('Not found');
      return;
    }

    const [content] = await file.download();
    res.set({
      'Content-Type': getMimeType(cleanPath),
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '0',
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; frame-ancestors 'self'",
    });
    res.status(200).send(content);
  } catch {
    res.status(500).send('Internal error');
  }
});
