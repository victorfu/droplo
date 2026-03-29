import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, ArrowUpRight, Plus } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import type { ResultCardProps } from '@/types';

const CONFETTI_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a78bfa', '#60a5fa', '#818cf8'];

function runConfetti(container: HTMLDivElement) {
  const canvas = document.createElement('canvas');
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;border-radius:inherit;';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;

  const particles = Array.from({ length: 50 }, () => ({
    x: canvas.width * 0.5 + (Math.random() - 0.5) * canvas.width * 0.4,
    y: canvas.height * 0.25,
    vx: (Math.random() - 0.5) * 7,
    vy: Math.random() * -6 - 2,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: Math.random() * 6 + 3,
    alpha: 1,
  }));

  const start = performance.now();
  let rafId: number;

  function draw(now: number) {
    const elapsed = (now - start) / 2000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18; // gravity
      p.alpha = Math.max(0, 1 - elapsed);

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (elapsed < 1) {
      rafId = requestAnimationFrame(draw);
    }
  }

  rafId = requestAnimationFrame(draw);
  const timer = setTimeout(() => canvas.remove(), 2100);

  return () => {
    cancelAnimationFrame(rafId);
    clearTimeout(timer);
    if (canvas.parentNode) canvas.remove();
  };
}

export default function ResultCard({ result, onReset, animate = true }: ResultCardProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animate || !cardRef.current) return;
    return runConfetti(cardRef.current);
  }, [animate]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={animate ? { scale: 0.95, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={animate ? { type: 'spring', stiffness: 300, damping: 25 } : { duration: 0 }}
      className="rounded-2xl gradient-border bg-card p-6 sm:p-10 space-y-6 sm:space-y-8"
    >
      {/* Success icon */}
      <div className="flex justify-center">
        <motion.div
          initial={animate ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={animate ? { type: 'spring', stiffness: 200, damping: 10, delay: 0.1 } : { duration: 0 }}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-success/10 flex items-center justify-center"
        >
          <Check className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
        </motion.div>
      </div>

      {/* Message */}
      <div className="text-center">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">{t('result.title')}</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {t('result.description')}
        </p>
      </div>

      {/* URL box */}
      <motion.div
        initial={animate ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={animate ? { delay: 0.3 } : { duration: 0 }}
        className="group flex items-center gap-2 bg-background rounded-xl px-3 sm:px-4 py-3 border border-border hover:border-accent/30 transition-colors"
      >
        <span className="flex-1 text-xs sm:text-sm font-mono text-foreground truncate">
          {result.url}
        </span>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCopy}
          className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          aria-label={t('result.copyUrl')}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </motion.button>
      </motion.div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <motion.a
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
        >
          {t('result.openSite')}
          <ArrowUpRight className="w-3.5 h-3.5" />
        </motion.a>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('result.uploadMore')}
        </motion.button>
      </div>
    </motion.div>
  );
}
