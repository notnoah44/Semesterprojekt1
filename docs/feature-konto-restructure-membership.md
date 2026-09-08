# Feature: Konto-Neustrukturierung, Pro-Preismodell & Rechtematrix

> Historischer Entwurf. Abo-Modell und Kontolöschung wurden am 08.09.2026 durch [Store-Abos im Testbetrieb](store-abos-testbetrieb.md) ersetzt: automatische Store-Verlängerung, kein Toggle, keine Demo-Freischaltung, sofortige Kontolöschung.

Status (2026-09-03): Umsetzung pausiert, Kernarbeit abgeschlossen. Alle 9 Schritte aus Abschnitt 7 sind erledigt, dazu T1/T3/T4/T6/T8/T9 aus der ToDo-Liste (Abschnitt 10). Bewusst offen gelassen: T2 (echtes RevenueCat), T5 (E-Mail-Versand), T7 (aktiver Admin-Alarm) — siehe Abschnitt 10 für Details, falls das Thema später wieder aufgenommen wird.

## 1. Zusammenfassung

Drei Themen, die zusammengehören und hier gemeinsam festgehalten werden, bevor sie umgesetzt werden:

1. **Konto-Bereich neu strukturieren** — klarere Gruppierung als aktuell (`Konto & Profil` / `Abo & Zahlung` / `Support & Rechtliches`).
2. **Pro-Preismodell** — drei Laufzeiten (1 Monat / 3 Monate / 1 Jahr) mit optionaler automatischer Verlängerung.
3. **Rechtematrix Gast/Free/Pro** — welche Aktion welcher Nutzertyp darf, als Grundlage für spätere Zugriffs-Checks (`useMembership`, `useRequireAuth`, Paywall).

## 2. Ist-Zustand Konto-Bereich

Aktuelle Routen unter `app/(tabs)/konto/`:

| Route | Inhalt heute |
|---|---|
| `index.tsx` | Profil-Header + Menü: Profil bearbeiten, Mitgliedschaft, Einstellungen, Hilfe & Support, Feedback, AGB, Datenschutz, Abmelden |
| `profile/edit.tsx` | Nur allgemeine Infos: Name, Alter, Beruf, Herkunft, Bio, Avatar — **keine** getrennten Sitter-/Host-Infos, **kein** ID-Check |
| `membership.tsx` | Zeigt Free/Standard-Vergleich, ein Preis ("pro Jahr"), Upgrade-Button ist ein Platzhalter-Alert, keine Auswahl der Laufzeit, kein Auto-Verlängerung-Toggle |
| `settings/index.tsx` | Passwort ändern, Sprache, Benachrichtigungen, Konto löschen |
| `settings/change-password.tsx` | Passwort ändern |
| `settings/notifications.tsx` | Benachrichtigungen (aktueller Umfang ungeprüft, vermutlich nur ein/aus gesamt) |
| `settings/delete-account.tsx` | Konto löschen |
| `settings/language.tsx` | Sprachauswahl |
| `help-support.tsx`, `feedback.tsx`, `terms.tsx`, `privacy.tsx` | Support/Rechtliches |

`types/user.ts`: `MembershipTier = 'free' | 'standard'`, `membership_expires_at`. Es gibt **kein** Feld für automatische Verlängerung und **kein** Feld für einen Verifizierungsstatus ("Verified"-Badge).

`lib/hooks/useMembership.ts` liefert bereits `isPro`/`tier`/`expiresAt` (Pro = `standard` UND `expires_at` in der Zukunft) — das kann für die neue Rechtematrix als Basis wiederverwendet werden.

## 3. Neue Struktur (Soll)

```
Konto
├── Konto & Profil
│   ├── Anmeldedaten          (Benutzername, E-Mail, Passwort ändern, Konto löschen)
│   └── Öffentliches Profil   (allgemeine Infos, Sitter-Infos, Host-Infos, [ID-Check])
├── Abo & Zahlung
│   ├── Abo                   (aktives Abo, Kündigung / Wechsel)
│   ├── Zahlung                (Zahlungsdaten verwalten)
│   └── Benachrichtigungen    (Mail/Push, Auswahl nach Ereignistyp)
└── Support & Rechtliches
    ├── Hilfe & FAQ
    ├── Über uns
    ├── Rechtliches            (AGB, Datenschutz, Impressum)
    ├── Sprache                (Dropdown, kein eigener Screen)
    └── Abmelden
```

### Vorgeschlagene Routen-Zuordnung (alt → neu)

| Neue Route (Vorschlag) | Ersetzt / basiert auf | Änderung nötig |
|---|---|---|
| `konto/account/index.tsx` (Anmeldedaten) | neu, Felder aus `settings/index.tsx` + `profile/edit.tsx` (nur Name/E-Mail-Teil) | Kein separater Benutzername — nur **Vorname** (`profiles.full_name`), E-Mail, Passwort ändern, Konto löschen. Login bleibt ausschließlich per E-Mail (kein Benutzername-Login) |
| `konto/account/change-password.tsx` | `settings/change-password.tsx` (verschieben) | – |
| `konto/account/delete-account.tsx` | `settings/delete-account.tsx` (verschieben) | – |
| `konto/profile/edit.tsx` (öffentliches Profil) | bestehende Datei, erweitert | Muss um **Sitter-Infos** (Tiererfahrung, Sprachen — teils schon in `profiles` laut `animals_cared`/`languages`) und **Host-Infos** getrennt nach Rolle ergänzt werden; **ID-Check** ist komplett neu, s. u. |
| `konto/subscription/index.tsx` (Abo) | `membership.tsx`, umgebaut | Laufzeit-Auswahl (1/3/12 Monate), Kündigen-Button, Auto-Verlängerung-Toggle — s. Abschnitt 4 |
| `konto/subscription/payment.tsx` (Zahlung) | neu | Über RevenueCat (In-App-Käufe App Store/Play Store) — s. Abschnitt 4, kein eigenes Zahlungsformular nötig |
| `konto/subscription/notifications.tsx` | `settings/notifications.tsx`, verschoben unter Abo & Zahlung | Muss um granulare Auswahl erweitert werden (welche Ereignisse per Mail/Push), inkl. der neuen 7-Tage-Vor-Verlängerung-Erinnerung |
| `konto/support/help-support.tsx` | `help-support.tsx` (verschieben) | – |
| `konto/support/about.tsx` (Über uns) | neu | Inhalt noch nicht vorhanden |
| `konto/support/legal/terms.tsx`, `.../privacy.tsx` | `terms.tsx`, `privacy.tsx` (verschieben) | – |
| `konto/support/legal/impressum.tsx` | neu | Inhalt liegt vor, s. Abschnitt 8 |

