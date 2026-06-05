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
