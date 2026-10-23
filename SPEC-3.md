# Version 2.1: Wochenansicht, Tagesgeschenk ohne Ende, Level-Up, Samen sichtbar, iOS-Stil

Verbindlich für alle Agenten. Keine Gedankenstriche in sichtbaren Texten (Doppelpunkt, Komma oder neuer Satz).
Beträge in Cent, Datum als ISO-Text. Bestehende Schnittstellen nicht umbenennen.

## 0. Bereits erledigt (js/logik.js, nicht ändern)
- `verfuegbar(daten, zr, stichtag?)`: mit Stichtag zählen einmalige Einnahmen/Fixkosten-Buchungen erst ab ihrem Datum.
- Tagesbudget gilt mit dem Stand des Tages (neue Einnahmen ab ihrem Tag). Anzeige der Woche (`woche`, `wochenStand`): alle bekannten Einnahmen zählen sofort. Spiel (`wocheFuerSpiel`, `wocheErfuellt`, Challenges): Stand am ersten Wochentag.
  Eine spätere Einnahme ändert keine vergangenen Tage und keine laufende Woche mehr (behebt: Challenge durch Einnahme erfüllt).
- Neu: `L.wochenStand(daten, heute)` liefert `{von, bis, tage, W, ausgegeben, rest, proTag, tempo, prognoseAusgaben, prognoseRest}`.
  `L.zeitraumStand(daten, heute)` liefert `{zr, V, ausgegeben, rest, proTag, tempo, prognoseAusgaben, prognoseRest}`.
  `proTag` = Rest geteilt durch die offenen Tage inkl. heute. `prognose*` ist `null` am ersten Tag (noch kein Tempo).

## 1. Tagesgeschenk ohne Ende (js/spiel.js)
- `spiel.besuch = { letzter, tag }`. `tag` = Anzahl abgeholter Geschenke insgesamt. Wird NIE zurückgesetzt, auch nicht nach Pausen.
  Migration: fehlt `tag`, dann `tag = besuch.serie || 0`.
- `tagesgeschenk(daten, heute)` → `{ verfuegbar, tag, wocheStart, belohnung }`. `tag` = heutiger Geschenktag
  (`besuch.tag + 1`, wenn verfügbar, sonst `besuch.tag`). `wocheStart = Math.floor((tag - 1) / 7) * 7 + 1` (Anzeige Tag wocheStart bis wocheStart+6).
- Samen: Grundreihe je Position im 7er-Block `[10, 15, 20, 15, 25, 30, 60]`, plus `5 * min(4, block)` mit `block = Math.floor((tag - 1) / 7)`
  (Woche 1: +0, Woche 2: +5 … ab Woche 5: +20).
- Position 4: Pflanzen-Gutschein wie bisher. Position 7: ab Level 8 eine Gratis-Samentüte (`belohnung.tuete = 1`, zählt in `spiel.gratisTueten`), sonst Deko-Gutschein wie bisher.
- Meilensteine: an Tag 30, 50, 100, 200, 365 zusätzlich `belohnung.meilenstein = { tag, typ }` und ein Deko-Gutschein für dieses exklusive Teil,
  plus 100 Extra-Samen. Typen (Grafik in deko2.js): 30 `goldene_giesskanne` „Goldene Gießkanne“, 50 `vogeltraenke` „Terrazzo-Vogeltränke“,
  100 `sonnenuhr` „Messing-Sonnenuhr“, 200 `keramikpfau` „Keramik-Pfau“, 365 `jubilaeumsbrunnen` „Jubiläums-Brunnen“.
  Diese Teile sind nicht kaufbar: Im `katalog()` stehen sie nur, solange der Spieler einen Gutschein dafür hat (dann gratis), mit `meilenstein: <tag>`.
- `naechsterMeilenstein(daten)` → `{ tag, typ, name, inTagen }` oder null.
- `geschenkAbholen` setzt `besuch = { letzter: heute, tag }` und schreibt Samen, XP, Gutscheine, Tüte gut.

