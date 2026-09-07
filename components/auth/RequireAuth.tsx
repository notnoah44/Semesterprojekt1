import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';

/**
 * Gate for screens that only make sense for a logged-in user
 * (bookings, chat, account, favourites, own listings, ...).
 * Guests see a sign-in prompt instead of the screen content.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();

  if (isLoading) return null;

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="lock-outline" size={36} color={theme.borderMuted} />
          </View>
          <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text, textAlign: 'center' }}>
            {t('auth.signInRequired')}
          </Text>
          <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center' }}>
            {t('auth.signInRequiredDesc')}
          </Text>
          <View style={{ width: '100%', gap: 10 }}>
            <Button label={t('auth.logIn')} onPress={() => router.push('/(auth)/login')} fullWidth />
            <Button label={t('auth.signUp')} onPress={() => router.push('/(auth)/register')} variant="secondary" fullWidth />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}
