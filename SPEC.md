# Budget-Gewächshaus: Spezifikation

Web-App (PWA) fürs iPhone, gehostet auf GitHub Pages, läuft offline vom Home-Bildschirm.
Alle Daten nur auf dem Gerät (localStorage), Export/Import als JSON-Datei.
Sprache der Oberfläche: Deutsch. Währung: Euro, Format `1.234,56 €`.

## Technik

- Reines HTML/CSS/JavaScript, ES-Module, kein Build-Schritt, keine externen Bibliotheken.
- Dateien:
  - `index.html`, `styles.css`
  - `js/logik.js`: reine Budget-Rechenfunktionen, kein DOM-Zugriff
  - `js/spiel.js`: Credits, XP, Level, Serien, Abzeichen, Challenges, Shop (reine Funktionen)
  - `js/szene.js`: zeichnet das isometrische Gewächshaus als SVG
  - `js/speicher.js`: Laden/Speichern/Export/Import, Versionsfeld `schema: 1`
  - `js/ui.js`: Bildschirme und Formulare
  - `manifest.webmanifest`, `sw.js` (Cache-first, offline), `icons/`
  - `tests.html` + `js/tests.js`: Tests der Rechenlogik im Browser
- iPhone: `apple-mobile-web-app-capable`, Safe-Area (`env(safe-area-inset-*)`), Schrift mind. 16 px in Eingabefeldern (sonst zoomt iOS), Touch-Ziele mind. 44 px.
- Beim Start `navigator.storage.persist()` anfragen.

## Datenmodell (localStorage-Schlüssel `budgetgarten`)

```
{
  schema: 1,
  einstellungen: { gehaltstag: 27, ersteinrichtungFertig: false, push: {abonniert: false} },
  kategorien: [ { id, name, emoji, eigene: false } ],
  vertraege: [ { id, art: "einnahme"|"ausgabe", name, betrag, intervall: 1|3|6|12,
                 ersteFaelligkeit: "YYYY-MM-DD", kategorie, istGehalt: false, ende: null|"YYYY-MM-DD" } ],
  gehaltseingaenge: [ "YYYY-MM-DD" ],          // tatsächliche Eingangstage, überschreiben gehaltstag
  buchungen: [ { id, art: "einnahme"|"fixkosten"|"ausgabe", name, betrag, datum, kategorie, notiz } ],
  ruecklagen: [ { id, name, betragProJahr } ], // freie Rücklagen, z. B. Geschenke
  sparziele:  [ { id, name, proMonat, zielsumme|null, angespart } ],
  abschluesse: [ { zeitraumStart, zeitraumEnde, rest, gutgeschrieben: {sparzielId: cent}, uebertrag } ],
  spiel: { samen, xp, serie, besteSerie, abzeichen: [], challenges: { [wochenbeginn]: [...] },
           bewertet: { tage: [], wochen: [], zeitraeume: [] },
           gewaechshaus: { moebel: [ {id, typ, gx, gy, drehung} ],
                           pflanzen: [ {id, typ, stufe, ort} ], deko: [ {id, typ, ort} ] } }
}
```

Beträge intern in Cent (Ganzzahlen), nie Gleitkomma. Kein Sparschwein.

Standard-Kategorien (mit Emoji, bearbeitbar, eigene anlegbar): Lebensmittel 🛒, Essen gehen 🍝,
Transport 🚌, Freizeit 🎟️, Shopping 🛍️, Gesundheit 💊, Haushalt 🧽, Sonstiges ✨.
Vertragskategorien: Wohnen, Versicherung, Abos, Mobilität, Kommunikation, Sonstiges.

## Ersteinrichtung

Beim ersten Start ein Assistent in Schritten: 1. Gehalt (Betrag, üblicher Eingangstag)
2. weitere regelmäßige Einnahmen 3. Verträge/Fixkosten (Name, Betrag, Intervall monatlich/
vierteljährlich/halbjährlich/jährlich, nächste Fälligkeit, Kategorie), schnelle Vorlagen-Knöpfe
(Miete, Strom, Handy, Internet, Haftpflicht, Kfz-Versicherung, Streaming, Fitness)
4. Sparziel(e) 5. Zusammenfassung mit errechnetem Tagesbudget 6. Startpflanzen + Möbel gratis.
Alles später unter „Ziele & Verträge“ änderbar.

## Budget-Logik (`logik.js`)

**Zeitraum.** Beginnt am Tag des Gehaltseingangs. Start = jüngster Eintrag in
`gehaltseingaenge` am oder vor dem Stichtag, sofern er nicht älter als 40 Tage ist; sonst der
letzte `gehaltstag` am oder vor dem Stichtag (Tag größer als Monatslänge → letzter Tag des
Monats). Ende = Tag vor dem nächsten erwarteten Gehaltstag (gleicher Tag im Folgemonat,
ebenfalls gekappt). Am erwarteten Gehaltstag fragt die App „Gehalt eingegangen?“ (Ja → Datum
in `gehaltseingaenge`).

