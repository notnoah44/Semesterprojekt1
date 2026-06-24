import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';

const FAQ = [
  { q: 'How do I create a listing?', a: 'Go to Home → Create Listing. Fill in the 4-step form with your location, responsibilities, and available dates.' },
  { q: 'How does the booking process work?', a: 'A sitter sends a booking request. You review it and accept or decline. Once accepted, you can chat directly.' },
  { q: 'What is the VET Advice Line?', a: 'As a Standard member you get access to a 24/7 veterinary advice line. Tap the phone icon in any chat to connect.' },
  { q: 'How do I upgrade my membership?', a: 'Go to Account → Membership and tap Upgrade to Standard (330€/year). Payment via Stripe.' },
  { q: 'Can I delete my account?', a: 'Yes. Go to Settings → Delete Account. Your data is kept for 30 days in case you change your mind.' },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>Help & Support</Text>
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
            <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: '#065F46' }}>VET Advice Line</Text>
            <Text style={{ fontSize: 14, color: '#047857', fontFamily: 'Nunito_400Regular' }}>24/7 veterinary support</Text>
          </View>
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text }}>FAQ</Text>

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
