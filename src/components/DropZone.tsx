import { useRef } from 'react';
import { Upload, FolderOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import type { DropZoneProps } from '@/types';

export default function DropZone({ onFile, onFolder, isDragging = false }: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleZipInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  const handleFolderInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    const files = [...fileList]
      .filter((f) => !f.name.startsWith('.') && !f.webkitRelativePath.includes('__MACOSX'))
      .map((f) => ({
        path: f.webkitRelativePath.replace(/^[^/]+\//, ''),
        file: f,
      }));

    onFolder(files);
  };

  return (
    <div className="space-y-3">
      {/* Drop area */}
      <div
        className={cn(
          'relative rounded-2xl glass border-accent/[0.12] p-10 sm:p-16 text-center transition-all duration-300 cursor-pointer group focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2',
          isDragging && 'glow-accent'
        )}
        onClick={() => fileInputRef.current?.click()}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleZipInput}
        />
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          className="hidden"
          onChange={handleFolderInput}
        />

        <div className="flex flex-col items-center gap-4 sm:gap-5">
          <div
            className={cn(
              'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-300',
              isDragging
                ? 'bg-accent/20 scale-110'
                : 'bg-secondary/50 group-hover:bg-accent/15'
            )}
          >
            {isDragging ? (
              <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            ) : (
              <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-secondary-foreground group-hover:text-accent transition-colors" />
            )}
          </div>

          <div>
            <p className="text-sm sm:text-[15px] font-medium text-foreground">
              {isDragging ? '放開以開始上傳' : '拖曳資料夾或 ZIP 檔案到此處'}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
              或點擊選擇 ZIP 檔案
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="inline-flex items-center rounded-full glass px-2.5 py-0.5 text-[11px] text-secondary-foreground font-medium">
              .zip
            </span>
            <span className="inline-flex items-center rounded-full glass px-2.5 py-0.5 text-[11px] text-secondary-foreground font-medium">
              資料夾
            </span>
            <span className="text-[11px] text-muted-foreground ml-1">
              需包含 index.html
            </span>
          </div>
        </div>
      </div>

      {/* Folder button */}
      <button
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          folderInputRef.current?.click();
        }}
        className="w-full rounded-xl glass hover:border-accent/50 px-4 py-3 text-sm text-secondary-foreground hover:text-foreground transition-all duration-200 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
      >
        <FolderOpen className="w-4 h-4" />
        選擇資料夾上傳
      </button>
    </div>
  );
}
