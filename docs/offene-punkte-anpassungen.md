# Offene Punkte / Anpassungen

Sammlung von Dingen, die uns beim Durchgehen der App aufgefallen sind und die wir noch ändern/anpassen sollten. Wird laufend ergänzt.

## 1. Anmeldedaten: E-Mail fehlt, Name nicht bei Registrierung erfasst

**Aktueller Zustand:** Im Bereich "Anmeldedaten" (Konto) wird nur das Passwort angezeigt/geändert. Die E-Mail-Adresse, mit der man sich anmeldet, fehlt dort komplett. Vor- und Nachname werden aktuell nicht bei der Registrierung abgefragt.

**Gewünschte Änderung:**
- Bei den Anmeldedaten soll zusätzlich zum Passwort auch die E-Mail-Adresse angezeigt werden, mit der Möglichkeit, sie zu ändern.
- Vor- und Nachname sollen direkt bei der Registrierung abgefragt werden.
- Vor- und Nachname sollen danach bei den Anmeldedaten angezeigt werden, aber **nicht mehr änderbar sein** (beide Felder gesperrt nach Registrierung).
- Bei der Registrierung soll ein Hinweistext angezeigt werden: anderen Nutzern wird nur der **Vorname** angezeigt. Nachname und Kontaktmöglichkeiten werden erst nach einer Buchung sichtbar.

**Betroffene Stellen (zu prüfen):**
- [app/(auth)/register.tsx](app/(auth)/register.tsx) — Registrierungsformular um Vorname/Nachname + Hinweistext erweitern
- [app/(tabs)/konto/account/change-password.tsx](app/(tabs)/konto/account/change-password.tsx) — evtl. Umbenennung/Erweiterung zu "Anmeldedaten" (Passwort + E-Mail)
- [lib/api/profiles.ts](lib/api/profiles.ts) — Profilstruktur um Vor-/Nachname erweitern, ggf. Sichtbarkeitslogik (nur Vorname öffentlich, Nachname erst nach Buchung)
- [supabase/schema.sql](supabase/schema.sql) — Datenbankschema anpassen (Felder für Vorname/Nachname, Zugriffsregeln/RLS für Sichtbarkeit)
- [app/(tabs)/konto/profile/edit.tsx](app/(tabs)/konto/profile/edit.tsx) — Name-Felder hier entfernen/sperren, falls dort aktuell änderbar

---

## 2. Zurück-Navigation landet auf zufälligen/falschen Seiten

**Aktueller Zustand:** Wenn man z. B. von "Start" auf "Inserat erstellen" geht, dort zur Profil-Vervollständigung umgeleitet wird und diese abschließt, führt "Zurück" danach nicht zur ursprünglichen Ausgangsseite, sondern auf eine unzusammenhängende Seite (z. B. "Abo" im Konto-Bereich).

**Gewünschte Änderung:** Die Navigationshistorie soll beim Umleiten zur Profil-Vervollständigung (und generell bei Redirects) so aufgebaut werden, dass "Zurück" zur eigentlich erwarteten vorherigen Seite führt, nicht zu einer beliebigen Seite im Stack.

**Betroffene Stellen (zu prüfen):**
- [components/auth/RequireRoleProfile.tsx](components/auth/RequireRoleProfile.tsx) — Redirect-Logik zur Profilvervollständigung, vermutlich `router.push`/`replace` ohne sauberen Rückweg
- [app/_layout.tsx](app/_layout.tsx) — globale Navigations-/Stack-Struktur

**Frage an dich:** Sollen wir grundsätzlich `router.replace` statt `router.push` für Redirect-Sprünge (z. B. zur Profilvervollständigung) verwenden, damit sie gar nicht erst im Verlauf landen, oder soll gezielt zur ursprünglichen Seite zurückgesprungen werden (z. B. via `returnTo`-Parameter)?

---

