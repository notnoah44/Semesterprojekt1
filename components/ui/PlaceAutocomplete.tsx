import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { searchPlaces, type PlaceSuggestion } from '@/lib/api/geocoding';
import type { AppTheme } from '@/lib/constants/themes';

const DEBOUNCE_MS = 500;

interface PlaceAutocompleteProps {
  theme: AppTheme;
  placeholder?: string;
  onSelect: (place: { city: string; country: string }) => void;
}

/**
 * Orts-Eingabe mit Tipp-Vorschlägen aus OpenStreetMap Nominatim (Punkt 5) —
 * ersetzt die vorherige Freitext-Eingabe für Stadt/Land, um Tippfehler und
 * uneinheitliche Schreibweisen zu vermeiden.
 */
export function PlaceAutocomplete({ theme, placeholder, onSelect }: PlaceAutocompleteProps) {
  const { i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      searchPlaces(query, i18n.language)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setIsLoading(false));
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, i18n.language]);

  const handleSelect = (place: PlaceSuggestion) => {
    onSelect({ city: place.city, country: place.country });
    setQuery('');
    setSuggestions([]);
  };

  return (
    <View>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: theme.surfaceVariant, borderRadius: 14, borderWidth: 1, borderColor: theme.border,
        paddingHorizontal: 14, paddingVertical: 12, marginBottom: suggestions.length > 0 ? 4 : 12,
      }}>
        <TextInput
          style={{ flex: 1, fontSize: 15, color: theme.text, fontFamily: 'Nunito_400Regular' }}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          autoCorrect={false}
        />
        {isLoading && <ActivityIndicator size="small" color={theme.primary} />}
      </View>

      {suggestions.length > 0 && (
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, marginBottom: 12, overflow: 'hidden' }}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => handleSelect(s)}
              style={{
                paddingHorizontal: 14, paddingVertical: 12,
                borderTopWidth: i > 0 ? 1 : 0, borderTopColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>{s.city}</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Nunito_400Regular', color: theme.textMuted }} numberOfLines={1}>{s.displayName}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
