# Oberfläche: Bildschirme und Abläufe

Rahmen: `index.html` (eine Seite), `styles.css`, `js/app.js` (Start, Zustand, Router),
`js/ui/*.js` je Bildschirm. Mobil zuerst (375 bis 430 px Breite), auf dem Desktop mittig mit
max. 480 px Breite. Alles Deutsch, Beträge mit `euro()` aus logik.js.

## Gestaltung

- Hintergrund Mint `#a9d3a5`, Karten Creme `#fbf3e6`, Radius 20 px, Schatten
  `0 4px 0 rgba(107,74,58,.12), 0 8px 20px rgba(107,74,58,.10)`.
- Text Dunkelbraun `#6b4a3a`, sekundär `#9a7b6a`. Akzent Koralle `#e88a7a`, Positiv `#6fae6a`,
  Negativ `#d9625a`, Gold `#f2c14e`.
- Schrift: `ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif`; Zahlen
  `font-variant-numeric: tabular-nums`.
- Knöpfe: dick und rund (min. 44 px hoch), leichter „Druck“-Effekt (translateY 2px beim Antippen).
- Safe-Area beachten (oben Notch, unten Home-Balken). Eingabefelder 16 px+.
- Mindestschrift 13 px.

## Kopfleiste (immer sichtbar)

Links App-Name „Budgetgarten“ klein. Rechts: Münz-Anzeige (goldene Münze SVG mit kleinem
Samen-Symbol + Zahl), daneben Level-Kreis mit Zahl und XP-Ring. Antippen der Münze öffnet den Shop.
Wenn Samen verdient werden: 5 bis 8 kleine Münzen fliegen von der Bildmitte zur Anzeige,
Zahl zählt hoch (600 ms), kleiner Wackler.

## Tab-Leiste unten

Garten 🌿 · Buchen ➕ (mittig, groß, Koralle, rund) · Übersicht 📊 · Ziele 🎯 · Shop 🪴.
Einstellungen ⚙️ über Symbol in der Kopfleiste.

## 1. Garten (Start)

- Karte oben: „Heute noch“ + Rest heute groß (grün oder rot), darunter klein „von B · Tag x von n“.
  Daneben kleiner: „Diese Woche noch“ + Rest Woche. Fortschrittsbalken für beide.
- Darunter die Szene (`zeichneSzene`), volle Breite, Zustand aus spiel.gewaechshaus + welk().
- Unter der Szene: Serie 🔥 x Tage, aktive Wochen-Challenges als 2 kleine Karten mit Fortschritt.
- Tippen auf eine Pflanze in der Szene: Blatt (Bottom Sheet) mit Name, Stufe, „Leveln für X Samen“,
  „Verschieben“, „Verkaufen“. (Treffer per Klick auf `<g data-id>` in der Szene.)
- Modus „Einrichten“ (Knopf 🛠️ über der Szene): freie Felder/Plätze werden als gestrichelte
  Rauten markiert, Objekt antippen, dann Zielfeld antippen. Möbel: zusätzlich „Drehen“.

## 2. Buchen

Segment oben: Ausgabe · Einnahme · Fixkosten (einmalig).
- Großes Betragsfeld (inputmode="decimal", Komma erlaubt), Kategorien als Emoji-Chips
  (horizontal scrollbar, „+ eigene“), Notiz optional, Datum (Vorgabe heute, „gestern“-Chip).
- „Speichern“ → kurze Bestätigung, Liste der heutigen Buchungen darunter (wischen/antippen zum
  Bearbeiten oder Löschen mit Rückfrage).
- „Heute nichts ausgegeben“-Knopf (zählt als Eintrag für den +2-Bonus; speichert Buchung art
  „ausgabe“ mit Betrag 0 und Kategorie sonstiges, Notiz „Nichts ausgegeben“).
- Aufruf mit `?eintragen=heute` (aus der Push-Nachricht) öffnet direkt diesen Bildschirm mit
  Fokus auf dem Betrag.

## 3. Übersicht

- Zeitraum-Karte: Start bis Ende, V mit aufklappbarer Aufschlüsselung (posten aus verfuegbar()),
  ausgegeben, Rest.
- Kalender-Streifen des Zeitraums: jeder Tag als Kästchen grün (im Budget), rot (drüber), grau
  (Zukunft), heute umrandet. Antippen zeigt Budget und Ausgaben des Tages.
- Wochenansicht: Balken Mo bis So, Linie für Tagesbudget.
- Kategorien: Donut oder horizontale Balken der Ausgaben im Zeitraum (SVG selbst gezeichnet).
- Vergleich mit den letzten 3 Zeiträumen (Gesamtausgaben, Sparquote).
- Liste aller Buchungen des Zeitraums, filterbar nach Kategorie.

## 4. Ziele & Verträge

- Sparziele: Karten mit Name, Rate/Monat, Fortschrittsbalken angespart/zielsumme, Bearbeiten.
- Rücklagen: Verträge mit Intervall > 1 mit angesammeltem Stand und nächster Fälligkeit, plus
  freie Rücklagen.
- Verträge & regelmäßige Einnahmen: Liste mit Intervall-Badge, hinzufügen/bearbeiten/beenden.
- Gehalt: Gehaltstag, „Gehalt heute eingegangen“-Knopf (setzt gehaltseingaenge).
- Abzeichen-Wand: alle Abzeichen, erreichte farbig, fehlende ausgegraut mit Hinweis.

## 5. Shop

Reiter: Pflanzen · Möbel · Deko · Erweiterungen. Raster aus Karten mit kleiner Vorschau
(Grafik aus PFLANZEN/MOEBEL/DEKO, Stufe 4 für Pflanzen), Name, Preis mit Münze, Schloss + „ab Level x“
wenn gesperrt, „bald“ wenn nicht gezeichnet. Kaufen → Platz wählen (Garten im Einrichten-Modus
mit nur passenden freien Plätzen) → fertig, Konfetti aus Blättern.

## Ersteinrichtung (Assistent, Vollbild, Schritte mit Punkten oben)

Siehe SPEC.md „Ersteinrichtung“. Jeder Schritt überspringbar außer Gehalt. Am Ende Zusammenfassung:
„Dein Tagesbudget: xx,xx €“ und „Wochenbudget“, dann Garten mit Begrüßung.

## Dialoge

- Monatsabschluss (offeneAbschluesse): „Zeitraum geschafft! 🎉 Rest: x €“ → Auswahl Sparziel oder
  „ins nächste Monat übertragen“.
- „Gehalt eingegangen?“ am erwarteten Gehaltstag (einmal pro Tag fragen).
- Ereignisse aus bewerte() beim Start als gestapelte Toasts mit Münz-Animation.

## Einstellungen

Gehaltstag, Kategorien verwalten, Erinnerung 22 Uhr (Push-Abo, siehe SPEC), Export (Datei teilen
über `navigator.share` mit File, sonst Download), Import (Datei wählen, Rückfrage), „Alles
zurücksetzen“ (doppelte Rückfrage), Version.
