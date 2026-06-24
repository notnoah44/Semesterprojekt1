import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import type { AppTheme } from '@/lib/constants/themes';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

function SettingsRow({ iconName, iconBg, iconColor, label, onPress, danger }: {
  iconName: MaterialIconName; iconBg: string; iconColor: string;
  label: string; onPress: () => void; danger?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name={iconName} size={22} color={iconColor} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: danger ? theme.error : theme.text }}>
        {label}
      </Text>
      <MaterialIcons name="chevron-right" size={20} color={theme.borderMuted} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('settings.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Card>
          <SectionLabel theme={theme} label={t('settings.account')} />
          <SettingsRow iconName="lock" iconBg={theme.primaryContainer} iconColor={theme.onPrimaryContainer} label={t('settings.changePassword')} onPress={() => router.push('/(tabs)/konto/settings/change-password')} />
          <SettingsRow iconName="language" iconBg={theme.primaryContainer} iconColor={theme.onPrimaryContainer} label={t('settings.language')} onPress={() => router.push('/(tabs)/konto/settings/language')} />
          <SettingsRow iconName="notifications" iconBg={theme.primaryContainer} iconColor={theme.onPrimaryContainer} label={t('settings.notifications')} onPress={() => router.push('/(tabs)/konto/settings/notifications')} />
        </Card>

        <Card>
          <SectionLabel theme={theme} label={t('settings.dangerZone')} />
          <SettingsRow iconName="delete" iconBg={theme.errorContainer} iconColor={theme.error} label={t('settings.deleteAccount')} onPress={() => router.push('/(tabs)/konto/settings/delete-account')} danger />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ theme, label }: { theme: AppTheme; label: string }) {
  return (
    <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: theme.textSubtle, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
      {label}
    </Text>
  );
}
