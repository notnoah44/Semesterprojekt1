import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { createClient } from '@supabase/supabase-js';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const send = async () => {
    if (busy) return;
    setError('');
    const redirectTo = process.env.EXPO_PUBLIC_PASSWORD_RESET_URL;
    if (!redirectTo?.startsWith('https://')) { setError(t('fixes.resetNotConfigured')); return; }
    setBusy(true);
    try {
      // The browser cannot read the app's PKCE verifier: use a separate implicit recovery client.
      const recovery = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'pawstay-recovery-request' },
      });
      const { error } = await recovery.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setSent(true);
    } catch { setError(t('errors.auth.generic')); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 26, color: theme.text, fontFamily: 'Nunito_700Bold' }}>{t('fixes.forgotPassword')}</Text>
      {sent ? <Text style={{ color: theme.text }}>{t('fixes.resetSent')}</Text> : <>
        <Input label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        {error ? <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text> : null}
        <Button label={t('fixes.resetSend')} onPress={send} loading={busy} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || busy} />
      </>}
      <Button label={t('common.back')} onPress={() => router.back()} />
    </ScrollView>
  </SafeAreaView>;
}
