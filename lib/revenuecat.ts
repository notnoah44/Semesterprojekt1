import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Linking, Platform } from 'react-native';
import type Purchases from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { MembershipPlan, Profile } from '@/types/user';

export const ENTITLEMENT_ID = 'pro';
export type BillingFailure = 'unavailable' | 'cancelled' | 'pending' | 'declined' | 'uncertain' | 'linked' | 'syncFailed';
export class BillingError extends Error {
  constructor(public reason: BillingFailure) { super(reason); }
}
export function billingFailure(error: unknown): BillingFailure {
  if (error instanceof BillingError) return error.reason;
  const e = error as { code?: string; userCancelled?: boolean } | null;
  if (e?.userCancelled || String(e?.code) === '1') return 'cancelled';
  if (String(e?.code) === '20') return 'pending';
  if (['3', '4', '42'].includes(String(e?.code))) return 'declined';
  if (['7', '13'].includes(String(e?.code))) return 'linked';
  return 'uncertain';
}

export function billingMode(): 'disabled' | 'test_store' | 'store' {
  const mode = process.env.EXPO_PUBLIC_BILLING_MODE;
  return mode === 'test_store' || mode === 'store' ? mode : 'disabled';
}
function apiKey() {
  if (billingMode() === 'test_store') {
    const key = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
    return key?.startsWith('test_') ? key : undefined;
  }
  if (billingMode() !== 'store') return undefined;
  const key = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
  return key && !key.startsWith('test_') ? key : undefined;
}
export function isRevenueCatConfigured() {
  return (Platform.OS === 'android' || Platform.OS === 'ios') &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && !!apiKey();
}

let sdk: typeof Purchases | undefined;
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work, work);
  queue = result.catch(() => {});
  return result;
}
function assertUser(id: string) {
  if (useAuthStore.getState().user?.id !== id) throw new BillingError('cancelled');
}
async function identify(id: string) {
  assertUser(id);
  if (!isRevenueCatConfigured()) throw new BillingError('unavailable');
  // A type-only import + lazy require keeps Expo Go and web usable without native IAP.
  sdk ??= require('react-native-purchases').default as typeof Purchases;
  if (!(await sdk.isConfigured())) sdk.configure({ apiKey: apiKey()!, appUserID: id });
  else if (await sdk.getAppUserID() !== id) await sdk.logIn(id);
  assertUser(id);
  return sdk;
}
export interface StorePlan { id: MembershipPlan; price: string; package: PurchasesPackage }
export async function getPlans(id: string): Promise<StorePlan[]> {
  return serial(async () => {
    const purchases = await identify(id);
    const offering = (await purchases.getOfferings()).current;
    assertUser(id);
    const ids: Record<string, MembershipPlan> = { MONTHLY: 'monthly', THREE_MONTH: 'quarterly', ANNUAL: 'yearly' };
    return (offering?.availablePackages ?? []).filter(p => ids[p.packageType]).map(p => ({
      id: ids[p.packageType], price: p.product.priceString, package: p,
    }));
  });
}
async function syncProfile(id: string): Promise<Profile> {
  assertUser(id);
  const { data, error } = await supabase.functions.invoke<{ profile: Profile }>('sync-membership');
  if (error || !data?.profile || data.profile.id !== id) throw new BillingError('syncFailed');
  assertUser(id);
  useAuthStore.getState().setUser(data.profile);
  return data.profile;
}
export async function refreshMembership(id: string) {
  return serial(async () => {
    const purchases = await identify(id);
    await purchases.invalidateCustomerInfoCache();
    await purchases.getCustomerInfo();
    return syncProfile(id);
  });
}
export async function purchasePlan(id: string, plan: StorePlan) {
  return serial(async () => {
    const purchases = await identify(id);
    try {
      await purchases.purchasePackage(plan.package);
    } catch (error) {
      const reason = billingFailure(error);
      if (reason !== 'cancelled') {
        // A network error may follow a successful charge. Reconcile before retrying.
        await syncProfile(id).catch(() => {});
      }
      throw new BillingError(reason);
    }
    // SDK success is insufficient to grant Pro: the server verifies the receipt state.
    return syncProfile(id);
  });
}
export async function restorePurchases(id: string) {
  return serial(async () => {
    const purchases = await identify(id);
    await purchases.restorePurchases();
    return syncProfile(id);
  });
}
export async function resetBillingIdentity() {
  return serial(async () => {
    if (sdk && await sdk.isConfigured() && !(await sdk.isAnonymous())) await sdk.logOut();
  });
}
export async function openSubscriptionManagement() {
  if (billingMode() === 'test_store') throw new BillingError('unavailable');
  // Works even with a missing/expired local entitlement, and during account deletion.
  let url = Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
  const id = useAuthStore.getState().user?.id;
  if (id && isRevenueCatConfigured()) {
    try {
      const managementURL = await serial(async () => (await (await identify(id)).getCustomerInfo()).managementURL);
      if (managementURL) {
        const parsed = new URL(managementURL);
        if (parsed.protocol === 'https:' && ['apps.apple.com', 'play.google.com'].includes(parsed.hostname)) url = managementURL;
      }
    } catch { /* Store settings remain reachable even if the SDK cannot sync. */ }
  }
  await Linking.openURL(url);
}
export async function openRefundHelp() {
  await Linking.openURL(Platform.OS === 'ios'
    ? 'https://reportaproblem.apple.com/'
    : 'https://support.google.com/googleplay/workflow/9813244');
}
