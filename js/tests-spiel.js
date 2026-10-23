// Mini-Testrahmen fuer Spiel-Logik (spiel.js) und Speicherung (speicher.js). Laeuft im Browser, zeigt jede Pruefung als Zeile.

import * as L from './logik.js';
import * as S from './spiel.js';
import * as P from './speicher.js';
import { PFLANZEN } from './grafik/pflanzen.js';
import { DEKO } from './grafik/deko.js';
import { PFLANZEN2 } from './grafik/pflanzen2.js';

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

// Startstand mit genug Samen, Level 1. Für die Mechanik-Tests mit dem früheren Startgarten
// (Teakregal, Pflanzentisch, eine Efeutute) und ohne Start-Gutscheine.
function basis(samen = 500, xp = 0) {
  const d = P.standardDaten('2026-10-01');
  d.einstellungen.ersteinrichtungFertig = true;
  d.spiel.gutscheine = [];
  d.spiel.gewaechshaus.moebel = [
    { id: 'm1', typ: 'regal_holz', gx: 0, gy: 1.6, drehung: 90 },
    { id: 'm2', typ: 'tisch_natur', gx: 1.2, gy: 0, drehung: 0 }
  ];
  d.spiel.gewaechshaus.pflanzen = [{ id: 'p1', typ: 'efeutute', stufe: 1, ort: { moebel: 'm2', platz: 0 } }];
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

// Je Stufe höchstens `max` Artikel einer Kategorie (Stufe 1 ausgenommen). Lücken prüft der Test "Level 1 bis 25".
function gestaffelt(kategorie, max = 2) {
  const zaehl = {};
  for (const k of S.katalog(P.standardDaten('2026-10-01'))) {
    if (k.kategorie === kategorie) zaehl[k.level] = (zaehl[k.level] || 0) + 1;
  }
  return Object.keys(zaehl).every(l => Number(l) === 1 || zaehl[l] <= max);
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
  gleich(k.filter(x => x.kategorie === 'pflanze' && x.level === 1).length, 2, 'Level 1: 2 Pflanzen');
  // Neu verteilt (23.10.): Start mit je zwei Artikeln, danach meist je ein Artikel pro Kategorie und Level
  gleich(k.filter(x => x.kategorie === 'moebel' && x.level === 1).length, 2, 'Level 1: 2 Möbel');
  gleich(k.filter(x => x.kategorie === 'deko' && x.level === 1).length, 2, 'Level 1: 2 Deko');
  gleich(k.filter(x => ['pflanze', 'moebel', 'deko'].includes(x.kategorie) && x.level <= 3).length, 12, 'bis Level 3 insgesamt 12 Artikel');
  gleich(['pflanze', 'moebel', 'deko'].every(kat => gestaffelt(kat, 3)), true, 'je Kategorie höchstens 3 Artikel je Stufe (Stufe 1 ausgenommen)');
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
  gleich(k.filter(x => x.kategorie === 'pflanze').every(x => x.gezeichnet === (Object.prototype.hasOwnProperty.call(PFLANZEN, x.typ) || Object.prototype.hasOwnProperty.call(PFLANZEN2, x.typ))), true, 'gezeichnet = in PFLANZEN oder PFLANZEN2');
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
  const r = S.kaufen(d, 'moebel', 'tisch_natur', { gx: 3, gy: 3, drehung: 0 });
  scheitert(r, 'Pflanzentisch (150) mit 50 Samen');
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
  const d = basis(500, 300);
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
  return basis(2000, 7800); // Level 13: Hängeampel (8) und Haarnadel-Regal (13) freigeschaltet
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

// Startstand mit Besuch (letzter Tag, Anzahl abgeholter Geschenke = tag)
function mitBesuch(letzter, tag, samen = 50, xp = 0) {
  const d = basis(samen, xp);
  d.spiel.besuch = { letzter, tag };
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


test('Start: leeres Gewächshaus, 50 Samen, Möbel-Gutschein nach Wahl und Efeutute', () => {
  const d = P.standardDaten('2026-10-01');
  d.einstellungen.ersteinrichtungFertig = true;
  gleich([d.spiel.samen, d.spiel.gewaechshaus.moebel.length, d.spiel.gewaechshaus.pflanzen.length], [50, 0, 0], '50 Samen, leer');
  const k = S.katalog(d);
  gleich(k.filter(x => x.kategorie === 'moebel' && x.gutschein).map(x => x.typ).sort(), ['tisch_natur', 'ziegelbrett'], 'Gutschein gilt für die Level-1-Möbel');
  gleich(k.find(x => x.typ === 'regal_holz').gutschein, false, 'nicht für Level-3-Möbel');
  const r = S.kaufen(d, 'moebel', 'tisch_natur', { gx: 2, gy: 2, drehung: 0 });
  klappt(r, 'Tisch mit Gutschein');
  gleich([r.daten.spiel.samen, r.daten.spiel.gutscheine.length], [50, 1], 'gratis, ein Gutschein übrig');
  gleich(S.katalog(r.daten).some(x => x.kategorie === 'moebel' && x.gutschein), false, 'Möbel-Gutschein verbraucht');
  const tisch = r.daten.spiel.gewaechshaus.moebel[0];
  const r2 = S.kaufen(r.daten, 'pflanze', 'efeutute', { moebel: tisch.id, platz: 0 });
  klappt(r2, 'Efeutute mit Gutschein auf den Tisch');
  gleich([r2.daten.spiel.samen, r2.daten.spiel.gutscheine.length], [50, 0], 'gratis, keine Gutscheine mehr');
});

test('Katze kostet 250 und ist ab Level 9', () => {
  gleich(S.PREISE_DEKO.katze.preis, 250, 'Preis');
  gleich(S.PREISE_DEKO.katze.level, 9, 'Level');
  gleich(S.katalog(basis()).find(k => k.typ === 'katze').freigeschaltet, false, 'auf Level 1 gesperrt');
});

test('Lichterglas heißt die Lichterkette, Brett auf Ziegeln ist im Katalog', () => {
  gleich(S.PREISE_DEKO.lichterkette.name, 'Lichterglas', 'Name Lichterglas');
  const z = S.katalog(basis()).find(k => k.kategorie === 'moebel' && k.typ === 'ziegelbrett');
  gleich([z.name, z.preis, z.level], ['Brett auf Betonsteinen', 60, 1], 'Name, Preis 60, Level 1');
});

test('Tagesgeschenk: Serie läuft weiter bei Folgetag', () => {
  const r = S.tagesgeschenk(mitBesuch(GESTERN, 3), HEUTE);
  gleich([r.verfuegbar, r.tag], [true, 4], 'gestern Serie 3 → heute Tag 4');
});

test('Tagesgeschenk: Lücke setzt den Zähler nicht zurück', () => {
  gleich(S.tagesgeschenk(mitBesuch('2026-10-10', 5), HEUTE).tag, 6, 'Lücke: nächster Tag ist 6');
  gleich(S.tagesgeschenk(basis(), HEUTE).tag, 1, 'nie besucht: Tag 1');
});

test('Tagesgeschenk: nach Tag 7 kommt Tag 8 mit 15 Samen, Woche ab Tag 8', () => {
  const r = S.tagesgeschenk(mitBesuch(GESTERN, 7), HEUTE);
  gleich([r.tag, r.belohnung.samen, r.wocheStart], [8, 15, 8], 'Tag 8: 10 + 5 Samen');
});

test('Tagesgeschenk: Tag 14 mit 65 Samen, ab Level 8 Samentüte statt Deko-Gutschein', () => {
  const r = S.tagesgeschenk(mitBesuch(GESTERN, 13), HEUTE).belohnung;
  gleich([r.samen, r.tuete, r.gutschein.kategorie], [65, undefined, 'deko'], 'Tag 14 unter Level 8: Deko-Gutschein');
  const h = S.tagesgeschenk(mitBesuch(GESTERN, 13, 50, 2800), HEUTE).belohnung;
  gleich([h.samen, h.tuete, h.gutschein], [65, 1, undefined], 'Tag 14 ab Level 8: Tüte, kein Gutschein');
});

test('Tagesgeschenk: Tag 30 mit Meilenstein, +100 Samen und Gutschein goldene_giesskanne', () => {
  const r = S.tagesgeschenk(mitBesuch(GESTERN, 29), HEUTE).belohnung;
  gleich([r.samen, r.meilenstein.typ, r.meilensteinGutschein], [135, 'goldene_giesskanne', { kategorie: 'deko', typ: 'goldene_giesskanne' }], 'Tag 30: 15 + 20 + 100');
  const a = S.geschenkAbholen(mitBesuch(GESTERN, 29), HEUTE);
  klappt(a, 'Abholen Tag 30');
  gleich(a.daten.spiel.gutscheine.some(g => g.typ === 'goldene_giesskanne'), true, 'Gutschein gespeichert');
  gleich(a.daten.spiel.besuch, { letzter: HEUTE, tag: 30 }, 'Besuch Tag 30');
});

test('Migration: alter Spielstand mit serie 5 ergibt nächsten Tag 6', () => {
  const d = basis();
  d.spiel.besuch = { letzter: '2026-10-10', serie: 5 };
  gleich(S.tagesgeschenk(d, HEUTE).tag, 6, 'nächster Tag 6');
  gleich(S.bewerte(d, HEUTE).daten.spiel.besuch, { letzter: '2026-10-10', tag: 5 }, 'bewerte schreibt tag');
});

test('naechsterMeilenstein: Tag 18 nennt Tag 30 in 12 Tagen, nach Tag 365 keiner', () => {
  const n = S.naechsterMeilenstein(mitBesuch(GESTERN, 18));
  gleich([n.tag, n.typ, n.name, n.inTagen], [30, 'goldene_giesskanne', 'Goldene Gießkanne', 12], 'nächster Meilenstein');
  gleich(S.naechsterMeilenstein(mitBesuch(GESTERN, 365)), null, 'alle erreicht');
});

test('Zinkregal und Hohes Zinkregal: Preise und Level', () => {
  gleich([S.PREISE_MOEBEL.zinkregal.preis, S.PREISE_MOEBEL.zinkregal.level], [120, 2], 'Zinkregal 120, Level 2');
  gleich([S.PREISE_MOEBEL.zinkregal_hoch.preis, S.PREISE_MOEBEL.zinkregal_hoch.level], [340, 14], 'Hohes Zinkregal 340, Level 14');
  gleich(S.PREISE_MOEBEL.metallregal.name, 'Haarnadel-Regal', 'Haarnadel-Regal unverändert');
});

test('Meilenstein-Deko: nur mit Gutschein im Katalog, gratis', () => {
  gleich(S.katalog(basis()).some(k => k.typ === 'goldene_giesskanne'), false, 'ohne Gutschein nicht im Katalog');
  const d = basis(0);
  d.spiel.gutscheine = [{ kategorie: 'deko', typ: 'goldene_giesskanne' }];
  const k = S.katalog(d).find(x => x.typ === 'goldene_giesskanne');
  gleich([k.preis, k.gutschein, k.meilenstein, k.freigeschaltet], [0, true, 30, true], 'gratis, Gutschein, Meilenstein 30');
  klappt(S.kaufen(d, 'deko', 'goldene_giesskanne', { feld: [2, 2] }), 'Kauf mit Gutschein (braucht die Grafik aus deko2.js)');
});

test('Tagesgeschenk: Samen Tag 1 bis 3 ohne Gutschein', () => {
  gleich(S.tagesgeschenk(basis(), HEUTE).belohnung, { samen: 10 }, 'Tag 1: 10 Samen, kein Gutschein');
  const t2 = S.tagesgeschenk(mitBesuch(GESTERN, 1), HEUTE).belohnung;
  gleich([t2.samen, t2.gutschein], [15, undefined], 'Tag 2: 15 Samen, kein Gutschein');
});

test('Tagesgeschenk: Tag 4 und Tag 7 mit Gutschein', () => {
  const t4 = S.tagesgeschenk(mitBesuch(GESTERN, 3), HEUTE).belohnung;
  gleich([t4.samen, t4.gutschein.kategorie, S.katalog(basis()).find(k => k.typ === t4.gutschein.typ).groesse], [15, 'pflanze', 'klein'], 'Tag 4: 15 Samen, kleine Pflanze');
  const t7 = S.tagesgeschenk(mitBesuch(GESTERN, 6), HEUTE).belohnung;
  gleich([t7.samen, t7.gutschein.kategorie, S.katalog(basis()).find(k => k.typ === t7.gutschein.typ).gezeichnet], [60, 'deko', true], 'Tag 7: 60 Samen, gezeichnete Deko');
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
  gleich(r.daten.spiel.besuch, { letzter: HEUTE, tag: 1 }, 'Besuch gesetzt');
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

test('eintragBelohnen: erste Buchung des Tages 2 Samen und 2 XP, die zweite nichts', () => {
  const a = S.eintragBelohnen(basis(50), HEUTE, HEUTE);
  gleich([a.samen, a.daten.spiel.samen, a.daten.spiel.xp], [2, 52, 2], 'erste Buchung');
  const b = S.eintragBelohnen(a.daten, HEUTE, HEUTE);
  gleich([b.samen, b.daten.spiel.samen], [0, 52], 'zweite Buchung am selben Tag');
  gleich(S.eintragBelohnen(basis(50), HEUTE, GESTERN).samen, 0, 'Buchung für einen anderen Tag gibt nichts');
});

test('bewerte: Tag mit Sofort-Eintrag bekommt kein eintrag-Ereignis mehr', () => {
  const d = basis(0);
  d.einstellungen.startDatum = GESTERN;
  d.buchungen.push(ausgabe(GESTERN, 500));
  const ohne = S.bewerte(d, HEUTE).ereignisse.filter(e => e.art === 'eintrag').length;
  const mit = { ...d, spiel: { ...d.spiel, eintragSofort: [GESTERN] } };
  const mitE = S.bewerte(mit, HEUTE).ereignisse.filter(e => e.art === 'eintrag').length;
  gleich([ohne, mitE], [1, 0], 'ohne Sofort-Eintrag 1, mit Sofort-Eintrag 0');
});

test('verlauf: Geschenk oben, wächst, höchstens 60 Einträge', () => {
  const r = S.geschenkAbholen(basis(50), HEUTE);
  gleich([r.daten.spiel.verlauf[0].art, r.daten.spiel.verlauf[0].samen], ['geschenk', 10], 'Geschenk oben mit 10 Samen');
  const e = S.eintragBelohnen(r.daten, HEUTE, HEUTE);
  gleich([e.daten.spiel.verlauf.length, e.daten.spiel.verlauf[0].art], [2, 'eintrag'], 'wächst, neueste zuerst');
  const voll = basis();
  voll.spiel.verlauf = Array.from({ length: 60 }, (_, i) => ({ datum: GESTERN, art: 'alt', text: 'alt ' + i, samen: 1 }));
  const v = S.eintragBelohnen(voll, HEUTE, HEUTE);
  gleich([v.daten.spiel.verlauf.length, v.daten.spiel.verlauf[0].art], [60, 'eintrag'], 'höchstens 60');
});

test('freischaltungenBei: Level 8 mit Samentüte, Level 2 mit Metallregal, ohne Meilenstein-Deko', () => {
  gleich(S.freischaltungenBei(basis(), 8).some(x => x.kategorie === 'tuete' && x.typ === 'samentuete'), true, 'Level 8: Samentüte');
  gleich(S.freischaltungenBei(basis(), 2).some(x => x.typ === 'zinkregal'), true, 'Level 2: Zinkregal');
  gleich(S.freischaltungenBei(basis(), 6).some(x => x.typ === 'flaeche7'), true, 'Level 6: Grundfläche 7');
  gleich(S.freischaltungenBei(basis(), 1).some(x => x.typ === 'goldene_giesskanne'), false, 'Meilenstein-Deko nie dabei');
});

test('samenQuellen: neun Quellen, heuteInAussicht liefert 0, 10 oder 40 Samen', () => {
  gleich(S.samenQuellen(basis()).length, 9, 'neun Quellen');
  const h = S.heuteInAussicht(basis(), HEUTE);
  gleich([[0, 10, 40].includes(h.samen), typeof h.text], [true, 'string'], 'Samen und Text');
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

// Toleranzen der Samentüten-Verteilung in Prozentpunkten (Garantie hebt die Legendär-Quote an, siehe Bericht)
const TOL_GEW = 3;
const TOL_SEL = 3;
const TOL_EPI = 2;
const TOL_LEG = 2;

// ---------- SPEC-2: Saatgut, Samentüten, Beete, Ernte, Designs, Herbarium, Saison ----------

// Startstand mit Level 8 (XP 2800) und Gratis-Tüten
function ab8(samen = 500, gratis = 0) {
  const d = basis(samen, 2800);
  d.spiel.gratisTueten = gratis;
  return d;
}

// Kräuterbeet b1 (Stellplätze 0 bis 3) direkt in den Garten gestellt
function mitBeet(d, typ = 'kraeuterbeet', id = 'b1', gx = 0, gy = 4) {
  d.spiel.gewaechshaus.moebel.push({ id, typ, gx, gy, drehung: 0 });
  return d;
}

// Saatpflanze direkt auf Platz 0 von b1
function saatPflanze(d, typ, stufe = 1, ernteTage = 0, id = 'sp1') {
  d.spiel.gewaechshaus.pflanzen.push({ id, typ, stufe, ort: { moebel: 'b1', platz: 0 }, saat: true, ernteTage, fortschritt: 0 });
  return d;
}

const anzahlSaatgut = (d) => Object.values(d.spiel.saatgut).reduce((a, b) => a + b, 0);

test('Samentüte: Level 8, 50 Samen, Saatgut, Herbarium', () => {
  scheitert(S.samentuete(basis(500, 2100), HEUTE), 'Level 7: gesperrt');
  scheitert(S.samentuete(basis(20, 2800), HEUTE), 'zu wenig Samen');
  const r = S.samentuete(basis(200, 2800), HEUTE);
  klappt(r, 'Tüte ab Level 8');
  gleich(r.daten.spiel.samen, 150, '50 Samen abgezogen');
  gleich(anzahlSaatgut(r.daten), 1, 'ein Samen im Inventar');
  gleich(r.daten.spiel.entdeckt.includes(r.sorte), true, 'Saat im Herbarium');
  gleich(r.umgetauscht, 0, 'erstes Exemplar: kein Umtausch');
  gleich(basis(200, 2800).spiel.samen, 200, 'Eingabe unverändert');
});

test('Samentüte: Gratis-Tüte kostet keine Samen', () => {
  const r = S.samentuete(ab8(0, 1), HEUTE);
  klappt(r, 'Gratis-Tüte ohne Samen');
  gleich([r.daten.spiel.samen, r.daten.spiel.gratisTueten, r.gratis], [0, 0, true], '0 Samen, Gratis verbraucht');
  scheitert(S.samentuete(ab8(0, 0), HEUTE), 'ohne Gratis und ohne Samen');
});

test('Samentüte: Verteilung über 10000 deterministische Ziehungen', () => {
  let d = ab8(0, 10000);
  const zaehl = { 'gewoehnlich': 0, 'selten': 0, 'episch': 0, 'legendaer': 0 };
  let lauf = 0;
  let laengsterLauf = 0;
  let ohneLeg = 0;
  let laengsterOhneLeg = 0;
  for (let i = 0; i < 10000; i++) {
    const r = S.samentuete(d, HEUTE);
    d = r.daten;
    zaehl[r.seltenheit]++;
    lauf = r.seltenheit === 'gewoehnlich' ? lauf + 1 : 0;
    laengsterLauf = Math.max(laengsterLauf, lauf);
    ohneLeg = r.seltenheit === 'legendaer' ? 0 : ohneLeg + 1;
    laengsterOhneLeg = Math.max(laengsterOhneLeg, ohneLeg);
  }
  const p = (k) => zaehl[k] / 100;
  const text = 'gew ' + p('gewoehnlich') + ' %, selten ' + p('selten') + ' %, episch ' + p('episch') + ' %, legendär ' + p('legendaer') + ' %';
  gleich(Math.abs(p('gewoehnlich') - 60) <= TOL_GEW && Math.abs(p('selten') - 28) <= TOL_SEL && Math.abs(p('episch') - 10) <= TOL_EPI && Math.abs(p('legendaer') - 2) <= TOL_LEG, true, 'Anteile in Toleranz (' + text + ')');
  gleich(laengsterLauf <= 9, true, 'Garantie: höchstens 9 gewöhnliche in Folge');
  gleich(laengsterOhneLeg <= 39, true, 'Garantie: höchstens 39 ohne legendär');
});

test('Samentüte: Garantie 10. Tüte mindestens selten, 40. legendär', () => {
  let gewoehnlich = 0;
  let nichtLegendaer = 0;
  for (let i = 1; i <= 30; i++) {
    const tag = '2026-10-' + String(i).padStart(2, '0');
    const d = ab8(0, 1);
    d.spiel.tuete = { seitSelten: 9, seitLegendaer: 0, geoeffnet: i };
    if (S.samentuete(d, tag).seltenheit === 'gewoehnlich') gewoehnlich++;
    const e = ab8(0, 1);
    e.spiel.tuete = { seitSelten: 0, seitLegendaer: 39, geoeffnet: i };
    if (S.samentuete(e, tag).seltenheit !== 'legendaer') nichtLegendaer++;
  }
  gleich(gewoehnlich, 0, '10. Tüte nie gewöhnlich');
  gleich(nichtLegendaer, 0, '40. Tüte immer legendär');
});

test('Samentüte: Umtausch ab dem 4. Exemplar', () => {
  let d = ab8(0, 3000);
  d.spiel.saatgut = { schnittlauch: 3 };
  let treffer = 0;
  let falsch = 0;
  for (let i = 0; i < 3000; i++) {
    const r = S.samentuete(d, HEUTE);
    d = r.daten;
    if (r.sorte === 'schnittlauch') {
      treffer++;
      if (r.umgetauscht !== 10) falsch++;
    }
  }
  gleich(treffer > 20, true, 'Schnittlauch mehrfach gezogen');
  gleich(falsch, 0, 'jedes weitere Exemplar: 10 Samen');
  gleich(d.spiel.saatgut.schnittlauch, 3, 'Bestand bleibt 3');
  gleich(Object.values(d.spiel.saatgut).every(n => n <= 3), true, 'nie mehr als 3 je Sorte');
});

test('Samentüte: Zierkürbis nur im Herbst', () => {
  const zieh = (heute) => {
    let d = ab8(0, 3000);
    let n = 0;
    for (let i = 0; i < 3000; i++) {
      const r = S.samentuete(d, heute);
      d = r.daten;
      if (r.sorte === 'zierkuerbis') n++;
    }
    return n;
  };
  gleich(zieh('2026-11-15') > 0, true, 'Herbst: Zierkürbis aus Tüten');
  gleich(zieh('2026-12-15'), 0, 'Winter: kein Zierkürbis');
});

test('Saat: nur auf Beetplätzen, Topfpflanzen nie auf dem Beet', () => {
  const d = mitBeet(basis(500));
  d.spiel.saatgut = { schnittlauch: 2 };
  gleich(S.freiePlaetze(d, 'saat', 'schnittlauch').length, 4, 'Kräuterbeet: 4 Beetplätze frei');
  gleich(S.freiePlaetze(d, 'saat', 'schnittlauch').every(o => o.moebel === 'b1'), true, 'nur Beetplätze');
  scheitert(S.saatPflanzen(d, 'schnittlauch', { feld: [3, 3] }), 'Saat auf Feld');
  scheitert(S.saatPflanzen(d, 'schnittlauch', { moebel: 'm2', platz: 1 }), 'Saat auf Tischplatz ohne Beet');
  const r = S.saatPflanzen(d, 'schnittlauch', { moebel: 'b1', platz: 0 });
  klappt(r, 'Saat auf Beetplatz');
  const p = r.daten.spiel.gewaechshaus.pflanzen.find(x => x.saat);
  gleich([p.typ, p.stufe, p.ernteTage, p.saat], ['schnittlauch', 1, 0, true], 'Saatpflanze Stufe 1');
  gleich(r.daten.spiel.saatgut.schnittlauch, 1, 'Saatgut verbraucht');
  gleich(S.freiePlaetze(r.daten, 'pflanze', 'kaktus').some(o => o.moebel === 'b1'), false, 'Topfpflanzen: kein Beetplatz frei');
  const topf = S.kaufen(r.daten, 'pflanze', 'kaktus', { moebel: 'b1', platz: 1 });
  scheitert(topf, 'Topfpflanze auf Beet');
  gleich(String(topf.fehler).includes('Beet'), true, 'Meldung nennt das Beet');
});

test('Saat: Wachstum nach Budget-Tagen', () => {
  const d = saatPflanze(mitBeet(mitGehalt('2026-10-01')), 'schnittlauch');
  const pf = (r) => r.daten.spiel.gewaechshaus.pflanzen.find(p => p.id === 'sp1');
  const r2 = S.bewerte(d, '2026-10-03');
  gleich(pf(r2).stufe, 2, 'nach 2 Budget-Tagen Stufe 2');
  const r4 = S.bewerte(r2.daten, '2026-10-05');
  gleich(pf(r4).stufe, 3, 'nach 4 Budget-Tagen Stufe 3');
  const r6 = S.bewerte(r4.daten, '2026-10-07');
  gleich([pf(r6).stufe, pf(r6).ernteTage], [4, 6], 'nach 6 Budget-Tagen Stufe 4, Erntezeit 6');
  const ueber = mitBeet(mitGehalt('2026-10-01'));
  ueber.buchungen.push({ id: 'x1', art: 'ausgabe', name: 'Teuer', betrag: EUR(500), datum: '2026-10-01', kategorie: 'shopping', notiz: '' });
  saatPflanze(ueber, 'schnittlauch');
  gleich(pf(S.bewerte(ueber, '2026-10-02')).stufe, 1, 'Tag über Budget: kein Wachstum');
});

test('Ernte: Abklingzeit 3 Budget-Tage, Samen je Seltenheit', () => {
  const reif = saatPflanze(mitBeet(basis(0, 2800)), 'basilikum', 4, 0);
  scheitert(S.ernten(reif, 'sp1', HEUTE), 'frisch auf Stufe 4 aber ohne Wartezeit');
  const bereit = saatPflanze(mitBeet(basis(0, 2800)), 'basilikum', 4, 3);
  const r = S.ernten(bereit, 'sp1', HEUTE);
  klappt(r, 'Ernte nach 3 Budget-Tagen');
  gleich([r.samen, r.daten.spiel.samen, r.daten.spiel.xp], [15, 15, 2815], 'selten: 15 Samen, auch XP');
  gleich(r.daten.spiel.gewaechshaus.pflanzen.find(p => p.id === 'sp1').stufe, 4, 'Stufe 4 bleibt');
  scheitert(S.ernten(r.daten, 'sp1', HEUTE), 'sofort nach der Ernte nicht erneut');
  const legendaer = saatPflanze(mitBeet(basis(0, 2800)), 'safran', 4, 3);
  gleich(S.ernten(legendaer, 'sp1', HEUTE).samen, 60, 'legendär: 60 Samen');
  const gewoehnlich = saatPflanze(mitBeet(basis(0, 2800)), 'minze', 4, 3);
  gleich(S.ernten(gewoehnlich, 'sp1', HEUTE).samen, 8, 'gewöhnlich: 8 Samen');
  const z = saatPflanze(mitBeet(mitGehalt('2026-10-01')), 'basilikum', 4, 0);
  const z1 = S.bewerte(z, '2026-10-03').daten;
  scheitert(S.ernten(z1, 'sp1', HEUTE), 'nach 2 Budget-Tagen noch nicht');
  const z2 = S.bewerte(z1, '2026-10-04').daten;
  klappt(S.ernten(z2, 'sp1', HEUTE), 'nach 3 Budget-Tagen erntereif');
});

test('Ernte: 10 % Gratis-Tüte, deterministisch', () => {
  let gratis = 0;
  let zaehl = 0;
  for (let i = 0; i < 400; i++) {
    const f = saatPflanze(mitBeet(basis(0, 2800)), 'schnittlauch', 4, 3, 'sp' + i);
    const r = S.ernten(f, 'sp' + i, HEUTE);
    zaehl++;
    if (r.gratis) gratis++;
  }
  gleich(zaehl, 400, 'alle 400 Ernten');
  gleich(gratis >= 25 && gratis <= 55, true, 'Gratis-Tüten ' + gratis + ' von 400 (Richtwert 40)');
});

test('Saatpflanze: verkaufen gibt 0 Samen, leveln geht nicht', () => {
  const d = saatPflanze(mitBeet(basis(100)), 'schnittlauch');
  const v = S.verkaufen(d, 'pflanze', 'sp1');
  klappt(v, 'Saatpflanze verkaufen');
  gleich([v.daten.spiel.samen, v.daten.spiel.gewaechshaus.pflanzen.some(p => p.id === 'sp1')], [100, false], '0 Samen, Pflanze weg');
  scheitert(S.pflanzeLeveln(d, 'sp1'), 'Saatpflanze wächst nicht mit Samen');
});

test('Level 1 bis 25: jede Stufe hat mindestens einen Artikel', () => {
  const d = basis();
  const stufen = new Set([...S.katalog(d).map(k => k.level), ...S.designListe(d).map(x => x.level)]);
  const luecken = [];
  for (let l = 1; l <= 25; l++) if (!stufen.has(l)) luecken.push(l);
  gleich(luecken, [], 'keine Lücke 1 bis 25');
});

test('Basilikum: nicht mehr im Shop, vorhandenes bleibt', () => {
  gleich(S.katalog(basis()).some(k => k.typ === 'basilikum'), false, 'nicht im Katalog');
  scheitert(S.kaufen(basis(500), 'pflanze', 'basilikum', { feld: [5, 5] }), 'nicht kaufbar');
  const d = basis(12);
  d.spiel.gewaechshaus.pflanzen.push({ id: 'b9', typ: 'basilikum', stufe: 1, ort: { feld: [5, 5] } });
  gleich(S.verkaufen(d, 'pflanze', 'b9').daten.spiel.samen, 12 + 20, 'verkauft für 50 % von 40');
  const l = S.pflanzeLeveln(d, 'b9');
  gleich(l.daten.spiel.samen, 0, 'Stufe 2 kostet 30 % von 40 = 12');
});

test('SPEC-2-Tabellen: Pflanzen, Möbel, Deko mit Level und Preis', () => {
  const k = S.katalog(basis());
  const f = (kat, typ) => k.find(x => x.kategorie === kat && x.typ === typ);
  gleich([f('pflanze', 'strelitzie').preis, f('pflanze', 'strelitzie').level], [300, 15], 'Strelitzie');
  gleich([f('pflanze', 'hoya').preis, f('pflanze', 'hoya').level], [300, 17], 'Hoya');
  gleich([f('moebel', 'kraeuterbeet').preis, f('moebel', 'kraeuterbeet').level], [500, 8], 'Kräuterbeet');
  gleich([f('moebel', 'hochbeet').preis, f('moebel', 'hochbeet').level], [900, 10], 'Hochbeet');
  gleich([f('moebel', 'hochregal').preis, f('moebel', 'hochregal').level], [900, 24], 'Hochregal');
  gleich([f('deko', 'skulptur').preis, f('deko', 'skulptur').level], [800, 20], 'Skulptur');
  gleich([f('deko', 'teewagen').level, f('deko', 'aquarium').level, f('deko', 'plattenspieler').level], [17, 23, 25], 'verschobene Deko-Level');
  gleich(f('deko', 'katzenkorb').preis, 180, 'Katzenkorb');
  gleich(f('moebel', 'ziegelbrett').name, 'Brett auf Betonsteinen', 'Möbelname angeglichen');
});

test('Erweiterungen 9 × 9 (Level 15) und 10 × 10 (Level 20)', () => {
  const k = S.katalog(basis());
  gleich([k.find(x => x.typ === 'flaeche9').preis, k.find(x => x.typ === 'flaeche9').level], [3500, 15], '9 × 9');
  gleich([k.find(x => x.typ === 'flaeche10').preis, k.find(x => x.typ === 'flaeche10').level], [6000, 20], '10 × 10');
  scheitert(S.kaufen(basis(3500, 10499), 'erweiterung', 'flaeche9'), 'Level 14: gesperrt');
  const r = S.kaufen(basis(3500, 10500), 'erweiterung', 'flaeche9');
  klappt(r, '9 × 9 ab Level 15');
  gleich(r.daten.spiel.gewaechshaus.groesse, 9, 'Raster 9');
  const r10 = S.kaufen(basis(6000, 19000), 'erweiterung', 'flaeche10');
  klappt(r10, '10 × 10 ab Level 20');
  gleich(r10.daten.spiel.gewaechshaus.groesse, 10, 'Raster 10');
});

test('Designs: kaufen einmalig, wählen, Level-Sperre', () => {
  scheitert(S.designKaufen(basis(400, 0), 'boden', 'terrazzo'), 'Level 1: gesperrt');
  const r = S.designKaufen(basis(400, 2100), 'boden', 'terrazzo');
  klappt(r, 'Terrazzo ab Level 7');
  gleich([r.daten.spiel.samen, r.daten.spiel.designs.includes('terrazzo')], [0, true], '400 Samen, gekauft');
  scheitert(S.designKaufen(r.daten, 'boden', 'terrazzo'), 'zweimal kaufen');
  const w = S.designWaehlen(r.daten, 'boden', 'terrazzo');
  klappt(w, 'wählen');
  gleich([w.daten.spiel.design.boden, w.daten.spiel.design.rahmen], ['terrazzo', 'teak'], 'Boden gewählt, Rahmen unverändert');
  scheitert(S.designWaehlen(w.daten, 'boden', 'fischgraet'), 'nicht gekauft');
  scheitert(S.designWaehlen(w.daten, 'rahmen', 'terrazzo'), 'falsche Kategorie');
  const liste = S.designListe(w.daten).find(x => x.id === 'terrazzo');
  gleich([liste.gekauft, liste.gewaehlt, liste.freigeschaltet], [true, true, true], 'Liste');
  gleich(S.designListe(basis()).find(x => x.id === 'dielen').gekauft, true, 'Start-Design gekauft');
});

test('Dächer entfallen: nicht in designListe, nicht kaufbar, nicht wählbar', () => {
  const liste = S.designListe(basis(5000, 100000));
  gleich(liste.some(x => x.kategorie === 'dach'), false, 'keine Dach-Kategorie');
  gleich(liste.some(x => x.id === 'bogen' || x.id === 'shed' || x.id === 'giebel'), false, 'bogen, shed und giebel fehlen');
  scheitert(S.designKaufen(basis(5000, 100000), 'dach', 'bogen'), 'Bogendach nicht kaufbar');
  scheitert(S.designWaehlen(basis(), 'dach', 'giebel'), 'Dach nicht wählbar');
  const marmor = liste.find(x => x.id === 'marmor');
  gleich([marmor.kategorie, marmor.level, marmor.preis], ['boden', 19, 800], 'Marmor: Boden ab Level 19 für 800');
  const k = S.designKaufen(basis(900, 100000), 'boden', 'marmor');
  klappt(k, 'Marmor kaufbar');
  gleich(k.daten.spiel.samen, 100, 'Marmor kostet 800');
});

test('Dach-Erstattung: einmalig, ohne XP, Dach aus der Besitzliste', () => {
  const d = basis(100, 0);
  d.spiel.designs = ['dielen', 'teak', 'giebel', 'bogen', 'shed'];
  d.spiel.design.dach = 'bogen';
  const r = S.bewerte(d, '2026-10-01');
  gleich(r.daten.spiel.samen, 100 + 700 + 900, 'Bogen 700 und Shed 900 erstattet, Giebel 0');
  gleich(r.daten.spiel.xp, 0, 'Erstattung ohne XP');
  gleich(r.daten.spiel.designs, ['dielen', 'teak'], 'Dächer aus spiel.designs entfernt');
  gleich(r.daten.spiel.design.dach, 'bogen', 'spiel.design.dach bleibt, wird ignoriert');
  gleich(r.ereignisse.filter(e => e.art === 'erstattung').map(e => e.text),
    ['Dachdesign erstattet: +700 Samen', 'Dachdesign erstattet: +900 Samen'], 'Ereignistexte');
  const zweimal = S.bewerte(r.daten, '2026-10-01');
  gleich([zweimal.daten.spiel.samen, zweimal.ereignisse.some(e => e.art === 'erstattung')], [1700, false], 'zweites bewerte erstattet nichts');
});

test('Level 1 bis 25: Topfpflanzen für Sparziele, nur kaufbar und ohne Saatgut', () => {
  const alle = new Set();
  for (let l = 1; l <= 25; l++) {
    const xp = 100 * l * (l - 1) / 2;
    for (const p of S.sparzielPflanzen(basis(0, xp)).pflanzen) alle.add(p.typ);
  }
  gleich([...alle].sort(), Object.keys(S.PREISE_PFLANZEN).sort(), 'genau die Topfpflanzen, bis Level 25 alle erreichbar');
  gleich(['erdbeere', 'basilikum', 'tomate'].some(t => alle.has(t)), false, 'keine Saatgut-Sorten');
});

test('Sparziel-Pflanzen: Level 1 und 3, sortiert, mit Hinweis auf höhere Level', () => {
  const l1 = S.sparzielPflanzen(basis());
  gleich(l1.pflanzen.map(p => p.typ).sort(), ['efeutute', 'kaktus'], 'Level 1: Auswahl');
  gleich(l1.weitere, true, 'Hinweis: weitere ab höherem Level');
  const l3 = S.sparzielPflanzen(basis(0, 300));
  const typen = l3.pflanzen.map(p => p.typ);
  gleich(typen.includes('bogenhanf') && typen.includes('gruenlilie'), true, 'Level 3: Level-2- und Level-3-Pflanzen dabei');
  gleich(typen.includes('erdbeere'), false, 'Level 3: keine Erdbeere');
  gleich(l3.pflanzen.every(p => p.level <= 3), true, 'Level 3: nur freigeschaltete');
  const lvl = l3.pflanzen.map(p => p.level);
  gleich(lvl.every((v, i) => i === 0 || lvl[i - 1] <= v), true, 'nach Level sortiert');
  gleich(S.sparzielPflanzen(basis(0, 30000)).weitere, false, 'Level 25: keine gesperrten mehr');
});

test('Herbarium: Sets, Bonus einmalig und Abzeichen', () => {
  const h = S.herbarium(basis());
  gleich(h.sets.length, 7, 'sieben Sets');
  gleich(h.gesamt.von, 35, '35 Mitglieder');
  const d = basis(0);
  d.spiel.entdeckt = ['schnittlauch', 'petersilie', 'minze', 'thymian', 'rosmarin', 'salbei'];
  const r1 = S.bewerte(d, '2026-10-01');
  const sets = r1.ereignisse.filter(e => e.art === 'set');
  gleich(sets.map(e => [e.text, e.samen]), [['Herbarium-Set vollständig: Kräutergarten', 150]], 'Bonus 150 mit Ereignis');
  gleich(r1.daten.spiel.abzeichen.includes('set_kraeutergarten'), true, 'Abzeichen');
  const r2 = S.bewerte(r1.daten, '2026-10-01');
  gleich(r2.ereignisse.filter(e => e.art === 'set').length, 0, 'zweiter Aufruf: kein Bonus');
  gleich(r2.daten.spiel.samen, 150, 'Samen unverändert');
  gleich(S.herbarium(r1.daten).sets.find(s => s.id === 'kraeutergarten').belohnt, true, 'belohnt');
});

test('Saison: Grenzen nach Datum', () => {
  gleich(S.aktiveSaison('2026-09-30'), null, '30.9. keine Saison');
  gleich(S.aktiveSaison('2026-10-01'), 'herbst', '1.10. Herbst');
  gleich(S.aktiveSaison('2026-11-30'), 'herbst', '30.11. Herbst');
  gleich(S.aktiveSaison('2026-12-01'), 'winter', '1.12. Winter');
  gleich(S.aktiveSaison('2027-01-06'), 'winter', '6.1. Winter');
  gleich(S.aktiveSaison('2027-01-07'), null, '7.1. keine Saison');
  gleich(S.aktiveSaison('2027-03-01'), 'fruehling', '1.3. Frühling');
  gleich(S.aktiveSaison('2027-06-01'), 'sommer', '1.6. Sommer');
  gleich(S.aktiveSaison('2027-08-31'), 'sommer', '31.8. Sommer');
  gleich(S.aktiveSaison('2027-09-01'), null, '1.9. keine Saison');
});

test('Saison: Artikel nur in ihrer Saison, Kauf außerhalb scheitert', () => {
  const herbst = S.saisonKatalog(basis(), '2026-11-15').map(x => x.typ);
  gleich(herbst.includes('kuerbis') && herbst.includes('herbstlaub') && !herbst.includes('weihnachtsstern'), true, 'Herbst-Artikel');
  gleich(S.saisonKatalog(basis(), '2026-12-15').some(x => x.typ === 'weihnachtsstern'), true, 'Winter: Weihnachtsstern');
  gleich(S.saisonKatalog(basis(), '2026-07-15').some(x => x.typ === 'hibiskus'), true, 'Sommer: Hibiskus');
  gleich(S.saisonKatalog(basis(), '2026-09-15'), [], 'September: keine Saison');
  const r = S.kaufen(basis(500), 'saison', 'weihnachtsstern', { feld: [2, 2] }, '2026-10-05');
  scheitert(r, 'Weihnachtsstern im Herbst');
  gleich(String(r.fehler).includes('Winter'), true, 'Meldung nennt den Winter');
  scheitert(S.kaufen(basis(500), 'saison', 'zierkuerbis', { feld: [2, 2] }, '2026-10-05'), 'Zierkürbis nicht kaufbar');
  const kz = S.saisonKatalog(basis(), '2026-10-05').find(x => x.typ === 'kuerbis');
  const r2 = S.kaufen(basis(500), 'saison', 'kuerbis', { feld: [2, 2] }, '2026-10-05');
  gleich(r2.fehler === undefined, kz.gezeichnet, 'Kürbis im Herbst kaufbar genau dann, wenn gezeichnet');
  scheitert(S.kaufen(basis(500), 'saison', 'kuerbis', { feld: [2, 2] }, '2026-12-05'), 'Kürbis im Winter: scheitert');
});

test('Hängeampel: Höhenregel für neue Möbel', () => {
  const sput = reich();
  sput.spiel.gewaechshaus.moebel.push({ id: 's1', typ: 'sputnik', gx: 4, gy: 0, drehung: 0 });
  scheitert(S.kaufen(sput, 'deko', 'haengeampel', { haken: 'h1' }), 'Sputnik (110) unter h1');
  const beet = reich();
  beet.spiel.gewaechshaus.moebel.push({ id: 'k1', typ: 'kraeuterbeet', gx: 4, gy: 0, drehung: 0 });
  klappt(S.kaufen(beet, 'deko', 'haengeampel', { haken: 'h1' }), 'Kräuterbeet (45) unter h1 ok');
  const hoch = reich();
  hoch.spiel.gewaechshaus.moebel.push({ id: 'h2m', typ: 'hochbeet', gx: 4, gy: 0, drehung: 0 });
  klappt(S.kaufen(hoch, 'deko', 'haengeampel', { haken: 'h1' }), 'Hochbeet (60) unter h1 ok');
});

test('Migration: alte Spielstände bekommen die neuen Felder', () => {
  const alt = basis(50, 2800);
  for (const f of ['saatgut', 'tuete', 'gratisTueten', 'design', 'designs', 'entdeckt']) delete alt.spiel[f];
  const r = S.bewerte(alt, '2026-10-01');
  gleich(r.daten.spiel.saatgut, {}, 'saatgut leer');
  gleich(r.daten.spiel.tuete, { seitSelten: 0, seitLegendaer: 0, geoeffnet: 0 }, 'tuete');
  gleich(r.daten.spiel.design, { boden: 'dielen', rahmen: 'teak', dach: 'giebel' }, 'design');
  gleich(r.daten.spiel.designs, ['dielen', 'teak'], 'designs (ohne Dach)');
  gleich(r.daten.spiel.gratisTueten, 0, 'gratisTueten');
  gleich(r.daten.spiel.entdeckt, ['efeutute'], 'entdeckt: Garten-Pflanzen');
  klappt(S.samentuete(alt, HEUTE), 'Tüte mit altem Spielstand');
  gleich(alt.spiel.saatgut, undefined, 'Eingabe unverändert');
});

test('standardDaten: SPEC-2-Startwerte', () => {
  const s = P.standardDaten('2026-10-01').spiel;
  gleich([s.saatgut, s.tuete, s.gratisTueten, s.design, s.designs, s.entdeckt],
    [{}, { seitSelten: 0, seitLegendaer: 0, geoeffnet: 0 }, 0, { boden: 'dielen', rahmen: 'teak', dach: 'giebel' }, ['dielen', 'teak'], []], 'Startwerte');
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
