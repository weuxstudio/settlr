# UX Audit: MemoMatch Payment Screen

## 1. Audit Umfang

Untersucht wurde der sichtbare Desktop Zustand einer offenen Zahlungsanforderung vor dem Start der Wallet Interaktion. Grundlage ist `01-payment-screen.png` mit 1203 mal 1054 Pixeln.

Ziel der zahlenden Person ist es, Absender, Anlass, Betrag und Zahlungsweg sicher zu verstehen und die Zahlung ohne vermeidbare Unsicherheit zu starten.

## 2. Gesamtbewertung

Der Screen besitzt eine ruhige Gestaltung, eine klare Betragsdarstellung und eine gut erkennbare Hauptaktion. Die neue Reduktion der technischen Details verbessert die Übersicht. Für eine finanzielle Entscheidung fehlen jedoch zentrale Vertrauensinformationen. Die Wallet Adresse ersetzt derzeit eine erkennbare Identität. Die Rechnungsnummer ersetzt außerdem keinen verständlichen Zahlungszweck.

Der wichtigste Fehler betrifft die Rollenlogik. Im geprüften Zustand erscheinen „Manage request“ und „Pay this request“ gleichzeitig. Der Empfänger erhält damit eine Zahlungsaktion, die bei derselben Wallet fachlich nicht erfolgreich sein kann.

## 3. Schritte und Zustand

### Schritt 1: Zahlungsanforderung einordnen

Zustand: kritisch gemischt.

Die Rechnungsnummer ist prominent und eindeutig. Die angezeigte Wallet Adresse beantwortet jedoch nicht zuverlässig, welche Person oder welches Unternehmen die Zahlung anfordert. Ein konkreter Leistungszweck fehlt ebenfalls.

### Schritt 2: Betrag prüfen

Zustand: gut.

Der offene Betrag ist sofort erkennbar. Währung, Netzwerk und Bestätigungsprinzip stehen in räumlicher Nähe. Die Kennzahlen „Received“ und „Overpaid“ sind bei einer neuen Anfrage jedoch wenig hilfreich und erzeugen den Eindruck einer Verwaltungsansicht.

### Schritt 3: Empfänger und technische Angaben prüfen

Zustand: gut mit Einschränkungen.

Die neuen Ausklappbereiche reduzieren die visuelle Last und bleiben gut auffindbar. Die gekürzte Wallet Adresse im Kopfbereich ist sinnvoll. Vor der Zahlung sollte der konkrete Empfänger dennoch direkt im Zahlungsbereich bestätigt werden, weil die vollständigen Angaben standardmäßig verborgen sind.

### Schritt 4: Zahlungsbetrag und Wallet wählen

Zustand: verbesserungsbedürftig.

Der vorgeschlagene Gesamtbetrag und die Möglichkeit einer Teilzahlung sind verständlich. Die aktive Wallet, ihr USDC Guthaben und der Verbindungszustand sind nicht sichtbar. „Switch wallet account“ bleibt dadurch ohne Kontext. Für unerfahrene Personen ist außerdem nicht ersichtlich, dass eine kompatible Wallet und USDC auf Arc benötigt werden.

### Schritt 5: Zahlung auslösen und Ergebnis erwarten

Zustand: verbesserungsbedürftig.

Die Hauptaktion nennt Betrag und Währung. Der umrandete Stil wirkt jedoch schwächer als eine primäre Finanzaktion. Netzwerkgebühr, Gesamtbelastung und erwartete Bestätigungsdauer bleiben zu abstrakt. Der Hinweis unterhalb der Karte beschreibt einen technischen Zustand, erklärt aber nicht klar, welcher Nachweis nach erfolgreicher Zahlung erscheint.

## 4. Stärken

1. Die visuelle Hierarchie führt von Zweck und Betrag zur Zahlungsaktion.

2. Der Betrag verwendet große, gut lesbare Ziffern und eine eindeutige Währungsangabe.

3. Die rechte Zahlungskarte trennt Aktion und Zusammenfassung sauber von den übrigen Informationen.

4. Die Ausklappbereiche halten technische Daten verfügbar, ohne den Hauptablauf zu überladen.

5. Teilzahlungen werden erklärt und der vollständige Restbetrag ist vorausgewählt.

6. Der Status verwendet Text zusätzlich zur Farbe.

7. Das helle Erscheinungsbild wirkt sachlich und passt zu einer Finanzanwendung.

## 5. UX Risiken

### P1: Empfänger und zahlende Person werden nicht sauber getrennt

„Manage request“ kennzeichnet eine angemeldete Empfängeransicht. Gleichzeitig bleibt „Pay this request“ aktiv. Der Screen sollte in diesem Zustand als Vorschau gekennzeichnet werden und keine Selbstzahlung anbieten.

### P1: Die Identität des Anfordernden bleibt unklar

Eine Wallet Adresse besitzt für die meisten Personen keinen Wiedererkennungswert. Benötigt werden ein öffentlicher Anzeigename, optional ein Logo oder Avatar, eine verifizierbare Website und die Empfängerwallet als technische Ergänzung.

