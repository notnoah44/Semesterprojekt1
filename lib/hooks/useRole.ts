import { useAuthStore } from '@/stores/authStore';

export function useRole() {
  const role = useAuthStore((s) => s.role);
  const toggleRole = useAuthStore((s) => s.toggleRole);
  const setRole = useAuthStore((s) => s.setRole);

  return {
    role,
    isSitter: role === 'sitter',
    isAnbieter: role === 'anbieter',
    toggleRole,
    setRole,
  };
}