`konto/index.tsx` (Hauptmenü) wird auf die drei neuen Gruppen umgestellt. **Sprache** wandert als Dropdown direkt neben "Abmelden" unten in "Support & Rechtliches" (kein eigener Menüpunkt/Screen mehr, `settings/language.tsx` entfällt als eigene Route). **Feedback** (`feedback.tsx`) wird komplett entfernt — kein Menüpunkt mehr in der neuen Struktur.

### ID-Check-Flow (manuell, Abschnitt "Öffentliches Profil")

Für den Anfang **kein** Drittanbieter (Kosten vermeiden, Uni-Projekt) — manuelle Prüfung:
1. Nutzer lädt im Verifizierungs-Bereich zwei Fotos hoch: ein Ausweisfoto + ein Selfie/Foto von sich.
2. Die Fotos werden manuell (durch die Betreiber) geprüft.
3. Nach der Prüfung werden **beide Fotos sofort gelöscht** (Ausweisfoto und Selfie, nicht dauerhaft gespeichert) — nur das Ergebnis (verifiziert ja/nein) bleibt als Flag am Profil, z. B. `profiles.id_verified BOOLEAN DEFAULT FALSE`.

Technisch braucht das einen temporären, nicht-öffentlichen Storage-Bucket für die Ausweisfotos (Supabase Storage, private) plus einen manuellen Review-Schritt (vorerst z. B. eine einfache Admin-Ansicht oder sogar nur manuelle Prüfung über das Supabase-Dashboard, ohne eigene Admin-UI).

## 4. Pro-Preismodell

| Laufzeit | Preis gesamt | Preis pro Monat |
|---|---|---|
| 1 Monat | 34 € | 34 € |
| 3 Monate | 69 € | 23 € |
| 1 Jahr | 132 € | 11 € |

**Zahlungsanbieter:** RevenueCat (In-App-Käufe über App Store/Play Store). Das Preismodell (3 Laufzeiten) wird als RevenueCat-Produkte/Entitlement angelegt; `membership_plan`/`membership_expires_at`/`auto_renew` in `profiles` werden über RevenueCat-Webhooks bzw. beim App-Start (`Purchases.getCustomerInfo()`) synchron gehalten, ähnlich wie `useMembership` heute schon `membership_expires_at` gegen `new Date()` prüft.

**Automatische Verlängerung:**
- Beim Kauf ist Auto-Verlängerung **standardmäßig an** — mit einem Hinweistext direkt neben dem "Kaufen"/"Abo abschließen"-Button, der das transparent macht (z. B. "Verlängert sich automatisch für {Preis} nach Ablauf, jederzeit kündbar").
- Ist Auto-Verlängerung **an**: zum Ende der Laufzeit wird automatisch die **gleiche Laufzeit** erneut abgerechnet und `membership_expires_at` verlängert (läuft technisch über RevenueCat/App Store/Play Store, nicht selbst gebaut).
- Ist Auto-Verlängerung **aus** (vom Nutzer abgeschaltet): Abo läuft zum Ende der Laufzeit automatisch aus (`membership_expires_at` greift wie heute schon über `useMembership`).
- **Erinnerung:** 7 Tage vor der nächsten Abbuchung/Verlängerung bekommt der Nutzer eine Erinnerung (Push und/oder Mail, s. Benachrichtigungen), damit rechtzeitig gekündigt werden kann.
- Der Nutzer muss die Auto-Verlängerung jederzeit im "Abo"-Bereich umschalten/kündigen können.

**Datenmodell-Ergänzungen (Vorschlag, noch nicht umgesetzt):**

```sql
ALTER TABLE profiles ADD COLUMN membership_plan TEXT
  CHECK (membership_plan IN ('monthly','quarterly','yearly'));
ALTER TABLE profiles ADD COLUMN auto_renew BOOLEAN DEFAULT FALSE;
```

`types/user.ts` (`MembershipTier`) bliebe `'free' | 'standard'`; `membership_plan` und `auto_renew` kämen als neue, optionale Felder dazu. `membership.tsx`/`konto/subscription/index.tsx` müsste dann Plan + Auto-Renew-Status anzeigen und einen "Kündigen"-Button (= `auto_renew` auf `false`) bzw. "Modell wechseln" (= neuer `membership_plan`) anbieten.

## 5. Rechtematrix Gast / Free / Pro

Final aus der hochgeladenen Tabelle übernommen:

| Aktion / Funktion | Ohne Login (Gast) | Kostenloser Login (Free) | Mit Zeitpass (Pro) |
|---|---|---|---|
| **Suchen & Stöbern** | | | |
| Feed durchsuchen & Filter nutzen | ✅ | ✅ | ✅ |
| Fotos und Beschreibungen ansehen | ✅ | ✅ | ✅ |
| Live-Status sehen ("Gebucht", "3 Bewerber") | ✅ | ✅ | ✅ |
| **Binden & Erstellen** | | | |
| Inserate als Favoriten speichern (Herz) | ❌ | ✅ | ✅ |
| Sitter- oder Besitzer-Profil komplett ausfüllen | ❌ | ✅ | ✅ |
| Bilder für eigenes Inserat hochladen | ❌ | ✅ | ✅ |
| Eigene Verfügbarkeiten/Kalender pflegen | ❌ | ✅ | ✅ |
| **Kommunikation & Matching** | | | |
| Erste Nachricht senden (Bewerbung) | ❌ | ❌ | ✅ |
| Auf neue, eingehende Anfragen antworten | ❌ | ❌ | ✅ |
| Offene Chats fortführen (Thread-Unlock)* | ❌ | ✅ | ✅ |
| In-App Video-Anrufe mit dem Match führen | ❌ | ❌ | ✅ |
| **Erweiterte Tools** | | | |
| Such-Alarme (Push bei neuen passenden Häusern) | ❌ | ❌ | ✅ |
| Offizieller ID-Check & "Verified"-Badge | ❌ | ❌ | ✅ |
| Video-Pitch im eigenen Profil hochladen | ❌ | ❌ | ✅ |
| Zugriff auf Tierarzt-Hotline (während Sitting) | ❌ | ❌ | ✅ |

