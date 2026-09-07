# Umsetzungsplan: Offene Punkte

Ableitung aus [offene-punkte-anpassungen.md](offene-punkte-anpassungen.md) in eine sinnvolle Bearbeitungsreihenfolge. Dient als Fortschritts-Tracker — wird beim Abarbeiten aktualisiert (Status je Punkt).

**Vorgehen:** Phasenweise. Nach jeder Phase kurze Rückmeldung/Kontrolle, bevor die nächste startet.

**Getroffene Entscheidungen (aus Rückfragen):**
- Punkt 2 (Redirect-Navigation): `returnTo`-Parameter — nach Profilvervollständigung geht es gezielt zur Ursprungsseite zurück, nicht nur einen Schritt zurück im Stack.
- Punkt 1 (E-Mail ändern): mit Bestätigungs-Mail über Supabase Auth (`updateUser({ email })`), nicht ungeprüft direkt übernommen.
- Nominatim für Ortsdatenbank (Punkt 5) — bereits im Ursprungsdokument entschieden.
- Pflichtfelder für vollständiges öffentliches Profil (Punkt 10) — bereits entschieden: Geburtsjahr/Alter, Profilbild, Stadt, Land, min. 150 Zeichen "Über dich".
- Phase 5 / Kontolöschung mit aktivem Abo: Löschung wird bis zum Ende der bezahlten Laufzeit verzögert (Konto bleibt bis dahin nutzbar), User bekommt vorab einen Hinweis mit Datum, danach automatische harte Löschung.
- Phase 5 / Löschtyp: harte Löschung (Auth-User + alle Profildaten werden entfernt, z. B. via Supabase Admin API in einer Edge Function), damit dieselbe E-Mail sofort erneut registrierbar ist. DSGVO-konform.

---

## Phase 0 — Isolierte Quick Fixes (kein Abhängigkeitsrisiko)

Kleine, in sich abgeschlossene Fixes, die keine anderen Punkte berühren. Guter Einstieg, schnelle Erfolge.

- [x] **Punkt 8** — Geprüft: bereits gelöst. Die alte `app/(tabs)/konto/membership.tsx` (Stand `HEAD`) hatte keinen echten Kauf-Handler. Die neue, noch unveröffentlichte `app/(tabs)/konto/subscription/index.tsx` implementiert den vollständigen Kauf-Flow und ruft nach `purchasePlan()`/`setAutoRenew()` bereits korrekt `setUser(updated)` auf — `useMembership`/`useCan` sehen den neuen Stand sofort. Kein Codeänderung nötig.
- [x] **Punkt 14** — Support-E-Mail-Kontakt ergänzt: neue Card in [help-support.tsx](../app/(tabs)/konto/support/help-support.tsx) (`mailto:support@pawstay.de`), neue i18n-Keys `helpSupport.emailContact`/`emailContactDesc` in de/en/fr.

---

## Phase 1 — Navigations-Grundlagen

Mehrere gemeldete Bugs (Punkt 2, 4, 6, 11) haben dieselbe Ursache-Kategorie: Expo-Router/React-Navigation-Stacks werden nicht zurückgesetzt bzw. Prüfungen laufen nur einmal beim Mount. Das zuerst sauber lösen, bevor Tab-Struktur (Phase 3) umgebaut wird — sonst testet man Phase 3 auf wackligem Grund.

- [x] **Punkt 11** — `resetTabOnPress`-Listener in [app/(tabs)/_layout.tsx](../app/(tabs)/_layout.tsx) auf allen vier Tabs ergänzt: bei jedem `tabPress` wird der jeweilige Stack per `StackActions.popToTop()` auf die Root zurückgesetzt (Standard-React-Navigation-Pattern).
- [x] **Punkt 4** — [RequireRoleProfile.tsx](../components/auth/RequireRoleProfile.tsx) nutzt jetzt `useFocusEffect` (`@react-navigation/native`) statt `useEffect` — Profilstatus wird bei jedem Fokussieren neu geprüft.
- [x] **Punkt 6** — durch Punkt 11 mit gelöst: da jeder Tab-Tap jetzt den Ziel-Stack resettet, landet "Suchen" nach "Hilfe" immer auf der Suchen-Root statt im alten Formular. Keine gesonderte Änderung nötig.
- [x] **Punkt 2** — `returnTo`-Parameter umgesetzt: `RequireRoleProfile` hängt beim Redirect den aktuellen `pathname` als `returnTo`-Query-Param an, [host.tsx](../app/(tabs)/konto/profile/host.tsx) und [sitter.tsx](../app/(tabs)/konto/profile/sitter.tsx) navigieren nach Speichern (und über den Zurück-Pfeil) mit `router.replace(returnTo)` dorthin zurück, statt `router.back()`.

