import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../lib/i18n';

export default function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const Icon = mode === 'dark' ? Sun : Moon;

  return (
    <div className="fixed top-6 right-6 sm:top-8 sm:right-8 z-[var(--z-theme-toggle)] flex items-center gap-2">
      <motion.button
        onClick={() => setLocale(locale === 'zh-TW' ? 'en' : 'zh-TW')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="glass rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-semibold text-secondary-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 transition-colors"
        aria-label="Toggle language"
      >
        {locale === 'zh-TW' ? 'EN' : '中'}
      </motion.button>
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="glass rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center text-secondary-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 transition-colors"
        aria-label={mode === 'dark' ? t('theme.light') : t('theme.dark')}
      >
        <Icon className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