Bezug zum Code: `Offizieller ID-Check & "Verified"-Badge` entspricht dem `[ID-Check]` aus Abschnitt 3 (öffentliches Profil) — dafür existiert aktuell noch kein Feld/Flow in `profiles` (siehe Abschnitt 3, ID-Check-Flow).

### 5.1 Thread-Unlock-Modell (Chat-Zugriff nach Abo-Ablauf)

Ein aktiver Zeitpass ist **nicht** die Erlaubnis zu chatten, sondern die Erlaubnis, **neue** Chats zu starten bzw. auf **neue** eingehende Anfragen zu reagieren. Einmal gestartete Konversationen bleiben dauerhaft offen — auch wenn das Abo danach ausläuft.

- Klickt Nutzer A auf "Nachricht senden" (oder beantwortet eine neue Anfrage), wird geprüft: `hasActiveSubscription === true`.
- Wird der Chat dabei erstellt, bekommt der Chat-Datensatz ein Flag `isUnlocked = true` (alternativ: ein Timestamp, der in die damalige Abo-Laufzeit fällt).
- Beim Laden der Postfach-/Chatliste wird **nicht** mehr der aktuelle, globale Abo-Status des Nutzers geprüft, sondern nur noch, ob der jeweilige Chat `isUnlocked` ist. Ist das Abo abgelaufen, bleiben bestehende freigeschaltete Chats voll nutzbar — **inklusive In-App-Video-Anrufen in diesen Chats** (Video ist also nicht separat an ein aktives Abo gekoppelt, sondern folgt der Thread-Unlock-Logik). Gesperrt wird nur das Starten neuer Chats/Beantworten neuer Anfragen.
- UX bei Ablauf: Hinweis à la "Dein Abo ist abgelaufen. Du kannst keine neuen Sitter mehr anschreiben. Deine bestehenden Unterhaltungen mit Anna und Tom bleiben aber weiterhin offen."

Umsetzung betrifft `lib/api/chat.ts` und die Tabelle `conversations`/`messages` in `supabase/schema.sql` (neue Spalte `is_unlocked BOOLEAN DEFAULT FALSE`, gesetzt beim Erstellen der Konversation je nach `useMembership().isPro`).

## 6. Offene Fragen

Keine inhaltlichen Fragen mehr offen. Verbleibend sind nur technische Setup-Schritte ohne Entscheidungsbedarf:

- RevenueCat-Produkte/Preise in App Store & Play Store passend zu 34€/69€/132€ anlegen.
- 7-Tage-Erinnerung vor Verlängerung läuft über dieselben Kanäle (Mail/Push), die der Nutzer in "Benachrichtigungen" für Abo-Ereignisse eingestellt hat — kein eigener, fest verdrahteter Kanal.

## 7. Umsetzungsreihenfolge (Vorschlag)

1. ✅ **Erledigt (2026-08-31):** Migration `profiles.membership_plan`, `profiles.auto_renew`, `profiles.id_verified`; `conversations.is_unlocked` (Thread-Unlock). Umgesetzt in [supabase/migrations/20260831134425_add_membership_thread_unlock_fields.sql](../supabase/migrations/20260831134425_add_membership_thread_unlock_fields.sql), `supabase/schema.sql` aktualisiert, per `supabase db push` auf das verlinkte Projekt angewendet und über `information_schema.columns` verifiziert.
2. ✅ **Erledigt (2026-08-31):** Konto-Routen umstrukturiert. `settings/change-password.tsx` → `account/change-password.tsx`, `settings/delete-account.tsx` → `account/delete-account.tsx`, `membership.tsx` → `subscription/index.tsx`, `settings/notifications.tsx` → `subscription/notifications.tsx`, `help-support.tsx` → `support/help-support.tsx`, `terms.tsx`/`privacy.tsx` → `support/legal/`. `settings/language.tsx`, `settings/index.tsx` und `feedback.tsx` entfernt. Alle Verweise auf die alten Pfade angepasst (`konto/index.tsx`, `components/home/HelpButton.tsx`, `lib/paywall.ts`) — die "Einstellungen"-Karte in `konto/index.tsx` verlinkt vorübergehend direkt auf die neuen Ziel-Dateien; die eigentliche Umgruppierung in die drei neuen Bereiche (Konto & Profil / Abo & Zahlung / Support & Rechtliches) inkl. Sprach-Dropdown folgt in Schritt 3. Noch nicht angelegt (folgt in späteren Schritten): `account/index.tsx` (Anmeldedaten-Übersicht), `subscription/payment.tsx`, `support/about.tsx`, `support/legal/impressum.tsx`.
3. ✅ **Erledigt (2026-08-31):** `konto/index.tsx` zeigt jetzt die drei Gruppen **Konto & Profil** (Anmeldedaten, Öffentliches Profil), **Abo & Zahlung** (Abo, Benachrichtigungen) und **Support & Rechtliches** (Hilfe & FAQ, Rechtliches, Sprache, Abmelden). Neu angelegt: `account/index.tsx` (Anmeldedaten-Hub mit Passwort ändern/Konto löschen) und `support/legal/index.tsx` (Rechtliches-Hub mit AGB/Datenschutz — Impressum-Zeile folgt in Schritt 5). Sprache ist als Dropdown direkt neben "Abmelden" umgesetzt (anchored Modal analog zum bestehenden `NotificationBell`-Muster, keine eigene Route mehr). Neue i18n-Keys (`konto.groupAccount/groupSubscription/groupSupport/credentials/publicProfile/subscription`) in allen vier Sprachen ergänzt, verwaiste Keys (`konto.editProfile`, `konto.membership`, `konto.sendFeedback`, `konto.profile`, `konto.settings`, `konto.support`) entfernt. `npx tsc --noEmit` läuft fehlerfrei durch. **Noch offen:** "Zahlung" (RevenueCat, Schritt 4) und "Über uns" (Schritt 5) fehlen als Menüpunkte, weil die Zielscreens dafür noch nicht existieren.
4. ✅ **Erledigt (2026-08-31), im Demo-Modus:** Da ihr aktuell über Expo Go testet (kein eigener Dev-Client) und weder RevenueCat-Account noch App Store/Play-Console-Produkte existieren, wurde das echte `react-native-purchases`-SDK **bewusst nicht installiert** — es benötigt natives Linking und würde Expo Go zum Absturz bringen. Stattdessen:
   - `lib/revenuecat.ts`: Plan-Definitionen (1/3/12 Monate, 34€/69€/132€), `isRevenueCatConfigured()` (aktuell immer `false`, da keine API-Keys gesetzt sind), `purchasePlan()`/`setAutoRenew()` mit klar kommentiertem "echtem" Pfad (`Purchases.purchasePackage()`, native Store-Abo-Verwaltung für Kündigung) und einem voll funktionsfähigen **Demo-Pfad**, der `profiles.membership_tier/plan/expires_at/auto_renew` direkt in Supabase setzt, damit Pro-Funktionen ohne echte Zahlung getestet werden können.
   - 7-Tage-Erinnerung vor Verlängerung: lokal geplante Push-Benachrichtigung über `expo-notifications` (`scheduleRenewalReminder`/`cancelRenewalReminder`), funktioniert in Expo Go (nur *lokale* Notifications, keine Remote-Push nötig).
   - `subscription/index.tsx` (vormals `membership.tsx`) komplett neu gebaut: Laufzeit-Auswahl mit "Bester Preis"-Badge, Preis/Monat-Anzeige, Auto-Verlängerung-Toggle (Standard an) mit Hinweistext direkt am Kauf-Button, Demo-Hinweisbanner, Kündigen-/Reaktivieren-Flow mit Bestätigungsdialog, Pro-vs-Free-Feature-Vergleich, Empfehlungslink-Sektion (unverändert übernommen).
   - `types/user.ts`: `Profile` um `membership_plan`, `auto_renew`, `id_verified` ergänzt (Migration aus Schritt 1 nachgezogen). `lib/hooks/useMembership.ts` liefert jetzt zusätzlich `plan`/`autoRenew`.
   - i18n-Namespace `membership.*` in allen vier Sprachen zu `subscription.*` umgebaut (neue Preis-/Kündigen-/Demo-Texte); eine verbliebene Referenz auf den alten Key in `app/profile/[id].tsx` (Standard-Badge auf fremden Profilen) mit umgezogen.
   - `npx tsc --noEmit` läuft fehlerfrei.
   
   **Damit später auf echtes RevenueCat umgestellt werden kann:** Dev-Client/EAS-Build einrichten, `expo install react-native-purchases` + Config-Plugin in `app.json`, `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`/`_ANDROID` setzen, Produkte in App Store Connect/Play Console + RevenueCat-Dashboard mit Entitlement `pro` anlegen, dann die als TODO markierten Stellen in `lib/revenuecat.ts` durch echte SDK-Aufrufe ersetzen — die UI (`subscription/index.tsx`) bleibt dabei unverändert, da sie nur gegen `purchasePlan`/`setAutoRenew` programmiert ist.
