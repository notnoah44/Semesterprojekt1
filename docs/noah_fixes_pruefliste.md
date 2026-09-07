# Umsetzung und manuelle Prüfung – 07.09.2026

Die Punkte beziehen sich auf `noah_fixes_und_co.md`. „Im Code umgesetzt“ bedeutet noch nicht auf dem Gerät oder gegen eure Live-Datenbank verifiziert.

## Vor dem Test

1. Im Supabase SQL Editor **einmal** `supabase/migrations/20260907210000_noah_fixes.sql` ausführen (nach allen bisherigen Migrationen). Alternativ mit einer bereits verknüpften Supabase CLI `supabase db push` nutzen. Nicht das gesamte `schema.sql` erneut auf eine bestehende Datenbank anwenden. Die neue Migration wurde hier nicht ausgeführt; eine PostgreSQL-Testinstanz und ein authentifizierter Supabase-Verwaltungszugang standen nicht bereit.
2. Die Migration ergänzt Chat-Ausblendungen, Reports, Kontosperren, Push-Tokens und Zugriffsregeln. Die Chat-Übersicht funktioniert inzwischen auch ohne `conversation_hidden`; nur das Ausblenden/Löschen benötigt diese Tabelle. Am 07.09. wurde lesend bestätigt, dass sie im verbundenen Projekt noch fehlt (PGRST205).
3. Expo neu laden (`r` im laufenden Terminal). Nach Änderungen an `.env` den Expo-Prozess neu starten.
4. Für Chat-, Melde- und Bewertungstests zwei Konten verwenden: Host und Sitter. Bestehende Haustier-Inserate müssen beim Bearbeiten ggf. um die neuen Pflichtangaben ergänzt werden.

## Prüfliste

