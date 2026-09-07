import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

export default function ImpressumScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('impressum.title')}</Text>
      </View>

      {/* Legal notice per §5 TMG stays in German regardless of app language, as provided. */}
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_700Bold', letterSpacing: 0.3 }}>
          {t('impressum.heading')}
        </Text>
        <Text style={{ fontSize: 17, color: theme.text, fontFamily: 'Nunito_700Bold' }}>
          {t('impressum.projectName')}
        </Text>

        <View>
          <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_700Bold', marginBottom: 4 }}>{t('impressum.representedByLabel')}</Text>
          <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Nunito_400Regular' }}>{t('impressum.representedByValue')}</Text>
        </View>

        <View>
          <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_700Bold', marginBottom: 4 }}>{t('impressum.addressLabel')}</Text>
          <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Nunito_400Regular' }}>{t('impressum.addressValue')}</Text>
        </View>

        <View>
          <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_700Bold', marginBottom: 4 }}>{t('impressum.contactLabel')}</Text>
          <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Nunito_400Regular' }}>{t('impressum.contactPhone')}</Text>
          <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Nunito_400Regular' }}>{t('impressum.contactEmail')}</Text>
        </View>

        <View style={{ marginTop: 8, padding: 14, borderRadius: 14, backgroundColor: theme.surfaceDim }}>
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 18 }}>
            {t('impressum.disclaimer')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
