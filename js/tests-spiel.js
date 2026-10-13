// Mini-Testrahmen fuer Spiel-Logik (spiel.js) und Speicherung (speicher.js). Laeuft im Browser, zeigt jede Pruefung als Zeile.

import * as L from './logik.js';
import * as S from './spiel.js';
import * as P from './speicher.js';
import { PFLANZEN } from './grafik/pflanzen.js';
import { DEKO } from './grafik/deko.js';

const ergebnisse = [];
let aktuell = '';

function test(name, fn) {
  aktuell = name;
  try {
    fn();
  } catch (e) {
    ergebnisse.push({ ok: false, text: name + ': Fehler: ' + (e && e.message ? e.message : e) });
  }
}

function zeigt(x) {
  return typeof x === 'object' && x !== null ? JSON.stringify(x) : String(x);
}

function gleich(ist, soll, was) {
  const ok = typeof soll === 'object' && soll !== null
    ? JSON.stringify(ist) === JSON.stringify(soll)
    : ist === soll;
  const bezeichnung = aktuell + (was ? ' · ' + was : '');
  if (ok) {
    ergebnisse.push({ ok: true, text: bezeichnung });
  } else {
    ergebnisse.push({ ok: false, text: bezeichnung + ': ist ' + zeigt(ist) + ' soll ' + zeigt(soll) });
  }
}

// Shop-Aktion muss klappen (kein fehler), sonst Meldung anzeigen
function klappt(res, was) {
  gleich(res.fehler === undefined ? 'ok' : 'Fehler: ' + res.fehler, 'ok', was);
}

// Shop-Aktion muss scheitern
function scheitert(res, was) {
  gleich(res.fehler !== undefined, true, was);
}

// Gibt die Fehlermeldung einer Funktion zurueck, die wirft, sonst null
function wirft(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    return e.message || String(e);
  }
}

const EUR = (x) => x * 100;

// Startstand mit genug Samen, Level 1
function basis(samen = 500, xp = 0) {
  const d = P.standardDaten('2026-10-01');
  d.einstellungen.ersteinrichtungFertig = true;
  d.spiel.samen = samen;
  d.spiel.xp = xp;
  return d;
}

// Gehalt 3100 EUR am 1. jedes Monats, Gehaltstag 1
function mitGehalt(startDatum, betrag = EUR(3100)) {
  const d = P.standardDaten(startDatum);
  d.einstellungen.gehaltstag = 1;
  d.vertraege.push({ id: 'g', art: 'einnahme', name: 'Gehalt', betrag, intervall: 1, ersteFaelligkeit: '2026-10-01', kategorie: '', istGehalt: true, ende: null });
  return d;
}

// Gestaffelte Freischaltung: je Stufe ab 2 bis zur hoechsten Stufe höchstens `max` Artikel, keine Luecken
function gestaffelt(kategorie, max = 2) {
  const zaehl = {};
  for (const k of S.katalog(P.standardDaten('2026-10-01'))) {
    if (k.kategorie === kategorie) zaehl[k.level] = (zaehl[k.level] || 0) + 1;
  }
  const hoechste = Math.max(...Object.keys(zaehl).map(Number));
  for (let l = 2; l <= hoechste; l++) {
    if (!zaehl[l] || zaehl[l] > max) return false;
  }
  return true;
}

// ---------- Level und Katalog ----------

test('levelAus', () => {
  gleich(S.levelAus(0).level, 1, 'XP 0 ist Level 1');
  gleich(S.levelAus(100).level, 2, 'XP 100 ist Level 2');
  gleich(S.levelAus(299).level, 2, 'XP 299 ist Level 2');
  gleich(S.levelAus(300).level, 3, 'XP 300 ist Level 3');
  gleich(S.levelAus(300).xpStufe, 300, 'Stufenbeginn Level 3');
});

test('Freischaltung Level 1 und Staffelung', () => {
  const k = S.katalog(P.standardDaten('2026-10-01'));
  gleich(k.filter(x => x.kategorie === 'pflanze' && x.level === 1).length, 6, 'Level 1: 6 Pflanzen');
  // Auftrag 1.1: Brett auf Ziegeln (Möbel) ist Level 1, Katze wird erst ab Level 3 freigeschaltet
  gleich(k.filter(x => x.kategorie === 'moebel' && x.level === 1).length, 4, 'Level 1: 4 Möbel (mit Brett auf Ziegeln)');
  gleich(k.filter(x => x.kategorie === 'deko' && x.level === 1).length, 3, 'Level 1: 3 Deko (Katze ab Level 3)');
  gleich(gestaffelt('pflanze'), true, 'Pflanzen gestaffelt');
  gleich(gestaffelt('moebel'), true, 'Möbel gestaffelt');
  // Level 3 hat durch die Katze drei Deko, deshalb höchstens 3 je Stufe
  gleich(gestaffelt('deko', 3), true, 'Deko gestaffelt (höchstens 3 je Stufe)');
});

// Ein Pflanzentyp, der (noch) nicht gezeichnet ist. Null, wenn alle gezeichnet sind.
function ungezeichnetePflanze() {
  const eintrag = S.katalog(P.standardDaten('2026-10-01')).find(x => x.kategorie === 'pflanze' && !x.gezeichnet);
  return eintrag ? eintrag.typ : null;
}

test('Katalog: gezeichnet und Freischaltung', () => {
  const k = S.katalog(P.standardDaten('2026-10-01'));
  const finde = (kat, typ) => k.find(x => x.kategorie === kat && x.typ === typ);
  gleich(finde('pflanze', 'monstera').gezeichnet, true, 'Monstera gezeichnet');
  gleich(k.filter(x => x.kategorie === 'pflanze').every(x => x.gezeichnet === Object.prototype.hasOwnProperty.call(PFLANZEN, x.typ)), true, 'gezeichnet = in PFLANZEN');
  gleich(finde('pflanze', 'bogenhanf').freigeschaltet, false, 'Bogenhanf ab Level 2');
  gleich(finde('erweiterung', 'flaeche7').level, 6, 'Fläche 7 ab Level 6');
  gleich(finde('erweiterung', 'flaeche8').preis, 2000, 'Fläche 8 kostet 2000');
});

test('challengePool: mind. 8 Eintraege, Samen 40 bis 80', () => {
  gleich(S.challengePool.length >= 8, true, 'Anzahl');
  gleich(S.challengePool.every(c => c.samen >= 40 && c.samen <= 80), true, 'Samen-Spanne');
});

test('challengesDerWoche deterministisch', () => {
  const ids = (w) => S.challengesDerWoche(w).map(c => c.id);
  gleich(ids('2026-10-05'), ids('2026-10-05'), 'gleicher Wochenbeginn, gleiche Auswahl');
  gleich(ids('2026-10-05').length, 2, 'zwei Challenges');
  gleich(ids('2026-10-05')[0] !== ids('2026-10-05')[1], true, 'zwei verschiedene');
});

// ---------- Bewertung ----------

