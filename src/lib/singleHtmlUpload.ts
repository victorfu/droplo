import type { FileEntry } from '@/types';

export function createSingleHtmlEntry(file: File): FileEntry | null {
  const fileName = file.name.toLowerCase();
  const isHtml =
    file.type === 'text/html' ||
    fileName.endsWith('.html') ||
    fileName.endsWith('.htm');

  if (!isHtml) return null;

  return {
    path: 'index.html',
    file,
  };
}
