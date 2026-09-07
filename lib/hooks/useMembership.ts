import { useAuthStore } from '@/stores/authStore';

/**
 * A user counts as Pro only while membership_tier is 'standard' AND
 * membership_expires_at is still in the future — once the pass lapses,
 * this falls back to free automatically without any extra sync step.
 */
export function useMembership() {
  const user = useAuthStore((s) => s.user);

  const isPro =
    !!user &&
    user.membership_tier === 'standard' &&
    !!user.membership_expires_at &&
    new Date(user.membership_expires_at) > new Date();

  return {
    isPro,
    tier: user?.membership_tier ?? 'free',
    expiresAt: user?.membership_expires_at ?? null,
    plan: user?.membership_plan ?? null,
    autoRenew: user?.auto_renew ?? false,
  };
}