**Fälligkeiten.** Ein Vertrag ist fällig an ersteFaelligkeit + k × intervall Monate (k ≥ 0,
Tag gekappt auf Monatslänge, nicht nach `ende`).

**Verfügbar im Zeitraum** V =
  + Einnahme-Verträge, deren Fälligkeit im Zeitraum liegt (monatliche und nicht-monatliche:
    nicht-monatliche Einnahmen zählen erst, wenn sie fällig sind)
  + einmalige Buchungen `einnahme` im Zeitraum
  − Ausgabe-Verträge mit intervall 1 (einmal je Zeitraum)
  − Ausgabe-Verträge mit intervall > 1: betrag / intervall pro Zeitraum (geglättet, unabhängig
    von der Fälligkeit; bei Fälligkeit wird aus der Rücklage bezahlt, kein Budgeteinbruch)
  − einmalige Buchungen `fixkosten` im Zeitraum
  − Summe(ruecklagen.betragProJahr / 12)
  − Summe(sparziele.proMonat)
  + Übertrag aus dem letzten Abschluss.
Variable Ausgaben (`ausgabe`) werden NICHT von V abgezogen, sondern gegen das Tagesbudget gerechnet.
Rücklagenstand je Vertrag (Anzeige): angesammelte Raten seit letzter Fälligkeit.

**Tagesbudget** für Tag d: B(d) = (V − Ausgaben vor d im Zeitraum) / (Tage von d bis Ende, inkl. d),
kaufmännisch auf Cent gerundet. Rest heute = B(heute) − Ausgaben heute. Dadurch wird
Unverbrauchtes automatisch auf die Resttage verteilt und Überzug von ihnen abgezogen.
Negativer Wert ist erlaubt und wird rot gezeigt.

**Woche** = Montag bis Sonntag, geschnitten mit dem Zeitraum.
Wochenbudget W = B(erster Wochentag im Zeitraum) × Anzahl Wochentage im Zeitraum.
Rest Woche = W − Ausgaben dieser Woche.

**Ziel erfüllt:** Tag: Ausgaben(d) ≤ B(d). Woche: Ausgaben ≤ W. Zeitraum: R = V − Ausgaben ≥ 0.

**Monatsabschluss** (automatisch für abgeschlossene Zeiträume, einmalig): R ≥ 0 → jedes
Sparziel bekommt proMonat gutgeschrieben; den Rest R wählt man (Dialog beim nächsten Öffnen):
in ein Sparziel oder Übertrag in den nächsten Zeitraum (Vorgabe: Übertrag). R < 0 → gutgeschrieben
wird insgesamt max(0, Σ proMonat + R), anteilig nach proMonat verteilt; kein Übertrag.

Pflichttests (in `tests.js`):
1. Gehaltstag 27, kein Eingang, Stichtag 2026-10-10 → Zeitraum 2026-09-27 bis 2026-10-26.
2. Gehaltstag 31, Stichtag 2026-02-15 → Start 2026-01-31, Ende 2026-02-27.
3. Gehaltseingang 2026-09-25 (früher als Tag 27), Stichtag 2026-10-10 → Start 2026-09-25, Ende 2026-10-26.
4. V = 3000 €, 30 Tage, keine Ausgaben → B(Tag 1) = 100,00 €.
5. Tag 1 ausgegeben 40 € → B(Tag 2) = 2960 / 29 = 102,07 €.
6. Tag 1 ausgegeben 160 € → B(Tag 2) = 2840 / 29 = 97,93 €.
7. Gehalt 2000 € (monatlich), Miete 800 € (monatlich), Sparziel 150 €/Monat, Rücklage 120 €/Jahr → V = 1040 €.
8. Versicherung 300 € halbjährlich, fällig 2026-10-03 → zieht im Zeitraum 2026-09-27…2026-10-26 genau 50 € ab, ebenso in einem Zeitraum ohne Fälligkeit.
9. Urlaubsgeld 500 € jährlich fällig 2026-06-30 → zählt im Juni-Zeitraum voll, im Oktober-Zeitraum 0.
10. Monatlicher Vertrag mit ersteFaelligkeit 2026-08-31 im Februar-Zeitraum → fällig am 28.02.
11. Woche, die vor Zeitraumbeginn startet, zählt nur die Tage im Zeitraum.
12. Abschluss: Sparziele 100 € + 50 €, R = −60 € → gutgeschrieben 90 € (60 € + 30 €).

## Benachrichtigung 22 Uhr

