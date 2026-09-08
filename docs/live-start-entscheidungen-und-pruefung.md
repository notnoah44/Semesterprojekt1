# PawStay: Live-Start, Mitgliedschaft, E-Mails und Domain

> Aktualisierung: Die folgenden Punkte dokumentieren die frühere Live-Planung. Inzwischen ist **Testbetrieb ohne Veröffentlichung** beschlossen: ausschließlich automatisch verlängernde Store-Abos, kein Verlängerungs-Toggle, jederzeitige Kontolöschung. Umsetzung und Einrichtung stehen in [store-abos-testbetrieb.md](store-abos-testbetrieb.md). Betreiber, Domain und Mailanbieter bleiben offen.

Stand: 8. September 2026. Nur Prüfung und redaktionelle Vorbereitung; keine Änderung von Zahlungslogik, Live-Diensten, DNS oder Deployment. Der Datenschutzentwurf steht in `datenschutz-entwurf.de.md`.

## Bestätigte Ziele

- Öffentlicher Live-Betrieb mit echten Mitgliedschaften.
- Automatische Verlängerung standardmäßig aktiv; im Kaufmenü soll eine Wahl ohne Verlängerung möglich sein.
- Kündigung beendet die nächste Verlängerung; bezahlter Zugang bleibt bis zum Laufzeitende.
- Bei definitiv fehlgeschlagenem Erstkauf keine Freischaltung; verständliche Fehlermeldung.
- Bei bewilligter Erstattung soll der zugehörige Pro-Zugang entzogen werden.
- Kontolöschung soll das Anmeldekonto samt E-Mail entfernen und Neuregistrierung mit derselben E-Mail ermöglichen.
- Betreiber, Anschrift, Kontaktadresse, Mailanbieter und Supabase-Region sind noch offen. pawstay.com gehört dem Team derzeit nicht.

## Abo-Modell: notwendige Präzisierungen

Der aktuelle Schalter in `lib/revenuecat.ts` ändert nur `profiles.auto_renew`; er steuert keinen Store. Im Store muss die Auswahl ein tatsächlich passendes Produkt kaufen: auf Android beispielsweise ein automatisch verlängernder oder ein Prepaid-Basisplan. Die Unterstützung der konkreten Produktarten durch die gewählte RevenueCat-SDK-Version ist vor Umsetzung zu prüfen. Auf iOS sind automatisch verlängernde und nicht verlängernde Produkte unterschiedlich zu behandeln; ein lokaler Schalter beendet kein Apple-Abo.

Empfohlene Beschriftung vor Kauf: „Automatisch verlängern“ mit unmittelbarer Zusammenfassung der ausgewählten Laufzeit und Verlängerungsbedingungen. Nach Kauf führt „Abo verwalten“ zur passenden Store-Verwaltung, soweit die Plattform keine direkte Aktion unterstützt. Preise für echte Käufe kommen aus den Store-Produkten und nicht allein aus den derzeit hart codierten Eurobeträgen.

Erstkauf, ausstehende Zahlung und Verlängerungsfehler müssen getrennte Zustände sein. Ein Netzwerkfehler kann nach einer erfolgreichen Abbuchung auftreten; deshalb nicht pauschal „Es sind keine Kosten entstanden“ anzeigen, sondern zunächst den Kaufstatus abgleichen. Ausstehende Käufe nicht als erfolgreich oder endgültig fehlgeschlagen behandeln. Bei Verlängerungsfehlern können Store-Nachfristen und Wiederholungsversuche gelten. Die App muss den verifizierten Berechtigungsstatus übernehmen.

Erstattung und Entzug des Zugangs müssen zusammen verarbeitet werden. Bei Apple entscheidet Apple über die Erstattung. Bei Google muss je nach Bearbeitungsweg zusätzlich zum Refund ein Revoke erfolgen. Doppelte und verspätete Serverereignisse dürfen keine erneute Freischaltung bewirken. Ein etwaiges zweites gültiges Produkt darf nicht durch die Erstattung des ersten pauschal verloren gehen.

