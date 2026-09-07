# Fixes noch offen

> Umsetzungsstand vom 07.09.2026 und manuelle Tests: [noah_fixes_pruefliste.md](noah_fixes_pruefliste.md). Die ursprünglichen Beschreibungen bleiben unten als Referenz erhalten. Datenbankmigration und externe Mail-/Push-Einrichtung sind dort gesondert gekennzeichnet.

Sammlung der gemeldeten Punkte, in einer sinnvollen Bearbeitungsreihenfolge mit konkreten Umsetzungshinweisen. Reihenfolge orientiert sich an: (1) schnelle, unabhängige UI-Fixes, (2) Auth/Registrierung, (3) Inserate, (4) Chat/Benachrichtigungen (hängen zusammen, daher als Block), (5) Konto/Sichtbarkeit, (6) Sicherheits-/Moderationsflows, (7) Infrastruktur (E-Mail, Push).

---

## 1. Suche: Filter nach Zeitraum

**Ist-Zustand:** [app/(tabs)/search/index.tsx](app/(tabs)/search/index.tsx) hat bereits Filter-Chips für Stichwort und "mit/ohne Haustiere" (Zeile 159-171), aber keinen Zeitraum-Filter. `Listing` hat bereits `available_from`/`available_to` (wird in der Card angezeigt, Zeile 41-46), das Feld ist also da — es fehlt nur der Filter selbst.

**Umsetzung:**
- In `useSearchStore`/`filters` zwei neue Felder ergänzen (`dateFrom`, `dateTo`).
- Einen weiteren Filter-Chip/Button ergänzen, der einen Datumsbereich-Picker öffnet (gleiche Kalender-Komponente wie bei der Inserat-Erstellung, siehe Punkt 3 in [offene-punkte-anpassungen.md](offene-punkte-anpassungen.md)).
- In der Such-Query (`lib/hooks/useSearch.ts` bzw. der zugrunde liegenden Supabase-Query in `lib/api/listings.ts`/`lib/api/sitterListings.ts`) einen Überlappungs-Filter ergänzen: Inserat passt, wenn sich `[available_from, available_to]` mit `[dateFrom, dateTo]` überschneidet.

**Betroffene Stellen:** [app/(tabs)/search/index.tsx](app/(tabs)/search/index.tsx), `stores/searchStore.ts`, `lib/hooks/useSearch.ts`, [lib/api/listings.ts](lib/api/listings.ts)

---

## 2. Passwort in Klartext anzeigen können (Login + Registrierung)

**Umsetzung:** Auge-Icon (`MaterialIcons name="visibility"/"visibility-off"`) im Passwortfeld ergänzen, das zwischen `secureTextEntry={true/false}` umschaltet. Einmal als wiederverwendbare Komponente/Prop in der gemeinsamen `Input`-Komponente ergänzen (z. B. `Input` um Prop `isPassword` erweitern, die intern das Icon + Toggle-State rendert), statt es dreimal separat zu bauen.

**Betroffene Stellen:** `components/ui/Input.tsx` (bzw. wo auch immer das gemeinsame Input-Feld liegt), [app/(auth)/login.tsx](app/(auth)/login.tsx), [app/(auth)/register.tsx](app/(auth)/register.tsx), [app/(tabs)/konto/account/change-password.tsx](app/(tabs)/konto/account/change-password.tsx)

---

## 3. Registrierung: Passwort-Wiederholung mit Übereinstimmungsprüfung

**Umsetzung:** Zweites Feld "Passwort wiederholen" auf dem Registrierungs-Screen ergänzen. Vor dem Absenden prüfen, ob beide Felder identisch sind; wenn nicht, Fehlermeldung anzeigen (Inline unter dem Feld, analog zu anderen Validierungsfehlern auf dem Screen) und Submit blockieren. Gleich mit Punkt 2 kombinieren (beide Passwortfelder bekommen das Auge-Icon).