5. ✅ **Erledigt (2026-08-31):** `support/about.tsx` (Über uns) und `support/legal/impressum.tsx` (Impressum, Inhalt aus Abschnitt 8) angelegt. Beide über die neuen Menüpunkte erreichbar: "Über uns" direkt unter "Support & Rechtliches" in `konto/index.tsx`, Impressum als dritte Zeile im "Rechtliches"-Hub (`support/legal/index.tsx`, neben AGB/Datenschutz). Über-uns-Texte sind in allen vier Sprachen übersetzt (neuer i18n-Namespace `about.*`); der Impressum-Text bleibt bewusst nur auf Deutsch (fixe Pflichtangabe nach § 5 TMG, wie vom Nutzer vorgegeben) — nur der Menü-/Screen-Titel (`impressum.title`) ist pro Sprache übersetzt. `npx tsc --noEmit` läuft fehlerfrei.
6. **Deutlich größer als ursprünglich skizziert** — Nutzer hat am 2026-09-03 ein vollständiges Datenmodell für das öffentliche Profil vorgegeben (BaseProfile/SitterProfile/HostProfile + Progressive Profiling + rollenabhängige Fremdansicht), siehe Abschnitt 9 für die volle Spezifikation. Aufgeteilt in Unterschritte, die einzeln umgesetzt werden:
   - **6a.** ✅ **Erledigt (2026-09-03):** Migration [supabase/migrations/20260903090809_add_public_profile_datamodel.sql](../supabase/migrations/20260903090809_add_public_profile_datamodel.sql) angewendet (`profiles` um `city`, `country`, `photos`, `has_own_pets`, `own_pets_description` erweitert; neue 1:1-Tabellen `sitter_profiles`/`host_profiles` mit RLS), `supabase/schema.sql` aktualisiert. Die ursprünglichen Push-Fehler waren letztlich kein Netzwerkproblem, sondern ein falsches/fehlendes Datenbank-Passwort bei der CLI (`password authentication failed for user "supabase_admin"`) — nach `supabase link --password ...` mit dem korrekten DB-Passwort aus dem Supabase-Dashboard (Project Settings → Database) lief `db push` sofort durch. Live über `information_schema` verifiziert: beide Tabellen und alle fünf neuen Spalten existieren.
   - **6b.** ✅ **Erledigt (2026-09-03):** Typen (`types/user.ts`: `SitterProfile`, `HostProfile`, `Profile` um die neuen BaseProfile-Felder ergänzt) + API (`lib/api/profiles.ts`: `getSitterProfile`/`upsertSitterProfile`, `getHostProfile`/`upsertHostProfile`, `uploadProfilePhoto`).
   - **6c.** ✅ **Erledigt (2026-09-03):** `profile/edit.tsx` um Wohnort (Stadt/Land), "Eigene Tiere"-Toggle mit Freitext, Bildergalerie (Upload/Entfernen, wiederverwendet den bestehenden `avatars`-Storage-Bucket unter `{userId}/gallery/...`, keine neue Bucket-Infra nötig) sowie zwei Einstiegs-Karten "Sitter-Profil vervollständigen" / "Host-Profil vervollständigen" ergänzt. Neue Komponente [components/ui/ChipGroup.tsx](../components/ui/ChipGroup.tsx) (Single-/Multi-Select-Chips) für Checkbox-artige Felder angelegt.
   - **6d.** ✅ **Erledigt (2026-09-03):** Neue Screens `konto/profile/sitter.tsx` und `konto/profile/host.tsx` mit allen Feldern aus Abschnitt 9.2/9.3 (ChipGroup für Auswahlfelder, Freitext für Referenzen/Regeln/Pflanzen-Notizen). `animals_cared` wird dabei direkt auf `profiles` mitgespeichert (kein Duplikat-Feld). i18n-Namespaces `sitterProfile.*`/`hostProfile.*` in allen vier Sprachen ergänzt. `npx tsc --noEmit` läuft für 6b–6d fehlerfrei — **funktional aber erst nach 6a testbar**, da die Zieltabellen live noch nicht existieren.
   - **6e.** ✅ **Erledigt (2026-09-03):** Korrektur vorab — das Sitter-Inserat-Feature aus `docs/feature-sitter-listings-host-search.md` war entgegen dem dortigen Stand ("geplant, noch nicht begonnen") tatsächlich bereits gebaut (`search/sitter-listings/`, `search/sitters/`) und ist mit umgesetzt worden.
     - `app/profile/[id].tsx` liest jetzt einen `viewMode`-Query-Param (`sitter`/`host`) und zeigt zusätzlich zum BaseProfile (Wohnort, eigene Tiere, Bildergalerie, Tierarten-Erfahrung — alle neu ergänzt) die passende Sitter- ("Kompetenz-Akte") oder Host-Sektion ("Zuhause-Akte"), sofern das jeweilige Rollen-Profil existiert.
     - `viewMode` wird an allen eindeutigen Navigationsstellen mitgegeben: `search/sitters/[id].tsx` → `sitter`, `search/listings/[id].tsx` "Host-Profil ansehen" → `host`, `search/bookings/[id].tsx` → je nachdem ob der aktuelle Nutzer Owner oder Sitter der Buchung ist. Im Chat (`chat/[conversationId].tsx`) bleibt `viewMode` bewusst offen (Rolle dort nicht eindeutig bestimmbar) — zeigt nur BaseProfile, kein Rollen-Gate.
     - Neue Komponente [components/auth/RequireRoleProfile.tsx](../components/auth/RequireRoleProfile.tsx): voller Screen-Gate, verwendet in `search/listings/create.tsx` (Pflicht: `hostProfile`) und `search/sitter-listings/create.tsx` (Pflicht: `sitterProfile`) — zeigt statt des Erstell-Assistenten einen "Vervollständige dein Profil"-Prompt.
     - Neue Datei [lib/profileGate.ts](../lib/profileGate.ts) (`ensureSitterProfile`): leichtgewichtiger Alert-Gate (analog `lib/paywall.ts`) für die beiden Kontaktaufnahme-Aktionen in `search/listings/[id].tsx` ("Sitting anfragen" und "Nachricht senden") — prüft `sitterProfile`, bevor eine Bewerbung/Nachricht an einen Host rauskann. Bewusst **nicht** gegengleich in `search/sitters/[id].tsx` gespiegelt (Host kontaktiert Sitter) — dafür gibt es keine explizite Vorgabe, ein Host bräuchte dort kein `sitterProfile`.
     - Neuer i18n-Namespace `profileGate.*` in allen vier Sprachen. `npx tsc --noEmit` läuft fehlerfrei.
   - **6f.** ✅ **Erledigt (2026-09-03):** Migration [supabase/migrations/20260903094317_add_id_verification.sql](../supabase/migrations/20260903094317_add_id_verification.sql) angewendet: privater Storage-Bucket `id-verification` (public=false) + RLS-Policies (Nutzer dürfen nur eigene Dateien unter `{user_id}/id-photo.*`/`{user_id}/selfie.*` hochladen/ansehen/löschen), neue Spalte `profiles.id_verification_submitted_at`. Live verifiziert.
     - `lib/api/profiles.ts`: `uploadVerificationPhoto`, `submitVerification`.
     - Neuer Screen `konto/profile/verification.tsx`: zwei Foto-Slots (Ausweisfoto + Selfie), Datenschutz-Hinweis, Einreichen-Button; danach drei Zustände — "Wird geprüft" (`id_verification_submitted_at` gesetzt, `id_verified` false), "Verifiziert" (`id_verified` true), oder das Upload-Formular. Einstiegspunkt als eigene Karte in `profile/edit.tsx` mit Status-Badge.
     - **Bewusst nicht gebaut** (wie geplant): kein Admin-Review-UI und keine automatische Löschung — die Fotos werden manuell im Supabase-Dashboard geprüft und von euch danach gelöscht (Policies erlauben das, App-seitig passiert dort nichts automatisch).
     - `app/profile/[id].tsx`: kleines "Verifiziert"-Häkchen neben dem Namen ergänzt, wenn `profile.id_verified` — macht den Status auch auf fremden Profilen sichtbar (war im ursprünglichen Plan nicht explizit erwähnt, aber Sinn des Features laut Rechtematrix "Offizieller ID-Check & 'Verified'-Badge").
     - Neuer i18n-Namespace `verification.*` in allen vier Sprachen. `npx tsc --noEmit` läuft fehlerfrei.

   **Nachtrag (2026-09-03):** Beim Nachfragen aufgefallen, dass eine Benachrichtigung bei Freigabe fehlte. Ergänzt: [supabase/migrations/20260903094848_notify_on_verification_approved.sql](../supabase/migrations/20260903094848_notify_on_verification_approved.sql) — ein DB-Trigger auf `profiles`, der bei `id_verified: false/NULL → true` (manuell im Dashboard gesetzt) automatisch einen Eintrag in `notifications` (`type: 'verification_approved'`) erzeugt. Landet dank der bereits bestehenden Realtime-Subscription (`lib/hooks/useNotifications.ts`) sofort live im `NotificationBell` — kein zusätzlicher App-Code nötig. Live verifiziert (Trigger existiert auf `profiles`/`UPDATE`).

   **Nachtrag 2 (2026-09-03):** Auf Nachfrage — es gab keine Möglichkeit für euch als Betreiber zu sehen, wenn ein Profil zur Prüfung eingereicht wurde. Ergänzt: [supabase/migrations/20260903095333_add_pending_verifications_view.sql](../supabase/migrations/20260903095333_add_pending_verifications_view.sql), eine SQL-View `pending_verifications` (offene Einreichungen, sortiert nach Einreichedatum) — im Supabase Table Editor unter "Views" mit einem Klick einsehbar, kein externer Dienst nötig. Live verifiziert.

   **Nachtrag 3 (2026-09-03):** Nutzer meldete, dass die neue View im Dashboard rot als "Unrestricted" markiert war — zu Recht: Views ohne Einschränkung sind standardmäßig über die öffentliche REST-API abfragbar (`anon`/`authenticated`), nicht nur im Dashboard. Behoben in [supabase/migrations/20260903095742_restrict_pending_verifications_view.sql](../supabase/migrations/20260903095742_restrict_pending_verifications_view.sql) (`REVOKE ALL ON pending_verifications FROM anon, authenticated`) — Dashboard-Zugriff (läuft über `postgres`) bleibt unberührt. Live verifiziert: nur noch `service_role`/`postgres` haben Rechte auf die View, REST-API-Zugriff mit Anon-Key schlägt fehl.

   **Schritt 6 ist damit komplett (6a–6f).**
