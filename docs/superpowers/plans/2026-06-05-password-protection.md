# Password Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional upload-time password protection for Droplo sites while keeping the default public upload flow unchanged.

**Architecture:** Password choice lives in the React upload flow, but enforcement lives in Firebase Cloud Functions. Public `sites` metadata only stores `passwordEnabled`; private password hashes live in backend-only `siteSecrets/{siteId}` documents. `/s/**` requests go through `serveSite`, which serves public sites immediately and gates protected sites with a session-only HttpOnly cookie.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Firebase Firestore/Storage/Functions/Hosting, Node.js 22 `crypto`, Vitest, Node built-in test runner.

---

## File Structure

- Create `src/lib/passwordOptions.ts`: frontend password option normalization and minimum-length checks.
- Create `src/lib/passwordOptions.test.ts`: unit tests for default-off behavior and 4-character minimum.
- Create `src/lib/uploadMetadata.ts`: pure helper for constructing the public Firestore site document.
- Create `src/lib/uploadMetadata.test.ts`: unit tests that protected and unprotected metadata never include password hashes.
- Modify `src/types/index.ts`: add `UploadOptions`, `PasswordOptionsProps`, and `passwordEnabled` on upload results.
- Modify `src/lib/upload.ts`: generate `siteId` before upload, create a backend secret for protected uploads, and write `passwordEnabled` metadata.
- Modify `src/hooks/useUpload.ts`: pass password options through ZIP, folder, and single HTML uploads.
- Create `src/components/PasswordOptions.tsx`: compact upload-time password toggle and input.
- Modify `src/pages/HomePage.tsx`: own password UI state, validate before upload, and pass options into all upload paths.
- Modify `src/pages/SitePage.tsx`: read `passwordEnabled` metadata for the result card after redirect.
- Modify `src/components/ResultCard.tsx`: show a protected-site hint when `result.passwordEnabled` is true.
- Modify `src/locales/en.ts` and `src/locales/zh-TW.ts`: add password UI and result hint strings.
- Create `functions/siteAuth.js`: password hashing, verification, session token, cookie, request parsing, and password page rendering helpers.
- Create `functions/siteAuth.test.js`: Node tests for hashing, token verification, cookie attributes, form parsing, and HTML escaping.
- Modify `functions/index.js`: add `createSiteSecret`, private secret cleanup, and password enforcement in `serveSite`.
- Create `functions/securityRules.test.js`: text-level regression checks for Firestore and Storage rule boundaries.
- Modify `functions/package.json`: add a `test` script for Node tests.
- Modify root `package.json`: run frontend and functions tests from `npm test`.
- Modify `firestore.rules`: deny all client access to `siteSecrets`.
- Modify `storage.rules`: deny direct client reads from uploaded site files while preserving authenticated writes.

---

### Task 1: Frontend Password Contracts

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/lib/passwordOptions.test.ts`
- Create: `src/lib/passwordOptions.ts`
- Create: `src/lib/uploadMetadata.test.ts`
- Create: `src/lib/uploadMetadata.ts`

- [ ] **Step 1: Write failing password option tests**

Create `src/lib/passwordOptions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  getPasswordValidationError,
  normalizePasswordOptions,
} from './passwordOptions';

describe('passwordOptions', () => {
  it('keeps password protection disabled by default', () => {
    expect(normalizePasswordOptions()).toEqual({ passwordEnabled: false });
    expect(normalizePasswordOptions({ passwordEnabled: false, password: 'abcd' })).toEqual({
      passwordEnabled: false,
    });
  });

  it('requires at least 4 trimmed characters when enabled', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(4);
    expect(getPasswordValidationError({ passwordEnabled: true, password: 'abc' })).toBe(
      'tooShort'
    );
    expect(() =>
      normalizePasswordOptions({ passwordEnabled: true, password: 'abc' })
    ).toThrow('PASSWORD_TOO_SHORT');
  });

  it('normalizes enabled passwords by trimming surrounding whitespace', () => {
    expect(normalizePasswordOptions({ passwordEnabled: true, password: '  abcd  ' })).toEqual({
      passwordEnabled: true,
      password: 'abcd',
    });
    expect(getPasswordValidationError({ passwordEnabled: true, password: '  abcd  ' })).toBeNull();
  });
});
```

- [ ] **Step 2: Write failing upload metadata tests**

Create `src/lib/uploadMetadata.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildSiteDocument } from './uploadMetadata';

