import JSZip from 'jszip';
import { ref, uploadBytes } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from './firebase';
import { generateSiteId, getMimeType } from './utils';
import type { FileEntry, ProgressCallback } from '@/types';

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
      const files = await traverseEntry(entry, '');
      allFiles.push(...files);
    }
  }

  return allFiles.filter(
    ({ path }) => !path.includes('.DS_Store') && !path.startsWith('__MACOSX')
  );
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
  onProgress({ stage: 'unzipping', current: 0, total: 0 });
  const zip = await JSZip.loadAsync(zipFile);

  const entries = Object.entries(zip.files).filter(([path, file]) => {
    if (file.dir) return false;
    if (path.startsWith('__MACOSX/')) return false;
    if (path.includes('.DS_Store')) return false;
    return true;
  });

  if (entries.length === 0) {
    throw new Error('ZIP 檔案裡沒有可上傳的檔案');
  }

  const files: FileEntry[] = await Promise.all(
    entries.map(async ([path, file]) => ({
      path,
      file: await file.async('arraybuffer'),
    }))
  );

  const siteId = generateSiteId();
  await uploadFilesToStorage(files, siteId, onProgress);

  onProgress({ stage: 'saving' });
  await addDoc(collection(db, 'sites'), {
    siteId,
    fileCount: files.length,
    originalName: zipFile.name,
    createdAt: serverTimestamp(),
  });

  const siteUrl = `${window.location.origin}/${siteId}`;
  return { siteId, url: siteUrl };
}

export async function uploadFolder(
  fileList: FileEntry[],
  onProgress: ProgressCallback
): Promise<{ siteId: string; url: string }> {
  const files = filterFiles(fileList);

  if (files.length === 0) {
    throw new Error('資料夾裡沒有可上傳的檔案');
  }

  const prefix = findPrefix(files);
  if (prefix === null) {
    throw new Error('資料夾裡找不到 index.html');
  }

  const siteId = generateSiteId();
  onProgress({ stage: 'uploading', current: 0, total: files.length });
  await uploadFilesToStorage(files, siteId, onProgress);

  onProgress({ stage: 'saving' });
  await addDoc(collection(db, 'sites'), {
    siteId,
    fileCount: files.length,
    originalName: 'folder-upload',
    createdAt: serverTimestamp(),
  });

  const siteUrl = `${window.location.origin}/${siteId}`;
  return { siteId, url: siteUrl };
}
