import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useRole } from '@/lib/hooks/useRole';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';
import type { AppTheme } from '@/lib/constants/themes';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isSitter } = useRole();
  const theme = useAppTheme();
  const { t } = useTranslation();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.goodMorning');
    if (hour < 18) return t('home.goodAfternoon');
    return t('home.goodEvening');
  };

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

        {/* Greeting header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 4 }}>
                {greeting()}
              </Text>
              <Text style={{ fontSize: 30, fontFamily: 'Nunito_700Bold', color: theme.text, lineHeight: 36 }}>
                {firstName} 👋
              </Text>
            </View>
            <Avatar uri={user?.avatar_url} name={user?.full_name} size={56} />
          </View>
        </View>

        {/* Hero CTA */}
        <View style={{ marginHorizontal: 20, borderRadius: 24, overflow: 'hidden' }}>
          <View style={{ backgroundColor: theme.primary, padding: 28 }}>
            <View style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <View style={{ position: 'absolute', top: 20, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.12)' }} />

            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <MaterialIcons name={isSitter ? 'search' : 'home'} size={26} color="#fff" />
            </View>
            <Text style={{ fontSize: 22, fontFamily: 'Nunito_700Bold', color: '#fff', marginBottom: 8, lineHeight: 28 }}>
              {isSitter ? t('home.findHousesit') : t('home.welcomeHost')}
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: 'Nunito_400Regular', marginBottom: 24, lineHeight: 20 }}>
              {isSitter ? t('home.findHousesitSub') : t('home.welcomeHostSub')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push(isSitter ? '/(tabs)/search' : '/listings/create')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 99 }}
            >
              <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: theme.primary }}>
                {isSitter ? t('home.browseListings') : t('home.createListing')}
              </Text>
              <MaterialIcons name="arrow-forward" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 20 }}>
          {isSitter ? (
            <>
              <QuickAction theme={theme} iconName="search" label={t('home.search')} onPress={() => router.push('/(tabs)/search')} />
              <QuickAction theme={theme} iconName="favorite" label={t('home.saved')} onPress={() => router.push('/favourites')} />
              <QuickAction theme={theme} iconName="event" label={t('home.bookings')} onPress={() => router.push('/bookings')} />
            </>
          ) : (
            <>
              <QuickAction theme={theme} iconName="add-circle" label={t('home.newListing')} onPress={() => router.push('/listings/create')} />
              <QuickAction theme={theme} iconName="inbox" label={t('home.requests')} onPress={() => router.push('/(tabs)/search')} />
              <QuickAction theme={theme} iconName="chat" label={t('home.messages')} onPress={() => router.push('/(tabs)/chat')} />
            </>
          )}
        </View>

        {/* How it works */}
        <View style={{ marginHorizontal: 20, marginTop: 28 }}>
          <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 16 }}>
            {t('home.howItWorks')}
          </Text>
          {(isSitter ? SITTER_STEPS : HOST_STEPS).map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.primaryContainer, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MaterialIcons name={step.icon as MaterialIconName} size={22} color={theme.onPrimaryContainer} />
              </View>
              <View style={{ flex: 1, paddingTop: 2 }}>
                <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 3 }}>
                  {step.title}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Nunito_400Regular', color: theme.textMuted, lineHeight: 19 }}>
                  {step.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ iconName, label, onPress, theme }: {
  iconName: MaterialIconName; label: string; onPress: () => void; theme: AppTheme;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', gap: 8, backgroundColor: theme.surface, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.border }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name={iconName} size={20} color={theme.onPrimaryContainer} />
      </View>
      <Text style={{ fontSize: 12, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const SITTER_STEPS = [
  { icon: 'search', title: 'Find a listing', description: 'Search homes by location, dates, and pet preferences.' },
  { icon: 'chat', title: 'Contact the host', description: 'Message the homeowner to introduce yourself.' },
  { icon: 'verified', title: 'Get confirmed', description: "Once the host accepts, you're all set to housesit." },
];

const HOST_STEPS = [
  { icon: 'edit-note', title: 'Create a listing', description: 'Describe your home, dates available, and any pets.' },
  { icon: 'people', title: 'Review applicants', description: 'Browse sitter profiles and read their reviews.' },
  { icon: 'check-circle', title: 'Confirm a sitter', description: 'Accept the best match and relax knowing your home is safe.' },
];
