import { createContext, useContext, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { sitterTheme, hostTheme, type AppTheme } from '@/lib/constants/themes';

const ThemeContext = createContext<AppTheme>(sitterTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const role = useAuthStore((s) => s.role);
  return (
    <ThemeContext.Provider value={role === 'anbieter' ? hostTheme : sitterTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
