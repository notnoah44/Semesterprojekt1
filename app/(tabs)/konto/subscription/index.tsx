import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { useMembership } from '@/lib/hooks/useMembership';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils/formatDate';
import {
  MEMBERSHIP_PLANS,
  purchasePlan,
  setAutoRenew,
  scheduleRenewalReminder,
  cancelRenewalReminder,
} from '@/lib/revenuecat';
import type { MembershipPlan } from '@/types/user';

const FEATURES_FREE_KEYS = ['featureFreeProfile', 'featureFreeBrowse', 'featureFreeThreadUnlock'] as const;
const FEATURES_PRO_KEYS = [
  'featureNewChats', 'featureListings', 'featurePriority', 'featureGuide', 'featureVet', 'featureEarlyAccess',
] as const;

export default function SubscriptionScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { isPro, plan: activePlan, autoRenew, expiresAt } = useMembership();

  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan>(activePlan ?? 'yearly');
  const [autoRenewEnabled, setAutoRenewEnabled] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const selectedPlanDef = MEMBERSHIP_PLANS.find((p) => p.id === selectedPlan)!;
  const cheapestPerMonth = Math.min(...MEMBERSHIP_PLANS.map((p) => p.pricePerMonth));

  const handlePurchase = async () => {
    if (!user) return;
    setIsPurchasing(true);
    try {
      const updated = await purchasePlan(user.id, selectedPlan, autoRenewEnabled);
      setUser(updated);
      if (autoRenewEnabled && updated.membership_expires_at) {
        if (updated.notification_preferences?.membership?.push) {
          await scheduleRenewalReminder(updated.membership_expires_at, t('subscription.reminderTitle'), t('subscription.reminderBody'));
        }
      } else {
        await cancelRenewalReminder();
      }
      Alert.alert(t('subscription.purchaseSuccessTitle'), t('subscription.purchaseSuccessMessage'));
    } catch (e) {
      Alert.alert(t('subscription.purchaseFailedTitle'), e instanceof Error ? e.message : String(e));
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleCancelAutoRenew = () => {
    Alert.alert(
      t('subscription.cancelConfirmTitle'),
      t('subscription.cancelConfirmMessage', { date: expiresAt ? formatDate(expiresAt) : '' }),
      [
        { text: t('subscription.cancelConfirmDismiss'), style: 'cancel' },
        {
          text: t('subscription.cancelConfirmConfirm'),
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              const updated = await setAutoRenew(user.id, false);
              setUser(updated);
              await cancelRenewalReminder();
            } catch (e) {
              Alert.alert(t('subscription.purchaseFailedTitle'), e instanceof Error ? e.message : String(e));
            }
          },
        },
      ]
    );
  };

  const handleReactivateAutoRenew = async () => {
    if (!user) return;
    try {
      const updated = await setAutoRenew(user.id, true);
      setUser(updated);
      if (updated.membership_expires_at) {
        if (updated.notification_preferences?.membership?.push) {
          await scheduleRenewalReminder(updated.membership_expires_at, t('subscription.reminderTitle'), t('subscription.reminderBody'));
        }
      }
    } catch (e) {
      Alert.alert(t('subscription.purchaseFailedTitle'), e instanceof Error ? e.message : String(e));
    }
  };

  const handleShareReferral = async () => {
    const code = user?.referral_code;
    const link = code ? `https://pawstay.app/join?ref=${code}` : 'https://pawstay.app';
    try {
      await Share.share({ message: t('subscription.shareMessage', { link }) });
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
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('subscription.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Demo notice */}
        <View style={{
          flexDirection: 'row', gap: 10, backgroundColor: theme.tertiaryContainer,
          borderRadius: 14, padding: 14, alignItems: 'flex-start',
        }}>
          <MaterialIcons name="science" size={18} color={theme.tertiary} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12, color: theme.tertiary, fontFamily: 'Nunito_400Regular', lineHeight: 17 }}>
            {t('subscription.demoNotice')}
          </Text>
        </View>

        {/* Current status */}
        <Card variant="elevated" style={{ alignItems: 'center', paddingVertical: 28 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: isPro ? '#FEF3C7' : theme.surfaceDim, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <MaterialIcons name="workspace-premium" size={32} color={isPro ? '#D97706' : theme.textMuted} />
          </View>
          <Text style={{ fontSize: 22, fontFamily: 'Nunito_700Bold', color: theme.text }}>
            {isPro ? t('subscription.currentPlanPro') : t('subscription.currentPlanFree')}
          </Text>

          {isPro && expiresAt && (
            <>
              <View style={{ marginTop: 8 }}>
                <Badge
                  label={autoRenew ? t('subscription.renewsOn', { date: formatDate(expiresAt) }) : t('subscription.expiresOn', { date: formatDate(expiresAt) })}
                  variant={autoRenew ? 'success' : 'warning'}
                />
              </View>
              {!autoRenew && (
                <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 6 }}>
                  {t('subscription.autoRenewOff')}
                </Text>
              )}
              <View style={{ marginTop: 16 }}>
                {autoRenew ? (
                  <Button label={t('subscription.cancelButton')} onPress={handleCancelAutoRenew} variant="secondary" />
                ) : (
                  <Button label={t('subscription.reactivateButton')} onPress={handleReactivateAutoRenew} variant="secondary" />
                )}
              </View>
            </>
          )}
        </Card>

        {/* Plan picker */}
        <Card>
          <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 12 }}>
            {t('subscription.choosePlan')}
          </Text>
          <View style={{ gap: 10 }}>
            {MEMBERSHIP_PLANS.map((p) => {
              const isSelected = p.id === selectedPlan;
              const planLabel = p.id === 'monthly' ? t('subscription.planMonthly')
                : p.id === 'quarterly' ? t('subscription.planQuarterly')
                : t('subscription.planYearly');
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedPlan(p.id)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    padding: 14, borderRadius: 14,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? theme.primary : theme.border,
                    backgroundColor: isSelected ? theme.primaryContainer : theme.surface,
                  }}
                >
                  <MaterialIcons
                    name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={22}
                    color={isSelected ? theme.primary : theme.borderMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: isSelected ? theme.onPrimaryContainer : theme.text }}>
                        {planLabel}
                      </Text>
                      {p.pricePerMonth === cheapestPerMonth && (
                        <Badge label={t('subscription.bestValue')} variant="success" />
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: isSelected ? theme.onPrimaryContainer : theme.textMuted, fontFamily: 'Nunito_400Regular', opacity: 0.8, marginTop: 2 }}>
                      {t('subscription.perMonth', { price: `${p.pricePerMonth} €` })}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: isSelected ? theme.primary : theme.text }}>
                    {p.totalPrice} €
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>
              {t('subscription.autoRenewLabel')}
            </Text>
            <Switch
              value={autoRenewEnabled}
              onValueChange={setAutoRenewEnabled}
              trackColor={{ true: theme.primary, false: theme.border }}
            />
          </View>
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 6, lineHeight: 17 }}>
            {t('subscription.autoRenewHint', { price: `${selectedPlanDef.totalPrice} €` })}
          </Text>

          <View style={{ marginTop: 16 }}>
            <Button
              label={t('subscription.subscribeButton')}
              onPress={handlePurchase}
              loading={isPurchasing}
              fullWidth
            />
          </View>
        </Card>

        {/* Features comparison */}
        <Card>
          <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 12 }}>{t('subscription.featuresTitle')}</Text>
          {FEATURES_PRO_KEYS.map((key) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <MaterialIcons name="check-circle" size={18} color={theme.primary} />
              <Text style={{ fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular' }}>{t(`subscription.${key}`)}</Text>
            </View>
          ))}
        </Card>

        <Card variant="filled">
          <Text style={{ fontSize: 13, fontFamily: 'Nunito_700Bold', color: theme.textMuted, marginBottom: 10 }}>{t('subscription.freeFeaturesTitle')}</Text>
          {FEATURES_FREE_KEYS.map((key) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <MaterialIcons name="check-circle-outline" size={18} color={theme.textMuted} />
              <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>{t(`subscription.${key}`)}</Text>
            </View>
          ))}
        </Card>

        {/* Referral */}
        <Card style={{ backgroundColor: theme.primaryContainer, borderColor: theme.primary }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <MaterialIcons name="share" size={22} color={theme.onPrimaryContainer} />
            <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.onPrimaryContainer }}>
              {t('subscription.referTitle')}
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 12 }}>
            {t('subscription.referBody')}
          </Text>
          <Button label={t('subscription.shareLink')} onPress={handleShareReferral} variant="secondary" fullWidth />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
