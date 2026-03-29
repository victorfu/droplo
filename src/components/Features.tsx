import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Zap, Gift, Shield } from 'lucide-react';
import { useI18n } from '../lib/i18n';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const headingVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function Features() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const { t } = useI18n();

  const features = [
    {
      icon: Zap,
      title: t('features.speed'),
      description: t('features.speedDesc'),
    },
    {
      icon: Gift,
      title: t('features.free'),
      description: t('features.freeDesc'),
    },
    {
      icon: Shield,
      title: t('features.noAccount'),
      description: t('features.noAccountDesc'),
    },
  ];

  return (
    <section ref={ref} className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-14"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={headingVariants}
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t('features.title')}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            {t('features.subtitle')}
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={containerVariants}
        >
          {features.map(({ icon: Icon, title, description }) => (
            <motion.div
              key={title}
              className="glass rounded-2xl p-6 flex flex-col gap-4 cursor-default focus-visible:ring-2 focus-visible:ring-accent outline-none"
              variants={cardVariants}
              whileHover={{ scale: 1.02, y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              tabIndex={0}
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
