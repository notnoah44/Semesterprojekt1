import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { getSitterListings } from '@/lib/api/sitterListings';
import { getFavouriteSitterIds, addFavouriteSitter, removeFavouriteSitter } from '@/lib/api/favourites';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { formatDateRange } from '@/lib/utils/formatDate';
import type { SitterListingWithProfile } from '@/types/sitterListing';

function SitterCard({ listing, isFavourite, onToggleFavourite }: {
  listing: SitterListingWithProfile;
  isFavourite: boolean;
  onToggleFavourite: (sitterId: string) => void;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  return (
    <TouchableOpacity onPress={() => router.push(`/(tabs)/search/sitters/${listing.id}`)}>
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Avatar uri={listing.cover_photo ?? listing.sitter?.avatar_url} name={listing.sitter?.full_name} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.text }}>{listing.title}</Text>
            {listing.locations.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <MaterialIcons name="location-on" size={13} color={theme.textMuted} />
                <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }} numberOfLines={1}>
                  {listing.locations.map((l) => [l.city, l.country].filter(Boolean).join(', ')).join(' · ')}
                </Text>
              </View>
            )}
            {listing.availability_periods.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <MaterialIcons name="event" size={13} color={theme.primary} />
                <Text style={{ fontSize: 13, color: theme.primary, fontFamily: 'Nunito_600SemiBold' }} numberOfLines={1}>
                  {listing.availability_periods.map((p) => formatDateRange(p.from, p.to)).join(' · ')}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => onToggleFavourite(listing.sitter_id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name={isFavourite ? 'favorite' : 'favorite-border'} size={22} color={isFavourite ? theme.error : theme.borderMuted} />
          </TouchableOpacity>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

/** Sitter-Suche für Hosts (Rechtematrix-neutral) — Tab-Root für Host in "Suche" (Punkt 9) und eigenständige Route unter search/sitters. */
export function SitterSearchView() {
  const user = useAuthStore((s) => s.user);
  const ensureAuth = useRequireAuth();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SitterListingWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  const search = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSitterListings({ keyword: keyword || undefined });
      setResults(data);
    } finally {
      setIsLoading(false);
    }
  }, [keyword]);

  useEffect(() => { search(); }, []);

  useEffect(() => {
    if (!user) return;
    getFavouriteSitterIds(user.id)
      .then((ids) => setFavIds(new Set(ids)))
      .catch(() => {});
  }, [user]);

  const toggleFavourite = useCallback(async (sitterId: string) => {
    if (!ensureAuth() || !user) return;
    const isFav = favIds.has(sitterId);
    setFavIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(sitterId); else next.add(sitterId);
      return next;
    });
    try {
      if (isFav) await removeFavouriteSitter(user.id, sitterId);
      else await addFavouriteSitter(user.id, sitterId);
    } catch {
      setFavIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(sitterId); else next.delete(sitterId);
        return next;
      });
    }
  }, [user, favIds, ensureAuth]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
          <MaterialIcons name="search" size={20} color={theme.textMuted} />
          <TextInput
            style={{ flex: 1, fontSize: 15, color: theme.text, fontFamily: 'Nunito_400Regular' }}
            placeholder={t('sitterSearch.placeholder')}
            placeholderTextColor={theme.textMuted}
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={search}
            returnKeyType="search"
          />
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
              {isLoading ? t('search.searching') : t('sitterSearch.noResults')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SitterCard listing={item} isFavourite={favIds.has(item.sitter_id)} onToggleFavourite={toggleFavourite} />
        )}
      />
    </SafeAreaView>
  );
}
