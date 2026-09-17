# MemoMatch: Sicherheitsprüfung und Fehleranalyse

Stand: 17. September 2026. Geprüft wurde der lokale Quellcode einschließlich Anmeldung, API, Datenzugriff, Zahlungsmodul, Indexer, Oberfläche und installierter Abhängigkeiten.

Umsetzungsstatus: Die im nachfolgenden Plan beschriebenen Korrekturen wurden anschließend implementiert. `npm run check`, `npm test`, `npm run build`, der Wrangler-Dry-Run des Indexers und `npm audit` bestehen inzwischen. Eine reale Arc-Testnet- oder Mainnet-Abnahme ist weiterhin ausstehend.

## Ergebnis

**Der ursprünglich untersuchte Stand war nicht für echte Zahlungen freigabefähig.** Die nachfolgenden Befundabschnitte dokumentieren diesen Ausgangszustand. Die Korrekturen sind im Umsetzungsstatus und in der aktuellen Testsuite berücksichtigt.

Es wurde kein erfolgreicher Diebstahl von Wallet-Guthaben nachgewiesen. Die Anwendung verwahrt keine privaten Wallet-Schlüssel. Die wesentlichen Risiken sind Datenoffenlegung, falsche Zahlungsanzeigen, zusätzliche vom Nutzer signierte Zahlungen sowie verlorene oder nicht zugeordnete Eingänge.

Die Schweregrade berücksichtigen die Auswirkungen auf eine Zahlungsanwendung. „Hoch“ bezeichnet auch funktionale Fehler, die eine Veröffentlichung verhindern. Bedingte Risiken und nicht ausgeführte Tests sind ausdrücklich gekennzeichnet.

## Umfang und Nachweise

| Prüfung                           | Ergebnis                                                              |
| --------------------------------- | --------------------------------------------------------------------- |
| `npm run check`                   | Erfolgreich, keine Fehler oder Warnungen                              |
| `npm test`                        | Zehn Fach- und Regressionstests erfolgreich                           |
| `npm run build`                   | Produktionsbuild erfolgreich                                          |
| Arc-Payment-Core-Regressionstests | Gültige native Memo-Zahlung, Teilzahlung und Hashabweichung abgedeckt |
| `npm audit --json`                | Keine bekannten Schwachstellen in den installierten Abhängigkeiten    |

Die ursprünglichen Reproduktionstests dienten ausschließlich der Befundaufnahme. Sie wurden nach der Korrektur nicht als Regressionstests weitergeführt, weil sie absichtlich das frühere Fehlverhalten erwarten. Die aktuelle Fachtestsuite verwendet künstliche Belege und einen isolierten Speicher. Es wurden keine echten Zahlungen ausgelöst und keine Produktionsdaten geändert.

Nicht durchgeführt wurden ein Penetrationstest einer veröffentlichten Instanz, reale Wallet-Tests, ein Mainnet-Durchlauf oder Lasttests. Der lokale HTTP-Aufruf war nicht erreichbar. Aussagen über Endpunkte beruhen deshalb auf Quellcode und direkten Handler-Tests. Externe Cloudflare-Regeln und produktive Secrets waren nicht Bestandteil der Prüfung.

Die automatisierten Tests decken weiterhin keinen vollständigen realen Wallet-Ablauf und keine produktive Anmeldung ab. Typprüfung und Build allein erkennen die ursprünglichen Logikfehler nicht.

## Hohe Priorität

### H01: Private Auftragsbezeichnungen sind öffentlich abrufbar

**Ort:** `src/routes/api/receipts/[token]/+server.ts:4`, `src/routes/receipt/[token]/+page.svelte:51`, zusätzlich `src/routes/api/pay/[token]/verify/+server.ts:49`.

Der öffentliche Nachweis-Endpunkt gibt das vollständige Anforderungsobjekt zurück. Es enthält unter anderem `title`, `owner` und die interne Kennung. Die Nachweisseite zeigt den privaten Titel ebenfalls an. Wer den bestimmungsgemäß geteilten Zahlungslink kennt, kann damit die private Auftragsbezeichnung lesen. Test A03 bestätigt dies mit einem kontogebundenen Datensatz.

