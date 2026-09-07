import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { getMyListings, deleteListing, upsertListing } from '@/lib/api/listings';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDateRange } from '@/lib/utils/formatDate';
import { getListingDisplayStatus, type ListingDisplayStatus } from '@/lib/utils/listingStatus';
import type { Listing, ListingStatus } from '@/types/listing';

const STATUS_VARIANT: Record<ListingStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  draft: 'warning',
  archived: 'neutral',
};

const STATUS_LABEL_KEY: Record<ListingStatus, string> = {
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

export default function MyListingsScreen() {
  return (
    <RequireAuth>
      <MyListingsContent />
    </RequireAuth>
  );
}

function MyListingsContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ListingDisplayStatus>('all');

  const filteredListings = useMemo(() => {
    if (filter === 'all') return listings;
    return listings.filter((l) => getListingDisplayStatus(l.status, l.available_to) === filter);
  }, [listings, filter]);

  const load = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    getMyListings(user.id)
      .then(setListings)
      .finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleArchive = (listing: Listing) => {
    const next: ListingStatus = listing.status === 'active' ? 'archived' : 'active';
    Alert.alert(
      next === 'archived' ? t('myListings.archiveTitle') : t('myListings.activateTitle'),
      next === 'archived' ? t('myListings.archiveMsg') : t('myListings.activateMsg'),
      [
        { text: t('common.cancel') },
        {
          text: t('myListings.confirm'),
          onPress: async () => {
            await upsertListing({ ...listing, status: next });
            load();
          },
        },
      ]
    );
  };

  const handleDelete = (listing: Listing) => {
    Alert.alert(t('myListings.deleteTitle'), t('myListings.deleteMsg'), [
      { text: t('common.cancel') },
      {
        text: t('savedSearches.deleteBtn'),
        style: 'destructive',
        onPress: async () => {
          await deleteListing(listing.id);
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
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('myListings.title')}</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/search/listings/create')}
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
                <MaterialIcons name="home" size={36} color={theme.borderMuted} />
              </View>
              <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center' }}>
                {filter === 'all' ? t('myListings.empty') : t('myListings.emptyFiltered')}
              </Text>
              {filter === 'all' && (
                <Button label={t('myListings.createListing')} onPress={() => router.push('/(tabs)/search/listings/create')} />
              )}
            </View>
          }
          renderItem={({ item }) => {
            const displayStatus = getListingDisplayStatus(item.status, item.available_to);
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
                  {item.city && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <MaterialIcons name="location-on" size={13} color={theme.textMuted} />
                      <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                        {item.city}, {item.country}
                      </Text>
                    </View>
                  )}
                  {item.available_from && item.available_to && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <MaterialIcons name="event" size={13} color={theme.primary} />
                      <Text style={{ fontSize: 13, color: theme.primary, fontFamily: 'Nunito_600SemiBold' }}>
                        {formatDateRange(item.available_from, item.available_to)}
                      </Text>
                    </View>
                  )}
                </View>
                <Badge label={t(badgeLabelKey)} variant={badgeVariant} />
              </View>

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: theme.border }}>
                <TouchableOpacity
                  onPress={() => router.push(`/(tabs)/search/listings/${item.id}`)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.surfaceDim }}
                >
                  <MaterialIcons name="visibility" size={16} color={theme.textMuted} />
                  <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: theme.textMuted }}>{t('myListings.view')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push(`/(tabs)/search/listings/create?id=${item.id}`)}
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
