# Datenschutzerklärung für PawStay – Arbeitsentwurf

Stand der Prüfung: 8. September 2026. Grundlage: lokaler App-Code und SQL-Schema. Live-Konfigurationen, Verträge und Hostingregionen wurden nicht verifiziert.

**Nicht zur Veröffentlichung freigegeben.** Der Betreiber und seine Anschrift/Kontaktadresse sind noch nicht festgelegt; pawstay.com gehört dem Team nicht. Angaben in `[OFFEN: …]` müssen ausgefüllt werden. Abschnitte mit `[VOR VERÖFFENTLICHUNG: …]` hängen von technischen Änderungen oder bestätigten Betriebsprozessen ab. Dieser Text ist eine redaktionelle Grundlage für die spätere Datenschutzseite, keine Bestätigung der Rechtmäßigkeit des aktuellen Betriebs.

## 1. Wer für die Verarbeitung verantwortlich ist

Verantwortlich für die Verarbeitung personenbezogener Daten in PawStay ist:

[OFFEN: vollständiger Name bzw. Firma, Rechtsform, Vertretung und zustellfähige Anschrift]

Kontakt für Datenschutzanliegen: [OFFEN: tatsächlich erreichbare E-Mail-Adresse]

[OFFEN: Prüfen, ob eine Datenschutzbeauftragte oder ein Datenschutzbeauftragter zu benennen ist; gegebenenfalls Kontaktdaten ergänzen.]

Diese Erklärung beschreibt die Verarbeitung in der PawStay-App für Hosts und Sitter. Für die zugehörige Website gilt zusätzlich Abschnitt 12. Verantwortlichkeiten von App Stores für deren eigene Dienste werden durch diese Erklärung nicht ersetzt.

## 2. Konto und Anmeldung

Wenn du ein Konto anlegst, verarbeiten wir deine E-Mail-Adresse, Vor- und Nachnamen, eine interne Nutzerkennung sowie die für Anmeldung und Kontosicherheit erforderlichen Authentifizierungsdaten. Dein Passwort wird an den Authentifizierungsdienst Supabase übertragen und dort für die Passwortprüfung verarbeitet. Bestätigung, Anmeldung und Passwortänderungen können außerdem Sicherheits- und Sitzungsdaten erzeugen.

Wir verwenden diese Informationen, um dein Konto anzulegen, dich anzumelden, dein Konto zu schützen und erforderliche Kontonachrichten zuzustellen. Ohne die erforderlichen Kontodaten sind Funktionen für angemeldete Nutzer nicht verfügbar. Das Durchsuchen öffentlicher Angebote ist auch als Gast vorgesehen.

Vorgesehene Rechtsgrundlagen sind Art. 6 Abs. 1 lit. b DSGVO für die Durchführung des Nutzungsvertrags und Art. 6 Abs. 1 lit. f DSGVO für notwendige Sicherheitsmaßnahmen. Das berechtigte Interesse ist der Schutz von Nutzerkonten und die Verhinderung von Missbrauch. [OFFEN: tatsächliche Sicherheitsprotokolle, Aufbewahrungsfristen und Interessenabwägung dokumentieren.]

## 3. Profile, Inserate und Reisebegleitung

Je nach Nutzung verarbeiten wir Profilbild und weitere Fotos, Geburtsjahr, Beruf, Beschreibung, Sprachen, Wohnort und Land, Erfahrungen mit Tieren und Angaben zu eigenen Haustieren. Sitter können beispielsweise Erfahrungen, Fähigkeiten, Mobilität und Arbeitsweise beschreiben. Hosts können Wohnsituation, Hausregeln, Umgebung und Unterbringung angeben. Inserate enthalten unter anderem Texte, Bilder, Aufenthalts- oder Verfügbarkeitszeiträume und Ortspräferenzen. Ein Video zur persönlichen Vorstellung kann Bild und Ton enthalten.

Diese Angaben dienen dazu, passende Hosts und Sitter zusammenzubringen und die von dir angeforderten Profil- und Inseratsfunktionen bereitzustellen. Rechtsgrundlage ist grundsätzlich Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung hierfür erforderlich ist. Zusätzliche Veröffentlichungszwecke sind gesondert zu prüfen.