### P1: Der Zahlungszweck ist zu schwach

„Invoice IN 2026 09 001“ benennt ein Dokument, aber keine Leistung. Ein Feld wie „Payment for“ sollte beispielsweise „Website redesign, milestone 2“ anzeigen. Die Rechnungsnummer kann darunter als Referenz stehen.

### P1: Voraussetzungen der Zahlung erscheinen zu spät

Es fehlt ein klarer Hinweis auf Wallet, Arc Netzwerk und verfügbares USDC Guthaben. Ohne diese Information beginnt eine unerfahrene Person einen Ablauf, dessen Voraussetzungen erst im Wallet Dialog sichtbar werden.

### P1: Gesamtbelastung und Gebühren sind nicht ausreichend konkret

Die technischen Angaben dürfen eingeklappt bleiben. Direkt vor der Hauptaktion sollte dennoch „12.00 USDC plus estimated network fee“ erscheinen. Nach der Wallet Verbindung sollten Schätzung und Guthaben aktualisiert werden.

### P2: Der Hauptbutton wirkt visuell sekundär

Der umrandete Button konkurriert mit den übrigen neutralen Flächen. Eine gefüllte Primärfarbe würde die wichtigste Aktion eindeutiger markieren.

### P2: Teilzahlungen sind zu leicht versehentlich möglich

Das Betragsfeld wirkt frei editierbar, obwohl der Normalfall die vollständige Zahlung ist. Der vollständige Betrag sollte zunächst gesperrt angezeigt werden. Eine separate Aktion „Pay a different amount“ kann die Bearbeitung bewusst freigeben.

### P2: Der Status „Ready to pay“ ist zu früh

Vor Wallet Verbindung, Netzwerkprüfung, Guthabenprüfung und Simulation ist die Zahlung noch nicht technisch bereit. „Payment“ wäre neutraler. „Ready to pay“ sollte erst nach den Prüfungen erscheinen.

### P2: Testnet verwendet eine positive grüne Kennzeichnung

Grün kann Verifikation oder Produktionsreife signalisieren. Testnet sollte als gelber Hinweis erscheinen und ausdrücklich erklären, dass Testnet USDC keinen realen Zahlungswert besitzt.

### P2: Die Bestätigung wird technisch statt nutzerbezogen erklärt

„Final after block confirmation“ und der Hinweis unterhalb der Karte setzen Blockchain Wissen voraus. Besser ist eine konkrete Erwartung wie „Confirmation usually takes less than one minute. A verifiable receipt appears here afterward.“

## 6. Barrierefreiheitsrisiken

1. Mehrere Hilfstexte und Fußzeilen verwenden sehr kleine Schrift und geringe Kontraste. Besonders betroffen sind Betragsbeschreibung, Teilzahlungshinweis und Bestätigungshinweis.

2. Die visuelle Prüfung kann Tastaturbedienung, Fokusreihenfolge und Screenreader Ansagen nicht bestätigen. Die Ausklappbereiche sollten ihren Zustand semantisch übermitteln.

3. Der Status nutzt Text und Farbe, was positiv ist. Die grüne Testnet Kennzeichnung besitzt jedoch eine missverständliche Semantik.

4. Der mobile Umbruch, Zoom bis 200 Prozent sowie Validierungsfehler sind im Screenshot nicht prüfbar.

## 7. Priorisierte Empfehlungen

### Sofort

1. Empfängeransicht und Zahleransicht trennen. Für den Empfänger erscheint „Preview payment page“ mit Rückkehr zur Verwaltung. Die Zahlungsaktion wird bei identischer Wallet ausgeblendet oder erklärt gesperrt.

2. Öffentlichen Anzeigenamen und verständlichen Zahlungszweck oberhalb des Betrags anzeigen. Die Wallet Adresse bleibt als überprüfbare technische Identität erhalten.

3. Den Zahlungsstatus der Wallet direkt darstellen: nicht verbunden, verbundenes Konto, falsches Netzwerk, Guthaben ausreichend oder unzureichend.

4. Die Hauptaktion als gefüllten Primärbutton gestalten und den konkreten nächsten Schritt benennen.

### Danach

5. Die vollständige Zahlung als festen Standard verwenden. Teilzahlung wird erst über eine bewusste Nebenaktion aktiviert.

6. Netzwerkgebühr, geschätzte Gesamtbelastung und ungefähren Dollarwert direkt vor der Bestätigung zusammenfassen.

7. Erwartete Dauer, Erfolgsergebnis und Zahlungsnachweis in Alltagssprache erklären.

8. Optional Fälligkeitsdatum, Rechnungsdownload sowie Kontaktmöglichkeit des Anfordernden ergänzen.

## 8. Evidenzgrenzen

Der Audit bewertet einen einzelnen sichtbaren Desktop Zustand. Wallet Auswahl, Fehlerfälle, Ladeverhalten, Bestätigung, mobile Darstellung und Screenreader Ausgabe wurden nicht beobachtet. Eine abschließende Bewertung dieser Zustände benötigt zusätzliche Screenshots oder einen vollständigen Test des Ablaufs.
