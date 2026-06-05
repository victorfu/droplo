import type { UploadOptions } from '@/types';

export const MIN_PASSWORD_LENGTH = 4;

export type PasswordValidationError = 'tooShort';

export interface PasswordOptionsInput {
  passwordEnabled: boolean;
  password: string;
}

export function getPasswordValidationError(
  input: Partial<PasswordOptionsInput> | undefined
): PasswordValidationError | null {
  if (!input?.passwordEnabled) return null;
  return (input.password ?? '').trim().length >= MIN_PASSWORD_LENGTH ? null : 'tooShort';
}

export function normalizePasswordOptions(input?: Partial<PasswordOptionsInput>): UploadOptions {
  if (!input?.passwordEnabled) {
    return { passwordEnabled: false };
  }

  const password = (input.password ?? '').trim();
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error('PASSWORD_TOO_SHORT');
  }

  return { passwordEnabled: true, password };
}