**Betroffene Stellen:** [app/(auth)/register.tsx](app/(auth)/register.tsx)

---

## 4. Inserat: keine Straße/Hausnummer abfragen

**Ist-Zustand:** [app/(tabs)/search/listings/create.tsx](app/(tabs)/search/listings/create.tsx) hat ein separates `address`-Feld (Zeile 50, 122, Input in Zeile 189) zusätzlich zu `city` (Zeile 51).

**Umsetzung:**
- `address`-State, das zugehörige `Input`-Feld (Zeile 189) und die Verwendung beim Speichern (Zeile 122) entfernen. Nur `city` (und `country`, falls vorhanden) bleiben als sichtbare Orts-Angabe.
- Datenbankspalte `address` in `listings` (siehe [supabase/schema.sql](supabase/schema.sql)) per Migration entfernen oder zumindest nicht mehr befüllen/anzeigen — prüfen, ob sie noch an anderer Stelle gelesen wird (z. B. Kartenansicht), bevor sie komplett entfernt wird.
- Gleiche Prüfung für das Sitter-Inserat ([app/(tabs)/search/sitter-listings/create.tsx](app/(tabs)/search/sitter-listings/create.tsx)) durchführen, falls dort ebenfalls ein Adressfeld existiert.
- Genaue Adresse soll wie gewünscht nur noch im Chat zwischen den Nutzer:innen geklärt werden, nicht öffentlich im Inserat stehen.

**Betroffene Stellen:** [app/(tabs)/search/listings/create.tsx](app/(tabs)/search/listings/create.tsx), [app/(tabs)/search/sitter-listings/create.tsx](app/(tabs)/search/sitter-listings/create.tsx), [supabase/schema.sql](supabase/schema.sql), [app/(tabs)/search/listings/[id].tsx](app/(tabs)/search/listings/[id].tsx) (Anzeige)

---

## 5. Host-Inserat: "Sitter muss auf Haustiere aufpassen" ohne Pflichtangaben zu den Tieren

**Ist-Zustand:** [app/(tabs)/search/listings/create.tsx](app/(tabs)/search/listings/create.tsx) hat einen `hasPets`-Toggle (Zeile 55, 211-233), der nur ein Boolean speichert (`has_pets`, Zeile 127). Es gibt keine Detailfelder zu den Tieren.

