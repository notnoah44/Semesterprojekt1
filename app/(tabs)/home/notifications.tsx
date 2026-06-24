import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils/formatDate';

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { notifications, markRead, markAllRead } = useNotificationStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>
          Notifications
        </Text>
        {notifications.some((n) => !n.read) && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={{ color: theme.primary, fontFamily: 'Nunito_600SemiBold', fontSize: 14 }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="notifications" size={36} color={theme.borderMuted} />
          </View>
          <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
            No notifications yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => markRead(item.id)}>
              <Card style={{
                backgroundColor: item.read ? theme.surface : theme.primaryContainer,
                borderColor: item.read ? theme.border : theme.primary,
              }}>
                <Text style={{ fontSize: 14, fontFamily: item.read ? 'Nunito_400Regular' : 'Nunito_700Bold', color: theme.text }}>
                  {item.type.replace(/_/g, ' ')}
                </Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 4 }}>
                  {formatDate(item.created_at)}
                </Text>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
