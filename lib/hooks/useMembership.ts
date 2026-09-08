import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * A user counts as Pro only while membership_tier is 'standard' AND
 * membership_expires_at is still in the future — once the pass lapses,
 * this falls back to free automatically without any extra sync step.
 */
export function useMembership() {
  const user = useAuthStore((s) => s.user);
  const [, tick] = useState(0);
  useEffect(() => {
    const refresh = () => tick((value) => value + 1);
    const remaining = Date.parse(user?.membership_expires_at ?? '') - Date.now();
    const timer = remaining > 0 ? setTimeout(refresh, Math.min(remaining + 50, 2147483647)) : undefined;
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { clearTimeout(timer); listener.remove(); };
  });

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
    status: user?.membership_status ?? 'inactive',
  };
}
