import { useAuthStore } from '@/stores/authStore';
import { useMembership } from '@/lib/hooks/useMembership';
import { PERMISSIONS, type PermissionKey, type UserTier } from '@/lib/constants/permissions';

/** Guest (nicht eingeloggt) / Free (eingeloggt, kein aktiver Zeitpass) / Pro. */
export function useUserTier(): UserTier {
  const user = useAuthStore((s) => s.user);
  const { isPro } = useMembership();
  if (!user) return 'guest';
  return isPro ? 'pro' : 'free';
}

/** Zentrale Rechte-Abfrage gegen die Rechtematrix (lib/constants/permissions.ts). */
export function useCan(key: PermissionKey): boolean {
  const tier = useUserTier();
  return PERMISSIONS[key][tier];
}
