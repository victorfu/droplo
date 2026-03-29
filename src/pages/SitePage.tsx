import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { db } from '../lib/firebase';
import ResultCard from '../components/ResultCard';
import NotFound from '../components/NotFound';
import ThemeToggle from '../components/ThemeToggle';
import Footer from '../components/Footer';
import { Loader2 } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export default function SitePage() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [state, setState] = useState<'loading' | 'found' | 'notfound'>('loading');

  useEffect(() => {
    const q = query(collection(db, 'sites'), where('siteId', '==', siteId));
    getDocs(q).then((snapshot) => {
      setState(snapshot.empty ? 'notfound' : 'found');
    });
  }, [siteId]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === 'notfound') return <NotFound />;

  const siteUrl = `${window.location.origin}/s/${siteId}/`;

  return (
    <div className="min-h-screen bg-background bg-dot-pattern flex flex-col relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, hsl(252 87% 64% / 0.07), transparent)',
        }}
      />
      <ThemeToggle />
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-20 sm:pt-32 pb-8 sm:pb-16">
        <div className="w-full max-w-xl">
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
                {t('common.tagline')}
              </p>
            </header>
            <ResultCard
              result={{ siteId: siteId!, url: siteUrl }}
              onReset={() => navigate('/')}
              animate={false}
            />
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