Für das Erstellen eines Inserats verlangt die App derzeit unter anderem Geburtsjahr, Profilbild, Stadt, Land und eine Beschreibung mit mindestens 150 Zeichen. Weitere Angaben hängen vom jeweiligen Formular ab. Du entscheidest, welche freiwilligen Angaben du einträgst.

Veröffentlichte Profile, aktive Inserate, Bewertungen sowie als öffentlich bereitgestellte Bilder und Videos können auch Personen ohne Nutzerkonto sehen. Öffentlich erreichbare Inhalte können von Dritten kopiert werden.

[VOR VERÖFFENTLICHUNG: Die endgültige Liste öffentlicher Felder festlegen und serverseitig durchsetzen. Das aktuelle Schema erlaubt SELECT auf vollständige Profile, einschließlich Nachnamen und weiterer interner Profilfelder. Die Oberfläche zeigt Nachnamen teilweise erst nach einer Buchung; dieser Schutz ist nicht als Datenbank-Zugriffsschutz umgesetzt. Eine Aussage „Nachname erst nach Buchung sichtbar“ darf vorher nicht in die Erklärung übernommen werden.]

Du kannst Angaben zu Reisebegleitpersonen hinterlegen, etwa Name, Alter, Bild und Beziehung zu dir. Bitte trage keine Daten anderer Personen ohne entsprechende Berechtigung ein. [OFFEN: Rechtsgrundlage, Information der betroffenen Personen nach Art. 14 DSGVO, Umgang mit Kindern und tatsächliche Sichtbarkeit der Begleitdaten festlegen. Dieser Absatz ersetzt diese Prüfung nicht.]

## 4. Nachrichten, Buchungen, Bewertungen und gespeicherte Suchen

Wir speichern Nachrichteninhalte, Absender, Gesprächszuordnung, Zeitpunkte und Lesestatus, damit Gesprächsteilnehmer Nachrichten austauschen können. Die App überträgt neue Nachrichten über Supabase Realtime. Die Chatfunktion verwendet derzeit keine Ende-zu-Ende-Verschlüsselung; Inhalte werden serverseitig verarbeitet. [OFFEN: administrative Zugriffsberechtigungen und anlassbezogene Einsichtnahme festlegen.]

Buchungen umfassen die beteiligten Konten, das zugehörige Inserat, Zeitraum, Status und gegebenenfalls eine Nachricht. Bewertungen umfassen Bewertungstext, Sterne und die Zuordnung zu Nutzern und Buchungen. Gespeicherte Suchen und Favoriten werden deinem Konto zugeordnet, damit du sie wiederfinden und gegebenenfalls Suchbenachrichtigungen erhalten kannst.

Diese Verarbeitungen dienen der Bereitstellung der jeweils angeforderten Funktionen auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO. Bewertungen sind öffentlich. Gesprächs- und Buchungsdaten sind nach dem vorgesehenen Berechtigungskonzept den beteiligten Nutzern sowie berechtigten Betriebsmitarbeitern zugänglich; die tatsächlichen Live-Berechtigungen sind vor Freigabe zu prüfen.

Das Entfernen eines Gesprächs aus deiner Chatübersicht blendet es derzeit nur für dich aus. Die Nachrichten werden dadurch nicht automatisch für alle Beteiligten gelöscht.

## 5. Identitätsprüfung

Für die angebotene Identitätsprüfung können ein Ausweisfoto und ein Selfie hochgeladen werden. Die Dateien werden in einem als privat vorgesehenen Supabase-Speicherbereich abgelegt. Eine manuelle Prüfung ist vorgesehen; im geprüften App-Code wurde keine automatisierte Gesichtserkennung gefunden. Das Profil speichert den Prüfstatus und den Einreichungszeitpunkt.

[OFFEN: Vor Aktivierung der Identitätsprüfung die erforderlichen Ausweisdaten, zulässige Schwärzungen, Rechtsgrundlage, Prüferkreis, Information/Einwilligung beim Upload und Löschfristen verbindlich festlegen. Insbesondere die Berechtigung zur Verarbeitung von Ausweiskopien gesondert prüfen.]

[VOR VERÖFFENTLICHUNG: Die derzeitige Zusage zur Löschung nach der Prüfung braucht einen dokumentierten, kontrollierten Löschprozess. Im Code ist keine automatische Löschung nach erfolgreicher Prüfung vorhanden. Keine erfundene Frist einsetzen. Falls dieses Konzept bis zum Start fehlt, die Funktion nicht live anbieten.]

