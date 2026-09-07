# Feature: Sitter erstellt Inserat / Host sucht Sitter

Status: geplant, noch nicht begonnen. Diese Datei ist die Grundlage, um morgen direkt weiterzuarbeiten.

## 1. Zusammenfassung

Aktuell ist die App auf **Hosts, die ein Zuhause anbieten** ausgelegt: `listings` beschreibt ein Haus/eine Wohnung (Adresse, Haustiere, Willkommensguide), Sitter durchsuchen diese Inserate und fragen ein Sitting an.

Neu soll es **spiegelbildlich** funktionieren:
- Ein **Sitter** kann ein eigenes Inserat erstellen: wann und wo er/sie verfügbar ist.
- Ein **Host** kann nach diesen Sitter-Inseraten suchen und eine Buchungsanfrage an den Sitter schicken.

Beide Richtungen sollen parallel existieren (ein Nutzer kann weiterhin auch klassisch ein Zuhause anbieten bzw. danach suchen, je nach Rollen-Toggle).

Der Homebildschirm ist dafür bereits vorbereitet (Stand heute):
- Quick Actions sind rollen-unabhängig: **Neues Inserat / Gespeichert / Buchungen**.
- Der Hero-Button im Host-Modus heißt "Sitter suchen" und verlinkt aktuell (Platzhalter) auf den bestehenden Such-Tab.

Diese Verdrahtung zeigt aktuell noch auf die **alten, Host-zentrierten** Screens/Tabellen. Das eigentliche Sitter-Inserat-Feature fehlt komplett.

## 2. Was schon existiert und wiederverwendet werden kann

| Bereich | Datei | Wiederverwendbar für Sitter-Inserate? |
|---|---|---|
| Erstell-Assistent (4 Schritte: Ort, Aufgaben, Beschreibung, Review) | `app/(tabs)/search/listings/create.tsx` | Teilweise – Adresse/Haustiere/Aufgaben passen nicht, Verfügbarkeitszeitraum + Fotos + Beschreibung schon |
| Such-Filter (Stadt, Land, Datum, Haustiere, Keyword) | `types/listing.ts` (`SearchFilters`), `stores/searchStore.ts`, `lib/hooks/useSearch.ts` | Ja, Grundgerüst passt (Stadt/Land/Datum), `hasPets` müsste zu "Erfahrung mit Tierart" werden |
| Buchungsanfrage-Flow (anfragen → annehmen/ablehnen → abschließen) | `lib/api/bookings.ts`, `app/(tabs)/search/bookings/*` | Ja, Datenmodell ist schon relativ generisch (sitter_id + owner_id) |
| Profil-Felder, die ein Sitter-Inserat braucht (Bio, Tiererfahrung, Sprachen, Alter) | `types/user.ts` (`Profile`), Tabelle `profiles` | Ja – müssen nicht dupliziert werden, sondern per Join geholt werden |
| Favoriten – Tabelle hat **bereits** `sitter_id` neben `listing_id` | `supabase/schema.sql` (Tabelle `favourites`) | Ja, Schema ist schon vorbereitet, nur die API (`lib/api/favourites.ts`) nutzt bisher nur `listing_id` |
| Meine Inserate verwalten (aktivieren/archivieren/löschen) | `app/(tabs)/search/listings/my-listings.tsx` | Als Vorlage für "Meine Sitter-Inserate" |
| Inserat-Detailseite + "Sitting anfragen" | `app/(tabs)/search/listings/[id].tsx` | Als Vorlage für "Sitter-Inserat-Detail" + "Buchung anfragen" |

## 3. Datenmodell – was fehlt

Die Tabelle `listings` ist strukturell ein **Zuhause** (Adresse, `has_pets`, `welcome_guide`) und passt inhaltlich nicht zu einem Sitter-Angebot. Empfehlung: **neue Tabelle** statt die bestehende zu überladen.

Ein Sitter-Inserat braucht laut Anforderung folgende Angaben (vom Sitter beim Erstellen ausgefüllt):

1. **Zeiträume der Verfügbarkeit** – mehrere möglich
2. **Ortspräferenzen** – mehrere möglich
3. **Mit/ohne Tier** – ob Sitting mit oder ohne Haustier gewünscht ist
4. **Begleitpersonen** – wie viele Personen reisen mit, in welcher Beziehung zum Sitter (Partner/Freunde/Familie/Kinder)
5. **Eigenes Tier mitbringen** – ja/nein, wenn ja: wie viele, welche Tierart
6. **Maximale Alleinlassdauer** – wie lange das gesittete Tier laut Sitter maximal allein bleiben darf
7. **Titelbild** – Default: Profilbild des Sitters
8. **Überschrift** – automatisch generiert als `"VORNAME, ALTER, LAND"` (Land = `profiles.origin` des Sitters, nicht die gewählte Ortspräferenz)