## 2. Samen sichtbar machen (js/spiel.js)
- Verlauf: `spiel.verlauf = [{ datum, art, text, samen }]`, neueste zuerst, höchstens 60 Einträge. Jede Samen-Gutschrift (bewerte-Ereignisse mit samen > 0,
  Tagesgeschenk, Ernte, Sofort-Eintrag, Tüten-Umtausch) schreibt einen Eintrag. Hilfsfunktion `verlaufEintragen(d, datum, art, text, samen)`.
- Sofortbelohnung für Einträge: `eintragBelohnen(daten, heute, datum)` → `{ daten, samen }`. Die erste Buchung (beliebige Art) eines Tages gibt sofort +2 Samen und +2 XP,
  gemerkt in `spiel.eintragSofort = [datum…]` (höchstens 60). `bewerte()` gibt für diesen Tag dann kein `eintrag`-Ereignis mehr.
  Für alle anderen Buchungen `{ daten, samen: 0 }`.
- `samenQuellen(daten)` → Liste `[{ was, samen, hinweis }]` für das Info-Blatt:
  Tag im Budget 10 (nächster Morgen), Erster Eintrag am Tag 2 (sofort), 7-Tage-Serie 30, Woche im Budget 50 (Montag), Wochen-Challenges je 20 bis 80,
  Zeitraum im Budget 200, Tagesgeschenk 10 bis 80, Ernte 8 bis 60, Herbarium-Sets 150 bis 1000.
- `heuteInAussicht(daten, heute)` → `{ samen, text }`: was es morgen früh gibt, wenn der Tag so bleibt (10 bei Budget eingehalten, +30 wenn damit eine 7er-Serie voll wird).

## 3. Level-Up (js/spiel.js)
- `freischaltungenBei(daten, level)` → Liste `[{ kategorie, typ, name }]` aller Artikel mit genau diesem Level: Pflanzen, Möbel, Deko, Erweiterungen, Designs,
  bei Level 8 zusätzlich `{ kategorie: 'tuete', typ: 'samentuete', name: 'Samentüten' }`.

## 4. Metallregale (js/grafik/moebel2.js, Preise in js/spiel.js)
Verzinkter Stahl wie IKEA HYLLIS: Grund #c3c8cd, Licht #e6e9ec, Schatten #8f969d, Kanten #6b4a3a (Kontur), Böden als dünne Bleche mit umgekanteter Vorderkante,
vier schmale Winkelpfosten mit kleinen schwarzen Füßen #2b2b2b, sichtbare Schraubpunkte. Nicht Mid-Century.
| Typ | Name | Größe | Ebenen | Plätze | Level | Preis |
|---|---|---|---|---|---|---|
| zinkregal | Zinkregal | 1×1 | 3 | 3 (je Ebene 1) | 2 | 120 |
| zinkregal_hoch | Hohes Zinkregal | 2×1 | 4 | 6 (Ebene 2 bis 4 je 2, unterste Ebene trägt Gießkanne und Kiste als Deko) | 6 | 340 |
Plätze auf allen Ebenen mit `hoehe` (verfügbarer Platz bis zur nächsten Ebene) und `schichten()` wie `hochregal`.

## 5. Neu gezeichnet (js/grafik/pflanzen.js)
Grünlilie, Bogenhanf, Monstera: Schnittstelle bleibt, nur die Zeichnung wird besser (Details siehe Agenten-Auftrag).

## 6. Wochenansicht (js/ui/garten.js, js/ui/uebersicht.js, css/woche.css)
Startseite: Die Kopfkarte zeigt die Woche (statt „Heute noch“):
- Zeile oben: Symbol (🗓️) und „Diese Woche“, rechts ein Chip „≈ 15,20 € pro Tag“ (`proTag`, bei ≤ 0: „Budget aufgebraucht“).
- Balken wie im Vorbild: Füllung = ausgegeben/W, eine senkrechte Markierung zeigt die Prognose (`prognoseAusgaben/W`), über 100 % rot gestreift.
- Links: „123,40 € ausgegeben“, „von 380,00 €“. Rechts groß: Rest in € (grün/rot), darunter Prozent verbraucht.
- Prognosezeile: „Bei deinem Tempo bleiben Sonntag noch 42 € übrig.“ bzw. „… fehlen Sonntag 18 €.“; am ersten Tag: „Ab morgen gibt es eine Prognose.“
- Darunter klein: „Heute: 12,30 € von 18,48 € ausgegeben“ (Tagesbudget bleibt fürs Spiel sichtbar).
- Negatives W: kein „von −28 €“, sondern „Das Geld dieser Woche ist schon verplant“ und Rest rot.
Übersicht: Segment-Schalter oben „Woche | Monat“ (iOS-Stil). Woche = Karte wie oben mit Pfeilen für frühere Wochen (nur ab Startdatum),
darunter die bestehende Wochengrafik. Monat = dieselbe Kartenform für den Zeitraum (`zeitraumStand`) mit Prognose bis Zeitraumende, darunter das bisherige Zeitraum-Detail.

