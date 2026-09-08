export type Plan = 'monthly' | 'quarterly' | 'yearly';
export type BillingStatus = 'inactive' | 'active' | 'cancelled' | 'grace_period' | 'billing_issue' | 'refunded';
export interface Membership {
  membership_tier: 'free' | 'standard';
  membership_plan: Plan | null;
  membership_expires_at: string | null;
  auto_renew: boolean;
  membership_status: BillingStatus;
}

function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid subscriber response');
  return value as Record<string, any>;
}
function date(value: unknown): number {
  if (value == null) return 0;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error('Invalid subscription date');
  return Date.parse(value);
}

/** Only an authenticated RevenueCat REST snapshot may reach this function. */
export function membershipFromSubscriber(payload: unknown, products: Record<string, Plan>, environment: 'sandbox' | 'production', now = Date.now()): Membership {
  const subscriber = object(object(payload).subscriber);
  const entitlements = object(subscriber.entitlements);
  const subscriptions = object(subscriber.subscriptions);
  const free: Membership = { membership_tier: 'free', membership_plan: null, membership_expires_at: null, auto_renew: false, membership_status: 'inactive' };
  if (!entitlements.pro) return free;
  const entitlement = object(entitlements.pro);
  const product = entitlement.product_identifier;
  if (typeof product !== 'string' || !Object.hasOwn(products, product)) throw new Error('Unmapped Pro product');
  const subscription = object(subscriptions[product]);
  if (typeof subscription.is_sandbox !== 'boolean' || subscription.is_sandbox !== (environment === 'sandbox')) throw new Error('Billing environment mismatch');
  if (!['app_store', 'play_store', ...(environment === 'sandbox' ? ['test_store'] : [])].includes(subscription.store)) throw new Error('Unsupported store');
  const plan = products[product];
  if (!['monthly', 'quarterly', 'yearly'].includes(plan)) throw new Error('Invalid plan mapping');
  if (subscription.refunded_at) return { ...free, membership_status: 'refunded' };
  // Lifetime/promotional grants are deliberately unsupported: PawStay sells subscriptions.
  if (!entitlement.expires_date || !subscription.expires_date) throw new Error('Missing subscription expiry');
  const expiry = Math.min(date(entitlement.expires_date), date(subscription.expires_date));
  const grace = Math.max(date(entitlement.grace_period_expires_date), date(subscription.grace_period_expires_date));
  const effectiveExpiry = Math.max(expiry, grace);
  const billingIssue = !!subscription.billing_issues_detected_at;
  if (effectiveExpiry <= now) return { ...free, membership_status: billingIssue ? 'billing_issue' : 'inactive' };
  const cancelled = !!subscription.unsubscribe_detected_at || !!subscription.auto_resume_date;
  return {
    membership_tier: 'standard', membership_plan: plan,
    membership_expires_at: new Date(effectiveExpiry).toISOString(),
    auto_renew: !cancelled && !billingIssue,
    membership_status: grace > now && billingIssue ? 'grace_period' : billingIssue ? 'billing_issue' : cancelled ? 'cancelled' : 'active',
  };
}

export function webhookUserIds(event: Record<string, unknown>): string[] {
  const ids = [event.app_user_id, event.original_app_user_id,
    ...(Array.isArray(event.aliases) ? event.aliases : []),
    ...(Array.isArray(event.transferred_from) ? event.transferred_from : []),
    ...(Array.isArray(event.transferred_to) ? event.transferred_to : [])];
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))];
}
