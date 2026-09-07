import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { getMySitterListings, deleteSitterListing, upsertSitterListing } from '@/lib/api/sitterListings';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDateRange } from '@/lib/utils/formatDate';
import { getSitterListingDisplayStatus, type ListingDisplayStatus } from '@/lib/utils/listingStatus';
import type { SitterListing, SitterListingStatus } from '@/types/sitterListing';

const STATUS_VARIANT: Record<SitterListingStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  draft: 'warning',
  archived: 'neutral',
};

const STATUS_LABEL_KEY: Record<SitterListingStatus, string> = {
  active: 'myListings.statusActive',
  draft: 'myListings.statusDraft',
  archived: 'myListings.statusArchived',
};

const FILTERS: { key: 'all' | ListingDisplayStatus; labelKey: string }[] = [
  { key: 'all', labelKey: 'myListings.filterAll' },
  { key: 'active', labelKey: 'myListings.filterActive' },
  { key: 'inactive', labelKey: 'myListings.filterInactive' },
  { key: 'past', labelKey: 'myListings.filterPast' },
];

export default function MySitterListingsScreen() {
  return (
    <RequireAuth>
      <MySitterListingsContent />
    </RequireAuth>
  );
}

function MySitterListingsContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [listings, setListings] = useState<SitterListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ListingDisplayStatus>('all');

  const filteredListings = useMemo(() => {
    if (filter === 'all') return listings;
    return listings.filter((l) => getSitterListingDisplayStatus(l.status, l.availability_periods) === filter);
  }, [listings, filter]);

  const load = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    getMySitterListings(user.id)
      .then(setListings)
      .finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleArchive = (listing: SitterListing) => {
    const next: SitterListingStatus = listing.status === 'active' ? 'archived' : 'active';
    Alert.alert(
      next === 'archived' ? t('myListings.archiveTitle') : t('myListings.activateTitle'),
      next === 'archived' ? t('myListings.archiveMsg') : t('myListings.activateMsg'),
      [
        { text: t('common.cancel') },
        {
          text: t('myListings.confirm'),
          onPress: async () => {
            await upsertSitterListing({ ...listing, status: next });
            load();
          },
        },
      ]
    );
  };

  const handleDelete = (listing: SitterListing) => {
    Alert.alert(t('myListings.deleteTitle'), t('myListings.deleteMsg'), [
      { text: t('common.cancel') },
      {
        text: t('savedSearches.deleteBtn'),
        style: 'destructive',
        onPress: async () => {
          await deleteSitterListing(listing.id);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('mySitterListings.title')}</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/search/sitter-listings/create')}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.primaryContainer, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialIcons name="add" size={22} color={theme.onPrimaryContainer} />
        </TouchableOpacity>
      </View>

      {/* Status filter tabs */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: active ? theme.primaryContainer : theme.surfaceDim,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: 'Nunito_600SemiBold',
                  color: active ? theme.onPrimaryContainer : theme.textMuted,
                }}
              >
                {t(f.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          refreshing={isLoading}
          onRefresh={load}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 16 }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="pets" size={36} color={theme.borderMuted} />
              </View>
              <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center' }}>
                {filter === 'all' ? t('mySitterListings.empty') : t('myListings.emptyFiltered')}
              </Text>
              {filter === 'all' && (
                <Button label={t('mySitterListings.createListing')} onPress={() => router.push('/(tabs)/search/sitter-listings/create')} />
              )}
            </View>
          }
          renderItem={({ item }) => {
            const displayStatus = getSitterListingDisplayStatus(item.status, item.availability_periods);
            const badgeLabelKey = displayStatus === 'past' ? 'myListings.statusPast' : STATUS_LABEL_KEY[item.status];
            const badgeVariant = displayStatus === 'past' ? 'warning' : STATUS_VARIANT[item.status];
            return (
            <Card style={{ gap: 10 }}>
              {/* Title + status */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                    {item.title}
                  </Text>
                  {item.locations.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <MaterialIcons name="location-on" size={13} color={theme.textMuted} />
                      <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }} numberOfLines={1}>
                        {item.locations.map((l) => [l.city, l.country].filter(Boolean).join(', ')).join(' · ')}
                      </Text>
                    </View>
                  )}
                  {item.availability_periods.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <MaterialIcons name="event" size={13} color={theme.primary} />
                      <Text style={{ fontSize: 13, color: theme.primary, fontFamily: 'Nunito_600SemiBold' }} numberOfLines={1}>
                        {item.availability_periods.map((p) => formatDateRange(p.from, p.to)).join(' · ')}
                      </Text>
                    </View>
                  )}
                </View>
                <Badge label={t(badgeLabelKey)} variant={badgeVariant} />
              </View>

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: theme.border }}>
                <TouchableOpacity
                  onPress={() => router.push(`/(tabs)/search/sitters/${item.id}`)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.surfaceDim }}
                >
                  <MaterialIcons name="visibility" size={16} color={theme.textMuted} />
                  <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: theme.textMuted }}>{t('myListings.view')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push(`/(tabs)/search/sitter-listings/create?id=${item.id}`)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.primaryContainer }}
                >
                  <MaterialIcons name="edit" size={16} color={theme.onPrimaryContainer} />
                  <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: theme.onPrimaryContainer }}>{t('myListings.edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleArchive(item)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.surfaceDim }}
                >
                  <MaterialIcons name={item.status === 'active' ? 'archive' : 'unarchive'} size={16} color={theme.textMuted} />
                  <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: theme.textMuted }}>
                    {item.status === 'active' ? t('myListings.archive') : t('myListings.activate')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.errorContainer }}
                >
                  <MaterialIcons name="delete" size={16} color={theme.error} />
                </TouchableOpacity>
              </View>
            </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
