import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  MIN_PASSWORD_LENGTH,
  hashPassword,
} from './siteAuth.js';
import {
  createServeSiteHandler,
  findSiteBySiteId,
  isValidSiteId,
} from './serveSiteHandler.js';

initializeApp();

const STORAGE_QUOTA = 5 * 1024 * 1024 * 1024; // 5GB
const SITE_TTL_DAYS = 7;
const ORPHAN_SECRET_CLEANUP_LIMIT = 100;

const db = getFirestore();

async function cleanupOrphanSecrets(cutoff) {
  const secrets = await db.collection('siteSecrets')
    .where('createdAt', '<', cutoff)
    .limit(ORPHAN_SECRET_CLEANUP_LIMIT)
    .get();

  for (const secretDoc of secrets.docs) {
    const site = await findSiteBySiteId(secretDoc.id, db);
    if (site.status === 'missing') {
      await secretDoc.ref.delete();
    }
  }
}

async function deleteSite(siteId, docId) {
  if (isValidSiteId(siteId)) {
    const bucket = getStorage().bucket();
    await bucket.deleteFiles({ prefix: `sites/${siteId}/` });
    await db.collection('siteSecrets').doc(siteId).delete();
  }

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
    await cleanupOrphanSecrets(cutoff);
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
    await cleanupOrphanSecrets(cutoff);

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

export const createSiteSecret = onCall(
  { region: 'asia-east1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '需要登入');
    }

    const { siteId, password } = request.data ?? {};
    if (!isValidSiteId(siteId)) {
      throw new HttpsError('invalid-argument', '無效的網站 ID');
    }

    if (
      typeof password !== 'string' ||
      password.trim().length < MIN_PASSWORD_LENGTH
    ) {
      throw new HttpsError('invalid-argument', '密碼至少需要 4 個字元');
    }

    const secretRef = db.collection('siteSecrets').doc(siteId);
    const existing = await secretRef.get();
    if (existing.exists) {
      throw new HttpsError('already-exists', '密碼保護已存在');
    }

    await secretRef.create({
      uid: request.auth.uid,
      passwordHash: await hashPassword(password.trim()),
      createdAt: Timestamp.now(),
    });

    return { ok: true };
  }
);

export const serveSite = onRequest(
  { region: 'asia-east1' },
  createServeSiteHandler({
    firestore: db,
    bucketFactory: () => getStorage().bucket(),
  })
);
