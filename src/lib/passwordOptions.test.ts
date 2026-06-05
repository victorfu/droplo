import { describe, expect, it } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  getPasswordValidationError,
  normalizePasswordOptions,
} from './passwordOptions';

describe('passwordOptions', () => {
  it('keeps password protection disabled by default', () => {
    expect(normalizePasswordOptions()).toEqual({ passwordEnabled: false });
    expect(normalizePasswordOptions({ passwordEnabled: false, password: 'abcd' })).toEqual({
      passwordEnabled: false,
    });
  });

  it('requires at least 4 trimmed characters when enabled', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(4);
    expect(getPasswordValidationError({ passwordEnabled: true, password: 'abc' })).toBe(
      'tooShort'
    );
    expect(() =>
      normalizePasswordOptions({ passwordEnabled: true, password: 'abc' })
    ).toThrow('PASSWORD_TOO_SHORT');
  });

  it('normalizes enabled passwords by trimming surrounding whitespace', () => {
    expect(normalizePasswordOptions({ passwordEnabled: true, password: '  abcd  ' })).toEqual({
      passwordEnabled: true,
      password: 'abcd',
    });
    expect(getPasswordValidationError({ passwordEnabled: true, password: '  abcd  ' })).toBeNull();
  });
});
