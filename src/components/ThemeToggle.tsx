import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const Icon = mode === 'dark' ? Sun : Moon;

  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-[var(--z-theme-toggle)] glass rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center text-secondary-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 transition-colors"
      aria-label={mode === 'dark' ? '切換至淺色模式' : '切換至深色模式'}
    >
      <Icon className="w-4 h-4" />
    </motion.button>
  );
}
