import { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';
import PageLayout from '../components/PageLayout';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

type ServiceStatus = 'checking' | 'operational' | 'down';

function StatusBadge({ status }: { status: ServiceStatus }) {
  if (status === 'checking') {
    return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  }
  if (status === 'operational') {
    return <CheckCircle2 className="w-4 h-4 text-success" />;
  }
  return <XCircle className="w-4 h-4 text-destructive" />;
}

function StatusRow({ name, status, labels }: { name: string; status: ServiceStatus; labels: { checking: string; operational: string; down: string } }) {
  const label = status === 'checking' ? labels.checking : status === 'operational' ? labels.operational : labels.down;
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-foreground">{name}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

export default function StatusPage() {
  const { t } = useI18n();
  const [firestore, setFirestore] = useState<ServiceStatus>('checking');

  const labels = {
    checking: t('status.checking'),
    operational: t('status.operational'),
    down: t('status.down'),
  };

  useEffect(() => {
    const q = query(collection(db, 'sites'), limit(1));
    getDocs(q)
      .then(() => setFirestore('operational'))
      .catch(() => setFirestore('down'));
  }, []);

  return (
    <PageLayout title={t('status.title')}>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <StatusRow name="Firebase Hosting" status="operational" labels={labels} />
        <StatusRow name="Cloud Functions" status="operational" labels={labels} />
        <StatusRow name="Firestore Database" status={firestore} labels={labels} />
        <StatusRow name="Cloud Storage" status="operational" labels={labels} />
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        {t('status.note')}
      </p>
    </PageLayout>
  );
}
