import { View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { upsertProfile } from '@/lib/api/profiles';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import type { NotificationEventType, NotificationChannelPrefs } from '@/types/user';

const NOTIFICATION_TYPE_KEYS: NotificationEventType[] = [
  'new_message', 'booking_request', 'booking_update', 'favourite', 'membership', 'search_alert',
];

const DEFAULT_PREFS: Record<NotificationEventType, NotificationChannelPrefs> = {
  new_message: { push: true, email: true },
  booking_request: { push: true, email: true },
  booking_update: { push: true, email: true },
  favourite: { push: true, email: false },
  membership: { push: true, email: true },
  search_alert: { push: true, email: false },
};

function ChannelToggle({ label, icon, value, onValueChange }: {
  label: string; icon: React.ComponentProps<typeof MaterialIcons>['name']; value: boolean; onValueChange: (v: boolean) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <MaterialIcons name={icon} size={13} color={theme.textMuted} />
        <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'Nunito_600SemiBold' }}>{label}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: theme.primary, false: theme.border }} />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const theme = useAppTheme();
  const { t } = useTranslation();

  const prefs = user?.notification_preferences ?? DEFAULT_PREFS;

  const TYPE_LABELS: Record<NotificationEventType, { label: string; description: string }> = {
    new_message: { label: t('notificationSettings.type1Label'), description: t('notificationSettings.type1Desc') },
    booking_request: { label: t('notificationSettings.type2Label'), description: t('notificationSettings.type2Desc') },
    booking_update: { label: t('notificationSettings.type3Label'), description: t('notificationSettings.type3Desc') },
    favourite: { label: t('notificationSettings.type4Label'), description: t('notificationSettings.type4Desc') },
    membership: { label: t('notificationSettings.type5Label'), description: t('notificationSettings.type5Desc') },
    search_alert: { label: t('notificationSettings.type6Label'), description: t('notificationSettings.type6Desc') },
  };

  const handleToggle = async (type: NotificationEventType, channel: 'push' | 'email', value: boolean) => {
    if (!user) return;
    const nextPrefs: Record<NotificationEventType, NotificationChannelPrefs> = {
      ...prefs,
      [type]: { ...(prefs[type] ?? DEFAULT_PREFS[type]), [channel]: value },
    };
    setUser({ ...user, notification_preferences: nextPrefs });
    try {
      await upsertProfile({ id: user.id, notification_preferences: nextPrefs });
    } catch {
      setUser(user);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('notificationSettings.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Card>
          {NOTIFICATION_TYPE_KEYS.map((key, i) => {
            const channelPrefs = prefs[key] ?? DEFAULT_PREFS[key];
            return (
              <View key={key}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>{TYPE_LABELS[key].label}</Text>
                    <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 2 }}>{TYPE_LABELS[key].description}</Text>
                  </View>
                  <ChannelToggle
                    label={t('notificationSettings.push')}
                    icon="notifications"
                    value={channelPrefs.push}
                    onValueChange={(v) => handleToggle(key, 'push', v)}
                  />
                  <ChannelToggle
                    label={t('notificationSettings.email')}
                    icon="mail-outline"
                    value={channelPrefs.email}
                    onValueChange={(v) => handleToggle(key, 'email', v)}
                  />
                </View>
                {i < NOTIFICATION_TYPE_KEYS.length - 1 && (
                  <View style={{ height: 1, backgroundColor: theme.border }} />
                )}
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
