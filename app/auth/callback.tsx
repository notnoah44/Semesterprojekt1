import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { markEmailVerified } from '@/lib/api/profiles';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

// Reached via the deep link Supabase redirects to after a user taps the
// verification link sent by lib/api/auth.ts's sendVerificationEmail (a magic
// link, since "Confirm email" is disabled and the signup-confirmation email
// no longer fires — see that file for why). pkce flow puts the auth code in
// `?code=`, which we exchange for a session and use to mark our own
// profiles.email_verified flag.
export default function AuthCallbackScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ code?: string }>();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    (async () => {
      if (params.code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (!error) {
          if (data.user) {
            try {
              await markEmailVerified(data.user.id);
            } catch {
              // ignored — the account is still verified server-side; the user
              // can retry via the resend button, which re-checks on focus
            }
          }
          router.replace('/(tabs)/home');
          return;
        }
      }
      router.replace('/(auth)/login');
    })();
  }, [params.code, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center' }}>
      <View>
        <ActivityIndicator color={theme.primary} />
      </View>
    </SafeAreaView>
  );
}