## 3. Inserat erstellen (Sitter): Zeitraum-Schritt verwirrend, Kalender bleibt offen

**Aktueller Zustand:** Beim Auswählen des Zeitraums im Sitter-Inserat ist der "Weiter"-Button schon sichtbar/präsent, obwohl man erst noch runterscrollen müsste, um Enddatum und weitere Angaben einzugeben. Der Kalender bleibt zudem dauerhaft ausgeklappt, was verwirrend wirkt.

**Gewünschte Änderung:** Statt eines permanent offenen Kalenders mit Von-/Bis-Eingabefeldern:
1. Kalender öffnet sich für den **Start**, man tippt auf einen Tag → Startdatum wird übernommen.
2. Kalender öffnet sich automatisch für das **Ende**, man tippt auf einen Tag → Enddatum wird übernommen.
3. Kalender klappt zu, man sieht nur noch "Von – Bis" als Zusammenfassung mit der Möglichkeit, das nachträglich zu bearbeiten (z. B. durch erneutes Antippen).

**Betroffene Stellen (zu prüfen):**
- [app/(tabs)/search/sitter-listings/create.tsx](app/(tabs)/search/sitter-listings/create.tsx) — Zeitraum-Auswahl/Kalender-UI
- [app/(tabs)/search/listings/create.tsx](app/(tabs)/search/listings/create.tsx) — Zeitraum-Auswahl (`availableFrom`/`availableTo`, `showFromPicker`/`showToPicker`) — ggf. gleiches Problem, da ähnliches Pattern verwendet wird

---

## 4. Host-Inserat lässt sich nicht erstellen trotz vollständigem Host-Profil

**Aktueller Zustand:** Beim Versuch, ein Host-Inserat zu erstellen, wird man immer wieder aufgefordert, das Host-Profil zu vervollständigen — obwohl es bereits vollständig ausgefüllt ist.

