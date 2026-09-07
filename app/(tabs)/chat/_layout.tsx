import { Stack } from 'expo-router';
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function ChatLayout() {
  return (
    <RequireAuth>
      <Stack screenOptions={{ headerShown: false }} />
    </RequireAuth>
  );
}
