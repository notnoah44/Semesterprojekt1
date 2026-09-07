/**
 * Orts-Autocomplete über OpenStreetMap Nominatim (Punkt 5,
 * offene-punkte-anpassungen.md) — kostenlos, kein API-Key nötig. Die
 * Nutzungsrichtlinie verlangt einen eigenen User-Agent-Header und max.
 * 1 Anfrage/Sekunde; das Debouncing dafür übernimmt PlaceAutocomplete.
 */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'PawStay-App/1.0 (Studienprojekt; Kontakt: support@pawstay.de)';

export interface PlaceSuggestion {
  id: string;
  city: string;
  country: string;
  displayName: string;
}

export async function searchPlaces(query: string, language = 'de'): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    limit: '6',
    q: trimmed,
  });

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': language },
  });
  if (!res.ok) throw new Error('Nominatim request failed');
  const data: any[] = await res.json();

  const suggestions: PlaceSuggestion[] = [];
  const seen = new Set<string>();
  for (const item of data) {
    const addr = item.address ?? {};
    const city: string | undefined = addr.city ?? addr.town ?? addr.village ?? addr.municipality;
    const country: string | undefined = addr.country;
    if (!city || !country) continue;
    const key = `${city}|${country}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({ id: String(item.place_id), city, country, displayName: item.display_name });
  }
  return suggestions;
}
