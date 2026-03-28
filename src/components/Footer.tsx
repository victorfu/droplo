import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Globe, Flame } from 'lucide-react';

export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.footer
      ref={ref}
      className="border-t border-white/10 py-8 px-6"
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        {/* Branding */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">Droplo</span>
        </div>

        {/* Built with Firebase */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Built with</span>
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span>Firebase</span>
        </div>
      </div>
    </motion.footer>
  );
}