Web-Push (iOS ab 16.4, nur als Home-Bildschirm-App). `sw.js` behandelt `push` (zeigt
„Wie viel hast du heute ausgegeben? 🌱“) und `notificationclick` (öffnet `./?eintragen=heute`).
In den Einstellungen: Knopf „Erinnerung aktivieren“ → Erlaubnis + `pushManager.subscribe`
mit VAPID-Public-Key → zeigt das Abo-JSON mit Kopieren-Knopf und Anleitung.
GitHub Actions `.github/workflows/erinnerung.yml`: Cron `50 19,20 * * *` (UTC), Skript
`tools/push.mjs` (npm-Paket web-push) sendet nur im Fenster 21:40 bis 22:40 Berliner Zeit und
wartet bei frühem Start bis 22:00 (genau ein Lauf trifft, Sommer wie Winter; Verspätungen bis 40 min ok). Secrets: VAPID_PUBLIC, VAPID_PRIVATE, PUSH_ABO.

## Spiel (`spiel.js`)

Währung: **Samen** (Credits). XP = Summe aller je verdienten Samen (sinkt nie).
Level n ab XP = 100 × n × (n − 1) / 2 … (Level 1 bei 0, Level 2 bei 100, Level 3 bei 300 …).

Bewertung läuft beim App-Start und nach jeder Buchung für alle abgeschlossenen, noch nicht
bewerteten Tage/Wochen/Zeiträume (gespeichert in `spiel.bewertet`, damit nie doppelt).

| Ereignis | Samen |
|---|---|
| Tag im Budget | 10 |
| Mindestens eine Buchung an dem Tag | 2 |
| Woche im Budget | 50 |
| Zeitraum im Budget (Sparziele bedient) | 200 |
| Jeder 7. Tag einer Serie | 30 |
| Wochen-Challenge erfüllt | 40 bis 80 |

**Serie:** aufeinanderfolgende Tage im Budget. Tag über Budget → Serie 0, und die Pflanzen
lassen sichtbar die Köpfe hängen, bis der nächste Tag im Budget ist (nur optisch, nichts geht verloren).

**Credit-Anzeige:** Kein Sparschwein. Oben rechts über der Szene eine Münz-Anzeige
(goldene Münze mit Samen-Symbol + Zahl), daneben Level-Abzeichen mit XP-Balken.
Beim Verdienen kurze Animation (Münzen fliegen zur Anzeige, Zahl zählt hoch).

**Wochen-Challenges:** jede Woche 2 zufällig (Seed = Wochenbeginn) aus einem Pool, z. B.
„2 Tage ohne Ausgaben“, „Woche 15 % unter Wochenbudget“, „jeden Tag etwas eintragen“,
„keine Ausgabe in Kategorie Essen gehen“, „5 Tage im Budget“.

**Abzeichen:** Erste Buchung, 7er-Serie, 30er-Serie, erste Woche im Budget, erster Monat im
Budget, 100 € / 500 € / 1000 € angespart, Sparziel erreicht, 10 Pflanzen, Level 5, Level 10.

**Shop:** Pflanzen, Möbel, Deko, Erweiterungen. Preise und Freischalt-Level stehen in
Tabellen am Anfang von `spiel.js`.

*Tempo „mittel“* (Richtwert: guter Tag ≈ 12 Samen, gute Woche ≈ 135 + Challenges ≈ 220):
kleine Pflanze 40 bis 60, große Pflanze 150 bis 250, kleine Deko 30 bis 80, Möbel 150 bis 350,
große Deko (Springbrunnen) 500, Erweiterung 7 × 7 = 1000 (ab Level 6), 8 × 8 = 2000 (ab Level 10).
Pflanze leveln: Stufe 2 = 30 %, Stufe 3 = 60 %, Stufe 4 = 100 % des Kaufpreises.
Verkaufen gegen 50 % des Kaufpreises möglich. Teurere Artikel werden über Level freigeschaltet
(Level 1: 6 Pflanzen, 3 Möbel, 4 Deko; je Level 1 bis 2 weitere).
Start: Holztisch, Holzregal, eine Efeutute Stufe 1, 50 Samen.

*Über Budget:* nur optisch welk + Serie 0. Keine Samen weg, nichts geht ein.

*Pflanzen* tragen echte Namen und sehen botanisch erkennbar aus (Blattform, Wuchs, Blüte).
Kauf als Steckling/Sämling (Stufe 1), dann mit Samen auf Stufe 2 bis 4 leveln, jede Stufe
größer, Stufe 4 blüht bzw. trägt Früchte, sofern die Pflanze das tut. Katalog (erweiterbar):
Monstera deliciosa, Efeutute, Bogenhanf, Geigenfeige, Glücksfeder, Aloe vera, Goldkugelkaktus,
Echeverie, Phalaenopsis-Orchidee, Calathea, Grünlilie, Bostonfarn, Lavendel, Basilikum,
Erdbeere, Tomate, Sonnenblume, Zitronenbäumchen, Ficus-Bonsai, Kletterrose.
Jede Pflanze hat eine Größenklasse: klein (passt auf Regal/Tisch), groß (nur Boden).

