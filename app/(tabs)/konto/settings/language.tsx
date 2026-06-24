import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { useLanguageStore } from '@/stores/languageStore';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { Card } from '@/components/ui/Card';

export default function LanguageScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('language.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Card>
          {SUPPORTED_LANGUAGES.map((lang, i) => (
            <View key={lang.code}>
              <TouchableOpacity
                onPress={() => setLanguage(lang.code)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 }}
              >
                <Text style={{ fontSize: 24 }}>{lang.flag}</Text>
                <Text style={{ flex: 1, fontSize: 16, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>{lang.label}</Text>
                {i18n.language === lang.code && <MaterialIcons name="check" size={20} color={theme.primary} />}
              </TouchableOpacity>
              {i < SUPPORTED_LANGUAGES.length - 1 && (
                <View style={{ height: 1, backgroundColor: theme.border }} />
              )}
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
