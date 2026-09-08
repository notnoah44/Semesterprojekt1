import { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { useMembership } from '@/lib/hooks/useMembership';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils/formatDate';
import { billingFailure, billingMode, getPlans, isRevenueCatConfigured, openRefundHelp, openSubscriptionManagement, purchasePlan, refreshMembership, restorePurchases, type StorePlan } from '@/lib/revenuecat';

const PRO_BENEFITS = [
  { key: 'featureNewChats', icon: 'chat' },
  { key: 'featureListings', icon: 'search' },
  { key: 'featurePriority', icon: 'star' },
  { key: 'featureGuide', icon: 'menu-book' },
  { key: 'featureVet', icon: 'medical-services' },
  { key: 'featureEarlyAccess', icon: 'new-releases' },
] as const;

export default function SubscriptionScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { isPro, autoRenew, expiresAt, status } = useMembership();
  const [plans, setPlans] = useState<StorePlan[]>([]);
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState<string>();
  const available = isRevenueCatConfigured();
  const testStore = billingMode() === 'test_store';
  const copy = { fontSize: 14, color: theme.text, lineHeight: 21, fontFamily: 'Nunito_400Regular' } as const;

  useFocusEffect(useCallback(() => {
    let mounted = true;
    setPlans([]);
    if (user?.id && available) {
      void getPlans(user.id).then(next => {
        if (!mounted) return;
        setPlans(next);
        setSelected(current => next.some(p => p.package.identifier === current) ? current : next[0]?.package.identifier);
      }).catch(() => { if (mounted) setMessage('syncFailed'); });
    }
    return () => { mounted = false; };
  }, [user?.id, available]));

  const run = async (action: 'purchase' | 'restore' | 'refresh') => {
    if (!user || lock.current) return;
    const id = user.id;
    lock.current = true;
    setBusy(true);
    try {
      const plan = plans.find(p => p.package.identifier === selected);
      if (action === 'purchase' && !plan) return;
      const profile = action === 'purchase' ? await purchasePlan(id, plan!)
        : action === 'restore' ? await restorePurchases(id) : await refreshMembership(id);
      if (useAuthStore.getState().user?.id !== id) return;
      const active = profile.membership_tier === 'standard' && Date.parse(profile.membership_expires_at ?? '') > Date.now();
      setMessage(current => active ? action === 'purchase' ? 'success' : 'restored'
        : ['pending', 'uncertain', 'syncFailed'].includes(current ?? '') ? current : 'noAccess');
    } catch (error) {
      const reason = billingFailure(error);
      if (reason !== 'cancelled' && useAuthStore.getState().user?.id === id) setMessage(reason);
    } finally { lock.current = false; setBusy(false); }
  };
  const link = async (refund = false) => {
    if (testStore) { Alert.alert(t('subscription.title'), t('billing.testManage')); return; }
    try { await (refund ? openRefundHelp() : openSubscriptionManagement()); }
    catch { Alert.alert(t('errors.title'), t('billing.linkFailed')); }
  };
  const purchaseUnresolved = ['pending', 'uncertain', 'syncFailed'].includes(message ?? '');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity accessibilityLabel={t('common.back')} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('subscription.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Card variant="filled"><Text style={copy}>{t(`billing.${!available ? 'unavailable' : testStore ? 'testNotice' : 'storeNotice'}`)}</Text></Card>
        <Card style={{ gap: 12 }}>
          <Text style={{ ...copy, fontSize: 22, fontFamily: 'Nunito_700Bold' }}>{t(isPro ? 'subscription.currentPlanPro' : 'subscription.currentPlanFree')}</Text>
          {isPro && expiresAt && <Text style={copy}>{t(autoRenew ? 'subscription.renewsOn' : 'subscription.expiresOn', { date: formatDate(expiresAt) })}</Text>}
          {['billing_issue', 'grace_period', 'refunded'].includes(status) && <Text style={copy}>{t(`billing.${status}`)}</Text>}
          <Button label={t('billing.manage')} onPress={() => void link()} variant="secondary" disabled={busy} fullWidth />
          <Button label={t('billing.restore')} onPress={() => void run('restore')} variant="secondary" disabled={!available || busy} fullWidth />
          <Button label={t('billing.refresh')} onPress={() => void run('refresh')} variant="secondary" disabled={!available || busy} fullWidth />
          {message && <Text accessibilityLiveRegion="polite" style={copy}>{t(`billing.${message}`)}</Text>}
        </Card>
        {!isPro && <Card style={{ gap: 12 }}>
          <Text style={{ ...copy, fontFamily: 'Nunito_700Bold' }}>{t('subscription.choosePlan')}</Text>
          {plans.length === 0 && <Text style={copy}>{t('billing.noPlans')}</Text>}
          {plans.map(plan => <TouchableOpacity
            key={plan.package.identifier} disabled={busy} accessibilityRole="radio"
            accessibilityState={{ selected: selected === plan.package.identifier }}
            onPress={() => setSelected(plan.package.identifier)}
            style={{ borderWidth: 2, borderColor: selected === plan.package.identifier ? theme.primary : theme.border, borderRadius: 14, padding: 14, gap: 6 }}
          >
            <Text style={{ ...copy, fontFamily: 'Nunito_700Bold' }}>{t(`subscription.${plan.id === 'monthly' ? 'planMonthly' : plan.id === 'quarterly' ? 'planQuarterly' : 'planYearly'}`)}</Text>
            <Text style={copy}>{plan.price}</Text>
          </TouchableOpacity>)}
          <Text style={copy}>{t('billing.terms')}</Text>
          <Button label={t('subscription.subscribeButton')} onPress={() => void run('purchase')} loading={busy} disabled={!available || !selected || purchaseUnresolved} fullWidth />
        </Card>}
        <Card style={{ gap: 12, backgroundColor: theme.primaryContainer, borderColor: theme.primary, borderWidth: 1.5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="workspace-premium" size={22} color={theme.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...copy, color: theme.onPrimaryContainer, fontSize: 17, fontFamily: 'Nunito_700Bold' }}>{t('subscription.featuresTitle')}</Text>
              <Text style={{ ...copy, color: theme.onPrimaryContainer, opacity: 0.8, fontSize: 12 }}>{t('subscription.currentPlanPro')}</Text>
            </View>
          </View>
          {PRO_BENEFITS.map(({ key, icon }) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 }}>
              <MaterialIcons name={icon} size={20} color={theme.primary} />
              <Text style={{ ...copy, flex: 1, color: theme.onPrimaryContainer }}>{t(`subscription.${key}`)}</Text>
              <MaterialIcons name="check-circle" size={18} color={theme.primary} />
            </View>
          ))}
        </Card>
        <Card style={{ gap: 12 }}>
          <Text style={copy}>{t('billing.refundHint')}</Text>
          <Button label={t('billing.refund')} onPress={() => void link(true)} variant="secondary" />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
