import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import type { UploadProgressProps } from '@/types';

export default function UploadProgress({ status, progress }: UploadProgressProps) {
  const { t } = useI18n();

  const STAGE_LABELS: Record<string, string> = {
    unzipping: t('upload.unzipping'),
    uploading: t('upload.uploading'),
    saving: t('upload.saving'),
  };

  const STAGE_DESC: Record<string, string> = {
    unzipping: t('upload.unzippingDesc'),
    uploading: t('upload.uploadingDesc'),
    saving: t('upload.savingDesc'),
  };
  const percent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl gradient-border bg-card p-6 sm:p-10 space-y-6 sm:space-y-8"
    >
      {/* Spinner */}
      <div className="flex justify-center">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-accent" />
        </div>
      </div>

      {/* Label with crossfade transition between stages */}
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-sm sm:text-[15px] font-medium text-foreground"
          >
            {STAGE_LABELS[status]}
          </motion.p>
        </AnimatePresence>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {status === 'uploading'
            ? `${progress.current} / ${progress.total} ${t('upload.files')}`
            : STAGE_DESC[status]}
        </p>
      </div>

      {/* Progress bar */}
      {status === 'uploading' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate max-w-[180px] sm:max-w-[260px]">
              {progress.fileName}
            </span>
            <span className="tabular-nums ml-2 font-medium text-foreground/70">{percent}%</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${percent}%`,
                background: 'var(--accent-gradient)',
                backgroundSize: '200%',
                animation: 'gradient-shift 2s ease infinite',
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