test('bewerte: 8 Tage mit einem überzogenen Tag', () => {
  const d0 = mitGehalt('2026-10-01');
  d0.buchungen.push({ id: 'a1', art: 'ausgabe', name: 'Einkauf', betrag: EUR(500), datum: '2026-10-01', kategorie: 'lebensmittel', notiz: '' });
  const r1 = S.bewerte(d0, '2026-10-09');
  // Tag 1: B = 3100/31 = 100 EUR, 500 EUR ausgegeben: nicht erfüllt, +2 für den Eintrag
  // Tage 2 bis 8: sieben erfüllte Tage à 10, Serie erreicht 7 am 8. Tag: +30
  // Startwoche (Start Donnerstag): Einsteiger-Challenges 20 (Eintrag am Start) und 40 (3 von 4 Tagen im Budget)
  gleich(r1.daten.spiel.samen, 50 + 70 + 30 + 2 + 60, 'Samen: Start 50, 7 Tage à 10, Serienbonus 30, Eintrag 2, Einsteiger 60');
  gleich(r1.daten.spiel.xp, 162, 'XP = verdiente Samen');
  gleich(r1.daten.spiel.serie, 7, 'Serie 7');
  gleich(r1.daten.spiel.besteSerie, 7, 'beste Serie 7');
  gleich(r1.daten.spiel.bewertet.tage.length, 8, '8 Tage bewertet');
  gleich(r1.daten.spiel.bewertet.tage[0].erfuellt, false, 'Tag 1 überzogen');
  gleich(r1.ereignisse.filter(e => e.art === 'tag').length, 7, '7 Tage im Budget');
  gleich(r1.ereignisse.some(e => e.art === 'serie' && e.samen === 30), true, 'Serienbonus');
  gleich(r1.daten.spiel.abzeichen.includes('erste_buchung'), true, 'Abzeichen Erste Buchung');
  gleich(r1.daten.spiel.abzeichen.includes('serie_7'), true, 'Abzeichen 7-Tage-Serie');
  gleich(d0.spiel.samen, 50, 'Eingabe bleibt unverändert');
  const r2 = S.bewerte(r1.daten, '2026-10-09');
  gleich(r2.ereignisse.length, 0, 'zweiter Aufruf: keine Ereignisse');
  gleich(r2.daten.spiel.samen, r1.daten.spiel.samen, 'zweiter Aufruf: keine Doppelbewertung');
});

test('bewerte: Wochenbonus mit Challenges', () => {
  const d0 = mitGehalt('2026-10-05');
  const r1 = S.bewerte(d0, '2026-10-12');
  const wb = '2026-10-05';
  const zr = L.zeitraum(d0, wb);
  const bonus = S.challengesDerWoche(wb)
    .filter(c => c.pruefe(d0, wb, zr))
    .reduce((s, c) => s + c.samen, 0);
  gleich(r1.daten.spiel.bewertet.wochen.length, 1, 'eine Woche bewertet');
  gleich(r1.daten.spiel.bewertet.wochen[0].erfuellt, true, 'Woche im Budget');
  // Start 50, 7 Tage à 10, Serienbonus 30, Wochenbonus 50, erfüllte Challenges
  gleich(r1.daten.spiel.samen, 50 + 70 + 30 + 50 + bonus, 'Samen mit Wochenbonus und Challenges');
  gleich(r1.daten.spiel.challenges[wb].length, 2, 'zwei Challenges gespeichert');
  gleich(r1.daten.spiel.abzeichen.includes('erste_woche'), true, 'Abzeichen Erste Woche');
  const r2 = S.bewerte(r1.daten, '2026-10-12');
  gleich(r2.daten.spiel.bewertet.wochen.length, 1, 'zweiter Aufruf: keine Doppelbewertung der Woche');
});

test('bewerte: Zeitraumabschluss mit Gutschrift aufs Sparziel', () => {
  const d0 = mitGehalt('2026-10-01', EUR(3000));
  d0.sparziele.push({ id: 'urlaub', name: 'Urlaub', proMonat: EUR(100), zielsumme: null, angespart: 0 });
  const r = S.bewerte(d0, '2026-11-02');
  gleich(r.daten.abschluesse.length, 1, 'ein Abschluss (Oktober)');
  gleich(r.daten.abschluesse[0].zeitraumEnde, '2026-10-31', 'Zeitraum endet 31.10.');
  gleich(r.daten.abschluesse[0].rest, EUR(2900), 'Rest 2900 EUR');
  gleich(r.daten.abschluesse[0].uebertrag, EUR(2900), 'Vorgabe: Übertrag');
  gleich(r.daten.sparziele[0].angespart, EUR(100), 'Sparziel 100 EUR gutgeschrieben');
  gleich(r.daten.spiel.offeneAbschluesse.length, 1, 'offener Abschluss');
  gleich(r.ereignisse.some(e => e.art === 'zeitraum' && e.samen === 200), true, '200 Samen für den Zeitraum');

  const sparziel = S.restVerwenden(r.daten, '2026-10-01', 'sparziel:urlaub');
  klappt(sparziel, 'Rest ins Sparziel');
  gleich(sparziel.daten.sparziele[0].angespart, EUR(100) + EUR(2900), 'Sparziel: 100 + 2900 EUR');
  gleich(sparziel.daten.abschluesse[0].uebertrag, 0, 'Sparziel: kein Übertrag');
  gleich(sparziel.daten.spiel.offeneAbschluesse.length, 0, 'Sparziel: offener Abschluss entfernt');

  const uebertrag = S.restVerwenden(r.daten, '2026-10-01', 'uebertrag');
  klappt(uebertrag, 'Rest als Übertrag');
  gleich(uebertrag.daten.spiel.offeneAbschluesse.length, 0, 'Übertrag: offener Abschluss entfernt');
  gleich(L.verfuegbar(uebertrag.daten, L.zeitraum(uebertrag.daten, '2026-11-02')).V, EUR(5800), 'Übertrag wirkt im November: 3000 + 2900 - 100');

  scheitert(S.restVerwenden(r.daten, '2026-11-01', 'uebertrag'), 'unbekannter Zeitraum');
  scheitert(S.restVerwenden(r.daten, '2026-10-01', 'sparziel:gibtsnicht'), 'unbekanntes Sparziel');
});

test('bewerte: Abschluss mit Überzug zahlt nichts aus', () => {
  const d0 = mitGehalt('2026-10-01', EUR(3000));
  d0.sparziele.push({ id: 'urlaub', name: 'Urlaub', proMonat: EUR(100), zielsumme: null, angespart: 0 });
  d0.buchungen.push({ id: 'a2', art: 'ausgabe', name: 'Großeinkauf', betrag: EUR(3500), datum: '2026-10-15', kategorie: 'shopping', notiz: '' });
  const r = S.bewerte(d0, '2026-11-02');
  gleich(r.daten.abschluesse[0].rest, EUR(-600), 'R = -600 EUR');
  gleich(r.daten.sparziele[0].angespart, 0, 'kein Sparen bei Überzug');
  gleich(r.daten.spiel.offeneAbschluesse.length, 0, 'kein offener Rest');
});

// ---------- Shop ----------

test('kaufen: zu wenig Samen', () => {
  const d = basis(50);
  const r = S.kaufen(d, 'pflanze', 'monstera', { moebel: 'm2', platz: 1 });
  scheitert(r, 'Monstera mit 50 Samen');
  gleich(String(r.fehler).includes('Samen'), true, 'Meldung nennt Samen');
});

test('kaufen: ok, Pflanze auf freies Feld', () => {
  const d = basis(500);
  const r = S.kaufen(d, 'pflanze', 'kaktus', { feld: [5, 5] });
  klappt(r, 'Kaktus auf freies Feld');
  gleich(r.daten.spiel.samen, 460, 'Samen abgezogen');
  gleich(d.spiel.samen, 500, 'Eingabe unverändert');
  const neu = r.daten.spiel.gewaechshaus.pflanzen.find(p => p.typ === 'kaktus');
  gleich(neu.stufe, 1, 'Stufe 1');
  gleich(neu.ort, { feld: [5, 5] }, 'Ort');
});

test('kaufen: Platz belegt', () => {
  const d = basis(500);
  scheitert(S.kaufen(d, 'pflanze', 'kaktus', { moebel: 'm2', platz: 0 }), 'Stellplatz 0 ist belegt');
  scheitert(S.kaufen(d, 'deko', 'giesskanne', { feld: [1, 0] }), 'Feld unter Tisch belegt');
  scheitert(S.kaufen(d, 'pflanze', 'kaktus', { feld: [1, 0] }), 'Feld unter Tisch belegt (Pflanze)');
});

