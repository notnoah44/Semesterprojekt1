import { useProfileRefresh } from '@/lib/hooks/useProfileRefresh';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, Nunito_300Light, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { getProfile } from '@/lib/api/profiles';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import '@/lib/i18n';
import '@/stores/languageStore';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useProfileRefresh();
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

  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (isLoading || !fontsReady) return;
    const inAuth = segments[0] === '(auth)';
    const inOnboarding = inAuth && (segments as string[])[1] === 'onboarding';

    // Guests may browse freely; only bounce logged-in users away from the auth
    // screens — except onboarding, which a freshly registered user must still
    // go through (registration leaves the user signed in immediately).
    if (user && inAuth && !inOnboarding) {
      router.replace('/(tabs)/home');
    }
  }, [isLoading, fontsReady, segments, router, user]);

  if (!fontsReady || isLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