7. ✅ **Erledigt (2026-09-03):** Migration [supabase/migrations/20260903100142_add_notification_preferences.sql](../supabase/migrations/20260903100142_add_notification_preferences.sql): neue Spalte `profiles.notification_preferences` (JSONB, pro Ereignistyp `{push, email}`, Default siehe Migration). Live verifiziert.
   - `konto/subscription/notifications.tsx` komplett umgebaut: pro Ereignistyp jetzt zwei getrennte Switches (Push/Mail) statt einem, geladen aus und gespeichert in `user.notification_preferences` (optimistisches Update, Rollback bei Fehler).
   - `subscription/index.tsx`: die 7-Tage-Abo-Erinnerung aus Schritt 4 prüft jetzt `notification_preferences.membership.push`, bevor sie eine lokale Erinnerung plant — genau wie in Abschnitt 6 des Dokuments festgelegt ("läuft über dieselben Kanäle, die der Nutzer eingestellt hat").
   - **Ehrlicher Hinweis zum Umfang:** Für die anderen vier Ereignistypen (`new_message`, `booking_request`, `booking_update`, `favourite`) existiert aktuell **keine** Stelle im Code, die tatsächlich eine Benachrichtigung erzeugt (kein Trigger, kein Client-Insert in `notifications`) — das war schon vor diesem Schritt so und ist kein Rückschritt, aber die neuen Einstellungen wirken sich bei diesen vier Typen noch auf nichts aus, bis eine solche Versand-Logik gebaut wird. Einzige aktuell wirklich funktionierende Verbindung ist die Mitgliedschafts-Erinnerung.
   - Kein E-Mail-Versand implementiert (bräuchte einen E-Mail-Dienst/SMTP — bewusst nicht gebaut, siehe "Uni-Projekt, keine Kosten"-Prämisse aus Schritt 4). `email`-Toggle wird nur gespeichert, aktuell ohne Wirkung.
   - `npx tsc --noEmit` läuft fehlerfrei.