test('kaufen: große Pflanze nicht auf Möbel', () => {
  const d = basis(500);
  scheitert(S.kaufen(d, 'pflanze', 'monstera', { moebel: 'm2', platz: 1 }), 'Monstera auf Möbel');
  klappt(S.kaufen(d, 'pflanze', 'kaktus', { moebel: 'm2', platz: 1 }), 'Kaktus auf freien Stellplatz');
});

test('kaufen: Level-Sperre und noch nicht gezeichnet', () => {
  const d = basis(500);
  scheitert(S.kaufen(d, 'pflanze', 'bogenhanf', { feld: [5, 5] }), 'Bogenhanf vor Level 2');
  const bald = ungezeichnetePflanze();
  if (bald) scheitert(S.kaufen(d, 'pflanze', bald, { feld: [5, 5] }), bald + ' noch nicht gezeichnet');
});

test('kaufen: Möbel mit Position und Überschneidung', () => {
  const d = basis(500);
  const r = S.kaufen(d, 'moebel', 'regal_holz', { gx: 3, gy: 3, drehung: 0 });
  klappt(r, 'Holzregal frei');
  gleich(r.daten.spiel.samen, 350, 'Samen abgezogen');
  scheitert(S.kaufen(d, 'moebel', 'regal_holz', { gx: 1, gy: 0, drehung: 0 }), 'überschneidet Tisch');
  scheitert(S.kaufen(d, 'moebel', 'regal_holz', { gx: 5, gy: 5, drehung: 0 }), 'ragt aus dem Raster');
});

test('moebelSetzen: verschieben und Überschneidung', () => {
  const d = basis(500);
  klappt(S.moebelSetzen(d, 'm2', 0, 5, 0), 'Tisch nach unten verschoben');
  scheitert(S.moebelSetzen(d, 'm2', 0, 2, 0), 'Tisch überschneidet Holzregal');
  scheitert(S.moebelSetzen(d, 'm2', 0, 4, 90), 'Drehung ragt aus dem Raster');
});

test('pflanzeLeveln: Kosten 30, 60, 100 Prozent', () => {
  const d = basis(500);
  const s2 = S.pflanzeLeveln(d, 'p1');
  klappt(s2, 'Stufe 2');
  gleich(s2.daten.spiel.samen, 500 - 15, 'Stufe 2 kostet 30 % von 50 = 15');
  const s3 = S.pflanzeLeveln(s2.daten, 'p1');
  gleich(s3.daten.spiel.samen, 485 - 30, 'Stufe 3 kostet 60 % = 30');
  const s4 = S.pflanzeLeveln(s3.daten, 'p1');
  gleich(s4.daten.spiel.samen, 455 - 50, 'Stufe 4 kostet 100 % = 50');
  gleich(s4.daten.spiel.gewaechshaus.pflanzen.find(p => p.id === 'p1').stufe, 4, 'Stufe 4 erreicht');
  scheitert(S.pflanzeLeveln(s4.daten, 'p1'), 'über Stufe 4 hinaus');
  scheitert(S.pflanzeLeveln(basis(10), 'p1'), 'zu wenig Samen für Stufe 2');
});

test('verkaufen: halber Kaufpreis, Möbel nur wenn leer', () => {
  const d = basis(50);
  scheitert(S.verkaufen(d, 'moebel', 'm2'), 'Tisch mit Pflanze');
  const v = S.verkaufen(d, 'pflanze', 'p1');
  klappt(v, 'Efeutute verkaufen');
  gleich(v.daten.spiel.samen, 50 + 25, '50 % von 50');
  gleich(v.daten.spiel.gewaechshaus.pflanzen.length, 0, 'Pflanze entfernt');
  const t = S.verkaufen(v.daten, 'moebel', 'm2');
  klappt(t, 'leerer Tisch verkaufen');
  gleich(t.daten.spiel.samen, 75 + 75, '50 % von 150');
});

test('erweiterungKaufen: Level und Samen', () => {
  const d = basis(1000, 0);
  scheitert(S.kaufen(d, 'erweiterung', 'flaeche7'), 'Fläche 7 vor Level 6');
  const reich = basis(1000, 1500);
  const r = S.kaufen(reich, 'erweiterung', 'flaeche7');
  klappt(r, 'Fläche 7 ab Level 6');
  gleich(r.daten.spiel.gewaechshaus.groesse, 7, 'Raster 7 x 7');
  gleich(r.daten.spiel.samen, 0, 'Samen 1000 abgezogen');
});

test('freiePlaetze: Stellplätze und Felder', () => {
  const d = basis(500);
  const klein = S.freiePlaetze(d, 'pflanze', 'kaktus');
  gleich(klein.some(o => o.moebel === 'm2' && o.platz === 1), true, 'freier Stellplatz 1');
  gleich(klein.some(o => o.moebel === 'm2' && o.platz === 0), false, 'belegter Stellplatz 0 fehlt');
  const gross = S.freiePlaetze(d, 'pflanze', 'monstera');
  gleich(gross.every(o => Array.isArray(o.feld)), true, 'große Pflanze nur auf Feldern');
});

test('welk', () => {
  const d = mitGehalt('2026-10-01');
  gleich(S.welk(d, '2026-10-10'), false, 'alles im Budget');
  const u = mitGehalt('2026-10-01');
  u.buchungen.push({ id: 'a3', art: 'ausgabe', name: 'Teuer', betrag: EUR(2000), datum: '2026-10-10', kategorie: 'shopping', notiz: '' });
  gleich(S.welk(u, '2026-10-10'), true, 'heute über Budget');
});

// ---------- Haengeampel und Haken ----------

// Level 6 (Haengeampel und Metallregal ab Level 4), Samen reichen fuer alle Versuche
function reich() {
  return basis(2000, 1500);
}

test('Haengeampel: freie Haken im Standardgarten', () => {
  // Unter h2 steht das Holzregal (Felder x 0, y 1 bis 3), unter h1 nichts Hohes
  gleich(S.freiePlaetze(basis(), 'deko', 'haengeampel').map(o => o.haken), ['h1'], 'nur h1 frei');
  gleich(S.freiePlaetze(basis(), 'deko', 'katze').every(o => Array.isArray(o.feld)), true, 'Bodendeko bleibt bei Feldern');
});

test('Haengeampel: an freien Haken ok', () => {
  const d = reich();
  const r = S.kaufen(d, 'deko', 'haengeampel', { haken: 'h1' });
  klappt(r, 'Ampel an freien Haken h1');
  gleich(r.daten.spiel.samen, 2000 - 60, 'Samen abgezogen');
  const neu = r.daten.spiel.gewaechshaus.deko.find(x => x.typ === 'haengeampel');
  gleich(neu.ort, { haken: 'h1' }, 'Ort ist der Haken');
  gleich(d.spiel.gewaechshaus.deko.length, 0, 'Eingabe unverändert');
});

test('Haengeampel: zweite Ampel an belegtem Haken scheitert', () => {
  const r1 = S.kaufen(reich(), 'deko', 'haengeampel', { haken: 'h1' });
  scheitert(S.kaufen(r1.daten, 'deko', 'haengeampel', { haken: 'h1' }), 'zweite Ampel an h1');
  gleich(S.freiePlaetze(r1.daten, 'deko', 'haengeampel').some(o => o.haken === 'h1'), false, 'h1 nicht mehr frei');
});