**Umsetzung:** Wenn `hasPets === true`, zusätzliche Felder einblenden (analog zum bestehenden UI-Pattern mit auf-/zuklappenden Abschnitten im selben Formular), z. B.:
- Tierart(en) (Mehrfachauswahl, kann sich an den bestehenden Tags aus dem Sitter-Profil orientieren, siehe `ANIMAL_LABEL_KEYS` in [app/profile/[id].tsx:22-25](app/profile/[id].tsx#L22-L25))
- Anzahl der Tiere
- Freitext für Besonderheiten (Medikamente, Verhalten, etc.)

Diese Felder als Pflichtfelder behandeln, sobald der Toggle aktiv ist (Validierung vor `handleSave`).

**Betroffene Stellen:** [app/(tabs)/search/listings/create.tsx](app/(tabs)/search/listings/create.tsx), [lib/api/listings.ts](lib/api/listings.ts), `types/listing.ts`, [supabase/schema.sql](supabase/schema.sql) (neue Spalten), [app/(tabs)/search/listings/[id].tsx](app/(tabs)/search/listings/[id].tsx) (Anzeige der Tierdetails)

---

## 6. Inserat: kein Swipe durch hochgeladene Fotos

**Ist-Zustand:** [app/(tabs)/search/listings/[id].tsx:95-96](app/(tabs)/search/listings/[id].tsx#L95-L96) zeigt fest nur `listing.photos[0]` als einzelnes `Image` an.

**Umsetzung:** Statt eines einzelnen `Image` eine horizontale, paginierte `FlatList`/`ScrollView` mit `pagingEnabled` über `listing.photos` einbauen, plus Punkte-Indikator (Dots) unten, analog zu gängigen Galerie-Patterns. Gleiche Prüfung für die Sitter-Inserat-Detailseite durchführen, falls dort das gleiche Problem besteht.

**Betroffene Stellen:** [app/(tabs)/search/listings/[id].tsx](app/(tabs)/search/listings/[id].tsx), vermutlich analog `app/(tabs)/search/sitter-listings/[id].tsx`

---

## 7. Bewertungsmöglichkeit erst nach Buchungsabschluss

**Ist-Zustand:** Das ist bereits korrekt umgesetzt. In [app/(tabs)/home/bookings/[id].tsx](app/(tabs)/home/bookings/[id].tsx) wird der "Bewerten"-Button nur angezeigt, wenn `status === 'completed'` (Zeile 68, 290), und `createReview` (in [lib/api/reviews.ts](lib/api/reviews.ts)) wird nur über diesen Weg aufgerufen.

**Zu prüfen:** Ob serverseitig (RLS-Policy auf der `reviews`-Tabelle in [supabase/schema.sql](supabase/schema.sql)) ebenfalls sichergestellt ist, dass eine Bewertung nur zu einer `completed`-Buchung eingefügt werden kann — aktuell verlässt sich der Schutz nur auf die Client-UI. Empfehlung: RLS-`WITH CHECK`-Klausel ergänzen, die per Subquery prüft, dass die referenzierte Buchung `status = 'completed'` hat.

---

## 8. Chat-Übersicht: Vorschau der letzten Nachricht statt "Tippen um Unterhaltung zu öffnen"

**Ist-Zustand:** [app/(tabs)/chat/index.tsx:77-79](app/(tabs)/chat/index.tsx#L77-L79) zeigt immer den statischen Text `t('chat.tapToOpen')` an. `getConversations` in [lib/api/chat.ts:4-12](lib/api/chat.ts#L4-L12) lädt aktuell keine Nachrichten mit.

**Umsetzung:**
- `getConversations` erweitern, um pro Conversation die letzte Nachricht mitzuladen (z. B. zusätzlicher Join/Subquery auf `messages`, sortiert nach `created_at desc`, `limit 1` — am saubersten über eine Postgres-View oder eine RPC-Funktion, die pro Conversation `last_message`, `last_message_at` und `unread_count` zurückgibt, siehe auch Punkt 10).
- In der Chat-Liste `last_message.content` (gekürzt, `numberOfLines={1}`) statt `chat.tapToOpen` anzeigen; Fallback-Text nur, wenn wirklich noch keine Nachricht existiert.

**Betroffene Stellen:** [lib/api/chat.ts](lib/api/chat.ts), [app/(tabs)/chat/index.tsx](app/(tabs)/chat/index.tsx)

---

## 9. Ungelesene Nachrichten: roter Punkt am Chat-Tab + anklickbare Benachrichtigung navigiert zum Chat

Diese beiden Punkte gehören zusammen, da beide auf demselben "ungelesen"-Zustand aufbauen.

**Ist-Zustand:** `messages.read` existiert bereits (siehe `markMessagesRead` in [lib/api/chat.ts:86-93](lib/api/chat.ts#L86-L93)). [lib/hooks/useNotifications.ts](lib/hooks/useNotifications.ts) und [components/home/NotificationBell.tsx](components/home/NotificationBell.tsx) verwalten bereits eine Glocke mit Badge für In-App-Benachrichtigungen (siehe Screenshot: roter Badge "1" an der Glocke) — das gleiche Pattern lässt sich für den Tab übernehmen.

**Umsetzung:**
1. Einen Hook/State (z. B. `useUnreadChatCount`) ergänzen, der die Anzahl ungelesener Nachrichten für den aktuellen User lädt (`messages` wo `read = false` und `sender_id != user.id`, verknüpft über `conversations`, in denen der User Teilnehmer ist) und per Supabase-Realtime-Subscription aktuell hält (analog zu `useRealTimeChat`/`useNotifications`).
2. In [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx) am Chat-Tab-Icon einen kleinen roten Punkt (`View`, absolut positioniert auf dem Tab-Icon) einblenden, wenn `unreadCount > 0`.
3. Beim Tippen auf eine Benachrichtigung zu einem neuen Chat: In [components/home/NotificationBell.tsx](components/home/NotificationBell.tsx) (bzw. der Notifications-Liste in [app/(tabs)/home/notifications.tsx](app/(tabs)/home/notifications.tsx)) beim `onPress` einer Chat-Benachrichtigung anhand der in der Notification gespeicherten `conversation_id` zu `/(tabs)/chat/${conversationId}` navigieren, statt nur die Notification als gelesen zu markieren. Dazu muss die Notification beim Erzeugen (serverseitig oder client-seitig beim Senden der ersten Nachricht) die `conversation_id` mitspeichern, falls das noch nicht der Fall ist — kurz prüfen, welche Spalten die `notifications`-Tabelle aktuell hat.

**Betroffene Stellen:** [lib/hooks/useNotifications.ts](lib/hooks/useNotifications.ts), [components/home/NotificationBell.tsx](components/home/NotificationBell.tsx), [app/(tabs)/home/notifications.tsx](app/(tabs)/home/notifications.tsx), [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx), [lib/api/chat.ts](lib/api/chat.ts), [supabase/schema.sql](supabase/schema.sql) (`notifications`-Tabelle)

---

## 10. Chat: Zugehöriges Inserat anzeigen (Übersicht + Konversation) + komischer Abstand oben im Chat

Diese beiden Punkte gehören zusammen, weil der überflüssige Platz oben im Chat-Screen genau für die Inserats-Referenz genutzt werden soll.

**Ist-Zustand:** `conversations` hat bereits `listing_id`/`sitter_listing_id` (siehe `getOrCreateConversation` in [lib/api/chat.ts:41-64](lib/api/chat.ts#L41-L64)), und `getConversation` lädt bereits `listing:listings(owner_id)` und `sitter_listing:sitter_listings(sitter_id)` mit (Zeile 21-22) — aber nur `owner_id`/`sitter_id`, nicht Titel/Foto des Inserats. Der Conversation-Header in [app/(tabs)/chat/[conversationId].tsx:75-92](app/(tabs)/chat/[conversationId].tsx#L75-L92) zeigt nur Avatar + Name des anderen Users, keine Inserat-Info.

**Umsetzung:**
1. In `getConversation` und `getConversations` das Select um `title`/erstes Foto des Listings bzw. Sitter-Listings erweitern (z. B. `listing:listings(id, title, owner_id, photos)`).
2. Im Conversation-Header (aktuell Zeile 75-92) eine zweite, kleinere Zeile unter dem Namen ergänzen mit dem Inserats-Titel (antippbar, navigiert zu `/(tabs)/search/listings/${id}` bzw. der Sitter-Listing-Detailseite). Das füllt exakt den Bereich, der aktuell als unmotivierter Leerraum auffällt — vorher aber kurz mit einem Screenshot/Log prüfen, ob der Abstand tatsächlich aus dem Header-Layout kommt oder aus [app/(tabs)/chat/_layout.tsx](app/(tabs)/chat/_layout.tsx) (z. B. doppelter Header: Tab-Header "Chat" + eigener Screen-Header stapeln sich).
3. In der Chat-Übersicht ([app/(tabs)/chat/index.tsx](app/(tabs)/chat/index.tsx)) unter dem Namen zusätzlich den Inserat-Titel als kleine graue Zeile ergänzen (zwischen Name und Nachrichtenvorschau aus Punkt 8, oder in einer Zeile kombiniert).

**Betroffene Stellen:** [lib/api/chat.ts](lib/api/chat.ts), [app/(tabs)/chat/[conversationId].tsx](app/(tabs)/chat/[conversationId].tsx), [app/(tabs)/chat/_layout.tsx](app/(tabs)/chat/_layout.tsx), [app/(tabs)/chat/index.tsx](app/(tabs)/chat/index.tsx)

---

## 11. Chats können nicht gelöscht werden

**Entscheidung:** Löschen betrifft nur die eigene Ansicht — die andere Person soll den Chat weiterhin sehen. Damit reicht keine `DELETE`-Zeile auf `conversations` (würde den Chat für beide entfernen), sondern eine pro-User-Markierung.

**Umsetzung:**
- In [supabase/schema.sql](supabase/schema.sql) auf `conversations` zwei nullable Spalten ergänzen, z. B. `hidden_for_participant1_at timestamptz` und `hidden_for_participant2_at timestamptz` (oder alternativ eine separate Tabelle `conversation_hidden (conversation_id, user_id)`).
- In [lib/api/chat.ts](lib/api/chat.ts) eine Funktion `hideConversationForUser(conversationId, userId)` ergänzen, die je nachdem ob `userId` `participant1` oder `participant2` ist, das passende Feld setzt.
- `getConversations` so anpassen, dass Conversations mit gesetztem `hidden_for_<eigene Rolle>_at` fürs Query nicht mehr zurückgegeben werden.
- Trifft eine neue Nachricht auf eine für den Empfänger versteckte Conversation ein, das entsprechende `hidden_for_..._at`-Feld wieder zurücksetzen (`sendMessage` in [lib/api/chat.ts](lib/api/chat.ts) erweitern), damit der Chat für die andere Person automatisch wieder auftaucht.
- In [app/(tabs)/chat/index.tsx](app/(tabs)/chat/index.tsx) eine Lösch-Aktion ergänzen, z. B. Swipe-to-delete auf dem Listeneintrag oder ein Kontextmenü (langes Drücken → Bestätigungsdialog `Alert.alert`), das `hideConversationForUser` aufruft.
- Optional zusätzlich im "…"-Menü im Chat selbst ([app/(tabs)/chat/[conversationId].tsx:89-91](app/(tabs)/chat/[conversationId].tsx#L89-L91), aktuell nur "Hilfe"-Sheet) einen Punkt "Chat löschen" ergänzen.

**Betroffene Stellen:** [lib/api/chat.ts](lib/api/chat.ts), [app/(tabs)/chat/index.tsx](app/(tabs)/chat/index.tsx), [app/(tabs)/chat/[conversationId].tsx](app/(tabs)/chat/[conversationId].tsx), [supabase/schema.sql](supabase/schema.sql)

---

## 12. Konto-Übersicht: Mitgliedschaftsstatus aktualisiert sich nicht

**Ist-Zustand:** Das ist derselbe Bug wie in [offene-punkte-anpassungen.md, Punkt 8](offene-punkte-anpassungen.md#8-chat-lässt-sich-mit-pro-profil-nicht-starten) bereits diagnostiziert: [app/(tabs)/konto/index.tsx:186](app/(tabs)/konto/index.tsx#L186) liest `user?.membership_tier` aus dem im Auth-Store **gecachten** User-Objekt, das nach einem Abo-Abschluss nicht neu geladen wird.

**Hinweis zur Feld-Benennung:** In [app/(tabs)/konto/index.tsx:186](app/(tabs)/konto/index.tsx#L186) wird `membership_tier === 'standard'` geprüft, um **"Pro"** anzuzeigen (`t('konto.standardMember')`) — das ist verwirrend benannt (klingt so, als wäre `'standard'` die kostenlose Stufe). Kurz mit [lib/hooks/useMembership.ts](lib/hooks/useMembership.ts) und `types/user.ts` (`MembershipTier`) abgleichen, welche Werte `membership_tier` tatsächlich annehmen kann, damit hier nicht am eigentlichen Datenmodell vorbei "richtig aussehende, aber falsche" Werte geprüft werden.

**Umsetzung:** Ein-für-alle-Mal-Fix (behebt automatisch auch Punkt 8 aus der anderen Doku): Nach erfolgreichem Kauf/Upgrade in [app/(tabs)/konto/subscription/payment.tsx](app/(tabs)/konto/subscription/payment.tsx) den Auth-Store-User serverseitig neu laden (`supabase.auth.getUser()` bzw. Profil neu fetchen und in `stores/authStore.ts` setzen), bevor zur App zurückgekehrt wird. Zusätzlich empfiehlt sich ein Realtime-Listener oder zumindest ein Refetch bei App-Fokus (`useFocusEffect` auf dem Konto-Tab), damit der Stand auch nach externen Änderungen (z. B. Ablauf der Mitgliedschaft) aktuell bleibt.

**Betroffene Stellen:** [app/(tabs)/konto/index.tsx](app/(tabs)/konto/index.tsx), [lib/hooks/useMembership.ts](lib/hooks/useMembership.ts), `stores/authStore.ts`, [app/(tabs)/konto/subscription/payment.tsx](app/(tabs)/konto/subscription/payment.tsx)

---

## 13. Pro-Status anderer User nicht öffentlich sichtbar

**Ist-Zustand:** [app/profile/[id].tsx:155](app/profile/[id].tsx#L155) zeigt auf dem öffentlichen Profil einen "Pro"-Badge basierend auf `profile.membership_tier === 'standard'` an.

**Umsetzung:** Diese Zeile entfernen (die Pro-Badge-Anzeige nur auf der eigenen Konto-Übersicht/Konto-Bereich belassen, dort wo sie in Punkt 12 sowieso schon existiert). Kurz prüfen, ob `getProfile`/die zugehörige Supabase-Query für andere User `membership_tier` überhaupt an den Client übertragen soll — falls es sonst nirgends öffentlich gebraucht wird, kann es auch direkt aus dem für andere sichtbaren Select rausgenommen werden (RLS/Spaltenauswahl), statt es nur im UI zu verstecken.

**Betroffene Stellen:** [app/profile/[id].tsx](app/profile/[id].tsx), [lib/api/profiles.ts](lib/api/profiles.ts) (`getProfile`)

---

## 14. Passwort-vergessen-Flow

**Entscheidung:** Kein Deep Link zurück in die App — der Reset läuft über eine einfache Web-Fallback-Seite. Das spart das Universal-Links/App-Links-Setup für iOS/Android.

**Umsetzung:**
1. Auf [app/(auth)/login.tsx](app/(auth)/login.tsx) einen Link "Passwort vergessen?" ergänzen.
2. Neuen Screen (z. B. `app/(auth)/forgot-password.tsx`) mit E-Mail-Eingabe, der `supabase.auth.resetPasswordForEmail(email, { redirectTo: <URL der Web-Fallback-Seite> })` aufruft.
3. Eine schlichte Web-Seite (z. B. eine einzelne statische HTML/React-Seite, gehostet unter einer eigenen Route/Subdomain oder über Supabase selbst) bauen, die den Recovery-Token aus der URL liest und über `supabase.auth.updateUser({ password })` (Supabase-JS im Web) das neue Passwort setzt. Braucht kein Expo/React-Native-Code, kann komplett separat vom App-Projekt gehostet werden (z. B. Vercel/Netlify).
4. In den Supabase-Auth-Settings die Redirect-URL auf diese Web-Seite eintragen.

**Betroffene Stellen:** [app/(auth)/login.tsx](app/(auth)/login.tsx), neuer Screen `app/(auth)/forgot-password.tsx`, neue eigenständige Web-Seite (separates kleines Projekt/Deploy), Supabase Auth Settings (Redirect-URLs)

---

## 15. Melden von Usern (Report-Flow)

**Ist-Zustand:** Im Chat-"Hilfe"-Sheet gibt es bereits einen UI-Button "Nutzer melden" ([app/(tabs)/chat/[conversationId].tsx:119-125](app/(tabs)/chat/[conversationId].tsx#L119-L125)), der aktuell aber keinen `onPress`-Handler hat — der Flow ist nur als Platzhalter vorhanden.

**Umsetzung:**
1. Neue Tabelle `reports` in [supabase/schema.sql](supabase/schema.sql) anlegen: `id, reporter_id, reported_user_id, conversation_id (optional), reason, description, status ('open'/'reviewed'/'actioned'), created_at`. RLS: Nutzer:innen dürfen nur eigene Reports einfügen (`reporter_id = auth.uid()`) und keine fremden lesen.
2. `onPress` am "Nutzer melden"-Button ergänzen: kleines Formular/Modal mit Grund-Auswahl (z. B. Belästigung, Betrug, unangemessene Inhalte) + optionalem Freitext, das per `lib/api/reports.ts` (neu) einen Eintrag in `reports` erstellt.
3. Benachrichtigung an euch: entweder eine Supabase Database Webhook/Edge Function, die bei neuem `reports`-Eintrag eine E-Mail/Slack-Nachricht auslöst (hängt an Punkt 16, E-Mail-Versand), oder — als einfachste Variante fürs Semesterprojekt — ein Supabase-Dashboard-Blick auf die `reports`-Tabelle reicht zunächst aus, sofern ihr das regelmäßig manuell prüft.
4. Manuelles Blockieren nach Meldung: Admin-seitig (Supabase Dashboard/SQL) `profiles.is_blocked` (neue Spalte) setzen; App-seitig prüfen, dass ein geblockter User sich nicht mehr einloggen kann bzw. RLS ihm/ihr keine Schreibaktionen (Nachrichten, Inserate) mehr erlaubt.

**Betroffene Stellen:** [supabase/schema.sql](supabase/schema.sql), neue Datei `lib/api/reports.ts`, [app/(tabs)/chat/[conversationId].tsx](app/(tabs)/chat/[conversationId].tsx), ggf. `app/profile/[id].tsx` (auch dort "Melden" anbieten, nicht nur im Chat)

---

## 16. E-Mail-Versand einrichten (Design, Domain)

**Frage an dich:** Habt ihr schon eine Domain für PawStay registriert bzw. welche soll für den Mailversand genutzt werden? Und: reicht der von Supabase mitgelieferte Auth-Mailer (mit angepassten Templates), oder soll ein eigener Transaktions-E-Mail-Dienst (z. B. Resend, Postmark) angebunden werden für mehr Kontrolle über Design/Zustellbarkeit? Das beeinflusst direkt, wie Punkt 14 (Passwort vergessen), die E-Mail-Bestätigung bei der Registrierung und spätere Buchungs-Benachrichtigungen per Mail umgesetzt werden.

**Grobe Schritte, sobald geklärt:**
1. Domain bei einem Anbieter verifizieren (SPF/DKIM/DMARC-Records setzen), damit Mails nicht im Spam landen.
2. In Supabase Auth → Email Templates die Standard-Texte (Registrierung/Bestätigung, Passwort zurücksetzen, Magic Link) mit PawStay-Branding (Logo, Farben aus dem bestehenden Theme, siehe `lib/contexts/ThemeContext`) anpassen.
3. Falls eigener Mail-Anbieter gewünscht: SMTP-Zugangsdaten in den Supabase-Auth-Settings hinterlegen (Custom SMTP), damit auch das Zeitraffer-Rate-Limit des Supabase-Default-Mailers wegfällt.

**Betroffene Stellen:** Supabase Projekteinstellungen (Auth → Email Templates/SMTP), kein App-Code direkt betroffen außer den Redirect-URLs aus Punkt 14.

---

## 17. Push-Benachrichtigungen fertig verdrahten

**Ist-Zustand:** `expo-notifications` ist als Paket installiert, taucht aber **nicht** in den `plugins` von [app.json](app.json) auf. Es gibt In-App-Benachrichtigungen in der DB (`notifications`-Tabelle, genutzt von [lib/hooks/useNotifications.ts](lib/hooks/useNotifications.ts)), aber keine Registrierung/Speicherung eines Expo-Push-Tokens. Push kommt also aktuell gar nicht an, In-App-Benachrichtigungen nur solange die App offen/im Vordergrund ist.

**Umsetzung:**
1. `expo-notifications`-Plugin in [app.json](app.json) unter `plugins` ergänzen (inkl. ggf. nötiger Icon-/Sound-Konfiguration).
2. Neue Tabelle `push_tokens` (`user_id, token, device_id, created_at`) in [supabase/schema.sql](supabase/schema.sql).
3. Beim Login/App-Start (z. B. in `app/_layout.tsx` oder einem neuen `lib/hooks/usePushRegistration.ts`) `Notifications.requestPermissionsAsync()` + `Notifications.getExpoPushTokenAsync()` aufrufen und den Token in `push_tokens` speichern (Upsert pro Gerät).
4. Serverseitig: Eine Supabase Edge Function (oder Database Webhook/Trigger), die bei neuer Zeile in `messages` bzw. `bookings` (neue Buchungsanfrage) die Expo Push API (`https://exp.host/--/api/v2/push/send`) mit den Tokens des Empfängers aufruft.
5. Für iOS zusätzlich einen `APNs`-Schlüssel im Expo/EAS-Projekt hinterlegen (unter Expo-Dashboard → Credentials), sonst schlägt der Push für iOS-Geräte fehl.

**Betroffene Stellen:** [app.json](app.json), [supabase/schema.sql](supabase/schema.sql), `app/_layout.tsx`, neue Datei `lib/hooks/usePushRegistration.ts`, neue Supabase Edge Function (z. B. `supabase/functions/send-push/index.ts`, analog zu bestehender [supabase/functions/delete-account/index.ts](supabase/functions/delete-account/index.ts))

---

# Könnte noch wichtig sein

Diese Punkte sind aktuell nicht akut blockierend für das Semesterprojekt, aber relevant, sobald die App produktiv/im Store laufen oder echtes Geld fließen soll. Nur zur Info, keine Bearbeitungsreihenfolge vorgegeben.

- **Zahlungsabwicklung** – [app/(tabs)/konto/subscription/payment.tsx](app/(tabs)/konto/subscription/payment.tsx) ist aktuell nur ein Stub (`demoNotice`), keine Stripe/RevenueCat/IAP-Anbindung, keine Payment-Tabellen (`lib/revenuecat.ts` existiert zwar, aber prüfen wie weit das angebunden ist). Ohne echten Zahlungsfluss (Buchung bezahlen, Sitter-Auszahlung, Provision) ist der Marktplatz nicht monetarisierbar.
- **Crash-/Error-Monitoring** – kein Sentry/Bugsnag/Crashlytics o. Ä. Ohne das fliegt ihr bei Produktionsfehlern komplett blind.
- **Altersgrenze/Consent** – `birth_year` existiert im Profil, aber keine harte Altersprüfung oder Einwilligungs-Checkbox (AGB/Datenschutz-Zustimmung beim Signup). Rechtlich heikel, besonders bei einer App mit Video-Pitch und Fotos.
- **CI/CD** – es gibt kein `.github/`-Setup, keine automatisierten Tests/Builds. Vor einem Store-Release solltet ihr zumindest Lint/Typecheck/Build automatisiert laufen lassen.
- **.env-Handling prüfen** – kurz verifizieren, dass `.env` nicht versehentlich eingecheckt ist bzw. keine Secrets enthält, die dort nicht hingehören.
