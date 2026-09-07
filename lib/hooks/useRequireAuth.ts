import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Returns a function that checks whether a user is logged in.
 * If not, it redirects to the login screen and returns false so the
 * caller can bail out of the action (e.g. `if (!ensureAuth()) return;`).
 */
export function useRequireAuth() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  return () => {
    if (user) return true;
    router.push('/(auth)/login');
    return false;
  };
}
