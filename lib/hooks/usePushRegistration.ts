import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { openNotification } from '@/lib/api/notifications';

const INSTALLATION = 'pawstay-push-installation';
export async function unregisterPushToken() {
  const id = await AsyncStorage.getItem(INSTALLATION);
  const userId = useAuthStore.getState().user?.id;
  if (!id || !userId) return;
  const { error } = await supabase.from('push_tokens').delete().eq('user_id', userId).eq('device_id', id);
  if (error) throw error;
}

export function usePushRegistration() {
  const userId = useAuthStore(s => s.user?.id);
  useEffect(() => {
    if (!userId || Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
    let active = true;
    let busy = false;
    let responseListener: { remove(): void } | undefined;
    let tokenListener: { remove(): void } | undefined;
    const register = async () => {
      if (busy || !active) return;
      busy = true;
      try {
        const Notifications = await import('expo-notifications');
        if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'PawStay', importance: Notifications.AndroidImportance.HIGH });
        let permission = await Notifications.getPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
        if (!permission.granted) { await unregisterPushToken(); return; }
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) return;
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        let installation = await AsyncStorage.getItem(INSTALLATION);
        if (!installation) { installation = `${Date.now()}-${Math.random().toString(36).slice(2)}`; await AsyncStorage.setItem(INSTALLATION, installation); }
        if (!active || useAuthStore.getState().user?.id !== userId) return;
        const { error } = await supabase.rpc('register_push_token', { push_token: token, installation_id: installation });
        if (error) throw error;
      } catch (error) { console.warn('Push registration unavailable:', error instanceof Error ? error.message : 'registration failed'); }
      finally { busy = false; }
    };
    void import('expo-notifications').then(async Notifications => {
      if (!active) return;
      const handle = (response: import('expo-notifications').NotificationResponse) => {
        if (!active) return;
        const data = response.notification.request.content.data;
        // Ignore a previous account's notification on a shared device.
        if (data.profile_id === userId && typeof data.type === 'string') openNotification({ type: data.type, payload: data });
        void Notifications.clearLastNotificationResponseAsync();
      };
      responseListener = Notifications.addNotificationResponseReceivedListener(handle);
      tokenListener = Notifications.addPushTokenListener(() => { void register(); });
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) handle(last);
      void register();
    }).catch(() => {});
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void register(); });
    return () => { active = false; responseListener?.remove(); tokenListener?.remove(); listener.remove(); };
  }, [userId]);
}