**Entscheidung Speicherung (mehrere Zeiträume/Orte):** JSONB-Arrays direkt auf `sitter_listings`, analog zum bestehenden `pet_details`-Pattern bei `listings`. Einfacher als eigene Kind-Tabellen; die Host-Suche filtert dafür teils clientseitig statt mit sauberen SQL-Ranges (bei der erwarteten Datenmenge unkritisch).

**Entscheidung Begleitpersonen:** die im Schema bereits vorhandene, aber bisher ungenutzte Tabelle `travel_companions` (`name`, `age`, `avatar_url`) wird wiederverwendet und um eine `relation`-Spalte ergänzt. Ein Sitter pflegt seine Begleitpersonen einmal (Profil-Ebene) und wählt pro Inserat aus, wer mitreist – Anzahl ergibt sich aus der Auswahl.

```sql
-- Bestehende Tabelle travel_companions um Beziehungstyp erweitern
ALTER TABLE travel_companions ADD COLUMN relation TEXT
  CHECK (relation IN ('partner','friend','family','child'));

-- Sitter-Inserate (Verfügbarkeit + Einsatzort + Präferenzen eines Sitters)
CREATE TABLE IF NOT EXISTS sitter_listings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sitter_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL, -- automatisch: "Vorname, Alter, Land"
  description           TEXT,
  availability_periods  JSONB DEFAULT '[]', -- [{ "from": "2026-06-01", "to": "2026-06-15" }, ...]
  locations             JSONB DEFAULT '[]', -- [{ "city": "...", "country": "...", "lat": null, "lng": null }, ...]
  pet_sitting           TEXT DEFAULT 'both' CHECK (pet_sitting IN ('with_pet','without_pet','both')),
  companion_ids         UUID[] DEFAULT '{}', -- Auswahl aus travel_companions des Sitters
  brings_own_pet        BOOLEAN DEFAULT FALSE,
  own_pet_details       JSONB DEFAULT '[]', -- [{ "type": "Hund", "count": 1 }, ...], nur wenn brings_own_pet = true
  max_alone_hours       INT, -- maximale Dauer (Stunden), die das gesittete Tier allein bleiben darf
  cover_photo           TEXT, -- NULL = Fallback auf profiles.avatar_url beim Anzeigen
  photos                TEXT[] DEFAULT '{}',
  status                TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sitter_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View active sitter listings" ON sitter_listings
  FOR SELECT USING (status = 'active' OR auth.uid() = sitter_id);
CREATE POLICY "Manage own sitter listings" ON sitter_listings
  FOR ALL USING (auth.uid() = sitter_id);
```

`cover_photo` wird bewusst nicht beim Erstellen mit dem aktuellen Profilbild befüllt, sondern bleibt `NULL` und die App fällt beim Anzeigen auf `profiles.avatar_url` zurück – so bleibt das Titelbild aktuell, auch wenn der Sitter sein Profilbild später ändert.

Tiererfahrung, Sprachen, Bio, Alter kommen **nicht** in diese Tabelle – die stehen schon in `profiles` (`animals_cared`, `languages`, `bio`, `age`) und werden beim Anzeigen per Join geladen.

**Bookings anpassen:** `bookings.listing_id` verweist per Foreign Key nur auf `listings`. Für eine Buchungsanfrage eines Hosts an einen Sitter braucht es eine zweite, nullable Referenz:

```sql
ALTER TABLE bookings ADD COLUMN sitter_listing_id UUID REFERENCES sitter_listings(id);
```

App-seitig gilt dann: **genau eines** von `listing_id` / `sitter_listing_id` ist gesetzt, je nachdem wer wen bucht.

**Favourites:** Tabelle hat `sitter_id` schon – hier ist keine Migration nötig, nur die API muss es nutzen.

## 4. API-Layer (neue/angepasste Dateien)

