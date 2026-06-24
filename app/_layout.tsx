import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, Nunito_300Light, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { getProfile } from '@/lib/api/profiles';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import '@/lib/i18n';
import '@/stores/languageStore';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { setUser, setLoading, isLoading } = useAuthStore();

  const [fontsLoaded, fontError] = useFonts({
    Nunito_300Light,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    // Safety net — if Supabase never fires, unblock after 5 s
    const timeout = setTimeout(() => setLoading(false), 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        clearTimeout(timeout);
        if (session?.user) {
          try {
            const profile = await getProfile(session.user.id);
            setUser(profile);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );
    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [setUser, setLoading]);

  useEffect(() => {
    if (!fontsReady || isLoading) return;
    SplashScreen.hideAsync();
  }, [fontsReady, isLoading]);

  useEffect(() => {
    if (isLoading || !fontsReady) return;
    const user = useAuthStore.getState().user;
    const inAuth = segments[0] === '(auth)';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)/home');
    }
  }, [isLoading, fontsReady, segments, router]);

  if (!fontsReady || isLoading) return null;

  return (
    <ThemeProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