**Verifikation:** `npx tsc --noEmit` sauber; `expo export --platform web` und der Expo-Web-Dev-Server bundeln alle betroffenen Screens ohne Fehler (bestätigt, dass alle neuen Imports auflösen). Ein echter Klick-Test im Browser scheiterte an einem unabhängigen, vorbestehenden Problem der Web-Plattform dieses Projekts (`import.meta`-Fehler beim Expo-Web-Dev-Server, nichts mit diesen Änderungen zu tun) — ein Test auf echtem Gerät/Simulator stand hier nicht zur Verfügung.

---

## Phase 2 — Datenmodell & Profil-Grundlagen

Schema-/Profiländerungen zuerst bündeln (jede zieht eine Migration + Anpassungen an mehreren Stellen nach sich). Reihenfolge innerhalb der Phase: erst Felder umbauen, dann darauf aufbauende Vollständigkeitsprüfung.

- [x] **Punkt 13** — `age` → `birth_year` umgesetzt: Spalte in [schema.sql](../supabase/schema.sql) + Migration [20260905120000_add_birth_year.sql](../supabase/migrations/20260905120000_add_birth_year.sql) (Bestandsdaten-Näherung: aktuelles Jahr − altes Alter), Helper [lib/utils/age.ts](../lib/utils/age.ts) (`getAgeFromBirthYear`), alle Anzeige-/Eingabestellen umgestellt (edit.tsx, profile/[id].tsx, sitter-listings/create.tsx buildTitle).
- [x] **Punkt 15** — `origin` + `city` zusammengeführt: Migration [20260905120100_merge_origin_into_city.sql](../supabase/migrations/20260905120100_merge_origin_into_city.sql) übernimmt vorhandene `origin`-Werte nach `city`, wo `city` leer war, dann Spalte `origin` entfernt. UI: Feld "Wohnort" (city) + Land, `profileEdit.origin` entfernt.
- [x] **Punkt 1** — Vor-/Nachname getrennt bei der Registrierung erfasst (danach serverseitig **und** clientseitig gesperrt, siehe `prevent_name_change`-Trigger + Migration [20260905120200_add_first_last_name.sql](../supabase/migrations/20260905120200_add_first_last_name.sql)), Hinweistext bei der Registrierung ergänzt. Anmeldedaten-Screen ([account/index.tsx](../app/(tabs)/konto/account/index.tsx)) zeigt Vorname/Nachname gesperrt + E-Mail mit Link zu neuem [change-email.tsx](../app/(tabs)/konto/account/change-email.tsx) (Bestätigungs-Mail über `supabase.auth.updateUser({email})`, wie in der Rückfrage entschieden).
  - **Sichtbarkeits-Gating ("nur Vorname bis zur Buchung")** wie in der Rückfrage entschieden voll umgesetzt: neuer Helper [lib/api/connections.ts](../lib/api/connections.ts) (`isConnected`/`getConnectedProfileIds`/`getDisplayName`) — verbunden = akzeptierte/abgeschlossene Buchung zwischen den beiden. Angewendet auf: öffentliche Profilseite ([profile/[id].tsx](../app/profile/[id].tsx)), Chat-Header + Chat-Liste ([chat/[conversationId].tsx](../app/(tabs)/chat/[conversationId].tsx), [chat/index.tsx](../app/(tabs)/chat/index.tsx)), Sitter-Listing-Detail-Karte ([search/sitters/[id].tsx](../app/(tabs)/search/sitters/[id].tsx)).
  - **Bewusst ausgenommen** (kein Vorname-Only-Gating): Bewertungen auf der Profilseite (Reviewer-Name — Review setzt ohnehin eine abgeschlossene Buchung mit dem Profilinhaber voraus, nicht mit dem Betrachter) und die Buchungs-Detailseite (dort muss der Name auch vor Annahme sichtbar sein, um über die Anfrage zu entscheiden). Listing-Titel/Suchkarten nutzten bereits vorher nur den Vornamen (bestehende Konvention).
