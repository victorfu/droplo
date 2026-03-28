export type UploadStatus = 'idle' | 'unzipping' | 'uploading' | 'saving' | 'done' | 'error';

export interface UploadProgress {
  current: number;
  total: number;
  fileName: string;
}

export interface UploadResult {
  siteId: string;
  url: string;
}

export interface UseUploadReturn {
  status: UploadStatus;
  progress: UploadProgress;
  result: UploadResult | null;
  error: string | null;
  upload: (file: File) => Promise<void>;
  uploadFiles: (fileList: FileEntry[]) => Promise<void>;
  reset: () => void;
}

export interface DropZoneProps {
  onFile: (file: File) => void;
  onFolder: (files: FileEntry[]) => void;
  isDragging?: boolean;
}

export interface ResultCardProps {
  result: UploadResult;
  onReset: () => void;
}

export interface UploadProgressProps {
  status: UploadStatus;
  progress: UploadProgress;
}

export interface SiteViewerProps {
  siteId: string;
}

export type ThemeMode = 'light' | 'dark';

export interface UseThemeReturn {
  mode: ThemeMode;
  toggle: () => void;
}

export interface SiteMeta {
  siteId: string;
  fileCount: number;
  originalName: string;
  createdAt: unknown;
}

export interface FileEntry {
  path: string;
  file: File | ArrayBuffer;
}

export type ProgressCallback = (info: {
  stage: 'unzipping' | 'uploading' | 'saving';
  current?: number;
  total?: number;
  fileName?: string;
}) => void;

// Module augmentation for non-standard HTML attribute used in DropZone folder picker
declare module 'react' {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
  }
}