test('Haengeampel: Ort-Regeln', () => {
  const d = reich();
  scheitert(S.kaufen(d, 'deko', 'haengeampel', { feld: [5, 5] }), 'Ampel auf Feld');
  scheitert(S.kaufen(d, 'deko', 'giesskanne', { haken: 'h1' }), 'Gießkanne an Haken');
  scheitert(S.kaufen(d, 'deko', 'haengeampel', { haken: 'gibtsnicht' }), 'unbekannter Haken');
});

test('Haengeampel: Metallregal unter belegtem Haken scheitert', () => {
  const r1 = S.kaufen(reich(), 'deko', 'haengeampel', { haken: 'h1' });
  const r2 = S.kaufen(r1.daten, 'moebel', 'metallregal', { gx: 4, gy: 0, drehung: 0 });
  scheitert(r2, 'Metallregal unter h1');
  gleich(String(r2.fehler).includes('Hängeampel'), true, 'Meldung nennt die Hängeampel');
  klappt(S.kaufen(reich(), 'moebel', 'metallregal', { gx: 4, gy: 0, drehung: 0 }), 'Metallregal ohne Ampel frei');
});

test('Haengeampel: Holzkiste unter belegtem Haken ok', () => {
  const r1 = S.kaufen(reich(), 'deko', 'haengeampel', { haken: 'h1' });
  klappt(S.kaufen(r1.daten, 'moebel', 'holzkiste', { gx: 4, gy: 0, drehung: 0 }), 'Holzkiste unter h1');
});

test('Haengeampel: grosse Pflanze unter belegtem Haken scheitert', () => {
  const r1 = S.kaufen(reich(), 'deko', 'haengeampel', { haken: 'h1' });
  scheitert(S.kaufen(r1.daten, 'pflanze', 'monstera', { feld: [4, 0] }), 'Monstera unter h1');
  klappt(S.kaufen(r1.daten, 'pflanze', 'kaktus', { feld: [4, 0] }), 'kleiner Kaktus unter h1');
});

test('Haengeampel: Ampel über bestehendem Regal scheitert', () => {
  // Holzregal um 90 Grad: belegt (4,0), (4,1), (4,2) und damit ein Feld unter h1
  const r1 = S.kaufen(reich(), 'moebel', 'regal_holz', { gx: 4, gy: 0, drehung: 90 });
  klappt(r1, 'Regal über Feld (4,0)');
  scheitert(S.kaufen(r1.daten, 'deko', 'haengeampel', { haken: 'h1' }), 'Ampel über Regal');
  gleich(S.freiePlaetze(r1.daten, 'deko', 'haengeampel').some(o => o.haken === 'h1'), false, 'h1 nicht frei');
});

// ---------- Challenge-Fortschritt und Wochenrückblick ----------

// Gehalt 3100 EUR, Woche 5. bis 11. Oktober 2026: Essen 20 EUR am Montag, Schuhe 30 EUR am Mittwoch
function wochenFixture() {
  const d = mitGehalt('2026-10-01');
  d.buchungen.push({ id: 'w1', art: 'ausgabe', name: 'Essen', betrag: EUR(20), datum: '2026-10-05', kategorie: 'essen', notiz: '' });
  d.buchungen.push({ id: 'w2', art: 'ausgabe', name: 'Schuhe', betrag: EUR(30), datum: '2026-10-07', kategorie: 'shopping', notiz: '' });
  return d;
}

const pool = (id) => S.challengePool.find(c => c.id === id);

test('challengePool: jede Challenge hat art und fortschritt', () => {
  gleich(S.challengePool.every(c => (c.art === 'zaehl' || c.art === 'grenze') && typeof c.fortschritt === 'function'), true, 'art und fortschritt');
});

test('fortschritt: zählt nur Tage bis heute', () => {
  const d = wochenFixture();
  const wb = '2026-10-05';
  const zr = L.zeitraum(d, wb);
  gleich(pool('zwei_ohne_ausgaben').fortschritt(d, wb, zr, '2026-10-06'), { ist: 1, soll: 2, einheit: 'Tage' }, 'Mo bis Di: nur Dienstag ohne Ausgabe');
  gleich(pool('zwei_ohne_ausgaben').fortschritt(d, wb, zr, '2026-10-08').ist, 2, 'Di und Do ohne Ausgabe');
  gleich(pool('woche_15_unter').fortschritt(d, wb, zr, '2026-10-06').ist, EUR(20), 'Betrag: nur Ausgaben bis heute');
});

test('challengeStatus: laufende Woche, Zählziel auf Kurs', () => {
  const d = wochenFixture();
  const s = S.challengeStatus(d, pool('zwei_ohne_ausgaben'), '2026-10-05', '2026-10-06');
  gleich(s.zustand, 'auf_kurs', 'ein Tag von zwei, noch fünf Tage übrig');
  gleich(s.text, '1 von 2 Tagen', 'Text');
});

test('challengeStatus: geschafft und gefährdet bei Zählzielen', () => {
  const d = wochenFixture();
  const geschafft = S.challengeStatus(d, pool('zwei_ohne_ausgaben'), '2026-10-05', '2026-10-08');
  gleich(geschafft.zustand, 'geschafft', 'zwei Tage ohne Ausgabe erreicht');
  gleich(geschafft.text, '2 von 2 Tagen', 'Text geschafft');
  // Eintraege am Montag und Mittwoch: 2 von 4, am Freitag fehlen 2 und genau 2 Tage sind übrig
  const gefaehrdet = S.challengeStatus(d, pool('vier_tage_eintrag'), '2026-10-05', '2026-10-09');
  gleich(gefaehrdet.zustand, 'gefaehrdet', 'alle restlichen Tage müssen zählen');
  gleich(gefaehrdet.text, '2 von 4 Tagen', 'Text gefährdet');
});

test('challengeStatus: Verbot verpasst bei Verstoß, Betragsgrenze zeigt Luft', () => {
  const d = wochenFixture();
  const verstoss = S.challengeStatus(d, pool('keine_essen_gehen'), '2026-10-05', '2026-10-06');
  gleich(verstoss.zustand, 'verpasst', 'Essen gehen am Montag');
  gleich(verstoss.text, '1 Verstoß bisher', 'Text Verstoß');
  gleich(pool('keine_essen_gehen').fortschritt(d, '2026-10-05', L.zeitraum(d, '2026-10-05'), '2026-10-06').einheit, 'verbot', 'Einheit verbot');
  const W = L.tagesbudget(d, '2026-10-05') * 7;
  const luft = S.challengeStatus(d, pool('woche_15_unter'), '2026-10-05', '2026-10-06');
  gleich(luft.zustand, 'auf_kurs', 'bis 85 % des Wochenbudgets noch Luft');
  gleich(luft.text, 'Noch ' + L.euro(Math.floor(W * 85 / 100) - EUR(20)) + ' Luft', 'Text Luft');
  gleich(S.challengeStatus(d, pool('hoechstens_drei_gross'), '2026-10-05', '2026-10-06').text, '0 von höchstens 3 Ausgaben', 'Obergrenze');
});

test('challengeStatus: vergangene Woche entscheidet pruefe()', () => {
  const d = wochenFixture();
  gleich(S.challengeStatus(d, pool('zwei_ohne_ausgaben'), '2026-10-05', '2026-10-12').zustand, 'geschafft', 'Woche vorbei, Zählziel erreicht');
  gleich(S.challengeStatus(d, pool('keine_essen_gehen'), '2026-10-05', '2026-10-12').zustand, 'verpasst', 'Woche vorbei, Verbot gebrochen');
});

