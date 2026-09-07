import { Alert } from 'react-native';
import type { useRouter } from 'expo-router';
import type { useTranslation } from 'react-i18next';
import { getSitterProfile, getHostProfile } from '@/lib/api/profiles';

/**
 * Progressive Profiling vor der ersten Kontaktaufnahme eines Sitters
 * (Bewerbung auf ein Host-Inserat). Zeigt einen Prompt mit Link zum
 * Sitter-Profil-Screen, wenn `sitter_profiles` noch fehlt.
 * Gibt true zurück, wenn das Profil existiert (Aufrufer kann fortfahren).
 */
export async function ensureSitterProfile(
  userId: string,
  t: ReturnType<typeof useTranslation>['t'],
  router: ReturnType<typeof useRouter>
): Promise<boolean> {
  const profile = await getSitterProfile(userId);
  if (profile) return true;

  Alert.alert(
    t('profileGate.sitterTitle'),
    t('profileGate.sitterDesc'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profileEdit.sitterProfileCta'), onPress: () => router.push('/(tabs)/konto/profile/sitter') },
    ]
  );
  return false;
}

/**
 * Progressive Profiling vor der ersten Kontaktaufnahme/Buchungsanfrage eines
 * Hosts an einen Sitter (Symmetrie zu `ensureSitterProfile`). Zeigt einen
 * Prompt mit Link zum Host-Profil-Screen, wenn `host_profiles` noch fehlt.
 */
export async function ensureHostProfile(
  userId: string,
  t: ReturnType<typeof useTranslation>['t'],
  router: ReturnType<typeof useRouter>
): Promise<boolean> {
  const profile = await getHostProfile(userId);
  if (profile) return true;

  Alert.alert(
    t('profileGate.hostTitle'),
    t('profileGate.hostDesc'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profileEdit.hostProfileCta'), onPress: () => router.push('/(tabs)/konto/profile/host') },
    ]
  );
  return false;
}
