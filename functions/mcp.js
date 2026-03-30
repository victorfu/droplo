import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { onRequest } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore, FieldValue, AggregateField } from 'firebase-admin/firestore';
import { z } from 'zod';
import crypto from 'crypto';
import { getMimeType } from './shared.js';

const DANGEROUS_PATH = /(\.\.|\\0|[\x00-\x1f]|^\/|\/\/)/;

const SITE_URL_BASE = 'https://mydroplo.web.app/s';
const MAX_SITE_SIZE = 50 * 1024 * 1024;
const MAX_FILE_COUNT = 500;
const STORAGE_QUOTA = 5 * 1024 * 1024 * 1024;

function generateSiteId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createMcpServer() {
  const server = new McpServer({
    name: 'droplo-mcp',
    version: '1.0.0',
  });

  const db = getFirestore();
  const bucket = getStorage().bucket();

  server.tool(
    'list_sites',
    'List all deployed static sites on Droplo',
    {},
    async () => {
      const snapshot = await db.collection('sites').orderBy('createdAt', 'desc').limit(50).get();
      if (snapshot.empty) {
        return { content: [{ type: 'text', text: 'No sites deployed yet.' }] };
      }
      const sites = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          siteId: d.siteId,
          name: d.originalName,
          url: `${SITE_URL_BASE}/${d.siteId}/`,
          fileCount: d.fileCount,
          totalSize: formatBytes(d.totalSize || 0),
          createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
        };
      });
      return { content: [{ type: 'text', text: JSON.stringify(sites, null, 2) }] };
    }
  );

  server.tool(
    'get_site',
    'Get details of a specific deployed site',
    { siteId: z.string().regex(/^[a-f0-9]{16}$/, 'Invalid site ID format').describe('The site ID to look up') },
    async ({ siteId }) => {
      const snapshot = await db.collection('sites').where('siteId', '==', siteId).limit(1).get();
      if (snapshot.empty) {
        return { content: [{ type: 'text', text: `Site "${siteId}" not found.` }], isError: true };
      }
      const d = snapshot.docs[0].data();
      const site = {
        siteId: d.siteId,
        name: d.originalName,
        url: `${SITE_URL_BASE}/${d.siteId}/`,
        fileCount: d.fileCount,
        totalSize: formatBytes(d.totalSize || 0),
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
      };
      return { content: [{ type: 'text', text: JSON.stringify(site, null, 2) }] };
    }
  );

  server.tool(
    'deploy_site',
    'Deploy a static website to Droplo. Provide file contents directly. Must include an index.html.',
    {
      name: z.string().describe('Display name for the site'),
      files: z
        .array(
          z.object({
            path: z.string().describe('File path relative to site root (e.g. "index.html", "css/style.css")'),
            content: z.string().describe('File content: plain text for text files, base64-encoded string for binary files'),
            encoding: z
              .enum(['text', 'base64'])
              .default('text')
              .describe('How content is encoded. Use "text" for HTML/CSS/JS/JSON/SVG/XML/TXT, "base64" for images/fonts/media'),
          })
        )
        .describe('Array of files to deploy'),
    },
    async ({ name, files }) => {
      if (files.length === 0) {
        return { content: [{ type: 'text', text: 'No files provided.' }], isError: true };
      }
      if (files.length > MAX_FILE_COUNT) {
        return { content: [{ type: 'text', text: `Too many files (max ${MAX_FILE_COUNT}).` }], isError: true };
      }

      const hasIndex = files.some((f) => f.path === 'index.html' || f.path.endsWith('/index.html'));
      if (!hasIndex) {
        return { content: [{ type: 'text', text: 'Missing index.html — every site needs one.' }], isError: true };
      }

      // Path traversal protection
      for (const f of files) {
        if (DANGEROUS_PATH.test(f.path)) {
          return { content: [{ type: 'text', text: `Invalid file path: "${f.path}"` }], isError: true };
        }
      }

      const buffers = files.map((f) => ({
        path: f.path.replace(/^\/+/, ''),
        buffer: f.encoding === 'base64' ? Buffer.from(f.content, 'base64') : Buffer.from(f.content, 'utf-8'),
      }));

      const totalSize = buffers.reduce((sum, b) => sum + b.buffer.byteLength, 0);
      if (totalSize > MAX_SITE_SIZE) {
        return { content: [{ type: 'text', text: `Site too large (${formatBytes(totalSize)}, max 50 MB).` }], isError: true };
      }

      // Quota check via aggregation (avoids fetching all docs)
      const quotaSnap = await db.collection('sites').aggregate({ usedBytes: AggregateField.sum('totalSize') }).get();
      const currentTotal = quotaSnap.data().usedBytes || 0;
      if (currentTotal + totalSize > STORAGE_QUOTA) {
        return { content: [{ type: 'text', text: 'Storage quota exceeded (5 GB limit).' }], isError: true };
      }

      const siteId = generateSiteId();

      // Upload files in parallel
      await Promise.all(
        buffers.map(({ path, buffer }) =>
          bucket.file(`sites/${siteId}/${path}`).save(buffer, {
            metadata: {
              contentType: getMimeType(path),
              cacheControl: 'public, max-age=3600',
            },
          })
        )
      );

      await db.collection('sites').add({
        siteId,
        uid: 'mcp',
        fileCount: files.length,
        totalSize,
        originalName: name,
        createdAt: FieldValue.serverTimestamp(),
      });

      const url = `${SITE_URL_BASE}/${siteId}/`;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ siteId, url, fileCount: files.length, totalSize: formatBytes(totalSize) }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'delete_site',
    'Delete a deployed site by its site ID',
    { siteId: z.string().regex(/^[a-f0-9]{16}$/, 'Invalid site ID format').describe('The site ID to delete') },
    async ({ siteId }) => {
      const snapshot = await db.collection('sites').where('siteId', '==', siteId).limit(1).get();
      if (snapshot.empty) {
        return { content: [{ type: 'text', text: `Site "${siteId}" not found.` }], isError: true };
      }

      await bucket.deleteFiles({ prefix: `sites/${siteId}/` });
      await snapshot.docs[0].ref.delete();

      return { content: [{ type: 'text', text: `Site "${siteId}" deleted successfully.` }] };
    }
  );

  server.tool(
    'get_quota',
    'Check Droplo storage quota usage',
    {},
    async () => {
      const [quotaSnap, countSnap] = await Promise.all([
        db.collection('sites').aggregate({ usedBytes: AggregateField.sum('totalSize') }).get(),
        db.collection('sites').count().get(),
      ]);
      const used = quotaSnap.data().usedBytes || 0;
      const quota = {
        used: formatBytes(used),
        total: '5.0 GB',
        remaining: formatBytes(STORAGE_QUOTA - used),
        siteCount: countSnap.data().count,
      };
      return { content: [{ type: 'text', text: JSON.stringify(quota, null, 2) }] };
    }
  );

  return server;
}

const MCP_API_KEY = process.env.MCP_API_KEY || '';

export const mcp = onRequest({
  region: 'asia-east1',
  cors: ['https://mydroplo.web.app'],
  memory: '512MiB',
  timeoutSeconds: 120,
  maxInstances: 10,
}, async (req, res) => {
  // Bearer token auth (skip if MCP_API_KEY not configured)
  if (MCP_API_KEY) {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${MCP_API_KEY}`) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Unauthorized — invalid or missing Bearer token.' },
        id: null,
      });
      return;
    }
  }

  if (req.method === 'GET' || req.method === 'DELETE') {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Stateless server — GET and DELETE not supported.' },
      id: null,
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on('close', () => {
      transport.close();
      server.close();
    });
  } catch {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});