test('wochenRueckblick: Zahlen einer Woche im Budget', () => {
  const d = wochenFixture();
  const wb = '2026-10-05';
  const r = S.wochenRueckblick(d, wb);
  const W = L.tagesbudget(d, wb) * 7;
  gleich([r.von, r.bis], ['2026-10-05', '2026-10-11'], 'Zeitraum der Woche');
  gleich(r.ausgegeben, EUR(50), 'ausgegeben');
  gleich(r.W, W, 'Wochenbudget');
  gleich(r.gespart, W - EUR(50), 'gespart = W - ausgegeben');
  gleich(r.tageImBudget, 7, 'alle 7 Tage im Budget');
  gleich(r.topKategorie, { id: 'shopping', betrag: EUR(30) }, 'größte Kategorie');
  gleich(r.erfuellt, true, 'Woche erfüllt');
  const bonus = S.challengesDerWoche(wb).filter(c => c.pruefe(d, wb, L.zeitraum(d, wb))).reduce((s, c) => s + c.samen, 0);
  gleich(r.samen, 70 + 50 + bonus, 'Samen: 7 Tage à 10, Woche 50, Challenges');
});

test('wochenRueckblick: überzogene Woche und ohne Ausgaben', () => {
  const d = wochenFixture();
  d.buchungen.push({ id: 'w3', art: 'ausgabe', name: 'Urlaub', betrag: EUR(1000), datum: '2026-10-06', kategorie: 'freizeit', notiz: '' });
  const r = S.wochenRueckblick(d, '2026-10-05');
  gleich(r.erfuellt, false, 'Woche überzogen');
  gleich(r.gespart < 0, true, 'gespart negativ');
  gleich(r.tageImBudget, 6, 'nur der Dienstag liegt drüber');
  gleich(S.wochenRueckblick(mitGehalt('2026-10-01'), '2026-10-05').topKategorie, null, 'ohne Ausgaben keine Top-Kategorie');
});

// Sieben Tage mit je einem kleinen Eintrag (1 EUR), Gehalt 3100 EUR: Woche 5. bis 11. Oktober im Budget, Serie 7
function siebenTageFixture() {
  const d = mitGehalt('2026-10-05');
  ['05', '06', '07', '08', '09', '10', '11'].forEach((t, i) => {
    d.buchungen.push({ id: 'k' + i, art: 'ausgabe', name: 'Kleinkram', betrag: EUR(1), datum: '2026-10-' + t, kategorie: 'lebensmittel', notiz: '' });
  });
  return d;
}

// Summe der erfüllten Challenges einer gespeicherten Woche
const chSamenGespeichert = (d, wb) => d.spiel.challenges[wb]
  .filter(c => c.erfuellt)
  .reduce((s, c) => s + pool(c.id).samen, 0);

test('wochenRueckblick: Samen entsprechen den Gutschriften der Bewertung', () => {
  const d0 = siebenTageFixture();
  const wb = '2026-10-05';
  const r = S.bewerte(d0, '2026-10-12');
  const soll = 7 * 10 + 7 * 2 + 30 + 50 + chSamenGespeichert(r.daten, wb);
  gleich(r.daten.spiel.besteSerie, 7, 'Serie 7 erreicht');
  gleich(r.daten.spiel.samen - d0.spiel.samen, soll, 'Differenz der Samen vor/nach bewerte = 7x10 + 7x2 + 30 + 50 + Challenges');
  gleich(S.wochenRueckblick(r.daten, wb).samen, soll, 'Rückblick-Samen gleich Gutschriften');
});

test('wochenRueckblick: alter Spielstand ohne samen-Felder nutzt die Schätzung', () => {
  const wb = '2026-10-05';
  const alt = structuredClone(S.bewerte(siebenTageFixture(), '2026-10-12').daten);
  alt.spiel.bewertet.tage.forEach(t => delete t.samen);
  alt.spiel.bewertet.wochen.forEach(w => delete w.samen);
  alt.spiel.bewertet.zeitraeume.forEach(z => delete z.samen);
  const rb = S.wochenRueckblick(alt, wb);
  // Schätzung wie bisher: 10 je Tag im Budget, 50 Woche, erfüllte Challenges
  gleich(rb.samen, 7 * 10 + 50 + chSamenGespeichert(alt, wb), 'Fallback: 7x10 + 50 + Challenges');
  gleich(rb.erfuellt, true, 'Woche erfüllt');
});

test('bewerte: Samen je Tag und Summe fest fuer ein festes Szenario', () => {
  // Tag 1 (1. Okt.): 500 EUR, nur Eintrag +2. Tage 2 bis 8: je 1 EUR, Eintrag +2 und Budget +10, Serie 7 am 8. Tag +30.
  // Erwartung: 50 + 2 + 7 x 12 + 30 = 166 Samen, dazu Einsteiger-Challenges der Startwoche (Start Donnerstag) 60, also 226; XP 176
  const d0 = mitGehalt('2026-10-01');
  d0.buchungen.push({ id: 'g1', art: 'ausgabe', name: 'Großeinkauf', betrag: EUR(500), datum: '2026-10-01', kategorie: 'shopping', notiz: '' });
  for (let t = 2; t <= 8; t++) {
    d0.buchungen.push({ id: 'g' + t, art: 'ausgabe', name: 'Kleinkram', betrag: EUR(1), datum: '2026-10-0' + t, kategorie: 'lebensmittel', notiz: '' });
  }
  const r = S.bewerte(d0, '2026-10-09');
  gleich(r.daten.spiel.samen, 226, 'Samen gesamt');
  gleich(r.daten.spiel.xp, 176, 'XP gesamt');
  gleich(r.daten.spiel.bewertet.tage.map(t => t.samen), [2, 12, 12, 12, 12, 12, 12, 42], 'Samen je Tag');
});

// ---------- Raritaeten (SPEC.md, Abschnitt Raritäten) ----------

// Bewertung am Starttag: es werden keine Tage bewertet, nur die Freischaltungen geprueft
const bewertetAm = (d) => S.bewerte(d, '2026-10-01');
const raritaetEreignisse = (r) => r.ereignisse.filter(e => e.art === 'raritaet');

// Startstand mit einer freigeschalteten, noch nicht gepflanzten Rarität
function freigeschaltet(typ, samen = 500) {
  const d = basis(samen);
  d.spiel.raritaeten = { [typ]: { freigeschaltet: '2026-10-01', gepflanzt: false } };
  return d;
}

test('Raritaeten: Königin der Nacht ab 30-Tage-Serie', () => {
  const d = basis();
  d.spiel.besteSerie = 29;
  gleich(bewertetAm(d).daten.spiel.raritaeten.koenigin_der_nacht, undefined, '29 Tage: gesperrt');
  d.spiel.besteSerie = 30;
  const r = bewertetAm(d);
  gleich(r.daten.spiel.raritaeten.koenigin_der_nacht, { freigeschaltet: '2026-10-01', gepflanzt: false }, '30 Tage: freigeschaltet');
  gleich(raritaetEreignisse(r).map(e => e.text), ['Rarität freigeschaltet: Königin der Nacht'], 'Ereignis mit Name');
});

test('Raritaeten: Jadewein bei erreichtem Sparziel', () => {
  const d = basis();
  d.sparziele.push({ id: 's1', name: 'Urlaub', proMonat: 10000, zielsumme: 100000, angespart: 99999 });
  gleich(bewertetAm(d).daten.spiel.raritaeten.jadewein, undefined, '1 Cent fehlt: gesperrt');
  d.sparziele[0].angespart = 100000;
  gleich(bewertetAm(d).daten.spiel.raritaeten.jadewein.freigeschaltet, '2026-10-01', 'Zielsumme erreicht');
});

