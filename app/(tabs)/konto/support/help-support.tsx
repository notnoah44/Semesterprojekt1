import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';

export default function HelpSupportScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const FAQ = [
    { q: t('helpSupport.faq1Q'), a: t('helpSupport.faq1A') },
    { q: t('helpSupport.faq2Q'), a: t('helpSupport.faq2A') },
    { q: t('helpSupport.faq3Q'), a: t('helpSupport.faq3A') },
    { q: t('helpSupport.faq4Q'), a: t('helpSupport.faq4A') },
    { q: t('helpSupport.faq5Q'), a: t('helpSupport.faq5A') },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('helpSupport.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <TouchableOpacity
          onPress={() => Linking.openURL('tel:+491234567890')}
          style={{ backgroundColor: '#D1FAE5', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#A7F3D0', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="phone" size={24} color="#065F46" />
          </View>
          <View>
            <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: '#065F46' }}>{t('chat.vetAdviceLine')}</Text>
            <Text style={{ fontSize: 14, color: '#047857', fontFamily: 'Nunito_400Regular' }}>{t('helpSupport.vetAdviceDesc')}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Linking.openURL('mailto:support@pawstay.de')}
          style={{ backgroundColor: '#DBEAFE', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="email" size={24} color="#1E40AF" />
          </View>
          <View>
            <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: '#1E40AF' }}>{t('helpSupport.emailContact')}</Text>
            <Text style={{ fontSize: 14, color: '#1D4ED8', fontFamily: 'Nunito_400Regular' }}>{t('helpSupport.emailContactDesc')}</Text>
          </View>
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('helpSupport.faqTitle')}</Text>

        {FAQ.map((item, i) => (
          <Card key={i}>
            <TouchableOpacity
              onPress={() => setOpenIndex(openIndex === i ? null : i)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Text style={{ flex: 1, fontSize: 15, fontFamily: 'Nunito_700Bold', color: theme.text }}>{item.q}</Text>
              <MaterialIcons
                name={openIndex === i ? 'expand-less' : 'expand-more'}
                size={22}
                color={theme.textMuted}
              />
            </TouchableOpacity>
            {openIndex === i && (
              <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 10, lineHeight: 20 }}>
                {item.a}
              </Text>
            )}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
