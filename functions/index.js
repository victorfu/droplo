import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

initializeApp();

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
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export const serveSite = onRequest({ region: 'asia-east1' }, async (req, res) => {
  // Path: /s/{siteId}/{...filePath}
  const parts = req.path.replace(/^\/s\//, '').split('/');
  const siteId = parts[0];
  const filePath = parts.slice(1).join('/') || 'index.html';

  if (!siteId) {
    res.status(400).send('Missing site ID');
    return;
  }

  const storagePath = `sites/${siteId}/${filePath}`;
  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);

  try {
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).send('Not found');
      return;
    }

    const [content] = await file.download();
    res.set('Content-Type', getMimeType(filePath));
    res.set('Cache-Control', 'public, max-age=3600');
    res.status(200).send(content);
  } catch {
    res.status(500).send('Internal error');
  }
});