test('Raritaeten: Thai Constellation nach 3 Zeiträumen in Folge (unsortiert)', () => {
  const d = basis();
  d.spiel.bewertet.zeitraeume = [
    { start: '2026-09-27', erfuellt: true }, { start: '2026-07-27', erfuellt: true }, { start: '2026-08-27', erfuellt: true }
  ];
  gleich(bewertetAm(d).daten.spiel.raritaeten.thai_constellation.freigeschaltet, '2026-10-01', '3 in Folge');
  const luecke = basis();
  luecke.spiel.bewertet.zeitraeume = [
    { start: '2026-07-27', erfuellt: true }, { start: '2026-08-27', erfuellt: false }, { start: '2026-09-27', erfuellt: true }, { start: '2026-10-27', erfuellt: true }
  ];
  gleich(bewertetAm(luecke).daten.spiel.raritaeten.thai_constellation, undefined, 'Lücke: gesperrt');
});

test('Raritaeten: Pink Princess nach 4 Wochen in Folge alle Challenges', () => {
  const d = basis();
  const wochen = ['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24'];
  d.spiel.bewertet.wochen = wochen.map(start => ({ start, erfuellt: true }));
  for (const w of wochen) d.spiel.challenges[w] = [{ id: 'a', erfuellt: true }, { id: 'b', erfuellt: true }];
  gleich(bewertetAm(d).daten.spiel.raritaeten.pink_princess.freigeschaltet, '2026-10-01', '4 Wochen in Folge');
  d.spiel.challenges['2026-08-17'][1].erfuellt = false;
  gleich(bewertetAm(d).daten.spiel.raritaeten.pink_princess, undefined, 'eine offene Challenge bricht die Folge');
});

test('Raritaeten: Drachenbaum ab 1.000 € insgesamt angespart', () => {
  const d = basis();
  d.sparziele.push({ id: 'a', name: 'A', proMonat: 0, zielsumme: null, angespart: 40000 }, { id: 'b', name: 'B', proMonat: 0, zielsumme: null, angespart: 59999 });
  gleich(bewertetAm(d).daten.spiel.raritaeten.drachenbaum, undefined, '999,99 € insgesamt: gesperrt');
  d.sparziele[1].angespart = 60000;
  gleich(bewertetAm(d).daten.spiel.raritaeten.drachenbaum.freigeschaltet, '2026-10-01', '1.000 € insgesamt');
});

test('Raritaeten: Goldener Ginkgo ab Level 15', () => {
  const d = basis(500, 10499);
  gleich(bewertetAm(d).daten.spiel.raritaeten.gold_ginkgo, undefined, 'Level 14: gesperrt');
  d.spiel.xp = 10500;
  gleich(bewertetAm(d).daten.spiel.raritaeten.gold_ginkgo.freigeschaltet, '2026-10-01', 'Level 15');
});

test('Raritaeten: keine Doppelfreischaltung', () => {
  const d = basis();
  d.spiel.besteSerie = 31;
  const r1 = bewertetAm(d);
  gleich(raritaetEreignisse(r1).length, 1, 'erste Bewertung: ein Ereignis');
  const r2 = S.bewerte(r1.daten, '2026-10-01');
  gleich(raritaetEreignisse(r2).length, 0, 'zweite Bewertung: kein neues Ereignis');
  gleich(r2.daten.spiel.raritaeten.koenigin_der_nacht.freigeschaltet, '2026-10-01', 'Datum bleibt');
});

test('Raritaeten pflanzen: gratis, Stufe 1, rar und gepflanzt', () => {
  const r = S.raritaetPflanzen(freigeschaltet('koenigin_der_nacht', 500), 'koenigin_der_nacht', { feld: [5, 5] });
  klappt(r, 'pflanzen klappt');
  const p = r.daten.spiel.gewaechshaus.pflanzen.find(x => x.typ === 'koenigin_der_nacht');
  gleich(p ? [p.rar, p.stufe] : null, [true, 1], 'rar: true, Stufe 1');
  gleich(r.daten.spiel.samen, 500, 'kostenlos');
  gleich(r.daten.spiel.raritaeten.koenigin_der_nacht.gepflanzt, true, 'als gepflanzt markiert');
});

test('Raritaeten pflanzen: zweites Mal und gesperrt scheitern, verkaufen scheitert', () => {
  const r = S.raritaetPflanzen(freigeschaltet('koenigin_der_nacht'), 'koenigin_der_nacht', { feld: [5, 5] });
  scheitert(S.raritaetPflanzen(r.daten, 'koenigin_der_nacht', { feld: [4, 4] }), 'zweites Pflanzen');
  scheitert(S.raritaetPflanzen(basis(), 'jadewein', { feld: [5, 5] }), 'gesperrt pflanzen');
  const id = r.daten.spiel.gewaechshaus.pflanzen.find(x => x.rar).id;
  gleich(S.verkaufen(r.daten, 'pflanze', id).fehler, 'Raritäten kann man nicht verkaufen.', 'verkaufen');
});

test('Raritaeten leveln: Kosten 90, 180, 300 (Basis 300)', () => {
  const r = S.raritaetPflanzen(freigeschaltet('jadewein', 1000), 'jadewein', { feld: [5, 5] });
  const id = r.daten.spiel.gewaechshaus.pflanzen.find(x => x.rar).id;
  const s2 = S.pflanzeLeveln(r.daten, id);
  gleich(s2.daten.spiel.samen, 910, 'Stufe 2 kostet 90');
  const s3 = S.pflanzeLeveln(s2.daten, id);
  gleich(s3.daten.spiel.samen, 730, 'Stufe 3 kostet 180');
  const s4 = S.pflanzeLeveln(s3.daten, id);
  gleich(s4.daten.spiel.samen, 430, 'Stufe 4 kostet 300');
  gleich(s4.daten.spiel.gewaechshaus.pflanzen.find(x => x.id === id).stufe, 4, 'Stufe 4 erreicht');
});

test('Raritaeten: Platzregel, große nicht auf Möbel, kleine schon', () => {
  const gross = S.raritaetPflanzen(freigeschaltet('jadewein'), 'jadewein', { moebel: 'm2', platz: 1 });
  gleich(gross.fehler, 'Große Pflanzen passen nicht auf ein Möbel.', 'groß auf Möbel scheitert');
  const klein = S.raritaetPflanzen(freigeschaltet('pink_princess'), 'pink_princess', { moebel: 'm2', platz: 1 });
  klappt(klein, 'klein auf Möbel klappt');
  const frei = S.freiePlaetze(freigeschaltet('jadewein'), 'raritaet', 'jadewein');
  gleich(frei.some(o => 'moebel' in o), false, 'groß: keine Stellplätze auf Möbeln');
  gleich(frei.length > 0, true, 'groß: freie Felder');
  gleich(S.freiePlaetze(freigeschaltet('pink_princess'), 'raritaet', 'pink_princess').some(o => 'moebel' in o), true, 'klein: Stellplätze auf Möbeln');
});

test('Raritaeten: nicht im Katalog, Liste mit Zustand und Fortschritt', () => {
  gleich(S.katalog(basis()).some(k => k.typ === 'koenigin_der_nacht'), false, 'nicht im Katalog');
  const d = basis();
  d.spiel.besteSerie = 12;
  const liste = S.raritaetenListe(d);
  const k = liste.find(x => x.typ === 'koenigin_der_nacht');
  gleich([k.zustand, k.fortschritt.text], ['gesperrt', '12 von 30 Tagen'], 'gesperrt mit Fortschritt');
  gleich(liste.find(x => x.typ === 'jadewein').zustand, 'gesperrt', 'Jadewein gesperrt');
  gleich(S.raritaetenListe(freigeschaltet('jadewein')).find(x => x.typ === 'jadewein').zustand, 'bereit', 'bereit nach Freischaltung');
  const gp = S.raritaetPflanzen(freigeschaltet('jadewein'), 'jadewein', { feld: [5, 5] });
  gleich(S.raritaetenListe(gp.daten).find(x => x.typ === 'jadewein').zustand, 'gepflanzt', 'gepflanzt nach Pflanzen');
});