- [x] **Punkt 10** — [RequireRoleProfile.tsx](../components/auth/RequireRoleProfile.tsx) prüft jetzt zuerst `isProfileComplete()` (neuer Helper in [lib/api/profiles.ts](../lib/api/profiles.ts): Geburtsjahr, Profilbild, Stadt, Land, Bio ≥150 Zeichen) und leitet bei fehlenden Angaben zuerst zu `profile/edit` (mit `returnTo`), erst danach zum rollenspezifischen Profil-Screen — wie im Dokument beschrieben.

**Verifikation:** `npx tsc --noEmit` sauber, `expo export --platform web` bundelt fehlerfrei (alle neuen Module lösen sich auf). Kein Gerätetest möglich (siehe Phase 1).

---

## Phase 3 — Rollen-/Tab-Struktur

Baut auf den Navigations-Fixes aus Phase 1 auf.

- [x] **Punkt 9** — Sitter-Suche in [components/search/SitterSearchView.tsx](../components/search/SitterSearchView.tsx) extrahiert (vorher nur unter `search/sitters/index.tsx`), wird jetzt auch als Host-Ansicht des Tabs "Suche" gerendert ([search/index.tsx](../app/(tabs)/search/index.tsx), ersetzt die alte `HostBookingsView`). Tab-Titel/-Icon in [_layout.tsx](../app/(tabs)/_layout.tsx) für beide Rollen einheitlich "Suche" + Lupe. Home-Hero-Button für Host zeigt jetzt ebenfalls auf `/(tabs)/search` (kein doppelter Screen mehr).
- [x] **Punkt 12** — Buchungen-Routen von `search/bookings/` nach [home/bookings/](../app/(tabs)/home/bookings/) verschoben (`git mv`, Historie erhalten). Liste bekommt jetzt einen Header mit Zurück-Button (Detailseite hatte bereits einen). Alle Links angepasst: Home-QuickAction, Buchungsanfrage-Erfolg in listings/[id].tsx und sitters/[id].tsx.

**Verifikation:** `npx tsc --noEmit` sauber, `expo export --platform web` bundelt fehlerfrei. Kein Gerätetest möglich (siehe Phase 1).

---

## Phase 4 — Feature-/UX-Verbesserungen

Eigenständige Verbesserungen ohne harte Abhängigkeiten zu den vorherigen Phasen (Punkt 3 profitiert aber von stabiler Navigation aus Phase 1).

- [x] **Punkt 3** — Neue geteilte Komponente [DateRangeField.tsx](../components/ui/DateRangeField.tsx): Kalender öffnet sich für Start, springt automatisch zu Ende, klappt danach zu "Von–Bis"-Zusammenfassung zusammen (erneutes Antippen öffnet neu). iOS nutzt jetzt `display="inline"` (echter Kalender statt Spinner, der vorher offen blieb — genau der gemeldete Bug), Android den nativen Dialog. Eingesetzt in [listings/create.tsx](../app/(tabs)/search/listings/create.tsx) (Host, direkt) und [sitter-listings/create.tsx](../app/(tabs)/search/sitter-listings/create.tsx) (Sitter, weiterhin mit "Hinzufügen" für mehrere Zeiträume).
- [x] **Punkt 5** — Listen-Update-Bug beim Review geprüft: im aktuellen Code nicht reproduzierbar (Rendering-Logik war bereits korrekt). Freitext-Eingabe durch Autocomplete ersetzt: neuer Helper [lib/api/geocoding.ts](../lib/api/geocoding.ts) (Nominatim, eigener User-Agent, min. 3 Zeichen) + Komponente [PlaceAutocomplete.tsx](../components/ui/PlaceAutocomplete.tsx) (500ms Debounce, Vorschlagsliste) in [sitter-listings/create.tsx](../app/(tabs)/search/sitter-listings/create.tsx).
- [x] **Punkt 7** — Neue Sektion "Deine Inserate" in [home/index.tsx](../app/(tabs)/home/index.tsx) oberhalb "So funktioniert's": horizontale Karten-Liste (Titel + Status-Badge) der eigenen Inserate (rollenabhängig `getMyListings`/`getMySitterListings`, `useFocusEffect` für aktuellen Stand), "Alle anzeigen" verlinkt zur bestehenden "Meine Inserate"-Seite. Nur sichtbar, wenn mindestens ein Inserat existiert.