## 6. E-Mails und Benachrichtigungen

Für Kontobestätigung, Anmeldung, Änderung der E-Mail-Adresse und Passwortwiederherstellung verarbeiten wir deine E-Mail-Adresse und die zur jeweiligen Aktion nötigen Sicherheitsinformationen. Supabase Auth erstellt die entsprechenden Nachrichten. Der Versand erfolgt über [OFFEN: Anbieter und Rechtsträger, Verarbeitungsorte und Aufbewahrungsfristen]. Erforderliche Kontonachrichten beruhen grundsätzlich auf Art. 6 Abs. 1 lit. b DSGVO, Sicherheitsnachrichten gegebenenfalls auf Art. 6 Abs. 1 lit. f DSGVO.

Wenn du Push-Mitteilungen erlaubst, werden ein Push-Token, eine lokal erzeugte Installationskennung und die Zuordnung zu deinem Nutzerkonto verarbeitet. Die vorbereitete Versandfunktion nutzt den Expo Push Service sowie die Zustelldienste von Apple bzw. Google. Sie sendet allgemeine Hinweise zu Nachrichten und Buchungen sowie interne Kennungen zur Navigation in der App. Der Nachrichtentext eines Chats wird von dieser Funktion nicht als Push-Vorschau versendet.

Du kannst Push-Mitteilungen in den Systemeinstellungen deaktivieren und Ereignispräferenzen in PawStay verwalten. Zusätzlich kann eine lokale Erinnerung vor Ablauf der Mitgliedschaft eingerichtet werden. [OFFEN: Rechtsgrundlage der optionalen Benachrichtigungen, gegebenenfalls gesonderte Einwilligung und Widerruf, Empfänger-Rechtsträger und Live-Konfiguration bestätigen. Eine Betriebssystemfreigabe allein ersetzt diese Prüfung nicht.]

Die Datenschutzerklärung ist keine Einwilligung in Werbung. Eine spätere Newsletter- oder Marketingfunktion wäre gesondert zu beschreiben und rechtlich einzuordnen.

## 7. Mitgliedschaft und Zahlungen – geplanter Live-Betrieb

[VOR VERÖFFENTLICHUNG: RevenueCat und echte Store-Zahlungen sind noch nicht angebunden. Dieser Abschnitt beschreibt das geplante Ziel und darf erst nach Prüfung der tatsächlichen Integration als aktuelle Verarbeitung veröffentlicht werden.]

Für Pro-Mitgliedschaften sollen der jeweilige App Store und RevenueCat Kauf- und Abo-Vorgänge verarbeiten. PawStay soll die interne Nutzerkennung mit Informationen zu Produkt, Kaufstatus, Laufzeit, Verlängerung, Kündigung und Erstattung verknüpfen, um die richtigen Funktionen freizuschalten. Kartennummern sollen nicht in PawStay-Formularen erhoben werden. Die konkrete Datenauswahl und etwaige zusätzliche SDK-Diagnosedaten sind vor Freigabe zu verifizieren.

Rechtsgrundlagen sind grundsätzlich Art. 6 Abs. 1 lit. b DSGVO für Vertragsabwicklung und Art. 6 Abs. 1 lit. c DSGVO, soweit konkrete gesetzliche Aufbewahrungspflichten bestehen. [OFFEN: Vertragspartner/Rechtsträger, datenschutzrechtliche Rollen, zusätzliche Zwecke, Empfänger, Verarbeitungsorte und konkrete Fristen ergänzen.]

## 8. Support, Meldungen und Missbrauchsschutz

Wenn du Support kontaktierst oder einen Nutzer meldest, verarbeiten wir deine Anfrage, Kontaktdaten und die für die Bearbeitung nötigen Informationen. Meldungen in der App enthalten den meldenden und gemeldeten Nutzer, einen Grund, gegebenenfalls eine Beschreibung und eine Gesprächskennung. Es kann ein Sperrstatus am Konto geführt werden.

Rechtsgrundlagen sind je nach Anliegen Art. 6 Abs. 1 lit. b DSGVO sowie Art. 6 Abs. 1 lit. f DSGVO. Berechtigte Interessen sind die Bearbeitung von Beschwerden, der Schutz betroffener Nutzer und die Aufklärung von Missbrauch. [OFFEN: Bearbeiterkreis, Interessenabwägung, Fristen, Dokumentation und Widerspruchsverfahren festlegen.]

