# Version 2.0: Beete, Samentüten, Mid-Century, Spätspiel

Verbindlich für alle Agenten. Schlüssel (Typ-Namen) exakt so verwenden.

## 1. Stil: Mid-Century Modern

Alle Möbel, Holz-Deko und der Gewächshausrahmen.
- Teak: Grund #b8743d, Licht #d99a5b, Schatten #8a5228, Maserung #9c5f2e (fein, längs).
- Beine: schräg ausgestellt (ca. 10°), nach unten spitz zulaufend, Messingkappen #c9a14a.
  Alternativ Haarnadelbeine (zwei dünne schwarze Stäbe #2b2b2b, V-Form).
- Ecken leicht abgerundet, Flächen ruhig, wenig Ornament.
- Akzentfarben: Senf #d9a441, Petrol #2f6f73, Gebranntes Orange #d9693b, Creme #f3e6cf, Salbei #9fb79a.
- Edelstahl (Beete): Grund #c9cdd2, Licht #eef1f4, Schatten #9aa1a8, feiner Glanzstreifen.
- Konturen wie STIL.md (#6b4a3a, 1.0 bis 1.2).

## 2. Beete und Saatgut

Möbel (in `js/grafik/moebel2.js`, Export `MOEBEL2`, gleiche Schnittstelle wie MOEBEL, zusätzlich `beet: true`):
| Typ | Name | Größe | Plätze | Level | Preis |
|---|---|---|---|---|---|
| kraeuterbeet | Kräuterbeet | 2×1 | 4 Beetplätze | 8 | 500 |
| hochbeet | Hochbeet | 2×2 | 6 Beetplätze | 10 | 900 |
Edelstahl-Trog auf Teak-Beinen, Erde sichtbar. Plätze haben `beet: true`.

Saatgut-Pflanzen (Grafik in `js/grafik/saat.js`, Export `SAAT = { typ: {name, seltenheit, zeichne(stufe, welk)} }`,
OHNE Topf, Ursprung = Erdoberfläche, wachsen aus der Erde):
- gewöhnlich: schnittlauch, petersilie, minze, thymian, rosmarin, salbei
- selten: basilikum, tomate, erdbeere, chili, paprika, radieschen
- episch: artischocke, zitronengras, regenbogenmangold, physalis
- legendär: safran, wasabi, goldtomate
Seltenheitsfarben: gewöhnlich #9aa1a8, selten #6fae6a, episch #9b6fc9, legendär #e8b83a.

Regeln (`js/spiel.js`):
- Saatgut-Pflanzen nur auf Beetplätzen, normale Topfpflanzen nie auf Beetplätzen.
- Inventar `spiel.saatgut = { typ: anzahl }`. Max. 3 je Sorte; jedes weitere wird sofort umgetauscht:
  gewöhnlich 10, selten 20, episch 40, legendär 100 Samen.
- `samentuete(daten, heute)`: kostet 50 Samen, ab Level 8. Wahrscheinlichkeiten 60/28/10/2 %.
  Garantie: `spiel.tuete = {seitSelten, seitLegendaer}`; spätestens jede 10. Tüte mindestens selten,
  jede 40. legendär. Zufall deterministisch aus (heute, Zähler, Anzahl geöffneter Tüten).
  Rückgabe `{daten, sorte, seltenheit, umgetauscht: samen|0}` oder `{fehler}`.
- `saatPflanzen(daten, typ, ort)`: verbraucht 1 Saatgut, Pflanze `{id, typ, stufe: 1, ort, saat: true, ernteTage: 0}`.
- Wachstum: Beetpflanzen wachsen NICHT mit Samen, sondern durch Budget-Tage: in `bewerte()` je Tag im
  Budget `fortschritt += 1`; Stufe steigt alle 2 Budget-Tage (1→2→3→4).
- Ernte: Stufe 4 und `ernteBereit` (3 Budget-Tage seit letzter Ernte) → `ernten(daten, id, heute)`:
  Samen gewöhnlich 8, selten 15, episch 30, legendär 60; 10 % Chance auf eine gratis Samentüte
  (deterministisch). Pflanze bleibt Stufe 4.
- Basilikum, Tomate, Erdbeere als Topfpflanzen aus PREISE_PFLANZEN entfernen (nicht mehr kaufbar);
  vorhandene im Garten bleiben, sind normal verkaufbar.

## 3. Spätspiel bis Level 25

Neue Topfpflanzen (Grafik `js/grafik/pflanzen2.js`, Export `PFLANZEN2`, gleiche Schnittstelle wie PFLANZEN):
| Typ | Name | Größe | Level | Preis |
|---|---|---|---|---|
| strelitzie | Strelitzie | groß | 6 | 300 |
| alocasia | Alocasia | groß | 7 | 320 |
| olivenbaum | Olivenbaum | groß | 9 | 400 |
| kentia | Kentia-Palme | groß | 11 | 450 |
| feigenbaum | Feigenbaum | groß | 12 | 480 |
| kannenpflanze | Kannenpflanze | klein | 13 | 260 |
| bananenstaude | Bananenstaude | groß | 14 | 600 |
| hoya | Wachsblume (Hoya) | klein | 16 | 300 |

Neue Möbel (`MOEBEL2`):
| Typ | Name | Größe | Plätze | Level | Preis |
|---|---|---|---|---|---|
| sideboard | Sideboard | 2×1 | 3 | 6 | 380 |
| pflanzentreppe | Pflanzentreppe | 1×1 | 3 | 7 | 300 |
| vitrine | Glasvitrine mit Terrarium | 1×1 | 2 | 9 | 550 |
| sputnik | Sputnik-Pflanzenständer | 1×1 | 4 | 12 | 650 |
| hochregal | Raumteiler-Regal | 3×1 | 6 | 15 | 900 |

Neue Deko (`js/grafik/deko2.js`, Export `DEKO2`, gleiche Schnittstelle wie DEKO):
| Typ | Name | Level | Preis |
|---|---|---|---|
| katzenkorb | Katzenkorb | 5 | 180 |
| leseecke | Leseplatz | 6 | 220 |
| loungesessel | Lounge-Sessel | 7 | 350 |
| haengesessel | Rattan-Hängesessel | 8 | 420 |
| bogenlampe | Bogenlampe | 9 | 300 |
| schaukelstuhl | Schaukelstuhl | 10 | 380 |
| plattenspieler | Plattenspieler-Möbel | 11 | 450 |
| lichterlaube | Lichterbogen | 12 | 500 |
| aquarium | Aquarium | 14 | 700 |
| teewagen | Teewagen | 16 | 400 |
| skulptur | Messing-Skulptur | 18 | 800 |
(leseecke, haengesessel, schaukelstuhl, lichterlaube, katzenkorb gibt es als Entwurf in js/grafik/extras.js;
in deko2.js im Mid-Century-Stil neu zeichnen.)

Erweiterungen: 9×9 Level 15 (3500), 10×10 Level 20 (6000). Szene muss groesse 9 und 10 können.

## 4. Gewächshaus-Designs

`spiel.design = {boden, rahmen, dach}`; Kauf einmalig, dann frei wechselbar.
- boden: dielen (Start), terrazzo (L7, 400), fischgraet (L11, 600), marmor (L19, 800), fliesen (L24, 700)
- rahmen: teak (Start), petrol (L9, 300), senf (L21, 500), messing (L22, 600)
- dach: entfällt (Nachtrag 14.10.). Gekaufte Dächer werden erstattet, `spiel.design.dach` wird ignoriert.
`spiel.designs = [gekaufte ids]`, Start: dielen, teak. Szene zeichnet nach `zustand.design`.

## 5. Herbarium

`spiel.entdeckt = [typ...]` (jede jemals besessene Pflanze, Saat, Rarität, Saisonpflanze).
Sets mit Bonus (einmalig) und Abzeichen:
- Kräutergarten: schnittlauch, petersilie, minze, thymian, rosmarin, salbei → 150 Samen
- Gemüsebeet: basilikum, tomate, erdbeere, chili, paprika, radieschen → 250
- Tropen: monstera, strelitzie, alocasia, bananenstaude, kentia → 400
- Sukkulenten: kaktus, aloe, echeverie, bogenhanf → 150
- Blütenpracht: orchidee, sonnenblume, kletterrose, lavendel, hoya → 250
- Raritäten: alle 6 → 1000
- Legenden: safran, wasabi, goldtomate → 800

## 6. Saisonale Events

Nach Datum aktiv, Artikel nur dann kaufbar, danach dauerhaft im Besitz.
- Herbst (1.10.–30.11.): kuerbis (Deko, 120), herbstlaub (Deko, 80), zierkuerbis (Saat, episch, nur aus Tüten im Herbst)
- Winter (1.12.–6.1.): weihnachtsstern (Topfpflanze klein, 150), schneelaterne (Deko, 150); Schnee auf dem Dach
- Frühling (1.3.–30.4.): kirschbluete (Topfpflanze groß, 400), tulpen (Topfpflanze klein, 90)
- Sommer (1.6.–31.8.): sonnenschirm (Deko, 200), hibiskus (Topfpflanze groß, 300)
Grafik `js/grafik/saison.js`, Export `SAISON = { typ: {name, art: 'pflanze'|'deko'|'saat', groesse?, zeichne} }`.

## Nachträge (14.10.)
- Level-Lücken geschlossen: teewagen L17, Rahmen senf L21, Rahmen messing L22, aquarium L23, Boden fliesen L24, plattenspieler L25.
- Durch die Garantie (jede 40. Tüte legendär) liegt die tatsächliche Legendär-Quote bei etwa 3,6 %. Im Shop anzeigen: „2 % · garantiert spätestens jede 40. Tüte“.
- Seltenheits-Schlüssel ohne Umlaut: gewoehnlich, selten, episch, legendaer (Anzeige mit Umlaut).
- Saatpflanzen nutzen dieselben Typ-Namen wie Topfpflanzen (z. B. tomate) und tragen saat: true; die Szene zeichnet sie mit SAAT[typ].

## Nachträge (14.10., Dächer und Sparziele)
- Dächer entfallen (offene Ansicht). Die Kategorie dach ist aus den Designs entfernt: bogen und shed sind nicht mehr kaufbar und nicht mehr im Shop, giebel ist nicht mehr in der Liste. `spiel.design.dach` bleibt in den Daten, wird aber ignoriert; die Szene zeichnet kein Dach mehr.
- Erstattung einmalig in `bewerte()`: jedes gekaufte Dach-Design (bogen 700, shed 900) bringt seinen Kaufpreis in Samen zurück (ohne XP) und wird aus `spiel.designs` entfernt. Das Ereignis hat die Art `erstattung` und den Text „Dachdesign erstattet: +x Samen“. Giebel (0 Samen) wird ohne Ereignis entfernt. Beim nächsten `bewerte()` gibt es nichts mehr zu erstatten.
- Neuer Boden marmor (L19, 800) füllt die Lücke bei Level 19. Der Rahmen salbei (L13, 450) entfällt: Level 13 ist schon durch die Kannenpflanze belegt. Bis die Szene Marmor zeichnet, zeigt sie dielen.
- Sparziel-Pflanzen (Ziele, Sheet): nur Topfpflanzen, die der Spieler mit seinem Level kaufen kann (freigeschaltet, gezeichnet, keine Saatgut-Sorten, keine Raritäten). Sortiert nach Level, darunter der Hinweis „Weitere Pflanzen ab höherem Level“. Die Auswahl kommt aus `sparzielPflanzen(daten)` in `js/spiel.js`. Ein bestehendes Ziel mit ungültiger Pflanze behält sie auf der Karte. Beim Öffnen des Sheets wird die erste gültige Pflanze vorgewählt.