**Verifikation:** `npx tsc --noEmit` sauber, `expo export --platform web` bundelt fehlerfrei. Kein Gerätetest möglich (siehe Phase 1) — insbesondere der neue Kalender-Flow (iOS `inline`-Picker) und Nominatim-Anfragen sollten bei Gelegenheit auf einem echten Gerät/Simulator gegengeprüft werden.

---

## Phase 5 — Bugs aus dem ersten echten Gerätetest (2026-09-07)

**Wichtiger Kontext:** Phasen 0–4 wurden nie auf einem echten Gerät/Simulator getestet (nur `tsc --noEmit` + `expo export --platform web`, siehe Hinweis unten bei "Alle Phasen abgeschlossen"). Der erste echte Klicktest hat mehrere Bugs aufgedeckt — teils neue Punkte, teils Regressionen/Lücken bei Dingen, die in Phase 1–4 als erledigt markiert waren. Reihenfolge unten: erst blockierende/daten-kritische Bugs, dann UX, dann offene Rückfragen zuletzt.

- [x] **5.1 Vorname/Nachname nach Registrierung nicht gespeichert** — Migration [20260907131454_ensure_handle_new_user_trigger.sql](../supabase/migrations/20260907131454_ensure_handle_new_user_trigger.sql) legt Funktion + Trigger `on_auth_user_created` idempotent neu an (unabhängig davon, ob er auf dem live-Projekt je existierte). Zusätzlich Absicherung in [register.tsx](../app/(auth)/register.tsx): schreibt nach erfolgreichem Sign-up (wenn eine Session vorhanden ist) defensiv per `upsertProfile` Vorname/Nachname/`full_name`, falls der Trigger aus irgendeinem Grund nicht gegriffen hat.

- [x] **5.2 Konto löschen löscht nichts** — Umgesetzt wie entschieden (harte Löschung, bei aktivem Abo verzögert bis Laufzeitende):
  - Neue Edge Functions [supabase/functions/delete-account](../supabase/functions/delete-account/index.ts) (vom Client aufgerufen, prüft `membership_tier`/`membership_expires_at`; ohne aktives Abo sofortige harte Löschung, mit aktivem Abo wird nur `profiles.scheduled_deletion_at` gesetzt) und [supabase/functions/process-scheduled-deletions](../supabase/functions/process-scheduled-deletions/index.ts) (täglicher Sweep, löscht fällige Konten hart), gemeinsame Lösch-Logik in [_shared/hardDeleteAccount.ts](../supabase/functions/_shared/hardDeleteAccount.ts) (Storage-Dateien + `auth.admin.deleteUser`, `profiles` fällt automatisch per `ON DELETE CASCADE` weg).
  - Migration [20260907131500_add_scheduled_deletion.sql](../supabase/migrations/20260907131500_add_scheduled_deletion.sql) + `types/user.ts` um `scheduled_deletion_at` ergänzt.
  - [delete-account.tsx](../app/(tabs)/konto/account/delete-account.tsx) ruft jetzt `supabase.functions.invoke('delete-account')` auf, zeigt je nach Antwort ("scheduled" vs. "deleted") die passende Meldung (inkl. Datum), `isLoading` wird jetzt in jedem Pfad zurückgesetzt.
  - Texte in `deleteAccount.*` (alle 4 Sprachen) korrigiert — die alte "30 Tage, durch erneutes Einloggen abbrechen"-Beschreibung passte nicht zum tatsächlichen Verhalten und wurde ersetzt.
  - **Erledigt (2026-09-07):** Beide Functions per Supabase-CLI deployed. Ausstehende Migrationen (inkl. 5.1/5.2) per `supabase db push` live eingespielt (`supabase migration list` zeigt für alle 16 Migrationen einen `remote`-Zeitstempel). Cron-Job für den täglichen Sweep in Migration [20260907140000_schedule_process_deletions_cron.sql](../supabase/migrations/20260907140000_schedule_process_deletions_cron.sql) eingerichtet (`pg_cron`/`pg_net`, täglich 03:00 UTC, Service-Role-Key liegt sicher im Supabase Vault statt im Repo) — per `select * from cron.job;` im SQL Editor bestätigt.

