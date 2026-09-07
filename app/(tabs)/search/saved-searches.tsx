import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useSearchStore } from '@/stores/searchStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { getSavedSearches, deleteSavedSearch, type SavedSearchRow } from '@/lib/api/savedSearches';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { TFunction } from 'i18next';

function summarise(s: SavedSearchRow, t: TFunction): string[] {
  const f = s.filters ?? {};
  const parts: string[] = [];
  if (f.keyword) parts.push(`"${f.keyword}"`);
  if (f.city) parts.push(f.city);
  if (f.country) parts.push(f.country);
  if (f.hasPets === true) parts.push(t('savedSearches.withPets'));
  if (f.hasPets === false) parts.push(t('savedSearches.noPets'));
  return parts.length ? parts : [t('savedSearches.allListings')];
}

export default function SavedSearchesScreen() {
  return (
    <RequireAuth>
      <SavedSearchesContent />
    </RequireAuth>
  );
}

function SavedSearchesContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setFilters = useSearchStore((s) => s.setFilters);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [searches, setSearches] = useState<SavedSearchRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    getSavedSearches(user.id)
      .then(setSearches)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const applySearch = (s: SavedSearchRow) => {
    setFilters(s.filters ?? {});
    router.push('/(tabs)/search');
  };

  const handleDelete = (s: SavedSearchRow) => {
    Alert.alert(t('savedSearches.deleteTitle'), t('savedSearches.deleteMsg'), [
      { text: t('common.cancel') },
      {
        text: t('savedSearches.deleteBtn'),
        style: 'destructive',
        onPress: async () => {
          setSearches((prev) => prev.filter((x) => x.id !== s.id));
          try { await deleteSavedSearch(s.id); } catch { load(); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('savedSearches.title')}</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={searches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          refreshing={isLoading}
          onRefresh={load}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="bookmark-border" size={36} color={theme.borderMuted} />
              </View>
              <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center' }}>
                {t('savedSearches.empty')}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => applySearch(item)} activeOpacity={0.8}>
              <Card style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name="magnify" size={24} color={theme.onPrimaryContainer} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                      {item.name || t('search.mySearchFallback')}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {summarise(item, t).map((p, i) => (
                        <Badge key={i} label={p} variant="neutral" />
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="delete-outline" size={22} color={theme.error} />
                  </TouchableOpacity>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
