export type AuthErrorKey =
  | 'userAlreadyRegistered'
  | 'invalidCredentials'
  | 'weakPassword'
  | 'emailNotConfirmed'
  | 'rateLimited'
  | 'generic';

/** Maps a raw Supabase Auth error message to an i18n key under `errors.auth.*`. */
export function mapAuthErrorKey(message: string | undefined | null): AuthErrorKey {
  const msg = (message ?? '').toLowerCase();
  if (msg.includes('already registered') || msg.includes('already exists')) return 'userAlreadyRegistered';
  if (msg.includes('invalid login credentials')) return 'invalidCredentials';
  if (msg.includes('password should be at least') || msg.includes('password is too short')) return 'weakPassword';
  if (msg.includes('email not confirmed')) return 'emailNotConfirmed';
  if (msg.includes('rate limit') || msg.includes('for security purposes')) return 'rateLimited';
  return 'generic';
}
