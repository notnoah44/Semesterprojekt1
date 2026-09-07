import { useCallback, useState, type ReactNode } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { getSitterProfile, getHostProfile, isProfileComplete } from '@/lib/api/profiles';
import { Button } from '@/components/ui/Button';

type RoleProfileKind = 'sitter' | 'host';

/**
 * Progressive-Profiling-Gate vor Inserat-Erstellung: rendert die Kinder erst,
 * wenn (1) das allgemeine öffentliche Profil vollständig ist (Punkt 10,
 * offene-punkte-anpassungen.md) und (2) das jeweilige Rollen-Profil
 * (sitter_profiles/host_profiles) existiert. Sonst ein Prompt zum jeweils
 * fehlenden Profil-Screen. Muss innerhalb von `RequireAuth` verwendet werden
 * (setzt einen eingeloggten `user` voraus).
 *
 * Prüft bei jedem Fokussieren neu (nicht nur beim ersten Mount), da Expo-Router
 * diesen Screen im Stack gemountet lässt — sonst bleibt ein einmal ermittelter
 * `'missing'`-Status bestehen, obwohl das Profil inzwischen vervollständigt wurde.
 */
export function RequireRoleProfile({ role, children }: { role: RoleProfileKind; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [status, setStatus] = useState<'loading' | 'missing_general' | 'missing_role' | 'ok'>('loading');

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      if (!isProfileComplete(user)) {
        setStatus('missing_general');
        return;
      }
      let cancelled = false;
      const fetcher = role === 'sitter' ? getSitterProfile : getHostProfile;
      fetcher(user.id)
        .then((profile) => { if (!cancelled) setStatus(profile ? 'ok' : 'missing_role'); })
        .catch(() => { if (!cancelled) setStatus('missing_role'); });
      return () => { cancelled = true; };
    }, [user, role])
  );

  if (!user || status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (status === 'missing_general') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="person" size={36} color={theme.borderMuted} />
          </View>
          <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text, textAlign: 'center' }}>
            {t('profileGate.generalTitle')}
          </Text>
          <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center' }}>
            {t('profileGate.generalDesc')}
          </Text>
          <Button
            label={t('profileEdit.title')}
            onPress={() => router.push({
              pathname: '/(tabs)/konto/profile/edit',
              params: { returnTo: pathname },
            } as any)}
            fullWidth
          />
          {/* Punkt 5.7 (umsetzungsplan.md): ohne diesen Ausweg konnte man sich
              hier festfahren — der Zurück-Pfeil im Profil-Bearbeiten-Screen
              führt per `returnTo` genau wieder hierher zurück, solange das
              Profil nicht vervollständigt ist. `replace` statt `push`, damit
              dieser Gate-Screen dabei aus dem Stack verschwindet. */}
          <Button
            label={t('profileGate.notNow')}
            variant="secondary"
            onPress={() => router.replace('/(tabs)/home')}
            fullWidth
          />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'missing_role') {
    const isSitter = role === 'sitter';
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name={isSitter ? 'pets' : 'home'} size={36} color={theme.borderMuted} />
          </View>
          <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text, textAlign: 'center' }}>
            {isSitter ? t('profileGate.sitterTitle') : t('profileGate.hostTitle')}
          </Text>
          <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center' }}>
            {isSitter ? t('profileGate.sitterDesc') : t('profileGate.hostDesc')}
          </Text>
          <Button
            label={isSitter ? t('profileEdit.sitterProfileCta') : t('profileEdit.hostProfileCta')}
            onPress={() => router.push({
              pathname: isSitter ? '/(tabs)/konto/profile/sitter' : '/(tabs)/konto/profile/host',
              params: { returnTo: pathname },
            } as any)}
            fullWidth
          />
          <Button
            label={t('profileGate.notNow')}
            variant="secondary"
            onPress={() => router.replace('/(tabs)/home')}
            fullWidth
          />
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}