| Nr. | Stand | Manuelle Prüfung / erwartetes Ergebnis |
| --- | --- | --- |
| 1 | Im Code umgesetzt | In beiden Suchansichten Zeitraum wählen. Inserat mit nur teilweiser Überschneidung sowie gleichem Grenztag wird gefunden; vollständig außerhalb liegende Zeiträume nicht. Zeitraum zurücksetzen. Gespeicherte Suche erneut öffnen. Offene Zeitgrenzen werden als unbegrenzt behandelt. |
| 2 | Im Code umgesetzt | Im Login, bei Registrierung und unter Passwort ändern auf das Auge tippen: sichtbar/verborgen, Text bleibt erhalten. |
| 3 | Im Code umgesetzt | Unterschiedliche Passwort-Wiederholung blockiert die Registrierung mit Feldfehler; gleiche Passwörter erlauben sie. Passwort ändern verlangt jetzt ebenfalls mindestens 8 Zeichen. |
| 4 | Im Code umgesetzt | Host-Inserat erstellen/bearbeiten: nur Stadt und Land, kein Straßenfeld. Öffentliche Inserat-Abfragen wählen die alte Adressspalte nicht mehr aus. Vorhandene DB-Werte wurden nicht gelöscht. Sitter-Inserate hatten bereits kein Straßenfeld. |
| 5 | Im Code + Migration | Haustier-Toggle aktivieren: jedes Tier mit Art, Name und Pflegehinweisen erfassen; „keine“ bei fehlenden Besonderheiten. Die Anzahl ergibt sich aus den Tier-Einträgen. Leere Angaben blockieren Speichern; Vorschau und Detailseite zeigen die Angaben. Ohne Haustiere werden keine Tierdetails gespeichert. |
| 6 | Im Code umgesetzt | Host-Inserat mit mindestens 3 Fotos öffnen und horizontal wischen; Punkte wechseln. Bei Sitter-Inseraten werden Titelbild und öffentliche Profilfotos als Galerie angeboten (das Sitter-Inserat hat selbst nur ein Titelbild). |
| 7 | Migration vorbereitet | „Bewerten“ bleibt ausschließlich bei abgeschlossenen Buchungen sichtbar. Ein direkter INSERT als Nutzer für eine nicht abgeschlossene/fremde Buchung oder falschen Bewertungsempfänger muss scheitern. SQL Editor mit Admin-Rechten umgeht RLS und ist dafür kein geeigneter Test. |
| 8 | Im Code umgesetzt | Nachrichten senden: Übersicht zeigt die letzte Nachricht gekürzt, neueste Unterhaltung zuerst. Leerer Chat behält den bisherigen Fallback. |
| 9 | Im Code umgesetzt | Konto A sendet an B: roter Punkt am Chat-Tab bei B. Öffnen des Chats entfernt den Ungelesen-Status; auch neu eintreffende Nachrichten im geöffneten Chat werden gelesen. Glocke/Benachrichtigung antippen öffnet den zugehörigen Chat. Gelesen bleibt nach Neustart erhalten. |
| 10 | Im Code umgesetzt | Inserattitel erscheint in Liste und Konversation, dort antippbar. Zusätzlicher oberer Safe-Area-Abstand entfernt. Zwei verschiedene Inserate derselben Person öffnen jeweils ihren passenden Chat. |
| 11 | Im Code + Migration | **Lange auf einen Chat in der Liste drücken**, Löschen bestätigen. Nur bei diesem Konto verschwindet er; andere Person behält ihn. Eine neue Nachricht lässt ihn wieder erscheinen. Nachrichten werden nicht gelöscht. |
| 12 | Im Code umgesetzt | Demo-Pro-Pass aktivieren und zurück zum Konto: korrekter Status. Ablaufdatum berücksichtigen; nach externem Profil-Update bzw. Rückkehr in die App wird aktualisiert. Der Kauf hatte den Store bereits korrekt aktualisiert; die Kontoanzeige nutzte zuvor nur den Tarifnamen. |
| 13 | Im Code umgesetzt | Öffentliches Profil eines Pro-Kontos zeigt keinen Pro-Badge. Eigener Kontobereich zeigt weiterhin den tatsächlichen Status. Dies ist keine allgemeine Spalten-Zugriffssperre für Mitgliedschaftsdaten in der bisherigen Datenbank. |
| 14 | Lokal vorbereitet, Einrichtung offen | Login hat „Passwort vergessen?“. Ohne konfigurierte HTTPS-Reset-URL wird verständlich auf die fehlende Verfügbarkeit hingewiesen. Nach Einrichtung: Mail anfordern, Link im Browser öffnen, ungleiche/zu kurze Passwörter prüfen, gültiges Passwort speichern und damit in der App anmelden. Abgelaufener Link zeigt einen Fehler. |
| 15 | Im Code + Migration | Chat → ⋮ → Nutzer melden: Grund auswählen, optional beschreiben und absenden. Eintrag in `reports` im Supabase Dashboard prüfen. Andere Nutzer dürfen diese Meldung nicht lesen oder ihren Status bearbeiten. Admin setzt `profiles.is_blocked=true`: App meldet das Konto nach Aktualisierung ab und RLS sperrt weitere Schreibaktionen. |
| 16 | Vorlagen vorbereitet, Einrichtung offen | HTML-Vorlagen in `supabase/email-templates/` vorhanden. Domain, SMTP-Anbieter und DNS/SMTP-Konfiguration sind noch offen. Es wurden keine Mails versandt und keine Supabase-Auth-Einstellungen verändert. |
| 17 | Code vorbereitet, Betrieb offen | Notifications-Plugin, Registrierung, Token-Speicherung, Navigation und Edge Function vorhanden. Development Build + FCM/APNs + Webhook nötig (siehe unten). Expo Go unter Android unterstützt keine Remote-Push-Nachrichten. |

## Passwort-Reset und E-Mail einrichten

