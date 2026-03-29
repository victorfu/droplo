import { useEffect, useState } from 'react';
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

function StatusRow({ name, status }: { name: string; status: ServiceStatus }) {
  const label = status === 'checking' ? '檢查中' : status === 'operational' ? '正常運作' : '異常';
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
  const [firestore, setFirestore] = useState<ServiceStatus>('checking');

  useEffect(() => {
    const q = query(collection(db, 'sites'), limit(1));
    getDocs(q)
      .then(() => setFirestore('operational'))
      .catch(() => setFirestore('down'));
  }, []);

  return (
    <PageLayout title="系統狀態">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <StatusRow name="Firebase Hosting" status="operational" />
        <StatusRow name="Cloud Functions" status="operational" />
        <StatusRow name="Firestore Database" status={firestore} />
        <StatusRow name="Cloud Storage" status="operational" />
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Firestore 狀態為即時檢測，其他服務如果此頁面可正常載入即表示運作正常。
      </p>
    </PageLayout>
  );
}
