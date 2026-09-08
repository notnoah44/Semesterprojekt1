# Store-Abos und Kontolöschung: Testbetrieb

Stand: 8. September 2026. Die lokale Implementierung ersetzt die frühere Demo-Freischaltung. **Kein Deployment, keine echten Käufe und keine Änderungen an Supabase-/Store-Konten wurden vorgenommen.** Standardmäßig sind Käufe deaktiviert. Die App bleibt in Expo Go nutzbar; die Kaufoberfläche erklärt dort die fehlende native Konfiguration.

## Umgesetzt

- RevenueCat-SDK, Identifizierung ausschließlich mit der Supabase-User-UUID, Angebote und lokalisierte Preise aus dem aktuellen Offering; Monats-, Quartals- und Jahrespakete. Es gibt keine lokal berechneten Preise oder Laufzeiten mehr.
- Automatisch verlängernde Abos; Kündigung und Zahlungsmethode über Apple/Google. Aktive Abos werden verwaltet statt ein zweites Abo angeboten. Tarifwechsel erfolgen zunächst in der Store-Verwaltung.
- Kaufwiederherstellung für den angemeldeten Benutzer. Kontowechsel werden vor jedem SDK-Vorgang abgeglichen; Ergebnisse für inzwischen abgemeldete Benutzer werden verworfen.
- Abbruch ohne Fehlermeldung; abgelehnter, ausstehender, fremd zugeordneter und unklarer Kauf mit unterschiedlichen Texten. Nach unklarem Kauf wird synchronisiert, keine ausgebliebene Belastung versprochen. SDK-Erfolg allein schaltet Pro nicht frei.
- `sync-membership` prüft den Aufrufer mit Supabase Auth und lädt dessen aktuellen RevenueCat-REST-Status. `revenuecat-webhook` prüft ein separates Bearer-Secret und synchronisiert aktuelle Snapshots, auch beide Seiten eines Transfers. Fehler führen zu HTTP 503 und damit Wiederholungen beim Webhook. Alte oder doppelte Ereignisse werden nicht als Zustandsänderungen nachgespielt.
- Serverseitige Synchronisierungsrevisionen schützen vor verspäteten Antworten. Nur Service-RPCs dürfen Abo-Felder schreiben. Alte, nicht verifizierte Demo-Pro-Zugänge werden bei der Migration zurückgesetzt.
- Kündigung erhält Pro bis Ablauf. Billing-Probleme berücksichtigen die vom Store bestätigte Nachfrist. Erstattungen bzw. Ablauf entziehen die Berechtigung. API-Ausfall erteilt keinen neuen Zugang und verlängert keinen bestehenden. Die App synchronisiert beim Anmelden, bei Rückkehr und einmal pro Minute im Vordergrund; die Oberfläche berücksichtigt Ablauf auch ohne neue Profildaten.
- Sofortige Kontolöschung unabhängig vom Abo. Vorher deutlicher Hinweis: **Kontolöschung kündigt das Store-Abo nicht.** Die Store-Verwaltung ist optional erreichbar und blockiert die Löschung nicht.
- Löschen aus Auth, Profil, zugehörigen Chats/Buchungen/Bewertungen und weiteren verknüpften Tabellen. Die Migration korrigiert bislang blockierende Fremdschlüssel. Das entfernt auch die gemeinsamen Chats/Buchungen beim Gegenüber, dessen Konto selbst bleibt erhalten. Avatare einschließlich Unterordnern/Videos, Inseratsfotos und Verifizierungsdateien werden seitenweise entfernt. Fehler bleiben wiederholbar. Eine Löschmarkierung verhindert neue App-Schreibvorgänge und Uploads während der Bereinigung; Anmeldung und erneuter Löschversuch bleiben möglich.
- Neue Registrierung mit derselben E-Mail ist nach erfolgreicher Löschung möglich. Sie erhält eine neue UUID und zunächst Free. Ein verbliebenes Store-Abo wird ausdrücklich über „Käufe wiederherstellen“ übernommen. RevenueCat erhält von der App weder E-Mail noch Namen. Der UUID-basierte Kaufdatensatz bleibt für Wiederherstellung und Store-Abgleich bestehen; das ist keine vollständige Löschung aller Daten bei allen Zahlungsdienstleistern.
- Alle neuen Oberflächen- und Fehlermeldungen in DE/EN/ES/FR. Irreführende Demo-, Empfehlungsbonus- und noch nicht implementierte Pro-Leistungsversprechen wurden aus der Kaufseite entfernt.