- [x] **5.3 Fehlermeldungen auf Deutsch** — Neuer Helper [lib/utils/authErrors.ts](../lib/utils/authErrors.ts) (`mapAuthErrorKey`) mappt bekannte Supabase-Fehlerstrings ("User already registered", "Invalid login credentials", "Password should be at least...", "Email not confirmed", Rate-Limit) auf i18n-Keys unter `errors.auth.*`, mit generischem Fallback. Eingesetzt in [register.tsx](../app/(auth)/register.tsx) und [login.tsx](../app/(auth)/login.tsx). Übersetzt in allen 4 Sprachen (de/en/fr/es).

- [x] **5.4 Profilfoto lässt sich nicht hochladen** — `expo-image-picker`-Plugin mit `photosPermission`-Text in [app.json](../app.json) ergänzt. Zusätzlich `handlePickAvatar` in [profile/edit.tsx](../app/(tabs)/konto/profile/edit.tsx) überarbeitet: verschluckte Fehler (Zeile mit `if (error) return;`) durch echtes Error-Handling mit Alert + `console.error` ersetzt, verweigerte Berechtigung zeigt jetzt eine Meldung statt still nichts zu tun. **Wichtig: braucht einen neuen Dev-Build** (`expo prebuild` bzw. EAS-Build) — die `app.json`-Änderung ist nativ, ein reiner JS-Reload reicht nicht zum Testen.

- [x] **5.5 "Bildergalerie" beim öffentlichen Profil (eigenes Tier)** — Gleiche Ursache wie 5.4, mit demselben Plugin-Fix behoben. `handleAddPhoto` zeigt jetzt ebenfalls eine Meldung bei verweigerter Berechtigung und loggt Fehler beim Hochladen.

- [x] **5.6 "Profil konnte nicht gespeichert werden" ohne Grund** — `handleSave` in [profile/edit.tsx](../app/(tabs)/konto/profile/edit.tsx) loggt den Fehler jetzt (`console.error`) und hängt die tatsächliche Fehlermeldung an den Alert-Text an, statt sie zu verschlucken. Damit lässt sich der ursprüngliche Fall (Speichern ohne Host/Sitter-Profil) beim nächsten Gerätetest konkret diagnostizieren (Verdacht: RLS-Policy oder der `prevent_name_change`-Trigger).

- [x] **5.7 Navigations-Falle bei Inserat-Erstellung → Profilvervollständigung → Konto-Tab** — Ursache gefunden (kein reiner Tab-Bar-Bug): Der "Profil vervollständigen"-Screen in [RequireRoleProfile.tsx](../components/auth/RequireRoleProfile.tsx) hatte **keinen Abbrechen-Button**, und der Zurück-Pfeil im Profil-Bearbeiten-Screen führt per `returnTo` genau wieder zu diesem Gate zurück, solange nichts gespeichert wurde — eine Schleife ohne Ausgang. Fix: beide Gate-Zustände (`missing_general`, `missing_role`) haben jetzt einen "Später"-Button, der per `router.replace('/(tabs)/home')` zuverlässig zur Startseite zurückführt, unabhängig von Tab-Bar-Timing.