**Wahrscheinliche Ursache (Code-Analyse):** [app/(tabs)/search/listings/create.tsx](app/(tabs)/search/listings/create.tsx) prüft über `RequireRoleProfile role="host"` ([components/auth/RequireRoleProfile.tsx:27-33](components/auth/RequireRoleProfile.tsx#L27-L33)), ob ein `host_profiles`-Eintrag existiert. Diese Prüfung läuft aber nur **einmal beim ersten Mounten** der Komponente (`useEffect` ohne Refetch bei Fokus). Da Expo-Router/React-Navigation Screens im Tab-/Stack-Verlauf standardmäßig gemountet lässt, bleibt der einmal ermittelte Status `'missing'` bestehen — auch nachdem man über den Prompt zum Host-Profil-Screen ([app/(tabs)/konto/profile/host.tsx](app/(tabs)/konto/profile/host.tsx)) navigiert, dort speichert und mit "Zurück" zur Inserat-Erstellung zurückkehrt. Die Seite fragt dann erneut nach dem (eigentlich schon vollständigen) Profil.

**Gewünschte Änderung:** `RequireRoleProfile` soll die Profil-Existenz bei jedem Fokussieren des Screens neu prüfen (z. B. mit `useFocusEffect` aus `expo-router`/`@react-navigation/native` statt nur `useEffect`), nicht nur beim ersten Mount.

**Betroffene Stellen (zu prüfen):**
- [components/auth/RequireRoleProfile.tsx](components/auth/RequireRoleProfile.tsx) — Fetch-Logik auf `useFocusEffect` umstellen
- [app/(tabs)/search/listings/create.tsx](app/(tabs)/search/listings/create.tsx) — betroffener Screen (Host)
- [app/(tabs)/search/sitter-listings/create.tsx](app/(tabs)/search/sitter-listings/create.tsx) — vermutlich gleiches Problem für Sitter-Seite

---

## 5. Ortspräferenzen im Sitter-Inserat: Liste aktualisiert sich nicht / keine Ortsdatenbank

**Aktueller Zustand:** Unter "Ortspräferenzen" steht "Noch keine Orte hinzugefügt". Man kann Stadt und Land per Freitext eingeben, aber der Hinweistext ändert sich nicht, wenn man einen Ort hinzufügt.

**Gewünschte Änderung:**
- Prüfen, warum die Liste der hinzugefügten Orte in der UI nicht aktualisiert wird, obwohl mehrere Orte hinzugefügt werden können sollen.
- Statt Freitext-Eingabe für Stadt/Land: eine Orts-/Länder-Datenbank/API anbinden, sodass man tippen, aus Vorschlägen auswählen und der Ort so zur Liste hinzugefügt werden kann (bessere Datenqualität, keine Tippfehler, konsistente Schreibweisen).

**Betroffene Stellen (zu prüfen):**
- [app/(tabs)/search/sitter-listings/create.tsx](app/(tabs)/search/sitter-listings/create.tsx) — `locations`-State (Zeile ~68), Hinzufügen-Logik (Zeile ~130), Anzeige "Noch keine Orte hinzugefügt" (Zeile ~306)

**Empfehlung Orts-API:** Für dieses Projekt (Semesterprojekt, kein Produktions-Traffic) empfehle ich **OpenStreetMap Nominatim** (`nominatim.openstreetmap.org`):
- kostenlos, kein API-Key/Billing nötig — passt gut für ein Studienprojekt ohne Budget
- liefert Stadt + Land inkl. Ländercode direkt aus der Freitext-Eingabe
- Einschränkung: Nutzungsrichtlinie verlangt einen eigenen `User-Agent`-Header und max. 1 Request/Sekunde (für Tippen mit Debounce völlig ausreichend, kein Bulk-Geocoding)

**Entscheidung:** Nominatim wird verwendet. ✅

---

## 6. Navigation aus "Hilfe" bricht laufenden Inserat-Erstellungs-Flow

**Aktueller Zustand:** Wird während der Inserat-Erstellung versehentlich "Hilfe" aufgerufen und danach in der Tab-Bar auf "Suchen" getippt, landet man wieder in der (unterbrochenen) Inserat-Erstellung statt auf der Suchen-Seite.

**Gewünschte Änderung:** Tab-Bar-Navigation soll sich vorhersehbar verhalten — ein Tap auf "Suchen" sollte zur Suchen-Startseite führen, nicht zu einem alten, unterbrochenen Formular-Flow.

**Betroffene Stellen (zu prüfen):**
- [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx) — Tab-Navigations-/Stack-Konfiguration
- [app/(tabs)/search/index.tsx](app/(tabs)/search/index.tsx) — Such-Tab-Root, vermutlich Stack behält den `create`-Screen im Verlauf

---

## 7. Kein Überblick über eigene Inserate auf der Startseite

**Aktueller Zustand:** Es gibt keinen zentralen Ort, um die eigenen (erstellten) Inserate einzusehen.

**Gewünschte Änderung:** Auf der Startseite, oberhalb von "So funktioniert's", einen Bereich/Einstieg ergänzen, der die eigenen Inserate anzeigt bzw. dorthin verlinkt.

**Betroffene Stellen (zu prüfen):**
- [app/(tabs)/home/index.tsx](app/(tabs)/home/index.tsx) — Startseite, Platzierung oberhalb "So funktioniert's"
- [app/(tabs)/search/listings/my-listings.tsx](app/(tabs)/search/listings/my-listings.tsx) — bestehende "Meine Inserate" (Host)
- [app/(tabs)/search/sitter-listings/my-listings.tsx](app/(tabs)/search/sitter-listings/my-listings.tsx) — bestehende "Meine Inserate" (Sitter)

---

## 8. Chat lässt sich mit Pro-Profil nicht starten

**Aktueller Zustand:** Ein Profil wurde als "Pro" angelegt, trotzdem lässt sich kein Chat starten (Nachricht senden schlägt fehl bzw. wird blockiert).

**Wahrscheinliche Ursache (Code-Analyse):** Das Recht `sendFirstMessage` ist gemäß Rechtematrix nur für den Tier `'pro'` erlaubt ([lib/constants/permissions.ts:39](lib/constants/permissions.ts#L39)). Ob ein Nutzer als "pro" gilt, wird in [lib/hooks/useMembership.ts:11-15](lib/hooks/useMembership.ts#L11-L15) rein aus dem **lokalen, im Auth-Store gehaltenen `user`-Objekt** berechnet (`user.membership_tier === 'standard'` und `membership_expires_at` in der Zukunft). Wenn dieses `user`-Objekt nach dem Anlegen/Upgrade auf "Pro" nicht neu geladen wird (z. B. weil der Auth-Store nur beim Login befüllt und nicht nach einem Abo-Abschluss aktualisiert wird), bleibt `membership_tier` clientseitig auf dem alten Stand (`free`) — `isPro` ist dann `false`, obwohl in der Datenbank bereits "pro" hinterlegt ist. Das würde exakt zu "Pro angelegt, aber Chat trotzdem blockiert" passen.

**Gewünschte Änderung:** Nach dem Anlegen/Ändern der Mitgliedschaft muss der Auth-Store-`user` (bzw. zumindest `membership_tier`/`membership_expires_at`) neu vom Server geladen werden, damit `useMembership`/`useCan` sofort den aktuellen Stand sehen — nicht erst nach Neu-Login oder App-Neustart.

**Betroffene Stellen (zu prüfen):**
- [lib/hooks/useMembership.ts](lib/hooks/useMembership.ts) — liest `membership_tier` nur aus dem gecachten `user` im Auth-Store
- [stores/authStore.ts](stores/authStore.ts) — prüfen, ob/wann `user` nach einem Abo-Kauf aktualisiert wird
- [app/(tabs)/konto/subscription/payment.tsx](app/(tabs)/konto/subscription/payment.tsx) bzw. der Abschluss-Flow des Abos — sollte nach erfolgreichem Kauf den User-State refetchen

**Bestätigt:** Das Profil wurde über den echten Kauf-/Abo-Flow in der App angelegt (aktuell zu Testzwecken ohne echte Zahlung möglich). Damit ist die Diagnose oben sehr wahrscheinlich die Ursache: Der Abschluss-Flow speichert die Mitgliedschaft in der DB, aktualisiert aber den `user` im Auth-Store nicht, sodass `useMembership`/`useCan` weiterhin mit dem alten (nicht-pro) Snapshot rechnen. **Fix:** Nach erfolgreichem Abo-Abschluss den Auth-Store-User neu laden (bzw. direkt mit der Server-Antwort aktualisieren), bevor man zur App zurückkehrt.

---

## 9. Bottom-Nav für Host zeigt "Buchungen" statt "Suche"

**Aktueller Zustand:** Als Host zeigt die Tab-Bar unten "Start, Buchungen, Chat, Konto" an, obwohl Hosts über diesen Tab aktiv nach einem Sitter für sich selbst suchen sollen (analog zum Einstieg über den Hero-Bereich auf "Start").

**Klärung:** Der Tab soll für Host **einheitlich "Suche" heißen** und Hosts erlauben, aktiv nach Sittern zu suchen (wie beim Sitter, nur umgekehrte Rolle) — nicht die Buchungsübersicht anzeigen (siehe [Punkt 12](#12-buchungen-ohne-zurück-button-und-falsch-im-tab-suche-eingeordnet) dazu, wo Buchungen stattdessen hin sollen).

**Gewünschte Änderung:**
- In [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx) Titel/Icon des zweiten Tabs für Host auf "Suche" (Lupe-Icon) ändern, wie beim Sitter.
- [app/(tabs)/search/index.tsx](app/(tabs)/search/index.tsx) muss für Host-Rolle eine echte Sitter-Suche zeigen (gleiche Suchfunktion wie über den Hero-Einstieg auf "Start"), statt der aktuell dort verbauten Buchungsliste.

**Betroffene Stellen (zu prüfen):**
- [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx) — Tab-Titel/Icon je nach Rolle (Zeile 62-71)
- [app/(tabs)/search/index.tsx](app/(tabs)/search/index.tsx) — aktuell rollenabhängig Buchungen (Host) vs. Suche (Sitter), muss für Host auf echte Suche umgestellt werden
- [app/(tabs)/home/index.tsx](app/(tabs)/home/index.tsx) — Hero-Einstieg für Host in die Sitter-Suche, als Referenz für die gewünschte Suchfunktion

---

## 10. Sitter-Inserat erstellbar ohne vollständiges öffentliches Profil

**Aktueller Zustand:** Um ein Sitter-Inserat zu erstellen, reicht es aktuell scheinbar, das Sitter-spezifische Profil ([app/(tabs)/konto/profile/sitter.tsx](app/(tabs)/konto/profile/sitter.tsx)) auszufüllen — die allgemeinen Daten des öffentlichen Profils (Name, Alter, Beruf, Bio, Ort, Fotos etc. in [app/(tabs)/konto/profile/edit.tsx](app/(tabs)/konto/profile/edit.tsx), Tabelle `profiles`) müssen dafür nicht ausgefüllt sein.

**Code-Befund:** [components/auth/RequireRoleProfile.tsx](components/auth/RequireRoleProfile.tsx) prüft nur, ob ein Eintrag in `sitter_profiles`/`host_profiles` existiert ([lib/api/profiles.ts:115](lib/api/profiles.ts#L115) `getHostProfile`, analog `getSitterProfile`) — die allgemeinen `profiles`-Felder werden dabei nicht geprüft.

**Gewünschte Änderung:** Vor dem Erstellen eines Inserats (Sitter **und** Host) soll zusätzlich geprüft werden, ob das allgemeine öffentliche Profil vollständig ausgefüllt ist (Name, Alter, Ort, Bio, mind. ein Foto o. ä. — genaue Pflichtfelder bitte festlegen). Fehlt etwas, soll zunächst zum allgemeinen Profil-Screen geleitet werden, bevor man zum rollenspezifischen Profil und dann zur Inserat-Erstellung kommt.

**Betroffene Stellen (zu prüfen):**
- [components/auth/RequireRoleProfile.tsx](components/auth/RequireRoleProfile.tsx) — Prüfung um Vollständigkeits-Check der allgemeinen `profiles`-Daten erweitern
- [lib/api/profiles.ts](lib/api/profiles.ts) — `getProfile`, ggf. Helper `isProfileComplete(profile)` ergänzen
- [app/(tabs)/konto/profile/edit.tsx](app/(tabs)/konto/profile/edit.tsx) — Zielseite für den Vervollständigen-Prompt

**Entscheidung:** Zwingend erforderlich sind: **Alter (siehe [Punkt 13](#13-alter-durch-geburtsjahr-ersetzen)), Profilbild, Stadt, Land, mindestens 150 Zeichen "Über dich"**.

---

## 11. Tab-Navigation springt nicht auf die Übersicht/Root zurück

**Aktueller Zustand:** War man z. B. im Konto-Bereich auf "Abo", wechselt dann über die Tab-Bar auf "Start" und danach wieder auf "Konto", landet man erneut auf "Abo" statt auf der Konto-Übersicht.

**Gewünschte Änderung:** Ein Tap auf einen Tab in der Bottom-Nav (Start, Suche, Chat, Konto) soll **immer** zur Übersichtsseite/Root dieses Bereichs führen, unabhängig davon, welcher Unterpunkt zuletzt dort offen war — nicht zur zuletzt besuchten Unterseite.

**Betroffene Stellen (zu prüfen):**
- [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx) — Tab-Navigator, `listeners`/`tabPress` ergänzen, um den jeweiligen Stack beim Tab-Wechsel auf die Root zurückzusetzen (z. B. `navigation.popToTop()` bzw. `navigation.reset(...)`)
- [app/(tabs)/konto/_layout.tsx](app/(tabs)/konto/_layout.tsx) — Konto-Stack, konkretes Beispiel aus der Meldung
- [app/(tabs)/search/_layout.tsx](app/(tabs)/search/_layout.tsx) — betrifft vermutlich auch den Suche/Buchungen-Stack

---

## 12. Buchungen ohne Zurück-Button und falsch im Tab "Suche" eingeordnet

**Aktueller Zustand:** Die Buchungen-Übersicht ([app/(tabs)/search/bookings/index.tsx](app/(tabs)/search/bookings/index.tsx)) und die Buchungsdetails ([app/(tabs)/search/bookings/[id].tsx](app/(tabs)/search/bookings/[id].tsx)) haben sowohl bei Sitter als auch bei Host keinen Zurück-Button. Zusätzlich liegt "Buchungen" aktuell im Tab "Suche" — das ist verwirrend, es sollte stattdessen unter "Start" erreichbar sein.

**Code-Befund:** [app/(tabs)/search/_layout.tsx](app/(tabs)/search/_layout.tsx) setzt für den gesamten Such-Stack `headerShown: false` — dadurch gibt es dort nirgends automatisch einen nativen Zurück-Pfeil, jeder Screen müsste ihn manuell einbauen. Bei Buchungen fehlt das bisher.

**Gewünschte Änderung:**
- Buchungen (Übersicht + Detail) aus dem Tab "Suche" heraus- und unter "Start" verschieben (passt auch zu [Punkt 9](#9-bottom-nav-für-host-zeigt-buchungen-statt-suche), wo "Suche" für Host zur echten Sitter-Suche werden soll).
- Auf beiden Buchungs-Screens einen manuellen Zurück-Button ergänzen (wie auf anderen Screens im selben Stack, z. B. [app/(tabs)/konto/profile/host.tsx:69-71](app/(tabs)/konto/profile/host.tsx#L69-L71) als Vorbild).

**Betroffene Stellen (zu prüfen):**
- [app/(tabs)/search/bookings/index.tsx](app/(tabs)/search/bookings/index.tsx) → verschieben nach z. B. `app/(tabs)/home/bookings/index.tsx`
- [app/(tabs)/search/bookings/[id].tsx](app/(tabs)/search/bookings/[id].tsx) → verschieben nach z. B. `app/(tabs)/home/bookings/[id].tsx`
- alle Stellen, die auf `/(tabs)/search/bookings/...` verlinken (u. a. [app/(tabs)/home/index.tsx](app/(tabs)/home/index.tsx), [app/(tabs)/search/index.tsx](app/(tabs)/search/index.tsx)) — Pfade anpassen

---

## 13. Alter durch Geburtsjahr ersetzen

**Aktueller Zustand:** Im öffentlichen Profil wird "Alter" als fest eingetragene Zahl gepflegt ([app/(tabs)/konto/profile/edit.tsx:26](app/(tabs)/konto/profile/edit.tsx#L26) `age`-State, Feld in Zeile 147). Das Alter veraltet dadurch mit der Zeit und muss manuell angepasst werden.

**Gewünschte Änderung:** Statt "Alter" soll das **Geburtsjahr** erfasst werden; das angezeigte Alter wird daraus laufend berechnet (aktuelles Jahr − Geburtsjahr), sodass es sich automatisch aktualisiert.

**Betroffene Stellen (zu prüfen):**
- [app/(tabs)/konto/profile/edit.tsx](app/(tabs)/konto/profile/edit.tsx) — Feld `age` → `birth_year` (Zeile 26, 147), Eingabe als Jahr statt Alter
- [lib/api/profiles.ts](lib/api/profiles.ts) — Profil-Typ/-Funktionen von `age` auf `birth_year` umstellen, Alters-Berechnung als Helper (z. B. `getAgeFromBirthYear`)
- [supabase/schema.sql](supabase/schema.sql) — Spalte `age` → `birth_year` (Migration nötig, bestehende Werte umrechnen)
- alle Stellen, die `profile.age`/`user.age` direkt anzeigen (z. B. Profil-Detailseite [app/profile/[id].tsx](app/profile/[id].tsx), Sitter/Host-Karten) — auf berechnetes Alter umstellen
- [Punkt 10](#10-sitter-inserat-erstellbar-ohne-vollständiges-öffentliches-profil) — Pflichtfeld-Check muss auf `birth_year` statt `age` prüfen

---

## 14. Hilfe & Support: keine Kontakt-E-Mail hinterlegt

**Aktueller Zustand:** In [app/(tabs)/konto/support/help-support.tsx](app/(tabs)/konto/support/help-support.tsx) gibt es nur eine Telefonnummer für die Tierarzt-Hotline (Zeile 34-45), aber keine Möglichkeit, uns per E-Mail zu kontaktieren.

**Gewünschte Änderung:** Einen Kontakt-Baustein mit einer (vorläufigen Demo-)E-Mail-Adresse **support@pawstay.de** ergänzen, z. B. als weiterer Card-Eintrag analog zum Tierarzt-Hotline-Block, der `Linking.openURL('mailto:support@pawstay.de')` öffnet.

**Betroffene Stellen (zu prüfen):**
- [app/(tabs)/konto/support/help-support.tsx](app/(tabs)/konto/support/help-support.tsx) — neuer Kontakt-Block nach Zeile 45
- [lib/i18n/locales/de.ts](lib/i18n/locales/de.ts), [en.ts](lib/i18n/locales/en.ts), [fr.ts](lib/i18n/locales/fr.ts) — neue Texte/Label für den E-Mail-Kontakt (analog `helpSupport.*`-Keys)

---

## 15. Doppeltes Ortsfeld im öffentlichen Profil ("Woher du kommst" + "Stadt")

**Aktueller Zustand:** Im öffentlichen Profil gibt es sowohl "Woher du kommst" (`origin`) als auch "Stadt" (`city`) als getrennte Felder ([app/(tabs)/konto/profile/edit.tsx:149-150](app/(tabs)/konto/profile/edit.tsx#L149-L150)) — das ist redundant.

**Gewünschte Änderung:** Beide Felder zu einem einzigen Feld **"Wohnort"** zusammenführen (ersetzt `origin` und `city`). In Kombination mit "Land" ergibt das weiterhin Stadt + Land, aber ohne doppelte Abfrage.

**Betroffene Stellen (zu prüfen):**
- [app/(tabs)/konto/profile/edit.tsx](app/(tabs)/konto/profile/edit.tsx) — `origin`-State und -Feld entfernen (Zeile 28, 149), `city` in "Wohnort" umbenennen (Zeile 30, 150)
- [lib/api/profiles.ts](lib/api/profiles.ts) — `origin` aus dem Profil-Typ/-Funktionen entfernen
- [supabase/schema.sql](supabase/schema.sql) — Spalte `origin` entfernen (Migration, ggf. vorhandene Werte nach `city` übernehmen, falls `city` dort leer war)
- alle Anzeige-Stellen, die `origin` nutzen (z. B. [app/profile/[id].tsx](app/profile/[id].tsx)) — auf `city`/"Wohnort" umstellen
- [lib/i18n/locales/de.ts](lib/i18n/locales/de.ts) u. a. — `profileEdit.origin`-Key entfernen, `profileEdit.city` zu "Wohnort" umbenennen

---

*(weitere Punkte folgen)*
