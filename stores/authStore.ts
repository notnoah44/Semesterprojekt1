import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile, Role } from '@/types/user';

interface AuthStore {
  user: Profile | null;
  role: Role;
  isLoading: boolean;
  setUser: (user: Profile | null) => void;
  toggleRole: () => void;
  setRole: (role: Role) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      role: 'sitter',
      isLoading: true,
      setUser: (user) => set({ user }),
      toggleRole: () =>
        set((state) => ({
          role: state.role === 'sitter' ? 'anbieter' : 'sitter',
        })),
      setRole: (role) => set({ role }),
      setLoading: (isLoading) => set({ isLoading }),
      clear: () => set({ user: null, role: 'sitter' }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ role: state.role }),
    }
  )
);
