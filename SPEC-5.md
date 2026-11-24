# Version 2.3: Töpfe, Teppiche, Licht je Uhrzeit, „Gestern im Budget“

Verbindlich für alle Agenten. Sichtbare Texte deutsch, keine Gedankenstriche. Stil wie STIL.md (Kontur #6b4a3a, Pastell),
aber plastischer: weiche Verläufe (linearGradient/radialGradient) statt flacher Flächen, Licht von links oben, Glanzkante,
Eigenschatten auf der rechten Seite, weicher Kontaktschatten am Boden. Vorbilder: gemütliche isometrische Zimmer mit warmem Licht.
Node gibt es unter "C:\Program Files\nodejs\node.exe" für `node --check`.

## 1. Töpfe (js/grafik/toepfe.js, Export `TOEPFE`)
Eintrag: `{ name, groesse: 'klein' | 'kuebel', preis, level, zeichne(R, H) }`.
Geometrie wie `topf(R, H)` in js/grafik/pflanzen.js: Ursprung = Mitte der Standfläche (0,0), oberer Rand ist eine Ellipse bei y = -H
mit Radius R (ry = 0.4 R), darin Erde (dunkelbraun mit Krümeln), darunter ein Kontaktschatten. Die Pflanze wird bei y = -H eingesetzt,
deshalb MUSS der obere Rand genau dort liegen und Radius R haben. Die Form darunter ist frei (bauchig, konisch, zylindrisch, mit Fuß).
Verlaufs-Ids mit Zähler eindeutig. Kleine Töpfe für kleine Pflanzen (R etwa 10 bis 14), Kübel für große Pflanzen (R etwa 16 bis 22).

Kleine Töpfe (12, Preis 30 bis 90, Level 1 bis 18):
terrakotta (gratis, Standard, wie bisher), keramik_weiss (matt weiß), keramik_petrol (glänzend petrol), laufglasur (braun-creme mit
Laufglasur wie Geigenfeige-Bild), beton_klein (grau, rau, Poren), korb_klein (Seegras geflochten), terrazzo_klein, emaille (creme mit
blauem Rand), streifen (Keramik creme mit senfgelben Streifen), kupfer (Kupfer glänzend), gesicht (Keramik mit freundlichem Gesicht),
holz_klein (Teak-Holzübertopf mit Messingband).
Kübel (12, Preis 80 bis 260, Level 3 bis 22):
terrakotta_kuebel (gratis, Standard), laufglasur_kuebel (bauchig, dunkelbraun mit cremefarbener Laufglasur unten), korb_kuebel (Seegras
mit Henkeln, wie Strelitzie-Bild), stein_kuebel (rau, grau-ocker, verwittert wie Zamioculcas-Bild), beton_kuebel (hoch, zylindrisch,
anthrazit), keramik_weiss_kuebel (bauchige weiße Vase), rattan_kuebel (Rattan auf Beinchen), zink_kuebel (Zinkeimer mit Griffen),
holz_kuebel (Holzfass mit Reifen), terrazzo_kuebel, petrol_kuebel (glasiert, hoch), gold_kuebel (Messing gehämmert).

## 2. Töpfe im Spiel (js/spiel.js, macht der Koordinator)
Pflanze `p.topf` (fehlt = terrakotta bzw. terrakotta_kuebel). Töpfe sind Gegenstände: Kauf legt einen Topf ins Lager
(`{kategorie: 'topf', typ}`). `topfWechseln(daten, pflanzeId, lagerId | 'standard')`: alter Topf (außer Terrakotta) kommt ins Lager.
Lagerteile lassen sich verkaufen (`lagerVerkaufen`, halber Preis). Nur kleine Töpfe für kleine Pflanzen, Kübel für große.
Saatpflanzen (Beet) und Raritäten haben keine wechselbaren Töpfe.

## 3. Pflanzen zeichnen mit Topf
Alle Pflanzen-Grafiken (pflanzen.js zeichnePflanze, pflanzen2.js, saison.js, winter.js, winter2.js) bekommen als 5. Parameter `topf`
(Typ aus TOEPFE oder null). Ist er gesetzt, wird statt des eigenen Topfs `TOEPFE[topf].zeichne(R, H)` verwendet. Die Szene übergibt `o.topf`.

## 4. Teppiche (js/grafik/teppiche.js, Export `TEPPICHE`, Schnittstelle wie Deko mit `bodenbelag: true`)
Liegen flach in der Bodenebene, blockieren kein Feld, Mitte auf dem Feld (wie `teppich` in deko.js), höchstens etwa 2,5 Felder groß.
berber_rund (rund, creme mit braunen Rauten, Fransen, 120, L4), kelim (rechteckig, terrakotta/petrol/senf Muster, Fransen an den
Schmalseiten, 160, L8), karo (rechteckig, gelb-grünes Karomuster wie im Referenzzimmer, 140, L6), wolke (wolkenförmig, hellblau-creme,
plüschig, 110, L10), laeufer (langer schmaler Läufer 3 × 1 Felder, salbei mit Bordüre, 130, L12), fell (Schaffell, weiß, weicher Rand, 90, L14).

## 5. Licht je Uhrzeit (js/szene.js)
Sechs Phasen statt vier für das Licht (`phaseAus(date)`: morgen 5 bis 8, vormittag 8 bis 11, mittag 11 bis 15, nachmittag 15 bis 18,
abend 18 bis 21, nacht 21 bis 5). Die bisherige `tageszeit` (morgen, tag, abend, nacht) bleibt für Raritäten und Tests erhalten.
- Himmel je Phase (morgen rosa-pfirsich, vormittag hellblau, mittag klar, nachmittag warmgold, abend lila-orange, nacht dunkelblau mit Sternen und Mond).
- Sonnenstrahlen wandern: morgens flach von links durch das Glas von Wand B, mittags steil und kurz, nachmittags lang von rechts,
  goldene Lichtflecken auf dem Boden (Fensterraster als hellere Rauten), Staubteilchen im Strahl. Abends und nachts keine Sonne;
  nachts kühles Mondlicht durch Wand A.
- Raumlicht: weiche Verläufe auf Boden und Wänden (Ecke hinten dunkler, Umgebungsverdeckung an der Wand-Boden-Kante),
  Gesamttönung je Phase (morgens rosig, nachmittags golden, abends warm-dunkel, nachts blau).
- Lampen und Lichter (laterne, schneelaterne, bogenlampe, lichterkette, lichterlaube, kerzen) bekommen abends und nachts einen
  großen warmen Lichtschein (radialer Verlauf) und einen Lichtfleck auf dem Boden.
- `prefers-reduced-motion`: Staubteilchen ohne Bewegung.

## 6. „Gestern im Budget“ (Koordinator)
Am ersten Öffnen des Tages zeigt die App das Ergebnis von gestern: im Budget (+10 Samen, Serie, Beetpflanzen gewachsen) oder darüber
(keine Samen, Serie verloren, Pflanzen welken nicht, solange heute gut läuft). Dazu eine Zeile auf der Startseite unter der Wochenkarte.

## 7. Phase 2: Teile plastischer (Start: Pflanzentisch, Teakregal, Bank, Efeutute, Goldkugelkaktus)
Vorbild: die Referenzzimmer (weiche Verläufe, runde Kanten, warmes Licht). Für jedes Teil:
- Flächen mit Verläufen statt Volltönen: Oberseiten hell und warm (Licht von links oben), linke Seiten mittel, rechte Seiten dunkel,
  jeweils leichter Verlauf innerhalb der Fläche (oben heller als unten).
- Kanten abgerundet bzw. gefast: schmale helle Lichtkante an Oberkanten, dunklere Schattenkante an Unterkanten.
- Holz: feine Maserung (2 bis 3 Töne, dezent), Hirnholz an Schnittkanten etwas dunkler, kleine Glanzlichter.
- Umgebungsverdeckung: dunklerer Übergang, wo Teile aufeinandertreffen (Bein unter Platte, Brett an Seitenwange), weicher Kontaktschatten.
- Pflanzen: Blätter mit Verlauf (Lichtseite hell, Schattenseite dunkel), Mittelrippe und Adern, Glanzpunkt, hintere Blätter dunkler
  und leicht bläulich (Tiefe), vordere wärmer; Übergänge statt harter Kanten.
- Maße, Grundfläche, Stellplätze (plaetze), Höhen, Ursprung und Schnittstellen bleiben exakt gleich.
