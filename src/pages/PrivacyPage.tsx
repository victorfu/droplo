import { useI18n } from '../lib/i18n';
import PageLayout from '../components/PageLayout';

export default function PrivacyPage() {
  const { t } = useI18n();

  return (
    <PageLayout title={t('privacy.title')}>
      <p className="text-muted-foreground text-sm">{t('privacy.updated')}</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">{t('privacy.s1Title')}</h2>
      <p>{t('privacy.s1Body')}</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">{t('privacy.s2Title')}</h2>
      <p>{t('privacy.s2Body')}</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">{t('privacy.s3Title')}</h2>
      <p>{t('privacy.s3Body')}</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">{t('privacy.s4Title')}</h2>
      <p>{t('privacy.s4Body')}</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">{t('privacy.s5Title')}</h2>
      <p>{t('privacy.s5Body')}</p>
    </PageLayout>
  );
}
