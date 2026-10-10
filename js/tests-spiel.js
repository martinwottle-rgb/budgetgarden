// Mini-Testrahmen fuer Spiel-Logik (spiel.js) und Speicherung (speicher.js). Laeuft im Browser, zeigt jede Pruefung als Zeile.

import * as L from './logik.js';
import * as S from './spiel.js';
import * as P from './speicher.js';
import { PFLANZEN } from './grafik/pflanzen.js';

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

// Gestaffelte Freischaltung: je Stufe ab 2 bis zur hoechsten Stufe 1 bis 2 Artikel, keine Luecken
function gestaffelt(kategorie) {
  const zaehl = {};
  for (const k of S.katalog(P.standardDaten('2026-10-01'))) {
    if (k.kategorie === kategorie) zaehl[k.level] = (zaehl[k.level] || 0) + 1;
  }
  const hoechste = Math.max(...Object.keys(zaehl).map(Number));
  for (let l = 2; l <= hoechste; l++) {
    if (!zaehl[l] || zaehl[l] > 2) return false;
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
  gleich(k.filter(x => x.kategorie === 'moebel' && x.level === 1).length, 3, 'Level 1: 3 Möbel');
  gleich(k.filter(x => x.kategorie === 'deko' && x.level === 1).length, 4, 'Level 1: 4 Deko');
  gleich(gestaffelt('pflanze'), true, 'Pflanzen gestaffelt');
  gleich(gestaffelt('moebel'), true, 'Möbel gestaffelt');
  gleich(gestaffelt('deko'), true, 'Deko gestaffelt');
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
  gleich(r1.daten.spiel.samen, 50 + 70 + 30 + 2, 'Samen: Start 50, 7 Tage à 10, Serienbonus 30, Eintrag 2');
  gleich(r1.daten.spiel.xp, 102, 'XP = verdiente Samen');
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
