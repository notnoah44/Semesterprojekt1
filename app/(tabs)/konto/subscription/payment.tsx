import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';

export default function PaymentScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('payment.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Card>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <MaterialIcons name="storefront" size={22} color={theme.primary} />
            <Text style={{ flex: 1, fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular', lineHeight: 20 }}>
              {t('billing.terms')}
            </Text>
          </View>
        </Card>
        <Card variant="filled">
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 18 }}>
            {t('billing.refundHint')}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
