import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

function LegalRow({ iconName, label, onPress }: { iconName: MaterialIconName; label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.secondaryContainer, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name={iconName} size={22} color={theme.secondary} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>
        {label}
      </Text>
      <MaterialIcons name="chevron-right" size={20} color={theme.borderMuted} />
    </TouchableOpacity>
  );
}

export default function LegalScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('konto.legal')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Card>
          <LegalRow iconName="description" label={t('konto.terms')} onPress={() => router.push('/(tabs)/konto/support/legal/terms')} />
          <LegalRow iconName="privacy-tip" label={t('konto.privacy')} onPress={() => router.push('/(tabs)/konto/support/legal/privacy')} />
          <LegalRow iconName="info" label={t('impressum.title')} onPress={() => router.push('/(tabs)/konto/support/legal/impressum')} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