- [x] **5.8 Registrierung ohne Freigabelink direkt möglich** — Code-Bug behoben: [register.tsx](../app/(auth)/register.tsx) prüft jetzt `authData.session` nach `signUp()`. Fehlt die Session (Supabase-Bestätigungsmail aktiv), wird **nicht** mehr zu Onboarding weitergeleitet, sondern eine "Bitte bestätige deine E-Mail"-Meldung angezeigt (`auth.confirmEmailSent`, alle 4 Sprachen). **Supabase-Dashboard-Einstellung selbst weiterhin ungeklärt** (Authentication → Providers → Email → "Confirm email") — dieser Fix greift unabhängig davon, in welchem Zustand die Einstellung gerade ist, macht das Verhalten also für beide Fälle korrekt.

- [x] **5.9 Eigene Inserate auf der Startseite** — Bereits umgesetzt (Phase 4, Punkt 7), keine Änderung nötig.

**Erledigt seit dem ersten Entwurf dieser Phase:**
- Supabase-CLI-Deploy beider Edge Functions + alle ausstehenden Migrationen live eingespielt + Cron-Job eingerichtet (siehe 5.2).

**Noch offen:**
- Prüfen/Setzen von "Confirm email" im Supabase Dashboard (siehe 5.8) — Code ist für beide Fälle vorbereitet, aber welcher Fall aktuell live ist, bleibt offen.
- Echter Gerätetest aller obigen Punkte (insbesondere 5.4/5.5 nach neuem Dev-Build, 5.7 im echten Navigations-Flow, 5.1/5.2 jetzt wo die DB-Seite live ist) — weiterhin nur `tsc --noEmit` + `expo export --platform web` verifiziert (beide sauber).
- Der Supabase Personal Access Token, der für die CLI-Deploys im Chat geteilt wurde, sollte im Dashboard widerrufen und bei Bedarf neu erzeugt werden.

**Verifikation:** Wie bisher `tsc --noEmit` + `expo export --platform web` nach jedem Schritt, aber zusätzlich diesmal zwingend ein echter Gerätetest pro Punkt (insbesondere 5.4/5.5 brauchen einen neuen Dev-Build wegen der `app.json`-Änderung, ein einfacher JS-Reload reicht nicht).

---

## Alle Phasen abgeschlossen (Stand vor Phase 5)

Sämtliche 15 Punkte aus [offene-punkte-anpassungen.md](offene-punkte-anpassungen.md) waren bearbeitet. Der erste echte Gerätetest (siehe Phase 5) hat aber gezeigt, dass "erledigt" hier nur "per Typecheck/Web-Bundle verifiziert" bedeutete — mehrere Punkte brauchen einen echten Nachtest.

---

## Offene Rückfragen

- **5.1 / Trigger-Bindung:** Muss im Supabase Dashboard verifiziert werden (siehe oben) — kann nicht rein aus dem Repo beantwortet werden.
- **5.8 / E-Mail-Bestätigung:** Muss im Supabase Dashboard geprüft werden (siehe oben).
- Alle ursprünglichen Rückfragen aus Phase 0–4 sind geklärt (siehe "Getroffene Entscheidungen" oben).

## Hinweise für die Umsetzung

- Bei Punkt 13 (Migration `age` → `birth_year`): Für Bestandsdaten ist nur `aktuelles_jahr - age` als Näherung möglich, da das echte Geburtsjahr nicht bekannt ist. Für dieses Projekt ausreichend, aber bei der Migration kurz dokumentieren.
- Bei Punkt 15 (Migration `origin`/`city`): Falls beide Felder befüllt sind, gewinnt `city` (spezifischer); ist nur `origin` befüllt, wird dessen Wert übernommen.
- Nach jeder Phase: kurzer manueller Durchlauf der betroffenen Screens (siehe CLAUDE.md-Hinweis zu UI-Änderungen — vor Abschluss im Browser/Simulator testen, nicht nur Typecheck).
