import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

export default function AboutScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('about.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Nunito_400Regular', lineHeight: 22 }}>
          {t('about.intro')}
        </Text>
        <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Nunito_400Regular', lineHeight: 22 }}>
          {t('about.mission')}
        </Text>
        <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Nunito_600SemiBold', lineHeight: 22 }}>
          {t('about.team')}
        </Text>
        <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 20 }}>
          {t('about.disclaimer')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