- `types/sitterListing.ts` – neuer Typ `SitterListing` (Felder wie in Abschnitt 3), orientiert an `types/listing.ts`. Hilfstypen `AvailabilityPeriod { from: string; to: string }`, `LocationPreference { city: string; country: string; lat?: number; lng?: number }`, `OwnPetDetails { type: string; count: number }`.
- `types/user.ts` (`TravelCompanion`) – um `relation: 'partner' | 'friend' | 'family' | 'child' | null` ergänzen.
- `lib/api/sitterListings.ts` – `getSitterListings(filters)`, `getSitterListing(id)`, `getMySitterListings(sitterId)`, `upsertSitterListing(...)`, `deleteSitterListing(id)`, `uploadSitterListingPhoto(...)` – 1:1 Analogie zu `lib/api/listings.ts`. `getSitterListings` matcht `availability_periods`/`locations` (JSONB) serverseitig nur grob vor (z.B. `ilike` auf eine generierte Textrepräsentation oder `jsonb`-Containment) und filtert Datums-Overlaps/Ort feingranular clientseitig.
- `lib/api/profiles.ts` – `getTravelCompanions`/`upsertTravelCompanion` bestehen schon, nur `relation` mit durchreichen.
- `lib/api/favourites.ts` – ergänzen um `addFavouriteSitter(profileId, sitterId)`, `removeFavouriteSitter(...)`, `getFavouriteSitterIds(...)`.
- `lib/api/bookings.ts` – `createBooking` erweitern, damit optional `sitter_listing_id` statt `listing_id` mitgegeben werden kann.
- `types/listing.ts` (`SearchFilters`) – prüfen, ob ein gemeinsamer Filtertyp für beide Suchrichtungen sinnvoll ist, oder ein eigener `SitterSearchFilters` (ohne `hasPets`, dafür z.B. `petSitting` für "mit/ohne Tier gewünscht").

## 5. UI – Sitter erstellt Inserat

Empfehlung: **eigener, schlankerer Screen** statt den bestehenden 4-Schritte-Host-Assistenten zu verbiegen (die Felder unterscheiden sich zu stark: kein `address`/`has_pets`, dafür Verfügbarkeitszeitraum steht im Zentrum).

- Neue Route, z. B. `app/(tabs)/search/sitter-listings/create.tsx`.
- Kein freies Titel-Feld mehr (anders als bei `listings/create.tsx`) – die Überschrift `"Vorname, Alter, Land"` wird aus `profiles.full_name`/`age`/`origin` berechnet und nur read-only angezeigt (z. B. in der Review-Step-Vorschau), nicht vom Sitter editierbar.
- Vorgeschlagene Schritte:
  1. **Verfügbarkeit & Orte** – Liste von Zeiträumen (Datepicker-Paar `from`/`to`, "+ weiterer Zeitraum" analog zum `responsibilities`-Add/Remove-Pattern) und Liste von Ortspräferenzen (Stadt/Land, ebenfalls mehrfach hinzufügbar/entfernbar).
  2. **Tier-Präferenzen** – Auswahl mit/ohne/beides (`pet_sitting`), Toggle "eigenes Tier mitbringen" (`brings_own_pet`) mit bedingt eingeblendeter Liste `own_pet_details` (Tierart + Anzahl, gleiches Add/Remove-Pattern), Eingabe `max_alone_hours`.
  3. **Begleitpersonen & Beschreibung** – Auswahl aus den gespeicherten `travel_companions` des Sitters (Mehrfachauswahl; falls noch keine angelegt, Link/Kurzformular zum Anlegen mit Name/Alter/`relation`), Freitext-Beschreibung.
  4. **Fotos & Review** – Titelbild-Auswahl (`cover_photo`, Vorschau fällt ohne Auswahl auf `profiles.avatar_url` zurück), zusätzliche Fotos, Review inkl. automatisch generierter Überschrift. Datepicker- und Foto-Upload-Logik kann 1:1 aus `listings/create.tsx` übernommen werden (`expo-image-picker`, `uploadListingPhoto`-Pattern → `uploadSitterListingPhoto`).
- Neue Route zur Verwaltung: `app/(tabs)/search/sitter-listings/my-listings.tsx` (Kopie von `my-listings.tsx`, Datenquelle `getMySitterListings`).

## 6. UI – Host sucht Sitter

Aktuell zeigt der Such-Tab (`app/(tabs)/search/index.tsx`) im Host-Modus die **eigenen Buchungen** (`HostBookingsView`) – das ist inhaltlich die "Buchungen"-Ansicht, nicht "Sitter suchen". Der Hero-Button "Sitter suchen" zeigt aktuell also fälschlich auf die Buchungsliste.

Empfehlung: **eigene neue Route** für die Sitter-Suche, z. B. `app/(tabs)/search/sitters/index.tsx`, mit einer Card-Ansicht ähnlich der bestehenden `ListingCard` (aber Sitter-Profilbild, Name, Alter, Sprachen, Verfügbarkeitszeitraum, Ort).

