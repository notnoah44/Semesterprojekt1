import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { getFavouriteListings, removeFavourite, type FavouriteWithListing } from '@/lib/api/favourites';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDateRange } from '@/lib/utils/formatDate';

export default function FavouritesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const [favourites, setFavourites] = useState<FavouriteWithListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    getFavouriteListings(user.id)
      .then(setFavourites)
      .finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (listingId: string) => {
    if (!user) return;
    setFavourites((prev) => prev.filter((f) => f.listing.id !== listingId));
    await removeFavourite(user.id, listingId);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>Saved Listings</Text>
      </View>

      <FlatList
        data={favourites}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={load}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="favorite-border" size={36} color={theme.borderMuted} />
              </View>
              <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center' }}>
                No saved listings yet.{'\n'}Tap the heart on any listing to save it.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const listing = item.listing;
          return (
            <TouchableOpacity onPress={() => router.push(`/listings/${listing.id}`)}>
              <Card>
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
                  <TouchableOpacity onPress={() => handleRemove(listing.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="favorite" size={22} color={theme.error} />
                  </TouchableOpacity>
                </View>
                {listing.has_pets && (
                  <View style={{ marginTop: 8, flexDirection: 'row' }}>
                    <Badge label="Pets" variant="primary" />
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}
