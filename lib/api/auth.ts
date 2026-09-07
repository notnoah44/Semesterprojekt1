import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

/**
 * Sends a fresh "verify your email" link. Uses a magic link rather than
 * `auth.resend({ type: 'signup' })` because "Confirm email" is disabled in
 * Supabase Auth — signups are auto-confirmed there, so GoTrue no longer
 * considers the account "unconfirmed" and would reject a signup-type resend.
 * A magic link works for any existing, already-signed-in user regardless of
 * that status; app/auth/callback.tsx marks our own `profiles.email_verified`
 * flag once the link is opened.
 */
export async function sendVerificationEmail(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: Linking.createURL('auth/callback'),
    },
  });
}
