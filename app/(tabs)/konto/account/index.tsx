import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, AppState, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { getProfile } from '@/lib/api/profiles';
import { sendVerificationEmail } from '@/lib/api/auth';
import { mapAuthErrorKey } from '@/lib/utils/authErrors';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import type { AppTheme } from '@/lib/constants/themes';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

function SettingsRow({ iconName, iconBg, iconColor, label, onPress, danger }: {
  iconName: MaterialIconName; iconBg: string; iconColor: string;
  label: string; onPress: () => void; danger?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name={iconName} size={22} color={iconColor} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: danger ? theme.error : theme.text }}>
        {label}
      </Text>
      <MaterialIcons name="chevron-right" size={20} color={theme.borderMuted} />
    </TouchableOpacity>
  );
}

function LockedField({ theme, label, value }: { theme: AppTheme; label: string; value: string }) {
  return (
    <View style={{ paddingVertical: 8 }}>
      <Text style={{ fontSize: 12, color: theme.textSubtle, fontFamily: 'Nunito_600SemiBold', marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Nunito_400Regular' }}>{value || '—'}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState('');
  const [emailConfirmed, setEmailConfirmed] = useState(true);
  const [isResending, setIsResending] = useState(false);

  const refreshEmailStatus = useCallback(() => {
    if (!user?.id) return;
    Promise.all([supabase.auth.getUser(), getProfile(user.id)]).then(([{ data }, profile]) => {
      setEmail(data.user?.email ?? '');
      setEmailConfirmed(!!profile.email_verified);
    });
  }, [user?.id]);

  useFocusEffect(refreshEmailStatus);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshEmailStatus();
    });
    return () => subscription.remove();
  }, [refreshEmailStatus]);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('konto.credentials')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Card>
          <SectionLabel theme={theme} label={t('settings.personalData')} />
          <LockedField theme={theme} label={t('auth.firstName')} value={user?.first_name ?? ''} />
          <LockedField theme={theme} label={t('auth.lastName')} value={user?.last_name ?? ''} />
          <SettingsRow iconName="email" iconBg={theme.primaryContainer} iconColor={theme.onPrimaryContainer} label={email || t('settings.email')} onPress={() => router.push('/(tabs)/konto/account/change-email')} />
          {!emailConfirmed && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingLeft: 58 }}>
              <Text style={{ flex: 1, fontSize: 12, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                {t('auth.emailVerifiedNotice')}
              </Text>
              <TouchableOpacity onPress={handleResend} disabled={isResending}>
                <Text style={{ fontSize: 12, color: theme.primary, fontFamily: 'Nunito_700Bold', opacity: isResending ? 0.5 : 1 }}>
                  {t('auth.resendVerification')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        <Card>
          <SettingsRow iconName="lock" iconBg={theme.primaryContainer} iconColor={theme.onPrimaryContainer} label={t('settings.changePassword')} onPress={() => router.push('/(tabs)/konto/account/change-password')} />
        </Card>

        <Card>
          <SectionLabel theme={theme} label={t('settings.dangerZone')} />
          <SettingsRow iconName="delete" iconBg={theme.errorContainer} iconColor={theme.error} label={t('settings.deleteAccount')} onPress={() => router.push('/(tabs)/konto/account/delete-account')} danger />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ theme, label }: { theme: AppTheme; label: string }) {
  return (
    <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: theme.textSubtle, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
      {label}
    </Text>
  );
}
