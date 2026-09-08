import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { isRevenueCatConfigured, refreshMembership, resetBillingIdentity } from '@/lib/revenuecat';

export function useBillingRefresh() {
  const id = useAuthStore(s => s.user?.id);
  useEffect(() => {
    if (!id) { void resetBillingIdentity().catch(() => {}); return; }
    let running = false;
    let stopped = false;
    const refresh = async () => {
      if (running || stopped || !isRevenueCatConfigured() || AppState.currentState !== 'active') return;
      running = true;
      try { await refreshMembership(id); } catch { /* Expiry still applies offline; UI offers explicit retry. */ }
      finally { running = false; }
    };
    void refresh();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    // Also catches pending purchases approved while the app stays foregrounded.
    const timer = setInterval(() => { void refresh(); }, 60000);
    return () => { stopped = true; listener.remove(); clearInterval(timer); };
  }, [id]);
}