## 7. Statistik (js/ui/statistik.js)
- Fixkosten nach Kategorie: Verträge speichern die Kategorie als NAMEN (Wohnen, Versicherung, Abos, Mobilität, Kommunikation, Sonstiges).
  Gruppieren nach diesem Namen, Emoji-Zuordnung: Wohnen 🏠, Versicherung 🛡️, Abos 📺, Mobilität 🚗, Kommunikation 📱, Sonstiges ✨. Leere Kategorie = Sonstiges.
  Fällt ein Wert auf eine Buchungskategorie-ID (z. B. 'sonstiges'), über `kategorieVon` auflösen.
- Abschnitt „Spiel“ heißt „Garten und Fortschritt“, die Karte „Spiel“ heißt „Samen und Level“.

## 8. Oberfläche app.js, buchen.js, shop.js, einstellungen.js (css/ios.css)
- Level-Up-Dialog, wenn das Level steigt (vorher/nachher in `speichern()` vergleichen; bei mehreren Stufen ein Dialog je Stufe, nacheinander):
  große Levelzahl mit Strahlenkranz, „Level 9 erreicht!“, Liste „Neu freigeschaltet“ mit Vorschaubild und Name, Knopf „Zum Shop“ und „Weiter“.
- Tagesgeschenk-Dialog: 7 Kästchen mit echten Tageszahlen (wocheStart bis +6), erledigte mit Haken; darunter „Nächster Meilenstein: Tag 30 (noch 12 Tage)“.
  Animation: Box wippt leicht (Einladung), beim Antippen schüttelt sie sich 400 ms, Deckel fliegt mit Drehung hoch, Lichtstrahlen und Konfetti,
  Belohnung springt mit Federeffekt herein, Samenzahl zählt von 0 hoch. Danke: Münzen fliegen zur Anzeige, Zähler zählt hoch.
- Samen-Anzeige oben antippen: Blatt „Deine Samen“ mit Bestand, „Heute in Aussicht“ (`heuteInAussicht`), „So verdienst du Samen“ (`samenQuellen`),
  „Zuletzt verdient“ (letzte 10 aus `spiel.verlauf`) und Knopf „Zum Shop“.
- Buchen: Nach dem Speichern `eintragBelohnen` aufrufen; bei samen > 0 fliegt ein „+2“-Schild vom Speichern-Knopf zur Samen-Anzeige, die hochzählt,
  Toast „+2 Samen für deinen ersten Eintrag heute“.
- Shop: Gutschein steckt im Kaufknopf des Kaufblatts („🎁 Mit Gutschein gratis platzieren“), kein zusätzliches Feld darüber. In der Karte bleibt „🎁 Gratis“.
- Einstellungen, Abschnitt Erinnerung: statt Web-Push eine Anleitung für die Kurzbefehle-Automation (siehe ANLEITUNG-ERINNERUNG.md).
- iOS-Stil (css/ios.css, nach styles.css geladen): Systemschrift `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif`
  (Zahlen mit `font-variant-numeric: tabular-nums`), große Titel 34 px fett, Tippflächen mindestens 44 px, Segment-Schalter (`.ios-segment`),
  Sheets mit Griff oben und 16 px Rundung, `-webkit-user-select: none; -webkit-touch-callout: none` auf allen Karten und Knöpfen (Eingabefelder ausgenommen),
  `-webkit-tap-highlight-color: transparent`, Bewegungen mit `prefers-reduced-motion` abschaltbar. Farben bleiben (Pastell, Mint).