Kontolöschung darf nicht mit „Store-Abo automatisch gekündigt“ gleichgesetzt werden. Bestehende Abos erkennen, Verwaltungs-/Kündigungsweg anbieten und die weitere Abrechnung transparent behandeln. Wiederherstellung eines Store-Kaufs nach Neuregistrierung über eine stabile, nicht E-Mail-basierte Kontozuordnung planen. Aufbewahrungspflichten und externe Store-Daten separat erklären; „E-Mail aus dem Login entfernt“ bedeutet nicht „jede historische E-Mail in allen Backups und Belegen sofort beseitigt“.

Belege: [Google-Abos](https://developer.android.com/google/play/billing/subscriptions), [Google-Abozustände](https://developer.android.com/google/play/billing/lifecycle/subscriptions), [RevenueCat-Verwaltung](https://www.revenuecat.com/docs/subscription-guidance/managing-subscriptions), [Erstattungen](https://www.revenuecat.com/docs/subscription-guidance/refunds), [Apple-Kontolöschung](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

## Welche Pro-Funktionen existieren wirklich?

Die Berechtigungsmatrix und die Verkaufsseite sind nicht deckungsgleich.

| Funktion | Befund im lokalen Code | Konsequenz für das Angebot |
| --- | --- | --- |
| Neue Chats/Buchungsanfragen, Antworten auf neue Anfragen | Pro-Rechte und entsprechende UI-Prüfungen vorhanden | End-to-End und serverseitige Durchsetzung prüfen |
| Bereits freigeschaltete Chats | Laut Matrix auch für Free weiter nutzbar | Nach Ablauf erhalten; so erklären |
| Suchalarme | Gespeicherte Suchen und Datenbanktrigger vorhanden | Live-Trigger und Zustellung testen |
| ID-Check | Upload und manuelle Prüfung vorgesehen | Prüfbetrieb, Datenschutz und Löschung fehlen als nachgewiesener Prozess |
| Video-Pitch | Upload und Anzeige vorbereitet | Upload/Abspielen prüfen |
| Videoanruf und Tierarzt-Hotline | Rechte/Verkaufstexte, aber keine nachgewiesene nutzbare Integration; Chat-Hotline ohne Aktion | Nicht als verfügbare bezahlte Leistung zusagen |
| Bevorzugte Suchplatzierung, Willkommensguide, Early Access | Auf Verkaufsseite genannt, kein entsprechender vollständiger Ablauf in geprüften Dateien belegt | Implementierung nachweisen oder vor Verkaufsstart entfernen |
| „Voller Zugriff auf Inserate“ | Lesen und Bilder bereits für Gäste vorgesehen | Mehrwert klar benennen; nicht irreführend als exklusiv darstellen |

Quellen im Projekt: `lib/constants/permissions.ts`, `app/(tabs)/konto/subscription/index.tsx`, `lib/i18n/locales/de.ts`, `app/(tabs)/chat/[conversationId].tsx`, `lib/api/profiles.ts`.

## Datenschutz: konkrete technische Abweichungen

1. `supabase/schema.sql` erlaubt öffentliche Lesezugriffe auf ganze Profile. `getProfile()` verwendet `select('*')`. Die im UI vorgesehene Namensfreigabe nach Buchung ist kein serverseitiger Datenschutz. Öffentliche und interne Felder trennen und Gast/Fremdnutzer/Teilnehmerrechte testen.
2. Die bisherige `Own profile`-Policy erlaubt breite eigene Profiländerungen. Mitgliedschaft und Verifizierungsflags dürfen vor Live-Zahlungen/-Prüfungen nicht vom Client frei gesetzt werden. Die spätere Sperrstatus-Absicherung allein löst das nicht.
3. `delete-account` verzögert die Löschung bei aktiver Mitgliedschaft und entspricht damit nicht dem neu beschlossenen Ziel.
4. `hardDeleteAccount` bereinigt nur ausgewählte Avatar- und ID-Pfade, nicht sämtliche Inserats-Buckets oder verschachtelte Galerien. Storage-Fehler werden teilweise ignoriert. Keine vollständige Löschung behaupten, bevor diese Abläufe getestet sind.
5. Es gibt keinen belegten automatischen Löschprozess für ID-Bilder nach Prüfung. Aufbewahrungsfristen für Chats, Logs, Meldungen und Backups sind nicht festgelegt.
6. Die Ortssuche ruft Nominatim nach 500 ms Eingabepause auf. Der öffentliche Dienst untersagt clientseitiges Autocomplete; auch das Limit von einer Anfrage/Sekunde gilt für die gesamte App, nicht je Nutzer. Anbieter oder Suchverfahren vor Start ändern. [Nominatim-Regeln](https://operations.osmfoundation.org/policies/nominatim/)

Diese Befunde stammen aus lokalem Code/Schema, nicht aus Tests gegen die produktive Datenbank. Keine Daten fremder Nutzer wurden abgefragt.

## Domain pawstay.com

Öffentliche Prüfung am 8. September 2026:

- Registry-RDAP: registriert am 3. April 2014; ausgewiesenes Ablaufdatum 3. April 2027. Ein Ablaufdatum garantiert keine Verfügbarkeit, da eine Verlängerung möglich ist.
- Nameserver: `NS69.DOMAINCONTROL.COM`, `NS70.DOMAINCONTROL.COM`.
- DNS-Abfrage nach MX: keine Antwortdatensätze; TXT am Domainstamm ebenfalls ohne Antwortdatensätze, also kein dort sichtbarer SPF-Eintrag.
- `_dmarc.pawstay.com`: NXDOMAIN, kein sichtbarer DMARC-Eintrag.
- DKIM ist ohne bekannten Selektor nicht zuverlässig vollständig prüfbar. Aus den übrigen DNS-Ergebnissen folgt keine Aussage über vorhandene DKIM-Selektoren.
- HTTPS konnte über das Recherchewerkzeug nicht geöffnet werden. Daraus lässt sich weder Nichtexistenz noch eine unsichere Website ableiten.
- Das Team bestätigt, die Domain nicht zu besitzen. Keine Verfügbarkeit oder Kaufpreisauskunft festgestellt. Keine Kontaktaufnahme, Registrierung oder Kaufhandlung vorgenommen.

Quellen der direkten öffentlichen Abfragen: [Verisign RDAP](https://rdap.verisign.com/com/v1/domain/pawstay.com), [MX-Abfrage](https://dns.google/resolve?name=pawstay.com&type=MX), [TXT-Abfrage](https://dns.google/resolve?name=pawstay.com&type=TXT), [DMARC-Abfrage](https://dns.google/resolve?name=_dmarc.pawstay.com&type=TXT). Ergebnisse sind eine Momentaufnahme; fehlende MX-Einträge beweisen nicht allein, dass überhaupt kein Mail-Empfang möglich ist.

Erst Übernahmeoption und Namens-/Markennutzung klären oder eine andere Domain wählen. Die Domainendungen `.de` und `.app` sind ebenfalls nicht als verfügbar oder im Besitz des Teams bestätigt. Vorher keine öffentliche Absenderadresse oder Links darauf versprechen.

Geplante Struktur nach Kontrolle der Domain:

| Zweck | Vorgeschlagener Pfad |
| --- | --- |
| Sprachwahl / Einstieg | `/` |
| Deutsche Startseite | `/de` |
| Englische, französische, spanische Startseite | `/en`, `/fr`, `/es` |
| Datenschutz | `/de/datenschutz`, `/en/privacy`, `/fr/confidentialite`, `/es/privacidad` |
| Impressum und AGB | Sprachabhängige Seiten unter demselben Präfix |
| Passwort zurücksetzen | beispielsweise `/de/passwort-zuruecksetzen` plus übersetzte Varianten |
| Technischer Auth-Rückweg | `/auth/callback` mit kontrollierter Weiterleitung zur gewählten Sprache/App |

Sprachpfade sind Verzeichnispfade derselben Domain, keine eigenen Domains. Der Webhost muss direkte Aufrufe und HTTPS unterstützen. Die Rechtstexte müssen auch ohne Anmeldung erreichbar sein. Noch keine Website implementiert oder veröffentlicht.

## E-Mail-Prüfung

Vorhanden: deutsche HTML-Templates für Bestätigung, Magic Link und Passwort-Reset mit PawStay-Farben und Supabase-Platzhalter `{{ .ConfirmationURL }}`. Nur lokale Dateien vorhanden zu haben belegt nicht, dass die Live-Templates oder SMTP eingerichtet sind. Es wurden keine Testmails versendet und keine Supabase-Management-Einstellungen geändert.

Der aktuelle Verifizierungsablauf nutzt `signInWithOtp` und einen PKCE-Callback, weil laut Codekommentar Supabase-Registrierungsbestätigung deaktiviert ist. Die tatsächliche Live-Einstellung ist nicht bestätigt. Für den Produktivbetrieb müssen bestätigte Auth-E-Mail, Profilflag und Versandablauf übereinstimmen. Im Callback darf eine bloße Client-Änderung des Profilflags keine verlässliche Verifizierung ersetzen. Links aus E-Mails auf demselben und einem anderen Gerät testen; PKCE benötigt den passenden Verifier.

Der Passwort-Reset nutzt bereits eine eigene HTTPS-Zieladresse über `EXPO_PUBLIC_PASSWORD_RESET_URL`. Der zugehörige lokale Ordner `web-reset` ist ein separates, im Hauptrepository ignoriertes Projekt. Die Website wird daher nicht durch einen normalen Push dieses App-Repositories mit ausgeliefert. Keine vertraulichen Reset-Tokens in Logs, Analyse-Tools oder Weiterleitungsparameter übernehmen.

Noch erforderlich:

- Domain und betreutes Postfach, etwa `support@<eigene-domain>`, festlegen. Für automatische Mails kann ein eigener Absender mit Reply-To auf das Supportpostfach verwendet werden. Supabase ist kein Mailpostfach.
- Versanddienst mit Custom SMTP konfigurieren; dessen Domain-Verifizierung mit SPF/DKIM und passender DMARC-Ausrichtung prüfen. DNS und Zustellbarkeit gemeinsam testen. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- Bestätigung, Magic Link, Passwort-Reset, E-Mail-Änderung und relevante Sicherheitsmeldungen einheitlich gestalten. Diese Typen sind von Supabase getrennt vorgesehen. [Template-Dokumentation](https://supabase.com/docs/guides/auth/auth-email-templates)
- Sprache ist bislang lokal in AsyncStorage gespeichert. Sie gelangt dadurch nicht automatisch in E-Mail-Templates. Bevorzugte Sprache kontrolliert in Auth-Metadaten/Versandkontext verfügbar machen; Betreff und Inhalt gemeinsam übersetzen. Templates können `.Data` nutzen; alternativ Send Email Hook für vollständige Sprachlogik prüfen. Fallback auf Englisch definieren.
- Exakte Produktions-Redirects erlauben; lokale Expo-Go-Adressen nicht als einzige Produktionslösung verwenden. Android App Links/iOS Universal Links benötigen Domainkontrolle und Zuordnungsdateien. Für Geräte ohne App einen Browserablauf anbieten.
- Bestehende Links auf `support@pawstay.de`, fiktive Impressumsdaten und Referral-Links auf `pawstay.app` nach Domainentscheidung konsistent ersetzen.
- Inbox-Test in Gmail/Outlook und auf iOS/Android: responsive Darstellung, Dark Mode, abgelaufene/einmalige Links, erneutes Senden, Bestätigung/Reset auf anderem Gerät. Zustellbarkeit nicht aus dem HTML allein ableiten.

## Nächste Entscheidungen

Betreiber und Anschrift, Domainübernahme/Alternative, betreutes Kontaktpostfach und Versanddienst festlegen. Supabase-Region, Verträge und Löschfristen ermitteln. Danach den Datenschutzentwurf finalisieren und übersetzen. Zahlungslogik, Löschung und sicherheitsrelevante Datenbankregeln in gesonderten Umsetzungsschritten an das bestätigte Live-Modell anpassen.
