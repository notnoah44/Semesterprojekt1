import { TouchableOpacity, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

export function NotificationBell() {
  const router = useRouter();
  const theme = useAppTheme();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <TouchableOpacity
      onPress={() => router.push('/(tabs)/home/notifications')}
      style={{ position: 'relative', padding: 4 }}
    >
      <MaterialIcons name="notifications" size={26} color={theme.text} />
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute',
          top: 0,
          right: 0,
          backgroundColor: theme.error,
          borderRadius: 99,
          width: 18,
          height: 18,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Nunito_700Bold' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
