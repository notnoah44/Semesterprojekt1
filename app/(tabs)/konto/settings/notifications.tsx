import { View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';

const NOTIFICATION_TYPES = [
  { key: 'new_message', label: 'New messages', description: 'When you receive a chat message' },
  { key: 'booking_request', label: 'Booking requests', description: 'New booking request for your listing' },
  { key: 'booking_update', label: 'Booking updates', description: 'Accepted, rejected or cancelled bookings' },
  { key: 'favourite', label: 'Favourites', description: 'When someone favourites your profile or listing' },
  { key: 'membership', label: 'Membership reminders', description: '7 days before membership expires' },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t.key, true]))
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Card>
          {NOTIFICATION_TYPES.map((type, i) => (
            <View key={type.key}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>{type.label}</Text>
                  <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 2 }}>{type.description}</Text>
                </View>
                <Switch
                  value={enabled[type.key]}
                  onValueChange={(v) => setEnabled((prev) => ({ ...prev, [type.key]: v }))}
                  trackColor={{ true: theme.primary, false: theme.border }}
                />
              </View>
              {i < NOTIFICATION_TYPES.length - 1 && (
                <View style={{ height: 1, backgroundColor: theme.border }} />
              )}
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