## 9. Gerätespeicher, Berechtigungen und Ortssuche

Die App speichert Anmeldesitzungen nativ über SecureStore und in der Webversion über localStorage. Sprachwahl, Rolle und eine Push-Installationskennung können über AsyncStorage gespeichert werden. Dies dient der Anmeldung, deinen Einstellungen und der Zuordnung von Benachrichtigungen. [OFFEN: Speicher-/Löschverhalten bei Abmeldung, Kontowechsel und Kontolöschung verifizieren; rechtliche Einordnung des Endgerätezugriffs nach § 25 TDDDG dokumentieren.]

Für Foto- und Videouploads nutzt die App die Medienauswahl des Geräts. Es werden die von dir ausgewählten Dateien hochgeladen. Berechtigungen können in den Systemeinstellungen verwaltet werden. Im untersuchten Anwendungscode wurde keine aktive GPS-Standortabfrage gefunden; Ortsangaben erfolgen derzeit über Eingaben und Suchvorschläge.

Bei der Ortssuche sendet die App derzeit eingegebenen Suchtext und eine Sprachangabe direkt an den öffentlichen Nominatim-Dienst der OpenStreetMap Foundation. Bei diesem Aufruf fallen auch technische Verbindungsdaten wie die IP-Adresse an.

[VOR VERÖFFENTLICHUNG: Das aktuelle Autocomplete ist nach der Nominatim-Nutzungsrichtlinie nicht zulässig. Anbieter oder Suchverfahren ändern und diesen Abschnitt danach an den tatsächlich genutzten Dienst, dessen Rechtsgrundlage und Verarbeitungsbedingungen anpassen.]

## 10. Dienstleister und Übermittlungen in andere Länder

Supabase wird für Anmeldung, Datenbank, Dateiablage, Echtzeitnachrichten und serverseitige Funktionen verwendet. Für optionale Push-Mitteilungen sind Expo und die Plattformdienste von Apple/Google vorgesehen. Mailversand, Website-Hosting und die geplante Zahlungsintegration müssen in die abschließende Empfängerliste aufgenommen werden.

[OFFEN: Für jeden Dienst den Vertragspartner, dessen Rolle, vereinbarte Region, Unterauftragnehmer, Supportzugriffe aus anderen Ländern und anwendbare Verträge prüfen. Auftragsverarbeitungsverträge abschließen, soweit erforderlich.]

Bei einer Übermittlung in Länder außerhalb des Europäischen Wirtschaftsraums sind die jeweils tatsächlich angewendeten Voraussetzungen und Schutzmaßnahmen anzugeben, beispielsweise ein einschlägiger Angemessenheitsbeschluss oder Standardvertragsklauseln einschließlich erforderlicher ergänzender Maßnahmen. [OFFEN: konkret benennen und Bezugsmöglichkeit der Garantien angeben. Eine EU-Projektregion schließt internationale Support- oder Unterauftragnehmerzugriffe nicht automatisch aus.]

## 11. Speicherdauer und Kontolöschung

Wir bewahren personenbezogene Daten nur so lange auf, wie dies für die genannten Zwecke erforderlich ist oder eine konkrete gesetzliche Pflicht besteht. Danach werden sie gelöscht oder anonymisiert.

[OFFEN: Verbindliche, technisch durchgesetzte Fristen bzw. nachvollziehbare Kriterien für Kontodaten, öffentliche Dateien, Chats/Buchungen, Bewertungen, Prüfbilder, Support/Meldungen, Sicherheitslogs, Push-Tokens, Backups und spätere Kaufbelege ergänzen. Die allgemeine Aussage oben reicht als alleinige Information nicht aus.]

**Beschlossenes Ziel:** Du kannst die Löschung deines Kontos anfordern. Nach erfolgreicher Löschung wird das Anmeldekonto einschließlich der dort hinterlegten E-Mail-Adresse entfernt; dieselbe E-Mail-Adresse kann für ein neues Konto verwendet werden. Ein neues Konto stellt alte Inhalte nicht automatisch wieder her. Gesetzlich aufzubewahrende Vorgangsdaten und Daten bei eigenständig verantwortlichen Zahlungsdiensten sind gesondert zu behandeln. Die Löschung des PawStay-Kontos beendet ein Store-Abo nicht automatisch.

