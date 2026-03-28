import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpload } from '../hooks/useUpload';
import DropZone from '../components/DropZone';
import UploadProgress from '../components/UploadProgress';
import ResultCard from '../components/ResultCard';
import ThemeToggle from '../components/ThemeToggle';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Footer from '../components/Footer';
import { FolderOpen } from 'lucide-react';
import { readDroppedFolder } from '../lib/upload';

export default function HomePage() {
  const { status, progress, result, error, upload, uploadFiles, reset } = useUpload();
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);

      if (status !== 'idle') return;

      const items = [...(e.dataTransfer.items || [])];
      const firstEntry = items[0]?.webkitGetAsEntry?.();

      if (firstEntry?.isDirectory) {
        const files = await readDroppedFolder(e.dataTransfer);
        uploadFiles(files);
        return;
      }

      const file = e.dataTransfer.files[0];
      if (file?.type === 'application/zip' || file?.name.endsWith('.zip')) {
        upload(file);
      } else {
        alert('請拖曳資料夾或 .zip 檔案');
      }
    },
    [status, upload, uploadFiles]
  );

  const handleReset = useCallback(() => {
    setIsDragging(false);
    dragCounter.current = 0;
    reset();
  }, [reset]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current++;
    if (status === 'idle') setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  return (
    <div
      className="min-h-screen bg-background bg-dot-pattern flex flex-col relative"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {/* Radial gradient accent overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, hsl(252 87% 64% / 0.07), transparent)',
        }}
      />

      {/* Full-screen drag overlay */}
      <AnimatePresence>
        {isDragging && status === 'idle' && (
          <motion.div
            key="drag-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[var(--z-drag-overlay)] flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-3xl bg-accent/15 flex items-center justify-center animate-pulse">
                <FolderOpen className="w-10 h-10 text-accent" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">放開以上傳</p>
                <p className="text-sm text-muted-foreground mt-1">
                  支援資料夾或 .zip 檔案
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating theme toggle */}
      <ThemeToggle />

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-20 sm:pt-32 pb-8 sm:pb-16">
        <div className="w-full max-w-xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <header className="mb-8 sm:mb-10 text-center">
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight hero-gradient">
                Droplo
              </h1>
              <p className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-base leading-relaxed">
                拖曳資料夾或 ZIP，幾秒內上線你的靜態網站
              </p>
            </header>

            {/* Content */}
            {status === 'idle' && (
              <DropZone onFile={upload} onFolder={uploadFiles} isDragging={isDragging} />
            )}

            {(status === 'unzipping' || status === 'uploading' || status === 'saving') && (
              <UploadProgress status={status} progress={progress} />
            )}

            {status === 'done' && result && <ResultCard result={result} onReset={handleReset} />}

            {status === 'error' && (
              <div className="rounded-2xl gradient-border bg-card p-6 sm:p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-destructive text-lg font-semibold">!</span>
                </div>
                <p className="text-[15px] font-medium text-foreground mb-1">上傳失敗</p>
                <p className="text-sm text-muted-foreground mb-6">{error}</p>
                <button
                  onClick={handleReset}
                  className="text-sm text-accent hover:text-accent/80 transition-colors font-medium rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 min-h-[44px] px-2"
                >
                  重新上傳
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <Features />
      <HowItWorks />
      <Footer />
    </div>
  );
}