// ---------- Auftrag 1.1: Katalog, Tagesgeschenk, Gutscheine, Einsteiger, Sofort-Belohnung ----------

const HEUTE = '2026-10-13';
const GESTERN = '2026-10-12';

// Startstand mit Besuch (letzter Tag, Serie)
function mitBesuch(letzter, serie, samen = 50, xp = 0) {
  const d = basis(samen, xp);
  d.spiel.besuch = { letzter, serie };
  return d;
}

// Start am Freitag 2026-10-09 (Einsteiger-Woche 05.10. bis 11.10.)
function startFreitag(samen = 0) {
  const d = basis(samen);
  d.einstellungen.startDatum = '2026-10-09';
  return d;
}

// Ausgabe an einem Tag
function ausgabe(datum, betrag) {
  return { id: 'a' + datum, art: 'ausgabe', name: 'Einkauf', betrag, datum, kategorie: 'lebensmittel', notiz: '' };
}

test('Katze kostet 250 und ist ab Level 3', () => {
  gleich(S.PREISE_DEKO.katze.preis, 250, 'Preis');
  gleich(S.PREISE_DEKO.katze.level, 3, 'Level');
  gleich(S.katalog(basis()).find(k => k.typ === 'katze').freigeschaltet, false, 'auf Level 1 gesperrt');
});

test('Lichterglas heißt die Lichterkette, Brett auf Ziegeln ist im Katalog', () => {
  gleich(S.PREISE_DEKO.lichterkette.name, 'Lichterglas', 'Name Lichterglas');
  const z = S.katalog(basis()).find(k => k.kategorie === 'moebel' && k.typ === 'ziegelbrett');
  gleich([z.name, z.preis, z.level], ['Brett auf Ziegeln', 60, 1], 'Name, Preis 60, Level 1');
});

test('Tagesgeschenk: Serie läuft weiter bei Folgetag', () => {
  const r = S.tagesgeschenk(mitBesuch(GESTERN, 3), HEUTE);
  gleich([r.verfuegbar, r.tag], [true, 4], 'gestern Serie 3 → heute Tag 4');
});

test('Tagesgeschenk: Lücke setzt die Serie auf 1', () => {
  gleich(S.tagesgeschenk(mitBesuch('2026-10-10', 5), HEUTE).tag, 1, 'Lücke → Tag 1');
  gleich(S.tagesgeschenk(basis(), HEUTE).tag, 1, 'nie besucht → Tag 1');
});

test('Tagesgeschenk: nach Tag 7 wieder Tag 1', () => {
  gleich(S.tagesgeschenk(mitBesuch(GESTERN, 7), HEUTE).tag, 1, 'Serie 7 gestern → Tag 1');
});

test('Tagesgeschenk: Samen Tag 1 bis 3 ohne Gutschein', () => {
  gleich(S.tagesgeschenk(basis(), HEUTE).belohnung, { samen: 10 }, 'Tag 1: 10 Samen, kein Gutschein');
  const t2 = S.tagesgeschenk(mitBesuch(GESTERN, 1), HEUTE).belohnung;
  gleich([t2.samen, t2.gutschein], [15, undefined], 'Tag 2: 15 Samen, kein Gutschein');
});

test('Tagesgeschenk: Tag 4 und Tag 7 mit Gutschein', () => {
  const t4 = S.tagesgeschenk(mitBesuch(GESTERN, 3), HEUTE).belohnung;
  gleich([t4.samen, t4.gutschein.kategorie, PFLANZEN[t4.gutschein.typ].groesse], [15, 'pflanze', 'klein'], 'Tag 4: 15 Samen, kleine Pflanze');
  const t7 = S.tagesgeschenk(mitBesuch(GESTERN, 6), HEUTE).belohnung;
  gleich([t7.samen, t7.gutschein.kategorie, !!DEKO[t7.gutschein.typ]], [60, 'deko', true], 'Tag 7: 60 Samen, gezeichnete Deko');
});

test('Tagesgeschenk: Gutschein deterministisch und nur gezeichnet und freigeschaltet', () => {
  const d = mitBesuch(GESTERN, 3);
  const a = S.tagesgeschenk(d, HEUTE).belohnung.gutschein;
  gleich(a, S.tagesgeschenk(d, HEUTE).belohnung.gutschein, 'gleiches Datum, gleicher Gutschein');
  const k = S.katalog(d).find(x => x.kategorie === 'pflanze' && x.typ === a.typ);
  gleich([k.gezeichnet, k.freigeschaltet], [true, true], 'gezeichnet und freigeschaltet');
});

test('Tagesgeschenk: am selben Tag schon abgeholt → nicht verfügbar', () => {
  const r = S.tagesgeschenk(mitBesuch(HEUTE, 4), HEUTE);
  gleich([r.verfuegbar, r.tag], [false, 4], 'verfügbar false, Tag der Serie bleibt');
});

test('geschenkAbholen: Samen, XP, Besuch; zweiter Abruf am Tag scheitert', () => {
  const r = S.geschenkAbholen(basis(50), HEUTE);
  klappt(r, 'erster Abruf');
  gleich([r.daten.spiel.samen, r.daten.spiel.xp], [60, 10], 'Samen 50+10, XP 10');
  gleich(r.daten.spiel.besuch, { letzter: HEUTE, serie: 1 }, 'Besuch gesetzt');
  gleich(S.tagesgeschenk(r.daten, HEUTE).verfuegbar, false, 'heute nicht mehr verfügbar');
  scheitert(S.geschenkAbholen(r.daten, HEUTE), 'zweimal am Tag');
  gleich(r.daten.spiel.samen, 60, 'zweiter Abruf ändert nichts');
});

test('geschenkAbholen Tag 4: Gutschein wird gespeichert', () => {
  const r = S.geschenkAbholen(mitBesuch(GESTERN, 3), HEUTE);
  klappt(r, 'Tag 4');
  gleich(r.daten.spiel.gutscheine.length, 1, 'ein Gutschein');
  gleich(r.daten.spiel.gutscheine[0].kategorie, 'pflanze', 'Kategorie Pflanze');
});

test('Gutschein-Kauf: 0 Samen, Gutschein verbraucht, Level-Sperre gilt nicht', () => {
  const d = basis(0);
  d.spiel.gutscheine = [{ kategorie: 'pflanze', typ: 'aloe' }];
  scheitert(S.kaufen(basis(500), 'pflanze', 'aloe', { feld: [2, 2] }), 'ohne Gutschein ab Level 3 gesperrt');
  const r = S.kaufen(d, 'pflanze', 'aloe', { feld: [2, 2] });
  klappt(r, 'Kauf mit Gutschein');
  gleich([r.daten.spiel.samen, r.daten.spiel.gutscheine.length], [0, 0], '0 Samen, Gutschein weg');
  gleich(r.daten.spiel.gewaechshaus.pflanzen.some(p => p.typ === 'aloe'), true, 'Pflanze steht im Garten');
  gleich(S.katalog(d).find(k => k.typ === 'aloe').gutschein, true, 'Katalog markiert den Gutschein');
});

test('Gutschein-Kauf scheitert ohne Platz und verbraucht den Gutschein nicht', () => {
  const d = basis(0);
  d.spiel.gutscheine = [{ kategorie: 'deko', typ: 'bank' }];
  const r = S.kaufen(d, 'deko', 'bank', { feld: [9, 9] });
  scheitert(r, 'Feld außerhalb');
  gleich(d.spiel.gutscheine.length, 1, 'Eingabe unverändert, Gutschein da');
});