- Dann zeigt der Home-Hero für Hosts auf `/(tabs)/search/sitters` statt auf `/(tabs)/search`.
- Sitter-Detailseite: `app/(tabs)/search/sitters/[id].tsx` (Kopie von `listings/[id].tsx`) mit Button "Buchung anfragen" statt "Sitting anfragen".

## 7. Home-Screen-Verdrahtung anpassen (sobald obiges steht)

In `app/(tabs)/home/index.tsx`:
- "Neues Inserat" muss rollenabhängig routen: Sitter → `/(tabs)/search/sitter-listings/create`, Host → `/(tabs)/search/listings/create` (aktuell zeigt der Button für beide Rollen auf Letzteres).
- Host-Hero-CTA "Sitter suchen" → `/(tabs)/search/sitters` statt `/(tabs)/search`.
- "Gespeichert" ggf. rollenabhängig auf Sitter- oder Listing-Favoriten (oder eine gemeinsame Ansicht mit zwei Reitern).

## 8. i18n

Neue Keys werden in `lib/i18n/locales/{de,en,fr,es}.ts` gebraucht, analog zum bestehenden `listingCreate`-Namespace: z. B. `sitterListingCreate.*`, `sitterSearch.*`, `sitterListingDetail.*`. Am besten die bestehenden `listingCreate`/`listingDetail`/`search`-Keys als Vorlage kopieren und anpassen.

## 9. Offene Fragen

Geklärt (2026-08-31):
- **Speicherung mehrerer Zeiträume/Orte:** JSONB-Arrays auf `sitter_listings` (nicht eigene Kind-Tabellen).
- **Begleitpersonen:** vorhandene `travel_companions`-Tabelle wiederverwenden, um `relation` erweitern, pro Inserat auswählen statt freier Zähler.
- **Titel-Land:** `profiles.origin` (Herkunftsland des Sitters), unabhängig von den gewählten Ortspräferenzen.

Noch offen (bitte vor der jeweiligen Umsetzung klären):

1. **Mehrere Inserate pro Sitter?** Darf ein Sitter mehrere aktive Inserate gleichzeitig haben (z. B. für grundverschiedene Ziel-Zeiträume), oder deckt ein Inserat mit mehreren Zeiträumen/Orten das schon ab und es bleibt bei einem aktiven Inserat pro Sitter?
2. **Bezahlung/Preis?** Soll ein Sitter-Inserat einen Preis/Rate haben, oder bleibt das (wie aktuell bei Hosts) preisfrei?
3. **Buchungsrichtung:** Läuft die Anfrage genau spiegelbildlich (Host fragt an → Sitter nimmt an/lehnt ab), oder soll es Unterschiede geben (z. B. Sofortbuchung)?
4. **Geo-Suche:** Reicht ein Text-Filter auf Stadt/Land (wie aktuell), oder wird eine Umkreissuche über `lat`/`lng` gebraucht? (`locations`-Einträge haben optionale `lat`/`lng`, aktuell aber ungenutzt.)
5. **Favoriten-UI:** Eine gemeinsame "Gespeichert"-Liste mit zwei Reitern (Inserate/Sitter), oder rollenabhängig nur eine Liste?

## 10. Empfohlene Reihenfolge für die Umsetzung

1. Migration: `sitter_listings`-Tabelle + RLS-Policies, `bookings.sitter_listing_id`-Spalte, `travel_companions.relation`-Spalte (SQL oben in Supabase SQL-Editor ausführen, danach `supabase/schema.sql` im Repo aktualisieren).
2. `types/sitterListing.ts` + ggf. `SitterSearchFilters`, `TravelCompanion.relation` in `types/user.ts` ergänzen.
3. `lib/api/sitterListings.ts` (CRUD, analog `lib/api/listings.ts`).
4. `lib/api/favourites.ts` um Sitter-Favoriten erweitern.
5. `lib/api/bookings.ts`: `createBooking` für `sitter_listing_id` erweitern.
6. Screen: Sitter-Inserat erstellen (`search/sitter-listings/create.tsx`).
7. Screen: Sitter-Suche für Hosts (`search/sitters/index.tsx`) + Detailseite (`search/sitters/[id].tsx`).
8. Screen: "Meine Sitter-Inserate" (`search/sitter-listings/my-listings.tsx`).
9. Home-Screen-Buttons/Hero rollenabhängig auf die neuen Routen umbiegen.
10. i18n-Keys in allen vier Sprachen ergänzen.
11. Beide Rollen end-to-end durchspielen: Sitter erstellt Inserat → Host findet es in der Suche → Host fragt Buchung an → Sitter nimmt an → Chat/Buchungsdetail funktioniert.