[VOR VERÖFFENTLICHUNG: Der aktuelle Code verschiebt die Löschung bei aktiver Mitgliedschaft. Die Speicherbereinigung erfasst nicht alle Listing-Buckets und verschachtelten Galerieordner und prüft nicht alle Fehler. Dieses Verhalten muss an das Ziel angepasst und mit allen abhängigen Daten, Sessions, Backups und Abo-Prozessen getestet werden. Der vorstehende Zieltext ist noch keine zutreffende Beschreibung der vollständigen Implementierung.]

## 12. Website, Sprachseiten und Passwortwiederherstellung

Für die geplante Website sind Sprachpfade wie `/de`, `/en`, `/fr` und `/es` vorgesehen. [OFFEN: tatsächlich kontrollierte Domain und Webhoster festlegen.]

Die vorhandene separate Passwort-Reset-Seite verarbeitet Sicherheitsdaten aus dem Reset-Link und das neu eingegebene Passwort zur Kommunikation mit Supabase. Sie entfernt Linkparameter aus der sichtbaren Browseradresse und hält die Reset-Sitzung nach dem vorgesehenen Ablauf im Arbeitsspeicher. Sie lädt derzeit die Supabase-Bibliothek von `esm.sh`; dadurch entstehen zusätzliche Verbindungen zu diesem Dienst.

[OFFEN: Webhoster, Hosting-/Zugriffslogs, Laufzeiten und CDN-Verarbeitung ergänzen oder die Bibliothek selbst ausliefern. Die bisherige Reset-Seite ist nur deutschsprachig. Für eine spätere Hauptwebsite Tracking, Cookies, Fonts und Drittinhalte separat inventarisieren.]

Im untersuchten App-Code wurden keine Werbe- oder Analytics-SDKs gefunden. Diese Feststellung ersetzt keine Prüfung der produktiven Website, Hostinglogs oder künftig hinzugefügter Dienste. Es wurde keine automatisierte Entscheidung mit rechtlicher oder ähnlich erheblicher Wirkung im App-Code festgestellt; der tatsächliche Moderationsbetrieb ist zu bestätigen.

## 13. Deine Rechte

Unter den gesetzlichen Voraussetzungen hast du das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit. Beruht eine Verarbeitung auf deiner Einwilligung, kannst du diese jederzeit mit Wirkung für die Zukunft widerrufen; die Rechtmäßigkeit der vorherigen Verarbeitung bleibt unberührt.

Soweit wir Daten auf Grundlage berechtigter Interessen verarbeiten, kannst du aus Gründen, die sich aus deiner besonderen Situation ergeben, Widerspruch einlegen. Gegen eine Verarbeitung für Direktwerbung kannst du jederzeit Widerspruch einlegen.

Du kannst dich außerdem bei einer Datenschutzaufsichtsbehörde beschweren, insbesondere am Ort deines gewöhnlichen Aufenthalts, deines Arbeitsplatzes oder eines vermuteten Verstoßes. [OFFEN: zuständige Aufsichtsbehörde anhand des Betreibers ergänzen.]

Für die Ausübung deiner Rechte erreichst du uns unter [OFFEN: Kontaktadresse]. Wir können geeignete Angaben zur Identitätsprüfung verlangen, soweit dies zur sicheren Bearbeitung erforderlich ist.

## Redaktionelle Freigabe

Vor Veröffentlichung alle offenen Angaben auflösen, Aussagen mit Live-Konfigurationen und Löschtests abgleichen und die Rechtsgrundlagen prüfen lassen. Danach identische inhaltliche Fassungen für Deutsch, Englisch, Französisch und Spanisch erstellen, mit Versionsdatum veröffentlichen und bereits vor der Registrierung zugänglich machen. Die aktuelle App-Seite wurde bewusst noch nicht durch diesen Arbeitsentwurf ersetzt.

Rechtsgrundlagen zur Prüfung: [DSGVO, amtlicher Text](https://eur-lex.europa.eu/eli/reg/2016/679/oj/deu), insbesondere Art. 5, 6, 12–14, 15–22, 28, 32 und 44 ff.; [§ 25 TDDDG](https://www.gesetze-im-internet.de/tdddg/__25.html).
