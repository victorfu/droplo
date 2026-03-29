import JSZip from 'jszip';
import { ref, uploadBytes } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { storage, db, waitForAuth, functions } from './firebase';
import { generateSiteId, getMimeType, isAllowedFile } from './utils';
import type { FileEntry, ProgressCallback } from '@/types';

const MAX_SITE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILE_COUNT = 500;

async function ensureQuota(estimatedSize: number): Promise<void> {
  const prepareUpload = httpsCallable<{ estimatedSize: number }, { ok: boolean; reason?: string }>(functions, 'prepareUpload');
  const { data } = await prepareUpload({ estimatedSize });
  if (!data.ok) {
    throw new Error(data.reason || '儲存空間不足');
  }
}

async function readAllEntries(dirReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = [];
  let batch: FileSystemEntry[];
  do {
    batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      dirReader.readEntries(resolve, reject)
    );
    entries.push(...batch);
  } while (batch.length > 0);
  return entries;
}

async function traverseEntry(entry: FileSystemEntry, basePath = ''): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve, reject) =>
      fileEntry.file(resolve, reject)
    );
    const path = basePath ? `${basePath}/${entry.name}` : entry.name;
    files.push({ path, file });
  } else if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const dirReader = dirEntry.createReader();
    const entries = await readAllEntries(dirReader);
    const subPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    for (const child of entries) {
      files.push(...(await traverseEntry(child, subPath)));
    }
  }
  return files;
}

export async function readDroppedFolder(dataTransfer: DataTransfer): Promise<FileEntry[]> {
  const items = [...dataTransfer.items];
  const allFiles: FileEntry[] = [];

  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      allFiles.push(...(await traverseEntry(entry)));
    }
  }

  return filterFiles(allFiles);
}

function filterFiles(fileList: FileEntry[]): FileEntry[] {
  return fileList.filter(
    ({ path }) => !path.includes('.DS_Store') && !path.startsWith('__MACOSX')
  );
}

function findPrefix(files: FileEntry[]): string | null {
  const indexFile = files.find(
    ({ path }) => path === 'index.html' || path.endsWith('/index.html')
  );
  if (!indexFile) return null;
  if (indexFile.path === 'index.html') return '';
  return indexFile.path.replace('index.html', '');
}

async function uploadFilesToStorage(
  files: FileEntry[],
  siteId: string,
  onProgress: ProgressCallback
): Promise<void> {
  let uploaded = 0;
  const prefix = findPrefix(files);

  if (prefix === null) {
    throw new Error('找不到 index.html');
  }

  const concurrency = 3;
  let index = 0;

  async function next(): Promise<void> {
    while (index < files.length) {
      const i = index++;
      const { path, file } = files[i];
      const cleanPath = prefix ? path.replace(prefix, '') : path;
      const storageRef = ref(storage, `sites/${siteId}/${cleanPath}`);
      const content = file instanceof File ? await file.arrayBuffer() : file;

      await uploadBytes(storageRef, content, {
        contentType: getMimeType(path),
        cacheControl: 'public, max-age=3600',
      });

      uploaded++;
      onProgress({
        stage: 'uploading',
        current: uploaded,
        total: files.length,
        fileName: cleanPath,
      });
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => next());
  await Promise.all(workers);
}

export async function uploadSite(
  zipFile: File,
  onProgress: ProgressCallback
): Promise<{ siteId: string; url: string }> {
  const user = await waitForAuth();
  onProgress({ stage: 'unzipping', current: 0, total: 0 });
  const zip = await JSZip.loadAsync(zipFile);

  const entries = Object.entries(zip.files).filter(
    ([path, file]) => !file.dir && !path.startsWith('__MACOSX/') && !path.includes('.DS_Store')
  );

  if (entries.length === 0) {
    throw new Error('ZIP 檔案裡沒有可上傳的檔案');
  }

  const files: FileEntry[] = await Promise.all(
    entries.map(async ([path, file]) => ({
      path,
      file: await file.async('arraybuffer'),
    }))
  );

  const allowedFiles = files.filter(({ path }) => isAllowedFile(path));

  if (allowedFiles.length === 0) {
    throw new Error('沒有可上傳的檔案（僅支援網頁靜態資源）');
  }

  if (allowedFiles.length > MAX_FILE_COUNT) {
    throw new Error(`檔案數量超過上限（最多 ${MAX_FILE_COUNT} 個）`);
  }
  const totalSize = allowedFiles.reduce((sum, { file }) => sum + (file instanceof ArrayBuffer ? file.byteLength : 0), 0);
  if (totalSize > MAX_SITE_SIZE) {
    throw new Error(`網站總大小超過上限（最大 50MB）`);
  }

  await ensureQuota(totalSize);

  const siteId = generateSiteId();
  await uploadFilesToStorage(allowedFiles, siteId, onProgress);

  onProgress({ stage: 'saving' });
  await addDoc(collection(db, 'sites'), {
    siteId,
    uid: user.uid,
    fileCount: allowedFiles.length,
    totalSize,
    originalName: zipFile.name,
    createdAt: serverTimestamp(),
  });

  const siteUrl = `${window.location.origin}/s/${siteId}/`;
  return { siteId, url: siteUrl };
}

export async function uploadFolder(
  fileList: FileEntry[],
  onProgress: ProgressCallback
): Promise<{ siteId: string; url: string }> {
  const user = await waitForAuth();
  const files = filterFiles(fileList);

  const allowedFiles = files.filter(({ path }) => isAllowedFile(path));

  if (allowedFiles.length === 0) {
    throw new Error('沒有可上傳的檔案（僅支援網頁靜態資源）');
  }

  if (allowedFiles.length > MAX_FILE_COUNT) {
    throw new Error(`檔案數量超過上限（最多 ${MAX_FILE_COUNT} 個）`);
  }
  const totalSize = allowedFiles.reduce((sum, { file }) => {
    if (file instanceof File) return sum + file.size;
    if (file instanceof ArrayBuffer) return sum + file.byteLength;
    return sum;
  }, 0);
  if (totalSize > MAX_SITE_SIZE) {
    throw new Error(`網站總大小超過上限（最大 50MB）`);
  }

  await ensureQuota(totalSize);

  const prefix = findPrefix(allowedFiles);
  if (prefix === null) {
    throw new Error('資料夾裡找不到 index.html');
  }

  const siteId = generateSiteId();
  onProgress({ stage: 'uploading', current: 0, total: allowedFiles.length });
  await uploadFilesToStorage(allowedFiles, siteId, onProgress);

  onProgress({ stage: 'saving' });
  await addDoc(collection(db, 'sites'), {
    siteId,
    uid: user.uid,
    fileCount: allowedFiles.length,
    totalSize,
    originalName: 'folder-upload',
    createdAt: serverTimestamp(),
  });

  const siteUrl = `${window.location.origin}/s/${siteId}/`;
  return { siteId, url: siteUrl };
}
