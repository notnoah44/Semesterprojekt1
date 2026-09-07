import { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useRole } from '@/lib/hooks/useRole';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { getMyListings } from '@/lib/api/listings';
import { getMySitterListings } from '@/lib/api/sitterListings';
import { getListingDisplayStatus, getSitterListingDisplayStatus, type ListingDisplayStatus } from '@/lib/utils/listingStatus';
import type { AppTheme } from '@/lib/constants/themes';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

const STATUS_VARIANT: Record<ListingDisplayStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  inactive: 'neutral',
  past: 'warning',
};
const STATUS_LABEL_KEY: Record<ListingDisplayStatus, string> = {
  active: 'myListings.statusActive',
  inactive: 'myListings.statusArchived',
  past: 'myListings.statusPast',
};

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isSitter } = useRole();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [myListings, setMyListings] = useState<{ id: string; title: string; status: ListingDisplayStatus }[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      if (isSitter) {
        getMySitterListings(user.id)
          .then((items) => setMyListings(items.map((l) => ({ id: l.id, title: l.title, status: getSitterListingDisplayStatus(l.status, l.availability_periods) }))))
          .catch(() => {});
      } else {
        getMyListings(user.id)
          .then((items) => setMyListings(items.map((l) => ({ id: l.id, title: l.title, status: getListingDisplayStatus(l.status, l.available_to) }))))
          .catch(() => {});
      }
    }, [user, isSitter])
  );

  const firstName = user?.full_name?.split(' ')[0];

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

        {/* Greeting header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 30, fontFamily: 'Nunito_700Bold', color: theme.text, lineHeight: 36 }}>
                {firstName ? `${t('home.hi')} ${firstName}` : t('home.hi')} 👋
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
              <MaterialIcons name="search" size={26} color="#fff" />
            </View>
            <Text style={{ fontSize: 22, fontFamily: 'Nunito_700Bold', color: '#fff', marginBottom: 8, lineHeight: 28 }}>
              {isSitter ? t('home.findHousesit') : t('home.findSitter')}
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: 'Nunito_400Regular', marginBottom: 24, lineHeight: 20 }}>
              {isSitter ? t('home.findHousesitSub') : t('home.findSitterSub')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/search')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 99 }}
            >
              <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: theme.primary }}>
                {isSitter ? t('home.browseListings') : t('home.searchSitters')}
              </Text>
              <MaterialIcons name="arrow-forward" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 20 }}>
          <QuickAction theme={theme} iconName="add-circle" label={t('home.newListing')} onPress={() => router.push(isSitter ? '/(tabs)/search/sitter-listings/create' : '/(tabs)/search/listings/create')} />
          <QuickAction theme={theme} iconName="favorite" label={t('home.saved')} onPress={() => router.push('/(tabs)/search/favourites')} />
          <QuickAction theme={theme} iconName="event" label={t('home.bookings')} onPress={() => router.push('/(tabs)/home/bookings')} />
        </View>

        {/* My listings */}
        <View style={{ marginTop: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12 }}>
            <Text style={{ flex: 1, fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text }}>
              {t('home.myListings')}
            </Text>
            {myListings.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push(isSitter ? '/(tabs)/search/sitter-listings/my-listings' : '/(tabs)/search/listings/my-listings')}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Nunito_700Bold', color: theme.primary }}>
                  {t('home.seeAll')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {myListings.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {myListings.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(isSitter ? `/(tabs)/search/sitters/${item.id}` : `/(tabs)/search/listings/${item.id}`)}
                  style={{ width: 180, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 14, gap: 8 }}
                >
                  <Badge label={t(STATUS_LABEL_KEY[item.status])} variant={STATUS_VARIANT[item.status]} />
                  <Text numberOfLines={2} style={{ fontSize: 14, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity
              onPress={() => router.push(isSitter ? '/(tabs)/search/sitter-listings/create' : '/(tabs)/search/listings/create')}
              style={{ marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 16 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="add-circle-outline" size={22} color={theme.onPrimaryContainer} />
              </View>
              <Text style={{ flex: 1, fontSize: 13, fontFamily: 'Nunito_400Regular', color: theme.textMuted }}>
                {t('home.myListingsEmpty')}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Nunito_700Bold', color: theme.primary }}>
                {t('home.myListingsEmptyCta')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* How it works */}
        <View style={{ marginHorizontal: 20, marginTop: 28 }}>
          <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 16 }}>
            {t('home.howItWorks')}
          </Text>
          {(isSitter ? sitterSteps(t) : hostSteps(t)).map((step, i) => (
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

type TFunc = (key: string) => string;

const sitterSteps = (t: TFunc) => [
  { icon: 'search', title: t('home.sitterStep1Title'), description: t('home.sitterStep1Desc') },
  { icon: 'chat', title: t('home.sitterStep2Title'), description: t('home.sitterStep2Desc') },
  { icon: 'verified', title: t('home.sitterStep3Title'), description: t('home.sitterStep3Desc') },
];

const hostSteps = (t: TFunc) => [
  { icon: 'edit-note', title: t('home.hostStep1Title'), description: t('home.hostStep1Desc') },
  { icon: 'people', title: t('home.hostStep2Title'), description: t('home.hostStep2Desc') },
  { icon: 'check-circle', title: t('home.hostStep3Title'), description: t('home.hostStep3Desc') },
];