*Möbel* sind Stellflächen für Pflanzen und kaufbar in verschiedenen Looks, z. B.
Pflanzentisch (Naturholz, Weiß lackiert, Gusseisen-Gärtnertisch), Leiterregal, Wandregal,
Metallregal Industrie, Rattan-Etagere, Blumenhocker, Holzkiste, Steinsockel.
Jedes Möbelstück belegt Bodenfelder (Größe in Feldern) und bietet eigene Stellplätze
(Anzahl und Höhe z je Möbeltyp). Möbel lassen sich verschieben und drehen (0°/90°).
Startausstattung gratis: ein Pflanzentisch Naturholz und ein Holzregal.

*Platzierung:* Bodenraster 6 × 6 Felder. Große Pflanzen, Möbel und Boden-Deko belegen
Felder; kleine Pflanzen stehen auf Möbel-Stellplätzen oder auf einem freien Feld.
Datenmodell: `moebel: [ {id, typ, gx, gy, drehung} ]`, Pflanze/Deko mit
`ort: {feld: [gx, gy]} | {moebel: id, platz: n}`.

*Deko:* Lichterkette, Laterne, Bank, Gießkanne, Katze, Teppich, Hängeampel, Vogelhaus,
Springbrunnen, Gartenzwerg, Windspiel.

*Erweiterungen:* größere Grundfläche (7 × 7, 8 × 8), andere Bodenbeläge, Dachformen;
durch Level freigeschaltet.

## Gestaltung

Stil wie Referenzbild (isometrischer Cozy-Raum, Pastell, Pixel-/Illustrationslook):
- Hintergrund Mint `#a9d3a5`, warme Creme- und Pfirsichtöne, Holzbraun, Konturen dunkelbraun `#6b4a3a` statt Schwarz.
- **Offenes Gewächshaus** isometrisch: Bodenplatte mit abgerundeter grauer Kante, Holzdielen,
  zwei hintere Wände aus Glas in Holzrahmen (Sprossenfenster mit Himmel und Wolken dahinter),
  vorn offen (Schnitt), Satteldach-Andeutung, Efeu und Blüten an den Kanten,
  Lichterkette, Holzzaun vorn mit Blumenkasten.
- Stellplätze auf Boden und Regalen, auf denen gekaufte Pflanzen und Deko erscheinen.
- UI: abgerundete Karten in Creme mit weichem Schatten, Schrift „Nunito“-artig (Systemschrift
  `ui-rounded` mit Fallback), Akzent Koralle `#e88a7a`, Positiv Grün `#6fae6a`.
- Startbildschirm: oben Rest heute groß, darunter Wochen-Rest, dann die Szene, unten
  Tab-Leiste: Garten · Buchen · Übersicht · Ziele · Shop. Plus-Knopf für schnelle Ausgabe.

## Raritäten (ab 1.1)

Seltene, echte Pflanzen, nicht kaufbar. Jede wird durch eine Leistung freigeschaltet und kann genau
einmal gepflanzt werden (danach nicht verkaufbar, nicht doppelt). Grafik in `js/grafik/raritaeten.js`
(Export `RARITAETEN`, gleiche Schnittstelle wie PFLANZEN plus `bedingung` als Text).

| Typ | Name | Freischaltung | Größe |
|---|---|---|---|
| koenigin_der_nacht | Königin der Nacht | 30-Tage-Serie | groß |
| jadewein | Jadewein | erstes Sparziel komplett erreicht | groß |
| thai_constellation | Monstera „Thai Constellation“ | 3 Zeiträume in Folge im Budget | groß |
| pink_princess | Pink Princess Philodendron | 4 Wochen in Folge alle Challenges | klein |
| drachenbaum | Drachenbaum | insgesamt 1.000 € angespart (Summe angespart aller Sparziele) | groß |
| gold_ginkgo | Goldener Ginkgo-Bonsai | Level 15 | klein |

Datenmodell: `spiel.raritaeten: { [typ]: { freigeschaltet: "YYYY-MM-DD", gepflanzt: false } }`.
Gepflanzte Rarität im Gewächshaus als Pflanze mit `rar: true`. Leveln mit Samen möglich (doppelte
Kosten einer großen Pflanze, Basis 300). Anzeige: goldener Topf, Funkeln (SVG-Animation), Namensschild.
Shop-Reiter „Raritäten“: freigeschaltet und nicht gepflanzt → „Pflanzen (gratis)“; gesperrt → Silhouette + Bedingung + Fortschritt.
Freischaltung löst einen eigenen Fest-Dialog aus.