test('Einsteiger-Challenges bei Start am Freitag: m = 3, n = 2, 20 und 30 Samen', () => {
  const ch = S.challengesDerWoche('2026-10-05', startFreitag());
  gleich(ch.map(c => c.id), ['einstieg_erste_ausgabe', 'einstieg_im_budget'], 'zwei Einsteiger-Challenges');
  gleich(ch.map(c => c.samen), [20, 30], 'Samen 20 und 15 × 2');
  gleich(ch[1].text, 'Bleib an 2 der restlichen 3 Tage im Budget', 'Text mit n und m');
});

test('Normale Challenges bei Start vor der Woche und am Montag', () => {
  const normal = S.challengesDerWoche('2026-10-05').map(c => c.id);
  const d = basis();
  d.einstellungen.startDatum = '2026-10-01';
  gleich(S.challengesDerWoche('2026-10-05', d).map(c => c.id), normal, 'Start vor der Woche');
  d.einstellungen.startDatum = '2026-10-05';
  gleich(S.challengesDerWoche('2026-10-05', d).map(c => c.id), normal, 'Start am Montag (7 Tage übrig)');
});

test('Einsteiger-Fortschritt zählt nur Tage ab dem Start', () => {
  const d = startFreitag();
  const b = S.challengesDerWoche('2026-10-05', d)[1];
  const st = S.challengeStatus(d, b, '2026-10-05', '2026-10-11');
  gleich([st.ist, st.soll], [3, 2], 'Fr, Sa, So ohne Ausgaben: 3 statt 7 Tage');
});

test('Sofort-Belohnung: Zähl-Challenge am Starttag, genau einmal', () => {
  const d = startFreitag();
  d.buchungen.push({ id: 'e1', art: 'ausgabe', name: 'Brot', betrag: EUR(3), datum: '2026-10-09', kategorie: 'lebensmittel', notiz: '' });
  const r1 = S.bewerte(d, '2026-10-09');
  const ev = r1.ereignisse.filter(e => e.art === 'challenge');
  gleich(ev.map(e => [e.text, e.samen]), [['Trag heute deine erste Ausgabe ein', 20]], 'Ereignis mit Text und 20 Samen');
  const eintrag = r1.daten.spiel.challenges['2026-10-05'].find(e => e.id === 'einstieg_erste_ausgabe');
  gleich(eintrag, { id: 'einstieg_erste_ausgabe', erfuellt: true, belohnt: true }, 'Eintrag erfuellt und belohnt');
  const r2 = S.bewerte(r1.daten, '2026-10-09');
  gleich(r2.ereignisse.filter(e => e.art === 'challenge').length, 0, 'zweiter Aufruf zahlt nicht erneut');
  gleich(r2.daten.spiel.samen, r1.daten.spiel.samen, 'Samen unverändert');
});

test('Sofort-Belohnung: am Wochenende nicht erneut gezahlt, Startwoche ohne Wochenbonus', () => {
  const d = startFreitag();
  d.buchungen.push({ id: 'e1', art: 'ausgabe', name: 'Brot', betrag: EUR(3), datum: '2026-10-09', kategorie: 'lebensmittel', notiz: '' });
  const r1 = S.bewerte(d, '2026-10-09');
  const r3 = S.bewerte(r1.daten, '2026-10-12');
  const erste = r3.ereignisse.filter(e => e.art === 'challenge' && e.text === 'Trag heute deine erste Ausgabe ein');
  gleich(erste.length, 0, 'erste Ausgabe nicht noch einmal am Wochenende');
  gleich(r3.daten.spiel.bewertet.wochen.length, 1, 'Startwoche einmal bewertet');
  gleich(r3.daten.spiel.bewertet.wochen[0].erfuellt, false, 'Startwoche: kein Wochenbonus');
});

test('Wochenrückblick: Samen der Startwoche enthalten die sofortige Belohnung', () => {
  const d = startFreitag();
  d.buchungen.push({ id: 'e1', art: 'ausgabe', name: 'Brot', betrag: EUR(3), datum: '2026-10-09', kategorie: 'lebensmittel', notiz: '' });
  const r1 = S.bewerte(d, '2026-10-09');
  const r3 = S.bewerte(r1.daten, '2026-10-12');
  gleich(S.wochenRueckblick(r3.daten, '2026-10-05').samen, r3.daten.spiel.samen - d.spiel.samen, 'Rückblick = alle Gutschriften der Woche');
});

test('Sofort-Belohnung: Verbots-Challenge wird unter der Woche nicht gezahlt', () => {
  const wb = '2026-10-05';
  const d = basis();
  d.einstellungen.startDatum = '2026-10-05';
  const r = S.bewerte(d, '2026-10-07');
  const verbote = S.challengesDerWoche(wb).filter(c => c.art === 'grenze').map(c => c.text);
  const gezahlt = r.ereignisse.filter(e => e.art === 'challenge').map(e => e.text);
  gleich(gezahlt.filter(t => verbote.includes(t)).length, 0, 'keine Verbots-Challenge vor dem Wochenende');
});

test('challengeStatus: Einsteiger-Zähl-Challenge ist geschafft', () => {
  const d = startFreitag();
  d.buchungen.push({ id: 'e1', art: 'ausgabe', name: 'Brot', betrag: EUR(3), datum: '2026-10-09', kategorie: 'lebensmittel', notiz: '' });
  const a = S.challengesDerWoche('2026-10-05', d)[0];
  gleich(S.challengeStatus(d, a, '2026-10-05', '2026-10-09').zustand, 'geschafft', 'Zustand geschafft');
});

// ---------- Speicher ----------

test('standardDaten und importText: Rundweg', () => {
  const s = P.standardDaten('2026-10-10');
  gleich(s.einstellungen.gehaltstag, 1, 'Gehaltstag 1');
  gleich(s.spiel.samen, 50, 'Start 50 Samen');
  gleich(s.kategorien.length, 8, '8 Kategorien');
  const exp = P.exportDatei(s, new Date(2026, 9, 10));
  gleich(exp.name, 'budgetgarten-2026-10-10.json', 'Dateiname');
  const zurueck = P.importText(exp.text);
  gleich(JSON.stringify(zurueck), JSON.stringify(s), 'Rundweg identisch');
});

test('importText: Fehler mit Meldung', () => {
  gleich(wirft(() => P.importText('{kaputt')) !== null, true, 'kein JSON');
  const v2 = Object.assign(P.standardDaten('2026-10-10'), { schema: 2 });
  gleich(String(wirft(() => P.importText(JSON.stringify(v2)))).includes('schema 2'), true, 'falsches schema');
  const kaputt = P.standardDaten('2026-10-10');
  delete kaputt.spiel.gewaechshaus;
  gleich(String(wirft(() => P.importText(JSON.stringify(kaputt)))).includes('spiel.gewaechshaus'), true, 'Pflichtfeld fehlt');
});

test('neueId: Praefix und Eindeutigkeit', () => {
  const a = P.neueId('p');
  const b = P.neueId('p');
  gleich(a.startsWith('p'), true, 'Praefix');
  gleich(a !== b, true, 'zwei Ids verschieden');
});

// ---------- Ausgabe ----------

const zeilen = document.getElementById('zeilen');
let bestanden = 0;
for (const r of ergebnisse) {
  if (r.ok) bestanden++;
  const li = document.createElement('li');
  li.className = r.ok ? 'gruen' : 'rot';
  li.textContent = (r.ok ? '✔ ' : '✘ ') + r.text;
  zeilen.appendChild(li);
}
const ergebnisZeile = document.getElementById('ergebnis');
ergebnisZeile.textContent = bestanden + ' von ' + ergebnisse.length + ' bestanden';
ergebnisZeile.dataset.ok = String(bestanden === ergebnisse.length);
