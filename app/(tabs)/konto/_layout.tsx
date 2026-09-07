import { Stack } from 'expo-router';
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function KontoLayout() {
  return (
    <RequireAuth>
      <Stack screenOptions={{ headerShown: false }} />
    </RequireAuth>
  );
}
