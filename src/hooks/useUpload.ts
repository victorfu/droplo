import { useState, useCallback } from 'react';
import { uploadSite, uploadFolder } from '../lib/upload';
import type { UploadStatus, UploadProgress, UploadResult, UseUploadReturn, FileEntry } from '@/types';

export function useUpload(): UseUploadReturn {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<UploadProgress>({ current: 0, total: 0, fileName: '' });
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProgress = ({
    stage,
    current,
    total,
    fileName,
  }: {
    stage: UploadStatus;
    current?: number;
    total?: number;
    fileName?: string;
  }) => {
    setStatus(stage);
    setProgress({ current: current ?? 0, total: total ?? 0, fileName: fileName ?? '' });
  };

  const upload = useCallback(async (file: File) => {
    setStatus('unzipping');
    setError(null);
    setResult(null);

    try {
      const { siteId, url } = await uploadSite(file, handleProgress);
      setResult({ siteId, url });
      setStatus('done');
    } catch (err) {
      console.error('[Droplo] Upload failed:', err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  const uploadFiles = useCallback(async (fileList: FileEntry[]) => {
    setStatus('uploading');
    setError(null);
    setResult(null);

    try {
      const { siteId, url } = await uploadFolder(fileList, handleProgress);
      setResult({ siteId, url });
      setStatus('done');
    } catch (err) {
      console.error('[Droplo] Folder upload failed:', err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress({ current: 0, total: 0, fileName: '' });
    setResult(null);
    setError(null);
  }, []);

  return { status, progress, result, error, upload, uploadFiles, reset };
}