## 1. Empfohlener erster Test: RevenueCat Test Store

1. RevenueCat-Testprojekt anlegen. Entitlement **`pro`** erstellen.
2. Drei automatisch verlängernde Testprodukte erstellen, dem Entitlement zuweisen und als Standardpakete **Monthly**, **Three Month**, **Annual** in einem aktuellen Offering verknüpfen. Die Laufzeiten der Produkte müssen zu diesen Paketen passen.
3. In der lokalen `.env` setzen:

   ```dotenv
   EXPO_PUBLIC_BILLING_MODE=test_store
   EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=test_EUER_OEFFENTLICHER_TEST_KEY
   ```

4. Einen neuen Development Build erstellen/installieren, da `react-native-purchases` native Module ergänzt. Android mit eingerichtetem Android-SDK: `npx.cmd expo run:android`. Danach `npx.cmd expo start --dev-client`. Das erzeugt lokale native Projektdateien; es wurde hier nicht ausgeführt. SDK 54 des Projekts wurde nicht geändert.
5. Backend wie unten in **einer Test-Supabase-Instanz** einrichten. Der Test-Store löst keine echte Zahlung aus und beschleunigt Verlängerungen. Verwaltung, Refund- und Transferszenarien zusätzlich im RevenueCat-Dashboard testen. Native Apple-/Google-Verwaltung ist ein separater Testschritt.

## 2. Backend vorbereiten

Bestehende Datenbank: Migration `supabase/migrations/20260908010000_store_memberships.sql` nach den bisherigen Migrationen ausführen. Neue Datenbank: bisheriges `supabase/schema.sql`, danach die neue Migration. **Vorher Testdaten sichern:** Die Migration setzt Demo-Mitgliedschaften zurück, hebt alte Löschtermine auf, deaktiviert den alten Cronjob und ändert das Löschverhalten verknüpfter Datensätze. Keine Migration doppelt anwenden.

Nur als Supabase-Edge-Secrets hinterlegen, niemals als `EXPO_PUBLIC_*` oder ins Git:

```dotenv
BILLING_ENVIRONMENT=sandbox
REVENUECAT_SECRET_API_KEY=SERVERSEITIGER_REVENUECAT_V1_SECRET_KEY
REVENUECAT_WEBHOOK_SECRET=LANGES_ZUFAELLIGES_EIGENES_SECRET
REVENUECAT_PRODUCTS_JSON={"exakte_monatsprodukt_id":"monthly","exakte_quartalsprodukt_id":"quarterly","exakte_jahresprodukt_id":"yearly"}
```

Die Produkt-IDs müssen genau den Schlüsseln in RevenueCats REST-Subscriber-Daten entsprechen, einschließlich eventueller Android-Base-Plan-Suffixe. Für mehrere Plattformen alle Produkt-IDs aufnehmen. Nicht konfigurierte Produkte oder falsche Umgebungen führen zu einem Sync-Fehler statt einer Freischaltung. Supabase stellt `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` bereit.

Für die bewusst eingerichtete Testinstanz deployen:

```powershell
supabase functions deploy sync-membership --no-verify-jwt
supabase functions deploy revenuecat-webhook --no-verify-jwt
supabase functions deploy delete-account --no-verify-jwt
supabase functions deploy process-scheduled-deletions
```

`--no-verify-jwt` deaktiviert nur die vorgelagerte Gateway-Prüfung: `sync-membership` und `delete-account` prüfen selbst `auth.getUser(token)`, der Webhook prüft sein separates Secret. Der alte Lösch-Endpunkt antwortet nur noch 410. Bei eigener Deployment-Automation diese Einstellungen übernehmen.

