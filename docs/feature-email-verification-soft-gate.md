# Feature: E-Mail-Verifizierung als Soft-Gate statt Login-Blocker

## Kontext / Vorgeschichte

Ausgangspunkt war ein Bug: Registrierung schlug mit "Database error saving new user"
fehl. Ursache war `42P01 relation "profiles" does not exist` innerhalb des
`handle_new_user()`-Triggers auf `auth.users` — `SECURITY DEFINER` ändert nur die
Rechte, nicht den `search_path`; der Trigger läuft unter der internen Rolle
`supabase_auth_admin`, deren `search_path` kein `public` enthält. **Fix bereits
umgesetzt:** `handle_new_user()` in [supabase/schema.sql](../supabase/schema.sql)
und [supabase/migrations/20260907131454_ensure_handle_new_user_trigger.sql](../supabase/migrations/20260907131454_ensure_handle_new_user_trigger.sql)
referenziert jetzt `public.profiles` und hat `SET search_path = public`. Das
Live-Projekt wurde bereits per SQL Editor entsprechend gepatcht.

Danach ging es um E-Mail-Bestätigung bei der Registrierung. Ursprünglicher Ansatz
(bereits teilweise umgesetzt): **Login blockiert**, bis die Mail bestätigt ist —
`supabase.auth.signUp()` liefert erst nach Klick auf den Bestätigungslink eine
Session. Dafür wurde bereits gebaut:

- `flowType: 'pkce'` in [lib/supabase.ts](../lib/supabase.ts)
- `emailRedirectTo: Linking.createURL('auth/callback')` in
  [app/(auth)/register.tsx](../app/(auth)/register.tsx)
- Neuer Screen [app/auth/callback.tsx](../app/auth/callback.tsx), der den PKCE-Code
  gegen eine Session tauscht und weiterleitet
