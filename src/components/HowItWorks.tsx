import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Upload, Rocket, Link } from 'lucide-react';
import { useI18n } from '../lib/i18n';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
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

export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const { t } = useI18n();

  const steps = [
    {
      number: 1,
      icon: Upload,
      title: t('howItWorks.step1'),
      description: t('howItWorks.step1Desc'),
    },
    {
      number: 2,
      icon: Rocket,
      title: t('howItWorks.step2'),
      description: t('howItWorks.step2Desc'),
    },
    {
      number: 3,
      icon: Link,
      title: t('howItWorks.step3'),
      description: t('howItWorks.step3Desc'),
    },
  ];

  return (
    <section ref={ref} className="py-24 px-6 bg-secondary/20">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-14"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={headingVariants}
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t('howItWorks.title')}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            {t('howItWorks.subtitle')}
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-0"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={containerVariants}
        >
          {steps.map(({ number, icon: Icon, title, description }, index) => (
            <motion.div
              key={number}
              className="flex md:flex-col items-start md:items-center gap-5 md:gap-4 md:flex-1 relative"
              variants={itemVariants}
            >
              {/* Connector line (desktop) */}
              {index < steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-6 left-[calc(50%+2.5rem)] right-[calc(-50%+2.5rem)] h-px bg-border"
                  aria-hidden="true"
                />
              )}

              {/* Connector line (mobile) */}
              {index < steps.length - 1 && (
                <div
                  className="md:hidden absolute left-6 top-16 bottom-[-2rem] w-px bg-border"
                  aria-hidden="true"
                />
              )}

              {/* Number badge */}
              <div className="relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, hsl(252 87% 64%), hsl(280 87% 64%))' }}
              >
                {number}
              </div>

              {/* Content */}
              <div className="md:text-center pt-1 md:pt-0 pb-8 md:pb-0 md:px-4">
                <div className="flex items-center gap-2 md:justify-center mb-2">
                  <Icon className="w-4 h-4 text-accent shrink-0" />
                  <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