In RevenueCat einen Webhook auf `https://EURE_TESTINSTANZ.supabase.co/functions/v1/revenuecat-webhook` einrichten, Authorization-Header `Bearer EIGENES_WEBHOOK_SECRET`, Sandbox-Events einschließlich Kauf, Verlängerung, Kündigung, Ablauf, Erstattung, Zahlungsproblem und Transfer zustellen. Store-Serverbenachrichtigungen später mit RevenueCat verbinden. Fehlgeschlagene Zustellungen im Dashboard prüfen.

Für Wiederherstellung nach Kontolöschung in RevenueCat **Transfer to new App User ID** als Restore-Verhalten einstellen. Nicht „Keep with original App User ID“: Das würde Käufe auf dem gelöschten Konto festhalten. Ein Transfer entzieht dem alten App-Konto den Zugang. Das muss mit zwei Testkonten ausdrücklich geprüft werden.

## 3. Danach Apple-/Google-Sandbox

Storeprodukte und RevenueCat-Appintegration mit den Paketnamen aus `app.json` einrichten; bei Apple dieselbe Subscription Group verwenden, bei Google automatisch verlängernde Base Plans. Testnutzer, Lizenztester und Test-Track/Sandbox gemäß Store einrichten. Öffentliche Plattformschlüssel als `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID` / `_IOS` setzen und `EXPO_PUBLIC_BILLING_MODE=store` verwenden. Backend bleibt `BILLING_ENVIRONMENT=sandbox` in separater Testinstanz.

**Ein Sandbox-Backend oder Development Build macht ein echtes Storekonto nicht automatisch zum Testkonto.** Im nativen Kaufdialog muss der Testkauf erkennbar sein. Nicht mit einem normalen zahlenden Konto testen. Für Produktion braucht es später separate Konfiguration, echte Betreiber-/Rechtstexte und eine ausdrückliche Freigabe. Hier wurde kein Live-Start vorbereitet oder ausgelöst.

## Prüfung

`npm.cmd run typecheck` und `npm.cmd run test:billing`. Der Datenbanktest führt das echte Schema und die neue Migration in PGlite/PostgreSQL aus; Supabase-eigene Auth-/Storage-Schemata werden im Test nachgebildet. Er prüft Schreibschutz, Service-RPC-Rechte, Snapshot-Reihenfolge, Uploadsperre, Datenkaskaden bei aktivem Pro und dieselbe E-Mail bei Neuregistrierung. Die weiteren Tests prüfen Statusauswertung, Kauf-Fehler, Accountwechsel, Expo-Go-Sperre, Storage-Paginierung und Sprachschlüssel.

Vor Freigabe mit Testkonten auf Geräten prüfen: Kauf erfolgreich/abgebrochen/abgelehnt/ausstehend, Netzwerkverlust unmittelbar nach Kauf, Verlängerung, Kündigung mit Restlaufzeit, Grace Period und Account Hold, Refund, Restore nach Neuinstallation, Transfer zwischen Konten, Löschung trotz aktivem Abo und Wiederregistrierung. Native Kaufdialoge, Store-Verwaltung, Supabase Storage API und reale Webhook-Zustellung sind durch lokale Tests nicht ersetzt.

Die bestehende allgemeine Pro-Rechtematrix und ihre einzelnen Funktions-Gates bleiben erhalten. Diese Änderung schützt den Abo-Status serverseitig; sie ist kein vollständiger Sicherheits-Audit aller App-Endpunkte. Vor echtem Betrieb sind außerdem Aufbewahrung/Löschung gemeinsamer Daten, Datenschutz bei RevenueCat, Betreiberangaben, E-Mail-Domain/SMTP, Rechtstexte und die bestehenden npm-Audit-Funde zu klären.

## Quellen

- [Expo SDK 56, gemäß AGENTS.md vor Codeänderungen gelesen](https://docs.expo.dev/versions/v56.0.0/)
- [RevenueCat mit Expo](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [Test Store](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store)
- [REST-Subscriber-Modell](https://www.revenuecat.com/docs/api-v1/customer-info-model)
- [Zahlungsprobleme und Grace Periods](https://www.revenuecat.com/docs/subscription-guidance/how-grace-periods-work)
- [Wiederherstellung und Transfer](https://www.revenuecat.com/docs/getting-started/restoring-purchases)