8. ✅ **Erledigt (2026-09-03):** `types/chat.ts`: `Conversation` um `is_unlocked` ergänzt. `lib/api/chat.ts`: `getOrCreateConversation` bekommt einen `isUnlocked`-Parameter (Default `true`) und setzt ihn beim Insert explizit statt sich nur auf den Spalten-Default zu verlassen; beide Aufrufstellen (`search/listings/[id].tsx`, `search/sitters/[id].tsx`) übergeben jetzt explizit den `isPro`-Status zum Zeitpunkt der Erstellung.
   - `chat/[conversationId].tsx`: liest `conversation.is_unlocked`, berechnet `canReply = isUnlocked || isPro` und sperrt bei `false` das Eingabefeld — ersetzt durch einen Hinweis ("Unterhaltung gesperrt, kein aktiver Zeitpass") mit Link zum Abo-Bereich, statt (wie vorher gar nicht vorhanden) auf einen globalen Abo-Status zu prüfen.
   - Postfach-Liste (`chat/index.tsx`) zeigt weiterhin alle Konversationen unabhängig vom Abo-Status — das entspricht bereits dem Zielverhalten aus Abschnitt 5.1 (nur *neue* Chats/Anfragen sind Pro-pflichtig, bestehende bleiben sichtbar und nutzbar).
   - **Praktische Einschränkung:** Da neue Konversationen aktuell nur erstellt werden können, wenn der Ersteller bereits Pro ist (Paywall-Check vor dem Insert), ist `is_unlocked` in der Praxis derzeit immer `true` — der Sperr-Zustand in der Chat-Ansicht ist Vorsorge/korrekt verdrahtet, aber es gibt noch kein Szenario im echten Betrieb, das ihn auslöst. Das ändert sich erst, falls die Erstellungs-Regeln sich mal ändern (z. B. differenziertere Free/Pro-Abstufungen).
   - `npx tsc --noEmit` läuft fehlerfrei.
9. ✅ **Erledigt (2026-09-03):** [lib/constants/permissions.ts](../lib/constants/permissions.ts) — alle 15 Zeilen der Rechtematrix aus Abschnitt 5 als typisierte Konstante (`PERMISSIONS: Record<PermissionKey, Record<UserTier, boolean>>`, `UserTier = 'guest' | 'free' | 'pro'`). Neuer Hook [lib/hooks/usePermissions.ts](../lib/hooks/usePermissions.ts) (`useUserTier`, `useCan(key)`) darüber.
   - **Dabei eine echte Lücke gefunden und behoben:** Der "Sitting anfragen"/"Buchung anfragen"-Button (Buchung mit Datum, ohne über den losen "Nachricht senden"-Button zu gehen) hatte **keinen** Pro-Check — nur der Chat-Button war gesperrt. Das widersprach der Matrix ("Erste Nachricht senden (Bewerbung)" = Pro-pflichtig). Auf Nachfrage entschieden: Buchungsanfrage ist jetzt ebenfalls Pro-pflichtig, in `search/listings/[id].tsx` und `search/sitters/[id].tsx` beide über `useCan('sendFirstMessage')` + `showPaywallModal` abgesichert.
   - `handleMessage` in beiden Dateien sowie `getOrCreateConversation`s `isUnlocked`-Parameter nutzen jetzt `canSendFirstMessage` statt rohem `isPro`.
   - `chat/[conversationId].tsx`: `canReply` unterscheidet jetzt sauber zwischen `continueUnlockedThread` (gilt für Free) und `sendFirstMessage` (nur Pro), je nachdem ob die Konversation `is_unlocked` ist.
   - **Zweite Lücke gefunden und behoben:** Der ID-Check-Screen (`konto/profile/verification.tsx`) hatte keinerlei Pro-Gate, obwohl "Offizieller ID-Check & 'Verified'-Badge" laut Matrix Pro-pflichtig ist. Free-Nutzer sehen jetzt einen Upgrade-Hinweis statt des Upload-Formulars (bereits verifizierte/eingereichte Nutzer sehen ihren Status unabhängig vom aktuellen Abo weiterhin, keine rückwirkende Sperre).
   - **Matrix-Zeilen ohne entsprechendes Feature:** `searchAlerts` (Such-Alarme) und `videoPitch` (Video-Pitch im Profil) existieren im Code noch gar nicht — nichts zum Gaten vorhanden, als offener Punkt vermerkt statt vorgetäuscht umgesetzt. `vetHotline`-Button im Chat-Hilfe-Sheet ist rein dekorativ (kein `onPress`, war schon vorher so) — ebenfalls nichts zum Gaten.
   - `respondToNewRequest` ist als Matrix-Zeile in der Konstante abgebildet, wird aber architektonisch vom Thread-Unlock-Modell (Schritt 8) überlagert: sobald eine Konversation existiert, ist sie sofort `is_unlocked`, ein separates "erste Antwort noch gesperrt"-Zwischenstadium gibt es im aktuellen Design nicht (das war schon in Abschnitt 5.1 so festgelegt).
   - `npx tsc --noEmit` läuft fehlerfrei.
