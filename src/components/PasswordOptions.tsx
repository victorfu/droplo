import { useId } from 'react';
import { Lock } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import type { PasswordOptionsProps } from '@/types';

export default function PasswordOptions({
  enabled,
  password,
  error,
  disabled = false,
  onEnabledChange,
  onPasswordChange,
}: PasswordOptionsProps) {
  const { t } = useI18n();
  const passwordDescriptionId = useId();

  return (
    <section className="rounded-xl glass px-4 py-3 space-y-3">
      <label className="flex items-center justify-between gap-3 text-sm text-foreground">
        <span className="inline-flex items-center gap-2 font-medium">
          <Lock className="w-4 h-4 text-muted-foreground" />
          {t('password.label')}
        </span>
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          className="h-5 w-5 rounded border-border accent-[hsl(252_87%_64%)] disabled:cursor-not-allowed"
          aria-label={t('password.toggle')}
        />
      </label>

      {enabled && (
        <div className="space-y-1.5">
          <input
            type="password"
            value={password}
            disabled={disabled}
            minLength={4}
            aria-label={t('password.label')}
            aria-describedby={passwordDescriptionId}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder={t('password.placeholder')}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 disabled:cursor-not-allowed"
          />
          <p
            id={passwordDescriptionId}
            role={error ? 'alert' : undefined}
            aria-live={error ? 'polite' : undefined}
            className={error ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
          >
            {error || t('password.helper')}
          </p>
        </div>
      )}
    </section>
  );
}