Auch die erfolgreiche Prüfantwort enthält das vollständige Objekt. Dieser zweite Pfad ist aktuell durch H02 blockiert, würde nach dessen Korrektur aber ebenfalls Daten offenlegen.

**Maßnahme:** Ein eigenes öffentliches Antwortmodell mit ausdrücklich freigegebenen Feldern verwenden. Private Titel aus öffentlichen Antworten und der Nachweisseite entfernen. Eine zufällige Linkkennung ersetzt keine Trennung privater und öffentlicher Daten.

### H02: Der Prüfer lehnt gültig aufgebaute Memo-Ereignisse ab

**Ort:** `packages/arc-payment-core/src/index.ts:23` und `:155`, verwendet durch `src/routes/api/pay/[token]/verify/+server.ts:26` und `workers/indexer.ts:34`.

Die Ereignisdefinition enthält `callDataHash`. Der Prüfer erwartet dagegen `callData`, das im Ereignis nicht existiert. Der TypeScript-Cast erzeugt dieses Feld nicht. Dadurch endet die Prüfung mit `Unsupported memo target`, bevor der Transfer geprüft wird. Test A01 reproduziert dies mit einem passend kodierten Memo-Ereignis und einem passenden nativen Transfer.

**Auswirkung:** Eine bereits ausgeführte Zahlung kann sowohl bei der Sofortprüfung als auch im Indexer unberücksichtigt bleiben. Der Test beweist den strukturellen Fehler, nicht einen realen Mainnet-Durchlauf. Das dokumentierte Ereignisformat bestätigt die Ursache. [Arc-Dokumentation zu Transaktionsmemos](https://docs.arc.io/arc/concepts/transaction-memos)

**Maßnahme:** Zusätzlich die Transaktion abrufen, ihren äußeren Aufruf dekodieren und die inneren Aufrufdaten mit `callDataHash` vergleichen. Die fehlende Bedingung darf nicht lediglich entfernt werden. Dazu gehören auch die Prüfungen aus M06.

### H03: Beträge ab 1.000 USDC beschädigen Verarbeitung und Anzeige

**Ort:** `src/lib/format.ts:3`, `:10` und `:20`; `src/lib/server/store.ts:37` und `:52`; `src/routes/+page.svelte:124`.

Der Formatierer erzeugt beispielsweise `1,000.00`. Der Parser akzeptiert keine Tausendertrennzeichen. Derselbe formatierte Wert wird jedoch für API-Anfragen und beim Laden von Datenbankwerten weiterverwendet. `formatUsdc` wandelt einen entsprechenden Parserfehler außerdem stillschweigend in `0.00` um. Test A02 bestätigt diese Kombination.

**Auswirkung:** Anforderungen können bei der Erstellung scheitern. Beim Laden oder Summieren größerer Zahlungen entstehen Ausnahmen oder falsche Nullanzeigen. Dies betrifft die finanzielle Darstellung und ist kein reiner Formatierungsfehler.

**Maßnahme:** Kleinste USDC-Einheiten als ganzzahlige Zeichenfolgen für Speicherung und API verwenden. Erst unmittelbar bei der Darstellung formatieren. Ungültige Beträge ausdrücklich als Fehler behandeln. Grenzwerte, sechs Nachkommastellen und große Beträge durch Roundtrip-Tests prüfen.

### H04: Nach dem Senden wird die Zahlungsaktion ohne belastbares Ergebnis erneut freigegeben

**Ort:** `src/routes/pay/[token]/+page.svelte:19`, `:39` und `:119`.

Nach dem Wallet-Aufruf sendet die Oberfläche den Hash an den Prüf-Endpunkt, wertet aber weder HTTP-Status noch Antwortinhalt aus. Es fehlen anschließendes Nachladen, Polling und dauerhafte Speicherung des laufenden Prüfversuchs. Im `finally` wird `isSending` zurückgesetzt, während der alte Restbetrag bestehen bleibt.

**Auswirkung:** Auch bei einer noch laufenden Prüfung oder einem Prüfungsfehler kann eine weitere Zahlung angestoßen werden. Jede weitere Zahlung benötigt weiterhin eine Wallet-Bestätigung. Es wurde keine automatische Doppelabbuchung nachgewiesen. Ein Neuladen verliert den sichtbaren Prüfkontext.

**Maßnahme:** Gesendeten Hash und Prüfzustand wiederherstellbar speichern. Unklare Ergebnisse sichtbar offenhalten, Restbetrag aktualisieren und laufende Zahlungen bei der erneuten Zahlungsaktion berücksichtigen. Die Zustände „abgelehnt“, „gesendet“ und „Prüfung verzögert“ getrennt behandeln.

### H05: Teilzahlungen und Überzahlungen werden nicht korrekt angenommen

**Ort:** `packages/arc-payment-core/src/index.ts:171`; `src/routes/api/pay/[token]/verify/+server.ts:31`; `workers/indexer.ts:39`.

Der Prüfer verlangt, dass der einzelne Transfer exakt dem ursprünglichen Sollbetrag entspricht. Beide Aufrufer übergeben diesen Sollbetrag. Eine Zahlung von 4 USDC auf eine Anforderung über 10 USDC scheitert damit ebenso wie eine externe Zahlung über 11 USDC.

**Nachweisgrenze:** Dies ist ein eindeutiger Codebefund. Der vorgelagerte Fehler H02 verhindert derzeit, diesen nachgelagerten Pfad mit einem regulären Memo-Beleg zu erreichen.

**Maßnahme:** Den tatsächlich aufgerufenen positiven Transferbetrag gegen das maßgebliche Transferereignis prüfen. Anschließend alle eindeutig verifizierten Eingänge gegen den Sollbetrag aggregieren. Teilzahlung, vollständige Zahlung und Überzahlung getrennt testen.

### H06: Die Verwaltungsoberfläche vermischt Beispieldaten mit echten Abläufen

**Ort:** `src/routes/+page.svelte:27`, `:63`, `:94` und `:127`; `src/lib/demo-data.ts:3`.

Die Übersicht beginnt mit statischen Beispieldaten. Nach der Anmeldung werden die eigenen Anforderungen nicht über `GET /api/requests` geladen. Änderungen der Wallet werden nicht durch entsprechende Kontoereignisse verarbeitet. Scheitert die Erstellung über die API, erzeugt der Catch-Zweig stattdessen eine lokale Anforderung mit einer Null-Memo-Referenz. Für diese existiert kein entsprechender serverseitiger Zahlungslink.

Statische Zahlungseinträge erscheinen als verifiziert. Es wurde nicht geprüft, ob deren Hashes realen Onchain-Transaktionen entsprechen; ihre Anzeige führt selbst keine Verifikation durch.

**Auswirkung:** Die Übersicht kann einen falschen Kontostand oder nicht nutzbare Zahlungslinks vermitteln. Der Hinweis auf eine lokal erstellte Demo-Anforderung löst das fehlende Speichern nicht.

**Maßnahme:** Demonstration ausdrücklich vom produktiven Konto trennen. Eigene Daten nach der Anmeldung und bei Kontoänderungen laden. API-Fehler anzeigen und keine Ersatzanforderung als Ergebnis einer fehlgeschlagenen Speicherung erzeugen.

### H07: Anmeldung und Sitzungen sind nicht für mehrere Worker-Instanzen ausgelegt

**Ort:** `src/lib/server/auth.ts:7`, `:23` und `:38`.

Anmeldeaufforderungen und Sitzungen liegen ausschließlich in lokalen JavaScript-Maps. Eine andere Worker-Instanz oder ein Neustart kennt diese Daten nicht. Eine Cookie-Laufzeit von 24 Stunden gewährleistet deshalb keine entsprechend lange Sitzung. Cloudflare garantiert keine dauerhaft verfügbare globale Instanz. [Cloudflare Workers: Ausführungsmodell](https://developers.cloudflare.com/workers/reference/how-workers-works/)

**Auswirkung:** Anmeldungen und authentifizierte Aktionen können abhängig von der ausführenden Instanz fehlschlagen. Dies ist vor allem ein Verfügbarkeits- und Zuverlässigkeitsproblem, kein belegter Authentifizierungsbypass.

**Maßnahme:** Aufforderungen und widerrufbare Sitzungen in einem geeigneten dauerhaften Speicher ablegen. Ablaufzeiten und atomaren Verbrauch auf dieser gemeinsamen Datenbasis durchsetzen.

## Mittlere Priorität

### M01: Eine Anmeldenachricht kann gleichzeitig mehrfach verbraucht werden

**Ort:** `src/lib/server/auth.ts:28`.

Zwischen dem Lesen und Löschen der Aufforderung liegt eine asynchrone Signaturprüfung. Zwei gleichzeitige Aufrufe finden daher beide dieselbe noch gültige Aufforderung. Test A05 erstellt damit zwei unterschiedliche Sitzungen aus derselben Signatur.

Ein Angreifer benötigt dafür eine gültige signierte Nachricht. Der Test belegt keine Übernahme einer beliebigen Wallet. **Maßnahme:** Die Aufforderung atomar einmalig verbrauchen und die Sitzung nur bei erfolgreichem Verbrauch erstellen.

### M02: Logout widerruft die serverseitige Sitzung nicht

**Ort:** `src/routes/api/auth/logout/+server.ts:3`; `src/lib/server/auth.ts:42`.

Der Endpunkt löscht nur das Browser-Cookie. Eine zuvor kopierte Sitzungskennung bleibt serverseitig bis zum Ablauf gültig. Test A04 bestätigt dies. **Maßnahme:** Beim Logout den Sitzungseintrag löschen beziehungsweise widerrufen und anschließend das Cookie entfernen.

### M03: Eine fehlende Datenbank aktiviert ungeschützte Ersatzdaten

**Ort:** `src/lib/server/store.ts:30`, `:72`, `:86`, `:97` und `:108`; `src/routes/api/requests/[id]/+server.ts`.

Ohne DB-Binding wird auch außerhalb des Entwicklungsmodus auf den Speicher mit Beispieldaten zurückgegriffen. Die Eigentumsprüfung weist ein anderes Konto nur zurück, wenn `owner` vorhanden ist. Test A07 bestätigt den Produktions-Fallback, Test A08 die Änderung eines eigentümerlosen Beispieldatensatzes durch ein beliebiges angemeldetes Konto.

Der Befund gilt für den Ersatzspeicher und eigentümerlose Datensätze. Die produktive Tabellendefinition verlangt einen Eigentümer; eine allgemeine Umgehung für normale fremde DB-Datensätze wurde nicht nachgewiesen. **Maßnahme:** Bei fehlender Produktionsdatenbank kontrolliert abbrechen und Eigentümerschaft stets positiv prüfen.

### M04: Öffentliche Endpunkte besitzen keine erkennbaren Ressourcenlimits

**Ort:** `src/lib/server/auth.ts:7` und `:23`; `src/routes/api/auth/challenge/+server.ts`; `src/routes/api/pay/[token]/verify/+server.ts`.

Unauthentifizierte Aufrufe können neue Aufforderungen im Speicher anlegen und RPC-Abfragen auslösen. Abgelaufene, nicht verwendete Aufforderungen werden nicht regelmäßig entfernt. Im Repository sind keine entsprechenden Anfragelimits erkennbar. Externe Schutzregeln waren nicht einsehbar.

**Maßnahme:** Anfragelimits, maximale Payload-Längen und zeitgesteuerte Bereinigung umsetzen. RPC-Aufwand je Zahlungslink begrenzen und wiederholte Prüfungen desselben Hashs zusammenführen. Es wurde kein Lastangriff durchgeführt.

### M05: Der Indexer überspringt ältere Eingänge und speichert ungenaue Zahlungszeiten

**Ort:** `workers/indexer.ts:17`, `:43`, `:60` und `:65`; `src/routes/api/pay/[token]/verify/+server.ts:45`.

Ohne gespeicherten Fortschritt beginnt die Suche nur bei ungefähr den letzten 120 Blöcken. Frühere Zahlungen werden nicht nachgelesen. Abgelehnte Belege werden übersprungen, während der Fortschritt anschließend weiterläuft. H02 kann dadurch einen später ausdrücklich notwendigen Rücklauf verursachen. Eine Sperre gegen gleichzeitige Läufe fehlt ebenfalls.

Als Zahlungszeit wird der Zeitpunkt der lokalen Verarbeitung gespeichert, nicht die Blockzeit. Ein verspäteter Nachlauf erzeugt damit irreführende Nachweise.

**Maßnahme:** Einen nachvollziehbaren Startblock konfigurieren, Prüfversuche dauerhaft unterscheiden und nach einer Prüferkorrektur betroffene Bereiche erneut verarbeiten. Fortschritt konkurrierend sicher aktualisieren und die Blockzeit verwenden. Vorhandene Eindeutigkeitsregeln helfen gegen Doppelbuchung, ersetzen aber keine Wiederherstellungsstrategie.

### M06: Wesentliche Bindungen zwischen Transaktion, Memo und Geldfluss fehlen

**Ort:** `packages/arc-payment-core/src/index.ts:113` und `:134`.

Der Prüfer kontrolliert derzeit nicht den äußeren Transaktionsaufruf, die Memo-Formatkennung und den Hash der Aufrufdaten. Er bindet den Memo-Absender nicht verbindlich an den Transfer-Absender. `expectedPayer` ist optional und wird von den vorhandenen Aufrufern nicht gesetzt. Mehrere beziehungsweise verschachtelte passende Ereignisse werden nicht ausdrücklich zurückgewiesen. Fehlt ein natives Transferereignis, fällt die Extraktion auf ERC20-Ereignisse zurück.

**Nachweisgrenze:** Durch H02 werden derzeit alle regulären Belege vorher abgewiesen. Eine aktuell ausnutzbare falsche Gutschrift wurde nicht nachgewiesen. Die Lücken müssen dennoch gemeinsam mit H02 behoben werden. Arc beschreibt native Ereignisse als maßgebliche Quelle und dokumentiert Sonderfälle für Null- und Selbsttransfers. [USDC-Systemereignisse](https://docs.arc.io/arc/references/usdc-system-events)

**Maßnahme:** Einen eindeutig unterstützten äußeren EOA-Aufruf einschließlich Ziel, Datenhash, Format, Referenz, Absender und tatsächlichem nativen Transfer validieren. Mehrdeutige Belege und Selbstzahlungen ausdrücklich ablehnen.

### M07: Der Server akzeptiert Nullbeträge und begrenzt Beträge nicht vollständig

**Ort:** `src/routes/api/requests/+server.ts:7`.

Die Zeichenkettenprüfung akzeptiert `0`, obwohl die Fehlermeldung einen positiven Betrag verlangt. Test A06 erhält für eine solche Anforderung HTTP 201. Es fehlen außerdem eine begrenzte Eingabelänge und eine Obergrenze passend zur Vertragskodierung.

**Maßnahme:** Nach der Syntaxprüfung ganzzahlig in kleinste Einheiten umrechnen und `0 < amount <= uint256_max` prüfen. Eine fachlich sinnvolle kleinere Obergrenze kann zusätzlich gelten.

### M08: Zahlungsnachweise und geschlossene Links zeigen falsche Statusbezeichnungen

**Ort:** `src/routes/receipt/[token]/+page.svelte:46` und `:52`; `src/routes/pay/[token]/+page.svelte:36` und `:120`.

Der Nachweis zeigt „Payment verified“ unabhängig von tatsächlich vorhandenen Zahlungen. Ein offener Datensatz erscheint als „Partial settlement“. Ein geschlossener, noch unbezahlter Link wird über denselben Zweig wie ein vollständig bezahlter Link als „Request settled“ bezeichnet.

**Maßnahme:** Nachweisstatus aus verifizierten Eingängen ableiten. Linkschließung und Zahlungserfüllung als unterschiedliche Zustände darstellen. Offene Anforderungen ohne Eingang dürfen keinen Zahlungsnachweis suggerieren.

### M09: Kurze Kennungen erhöhen Kollisionsrisiken

**Ort:** `src/routes/api/requests/+server.ts:27`; `src/routes/api/pay/[token]/verify/+server.ts:39`; `packages/arc-payment-core/src/index.ts`, Funktion `makeMemoId`.

Interne Anforderungskennungen enthalten nur acht Hex-Zeichen, also 32 Bit Zufallsraum. Öffentliche Tokens enthalten 48 Bit. Auch die Sofortprüfung verwendet eine kurze Zahlungskennung. Bei 32 Bit liegt die Kollisionswahrscheinlichkeit nach ungefähr 77.000 erzeugten Kennungen bei 50 Prozent. `INSERT OR IGNORE` kann bei einer kollidierenden Zahlungskennung einen anderen Eingang stillschweigend ignorieren.

Die Memo-Kennung wird aus dem öffentlichen Token abgeleitet und besitzt deshalb keine unabhängige Zufallsentropie. Eine praktisch durchgeführte Suche nach fremden Links wurde nicht vorgenommen.

**Maßnahme:** Vollständige zufällige Kennungen mit mindestens 128 Bit verwenden. Zahlungen deterministisch über Netzwerk, Transaktionshash und Ereignisposition identifizieren. Nur den vorgesehenen Eindeutigkeitskonflikt behandeln. Memo-Referenzen unabhängig mit 32 zufälligen Bytes erzeugen.

### M10: Die dokumentierte Trennung von Testbetrieb und Mainnet fehlt

**Ort:** `src/lib/config.ts:3`; `src/lib/server/auth.ts:15`; `workers/indexer.ts:14`; `src/lib/wallet.ts:83`; `.env.example` und Wrangler-Konfigurationen.

Wesentliche Netzwerkparameter sind fest auf Mainnet eingestellt. Eine entsprechend getrennte Testnet-Konfiguration ist im ausführbaren Ablauf nicht umgesetzt. Die Wallet-Funktion sendet direkt und implementiert die geplanten Prüfungen auf Selbstzahlung, Wallet-Typ sowie eine eigene Simulation und Gebührenvorschau nicht vollständig.

**Auswirkung:** Auch lokale Bedienversuche können eine Mainnet-Zahlung anfordern. Die Wallet-Bestätigung bleibt erforderlich. **Maßnahme:** Durchgängige validierte Netzwerkkonfiguration für Oberfläche, Authentifizierung, RPC und Indexer einführen. Testumgebung und Produktion getrennt betreiben und vor dem Senden den unterstützten Zahlungsweg prüfen.

## Abhängigkeiten

Die Paketprüfung meldete sechs Paketpositionen: eine hohe, zwei mittlere und drei niedrige Einstufungen. Darunter befinden sich abhängige Pakete, weshalb dies nicht sechs unabhängigen Schwachstellen entspricht.

| Meldung                                                                                                             | Installierter Stand und Bewertung                                                                                                                                                                                     | Maßnahme                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [Drizzle: GHSA-gpj5-g38j-94v9](https://github.com/drizzle-team/drizzle-orm/security/advisories/GHSA-gpj5-g38j-94v9) | `drizzle-orm 0.44.7`, hoch. Betroffen ist die Behandlung von SQL-Bezeichnern. Die untersuchten D1-Abfragen nutzen feste SQL-Texte und gebundene Werte. Ein erreichbarer SQL-Injektionspfad wurde nicht nachgewiesen.  | Auf eine kompatible Version ab `0.45.2` aktualisieren.                                                            |
| [Vitest: GHSA-82fw-gwwq-j7x9](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9)         | `vitest` und `@vitest/mocker 3.2.7`, mittel. Betrifft die Entwicklungs- beziehungsweise Mock-Server-Oberfläche. Der vorhandene CI-Aufruf `vitest run` belegt keine produktive Exposition.                             | Kompatibles Upgrade auf eine behobene Version ab `4.1.11` prüfen. Entwicklungsserver nicht öffentlich exponieren. |
| [cookie: GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x)                                    | `cookie 0.6.0`, niedrig, transitiv einschließlich Framework-Paketen gemeldet. Im Projekt sind Cookie-Name und Pfad fest definiert. Eine Ausnutzung über benutzergesteuerte Cookie-Attribute wurde nicht festgestellt. | Kompatibles Framework-Update oder geprüftes Override auf eine behobene Cookie-Version ab `0.7.0`.                 |

`npm audit fix --force` sollte nicht ungeprüft eingesetzt werden. Die vorgeschlagenen transitiven Lösungen enthalten unpassende Framework-Downgrades. Nach gezielten Updates sind Typprüfung, Tests und Build erneut erforderlich.

## Vorhandene Schutzmaßnahmen und Grenzen

Die untersuchten SQL-Abfragen verwenden Parameterbindung. Svelte übernimmt reguläre Text-Escapes; es wurde kein entsprechender ungefilterter HTML-Ausgabepfad gefunden. Die Sitzungscookies verwenden `HttpOnly` und `SameSite=Lax`, bei HTTPS außerdem `Secure`. Die standardmäßige SvelteKit-Prüfung für formularbasierte Cross-Origin-Anfragen wurde nicht abgeschaltet. Aus dem Fehlen eines eigenen CSRF-Tokens folgt deshalb hier kein belegter CSRF-Befund.

Die normale Anforderungserstellung bindet die Empfängeradresse serverseitig an die angemeldete Wallet. Die Datenbank besitzt eine Eindeutigkeitsregel für Transaktionshash und Ereignisposition. Diese Maßnahmen sind sinnvoll, beheben aber nicht die beschriebenen Fehler.

Eine explizite Content Security Policy und ein Schutz gegen fremde Einbettung sind im Projekt nicht konfiguriert. Das ist eine zusätzliche Härtungsmaßnahme, kein nachgewiesener XSS-Angriff. Ob entsprechende Header extern gesetzt werden, blieb ungeprüft.

## Empfohlene Reihenfolge der Behebung

1. Öffentliche Datenmodelle korrigieren und produktive Zahlungen bis zur erfolgreichen Ende-zu-Ende-Prüfung sperren.
2. Belegprüfung vollständig rekonstruieren, einschließlich Transaktionsdaten und nativer Ereignisse. Voll-, Teil- und Überzahlung sowie abweichende Absender, Empfänger und Referenzen prüfen.
3. Geldbeträge konsequent von Anzeigeformaten trennen. Speicherung und erneutes Laden bei kleinen, großen und sechsstelligen Nachkommabeträgen testen.
4. Dauerhafte Sitzungen, atomaren Nonce-Verbrauch, Logout-Widerruf und geschlossene Fehlerbehandlung bei fehlender DB umsetzen.
5. Die Oberfläche mit tatsächlichen Kontodaten verbinden. Gesendete Transaktionen nach Neuladen wiederfinden und verzögerte Prüfung ohne irreführende erneute Zahlungsaufforderung behandeln.
6. Indexer-Rücklauf, verlässliche Zeitangaben, Anfragelimits, Kennungen und Netzwerktrennung ergänzen. Betroffene Abhängigkeiten gezielt aktualisieren.
7. Erst danach einen belegten Testnet-Durchlauf und einen kontrollierten Mainnet-Durchlauf durchführen. Die bisherige Testsuite genügt nicht als Freigabekriterium.

Die beschriebenen Korrekturen wurden im Anwendungscode, im Indexer, im gemeinsamen Prüfmodul, in der D1-Migration und in der Konfiguration umgesetzt. Eine reale Arc-Testnet- und Mainnet-Abnahme bleibt als externer Freigabeschritt offen.