10. i18n-Keys für alle neuen/verschobenen Screens in `lib/i18n/locales/{de,en,fr,es}.ts` ergänzen.

## 10. Offene ToDos aus bisherigen Hinweisen

Sammlung aller Lücken/Kompromisse, die im Lauf der Umsetzung (Schritte 1–7) bewusst offen gelassen oder nur als Hinweis erwähnt wurden, inkl. Entscheidungen vom 2026-09-03.

- [x] **T1 — "Zahlung"-Menüpunkt fehlte.** Entschieden: Platzhalter, kein Dev-Client. **Erledigt:** neuer Screen `konto/subscription/payment.tsx` ("Läuft über App Store/Play Store, sobald echte Käufe aktiv sind" + Demo-Hinweis) + Menüpunkt in `konto/index.tsx` unter "Abo & Zahlung". i18n-Namespace `payment.*` in allen vier Sprachen.
- [ ] **T2 — RevenueCat läuft nur im Demo-Modus.** Entschieden: bleibt vorerst so (kein Dev-Client-Umstieg jetzt). Kein Code-Änderung nötig — bleibt offen bis nach Projektabgabe bzw. bis ihr Dev-Client/EAS-Build wollt.
- [x] **T3 — Chat-Profilansicht zeigte keine Rollen-Details.** Entschieden: nachziehen. **Erledigt:** neue Spalte `conversations.sitter_listing_id` (Migration [20260903102811](../supabase/migrations/20260903102811_add_conversation_sitter_listing_ref.sql)), `lib/api/chat.ts` joint jetzt `listing.owner_id`/`sitter_listing.sitter_id`, `chat/[conversationId].tsx` leitet daraus `viewMode` her und gibt ihn beim Profil-Link mit. Funktioniert für Konversationen, die über ein Host- oder Sitter-Inserat gestartet wurden; Alt-Konversationen ohne Zuordnung zeigen weiterhin nur BaseProfile.
- [x] **T4 — Host→Sitter-Kontakt hatte kein Progressive-Profiling-Gate.** Entschieden: nachziehen. **Erledigt:** neue Funktion `ensureHostProfile` in [lib/profileGate.ts](../lib/profileGate.ts), eingebaut in `search/sitters/[id].tsx` bei "Buchung anfragen" und "Nachricht senden" (Symmetrie zu `ensureSitterProfile`).
- [ ] **T5 — E-Mail-Benachrichtigungen ohne Wirkung.** Entschieden: bleibt vorerst ohne echten Versand (kein externer Dienst). Toggle bleibt gespeichert, aber wirkungslos.
- [x] **T6 — 4 von 5 Benachrichtigungstypen erzeugten nie eine Benachrichtigung.** Entschieden: In-App-Trigger nachrüsten. **Erledigt:** Migration [20260903103129](../supabase/migrations/20260903103129_add_notification_triggers.sql) — vier neue DB-Trigger (`on_message_created`, `on_booking_created`, `on_booking_status_changed`, `on_favourite_created`), jeder respektiert `notification_preferences->type->push` (Default an). Empfänger wird über `auth.uid()` (bei Buchungen) bzw. über die Konversations-Teilnehmer (bei Nachrichten) ermittelt. Live verifiziert (alle vier Trigger existieren). **Weiterhin offen:** kein E-Mail-Versand (siehe T5).
- [ ] **T7 — Kein aktiver Admin-Alarm bei neuen ID-Check-Einreichungen.** Bewusste Entscheidung für die einfache Dashboard-View (`pending_verifications`) statt Discord/Slack-Webhook — bleibt so, nur als Erinnerung gelistet, falls sich das später ändern soll.
- [x] **T8 — Such-Alarme existierten nicht.** Entschieden: bauen. **Erledigt (2026-09-03):** Migration [20260903145219](../supabase/migrations/20260903145219_add_search_alert_trigger.sql) — neuer DB-Trigger `on_listing_activated` auf `listings` (bei INSERT oder Status-Wechsel zu `active`), gleicht `saved_searches.filters` gegen `city`/`country`/`hasPets`/`keyword`/Datumsüberschneidung ab und benachrichtigt nur Nutzer mit aktivem Pro-Zeitpass (`membership_tier = 'standard' AND membership_expires_at > now()`). Neuer Ereignistyp `search_alert` in `notification_preferences` (Default `push: true, email: false`) + eigene Zeile in `konto/subscription/notifications.tsx` + i18n in allen vier Sprachen. **Bewusst nicht abgeglichen:** `petTypes` — die Struktur von `listings.pet_details` ist nicht eindeutig genug für einen verlässlichen Match, andere Kriterien reichen für einen sinnvollen Alarm. Gilt nur für Haus-Inserate (`listings`), nicht für Sitter-Inserate — dafür gibt es aktuell keine gespeicherten Suchen. `npx tsc --noEmit` läuft fehlerfrei, Trigger live verifiziert.
- [x] **T9 — Video-Pitch im Profil existierte nicht.** Entschieden: bauen. **Erledigt (2026-09-03):** Migration [20260903145820](../supabase/migrations/20260903145820_add_video_pitch.sql) — neue Spalte `profiles.video_pitch_url`. Video liegt im bestehenden `avatars`-Bucket unter `{userId}/video-pitch.*` (kein neuer Bucket nötig). Neues Paket `expo-video` installiert (offiziell von Expo, läuft in Expo Go, Config-Plugin automatisch in `app.json` ergänzt). Neuer Screen `konto/profile/video-pitch.tsx` (Pro-Gate über `useCan('videoPitch')`, Upload/Ersetzen/Entfernen, Vorschau mit `VideoView`), Einstiegs-Karte in `profile/edit.tsx` mit "Hinzugefügt"-Badge, und Anzeige auf dem öffentlichen Profil (`app/profile/[id].tsx`) — sonst wäre der Pitch für niemanden sichtbar gewesen. i18n-Namespace `videoPitch.*` in allen vier Sprachen. `npx tsc --noEmit` läuft fehlerfrei, Spalte live verifiziert.

