import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PasswordOptions from './PasswordOptions';

vi.mock('../lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('PasswordOptions', () => {
  it('links the password input to accessible status text', () => {
    const html = renderToStaticMarkup(
      <PasswordOptions
        enabled
        password="abc"
        error="Password must be at least 4 characters."
        onEnabledChange={() => undefined}
        onPasswordChange={() => undefined}
      />
    );

    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];

    expect(html).toContain('aria-label="password.label"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="polite"');
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`id="${describedBy}"`);
  });
});
