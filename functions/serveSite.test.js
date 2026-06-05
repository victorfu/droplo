import assert from 'node:assert/strict';
import test from 'node:test';
import { createServeSiteHandler } from './serveSiteHandler.js';
import {
  COOKIE_NAME,
  createSessionToken,
  hashPassword,
} from './siteAuth.js';

function createFirestore({ sites = [], secrets = {} } = {}) {
  return {
    collection(name) {
      if (name === 'sites') {
        return {
          where(field, operator, value) {
            assert.equal(field, 'siteId');
            assert.equal(operator, '==');

            return {
              limit(limitCount) {
                return {
                  async get() {
                    const docs = sites
                      .filter((site) => site.data.siteId === value)
                      .slice(0, limitCount)
                      .map((site, index) => ({
                        id: site.id ?? `site-doc-${index}`,
                        data: () => site.data,
                      }));

                    return {
                      docs,
                      empty: docs.length === 0,
                      size: docs.length,
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (name === 'siteSecrets') {
        return {
          doc(siteId) {
            return {
              async get() {
                if (!Object.hasOwn(secrets, siteId)) {
                  return { exists: false };
                }

                return {
                  exists: true,
                  data: () => secrets[siteId],
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    },
  };
}

function createBucket(files = {}) {
  const reads = [];

  return {
    reads,
    file(path) {
      reads.push(path);

      return {
        async exists() {
          return [Object.hasOwn(files, path)];
        },
        async download() {
          return [Buffer.from(files[path])];
        },
      };
    },
  };
}

function createRequest(overrides = {}) {
  return {
    method: 'GET',
    path: '/s/site123/index.html',
    originalUrl: '/s/site123/index.html',
    url: '/s/site123/index.html',
    headers: {},
    secure: true,
    ...overrides,
  };
}

function createResponse() {
  return {
    body: undefined,
    headers: {},
    redirectTarget: undefined,
    statusCode: undefined,
    set(headers) {
      Object.assign(this.headers, headers);
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    redirect(statusCode, target) {
      this.statusCode = statusCode;
      this.redirectTarget = target;
      return this;
    },
  };
}

test('protected request without valid auth returns password page before Storage read', async () => {
  const passwordHash = await hashPassword('abcd');
  const firestore = createFirestore({
    sites: [{ data: { siteId: 'site123', passwordEnabled: true } }],
    secrets: { site123: { passwordHash } },
  });
  const bucket = createBucket({
    'sites/site123/index.html': '<!doctype html>',
  });
  const handler = createServeSiteHandler({
    firestore,
    bucketFactory: () => bucket,
  });
  const res = createResponse();

  await handler(
    createRequest({ originalUrl: '/s/site123/index.html?preview=1' }),
    res
  );

  assert.equal(res.statusCode, 401);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.match(res.body, /<form method="post" action="\/s\/site123\/index\.html\?preview=1">/);
  assert.deepEqual(bucket.reads, []);
});

test('duplicate site metadata fails closed before Storage read', async () => {
  const firestore = createFirestore({
    sites: [
      { id: 'first', data: { siteId: 'site123', passwordEnabled: false } },
      { id: 'second', data: { siteId: 'site123', passwordEnabled: true } },
    ],
  });
  const bucket = createBucket({
    'sites/site123/index.html': '<!doctype html>',
  });
  const handler = createServeSiteHandler({
    firestore,
    bucketFactory: () => bucket,
  });
  const res = createResponse();

  await handler(createRequest(), res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body, 'Internal error');
  assert.deepEqual(bucket.reads, []);
});

test('successful protected file response uses no-store cache header', async () => {
  const passwordHash = await hashPassword('abcd');
  const token = createSessionToken('site123', passwordHash);
  const firestore = createFirestore({
    sites: [{ data: { siteId: 'site123', passwordEnabled: true } }],
    secrets: { site123: { passwordHash } },
  });
  const bucket = createBucket({
    'sites/site123/index.html': '<!doctype html>',
  });
  const handler = createServeSiteHandler({
    firestore,
    bucketFactory: () => bucket,
  });
  const res = createResponse();

  await handler(
    createRequest({
      headers: { cookie: `${COOKIE_NAME}=${encodeURIComponent(token)}` },
    }),
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.body.toString('utf8'), '<!doctype html>');
  assert.deepEqual(bucket.reads, ['sites/site123/index.html']);
});

test('public file response keeps public cache header', async () => {
  const firestore = createFirestore({
    sites: [{ data: { siteId: 'site123', passwordEnabled: false } }],
  });
  const bucket = createBucket({
    'sites/site123/index.html': '<!doctype html>',
  });
  const handler = createServeSiteHandler({
    firestore,
    bucketFactory: () => bucket,
  });
  const res = createResponse();

  await handler(createRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Cache-Control'], 'public, max-age=3600');
  assert.equal(res.body.toString('utf8'), '<!doctype html>');
  assert.deepEqual(bucket.reads, ['sites/site123/index.html']);
});
