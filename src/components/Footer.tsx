import { Globe } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border py-10 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start gap-8 sm:gap-12">
        {/* Branding */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">Droplo</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
            {t('footer.description')}
          </p>
        </div>

        {/* Links */}
        <div className="flex gap-12 sm:gap-16">
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('footer.platform')}</h4>
            <ul className="space-y-2">
              <li><a href="/terms" className="text-sm text-foreground hover:text-accent transition-colors">{t('footer.terms')}</a></li>
              <li><a href="/privacy" className="text-sm text-foreground hover:text-accent transition-colors">{t('footer.privacy')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('footer.trust')}</h4>
            <ul className="space-y-2">
              <li><a href="/security" className="text-sm text-foreground hover:text-accent transition-colors">{t('footer.security')}</a></li>
              <li><a href="/status" className="text-sm text-foreground hover:text-accent transition-colors">{t('footer.status')}</a></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="sm:text-right">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Droplo
          </p>
        </div>
      </div>
    </footer>
  );
}
