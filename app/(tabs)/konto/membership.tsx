import { View, Text, ScrollView, TouchableOpacity, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate, daysUntil } from '@/lib/utils/formatDate';

const FEATURES_FREE = ['Basic profile', 'Browse listings (limited)', '3 messages/month'];
const FEATURES_STANDARD = [
  'Unlimited messages',
  'Full listing access',
  'Priority search placement',
  'Welcome Guide access',
  'VET Advice Line',
  'Early access to new features',
];

export default function MembershipScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isStandard = user?.membership_tier === 'standard';
  const daysLeft = user?.membership_expires_at ? daysUntil(user.membership_expires_at) : null;

  const handleUpgrade = () => {
    Alert.alert(
      'Upgrade to Standard',
      'Secure checkout (330€/year) will open here once payments are enabled. Stripe integration is configured by the app owner.',
      [{ text: 'OK' }]
    );
  };

  const handleShareReferral = async () => {
    const code = user?.referral_code;
    const link = code ? `https://pawstay.app/join?ref=${code}` : 'https://pawstay.app';
    try {
      await Share.share({
        message: `Join me on PawStay — trusted housesitting & petsitting. Use my link and we both get 2 months free: ${link}`,
      });
    } catch {
      // user dismissed the share sheet
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('membership.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Current plan */}
        <Card variant="elevated" style={{ alignItems: 'center', paddingVertical: 28 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: isStandard ? '#FEF3C7' : theme.surfaceDim, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <MaterialIcons name="workspace-premium" size={32} color={isStandard ? '#D97706' : theme.textMuted} />
          </View>
          <Text style={{ fontSize: 22, fontFamily: 'Nunito_700Bold', color: theme.text }}>
            {isStandard ? t('membership.standardMember') : t('membership.freePlan')}
          </Text>
          {isStandard && daysLeft !== null && (
            <View style={{ marginTop: 8 }}>
              <Badge label={t('membership.daysRemaining', { days: daysLeft })} variant={daysLeft < 30 ? 'warning' : 'success'} />
            </View>
          )}
          {isStandard && user?.membership_expires_at && (
            <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 8 }}>
              {t('membership.renews', { date: formatDate(user.membership_expires_at) })}
            </Text>
          )}
        </Card>

        {/* Free tier */}
        <Card>
          <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 12 }}>{t('membership.free')}</Text>
          {FEATURES_FREE.map((f) => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <MaterialIcons name="check-circle-outline" size={18} color={theme.textMuted} />
              <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>{f}</Text>
            </View>
          ))}
        </Card>

        {/* Standard tier */}
        <Card style={{ borderWidth: 2, borderColor: theme.primary }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('membership.standard')}</Text>
            <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.primary }}>{t('membership.perYear')}</Text>
          </View>
          {FEATURES_STANDARD.map((f) => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <MaterialIcons name="check-circle" size={18} color={theme.primary} />
              <Text style={{ fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular' }}>{f}</Text>
            </View>
          ))}
          {!isStandard && (
            <View style={{ marginTop: 16 }}>
              <Button label={t('membership.upgrade')} onPress={handleUpgrade} fullWidth />
            </View>
          )}
        </Card>

        {/* Referral */}
        <Card style={{ backgroundColor: theme.primaryContainer, borderColor: theme.primary }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <MaterialIcons name="share" size={22} color={theme.onPrimaryContainer} />
            <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.onPrimaryContainer }}>
              {t('membership.referTitle')}
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 12 }}>
            {t('membership.referBody')}
          </Text>
          <Button label={t('membership.shareLink')} onPress={handleShareReferral} variant="secondary" fullWidth />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
