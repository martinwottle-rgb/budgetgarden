# Version 2.2: Winter, Saisons in der Szene, Lager

Verbindlich für alle Agenten. Sichtbare Texte deutsch, keine Gedankenstriche. Stil wie STIL.md und SPEC-2.md (Kontur #6b4a3a,
Pastell, Licht von links oben). Kein Node auf dem Rechner: Code sorgfältig auf Syntax lesen.

## 1. Neue Winterartikel (Saison winter, 1.12. bis 6.1.)
Grafik in neuen Dateien, gleiche Schnittstelle wie js/grafik/saison.js (Export-Objekt, Einträge `{ name, art, groesse?, saison: 'winter', zeichne }`,
Pflanzen `zeichne(stufe 1..4, welk, ebene)`, Deko `zeichne()`, Ursprung = Mitte des Bodenkontakts, Hilfen aus js/grafik/hilfen.js).

`js/grafik/winter.js`, Export `WINTER`:
| Typ | Name | Art | Preis |
|---|---|---|---|
| zimmertanne | Zimmertanne | pflanze, groß | 300 |
| strohstern | Strohstern | deko, hängend (`haengend: true`, wie Hängeampel am Haken) | 80 |
| adventskranz | Adventskranz | deko, klein (darf auf Möbel) | 120 |
| schneekugel | Schneekugel | deko, klein, exklusiv (nur Adventskalender Tag 24, nicht kaufbar) | – |

Zimmertanne: `zeichne(stufe, welk, ebene, schmuck)`, `schmuck = { kugeln, strohsterne, lichter, spitze, geschenke }` (je true/false, fehlend = false).
Kugeln rot und gold, kleine Strohsterne, warmweiße Lichterkette in Spiralen, goldener Stern als Spitze, drei Geschenke unter dem Baum.
Ohne Schmuck: naturbelassene Nordmanntanne im Terrakotta-Topf, Etagen aus weichen Nadelbüscheln (keine spitzen Dreiecke), etwas Schnee nur als Kunstschnee-Hauch.

`js/grafik/winter2.js`, Export `WINTER2`:
| Typ | Name | Art | Preis |
|---|---|---|---|
| christrose | Christrose | pflanze, klein | 120 |
| amaryllis | Amaryllis | pflanze, klein | 140 |
| schlitten | Holzschlitten | deko, Boden | 200 |
| teekanne | Teekanne mit Plätzchen | deko, klein (darf auf Möbel) | 90 |

Außerdem in `js/grafik/saison.js`: Schneelaterne ohne die spitzen grünen Dreiecke am Fuß (Nutzer: „die grünen Dinger schauen komisch aus“).
Statt dessen ein weicher Tannenzweig aus vielen kurzen, dünnen Nadelstrichen (Linien 0.6 bis 0.8, zwei Grüntöne) mit drei roten Beeren.

## 2. Baumschmuck (js/spiel.js)
Pflanze `zimmertanne` trägt `schmuck = { kugeln, strohsterne, lichter, spitze, geschenke }`.
Preise im Winter: kugeln 60, strohsterne 50, lichter 80, spitze 70, geschenke 90. Export `schmuecken(daten, pflanzeId, teil, heute)`:
nur Zimmertanne, nur im Winter (oder mit Schmuck-Gutschein jederzeit), jedes Teil einmal. Schmuck-Gutscheine: `spiel.schmuckGutscheine = [teil]`.
Export `SCHMUCK = [{ teil, name, preis }]`.

