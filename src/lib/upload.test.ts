import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadSite } from './upload';

interface MockZipEntry {
  dir: boolean;
  async: (type: 'arraybuffer') => Promise<ArrayBuffer>;
}

interface MockZip {
  files: Record<string, MockZipEntry>;
}

type LoadZip = (zipFile: File) => Promise<MockZip>;
type WaitForAuth = () => Promise<{ uid: string }>;
type GenerateSiteId = () => string;
type HttpsCallable = (functionsInstance: unknown, name: string) => (payload: unknown) => Promise<{
  data: { ok: boolean; reason?: string };
}>;
type Collection = (database: unknown, path: string) => { path: string };
type AddDoc = (collectionRef: { path: string }, data: unknown) => Promise<void>;
type UploadBytes = (storageRef: unknown, content: ArrayBuffer, metadata: unknown) => Promise<void>;
type StorageRef = (storageInstance: unknown, path: string) => { path: string };

const mocks = vi.hoisted(() => {
  const callOrder: string[] = [];
  const createSecretPayloads: unknown[] = [];
  const addDocPayloads: unknown[] = [];

  const loadZip = vi.fn<LoadZip>();
  const waitForAuth = vi.fn<WaitForAuth>();
  const generateSiteId = vi.fn<GenerateSiteId>();
  const httpsCallable = vi.fn<HttpsCallable>((_functionsInstance, name) => async (payload) => {
    if (name === 'prepareUpload') {
      callOrder.push('prepareUpload');
      return { data: { ok: true } };
    }

    if (name === 'createSiteSecret') {
      callOrder.push('createSiteSecret');
      createSecretPayloads.push(payload);
      return { data: { ok: true } };
    }

    throw new Error(`Unexpected callable: ${name}`);
  });
  const collection = vi.fn<Collection>((_database, path) => ({ path }));
  const addDoc = vi.fn<AddDoc>(async (_collectionRef, data) => {
    callOrder.push('addDoc');
    addDocPayloads.push(data);
  });
  const serverTimestamp = vi.fn(() => ({ sentinel: 'serverTimestamp' }));
  const uploadBytes = vi.fn<UploadBytes>(async () => {
    callOrder.push('uploadBytes');
  });
  const ref = vi.fn<StorageRef>((_storageInstance, path) => ({ path }));

  return {
    addDoc,
    addDocPayloads,
    callOrder,
    collection,
    createSecretPayloads,
    generateSiteId,
    httpsCallable,
    loadZip,
    ref,
    reset() {
      callOrder.length = 0;
      createSecretPayloads.length = 0;
      addDocPayloads.length = 0;

      addDoc.mockClear();
      collection.mockClear();
      httpsCallable.mockClear();
      ref.mockClear();
      serverTimestamp.mockClear();
      uploadBytes.mockClear();

      generateSiteId.mockReset();
      generateSiteId.mockReturnValue('site123');
      loadZip.mockReset();
      waitForAuth.mockReset();
      waitForAuth.mockResolvedValue({ uid: 'user123' });
    },
    serverTimestamp,
    uploadBytes,
    waitForAuth,
  };
});

vi.mock('jszip', () => ({
  default: {
    loadAsync: mocks.loadZip,
  },
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: mocks.httpsCallable,
}));

vi.mock('firebase/firestore', () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  serverTimestamp: mocks.serverTimestamp,
}));

vi.mock('firebase/storage', () => ({
  ref: mocks.ref,
  uploadBytes: mocks.uploadBytes,
}));

vi.mock('./firebase', () => ({
  db: { kind: 'db' },
  functions: { kind: 'functions' },
  storage: { kind: 'storage' },
  waitForAuth: mocks.waitForAuth,
}));

vi.mock('./utils', () => ({
  generateSiteId: mocks.generateSiteId,
  getMimeType: (path: string) => (path.endsWith('.html') ? 'text/html' : 'text/css'),
  isAllowedFile: (path: string) => /\.(?:css|html|js)$/i.test(path),
}));

function textBuffer(value: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(value);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function createZip(files: Record<string, string>): MockZip {
  const zipFiles: Record<string, MockZipEntry> = {};

  for (const [path, content] of Object.entries(files)) {
    zipFiles[path] = {
      dir: false,
      async: async (_type) => textBuffer(content),
    };
  }

  return { files: zipFiles };
}

describe('uploadSite password orchestration', () => {
  beforeEach(() => {
    mocks.reset();
    vi.stubGlobal('window', { location: { origin: 'https://droplo.test' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates the password secret before the public site document for protected uploads', async () => {
    mocks.loadZip.mockResolvedValue(createZip({ 'index.html': '<main>Hello</main>' }));

    const result = await uploadSite(
      new File(['zip'], 'site.zip'),
      () => undefined,
      { passwordEnabled: true, password: ' secret ' }
    );

    expect(mocks.createSecretPayloads).toEqual([{ siteId: 'site123', password: 'secret' }]);
    expect(mocks.callOrder.indexOf('createSiteSecret')).toBeLessThan(
      mocks.callOrder.indexOf('addDoc')
    );
    expect(mocks.addDocPayloads).toContainEqual(
      expect.objectContaining({
        passwordEnabled: true,
        siteId: 'site123',
      })
    );
    expect(result).toEqual({
      passwordEnabled: true,
      siteId: 'site123',
      url: 'https://droplo.test/s/site123/',
    });
  });

  it('skips password secret creation for unprotected uploads', async () => {
    mocks.loadZip.mockResolvedValue(createZip({ 'index.html': '<main>Hello</main>' }));

    const result = await uploadSite(new File(['zip'], 'site.zip'), () => undefined);

    expect(mocks.callOrder).not.toContain('createSiteSecret');
    expect(mocks.createSecretPayloads).toEqual([]);
    expect(mocks.addDocPayloads).toContainEqual(
      expect.objectContaining({
        passwordEnabled: false,
        siteId: 'site123',
      })
    );
    expect(result).toEqual({
      passwordEnabled: false,
      siteId: 'site123',
      url: 'https://droplo.test/s/site123/',
    });
  });

  it('rejects protected ZIP uploads without creating a secret when index.html is missing', async () => {
    mocks.loadZip.mockResolvedValue(createZip({ 'styles.css': 'body { color: red; }' }));

    await expect(
      uploadSite(
        new File(['zip'], 'site.zip'),
        () => undefined,
        { passwordEnabled: true, password: 'secret' }
      )
    ).rejects.toThrow('找不到 index.html');

    expect(mocks.callOrder).not.toContain('createSiteSecret');
    expect(mocks.createSecretPayloads).toEqual([]);
    expect(mocks.addDocPayloads).toEqual([]);
  });
});