- `node web-reset/build.cjs` erzeugt die eigenständige Seite in `web-reset/dist` mit ausschließlich öffentlicher Supabase-Konfiguration. Keine Service-Role-Schlüssel verwenden.
- Die Seite muss öffentlich über HTTPS erreichbar sein. Ein Sites-Projekt wurde zur privaten Prüfung registriert (`web-reset/.openai/hosting.json`), aber **nicht veröffentlicht**: Das hier verfügbare Git enthält keinen HTTPS-Remote-Helper (`git: 'remote-https' is not a git command`). Beim Fortsetzen das vorhandene Site-Projekt wiederverwenden. Alternativ den erzeugten statischen Ordner auf eurem vorgesehenen Webhost bereitstellen.
- Die endgültige URL als `EXPO_PUBLIC_PASSWORD_RESET_URL=https://.../` in `.env` setzen und exakt in Supabase Auth → URL Configuration → Redirect URLs erlauben. Erst danach ist der Reset-Flow vollständig testbar.
- Auth → Email Templates: `confirmation.html` für Confirm signup, `recovery.html` für Reset Password und `magic-link.html` für Magic Link übernehmen. Die Vorlagen verwenden `{{ .ConfirmationURL }}`. Der bestehende Verifizierungsflow verwendet Magic Links; diese Vorlage daher ebenfalls konfigurieren.
- SMTP-Absender/Domain beim gewählten Anbieter verifizieren und die vorgegebenen SPF/DKIM-Einträge eintragen; DMARC passend zur Domain konfigurieren. SMTP-Zugangsdaten ausschließlich in Supabase Custom SMTP hinterlegen.
- Die Recovery-Anforderung nutzt einen separaten Client ohne appgebundenen PKCE-Verifier. Die Browserseite speichert die Sitzung nur im Arbeitsspeicher und entfernt Tokens aus der Adresszeile.

## Push aktivieren

1. Neue SQL-Migration anwenden.
2. Android-FCM-v1-Zugangsdaten bzw. iOS-APNs-Key im bestehenden EAS-Projekt konfigurieren. Development Build erstellen; für Android z. B. nach vollständiger lokaler Android-Build-Einrichtung `npx.cmd expo run:android`.
3. Supabase Secret `PUSH_WEBHOOK_SECRET` mit einem langen zufälligen Wert setzen (nicht in `.env` oder App-Code). Falls Expo Push Security aktiv ist, zusätzlich `EXPO_ACCESS_TOKEN` als Edge-Function-Secret setzen.
4. `supabase functions deploy send-push --no-verify-jwt` ausführen. Die Funktion prüft stattdessen den dedizierten Webhook-Secret-Header; ohne korrektes Secret antwortet sie mit 401.
5. Supabase Database Webhook für **INSERT auf `public.notifications`** erstellen: POST an `/functions/v1/send-push`, Header `x-webhook-secret: <derselbe Wert>`. Bestehende DB-Trigger erzeugen diese Notifications für Nachrichten und Buchungen bereits. Nicht zusätzlich Webhooks auf Nachrichten/Buchungen anlegen, sonst drohen Duplikate.
6. Auf Gerät/geeignetem Emulator mit Google Play Services anmelden und Berechtigung erlauben; `push_tokens` prüfen. App in Hintergrund versetzen, von Konto B Nachricht/Buchungsanfrage senden, Push antippen.
7. Abmelden entfernt den Token bestmöglich vor dem Logout. Gerätewechsel/Kontowechsel registrieren neu; gesperrte Konten und deaktivierte Notification-Präferenzen werden beim Versand übersprungen.

Die Function verarbeitet Expo-Sendeantworten und entfernt sofort als ungültig gemeldete Tokens. Ein produktiver Retry-/Receipt-Worker sowie eine Zustellgarantie sind nicht Bestandteil dieses Semesterprojekt-Fixes; tatsächliche Zustellung und Webhook-Fehler im Dashboard prüfen.

## Bereits geprüft

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` erfolgreich.
- Android-JavaScript/Asset-Export mit Expo erfolgreich; kein nativer APK-Build und kein E2E-Test auf dem Emulator.
- `node tests/fixes.cjs`: Passwort-Validierung und Kalendertage einschließlich Zeitumstellungen in drei Zeitzonen erfolgreich.
- Reset-Seite lokal gebaut; echte Recovery-Mail/Sitzung noch nicht getestet.
- `.env` ist in `.gitignore` erfasst. Der Hauptordner hat kein `.git`, daher war keine Aussage über frühere Commits/Secret-Historie möglich.

Die zusätzlichen Hinweise zu echten Zahlungen, Monitoring, Consent und CI aus dem letzten Abschnitt der Ausgangsliste wurden nicht als neue Feature-Aufträge umgesetzt.