- `expo-dev-client` installiert + [eas.json](../eas.json) mit `development`-Profil,
  weil der Redirect-Deep-Link (`pawstay://auth/callback`) nur in einem Dev-Build
  funktioniert, nicht in Expo Go (dort gibt's nur eine instabile `exp://`-URL)
- Ein EAS Cloud-Build (`npx eas-cli build --profile development --platform android`)
  wurde gestartet, um das zu testen — **Status beim Umstieg auf diesen Plan:
  "Build queued" in der Warteschlange, ggf. inzwischen abgebrochen** (siehe unten,
  wird für den neuen Ansatz nicht mehr zwingend gebraucht).

## Neue Entscheidung: Soft-Gate statt Login-Blocker

Statt den Login komplett zu blockieren, soll es so laufen:

1. Nutzer registriert sich → landet **sofort** eingeloggt im Konto-Bereich
   (keine Wartezeit auf E-Mail-Klick).
2. Im Konto/Anmeldedaten-Bereich steht unter der E-Mail-Adresse ein Hinweis wie
   **"Verifizierungslink gesendet"** (bzw. sobald bestätigt: nichts oder ein
   Bestätigt-Badge).
3. Erst beim **Erstellen eines Inserats** (trust-kritische Aktion) wird geprüft,
   ob die Mail bestätigt ist. Falls nicht: blockieren + Hinweis + Möglichkeit,
   den Link erneut zu senden.

**Vorteil:** Kein Drop-off durch "App verlassen müssen, bevor man überhaupt was
sieht". **Kosten:** Supabases eingebautes Gate (kein Session ohne Bestätigung)
kann dafür nicht mehr genutzt werden — die Prüfung muss selbst gebaut werden.

## Voraussetzung: Supabase-Einstellung prüfen

Im Supabase Dashboard → **Authentication → Sign In / Providers → Email**:
**"Confirm email" muss AUS sein**, damit `signUp()` sofort eine Session liefert
(unabhängig vom Bestätigungsstatus). Stand bei Gesprächsende: **noch nicht
geklärt, ob der Toggle aktuell an oder aus ist** — als Erstes im neuen Chat prüfen.

## Umzusetzende Schritte

1. **Supabase-Setting:** "Confirm email" deaktivieren (falls noch aktiv).
2. **`app/(auth)/register.tsx`:** Nach erfolgreichem `signUp()` nicht mehr auf
   `authData.session` warten/verzweigen — direkt navigieren (z. B. zu
   `/(auth)/onboarding` wie bisher bei vorhandener Session, oder direkt in den
   Konto-/Tabs-Bereich, je nachdem wie der Onboarding-Flow aktuell greift).
   Die `emailRedirectTo`/PKCE-Callback-Logik (`app/auth/callback.tsx`) kann
   bleiben — sie sorgt weiterhin für einen sauberen Rücksprung in die App nach
   Klick auf den Link, ist aber nicht mehr blockierend notwendig, weil die
   Bestätigung serverseitig auch ohne App-Rücksprung durchläuft.
3. **Konto-/Anmeldedaten-Screen** (vermutlich
   [app/(tabs)/konto/index.tsx](../app/(tabs)/konto/index.tsx) oder
   [app/(tabs)/konto/account/](../app/(tabs)/konto/account/)):
   - E-Mail-Bestätigungsstatus anzeigen. Quelle: `supabase.auth.getUser()` liefert
     `user.email_confirmed_at` (Timestamp oder `null`).
   - Wenn `null`: Text "Verifizierungslink gesendet" + Button "Erneut senden"
     (`supabase.auth.resend({ type: 'signup', email })`).
   - Status sollte sich aktualisieren, sobald der User die App wieder in den
     Vordergrund holt (z. B. via `AppState`-Listener + `getUser()` erneut
     abfragen, oder einfach beim Fokussieren des Konto-Tabs neu laden).
4. **Gate beim Inserat-Erstellen** (vermutlich
   [app/(tabs)/search/listings/create.tsx](../app/(tabs)/search/listings/create.tsx)
   bzw. die zugehörige API-Funktion in
   [lib/api/listings.ts](../lib/api/listings.ts)):
   - Vor dem eigentlichen Erstellen `email_confirmed_at` prüfen (frisch von
     `supabase.auth.getUser()`, nicht aus einem evtl. veralteten Store-Snapshot).
   - Falls nicht bestätigt: Screen/Modal mit Hinweis + "Link erneut senden"-Button
     statt des Formulars, oder Formular disabled + Banner oben.
5. **Prüfen:** Muss `profiles` oder ein anderer Ort den Bestätigungsstatus
   redundant vorhalten, oder reicht `auth.users.email_confirmed_at` direkt?
   Vermutlich reicht direkt — kein zusätzliches DB-Feld nötig, kein Trigger nötig.
6. **EAS Dev Build:** Nicht mehr zwingend nötig für dieses Feature (die
   Bestätigung läuft browserseitig, unabhängig vom Deep-Link-Rücksprung). Kann
   trotzdem sinnvoll sein für sauberes Testen des Rücksprungs, ist aber kein
   Blocker mehr. Vorhandene [eas.json](../eas.json)-Konfiguration bleibt nutzbar,
   falls später doch gebraucht.

## Offene Fragen für den neuen Chat

- Ist "Confirm email" aktuell an oder aus im Supabase-Projekt?
- Wohin genau soll nach Registrierung navigiert werden (Onboarding vs. direkt
  Tabs)? Aktuell registriert `register.tsx` immer nach `/(auth)/onboarding`,
  wenn eine Session da ist — das würde jetzt für alle gelten, nicht nur für den
  Fall "Confirm email aus".
- Wie soll die "Erneut senden"-UX gegen Spam/Rate-Limits abgesichert werden
  (Supabase hat eingebautes Rate-Limiting auf `resend`, Fehlermeldung dafür
  über `mapAuthErrorKey` in [lib/utils/authErrors.ts](../lib/utils/authErrors.ts)
  ergänzen, siehe `rateLimited`-Key, der bisher nur auf den Text "rate limit"
  matcht — ggf. erweitern um GoTrues "for security purposes, you can only
  request this after X seconds"-Meldung, die aktuell durchs Raster fällt und
  als "generic" angezeigt wird).