const createdAt = { sentinel: 'serverTimestamp' };

describe('buildSiteDocument', () => {
  it('builds public metadata for unprotected sites', () => {
    expect(
      buildSiteDocument({
        siteId: 'site123',
        uid: 'user123',
        fileCount: 3,
        totalSize: 42,
        originalName: 'demo.zip',
        createdAt,
        passwordEnabled: false,
      })
    ).toEqual({
      siteId: 'site123',
      uid: 'user123',
      fileCount: 3,
      totalSize: 42,
      originalName: 'demo.zip',
      createdAt,
      passwordEnabled: false,
    });
  });

  it('builds public metadata for protected sites without password secrets', () => {
    const doc = buildSiteDocument({
      siteId: 'site456',
      uid: 'user456',
      fileCount: 1,
      totalSize: 100,
      originalName: 'folder-upload',
      createdAt,
      passwordEnabled: true,
    });

    expect(doc).toEqual({
      siteId: 'site456',
      uid: 'user456',
      fileCount: 1,
      totalSize: 100,
      originalName: 'folder-upload',
      createdAt,
      passwordEnabled: true,
    });
    expect(Object.keys(doc)).not.toContain('password');
    expect(Object.keys(doc)).not.toContain('passwordHash');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- src/lib/passwordOptions.test.ts src/lib/uploadMetadata.test.ts
```

Expected: FAIL because `src/lib/passwordOptions.ts` and `src/lib/uploadMetadata.ts` do not exist.

- [ ] **Step 4: Add the shared upload option type**

In `src/types/index.ts`, add this near `UploadResult`:

```ts
export type UploadOptions =
  | { passwordEnabled: false; password?: undefined }
  | { passwordEnabled: true; password: string };
```

- [ ] **Step 5: Implement password option helper**

Create `src/lib/passwordOptions.ts`:

```ts
import type { UploadOptions } from '@/types';

export const MIN_PASSWORD_LENGTH = 4;

export type PasswordValidationError = 'tooShort';

export interface PasswordOptionsInput {
  passwordEnabled: boolean;
  password: string;
}

export function getPasswordValidationError(
  input: Partial<PasswordOptionsInput> | undefined
): PasswordValidationError | null {
  if (!input?.passwordEnabled) return null;
  return (input.password ?? '').trim().length >= MIN_PASSWORD_LENGTH ? null : 'tooShort';
}

export function normalizePasswordOptions(
  input?: Partial<PasswordOptionsInput>
): UploadOptions {
  if (!input?.passwordEnabled) {
    return { passwordEnabled: false };
  }

  const password = (input.password ?? '').trim();
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error('PASSWORD_TOO_SHORT');
  }

  return { passwordEnabled: true, password };
}
```

- [ ] **Step 6: Implement public metadata helper**

Create `src/lib/uploadMetadata.ts`:

```ts
export interface SiteDocumentInput {
  siteId: string;
  uid: string;
  fileCount: number;
  totalSize: number;
  originalName: string;
  createdAt: unknown;
  passwordEnabled: boolean;
}

export interface SiteDocument {
  siteId: string;
  uid: string;
  fileCount: number;
  totalSize: number;
  originalName: string;
  createdAt: unknown;
  passwordEnabled: boolean;
}

export function buildSiteDocument(input: SiteDocumentInput): SiteDocument {
  return {
    siteId: input.siteId,
    uid: input.uid,
    fileCount: input.fileCount,
    totalSize: input.totalSize,
    originalName: input.originalName,
    createdAt: input.createdAt,
    passwordEnabled: input.passwordEnabled,
  };
}
```

- [ ] **Step 7: Run focused frontend tests**

Run:

```bash
npm test -- src/lib/passwordOptions.test.ts src/lib/uploadMetadata.test.ts
```

Expected: PASS for both test files.

- [ ] **Step 8: Commit frontend contracts**

Run:

```bash
git add src/types/index.ts src/lib/passwordOptions.ts src/lib/passwordOptions.test.ts src/lib/uploadMetadata.ts src/lib/uploadMetadata.test.ts
git commit -m "feat: add password option contracts"
```

Expected: commit succeeds with only these four files staged.

---

### Task 2: Upload Pipeline Support

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/upload.ts`
- Modify: `src/hooks/useUpload.ts`
- Test: `src/lib/passwordOptions.test.ts`
- Test: `src/lib/uploadMetadata.test.ts`

- [ ] **Step 1: Update shared upload result and hook types**

Replace `UploadResult` with:

```ts
export interface UploadResult {
  siteId: string;
  url: string;
  passwordEnabled: boolean;
}
```

Replace the upload function signatures in `UseUploadReturn` with:

```ts
  upload: (file: File, options?: UploadOptions) => Promise<void>;
  uploadFiles: (fileList: FileEntry[], options?: UploadOptions) => Promise<void>;
```

- [ ] **Step 2: Update `upload.ts` imports**

In `src/lib/upload.ts`, add imports for the new helpers:

```ts
import { buildSiteDocument } from './uploadMetadata';
import { normalizePasswordOptions } from './passwordOptions';
import type { FileEntry, ProgressCallback, UploadOptions, UploadResult } from '@/types';
```

Keep the existing Firebase, JSZip, and utility imports. Remove the previous `type { FileEntry, ProgressCallback }` import because the replacement includes those names.

- [ ] **Step 3: Add backend secret creation helper in `upload.ts`**

Add this helper below `ensureQuota`:

```ts
async function createSiteSecret(siteId: string, password: string): Promise<void> {
  const createSecret = httpsCallable<
    { siteId: string; password: string },
    { ok: boolean; reason?: string }
  >(functions, 'createSiteSecret');

  const { data } = await createSecret({ siteId, password });
  if (!data.ok) {
    throw new Error(data.reason || '密碼保護設定失敗');
  }
}
```

- [ ] **Step 4: Update `uploadSite` signature and protected metadata flow**

Change the `uploadSite` signature to:

```ts
export async function uploadSite(
  zipFile: File,
  onProgress: ProgressCallback,
  options?: UploadOptions
): Promise<UploadResult> {
```

After `await ensureQuota(totalSize);`, replace the existing `siteId` and metadata block with:

```ts
  const normalizedOptions = normalizePasswordOptions(options);
  const siteId = generateSiteId();

  if (normalizedOptions.passwordEnabled) {
    await createSiteSecret(siteId, normalizedOptions.password);
  }

  await uploadFilesToStorage(allowedFiles, siteId, onProgress);

  onProgress({ stage: 'saving' });
  await addDoc(
    collection(db, 'sites'),
    buildSiteDocument({
      siteId,
      uid: user.uid,
      fileCount: allowedFiles.length,
      totalSize,
      originalName: zipFile.name,
      createdAt: serverTimestamp(),
      passwordEnabled: normalizedOptions.passwordEnabled,
    })
  );

  const siteUrl = `${window.location.origin}/s/${siteId}/`;
  return { siteId, url: siteUrl, passwordEnabled: normalizedOptions.passwordEnabled };
```

- [ ] **Step 5: Update `uploadFolder` signature and protected metadata flow**

Change the `uploadFolder` signature to:

```ts
export async function uploadFolder(
  fileList: FileEntry[],
  onProgress: ProgressCallback,
  options?: UploadOptions
): Promise<UploadResult> {
```

After `await ensureQuota(totalSize);`, keep the `prefix` validation, then replace the existing `siteId` and metadata block with:

```ts
  const normalizedOptions = normalizePasswordOptions(options);
  const siteId = generateSiteId();

  if (normalizedOptions.passwordEnabled) {
    await createSiteSecret(siteId, normalizedOptions.password);
  }

  onProgress({ stage: 'uploading', current: 0, total: allowedFiles.length });
  await uploadFilesToStorage(allowedFiles, siteId, onProgress);

  onProgress({ stage: 'saving' });
  await addDoc(
    collection(db, 'sites'),
    buildSiteDocument({
      siteId,
      uid: user.uid,
      fileCount: allowedFiles.length,
      totalSize,
      originalName: 'folder-upload',
      createdAt: serverTimestamp(),
      passwordEnabled: normalizedOptions.passwordEnabled,
    })
  );

  const siteUrl = `${window.location.origin}/s/${siteId}/`;
  return { siteId, url: siteUrl, passwordEnabled: normalizedOptions.passwordEnabled };
```

- [ ] **Step 6: Update `useUpload` to pass options through**

In `src/hooks/useUpload.ts`, replace both callbacks with:

```ts
  const upload = useCallback(async (file: File, options?: UploadOptions) => {
    setStatus('unzipping');
    setError(null);
    setResult(null);

    try {
      const uploadResult = await uploadSite(file, handleProgress, options);
      setResult(uploadResult);
      setStatus('done');
    } catch (err) {
      console.error('[Droplo] Upload failed:', err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  const uploadFiles = useCallback(async (fileList: FileEntry[], options?: UploadOptions) => {
    setStatus('uploading');
    setError(null);
    setResult(null);

    try {
      const uploadResult = await uploadFolder(fileList, handleProgress, options);
      setResult(uploadResult);
      setStatus('done');
    } catch (err) {
      console.error('[Droplo] Folder upload failed:', err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);
```

Add `UploadOptions` to the type import:

```ts
import type {
  UploadStatus,
  UploadProgress,
  UploadResult,
  UseUploadReturn,
  FileEntry,
  UploadOptions,
} from '@/types';
```

- [ ] **Step 7: Run tests and type build**

Run:

```bash
npm test -- src/lib/passwordOptions.test.ts src/lib/uploadMetadata.test.ts
npm run build
```

Expected: tests PASS and Vite build exits with code 0.

- [ ] **Step 8: Commit upload pipeline changes**

Run:

```bash
git add src/types/index.ts src/lib/upload.ts src/hooks/useUpload.ts
git commit -m "feat: pass password options through uploads"
```

Expected: commit succeeds with only upload pipeline files staged.

---

### Task 3: Upload UI And Result Hint

**Files:**
- Create: `src/components/PasswordOptions.tsx`
- Modify: `src/types/index.ts`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/SitePage.tsx`
- Modify: `src/components/ResultCard.tsx`
- Modify: `src/locales/en.ts`
- Modify: `src/locales/zh-TW.ts`

- [ ] **Step 1: Add component props to shared types**

In `src/types/index.ts`, add:

```ts
export interface PasswordOptionsProps {
  enabled: boolean;
  password: string;
  error: string | null;
  disabled?: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onPasswordChange: (password: string) => void;
}
```

- [ ] **Step 2: Create the password options component**

Create `src/components/PasswordOptions.tsx`:

```tsx
import { Lock } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import type { PasswordOptionsProps } from '@/types';

export default function PasswordOptions({
  enabled,
  password,
  error,
  disabled = false,
  onEnabledChange,
  onPasswordChange,
}: PasswordOptionsProps) {
  const { t } = useI18n();

  return (
    <section className="rounded-xl glass px-4 py-3 space-y-3">
      <label className="flex items-center justify-between gap-3 text-sm text-foreground">
        <span className="inline-flex items-center gap-2 font-medium">
          <Lock className="w-4 h-4 text-muted-foreground" />
          {t('password.label')}
        </span>
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          className="h-5 w-5 rounded border-border accent-[hsl(252_87%_64%)] disabled:cursor-not-allowed"
          aria-label={t('password.toggle')}
        />
      </label>

      {enabled && (
        <div className="space-y-1.5">
          <input
            type="password"
            value={password}
            disabled={disabled}
            minLength={4}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder={t('password.placeholder')}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed"
          />
          <p className={error ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
            {error || t('password.helper')}
          </p>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Add locale strings**

In `src/locales/en.ts`, add:

```ts
  password: {
    label: 'Password protection',
    toggle: 'Toggle password protection',
    placeholder: 'Enter at least 4 characters',
    helper: 'Visitors will enter this once per browser session.',
    errorTooShort: 'Password must be at least 4 characters.',
  },
```

In `src/locales/en.ts`, add `passwordProtected` under `result`:

```ts
    passwordProtected: 'Password protected',
```

In `src/locales/zh-TW.ts`, add:

```ts
  password: {
    label: '密碼保護',
    toggle: '切換密碼保護',
    placeholder: '請輸入至少 4 個字元',
    helper: '訪客每個瀏覽器工作階段只需輸入一次。',
    errorTooShort: '密碼至少需要 4 個字元。',
  },
```

In `src/locales/zh-TW.ts`, add `passwordProtected` under `result`:

```ts
    passwordProtected: '已啟用密碼保護',
```

- [ ] **Step 4: Wire password options into `HomePage`**

In `src/pages/HomePage.tsx`, add imports:

```ts
import PasswordOptions from '../components/PasswordOptions';
import { getPasswordValidationError, normalizePasswordOptions } from '../lib/passwordOptions';
import type { UploadOptions } from '@/types';
```

Add state inside `HomePage`:

```ts
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
```

Add this helper before `handleDrop`:

```ts
  const getUploadOptions = useCallback((): UploadOptions | null => {
    const validationError = getPasswordValidationError({ passwordEnabled, password });
    if (validationError === 'tooShort') {
      setPasswordError(t('password.errorTooShort'));
      return null;
    }

    setPasswordError(null);
    return normalizePasswordOptions({ passwordEnabled, password });
  }, [passwordEnabled, password, t]);
```

Add wrapper callbacks before `handleDrop`:

```ts
  const handleUploadFile = useCallback(
    (file: File) => {
      const options = getUploadOptions();
      if (!options) return;
      upload(file, options);
    },
    [getUploadOptions, upload]
  );

  const handleUploadFiles = useCallback(
    (files: Parameters<typeof uploadFiles>[0]) => {
      const options = getUploadOptions();
      if (!options) return;
      uploadFiles(files, options);
    },
    [getUploadOptions, uploadFiles]
  );
```

In `handleDrop`, replace calls to `upload(file)` and `uploadFiles(files)` with `handleUploadFile(file)` and `handleUploadFiles(files)`.

In the dependency list for `handleDrop`, use:

```ts
    [status, handleUploadFile, handleUploadFiles, t]
```

In `handleReset`, reset password state:

```ts
    setPasswordEnabled(false);
    setPassword('');
    setPasswordError(null);
```

Replace the idle `DropZone` render with:

```tsx
            {status === 'idle' && (
              <div className="space-y-3">
                <DropZone
                  onFile={handleUploadFile}
                  onFolder={handleUploadFiles}
                  isDragging={isDragging}
                />
                <PasswordOptions
                  enabled={passwordEnabled}
                  password={password}
                  error={passwordError}
                  onEnabledChange={(enabled) => {
                    setPasswordEnabled(enabled);
                    setPasswordError(null);
                  }}
                  onPasswordChange={(value) => {
                    setPassword(value);
                    setPasswordError(null);
                  }}
                />
              </div>
            )}
```

- [ ] **Step 5: Show protected hint in result card**

In `src/components/ResultCard.tsx`, add `Lock` to the icon import:

```ts
import { Check, Copy, ArrowUpRight, Plus, Lock } from 'lucide-react';
```

After the message block and before the URL box, add:

```tsx
      {result.passwordEnabled && (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Lock className="w-3.5 h-3.5" />
            {t('result.passwordProtected')}
          </span>
        </div>
      )}
```

- [ ] **Step 6: Read protected metadata on `SitePage`**

In `src/pages/SitePage.tsx`, replace the state declaration with:

```ts
  const [state, setState] = useState<'loading' | 'found' | 'notfound'>('loading');
  const [site, setSite] = useState<{ passwordEnabled: boolean } | null>(null);
```

Replace the `getDocs` callback in the effect with:

```ts
    getDocs(q).then((snapshot) => {
      if (snapshot.empty) {
        setState('notfound');
        setSite(null);
        return;
      }

      const data = snapshot.docs[0].data();
      setSite({ passwordEnabled: data.passwordEnabled === true });
      setState('found');
    });
```

Replace the `ResultCard` result object with:

```tsx
              result={{
                siteId: siteId!,
                url: siteUrl,
                passwordEnabled: site?.passwordEnabled === true,
              }}
```

- [ ] **Step 7: Run frontend verification**

Run:

```bash
npm test -- src/lib/passwordOptions.test.ts src/lib/uploadMetadata.test.ts
npm run build
```

Expected: tests PASS and Vite build exits with code 0.

- [ ] **Step 8: Commit UI changes**

Run:

```bash
git add src/types/index.ts src/components/PasswordOptions.tsx src/pages/HomePage.tsx src/pages/SitePage.tsx src/components/ResultCard.tsx src/locales/en.ts src/locales/zh-TW.ts
git commit -m "feat: add upload password UI"
```

Expected: commit succeeds with only frontend UI files staged.

---

### Task 4: Backend Password Helper

**Files:**
- Create: `functions/siteAuth.test.js`
- Create: `functions/siteAuth.js`
- Modify: `functions/package.json`

- [ ] **Step 1: Add functions test script**

In `functions/package.json`, add:

```json
  "scripts": {
    "test": "node --test"
  },
```

Keep the existing `name`, `type`, `engines`, and `dependencies` fields.

- [ ] **Step 2: Write failing backend helper tests**

Create `functions/siteAuth.test.js`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSessionCookie,
  createSessionToken,
  getRequestPassword,
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

test('session tokens are tied to one site and password hash', async () => {
  const hash = await hashPassword('abcd');
  const token = createSessionToken('site123', hash);

  assert.equal(verifySessionToken(token, 'site123', hash), true);
  assert.equal(verifySessionToken(token, 'other-site', hash), false);
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
```

- [ ] **Step 3: Run functions tests to verify they fail**

Run:

```bash
npm --prefix functions test
```

Expected: FAIL because `functions/siteAuth.js` does not exist.

- [ ] **Step 4: Implement backend helper**

Create `functions/siteAuth.js`:

```js
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
  const [algorithm, n, r, p, salt, hash] = String(encodedHash).split('$');
  if (algorithm !== 'scrypt' || !n || !r || !p || !salt || !hash) return false;

  const derivedKey = await scrypt(password, fromBase64Url(salt), KEY_LENGTH, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });

  return safeEqual(toBase64Url(derivedKey), hash);
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
  return Object.fromEntries(
    String(cookieHeader)
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        if (separator === -1) return [part, ''];
        return [
          decodeURIComponent(part.slice(0, separator)),
          decodeURIComponent(part.slice(separator + 1)),
        ];
      })
  );
}

export function getSessionToken(req) {
  return parseCookies(req.headers?.cookie)[COOKIE_NAME] ?? '';
}

export function buildSessionCookie({ siteId, token, secure }) {
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
```

- [ ] **Step 5: Run backend helper tests**

Run:

```bash
npm --prefix functions test
```

Expected: PASS for `functions/siteAuth.test.js`.

- [ ] **Step 6: Commit backend helper**

Run:

```bash
git add functions/package.json functions/siteAuth.js functions/siteAuth.test.js
git commit -m "feat: add site password auth helpers"
```

Expected: commit succeeds with only functions helper files staged.

---

### Task 5: Cloud Function Enforcement

**Files:**
- Modify: `functions/index.js`
- Test: `functions/siteAuth.test.js`

- [ ] **Step 1: Update imports in `functions/index.js`**

Replace the Firestore import with:

```js
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
```

Add:

```js
import {
  MIN_PASSWORD_LENGTH,
  buildSessionCookie,
  createSessionToken,
  getRequestPassword,
  getSessionToken,
  hashPassword,
  renderPasswordPage,
  verifyPassword,
  verifySessionToken,
} from './siteAuth.js';
```

- [ ] **Step 2: Add site metadata and orphan secret helpers**

Add these helpers after `getMimeType`:

```js
async function findSiteBySiteId(siteId) {
  const snapshot = await db.collection('sites')
    .where('siteId', '==', siteId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    docId: doc.id,
    data: doc.data(),
  };
}

async function cleanupOrphanSecrets(cutoff) {
  const secrets = await db.collection('siteSecrets')
    .where('createdAt', '<', cutoff)
    .get();

  await Promise.all(
    secrets.docs.map(async (secretDoc) => {
      const site = await findSiteBySiteId(secretDoc.id);
      if (!site) {
        await secretDoc.ref.delete();
      }
    })
  );
}

function isSecureRequest(req) {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

function sendPasswordPage(res, status, pageHtml) {
  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.status(status).send(pageHtml);
}
```

- [ ] **Step 3: Delete secrets with sites**

Replace `deleteSite` with:

```js
async function deleteSite(siteId, docId) {
  const bucket = getStorage().bucket();
  await bucket.deleteFiles({ prefix: `sites/${siteId}/` });
  await db.collection('siteSecrets').doc(siteId).delete();
  if (docId) {
    await db.collection('sites').doc(docId).delete();
  }
}
```

In both `cleanupExpiredSites` and `prepareUpload`, after deleting expired sites, call:

```js
    await cleanupOrphanSecrets(cutoff);
```

- [ ] **Step 4: Add callable secret creation function**

Add this export before `serveSite`:

```js
export const createSiteSecret = onCall(
  { region: 'asia-east1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '需要登入');
    }

    const { siteId, password } = request.data ?? {};
    if (typeof siteId !== 'string' || !/^[a-z0-9-]+$/i.test(siteId)) {
      throw new HttpsError('invalid-argument', '無效的網站 ID');
    }

    if (typeof password !== 'string' || password.trim().length < MIN_PASSWORD_LENGTH) {
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
```

- [ ] **Step 5: Enforce password checks in `serveSite`**

Inside `serveSite`, after `cleanPath` is computed and before the Storage file is read, add:

```js
  const site = await findSiteBySiteId(siteId);
  if (!site) {
    res.status(404).send('Not found');
    return;
  }

  if (site.data.passwordEnabled === true) {
    const secretSnapshot = await db.collection('siteSecrets').doc(siteId).get();
    if (!secretSnapshot.exists) {
      res.status(500).send('Internal error');
      return;
    }

    const { passwordHash } = secretSnapshot.data();
    if (typeof passwordHash !== 'string') {
      res.status(500).send('Internal error');
      return;
    }

    const sessionToken = getSessionToken(req);
    if (!verifySessionToken(sessionToken, siteId, passwordHash)) {
      if (req.method === 'POST') {
        const submittedPassword = getRequestPassword(req).trim();
        const passwordMatches = await verifyPassword(submittedPassword, passwordHash);

        if (passwordMatches) {
          const token = createSessionToken(siteId, passwordHash);
          res.setHeader(
            'Set-Cookie',
            buildSessionCookie({ siteId, token, secure: isSecureRequest(req) })
          );
          res.redirect(303, req.path);
          return;
        }

        sendPasswordPage(
          res,
          401,
          renderPasswordPage({
            actionPath: req.path,
            error: '密碼錯誤',
          })
        );
        return;
      }

      if (req.method !== 'GET') {
        res.status(405).send('Method not allowed');
        return;
      }

      sendPasswordPage(res, 401, renderPasswordPage({ actionPath: req.path }));
      return;
    }
  }
```

Keep the existing Storage `file.exists()`, `file.download()`, response headers, and error handling after this gate.

- [ ] **Step 6: Run backend tests**

Run:

```bash
npm --prefix functions test
```

Expected: PASS for backend helper tests.

- [ ] **Step 7: Commit function enforcement**

Run:

```bash
git add functions/index.js
git commit -m "feat: enforce site password access"
```

Expected: commit succeeds with only `functions/index.js` staged.

---

### Task 6: Firebase Rule Boundaries

**Files:**
- Modify: `firestore.rules`
- Modify: `storage.rules`
- Create: `functions/securityRules.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing rule boundary tests**

Create `functions/securityRules.test.js`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const firestoreRules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const storageRules = readFileSync(new URL('../storage.rules', import.meta.url), 'utf8');

test('Firestore denies all client access to siteSecrets', () => {
  assert.match(firestoreRules, /match \/siteSecrets\/\{siteId\}/);
  assert.match(firestoreRules, /allow read, write: if false;/);
});

test('Storage denies direct client reads for uploaded site files', () => {
  assert.match(storageRules, /match \/sites\/\{siteId\}\/\{allPaths=\*\*\}/);
  assert.match(storageRules, /allow read: if false;/);
});
```

- [ ] **Step 2: Run rule tests to verify they fail**

Run:

```bash
npm --prefix functions test
```

Expected: FAIL because the rules do not yet include `siteSecrets` denial and Storage still allows public reads.

- [ ] **Step 3: Update Firestore rules**

Replace `firestore.rules` with:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sites/{siteId} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
      allow update, delete: if false;
    }

    match /siteSecrets/{siteId} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 4: Update Storage rules**

Replace `storage.rules` with:

```rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /sites/{siteId}/{allPaths=**} {
      allow read: if false;
      allow write: if request.auth != null
                   && resource == null
                   && request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

- [ ] **Step 5: Make root tests run frontend and functions tests**

In root `package.json`, replace the test script with:

```json
    "test": "vitest run && npm --prefix functions test",
```

- [ ] **Step 6: Run rule and full test suites**

Run:

```bash
npm --prefix functions test
npm test
```

Expected: both commands PASS.

- [ ] **Step 7: Commit rule boundary changes**

Run:

```bash
git add firestore.rules storage.rules functions/securityRules.test.js package.json
git commit -m "feat: protect site storage rules"
```

Expected: commit succeeds with only rules, rule tests, and root package script staged.

---

### Task 7: Full Verification And Regression

**Files:**
- Modify only if verification exposes a concrete defect from prior tasks.

- [ ] **Step 1: Run all automated tests**

Run:

```bash
npm test
```

Expected: Vitest tests PASS and Node functions tests PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: Vite build exits with code 0 and produces `dist/`.

- [ ] **Step 3: Run a local emulator smoke test**

Run in one terminal:

```bash
firebase emulators:start --only auth,functions,firestore,storage,hosting
```

Run in a second terminal:

```bash
npm run dev
```

Expected:

- Upload with password protection off completes and opens `/s/{siteId}/` without a password page.
- Upload with password protection on rejects a password shorter than 4 characters before upload.
- Upload with password protection on accepts a 4-character password and result card shows the protected hint.
- Opening `/s/{siteId}/` for the protected site in a fresh browser session shows the password page.
- Submitting the wrong password stays on the password page.
- Submitting the correct password redirects to `/s/{siteId}/` and sets a session cookie.
- Refreshing the protected page in the same browser session does not ask again.

- [ ] **Step 4: Stop long-running local processes**

Stop the Vite and Firebase emulator terminals with `Ctrl+C`.

Expected: no development server or emulator process is left running.

- [ ] **Step 5: Confirm clean worktree**

Run:

```bash
git status --short
```

Expected: no output.

---

## Plan Self-Review

- Spec coverage: Tasks 1-3 cover upload-time optional password UI, default-off behavior, 4-character minimum, ZIP/folder/single HTML option propagation, and result hint. Tasks 4-5 cover backend hashing, private secrets, session-only cookie, password page, wrong-password handling, correct-password redirect, and protected asset serving. Task 6 covers private `siteSecrets` rules and denied direct Storage reads. Task 7 covers full verification.
- Type consistency: `UploadOptions`, `UploadResult.passwordEnabled`, `PasswordOptionsProps`, `passwordEnabled`, `siteSecrets/{siteId}`, `passwordHash`, and `droplo_site_auth` are named consistently across tasks.
- Scope: The plan does not add post-deploy editing, accounts, dashboards, owner links, password recovery, invite lists, analytics, or persistent remember-me behavior.
