import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { MembershipPlan, Profile } from '@/types/user';

/**
 * RevenueCat is not wired up yet — no API keys and no App Store/Play Console
 * products exist (uni project, tested via Expo Go, no dev client). See
 * docs/feature-konto-restructure-membership.md, Abschnitt 4/7.
 *
 * Real integration later: `expo install react-native-purchases` (requires a
 * custom dev client, breaks Expo Go), add EXPO_PUBLIC_REVENUECAT_API_KEY_IOS/
 * _ANDROID, call `Purchases.configure({ apiKey, appUserID })` once at startup,
 * then replace the "demo mode" branches below with
 * `Purchases.getOfferings()` / `Purchases.purchasePackage()`. Auto-renewing
 * IAP subscriptions can only be cancelled through the native store UI, not via
 * API — see the `setAutoRenew` real-mode branch.
 */
export const ENTITLEMENT_ID = 'pro';

export interface PlanDefinition {
  id: MembershipPlan;
  months: number;
  totalPrice: number;
  pricePerMonth: number;
}

export const MEMBERSHIP_PLANS: PlanDefinition[] = [
  { id: 'monthly', months: 1, totalPrice: 34, pricePerMonth: 34 },
  { id: 'quarterly', months: 3, totalPrice: 69, pricePerMonth: 23 },
  { id: 'yearly', months: 12, totalPrice: 132, pricePerMonth: 11 },
];

export function isRevenueCatConfigured(): boolean {
  return !!(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export async function purchasePlan(userId: string, planId: MembershipPlan, autoRenew: boolean): Promise<Profile> {
  const plan = MEMBERSHIP_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  if (isRevenueCatConfigured()) {
    throw new Error('RevenueCat purchase flow not implemented yet');
  }

  const expiresAt = addMonths(new Date(), plan.months);
  const { data, error } = await supabase
    .from('profiles')
    .update({
      membership_tier: 'standard',
      membership_plan: planId,
      membership_expires_at: expiresAt.toISOString(),
      auto_renew: autoRenew,
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;

  return data as Profile;
}

export async function setAutoRenew(userId: string, autoRenew: boolean): Promise<Profile> {
  if (isRevenueCatConfigured()) {
    // Real IAP subscriptions can't be toggled via API — send the user to the
    // native subscription settings instead, e.g.:
    // Linking.openURL(Platform.OS === 'ios'
    //   ? 'itms-apps://apps.apple.com/account/subscriptions'
    //   : 'https://play.google.com/store/account/subscriptions');
    throw new Error('Manage auto-renew via the native store subscription settings once RevenueCat is live');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ auto_renew: autoRenew })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;

  return data as Profile;
}

const RENEWAL_REMINDER_ID = 'membership-renewal-reminder';
const REMINDER_DAYS_BEFORE = 7;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('membership-reminders', {
    name: 'Abo-Erinnerungen',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Schedules a local reminder 7 days before `expiresAt`. No-op if that's already in the past or permission is denied. */
export async function scheduleRenewalReminder(expiresAt: string, title: string, body: string) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  await cancelRenewalReminder();
  await ensureAndroidChannel();

  const triggerDate = new Date(expiresAt);
  triggerDate.setDate(triggerDate.getDate() - REMINDER_DAYS_BEFORE);
  if (triggerDate.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: RENEWAL_REMINDER_ID,
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

export async function cancelRenewalReminder() {
  await Notifications.cancelScheduledNotificationAsync(RENEWAL_REMINDER_ID).catch(() => {});
}
