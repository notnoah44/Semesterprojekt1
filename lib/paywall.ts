import { Alert } from 'react-native';
import type { useRouter } from 'expo-router';
import type { useTranslation } from 'react-i18next';

/**
 * Placeholder paywall — swap for a real upsell screen once the Standard
 * checkout flow (see membership.tsx handleUpgrade) is wired up.
 */
export function showPaywallModal(
  t: ReturnType<typeof useTranslation>['t'],
  router: ReturnType<typeof useRouter>
) {
  Alert.alert(
    t('paywall.newChatTitle'),
    t('paywall.newChatMessage'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('paywall.viewMembership'), onPress: () => router.push('/(tabs)/konto/subscription') },
    ]
  );
}
