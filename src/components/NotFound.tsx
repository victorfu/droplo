import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
      <p className="text-7xl font-bold bg-gradient-to-b from-muted-foreground/80 to-muted-foreground/20 bg-clip-text text-transparent">
        {t('notFound.code')}
      </p>
      <p className="text-muted-foreground text-sm">
        {t('notFound.message')}
      </p>
      <Link
        to="/"
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition-all duration-200"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('notFound.goHome')}
      </Link>
    </div>
  );
}
