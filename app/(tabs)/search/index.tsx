import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRole } from '@/lib/hooks/useRole';
import { useSearch } from '@/lib/hooks/useSearch';
import { useSearchStore } from '@/stores/searchStore';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { getBookingsForOwner } from '@/lib/api/bookings';
import { getFavouriteListingIds, addFavourite, removeFavourite } from '@/lib/api/favourites';
import { createSavedSearch } from '@/lib/api/savedSearches';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { formatDateRange } from '@/lib/utils/formatDate';
import type { Listing } from '@/types/listing';
import type { BookingStatus } from '@/types/booking';

const STATUS_VARIANT: Record<BookingStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  accepted: 'success',
  pending: 'warning',
  rejected: 'danger',
  completed: 'neutral',
  cancelled: 'neutral',
};

function ListingCard({ listing, isFavourite, onToggleFavourite }: {
  listing: Listing;
  isFavourite: boolean;
  onToggleFavourite: (id: string) => void;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  return (
    <TouchableOpacity onPress={() => router.push(`/listings/${listing.id}`)}>
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.text }}>{listing.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <MaterialIcons name="location-on" size={13} color={theme.textMuted} />
              <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                {listing.city}, {listing.country}
              </Text>
            </View>
            {listing.available_from && listing.available_to && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <MaterialIcons name="event" size={13} color={theme.primary} />
                <Text style={{ fontSize: 13, color: theme.primary, fontFamily: 'Nunito_600SemiBold' }}>
                  {formatDateRange(listing.available_from, listing.available_to)}
                </Text>
              </View>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <TouchableOpacity onPress={() => onToggleFavourite(listing.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name={isFavourite ? 'favorite' : 'favorite-border'} size={22} color={isFavourite ? theme.error : theme.borderMuted} />
            </TouchableOpacity>
            {listing.has_pets && <Badge label="Pets" variant="primary" />}
          </View>
        </View>
        {listing.description && (
          <Text numberOfLines={2} style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 8 }}>
            {listing.description}
          </Text>
        )}
      </Card>
    </TouchableOpacity>
  );
}

// ─── Host bookings view ───────────────────────────────────────────────────────

function HostBookingsView() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    getBookingsForOwner(user.id).then(setBookings).finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={load}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="event" size={36} color={theme.borderMuted} />
              </View>
              <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center' }}>
                No bookings yet.{'\n'}Publish a listing to start receiving requests.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/bookings/${item.id}`)}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                    {item.listing?.title ?? 'Listing'}
                  </Text>
                  {item.start_date && item.end_date && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <MaterialIcons name="event" size={13} color={theme.primary} />
                      <Text style={{ fontSize: 13, color: theme.primary, fontFamily: 'Nunito_600SemiBold' }}>
                        {formatDateRange(item.start_date, item.end_date)}
                      </Text>
                    </View>
                  )}
                </View>
                <Badge label={item.status} variant={STATUS_VARIANT[item.status as BookingStatus]} />
              </View>
              {item.sitter && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
                  <Avatar uri={item.sitter.avatar_url} name={item.sitter.full_name} size={32} />
                  <Text style={{ fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>
                    {item.sitter.full_name}
                  </Text>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

// ─── Sitter search view ───────────────────────────────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const { isSitter } = useRole();
  const { results, isLoading, search } = useSearch();
  const { updateFilter, filters } = useSearchStore();
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const [keyword, setKeyword] = useState('');
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  // Re-runs whenever filters change (search is memoised on filters)
  useEffect(() => { search(); }, [search]);

  useEffect(() => {
    if (!user) return;
    getFavouriteListingIds(user.id)
      .then((ids) => setFavIds(new Set(ids)))
      .catch(() => {});
  }, [user]);

  const handleSearch = () => {
    updateFilter('keyword', keyword);
  };

  const toggleFavourite = useCallback(async (listingId: string) => {
    if (!user) return;
    const isFav = favIds.has(listingId);
    setFavIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(listingId); else next.add(listingId);
      return next;
    });
    try {
      if (isFav) await removeFavourite(user.id, listingId);
      else await addFavourite(user.id, listingId);
    } catch {
      setFavIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(listingId); else next.delete(listingId);
        return next;
      });
    }
  }, [user, favIds]);

  const handleSaveSearch = async () => {
    if (!user) return;
    const name = [filters.keyword, filters.city, filters.country].filter(Boolean).join(' ') || 'My search';
    try {
      await createSavedSearch(user.id, name, filters);
      Alert.alert('Search saved', `"${name}" was added to your saved searches.`);
    } catch {
      Alert.alert('Error', 'Could not save this search.');
    }
  };

  if (!isSitter) return <HostBookingsView />;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
            <MaterialIcons name="search" size={20} color={theme.textMuted} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: theme.text, fontFamily: 'Nunito_400Regular' }}
              placeholder="City, country or keyword…"
              placeholderTextColor={theme.textMuted}
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            onPress={() => router.push('/saved-searches')}
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <MaterialIcons name="bookmark" size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/favourites')}
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <MaterialIcons name="favorite" size={20} color={theme.error} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => updateFilter('hasPets', filters.hasPets === true ? null : true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: filters.hasPets === true ? theme.primaryContainer : theme.surfaceDim, borderWidth: 1, borderColor: filters.hasPets === true ? theme.primary : theme.border }}
          >
            <MaterialCommunityIcons name="paw" size={14} color={filters.hasPets === true ? theme.onPrimaryContainer : theme.textMuted} />
            <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: filters.hasPets === true ? theme.onPrimaryContainer : theme.textMuted }}>With Pets</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => updateFilter('hasPets', filters.hasPets === false ? null : false)}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: filters.hasPets === false ? theme.primaryContainer : theme.surfaceDim, borderWidth: 1, borderColor: filters.hasPets === false ? theme.primary : theme.border }}
          >
            <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: filters.hasPets === false ? theme.onPrimaryContainer : theme.textMuted }}>Without Pets</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSaveSearch}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: theme.surfaceDim, borderWidth: 1, borderColor: theme.border, marginLeft: 'auto' }}
          >
            <MaterialIcons name="bookmark-add" size={15} color={theme.textMuted} />
            <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: theme.textMuted }}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshing={isLoading}
        onRefresh={search}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="search" size={36} color={theme.borderMuted} />
            </View>
            <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
              {isLoading ? 'Searching…' : 'No listings found'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard listing={item} isFavourite={favIds.has(item.id)} onToggleFavourite={toggleFavourite} />
        )}
      />
    </SafeAreaView>
  );
}
