import { useCallback, useState, type ReactNode } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { getProfile } from '@/lib/api/profiles';
import { sendVerificationEmail } from '@/lib/api/auth';
import { mapAuthErrorKey } from '@/lib/utils/authErrors';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';

/**
 * Trust-critical gate (e.g. before creating a listing): checks the current
 * `profiles.email_verified` fresh from the DB on every focus, since the auth
 * store's user snapshot can be stale. Not `auth.users.email_confirmed_at` —
 * that's auto-set at signup because "Confirm email" is disabled, see
 * lib/api/auth.ts. Must be used inside `RequireAuth`.
 */
export function RequireEmailVerified({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);
  const [status, setStatus] = useState<'loading' | 'unverified' | 'verified'>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      Promise.all([getProfile(userId), supabase.auth.getUser()]).then(([profile, { data }]) => {
        if (cancelled) return;
        setEmail(data.user?.email ?? null);
        setStatus(profile.email_verified ? 'verified' : 'unverified');
      });
      return () => { cancelled = true; };
    }, [userId])
  );

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    const { error } = await sendVerificationEmail(email);
    setIsResending(false);
    if (error) {
      Alert.alert(t('errors.title'), t(`errors.auth.${mapAuthErrorKey(error.message)}`));
      return;
    }
    Alert.alert(t('auth.resendVerificationSentTitle'), t('auth.resendVerificationSent'));
  };

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (status === 'unverified') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="mark-email-unread" size={36} color={theme.borderMuted} />
          </View>
          <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text, textAlign: 'center' }}>
            {t('emailVerifyGate.title')}
          </Text>
          <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center' }}>
            {t('emailVerifyGate.desc')}
          </Text>
          <Button
            label={t('auth.resendVerification')}
            onPress={handleResend}
            loading={isResending}
            fullWidth
          />
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}
