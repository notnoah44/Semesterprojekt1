import { View, Text, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { registerSchema, type RegisterInput } from '@/lib/utils/validators';
import { mapAuthErrorKey } from '@/lib/utils/authErrors';
import { upsertProfile } from '@/lib/api/profiles';
import { sendVerificationEmail } from '@/lib/api/auth';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    setInfo(null);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { first_name: data.firstName, last_name: data.lastName },
        emailRedirectTo: Linking.createURL('auth/callback'),
      },
    });
    if (authError) {
      console.error('[register] signUp failed:', authError.status, authError.message);
      const translated = t(`errors.auth.${mapAuthErrorKey(authError.message)}`);
      setError(__DEV__ ? `${translated}\n[debug] ${authError.status}: ${authError.message}` : translated);
      return;
    }
    if (!authData.session) {
      // Email confirmation is required — there is no session yet to write the
      // profile row under RLS, so it relies entirely on the DB trigger here.
      setInfo(t('auth.confirmEmailSent'));
      return;
    }
    if (authData.user) {
      // Defensive fallback in case the `handle_new_user` DB trigger didn't run —
      // ensures first/last name always end up on the profile, not just in auth metadata.
      try {
        await upsertProfile({
          id: authData.user.id,
          first_name: data.firstName,
          last_name: data.lastName,
          full_name: `${data.firstName} ${data.lastName}`.trim(),
        });
      } catch {
        // ignored — the trigger should have already created this row
      }
      try {
        // "Confirm email" is disabled (see lib/api/auth.ts) so signUp() never
        // sends its own confirmation email — send the first verification
        // link ourselves so the account isn't stuck "unverified" forever.
        await sendVerificationEmail(data.email);
      } catch {
        // ignored — the user can retry via the resend button in Konto
      }
    }
    router.replace('/(auth)/onboarding');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 32, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>
            {t('auth.joinTitle')}
          </Text>
          <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 32 }}>
            {t('auth.createSubtitle')}
          </Text>

          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('auth.firstName')}
                value={value}
                onChangeText={onChange}
                autoComplete="given-name"
                error={errors.firstName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('auth.lastName')}
                value={value}
                onChangeText={onChange}
                autoComplete="family-name"
                error={errors.lastName?.message}
              />
            )}
          />

          <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 20, lineHeight: 18 }}>
            {t('auth.nameVisibilityHint')}
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('auth.email')}
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('auth.password')}
                value={value}
                onChangeText={onChange}
                secureTextEntry
                autoComplete="new-password"
                error={errors.password?.message}
              />
            )}
          />

          <Controller control={control} name="confirmPassword" render={({ field: { onChange, value } }) => (
            <Input label={t('fixes.confirmPassword')} value={value} onChangeText={onChange} secureTextEntry autoComplete="new-password" error={errors.confirmPassword?.message ? t(errors.confirmPassword.message) : undefined} />
          )} />

          {error && (
            <Text style={{ color: theme.error, fontSize: 14, marginBottom: 16, fontFamily: 'Nunito_400Regular' }}>
              {error}
            </Text>
          )}
          {info && (
            <Text style={{ color: theme.primary, fontSize: 14, marginBottom: 16, fontFamily: 'Nunito_400Regular' }}>
              {info}
            </Text>
          )}

          <Button
            label={t('auth.createAccount')}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            fullWidth
          />

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <Text style={{ color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
              {t('auth.haveAccount')}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: theme.primary, fontFamily: 'Nunito_700Bold' }}>{t('auth.signIn')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
