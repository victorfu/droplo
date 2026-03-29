import { useI18n } from '../lib/i18n';
import { en } from '../locales/en';
import { zhTW } from '../locales/zh-TW';
import PageLayout from '../components/PageLayout';

export default function TermsPage() {
  const { t, locale } = useI18n();
  const items = locale === 'zh-TW' ? zhTW.terms.s2Items : en.terms.s2Items;

  return (
    <PageLayout title={t('terms.title')}>
      <p className="text-muted-foreground text-sm">{t('terms.updated')}</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">{t('terms.s1Title')}</h2>
      <p>{t('terms.s1Body')}</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">{t('terms.s2Title')}</h2>
      <ul className="list-disc pl-5 space-y-1">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      <h2 className="text-lg font-semibold text-foreground mt-6">{t('terms.s3Title')}</h2>
      <p>{t('terms.s3Body')}</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">{t('terms.s4Title')}</h2>
      <p>{t('terms.s4Body')}</p>

      <h2 className="text-lg font-semibold text-foreground mt-6">{t('terms.s5Title')}</h2>
      <p>{t('terms.s5Body')}</p>
    </PageLayout>
  );
}
