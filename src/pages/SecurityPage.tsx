import { useI18n } from '../lib/i18n';
import PageLayout from '../components/PageLayout';
import { Shield, Lock, FileCheck, Server } from 'lucide-react';

function SecurityItem({ icon: Icon, title, description }: { icon: typeof Shield; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  const { t } = useI18n();

  return (
    <PageLayout title={t('security.title')}>
      <p>{t('security.intro')}</p>

      <div className="space-y-6 mt-6">
        <SecurityItem
          icon={Shield}
          title={t('security.auth')}
          description={t('security.authDesc')}
        />
        <SecurityItem
          icon={Lock}
          title={t('security.access')}
          description={t('security.accessDesc')}
        />
        <SecurityItem
          icon={FileCheck}
          title={t('security.fileValidation')}
          description={t('security.fileValidationDesc')}
        />
        <SecurityItem
          icon={Server}
          title={t('security.contentSecurity')}
          description={t('security.contentSecurityDesc')}
        />
      </div>

      <h2 className="text-lg font-semibold text-foreground mt-8">{t('security.reportTitle')}</h2>
      <p>{t('security.reportBody')}</p>
    </PageLayout>
  );
}