## 3. Adventskalender (js/spiel.js)
Vom 1. bis 24. Dezember ersetzt ein Türchen den Inhalt des Tagesgeschenks (der Geschenkzähler zählt weiter, Meilensteine kommen dazu).
`tagesgeschenk()` liefert dann zusätzlich `advent: { tag: 1..24 }`. Inhalt nach Tag (Samen immer, dazu teils Gutschein):
1: 30 · 2: 25 + Schmuck kugeln · 3: 30 + Gutschein christrose · 4: 35 · 5: 25 + Schmuck strohsterne · 6 (Nikolaus): 50 + Gutschein teekanne ·
7: 30 · 8: 35 + Schmuck lichter · 9: 30 · 10: 40 + Gutschein strohstern · 11: 30 · 12: 35 + Samentüte (ab Level 8, sonst +30 Samen) ·
13: 30 + Gutschein amaryllis · 14: 35 · 15: 30 + Schmuck spitze · 16: 40 · 17: 30 + Gutschein adventskranz · 18: 35 ·
19: 30 + Gutschein schlitten · 20: 40 · 21: 35 + Schmuck geschenke · 22: 40 · 23: 50 · 24: 100 + Gutschein schneekugel (exklusiv).
Saison-Gutscheine `{ kategorie: 'saison', typ }`: Der Saisonkatalog zeigt den Artikel dann gratis; `saisonKaufen` löst ihn ein.
Die Schneekugel steht nur mit Gutschein im Saisonkatalog (wie die Meilenstein-Deko). Verpasste Türchen gibt es nicht nachträglich.

## 4. Lager (js/spiel.js)
`spiel.lager = [{ id, kategorie: 'pflanze'|'deko'|'moebel'|'saison', typ, eigenschaften }]` (eigenschaften: alles außer id und ort,
z. B. stufe, saat, fortschritt, ernteTage, rar, schmuck, drehung bei Möbeln).
- `einlagern(daten, kategorie, id)`: entfernt das Teil aus dem Gewächshaus, keine Samen. Möbel: alles, was darauf steht, kommt mit ins Lager
  (eigene Einträge). Rückgabe `{ daten, anzahl }`.
- `lagerPlatzieren(daten, lagerId, ort)`: prüft den Ort wie beim Kauf (`pruefeOrt` bzw. `pruefeMoebelPos`), setzt das Teil mit allen
  Eigenschaften zurück, kostenlos, entfernt den Lagereintrag.
- `freiePlaetze` funktioniert für eingelagerte Teile wie für neue (Kategorie und Typ des Lagereintrags).

## 5. Saisons in der Szene (js/szene.js)
- Winter: Schneehauben statt weißer Balken: weiche, bucklige Schneekappen auf Wandoberkanten, Pfosten und Zaunköpfen (Umriss aus Bögen,
  hellblaue Schattenkante unten, einzelne Tropfen und kleine Eiszapfen), Raureif als zarte weiße Eisblumen in den unteren Glasecken,
  dichtere und sichtbare Schneeflocken (weiß mit hellblauer Kontur, 3 Größen, langsames Fallen und Pendeln).
- Blumenkasten vorn je Saison: Frühling Tulpen und Narzissen; Sommer wie bisher; Herbst Heidekraut, Astern und ein paar Blätter;
  Winter Tannenzweige, Christrosen, rote Beeren, Schneehauben. Ohne Saison: wie bisher.
- Fallende Teilchen je Saison: Herbst Blätter (orange, rot, senf), Winter Flocken, Frühling Kirschblütenblätter (rosa), Sommer wenige
  goldene Pollen und ein Schmetterling. Alles vor dem Glas, pointer-events none, `prefers-reduced-motion` ohne Bewegung.

## Nachtrag (23.11.): Platz im Gewächshaus
- Fläche 7 × 7 kostet 600 statt 1000 Samen (Level 6).
- Sechs Haken: h1 und h2 wie bisher, h3 und h4 an Wand A, h5 und h6 an Wand B (hakenFuer in szene.js).
- Wandmöbel (`wand: true` in moebel.js): Wandboard (2 × 1, Bretter in 110 und 160) und neu Wandbord (1 × 1, 90 Samen, Level 4).
  Nur an einer Rückwand (drehung 0: gy 0, drehung 90: gx 0), belegen keinen Boden. Darunter nur Möbel bis 45 hoch und keine großen Pflanzen.
  Wandboards mitten im Raum (aus alten Spielständen) kommen beim nächsten Öffnen samt Inhalt ins Lager.
- Zoom in garten.js: zwei Finger, Verschieben bei Zoom, Doppeltipp, Knopf „Ganzes Gewächshaus“.