## 8. Impressum-Inhalt

Text liegt bereits vor, kommt 1:1 nach `konto/support/legal/impressum.tsx` (mehrsprachig ablegen wie die übrigen Rechtstexte):

> **Angaben gemäß § 5 TMG**
>
> PawStay — Ein akademisches Projekt
>
> **Vertreten durch:** Elisa Holzheid und Noah Frei
>
> **Postanschrift:** Hauptstraße 1, 97070 Würzburg
>
> **Kontakt:** Telefon: +49 (0) 123 456 789 (fiktiv) · E-Mail: kontakt@pawstay-uniprojekt.de (fiktiv)
>
> **Haftungsausschluss & Projekt-Hinweis:** Dieses Impressum dient ausschließlich zu Demonstrationszwecken. Bei "PawStay" handelt es sich um einen Prototyp im Rahmen eines Universitätsprojekts. Es werden keine tatsächlichen Dienstleistungen angeboten, und es findet kein realer Zahlungsverkehr statt.

## 9. Öffentliches Profil — Datenmodell (BaseProfile / SitterProfile / HostProfile)

Vorgabe vom Nutzer (2026-09-03), ersetzt die ursprünglich vage Formulierung "Sitter-Infos, Host-Infos" aus Abschnitt 3.

### 9.1 BaseProfile (Pflicht bei Registrierung, für beide Rollen)

- Vorname & Alter — bereits vorhanden (`profiles.full_name`, `profiles.age`)
- Profilbild & Bildergalerie — Profilbild bereits vorhanden (`avatar_url`); Galerie ist **neu** (`profiles.photos TEXT[]`)
- Wohnort (Stadt & Land) — **neu**, bewusst getrennt von `profiles.origin` (Herkunftsland, wird für den automatisch generierten Sitter-Inserat-Titel "Vorname, Alter, Land" gebraucht, siehe `docs/feature-sitter-listings-host-search.md`). Neue Spalten `city`, `country`.
- Persönliche Beschreibung "Über mich" — bereits vorhanden (`profiles.bio`)
- Eigene Tiere vorhanden (Ja/Nein + Freitext) — **neu**, gilt für beide Rollen (`has_own_pets BOOLEAN`, `own_pets_description TEXT`)
- Verifizierungs-Status — ID-Check bereits vorhanden (`profiles.id_verified`, seit Schritt 1); E-Mail-Bestätigung kommt aus `auth.users.email_confirmed_at` (Supabase Auth), braucht keine eigene Spalte

### 9.2 SitterProfile ("Kompetenz-Akte", Pflicht vor Bewerbung auf ein Inserat)

Wird als eigene 1:1-Tabelle `sitter_profiles` (FK auf `profiles.id`) angelegt, nicht als Spalten auf `profiles` — sauberer trennbar, und die Host-Ansicht kann gezielt "BaseProfile + sitter_profiles" laden, ohne alle Sitter-Felder auf jedem Profil mitzuschleppen.

- Erfahrung mit Housesittings (Anfänger/Fortgeschritten/Experte + Freitext-Referenzen) → `experience_level`, `experience_references`
- Tierarten-Erfahrung (Checkboxen: Hunde, Katzen, Nager, Reptilien, …) → **wiederverwendet `profiles.animals_cared`** (existiert schon, exakt dafür gedacht — keine Dopplung)
- Spezielle Pflegekenntnisse (Checkboxen/Freitext: Medikamentengabe, Senior-Hunde-Erfahrung, Erste Hilfe) → `special_skills TEXT[]`, `special_skills_notes TEXT`
- Mobilität (eigenes Auto / ÖPNV) → `mobility`
- Arbeits-Setup (Remote / tagsüber außer Haus / flexibel) → `work_setup`

### 9.3 HostProfile ("Zuhause-Akte", Pflicht vor Erstellen eines Haus-Inserats)

Ebenfalls eigene 1:1-Tabelle `host_profiles`.

- Wohnsituation (Haus/Wohnung/Resthof) → `housing_type`
- Umgebung & Lifestyle (Ruhig/Ländlich, Stadt, Waldnähe, Nichtraucher-Haushalt — Mehrfachauswahl) → `environment_tags TEXT[]`
- Haus-Regeln & Atmosphäre (Freitext) → `house_rules`
- Zimmerpflanzen & Garten — anspruchsvolle Pflanzen (Alocasia, Monstera, Strelitzien) / Garten-Pflege (Freitext) → `garden_plants_notes`
- Sitter-Unterbringung (separates Gästezimmer / eigenes Bad / Schlafzimmer der Besitzer) → `sitter_accommodation`

### 9.4 UI- & Logik-Regeln

- **Progressive Profiling:** Vor den Aktionen "Inserat anlegen" und "Nachricht senden" wird geprüft, ob das jeweils nötige Rollen-Profil existiert.
  - Klick auf "Inserat anlegen" (Host-Zuhause-Inserat, `search/listings/create.tsx`) → prüfen, ob `host_profiles`-Eintrag existiert. Falls nicht: Screen "Vervollständige dein Host-Profil" statt des Erstell-Assistenten.
  - Klick auf "Nachricht senden" (erste Bewerbung/Anfrage eines Sitters) → prüfen, ob `sitter_profiles`-Eintrag existiert. Falls nicht: Screen "Vervollständige dein Sitter-Profil".
  - Das separate Sitter-Inserat-Feature (Sitter erstellt eigenes Verfügbarkeits-Inserat, siehe `docs/feature-sitter-listings-host-search.md`) existiert im Code noch nicht — braucht das gleiche `sitter_profiles`-Gate, sobald es gebaut wird.
- **Kontext-Routing für die Fremdansicht:** `app/profile/[id].tsx` (bereits vorhanden) rendert je nach `viewMode`-Parameter BaseProfile + SitterProfile **oder** BaseProfile + HostProfile. `viewMode` ergibt sich aus dem Kontext, in dem das Profil geöffnet wird (z. B. von einem Sitter-Inserat aus → `sitter`, von einem Haus-Inserat aus → `host`).
