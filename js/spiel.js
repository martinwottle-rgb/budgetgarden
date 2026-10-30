// Spiel-Logik nach SPEC.md, Abschnitt "Spiel". Reine Funktionen, kein DOM.
// Funktionen, die Daten aendern, geben eine tiefe Kopie (structuredClone) zurueck; das Eingabeobjekt bleibt unveraendert.
// Shop-Aktionen geben { daten } bei Erfolg oder { fehler: 'Meldung' } zurueck.

import * as L from './logik.js';
import { neueId } from './speicher.js';
import { PFLANZEN } from './grafik/pflanzen.js';
import { MOEBEL } from './grafik/moebel.js';
import { DEKO } from './grafik/deko.js';
import { RARITAETEN } from './grafik/raritaeten.js';
import { hakenFuer } from './szene.js';
import * as G_MOEBEL2 from './grafik/moebel2.js';
import * as G_PFLANZEN2 from './grafik/pflanzen2.js';
import * as G_DEKO2 from './grafik/deko2.js';
import * as G_SAAT from './grafik/saat.js';
import * as G_SAISON from './grafik/saison.js';

// Grafik der SPEC-2-Dateien. Fehlt ein Export, bleibt das Objekt leer: der Artikel ist dann nicht kaufbar,
// die Werte kommen aus den Tabellen weiter unten.
const MOEBEL2 = G_MOEBEL2.MOEBEL2 || {};
const PFLANZEN2 = G_PFLANZEN2.PFLANZEN2 || {};
const DEKO2 = G_DEKO2.DEKO2 || {};
const SAAT = G_SAAT.SAAT || {};
const SAISON = G_SAISON.SAISON || {};

const hat = (objekt, schluessel) => Object.prototype.hasOwnProperty.call(objekt, schluessel);

// ---------- Preise und Freischaltung (Tempo mittel, SPEC.md) ----------
// preis in Samen, level = Spielerlevel, ab dem der Artikel kaufbar ist.

export const PREISE_PFLANZEN = {
  efeutute: { name: 'Efeutute', preis: 50, level: 1 },
  kaktus: { name: 'Goldkugelkaktus', preis: 40, level: 1 },
  monstera: { name: 'Monstera deliciosa', preis: 200, level: 7 },
  sonnenblume: { name: 'Sonnenblume', preis: 160, level: 8 },
  bogenhanf: { name: 'Bogenhanf', preis: 50, level: 2 },
  gruenlilie: { name: 'Grünlilie', preis: 50, level: 3 },
  aloe: { name: 'Aloe vera', preis: 45, level: 4 },
  gluecksfeder: { name: 'Glücksfeder', preis: 55, level: 5 },
  lavendel: { name: 'Lavendel', preis: 50, level: 7 },
  echeverie: { name: 'Echeverie', preis: 45, level: 6 },
  geigenfeige: { name: 'Geigenfeige', preis: 220, level: 11 },
  zitrone: { name: 'Zitronenbäumchen', preis: 230, level: 12 },
  bonsai: { name: 'Ficus-Bonsai', preis: 60, level: 9 },
  kletterrose: { name: 'Kletterrose', preis: 190, level: 13 },
  orchidee: { name: 'Phalaenopsis-Orchidee', preis: 60, level: 11 },
  calathea: { name: 'Calathea', preis: 55, level: 10 },
  bostonfarn: { name: 'Bostonfarn', preis: 50, level: 12 },
  strelitzie: { name: 'Strelitzie', preis: 300, level: 15 },
  alocasia: { name: 'Alocasia', preis: 320, level: 16 },
  olivenbaum: { name: 'Olivenbaum', preis: 400, level: 18 },
  kentia: { name: 'Kentia-Palme', preis: 450, level: 19 },
  feigenbaum: { name: 'Feigenbaum', preis: 480, level: 20 },
  kannenpflanze: { name: 'Kannenpflanze', preis: 260, level: 14 },
  bananenstaude: { name: 'Bananenstaude', preis: 600, level: 22 },
  hoya: { name: 'Wachsblume (Hoya)', preis: 300, level: 17 }
};

// Nicht mehr im Shop (SPEC-2). Vorhandene Pflanzen im Garten lassen sich verkaufen und leveln.
const PREISE_AUSLAUF = {
  basilikum: { name: 'Basilikum', preis: 40, level: 1 },
  tomate: { name: 'Tomate', preis: 180, level: 1 },
  erdbeere: { name: 'Erdbeere', preis: 50, level: 8 }
};

export const PREISE_MOEBEL = {
  ziegelbrett: { name: 'Brett auf Betonsteinen', preis: 60, level: 1 },
  tisch_natur: { name: 'Pflanzentisch Teak', preis: 150, level: 1 },
  regal_holz: { name: 'Teakregal', preis: 150, level: 3 },
  holzkiste: { name: 'Teakkiste', preis: 150, level: 4 },
  tisch_weiss: { name: 'Pflanzentisch Creme', preis: 180, level: 6 },
  gaertnertisch_guss: { name: 'Gärtnertisch Haarnadel', preis: 250, level: 9 },
  leiterregal: { name: 'Leiterregal', preis: 220, level: 7 },
  wandregal: { name: 'Wandboard', preis: 170, level: 5 },
  metallregal: { name: 'Haarnadel-Regal', preis: 260, level: 13 },
  zinkregal: { name: 'Zinkregal', preis: 120, level: 2 },
  zinkregal_hoch: { name: 'Hohes Zinkregal', preis: 340, level: 14 },
  rattan_etagere: { name: 'Rattan-Etagere', preis: 240, level: 11 },
  blumenhocker: { name: 'Blumenhocker', preis: 200, level: 12 },
  steinsockel: { name: 'Terrazzo-Sockel', preis: 300, level: 16 },
  kraeuterbeet: { name: 'Kräuterbeet', preis: 500, level: 8 },
  sideboard: { name: 'Sideboard', preis: 380, level: 17 },
  pflanzentreppe: { name: 'Pflanzentreppe', preis: 300, level: 15 },
  vitrine: { name: 'Glasvitrine mit Terrarium', preis: 550, level: 19 },
  hochbeet: { name: 'Hochbeet', preis: 900, level: 10 },
  sputnik: { name: 'Sputnik-Pflanzenständer', preis: 650, level: 21 },
  hochregal: { name: 'Raumteiler-Regal', preis: 900, level: 24 }
};

// Deko: die elf Namen aus SPEC.md. Lichterkette und Haengeampel stehen in SPEC, aber nicht in der Auftragsliste.
export const PREISE_DEKO = {
  laterne: { name: 'Laterne', preis: 60, level: 1 },
  bank: { name: 'Bank', preis: 80, level: 5 },
  giesskanne: { name: 'Gießkanne', preis: 40, level: 1 },
  katze: { name: 'Katze', preis: 250, level: 9 },
  teppich: { name: 'Teppich', preis: 60, level: 3 },
  vogelhaus: { name: 'Vogelhaus', preis: 70, level: 6 },
  gartenzwerg: { name: 'Gartenzwerg', preis: 40, level: 4 },
  windspiel: { name: 'Windspiel', preis: 30, level: 2 },
  lichterkette: { name: 'Lichterglas', preis: 50, level: 7 },
  haengeampel: { name: 'Hängeampel', preis: 60, level: 8 },
  springbrunnen: { name: 'Springbrunnen', preis: 500, level: 15 },
  katzenkorb: { name: 'Katzenkorb', preis: 180, level: 10 },
  leseecke: { name: 'Leseplatz', preis: 220, level: 11 },
  loungesessel: { name: 'Lounge-Sessel', preis: 350, level: 13 },
  haengesessel: { name: 'Rattan-Hängesessel', preis: 420, level: 16 },
  bogenlampe: { name: 'Bogenlampe', preis: 300, level: 12 },
  schaukelstuhl: { name: 'Schaukelstuhl', preis: 380, level: 14 },
  plattenspieler: { name: 'Plattenspieler-Möbel', preis: 450, level: 25 },
  lichterlaube: { name: 'Lichterbogen', preis: 500, level: 18 },
  aquarium: { name: 'Aquarium', preis: 700, level: 23 },
  teewagen: { name: 'Teewagen', preis: 400, level: 17 },
  skulptur: { name: 'Messing-Skulptur', preis: 800, level: 20 }
};

export const ERWEITERUNGEN = [
  { id: 'flaeche7', groesse: 7, preis: 1000, level: 6 },
  { id: 'flaeche8', groesse: 8, preis: 2000, level: 10 },
  { id: 'flaeche9', groesse: 9, preis: 3500, level: 15 },
  { id: 'flaeche10', groesse: 10, preis: 6000, level: 20 }
];

// ---------- SPEC-2: Beete, Saatgut, Spaetspiel, Designs, Herbarium, Saison ----------

// Saatgut (SPEC-2, Abschnitt 2). Seltenheit: gewöhnlich, selten, episch, legendär.
const SAAT_TYPEN = {
  schnittlauch: { name: 'Schnittlauch', seltenheit: 'gewoehnlich' },
  petersilie: { name: 'Petersilie', seltenheit: 'gewoehnlich' },
  minze: { name: 'Minze', seltenheit: 'gewoehnlich' },
  thymian: { name: 'Thymian', seltenheit: 'gewoehnlich' },
  rosmarin: { name: 'Rosmarin', seltenheit: 'gewoehnlich' },
  salbei: { name: 'Salbei', seltenheit: 'gewoehnlich' },
  basilikum: { name: 'Basilikum', seltenheit: 'selten' },
  tomate: { name: 'Tomate', seltenheit: 'selten' },
  erdbeere: { name: 'Erdbeere', seltenheit: 'selten' },
  chili: { name: 'Chili', seltenheit: 'selten' },
  paprika: { name: 'Paprika', seltenheit: 'selten' },
  radieschen: { name: 'Radieschen', seltenheit: 'selten' },
  artischocke: { name: 'Artischocke', seltenheit: 'episch' },
  zitronengras: { name: 'Zitronengras', seltenheit: 'episch' },
  regenbogenmangold: { name: 'Regenbogenmangold', seltenheit: 'episch' },
  physalis: { name: 'Physalis', seltenheit: 'episch' },
  safran: { name: 'Safran', seltenheit: 'legendaer' },
  wasabi: { name: 'Wasabi', seltenheit: 'legendaer' },
  goldtomate: { name: 'Goldtomate', seltenheit: 'legendaer' }
};

// Saisonartikel (SPEC-2, Abschnitt 6). art: pflanze, deko oder saat (saat nur aus Samentüten im Herbst)
const SAISON_ARTIKEL = {
  kuerbis: { name: 'Kürbis', art: 'deko', preis: 120, saison: 'herbst' },
  herbstlaub: { name: 'Herbstlaub', art: 'deko', preis: 80, saison: 'herbst' },
  zierkuerbis: { name: 'Zierkürbis', art: 'saat', seltenheit: 'episch', saison: 'herbst' },
  weihnachtsstern: { name: 'Weihnachtsstern', art: 'pflanze', groesse: 'klein', preis: 150, saison: 'winter' },
  schneelaterne: { name: 'Schneelaterne', art: 'deko', preis: 150, saison: 'winter' },
  kirschbluete: { name: 'Kirschblüte', art: 'pflanze', groesse: 'gross', preis: 400, saison: 'fruehling' },
  tulpen: { name: 'Tulpen', art: 'pflanze', groesse: 'klein', preis: 90, saison: 'fruehling' },
  sonnenschirm: { name: 'Sonnenschirm', art: 'deko', preis: 200, saison: 'sommer' },
  hibiskus: { name: 'Hibiskus', art: 'pflanze', groesse: 'gross', preis: 300, saison: 'sommer' }
};

const SAISON_NAME = { herbst: 'Herbst', winter: 'Winter', fruehling: 'Frühling', sommer: 'Sommer' };

// Designs (SPEC-2, Abschnitt 4). Start-Designs sind kostenlos und ab Level 1 gekauft.
// Abweichung von der Tabelle, damit jede Stufe 1 bis 25 einen Artikel hat: teewagen 16 auf 17, senf 18 auf 21,
// messing 14 auf 22, aquarium 14 auf 23, fliesen 16 auf 24, plattenspieler 11 auf 25.
// Nachtrag 14.10.: Dächer entfallen (offene Ansicht). Marmor (Boden, L19) füllt die Lücke bei Level 19.
const DESIGNS = [
  { id: 'dielen', kategorie: 'boden', name: 'Holzdielen', preis: 0, level: 1 },
  { id: 'terrazzo', kategorie: 'boden', name: 'Terrazzo', preis: 400, level: 7 },
  { id: 'fischgraet', kategorie: 'boden', name: 'Fischgrät', preis: 600, level: 11 },
  { id: 'marmor', kategorie: 'boden', name: 'Marmor', preis: 800, level: 19 },
  { id: 'fliesen', kategorie: 'boden', name: 'Fliesen', preis: 700, level: 24 },
  { id: 'teak', kategorie: 'rahmen', name: 'Teak', preis: 0, level: 1 },
  { id: 'petrol', kategorie: 'rahmen', name: 'Petrol', preis: 300, level: 9 },
  { id: 'messing', kategorie: 'rahmen', name: 'Messing', preis: 600, level: 22 },
  { id: 'senf', kategorie: 'rahmen', name: 'Senf', preis: 500, level: 21 }
];

// Ausgelaufene Dach-Designs mit ihrem Kaufpreis (Samen). Gekaufte werden in bewerte() einmalig erstattet.
const DACH_ALT = { giebel: 0, bogen: 700, shed: 900 };

// Herbarium-Sets (SPEC-2, Abschnitt 5). Mitglieder sind Typ-Namen. Bonus einmalig, dazu ein Abzeichen.
const SETS = [
  { id: 'kraeutergarten', name: 'Kräutergarten', emoji: '🌿', samen: 150, mitglieder: ['schnittlauch', 'petersilie', 'minze', 'thymian', 'rosmarin', 'salbei'] },
  { id: 'gemuesebeet', name: 'Gemüsebeet', emoji: '🍅', samen: 250, mitglieder: ['basilikum', 'tomate', 'erdbeere', 'chili', 'paprika', 'radieschen'] },
  { id: 'tropen', name: 'Tropen', emoji: '🌴', samen: 400, mitglieder: ['monstera', 'strelitzie', 'alocasia', 'bananenstaude', 'kentia'] },
  { id: 'sukkulenten', name: 'Sukkulenten', emoji: '🌵', samen: 150, mitglieder: ['kaktus', 'aloe', 'echeverie', 'bogenhanf'] },
  { id: 'bluetenpracht', name: 'Blütenpracht', emoji: '🌸', samen: 250, mitglieder: ['orchidee', 'sonnenblume', 'kletterrose', 'lavendel', 'hoya'] },
  { id: 'raritaeten', name: 'Raritäten', emoji: '💎', samen: 1000, mitglieder: ['koenigin_der_nacht', 'jadewein', 'thai_constellation', 'pink_princess', 'drachenbaum', 'gold_ginkgo'] },
  { id: 'legenden', name: 'Legenden', emoji: '🏺', samen: 800, mitglieder: ['safran', 'wasabi', 'goldtomate'] }
];

// Samentüten und Ernte
const TUETE_PREIS = 50;
const TUETE_LEVEL = 8;
const TUETE_VERTEILUNG = [['gewoehnlich', 60], ['selten', 28], ['episch', 10], ['legendaer', 2]];
// Garantie: spaetestens jede 10. Tuete mindestens selten, jede 40. legendär
const GARANTIE_SELTEN = 10;
const GARANTIE_LEGENDAER = 40;
const TUETE_UMTAUSCH = { 'gewoehnlich': 10, 'selten': 20, 'episch': 40, 'legendaer': 100 };
const ERNTE_SAMEN = { 'gewoehnlich': 8, 'selten': 15, 'episch': 30, 'legendaer': 60 };
const MAX_JE_SORTE = 3;
const ERNTE_WARTE_TAGE = 3;
const ERNTE_GRATIS_CHANCE = 0.1;

// Neue Möbel, falls MOEBEL2 fehlt: Breite, Tiefe, Stellplätze (beet = Beetplatz)
const MOEBEL_NEU_MASSE = {
  kraeuterbeet: { breite: 2, tiefe: 1, plaetze: 4, beet: true },
  hochbeet: { breite: 2, tiefe: 2, plaetze: 6, beet: true },
  sideboard: { breite: 2, tiefe: 1, plaetze: 3 },
  pflanzentreppe: { breite: 1, tiefe: 1, plaetze: 3 },
  vitrine: { breite: 1, tiefe: 1, plaetze: 2 },
  sputnik: { breite: 1, tiefe: 1, plaetze: 4 },
  hochregal: { breite: 3, tiefe: 1, plaetze: 6 },
  zinkregal: { breite: 1, tiefe: 1, plaetze: 3 },
  zinkregal_hoch: { breite: 2, tiefe: 1, plaetze: 6 }
};
const MOEBEL_NEU = Object.fromEntries(Object.entries(MOEBEL_NEU_MASSE).map(([typ, m]) => [typ, {
  breite: m.breite,
  tiefe: m.tiefe,
  plaetze: Array.from({ length: m.plaetze }, (_, i) => (m.beet
    ? { dx: (i + 0.5) * m.breite / m.plaetze, dy: 0.5, z: 0, beet: true }
    : { dx: (i + 0.5) * m.breite / m.plaetze, dy: 0.5, z: 60 }))
}]));

// Alle Grafiken zusammen (gezeichnet = in dieser Liste)
const PFLANZEN_ALLE = { ...PFLANZEN, ...PFLANZEN2 };
const MOEBEL_ALLE = { ...MOEBEL, ...MOEBEL2 };
const DEKO_ALLE = { ...DEKO, ...DEKO2 };

// MOEBEL2 zuerst: neue Zeichnungen (z. B. Metallregal) ersetzen gleichnamige alte aus MOEBEL
function moebelDaten(typ) {
  if (hat(MOEBEL2, typ)) return MOEBEL2[typ];
  if (hat(MOEBEL, typ)) return MOEBEL[typ];
  if (hat(MOEBEL_NEU, typ)) return MOEBEL_NEU[typ];
  return null;
}

function dekoDef(typ) {
  if (hat(DEKO, typ)) return DEKO[typ];
  if (hat(DEKO2, typ)) return DEKO2[typ];
  return null;
}

function nachschlag(tabelle, typ) {
  return hat(tabelle, typ) ? tabelle[typ] : null;
}

// Preiseintrag (preis, level, name) eines Artikels aus den Tabellen, null wenn unbekannt
function preisVon(typ) {
  return nachschlag(PREISE_PFLANZEN, typ) || nachschlag(PREISE_AUSLAUF, typ) || nachschlag(PREISE_MOEBEL, typ) ||
    nachschlag(PREISE_DEKO, typ) || nachschlag(SAISON_ARTIKEL, typ);
}

// Seltenheit einer Saat (Saatgut oder Saison-Saat), null wenn es keine Saat ist
export function saatSeltenheit(typ) {
  const e = nachschlag(SAAT_TYPEN, typ) || (nachschlag(SAISON_ARTIKEL, typ) && SAISON_ARTIKEL[typ].art === 'saat' ? SAISON_ARTIKEL[typ] : null);
  return e ? e.seltenheit : null;
}

function saatName(typ) {
  if (hat(SAAT, typ) && SAAT[typ].name) return SAAT[typ].name;
  const e = nachschlag(SAAT_TYPEN, typ) || nachschlag(SAISON_ARTIKEL, typ);
  return e ? e.name : typ;
}

// Typ ins Herbarium eintragen (einmalig)
function entdecke(daten, typ) {
  if (!Array.isArray(daten.spiel.entdeckt)) daten.spiel.entdeckt = [];
  if (!daten.spiel.entdeckt.includes(typ)) daten.spiel.entdeckt.push(typ);
}

function heuteIso() {
  const t = new Date();
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}

// Aktive Saison nach Datum (YYYY-MM-DD), null außerhalb
export function aktiveSaison(heute = heuteIso()) {
  const md = String(heute).slice(5, 10);
  if (md >= '10-01' && md <= '11-30') return 'herbst';
  if (md >= '12-01' || md <= '01-06') return 'winter';
  if (md >= '03-01' && md <= '04-30') return 'fruehling';
  if (md >= '06-01' && md <= '08-31') return 'sommer';
  return null;
}

// Anteil am Kaufpreis, den eine Pflanze fuer die jeweils naechste Stufe kostet
const STUFENKOSTEN = { 2: 30, 3: 60, 4: 100 };

// ---------- Hilfen ----------

const kopie = (x) => structuredClone(x);
const fehler = (text) => ({ fehler: text });
const schluessel = (x, y) => x + ',' + y;

// '2026-10-03' wird zu '03.10.'
function kurz(datum) {
  const [, m, t] = datum.split('-');
  return t + '.' + m + '.';
}

function buchungenAm(daten, tag) {
  return (daten.buchungen || []).filter(b => b.datum === tag).length;
}

function angespartGesamt(daten) {
  return (daten.sparziele || []).reduce((s, z) => s + (z.angespart || 0), 0);
}

// Level n ab XP 100 * n * (n - 1) / 2
export function levelAus(xp) {
  const x = Math.max(0, Math.floor(xp || 0));
  let n = 1;
  while (100 * (n + 1) * n / 2 <= x) n++;
  const xpStufe = 100 * n * (n - 1) / 2;
  const xpNaechste = 100 * (n + 1) * n / 2;
  return { level: n, xpStufe, xpNaechste, anteil: (x - xpStufe) / (xpNaechste - xpStufe) };
}

// ---------- Wochen-Challenges ----------

// Tage der Woche, geschnitten mit dem Zeitraum
// Volle Kalenderwoche Montag bis Sonntag, auch über einen Monatswechsel hinweg; frühestens ab dem Starttag der App.
// Früher wurde hier am Zeitraum abgeschnitten: Monatsbeginn am Mittwoch ergab eine Woche aus 2 Tagen, und
// Challenges wie „5 Tage im Budget“ waren unmöglich.
function fenster(wochenbeginn, daten) {
  const st = daten && daten.einstellungen ? daten.einstellungen.startDatum : '';
  return {
    von: st && st > wochenbeginn ? st : wochenbeginn,
    bis: L.datumPlusTage(wochenbeginn, 6)
  };
}

function tageIn(f) {
  const tage = [];
  for (let t = f.von; t <= f.bis; t = L.datumPlusTage(t, 1)) tage.push(t);
  return tage;
}

// Ausgegebene Summe und Wochenbudget (wie logik.js woche())
function wochenWerte(daten, wochenbeginn) {
  // Stand am Anfang der Woche (bzw. des Monatsteils): spätere Einnahmen machen eine Challenge nicht nachträglich leichter
  const w = L.wocheFuerSpiel(daten, wochenbeginn);
  const W = w.W;
  const ausgegeben = w.ausgegeben;
  return { W, ausgegeben };
}

// art: 'zaehl' (ist soll erreichen) oder 'grenze' (ist darf soll nicht überschreiten).
// fortschritt(daten, wochenbeginn, zr, heute) zählt nur Tage bis einschließlich heute.
export const challengePool = [
  {
    id: 'zwei_ohne_ausgaben',
    text: '2 Tage ohne Ausgaben',
    samen: 50,
    art: 'zaehl',
    zaehltHeuteNicht: true,
    pruefe: (daten, wb, zr) => tageIn(fenster(wb, daten)).filter(t => L.ausgabenAm(daten, t) === 0).length >= 2,
    fortschritt: (daten, wb, zr, heute) => ({
      ist: vorHeute(tageIn(fenster(wb, daten)), heute).filter(t => L.ausgabenAm(daten, t) === 0).length,
      soll: 2,
      einheit: 'Tage'
    })
  },
  {
    id: 'woche_15_unter',
    // Nur sinnvoll mit positivem Wochenbudget (bei überzogenem Monat nicht schaffbar)
    brauchtBudget: true,
    text: 'Woche 15 % unter Wochenbudget',
    samen: 60,
    art: 'grenze',
    pruefe: (daten, wb, zr) => {
      const w = wochenWerte(daten, wb);
      return w.ausgegeben * 100 <= w.W * 85;
    },
    fortschritt: (daten, wb, zr, heute) => {
      const { W } = wochenWerte(daten, wb);
      const ausgegeben = bisHeute(tageIn(fenster(wb, daten)), heute).reduce((s, t) => s + L.ausgabenAm(daten, t), 0);
      return { ist: ausgegeben, soll: Math.floor(W * 85 / 100), einheit: 'cent' };
    }
  },
  {
    id: 'jeden_tag_eintragen',
    text: 'Jeden Tag etwas eintragen',
    samen: 70,
    art: 'grenze',
    gruppe: 'eintragen',
    pruefe: (daten, wb, zr) => {
      const tage = tageIn(fenster(wb, daten));
      return tage.length > 0 && tage.every(t => buchungenAm(daten, t) > 0);
    },
    // Heute zählt nicht als Verstoß, der Eintrag kann noch nachkommen
    fortschritt: (daten, wb, zr, heute) => ({
      ist: tageIn(fenster(wb, daten)).filter(t => t < heute && buchungenAm(daten, t) === 0).length,
      soll: 0,
      einheit: 'verbot'
    })
  },
  {
    id: 'keine_essen_gehen',
    text: 'Keine Ausgabe in Essen gehen',
    samen: 50,
    art: 'grenze',
    gruppe: 'essen',
    moeglich: (daten) => hatKategorie(daten, 'essen'),
    pruefe: (daten, wb, zr) => {
      const f = fenster(wb, daten);
      return !(daten.buchungen || []).some(b => b.art === 'ausgabe' && b.kategorie === 'essen' && b.datum >= f.von && b.datum <= f.bis);
    },
    fortschritt: (daten, wb, zr, heute) => {
      const f = fenster(wb, daten);
      return {
        ist: (daten.buchungen || []).filter(b => b.art === 'ausgabe' && b.kategorie === 'essen' && b.datum >= f.von && b.datum <= f.bis && b.datum <= heute).length,
        soll: 0,
        einheit: 'verbot'
      };
    }
  },
  {
    id: 'fuenf_im_budget',
    text: '5 Tage im Budget',
    samen: 70,
    art: 'zaehl',
    zaehltHeuteNicht: true,
    pruefe: (daten, wb, zr) => tageIn(fenster(wb, daten)).filter(t => L.tagErfuellt(daten, t)).length >= 5,
    fortschritt: (daten, wb, zr, heute) => ({
      ist: vorHeute(tageIn(fenster(wb, daten)), heute).filter(t => L.tagErfuellt(daten, t)).length,
      soll: 5,
      einheit: 'Tage'
    })
  },
  {
    id: 'hoechstens_drei_gross',
    text: 'Höchstens 3 Ausgaben über 20 €',
    samen: 40,
    art: 'grenze',
    pruefe: (daten, wb, zr) => {
      const f = fenster(wb, daten);
      return (daten.buchungen || []).filter(b => b.art === 'ausgabe' && b.betrag > 2000 && b.datum >= f.von && b.datum <= f.bis).length <= 3;
    },
    fortschritt: (daten, wb, zr, heute) => {
      const f = fenster(wb, daten);
      return {
        ist: (daten.buchungen || []).filter(b => b.art === 'ausgabe' && b.betrag > 2000 && b.datum >= f.von && b.datum <= f.bis && b.datum <= heute).length,
        soll: 3,
        einheit: 'Ausgaben'
      };
    }
  },
  {
    id: 'kein_tag_150',
    // Nur sinnvoll mit positivem Wochenbudget (bei überzogenem Monat nicht schaffbar)
    brauchtBudget: true,
    text: 'Kein Tag über 150 % des Tagesbudgets',
    samen: 60,
    art: 'grenze',
    pruefe: (daten, wb, zr) => tageIn(fenster(wb, daten)).every(t => {
      const a = L.ausgabenAm(daten, t);
      return a === 0 || a * 100 <= L.tagesbudget(daten, t) * 150;
    }),
    fortschritt: (daten, wb, zr, heute) => ({
      ist: bisHeute(tageIn(fenster(wb, daten)), heute).filter(t => {
        const a = L.ausgabenAm(daten, t);
        return a !== 0 && a * 100 > L.tagesbudget(daten, t) * 150;
      }).length,
      soll: 0,
      einheit: 'verbot'
    })
  },
  {
    id: 'vier_tage_eintrag',
    text: 'Mindestens 4 Tage mit Eintrag',
    samen: 50,
    art: 'zaehl',
    gruppe: 'eintragen',
    pruefe: (daten, wb, zr) => tageIn(fenster(wb, daten)).filter(t => buchungenAm(daten, t) > 0).length >= 4,
    fortschritt: (daten, wb, zr, heute) => ({
      ist: bisHeute(tageIn(fenster(wb, daten)), heute).filter(t => buchungenAm(daten, t) > 0).length,
      soll: 4,
      einheit: 'Tage'
    })
  },
  {
    id: 'drei_am_stueck',
    text: 'Drei Tage am Stück im Budget',
    samen: 45,
    art: 'zaehl',
    zaehltHeuteNicht: true,
    verpasst: (daten, wb, heute) => laufVerpasst(tageIn(fenster(wb, daten)), heute, t => L.tagErfuellt(daten, t), 3),
    pruefe: (daten, wb, zr) => {
      let beste = 0;
      let lauf = 0;
      for (const t of tageIn(fenster(wb, daten))) {
        lauf = L.tagErfuellt(daten, t) ? lauf + 1 : 0;
        beste = Math.max(beste, lauf);
      }
      return beste >= 3;
    },
    fortschritt: (daten, wb, zr, heute) => {
      let beste = 0;
      let lauf = 0;
      for (const t of vorHeute(tageIn(fenster(wb, daten)), heute)) {
        lauf = L.tagErfuellt(daten, t) ? lauf + 1 : 0;
        beste = Math.max(beste, lauf);
      }
      return { ist: beste, soll: 3, einheit: 'Tage' };
    }
  },
  {
    id: 'wochenende_im_budget',
    text: 'Wochenende im Budget (Sa und So)',
    samen: 50,
    art: 'zaehl',
    zaehltHeuteNicht: true,
    tage: (daten, wb) => wochenende(daten, wb),
    // Nur wenn beide Wochenendtage ab dem Start der App liegen
    moeglich: (daten, wb) => wochenende(daten, wb).length === 2,
    pruefe: (daten, wb) => wochenende(daten, wb).every(t => L.tagErfuellt(daten, t)),
    fortschritt: (daten, wb, zr, heute) => ({
      ist: vorHeute(wochenende(daten, wb), heute).filter(t => L.tagErfuellt(daten, t)).length,
      soll: 2,
      einheit: 'Tage'
    })
  },
  {
    id: 'drei_ohne_folge',
    text: '3 Tage hintereinander ohne Ausgaben',
    samen: 70,
    art: 'zaehl',
    zaehltHeuteNicht: true,
    verpasst: (daten, wb, heute) => laufVerpasst(tageIn(fenster(wb, daten)), heute, t => L.ausgabenAm(daten, t) === 0, 3),
    pruefe: (daten, wb) => laengsterLauf(tageIn(fenster(wb, daten)), t => L.ausgabenAm(daten, t) === 0) >= 3,
    fortschritt: (daten, wb, zr, heute) => ({
      ist: Math.min(3, laengsterLauf(vorHeute(tageIn(fenster(wb, daten)), heute), t => L.ausgabenAm(daten, t) === 0)),
      soll: 3,
      einheit: 'Tage'
    })
  },
  {
    id: 'kein_tag_ueber_30',
    text: 'Kein Tag über 30 €',
    samen: 60,
    art: 'grenze',
    pruefe: (daten, wb) => tageIn(fenster(wb, daten)).every(t => L.ausgabenAm(daten, t) <= 3000),
    fortschritt: (daten, wb, zr, heute) => ({
      ist: bisHeute(tageIn(fenster(wb, daten)), heute).filter(t => L.ausgabenAm(daten, t) > 3000).length,
      soll: 0,
      einheit: 'verbot'
    })
  },
  {
    id: 'weniger_als_letzte_woche',
    text: 'Weniger ausgeben als letzte Woche',
    samen: 60,
    art: 'grenze',
    // Nur wenn die ganze Vorwoche ab dem Start lag und dort etwas ausgegeben wurde (sonst unmöglich oder ohne Sinn)
    moeglich: (daten, wb) => {
      const st = daten.einstellungen.startDatum || '';
      return st <= L.datumPlusTage(wb, -7) && vorwocheAusgaben(daten, wb) > 0;
    },
    pruefe: (daten, wb) => L.ausgabenZwischen(daten, wb, L.datumPlusTage(wb, 6)) < vorwocheAusgaben(daten, wb),
    fortschritt: (daten, wb, zr, heute) => {
      const so = L.datumPlusTage(wb, 6);
      return { ist: L.ausgabenZwischen(daten, wb, heute < so ? heute : so), soll: vorwocheAusgaben(daten, wb) - 1, einheit: 'cent' };
    }
  },
  {
    id: 'hoechstens_zwei_essen',
    text: 'Höchstens 2× Essen gehen',
    samen: 40,
    art: 'grenze',
    gruppe: 'essen',
    moeglich: (daten) => hatKategorie(daten, 'essen'),
    pruefe: (daten, wb) => essenBuchungen(daten, wb, L.datumPlusTage(wb, 6)) <= 2,
    fortschritt: (daten, wb, zr, heute) => ({
      ist: essenBuchungen(daten, wb, heute),
      soll: 2,
      einheit: 'Ausgaben'
    })
  },
  {
    id: 'abends_eingetragen',
    text: 'Jeden Abend vor 22 Uhr eintragen',
    samen: 50,
    art: 'grenze',
    gruppe: 'eintragen',
    // Erst ab der ersten vollen Woche, in der die App den Zeitpunkt jeder Buchung kennt
    moeglich: (daten, wb) => wb >= ABENDS_AB,
    pruefe: (daten, wb) => tageIn(fenster(wb, daten)).every(t => vorZehnEingetragen(daten, t)),
    // Heute zählt erst morgen: bis 22 Uhr kann der Eintrag noch kommen
    fortschritt: (daten, wb, zr, heute) => ({
      ist: vorHeute(tageIn(fenster(wb, daten)), heute).filter(t => !vorZehnEingetragen(daten, t)).length,
      soll: 0,
      einheit: 'verbot'
    })
  },
  {
    id: 'vier_tage_unter_70',
    text: '4 Tage unter 70 % des Tagesbudgets',
    samen: 70,
    art: 'zaehl',
    zaehltHeuteNicht: true,
    pruefe: (daten, wb) => tageIn(fenster(wb, daten)).filter(t => unter70(daten, t)).length >= 4,
    fortschritt: (daten, wb, zr, heute) => ({
      ist: vorHeute(tageIn(fenster(wb, daten)), heute).filter(t => unter70(daten, t)).length,
      soll: 4,
      einheit: 'Tage'
    })
  },
  {
    id: 'kategorie_meiden',
    text: 'Eine Kategorie diese Woche meiden',
    samen: 60,
    art: 'grenze',
    // Wählbar sind Kategorien mit Ausgaben in den 4 Wochen davor; ohne solche gibt es die Challenge nicht
    moeglich: (daten, wb) => meidbareKategorien(daten, wb).length > 0,
    pruefe: (daten, wb) => {
      const k = gewaehlteKategorie(daten, wb);
      return !!k && !kategorieAusgaben(daten, wb, L.datumPlusTage(wb, 6), k);
    },
    fortschritt: (daten, wb, zr, heute) => {
      const k = gewaehlteKategorie(daten, wb);
      if (!k) return { ist: 0, soll: 0, einheit: 'wahl' };
      return { ist: kategorieAusgaben(daten, wb, heute, k), soll: 0, einheit: 'verbot' };
    }
  }
];

// Tage bis einschließlich heute (Datumsvergleich als Text, ISO-Format)
function bisHeute(tage, heute) {
  return tage.filter(t => t <= heute);
}

// Abgeschlossene Tage (vor heute). Für Challenges, bei denen ein Tag erst am Abend feststeht (im Budget, ohne Ausgaben):
// sonst gäbe es morgens schon die Belohnung, obwohl später am Tag noch Ausgaben kommen.
function vorHeute(tage, heute) {
  return tage.filter(t => t < heute);
}

// Längste Folge aufeinanderfolgender Tage, für die test(t) gilt
function laengsterLauf(tage, test) {
  let beste = 0;
  let lauf = 0;
  for (const t of tage) {
    lauf = test(t) ? lauf + 1 : 0;
    beste = Math.max(beste, lauf);
  }
  return beste;
}

// Folge von n Tagen nicht mehr erreichbar: nicht schon geschafft, und die laufende Folge plus alle offenen Tage (ab heute) reicht nicht
function laufVerpasst(tage, heute, test, n) {
  const zu = vorHeute(tage, heute);
  if (laengsterLauf(zu, test) >= n) return false;
  let lauf = 0;
  for (const t of zu) lauf = test(t) ? lauf + 1 : 0;
  const offen = tage.filter(t => t >= heute).length;
  return lauf + offen < n;
}

// Samstag und Sonntag der Woche, soweit sie ab dem Start der App liegen
function wochenende(daten, wb) {
  const st = daten.einstellungen.startDatum || '';
  return [L.datumPlusTage(wb, 5), L.datumPlusTage(wb, 6)].filter(t => t >= st);
}

function vorwocheAusgaben(daten, wb) {
  return L.ausgabenZwischen(daten, L.datumPlusTage(wb, -7), L.datumPlusTage(wb, -1));
}

function hatKategorie(daten, id) {
  return (daten.kategorien || []).some(k => k.id === id);
}

function essenBuchungen(daten, wb, bis) {
  return (daten.buchungen || []).filter(b => b.art === 'ausgabe' && b.kategorie === 'essen' && b.betrag > 0 && b.datum >= wb && b.datum <= bis).length;
}

// Ausgabe an Tag t höchstens 70 % des Tagesbudgets (bei negativem Budget: gar keine Ausgabe)
function unter70(daten, t) {
  return L.ausgabenAm(daten, t) * 100 <= 70 * Math.max(0, L.tagesbudget(daten, t));
}

// Erste Woche, in der alle Buchungen einen Anlegezeitpunkt haben (eingeführt am 30.10.2026)
const ABENDS_AB = '2026-11-02';

// Für Tag t gibt es eine Buchung mit diesem Datum, die am selben Tag vor 22 Uhr (Gerätezeit) angelegt wurde
function vorZehnEingetragen(daten, t) {
  return (daten.buchungen || []).some(b => {
    if (b.datum !== t || !b.erstellt) return false;
    const z = new Date(b.erstellt);
    if (Number.isNaN(z.getTime())) return false;
    const tag = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
    return tag === t && z.getHours() < 22;
  });
}

// ---------- Kategorie meiden: Auswahl ----------

export function gewaehlteKategorie(daten, wb) {
  const w = daten.spiel.challengeWahl;
  return w && typeof w === 'object' ? w[wb] || null : null;
}

function kategorieAusgaben(daten, wb, bis, k) {
  return (daten.buchungen || []).filter(b => b.art === 'ausgabe' && b.kategorie === k && b.betrag > 0 && b.datum >= wb && b.datum <= bis).length;
}

// Kategorien mit Ausgaben in den 4 Wochen vor dieser Woche (nur die lohnt es sich zu meiden)
export function meidbareKategorien(daten, wb) {
  const von = L.datumPlusTage(wb, -28);
  const bis = L.datumPlusTage(wb, -1);
  const ids = new Set((daten.buchungen || [])
    .filter(b => b.art === 'ausgabe' && b.betrag > 0 && b.datum >= von && b.datum <= bis)
    .map(b => b.kategorie));
  return (daten.kategorien || []).filter(k => ids.has(k.id));
}

// Kategorie für „Eine Kategorie diese Woche meiden“ festlegen. Nur einmal je Woche, nur aus meidbareKategorien.
export function kategorieWaehlen(daten, wb, kategorieId) {
  if (gewaehlteKategorie(daten, wb)) return fehler('Für diese Woche ist schon eine Kategorie gewählt.');
  if (!meidbareKategorien(daten, wb).some(k => k.id === kategorieId)) return fehler('Diese Kategorie kann nicht gewählt werden.');
  const d = kopie(daten);
  d.spiel.challengeWahl = { ...(d.spiel.challengeWahl || {}), [wb]: kategorieId };
  return { daten: d };
}


// Hash des Datums als Seed, Mulberry32 als Zufallsgenerator
function zufallAusDatum(text) {
  let h = 2166136261;
  for (const c of text) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = ((t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tage ab Startdatum innerhalb der Woche (Einsteiger-Challenges zählen nur ab dem Start)
function tageAb(daten, wb) {
  const st = daten.einstellungen.startDatum;
  const von = st && st > wb ? st : wb;
  return tageIn({ von, bis: L.datumPlusTage(wb, 6) });
}

// Zwei Einsteiger-Challenges für eine angefangene Woche (Start mitten in der Woche, weniger als 7 Tage übrig)
function einsteiger(wb, daten) {
  const m = tageAb(daten, wb).length;
  const n = Math.max(1, Math.ceil(m * 0.6));
  return [
    {
      id: 'einstieg_erste_ausgabe',
      text: 'Trag heute deine erste Ausgabe ein',
      samen: 20,
      art: 'zaehl',
      pruefe: (d, w) => tageAb(d, w).filter(t => buchungenAm(d, t) > 0).length >= 1,
      fortschritt: (d, w, zr, heute) => ({
        ist: bisHeute(tageAb(d, w), heute).filter(t => buchungenAm(d, t) > 0).length,
        soll: 1,
        einheit: 'Tage'
      })
    },
    {
      id: 'einstieg_im_budget',
      text: m === 1 ? 'Bleib am letzten Tag im Budget' : `Bleib an ${n} der restlichen ${m} Tage im Budget`,
      samen: Math.min(40, 15 * n),
      art: 'zaehl',
      pruefe: (d, w) => tageAb(d, w).filter(t => L.tagErfuellt(d, t)).length >= n,
      fortschritt: (d, w, zr, heute) => ({
        ist: bisHeute(tageAb(d, w), heute).filter(t => L.tagErfuellt(d, t)).length,
        soll: n,
        einheit: 'Tage'
      })
    }
  ];
}

// Zwei Challenges je Woche, deterministisch aus dem Wochenbeginn. Mit daten: liegt der Start mitten in
// dieser Woche (weniger als 7 Tage übrig), gibt es Einsteiger-Challenges. Ohne daten wie bisher.
export function challengesDerWoche(wochenbeginn, daten) {
  const st = daten && daten.einstellungen ? daten.einstellungen.startDatum : null;
  if (st && st > wochenbeginn && st <= L.datumPlusTage(wochenbeginn, 6) && tageAb(daten, wochenbeginn).length < 7) {
    return einsteiger(wochenbeginn, daten);
  }
  // Schon vergebene Challenges einer Woche bleiben (gespeichert in spiel.challenges), auch wenn der Pool wächst
  const vergeben = daten && daten.spiel && daten.spiel.challenges ? daten.spiel.challenges[wochenbeginn] : null;
  if (Array.isArray(vergeben) && vergeben.length === 2) {
    const liste = vergeben.map(e => challengePool.find(c => c.id === e.id));
    if (liste.every(Boolean)) return liste;
  }
  const rnd = zufallAusDatum(wochenbeginn);
  // Unmögliche Challenges gar nicht erst vergeben: ohne positives Wochenbudget (Stand Wochenbeginn) keine Budget-Grenzen,
  // dazu die eigenen Bedingungen (moeglich), z. B. Vorwoche vorhanden, Kategorie vorhanden. Ohne daten nur die ohne Bedingung.
  const budgetDa = !daten || L.wocheFuerSpiel(daten, wochenbeginn).W > 0;
  const reihe = challengePool.map((_, i) => i).filter(i => {
    const c = challengePool[i];
    if (!budgetDa && c.brauchtBudget) return false;
    if (c.moeglich && (!daten || !c.moeglich(daten, wochenbeginn))) return false;
    return true;
  });
  for (let i = reihe.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [reihe[i], reihe[j]] = [reihe[j], reihe[i]];
  }
  // Zwei Challenges aus verschiedenen Gruppen (nicht zweimal Essen, nicht zweimal Eintragen)
  const wahl = [];
  for (const i of reihe) {
    const c = challengePool[i];
    if (c.gruppe && wahl.some(w => w.gruppe === c.gruppe)) continue;
    wahl.push(c);
    if (wahl.length === 2) break;
  }
  return wahl;
}

const EINHEIT_TEXT = { Tage: 'Tagen' };

// Anzeigetext zu Fortschritt. verbot: 0 erlaubt; cent: Luft bis zum Limit
function challengeText(art, ist, soll, einheit) {
  if (einheit === 'cent') {
    return ist <= soll ? `Noch ${L.euro(soll - ist)} Luft` : `${L.euro(ist - soll)} über dem Limit`;
  }
  if (einheit === 'wahl') return 'Tippe hier und wähle eine Kategorie';
  if (einheit === 'verbot') {
    return ist === 0 ? 'Bisher ohne Verstoß' : `${ist} ${ist === 1 ? 'Verstoß' : 'Verstöße'} bisher`;
  }
  const wort = EINHEIT_TEXT[einheit] || einheit;
  return art === 'grenze' ? `${ist} von höchstens ${soll} ${wort}` : `${ist} von ${soll} ${wort}`;
}

// Stand einer Challenge für die Anzeige. zustand: geschafft, auf_kurs, gefaehrdet oder verpasst.
// Vergangene Woche: pruefe() entscheidet. Laufende Woche: Grenzen sind verpasst, sobald ein Verstoß da ist;
// Zählziele sind gefaehrdet, wenn genau so viele Tage fehlen, wie noch übrig sind.
export function challengeStatus(daten, challenge, wochenbeginn, heute) {
  const zr = L.zeitraum(daten, wochenbeginn);
  const { ist, soll, einheit } = challenge.fortschritt(daten, wochenbeginn, zr, heute);
  const so = L.datumPlusTage(wochenbeginn, 6);
  let zustand;
  if (so < heute) {
    zustand = challenge.pruefe(daten, wochenbeginn, zr) ? 'geschafft' : 'verpasst';
  } else if (einheit === 'wahl') {
    zustand = 'offen';
  } else if (challenge.art === 'grenze') {
    zustand = ist <= soll ? 'auf_kurs' : 'verpasst';
  } else if (challenge.verpasst && challenge.verpasst(daten, wochenbeginn, heute)) {
    zustand = 'verpasst';
  } else {
    const fehlt = soll - ist;
    // Offene Tage: bei Challenges, die nur abgeschlossene Tage zählen, gehört heute noch dazu
    const relevant = challenge.tage ? challenge.tage(daten, wochenbeginn) : tageIn(fenster(wochenbeginn, daten));
    const uebrig = relevant.filter(t => (challenge.zaehltHeuteNicht ? t >= heute : t > heute)).length;
    if (fehlt <= 0) zustand = 'geschafft';
    else if (fehlt > uebrig) zustand = 'verpasst';
    // Gefährdet nur, wenn es Spielraum gab und er aufgebraucht ist (bei Sa und So von 2 nötig gab es nie Spielraum)
    else if (fehlt === uebrig && relevant.length > soll) zustand = 'gefaehrdet';
    else zustand = 'auf_kurs';
  }
  return { zustand, ist, soll, einheit, text: challengeText(challenge.art, ist, soll, einheit) };
}

// ---------- Abzeichen ----------

export const ABZEICHEN = [
  { id: 'erste_buchung', name: 'Erste Buchung', emoji: '📝', text: 'Die erste Buchung eingetragen.', pruefe: d => d.buchungen.length > 0 },
  { id: 'serie_7', name: '7-Tage-Serie', emoji: '🔥', text: '7 Tage in Folge im Budget.', pruefe: d => d.spiel.besteSerie >= 7 },
  { id: 'serie_30', name: '30-Tage-Serie', emoji: '🌟', text: '30 Tage in Folge im Budget.', pruefe: d => d.spiel.besteSerie >= 30 },
  { id: 'erste_woche', name: 'Erste Woche', emoji: '🌱', text: 'Eine Woche im Budget.', pruefe: d => d.spiel.bewertet.wochen.some(w => w.erfuellt) },
  { id: 'erster_monat', name: 'Erster Monat', emoji: '🌻', text: 'Einen Zeitraum im Budget abgeschlossen.', pruefe: d => d.spiel.bewertet.zeitraeume.some(z => z.erfuellt) },
  { id: 'angespart_100', name: '100 € angespart', emoji: '🪙', text: '100 € in Sparzielen angespart.', pruefe: d => angespartGesamt(d) >= 10000 },
  { id: 'angespart_500', name: '500 € angespart', emoji: '💰', text: '500 € in Sparzielen angespart.', pruefe: d => angespartGesamt(d) >= 50000 },
  { id: 'angespart_1000', name: '1000 € angespart', emoji: '👑', text: '1000 € in Sparzielen angespart.', pruefe: d => angespartGesamt(d) >= 100000 },
  { id: 'sparziel_erreicht', name: 'Ziel erreicht', emoji: '🏁', text: 'Ein Sparziel mit Zielsumme erreicht.', pruefe: d => d.sparziele.some(s => s.zielsumme && (s.angespart || 0) >= s.zielsumme) },
  { id: 'pflanzen_10', name: 'Pflanzenfreund', emoji: '🪴', text: '10 Pflanzen im Gewächshaus.', pruefe: d => d.spiel.gewaechshaus.pflanzen.length >= 10 },
  { id: 'level_5', name: 'Level 5', emoji: '⭐', text: 'Level 5 erreicht.', pruefe: d => levelAus(d.spiel.xp).level >= 5 },
  { id: 'level_10', name: 'Level 10', emoji: '🏆', text: 'Level 10 erreicht.', pruefe: d => levelAus(d.spiel.xp).level >= 10 },
  ...SETS.map(s => ({ id: 'set_' + s.id, name: s.name, emoji: s.emoji, text: 'Herbarium-Set vollständig: ' + s.name + '.', pruefe: d => setKomplett(d, s.id) }))
];

// ---------- Raritaeten (SPEC.md, Abschnitt Raritäten) ----------

// Preis einer Rarität zum Leveln (Stufe 2: 30 %, 3: 60 %, 4: 100 %), wie bei Pflanzen
const RARITAET_PREIS = 300;

// Sortierte Kopie (nach Startdatum, ISO-Text)
const nachStart = (liste) => [...liste].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

// Laengste Folge aufeinanderfolgender Eintraege, fuer die ja(e) gilt
function laengsteFolge(liste, ja) {
  let beste = 0;
  let lauf = 0;
  for (const e of liste) {
    lauf = ja(e) ? lauf + 1 : 0;
    beste = Math.max(beste, lauf);
  }
  return beste;
}

// Woche im Budget und alle ihre Challenges erfuellt
function wochePerfekt(d, w) {
  const ch = d.spiel.challenges[w.start];
  return !!w.erfuellt && Array.isArray(ch) && ch.length > 0 && ch.every(c => c.erfuellt);
}

// Je Typ: pruefe(daten) → bool, fortschritt(daten) → { ist, soll, text } fuer die Shop-Karte
export const RARITAETEN_REGELN = {
  koenigin_der_nacht: {
    pruefe: d => d.spiel.besteSerie >= 30,
    fortschritt: d => {
      const ist = Math.min(d.spiel.besteSerie, 30);
      return { ist, soll: 30, text: `${ist} von 30 Tagen` };
    }
  },
  jadewein: {
    pruefe: d => d.sparziele.some(s => s.zielsumme && (s.angespart || 0) >= s.zielsumme),
    fortschritt: d => {
      // Sparziel mit dem groessten Anteil an seiner Zielsumme
      const mit = d.sparziele.filter(s => s.zielsumme);
      if (!mit.length) return { ist: 0, soll: 1, text: 'Noch kein Sparziel mit Zielsumme' };
      const s = mit.reduce((a, b) => ((b.angespart || 0) / b.zielsumme > (a.angespart || 0) / a.zielsumme ? b : a));
      const ist = Math.min(s.angespart || 0, s.zielsumme);
      return { ist, soll: s.zielsumme, text: `${L.euro(ist)} von ${L.euro(s.zielsumme)} gespart` };
    }
  },
  thai_constellation: {
    pruefe: d => laengsteFolge(nachStart(d.spiel.bewertet.zeitraeume), z => z.erfuellt) >= 3,
    fortschritt: d => {
      const ist = Math.min(laengsteFolge(nachStart(d.spiel.bewertet.zeitraeume), z => z.erfuellt), 3);
      return { ist, soll: 3, text: `${ist} von 3 Zeiträumen in Folge` };
    }
  },
  pink_princess: {
    pruefe: d => laengsteFolge(nachStart(d.spiel.bewertet.wochen), w => wochePerfekt(d, w)) >= 4,
    fortschritt: d => {
      const ist = Math.min(laengsteFolge(nachStart(d.spiel.bewertet.wochen), w => wochePerfekt(d, w)), 4);
      return { ist, soll: 4, text: `${ist} von 4 Wochen in Folge` };
    }
  },
  drachenbaum: {
    pruefe: d => angespartGesamt(d) >= 100000,
    fortschritt: d => {
      const ist = Math.min(angespartGesamt(d), 100000);
      return { ist, soll: 100000, text: `${L.euro(ist)} von ${L.euro(100000)} angespart` };
    }
  },
  gold_ginkgo: {
    pruefe: d => levelAus(d.spiel.xp).level >= 15,
    fortschritt: d => {
      const ist = Math.min(levelAus(d.spiel.xp).level, 15);
      return { ist, soll: 15, text: `Level ${ist} von 15` };
    }
  }
};

// Alle Raritaeten fuer den Shop: zustand gesperrt (noch nicht freigeschaltet), bereit (freigeschaltet, noch nicht
// gepflanzt) oder gepflanzt
export function raritaetenListe(daten) {
  const besitz = daten.spiel.raritaeten || {};
  return Object.keys(RARITAETEN).map(typ => {
    const r = RARITAETEN[typ];
    const eintrag = besitz[typ];
    const zustand = !eintrag || !eintrag.freigeschaltet ? 'gesperrt' : eintrag.gepflanzt ? 'gepflanzt' : 'bereit';
    return {
      typ,
      name: r.name,
      bedingung: r.bedingung,
      zustand,
      fortschritt: RARITAETEN_REGELN[typ].fortschritt(daten)
    };
  });
}

// ---------- Bewertung ----------

// Zeitraum abschliessen: Sparziele bekommen ihren Anteil, Eintrag in abschluesse
function abschliessen(d, zr, gut) {
  const a = L.abschluss(d, zr);
  for (const s of d.sparziele) {
    s.angespart = (s.angespart || 0) + (a.gutgeschrieben[s.id] || 0);
  }
  d.abschluesse.push({
    zeitraumStart: zr.start,
    zeitraumEnde: zr.ende,
    rest: a.rest,
    gutgeschrieben: a.gutgeschrieben,
    uebertrag: a.uebertrag
  });
  const imBudget = a.rest >= 0;
  const samenVorher = d.spiel.samen;
  if (imBudget) {
    d.spiel.offeneAbschluesse.push({ zeitraumStart: zr.start, zeitraumEnde: zr.ende, rest: a.rest });
    gut('zeitraum', `Zeitraum im Budget (${kurz(zr.start)} bis ${kurz(zr.ende)})`, 200);
  }
  d.spiel.bewertet.zeitraeume.push({ start: zr.start, erfuellt: imBudget, samen: d.spiel.samen - samenVorher });
}

// Challenges einer Woche bewerten. komplett: die Woche ist vorbei, pruefe() entscheidet (auch Verbote).
// Sonst (laufende Woche): nur Zähl-Challenges, die bis einschließlich heute erfüllt sind, werden sofort gutgeschrieben;
// Verbote warten auf das Wochenende. belohnt verhindert, dass etwas doppelt gezahlt wird.
function challengesBewerten(d, wb, zr, heute, gut, komplett) {
  const alt = new Map((d.spiel.challenges[wb] || []).map(e => [e.id, e]));
  const neu = [];
  for (const c of challengesDerWoche(wb, d)) {
    const bisher = !!(alt.get(c.id) && alt.get(c.id).belohnt);
    let ok = false;
    if (komplett) {
      ok = c.pruefe(d, wb, zr);
    } else if (c.art === 'zaehl') {
      const f = c.fortschritt(d, wb, zr, heute);
      ok = f.ist >= f.soll;
    }
    if (ok && !bisher) gut('challenge', c.text, c.samen);
    neu.push({ id: c.id, erfuellt: c.art === 'zaehl' ? (ok || bisher) : ok, belohnt: bisher || ok });
  }
  d.spiel.challenges[wb] = neu;
}

// Woche bewerten: immer die volle Kalenderwoche, auch über einen Zeitraumwechsel (jeder Teil mit seinem Tagesbudget).
// startwoche: Start mitten in der Woche. Nur Challenges (Einsteiger), kein Wochenbonus.
function wocheBewerten(d, wb, gut, startwoche = false) {
  const samenVorher = d.spiel.samen;
  const so = L.datumPlusTage(wb, 6);
  const zrA = L.zeitraum(d, wb);
  let erfuellt = false;
  if (!startwoche) {
    erfuellt = L.wocheErfuellt(d, wb);
    if (erfuellt) gut('woche', `Woche im Budget (${kurz(wb)} bis ${kurz(so)})`, 50);
  }
  // Zähl-Challenges dieser Woche, die schon sofort gutgeschrieben wurden, gehören zur Wochen-Summe
  const vorab = challengesDerWoche(wb, d)
    .filter(c => (d.spiel.challenges[wb] || []).some(e => e.id === c.id && e.belohnt))
    .reduce((s, c) => s + c.samen, 0);
  challengesBewerten(d, wb, zrA, so, gut, true);
  d.spiel.bewertet.wochen.push({ start: wb, erfuellt, samen: d.spiel.samen - samenVorher + vorab });
}

// Alle abgeschlossenen, noch nicht bewerteten Zeitraeume, Tage und Wochen bewerten.
// Reihenfolge: Zeitraeume (Uebertraege), dann Tage (Serie), dann Wochen, dann Abzeichen.
export function bewerte(daten, heute) {
  const d = migriere(kopie(daten));
  const sp = d.spiel;
  const start = d.einstellungen.startDatum || heute;
  const ereignisse = [];
  const gut = (art, text, samen) => {
    sp.samen += samen;
    sp.xp += samen;
    ereignisse.push({ art, text, samen });
    if (samen > 0) verlaufEintragen(d, heute, art, text, samen);
  };

  // 0. Dächer entfallen: gekaufte Dach-Designs werden einmalig mit Samen erstattet (ohne XP) und aus der Besitzliste genommen.
  // Danach stehen sie nicht mehr in spiel.designs, deshalb gibt es beim nächsten Mal nichts mehr zu erstatten.
  sp.designs = sp.designs.filter(id => {
    if (!Object.prototype.hasOwnProperty.call(DACH_ALT, id)) return true;
    const preis = DACH_ALT[id];
    if (preis > 0) {
      sp.samen += preis;
      ereignisse.push({ art: 'erstattung', text: `Dachdesign erstattet: +${preis} Samen`, samen: preis });
      verlaufEintragen(d, heute, 'erstattung', `Dachdesign erstattet: +${preis} Samen`, preis);
    }
    return false;
  });

  // 1. Zeitraeume
  const bekannteZeitraeume = new Set(sp.bewertet.zeitraeume.map(z => z.start));
  let zr = L.zeitraum(d, start);
  while (zr.ende < heute) {
    if (!bekannteZeitraeume.has(zr.start)) abschliessen(d, zr, gut);
    const naechster = L.zeitraum(d, L.datumPlusTage(zr.ende, 1));
    if (naechster.ende <= zr.ende) break;
    zr = naechster;
  }

  // 2. Tage bis gestern
  const bekannteTage = new Set(sp.bewertet.tage.map(t => t.datum));
  for (let tag = start; tag < heute; tag = L.datumPlusTage(tag, 1)) {
    if (bekannteTage.has(tag)) continue;
    const samenVorher = sp.samen;
    const erfuellt = L.tagErfuellt(d, tag);
    if (erfuellt) {
      budgetTagWachsen(d);
      sp.serie += 1;
      gut('tag', `Tag im Budget (${kurz(tag)})`, 10);
      if (sp.serie % 7 === 0) gut('serie', `${sp.serie}-Tage-Serie!`, 30);
    } else {
      sp.serie = 0;
    }
    // Der erste Eintrag des Tages wurde schon sofort belohnt (eintragBelohnen), dann hier kein zweites Mal
    if (buchungenAm(d, tag) > 0 && !sp.eintragSofort.includes(tag)) gut('eintrag', `Eintrag am ${kurz(tag)}`, 2);
    sp.besteSerie = Math.max(sp.besteSerie, sp.serie);
    sp.bewertet.tage.push({ datum: tag, erfuellt, samen: sp.samen - samenVorher });
  }

  // 3. Komplette Wochen (Montag ab Startdatum, Sonntag vor heute). Liegt der Start mitten in einer
  // Woche, wird diese Startwoche nur mit ihren Einsteiger-Challenges bewertet.
  const bekannteWochen = new Set(sp.bewertet.wochen.map(w => w.start));
  let wb = L.wochenbeginn(start);
  if (wb < start) {
    if (L.datumPlusTage(wb, 6) < heute && !bekannteWochen.has(wb)) wocheBewerten(d, wb, gut, true);
    wb = L.datumPlusTage(wb, 7);
  }
  for (; L.datumPlusTage(wb, 6) < heute; wb = L.datumPlusTage(wb, 7)) {
    if (!bekannteWochen.has(wb)) wocheBewerten(d, wb, gut);
  }

  // 3b. Laufende Woche: Zähl-Challenges sofort gutschreiben (Stand bis einschließlich heute)
  if (start <= heute) {
    const wbHeute = L.wochenbeginn(heute);
    challengesBewerten(d, wbHeute, L.zeitraum(d, wbHeute), heute, gut, false);
  }

  // 3c. Herbarium-Sets: vollständig = einmaliger Bonus und Abzeichen
  for (const s of herbarium(d).sets) {
    if (s.komplett && !sp.abzeichen.includes('set_' + s.id)) {
      sp.abzeichen.push('set_' + s.id);
      gut('set', 'Herbarium-Set vollständig: ' + s.name, s.samen);
    }
  }

  // 4. Abzeichen
  for (const a of ABZEICHEN) {
    if (!sp.abzeichen.includes(a.id) && a.pruefe(d)) {
      sp.abzeichen.push(a.id);
      ereignisse.push({ art: 'abzeichen', text: `Abzeichen: ${a.name}`, samen: 0 });
    }
  }

  // 5. Raritaeten: neu erfuellte werden einmal freigeschaltet (nie doppelt)
  if (!sp.raritaeten) sp.raritaeten = {};
  for (const typ of Object.keys(RARITAETEN_REGELN)) {
    if (sp.raritaeten[typ] || !RARITAETEN_REGELN[typ].pruefe(d)) continue;
    sp.raritaeten[typ] = { freigeschaltet: heute, gepflanzt: false };
    entdecke(d, typ);
    ereignisse.push({ art: 'raritaet', typ, text: `Rarität freigeschaltet: ${RARITAETEN[typ].name}`, samen: 0 });
  }

  return { daten: d, ereignisse };
}

// Rest eines offenen Abschlusses: 'uebertrag' oder 'sparziel:<id>'
export function restVerwenden(daten, zeitraumStart, ziel) {
  const d = kopie(daten);
  const idx = d.spiel.offeneAbschluesse.findIndex(o => o.zeitraumStart === zeitraumStart);
  if (idx < 0) return fehler('Für diesen Zeitraum gibt es keinen offenen Rest.');
  const offen = d.spiel.offeneAbschluesse[idx];
  const eintrag = d.abschluesse.find(a => a.zeitraumStart === zeitraumStart);

  if (ziel === 'uebertrag') {
    if (eintrag) eintrag.uebertrag = offen.rest;
  } else if (typeof ziel === 'string' && ziel.startsWith('sparziel:')) {
    const id = ziel.slice('sparziel:'.length);
    const s = d.sparziele.find(x => x.id === id);
    if (!s) return fehler('Das Sparziel gibt es nicht.');
    s.angespart = (s.angespart || 0) + offen.rest;
    if (eintrag) {
      eintrag.gutgeschrieben[id] = (eintrag.gutgeschrieben[id] || 0) + offen.rest;
      eintrag.uebertrag = 0;
    }
  } else {
    return fehler('Unbekanntes Ziel für den Rest.');
  }

  d.spiel.offeneAbschluesse.splice(idx, 1);
  return { daten: d };
}

// Welk: heute ueber Budget, oder gestern nicht im Budget und heute noch keine Ausgabe
export function welk(daten, heute) {
  const h = L.heute(daten, heute);
  if (h.rest < 0) return true;
  const gestern = L.datumPlusTage(heute, -1);
  const gesternBewertet = gestern >= daten.einstellungen.startDatum;
  return gesternBewertet && !L.tagErfuellt(daten, gestern) && h.ausgegeben === 0;
}

// ---------- Grundrisse und Platzierung ----------

// Grafikdaten einer Pflanze oder Rarität (gleiche Form: name, groesse, zeichne)
function pflanzenDef(typ) {
  if (hat(PFLANZEN, typ)) return PFLANZEN[typ];
  if (hat(PFLANZEN2, typ)) return PFLANZEN2[typ];
  if (hat(RARITAETEN, typ)) return RARITAETEN[typ];
  return null;
}

// Groesse klein oder gross. Saisonpflanzen ohne Grafik zählen über die Tabelle, Saatpflanzen sind klein.
function groesseVon(typ) {
  const def = pflanzenDef(typ);
  if (def) return def.groesse;
  return (nachschlag(SAISON_ARTIKEL, typ) && SAISON_ARTIKEL[typ].groesse) || 'klein';
}

function moebelMass(m) {
  const def = moebelDaten(m.typ);
  const breite = def ? def.breite : 1;
  const tiefe = def ? def.tiefe : 1;
  return m.drehung === 90 ? { w: tiefe, h: breite } : { w: breite, h: tiefe };
}

// Felder, die ein Moebel belegt, ab (floor(gx), floor(gy))
function moebelFelder(m) {
  const { w, h } = moebelMass(m);
  const fx = Math.floor(m.gx);
  const fy = Math.floor(m.gy);
  const felder = [];
  for (let x = fx; x < fx + w; x++) {
    for (let y = fy; y < fy + h; y++) felder.push(schluessel(x, y));
  }
  return felder;
}

// Alle belegten Bodenfelder, ohne das Teil mit der Id `ausser`
function belegung(gh, ausser) {
  const belegt = new Set();
  for (const m of gh.moebel) {
    if (m.id !== ausser) moebelFelder(m).forEach(f => belegt.add(f));
  }
  for (const p of gh.pflanzen) {
    if (p.id !== ausser && p.ort.feld) belegt.add(schluessel(p.ort.feld[0], p.ort.feld[1]));
  }
  for (const d of gh.deko) {
    // Bodenbeläge (Teppich) liegen unter allem und blockieren kein Feld
    if (d.id !== ausser && d.ort.feld && !istBodenbelag(d.typ)) {
      // Breite Deko (Bank) belegt mehrere Felder in x-Richtung
      for (let i = 0; i < dekoBreite(d.typ); i++) belegt.add(schluessel(d.ort.feld[0] + i, d.ort.feld[1]));
    }
  }
  return belegt;
}

// Anzahl Felder, die eine Deko in x-Richtung belegt (Bank: 2), sonst 1
export function dekoBreite(typ) {
  const def = dekoDef(typ);
  return def && Number.isInteger(def.breite) && def.breite > 1 ? def.breite : 1;
}

function istBodenbelag(typ) {
  const def = dekoDef(typ);
  return !!(def && def.bodenbelag);
}

function feldFrei(gh, x, y, ausser) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (x < 0 || y < 0 || x >= gh.groesse || y >= gh.groesse) return false;
  return !belegung(gh, ausser).has(schluessel(x, y));
}

// Hoehe der Moebel in px (Oberkante hoechstes Brett bzw. Platte), fuer die Haengeampel. Ohne Eintrag: 100.
const MOEBEL_HOEHE = {
  regal_holz: 130, tisch_natur: 68, tisch_weiss: 76, leiterregal: 150,
  metallregal: 140, blumenhocker: 45, holzkiste: 30, steinsockel: 55,
  ziegelbrett: 25, gaertnertisch_guss: 80, wandregal: 100, rattan_etagere: 110,
  kraeuterbeet: 45, hochbeet: 60, sideboard: 55, pflanzentreppe: 70, vitrine: 120, sputnik: 110, hochregal: 150, zinkregal: 74, zinkregal_hoch: 140
};
const HOEHE_UNBEKANNT = 100;
// Moebel und Pflanzen ueber dieser Hoehe passen nicht unter eine Haengeampel
const HOHE_GRENZE = 60;

function hoeheVon(typ) {
  const def = moebelDaten(typ);
  if (def && Number.isFinite(def.hoehe)) return def.hoehe;
  return Object.prototype.hasOwnProperty.call(MOEBEL_HOEHE, typ) ? MOEBEL_HOEHE[typ] : HOEHE_UNBEKANNT;
}

// Die vier Bodenfelder unter einem Haken: floor(gx ± 0.5), floor(gy ± 0.5)
function hakenFelder(gh, h) {
  const { gx, gy } = hakenFuer(gh.groesse || 6)[h];
  const xs = [Math.floor(gx - 0.5), Math.floor(gx + 0.5)];
  const ys = [Math.floor(gy - 0.5), Math.floor(gy + 0.5)];
  return xs.flatMap(x => ys.map(y => schluessel(x, y)));
}

function hakenBelegt(gh, h, ausser) {
  return gh.deko.some(d => d.id !== ausser && d.ort.haken === h);
}

// Felder unter belegten Haken: dort duerfen keine hohen Moebel und keine grossen Pflanzen stehen
function belegteHakenFelder(gh) {
  const felder = new Set();
  for (const h of Object.keys(hakenFuer(gh.groesse || 6))) {
    if (hakenBelegt(gh, h, null)) hakenFelder(gh, h).forEach(f => felder.add(f));
  }
  return felder;
}

// Felder mit hohen Moebeln oder grossen Pflanzen (ohne das Teil mit der Id `ausser`)
function hohBelegt(gh, ausser) {
  const felder = new Set();
  for (const m of gh.moebel) {
    if (m.id !== ausser && hoeheVon(m.typ) > HOHE_GRENZE) moebelFelder(m).forEach(f => felder.add(f));
  }
  for (const p of gh.pflanzen) {
    if (p.id !== ausser && p.ort.feld && groesseVon(p.typ) === 'gross') {
      felder.add(schluessel(p.ort.feld[0], p.ort.feld[1]));
    }
  }
  return felder;
}

// Position eines Moebels pruefen. Gibt null oder die Fehlermeldung zurueck.
function pruefeMoebelPos(gh, typ, pos, ausser) {
  if (!Number.isFinite(pos.gx) || !Number.isFinite(pos.gy)) return 'Für das Möbel fehlt die Position.';
  const drehung = pos.drehung || 0;
  if (drehung !== 0 && drehung !== 90) return 'Möbel lassen sich nur um 0° oder 90° drehen.';
  const m = { typ, gx: pos.gx, gy: pos.gy, drehung };
  const { w, h } = moebelMass(m);
  const fx = Math.floor(pos.gx);
  const fy = Math.floor(pos.gy);
  if (fx < 0 || fy < 0 || fx + w > gh.groesse || fy + h > gh.groesse) {
    return 'Das Möbel passt nicht ganz in das Gewächshaus.';
  }
  const belegt = belegung(gh, ausser);
  if (moebelFelder(m).some(f => belegt.has(f))) return 'Das Möbel würde sich mit etwas anderem überschneiden.';
  if (hoeheVon(typ) > HOHE_GRENZE) {
    const unterHaken = belegteHakenFelder(gh);
    if (moebelFelder(m).some(f => unterHaken.has(f))) return 'Unter der Hängeampel ist kein Platz für hohe Möbel.';
  }
  return null;
}

// Ort einer Pflanze oder Deko pruefen. Gibt null oder die Fehlermeldung zurueck.
function pruefeOrt(gh, kategorie, typ, ort, ausser) {
  if (!ort || typeof ort !== 'object') return 'Kein Platz angegeben.';
  const haengend = kategorie === 'deko' && !!(dekoDef(typ) && dekoDef(typ).haengend);
  if (haengend) {
    if (ort.haken === undefined) return 'Die Hängeampel braucht einen Haken.';
    if (!hat(hakenFuer(gh.groesse || 6), ort.haken)) return 'Diesen Haken gibt es nicht.';
    if (hakenBelegt(gh, ort.haken, ausser)) return 'An diesem Haken hängt schon eine Hängeampel.';
    const hoch = hohBelegt(gh, ausser);
    if (hakenFelder(gh, ort.haken).some(f => hoch.has(f))) {
      return 'An diesem Haken ist kein Platz: Darunter steht ein hohes Möbel oder eine große Pflanze.';
    }
    return null;
  }
  if (ort.haken !== undefined) return kategorie === 'deko' ? 'Diese Deko steht auf dem Boden.' : 'Unbekannter Platz.';
  if (Array.isArray(ort.feld)) {
    if (kategorie === 'saat') return 'Saatgut wächst nur auf einem Beet.';
    if (kategorie === 'deko' && istBodenbelag(typ)) {
      // Teppich: darf unter Möbeln und Pflanzen liegen, nur nicht auf einem anderen Teppich
      const [x, y] = ort.feld;
      // Der Teppich ist größer als ein Feld: mindestens ein Feld Abstand zu den Wänden und zum Zaun
      if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || y < 1 || x > gh.groesse - 2 || y > gh.groesse - 2) return 'Der Teppich braucht ein Feld Abstand zum Rand.';
      if (gh.deko.some(d => d.id !== ausser && d.ort.feld && istBodenbelag(d.typ) && d.ort.feld[0] === x && d.ort.feld[1] === y)) return 'Hier liegt schon ein Teppich.';
      return null;
    }
    const breit = kategorie === 'deko' ? dekoBreite(typ) : 1;
    for (let i = 0; i < breit; i++) {
      if (!feldFrei(gh, ort.feld[0] + i, ort.feld[1], ausser)) {
        return breit > 1 ? 'Hier ist nicht genug Platz: Sie braucht zwei freie Felder nebeneinander.' : 'Dieses Feld ist nicht frei oder liegt außerhalb.';
      }
    }
    if (kategorie === 'pflanze' && groesseVon(typ) === 'gross' &&
      belegteHakenFelder(gh).has(schluessel(ort.feld[0], ort.feld[1]))) {
      return 'Unter der Hängeampel ist kein Platz für große Pflanzen.';
    }
    return null;
  }
  if (ort.moebel !== undefined) {
    if (kategorie === 'deko') return 'Deko steht auf dem Boden.';
    if (groesseVon(typ) === 'gross') return 'Große Pflanzen passen nicht auf ein Möbel.';
    const m = gh.moebel.find(x => x.id === ort.moebel);
    if (!m) return 'Das Möbel gibt es nicht.';
    const def = moebelDaten(m.typ);
    const n = ort.platz;
    if (!def || !Number.isInteger(n) || n < 0 || n >= def.plaetze.length) return 'Diesen Stellplatz gibt es nicht.';
    const beet = !!def.plaetze[n].beet;
    if (kategorie === 'saat' && !beet) return 'Saatgut wächst nur auf einem Beet.';
    if (kategorie !== 'saat' && beet) return 'Auf dem Beet wachsen nur Saatpflanzen.';
    const belegt = gh.pflanzen.some(p => p.id !== ausser && p.ort.moebel === m.id && p.ort.platz === n);
    if (belegt) return 'Dieser Stellplatz ist schon belegt.';
    return null;
  }
  return 'Unbekannter Platz.';
}

function normOrt(ort) {
  if (ort.haken !== undefined) return { haken: ort.haken };
  return Array.isArray(ort.feld)
    ? { feld: [ort.feld[0], ort.feld[1]] }
    : { moebel: ort.moebel, platz: ort.platz };
}

// ---------- Katalog ----------

// Alle Artikel im Shop. Nur gezeichnete Artikel sind kaufbar.
export function katalog(daten) {
  const lvl = levelAus(daten.spiel.xp).level;
  const liste = [];
  const eintragen = (kategorie, tabelle, grafik) => {
    for (const [typ, e] of Object.entries(tabelle)) {
      const gezeichnet = Object.prototype.hasOwnProperty.call(grafik, typ);
      liste.push({
        kategorie,
        typ,
        name: gezeichnet ? grafik[typ].name : e.name,
        preis: e.preis,
        level: e.level,
        freigeschaltet: lvl >= e.level,
        gezeichnet,
        groesse: kategorie === 'pflanze' ? groesseVon(typ) : undefined,
        gutschein: !!gutscheinFuer(daten, kategorie, typ)
      });
    }
  };
  eintragen('pflanze', PREISE_PFLANZEN, PFLANZEN_ALLE);
  eintragen('moebel', PREISE_MOEBEL, MOEBEL_ALLE);
  eintragen('deko', PREISE_DEKO, DEKO_ALLE);
  // Meilenstein-Deko (SPEC-3): nur im Katalog, solange ein Gutschein dafür da ist. Gratis, Level 1.
  for (const m of MEILENSTEINE) {
    if (!gutscheinFuer(daten, 'deko', m.typ)) continue;
    const gezeichnet = hat(DEKO2, m.typ);
    liste.push({
      kategorie: 'deko',
      typ: m.typ,
      name: (gezeichnet && DEKO2[m.typ].name) || m.name,
      preis: 0,
      level: 1,
      freigeschaltet: true,
      gezeichnet,
      gutschein: true,
      meilenstein: m.tag
    });
  }
  for (const e of ERWEITERUNGEN) {
    liste.push({
      kategorie: 'erweiterung',
      typ: e.id,
      name: `Grundfläche ${e.groesse} × ${e.groesse}`,
      preis: e.preis,
      level: e.level,
      freigeschaltet: lvl >= e.level,
      gezeichnet: true,
      gutschein: false
    });
  }
  return liste;
}

// Pflanzen für die Auswahl eines Sparziels: nur Topfpflanzen, die der Spieler mit seinem Level kaufen kann
// (freigeschaltet, gezeichnet). Saatgut und Raritäten gehören nicht dazu. Sortiert nach Level, dann Name.
// weitere: es gibt noch gezeichnete Topfpflanzen ab einem höheren Level.
export function sparzielPflanzen(daten) {
  const alle = katalog(daten).filter(k => k.kategorie === 'pflanze' && k.gezeichnet);
  const pflanzen = alle
    .filter(k => k.freigeschaltet && !saatSeltenheit(k.typ))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'de'))
    .map(k => ({ typ: k.typ, name: k.name, level: k.level }));
  return { pflanzen, weitere: alle.some(k => !k.freigeschaltet) };
}

// Freie Orte fuer die UI. Pflanze: Stellplaetze und Felder. Deko: Felder, haengende Deko: freie Haken.
// Moebel: Positionen mit Drehung.
export function freiePlaetze(daten, kategorie, typ) {
  const gh = daten.spiel.gewaechshaus;
  const belegt = belegung(gh, null);
  const felder = [];
  for (let x = 0; x < gh.groesse; x++) {
    for (let y = 0; y < gh.groesse; y++) {
      if (!belegt.has(schluessel(x, y))) felder.push({ feld: [x, y] });
    }
  }
  // Raritaeten: wie normale Pflanzen gleicher Groesse. Saat nur auf Beeten, Topfpflanzen nie dort.
  if (kategorie === 'pflanze' || kategorie === 'raritaet' || kategorie === 'saat') {
    const art = kategorie === 'raritaet' ? 'pflanze' : kategorie;
    if (art === 'pflanze' && groesseVon(typ) === 'gross') return felder.filter(o => !pruefeOrt(gh, 'pflanze', typ, o, null));
    const plaetze = [];
    for (const m of gh.moebel) {
      const def = moebelDaten(m.typ);
      if (!def) continue;
      def.plaetze.forEach((_, n) => {
        const ort = { moebel: m.id, platz: n };
        if (!pruefeOrt(gh, art, typ, ort, null)) plaetze.push(ort);
      });
    }
    return art === 'saat' ? plaetze : [...plaetze, ...felder];
  }
  if (kategorie === 'deko') {
    if (dekoDef(typ) && dekoDef(typ).haengend) {
      return Object.keys(hakenFuer(gh.groesse || 6)).map(haken => ({ haken })).filter(o => !pruefeOrt(gh, 'deko', typ, o, null));
    }
    if (dekoBreite(typ) > 1) {
      // Breite Deko: Startfelder, ab denen genug Felder frei sind; breite steht im Ort für Vorschau und Markierung
      return felder.filter(o => !pruefeOrt(gh, 'deko', typ, o, null)).map(o => ({ ...o, breite: dekoBreite(typ) }));
    }
    if (istBodenbelag(typ)) {
      // Teppich: jedes Feld ohne anderen Teppich, auch unter Möbeln und Pflanzen
      const alle = [];
      for (let x = 0; x < gh.groesse; x++) for (let y = 0; y < gh.groesse; y++) alle.push({ feld: [x, y] });
      return alle.filter(o => !pruefeOrt(gh, 'deko', typ, o, null));
    }
    return felder;
  }
  if (kategorie === 'moebel') {
    const ergebnis = [];
    for (let x = 0; x < gh.groesse; x++) {
      for (let y = 0; y < gh.groesse; y++) {
        for (const drehung of [0, 90]) {
          if (!pruefeMoebelPos(gh, typ, { gx: x, gy: y, drehung }, null)) ergebnis.push({ gx: x, gy: y, drehung });
        }
      }
    }
    return ergebnis;
  }
  return [];
}

// ---------- Shop-Aktionen ----------

function erweiterungKaufen(daten, id) {
  const e = ERWEITERUNGEN.find(x => x.id === id);
  if (!e) return fehler('Diese Erweiterung gibt es nicht.');
  const d = kopie(daten);
  if (levelAus(d.spiel.xp).level < e.level) return fehler('Die Erweiterung wird ab Level ' + e.level + ' freigeschaltet.');
  if (d.spiel.gewaechshaus.groesse >= e.groesse) return fehler('Diese Grundfläche hast du schon.');
  if (d.spiel.samen < e.preis) return fehler('Dafür fehlen ' + (e.preis - d.spiel.samen) + ' Samen.');
  d.spiel.gewaechshaus.groesse = e.groesse;
  d.spiel.samen -= e.preis;
  return { daten: d };
}

// ort: Pflanze und Deko { feld: [gx, gy] } oder { moebel: id, platz: n }; Moebel { gx, gy, drehung }
export function kaufen(daten, kategorie, typ, ort, heute = heuteIso()) {
  if (kategorie === 'erweiterung') return erweiterungKaufen(daten, typ);
  if (kategorie === 'saison') return saisonKaufen(daten, typ, ort, heute);
  if (kategorie === 'saat') return fehler('Saatgut gibt es nicht im Shop, nur aus Samentüten.');
  const eintrag = katalog(daten).find(k => k.kategorie === kategorie && k.typ === typ);
  if (!eintrag) return fehler('Diesen Artikel gibt es nicht.');
  if (!eintrag.gezeichnet) return fehler(eintrag.name + ' ist noch nicht verfügbar.');
  // Ein Gutschein (Tagesgeschenk) macht den Kauf kostenlos und hebt die Level-Sperre auf
  if (!eintrag.gutschein && !eintrag.freigeschaltet) return fehler(eintrag.name + ' wird ab Level ' + eintrag.level + ' freigeschaltet.');
  const preis = eintrag.gutschein ? 0 : eintrag.preis;

  const d = migriere(kopie(daten));
  if (d.spiel.samen < preis) return fehler('Dafür fehlen ' + (preis - d.spiel.samen) + ' Samen.');
  const gh = d.spiel.gewaechshaus;

  if (kategorie === 'moebel') {
    const f = pruefeMoebelPos(gh, typ, ort || {}, null);
    if (f) return fehler(f);
    gh.moebel.push({ id: neueId('m'), typ, gx: ort.gx, gy: ort.gy, drehung: ort.drehung || 0 });
  } else if (kategorie === 'pflanze') {
    const f = pruefeOrt(gh, 'pflanze', typ, ort, null);
    if (f) return fehler(f);
    gh.pflanzen.push({ id: neueId('p'), typ, stufe: 1, ort: normOrt(ort) });
  } else if (kategorie === 'deko') {
    const f = pruefeOrt(gh, 'deko', typ, ort, null);
    if (f) return fehler(f);
    gh.deko.push({ id: neueId('d'), typ, ort: normOrt(ort) });
  } else {
    return fehler('Unbekannte Kategorie.');
  }
  if (eintrag.gutschein) {
    // Passender Einzel-Gutschein zuerst, sonst der Gutschein nach Wahl
    const g = gutscheinFuer(d, kategorie, typ);
    const i = d.spiel.gutscheine.indexOf(g);
    if (i >= 0) d.spiel.gutscheine.splice(i, 1);
  }
  if (kategorie === 'pflanze') entdecke(d, typ);
  d.spiel.samen -= preis;
  return { daten: d };
}

// Platzieren: Pflanze oder Deko an einen neuen Ort. Moebel: moebelSetzen.
export function platzieren(daten, kategorie, id, ort) {
  if (kategorie === 'moebel') return fehler('Möbel werden mit moebelSetzen verschoben.');
  const d = kopie(daten);
  const gh = d.spiel.gewaechshaus;
  const liste = kategorie === 'pflanze' ? gh.pflanzen : kategorie === 'deko' ? gh.deko : null;
  if (!liste) return fehler('Unbekannte Kategorie.');
  const obj = liste.find(x => x.id === id);
  if (!obj) return fehler('Diesen Gegenstand gibt es nicht.');
  const f = pruefeOrt(gh, obj.saat ? 'saat' : kategorie, obj.typ, ort, id);
  if (f) return fehler(f);
  obj.ort = normOrt(ort);
  return { daten: d };
}

export function moebelSetzen(daten, id, gx, gy, drehung) {
  const d = kopie(daten);
  const gh = d.spiel.gewaechshaus;
  const m = gh.moebel.find(x => x.id === id);
  if (!m) return fehler('Dieses Möbel gibt es nicht.');
  const neueDrehung = drehung === undefined ? m.drehung : drehung;
  const f = pruefeMoebelPos(gh, m.typ, { gx, gy, drehung: neueDrehung }, id);
  if (f) return fehler(f);
  m.gx = gx;
  m.gy = gy;
  m.drehung = neueDrehung;
  return { daten: d };
}

// Rarität pflanzen: kostenlos, nur wenn freigeschaltet und noch nicht gepflanzt. Platzregeln wie normale Pflanzen.
export function raritaetPflanzen(daten, typ, ort) {
  if (!Object.prototype.hasOwnProperty.call(RARITAETEN, typ)) return fehler('Diese Rarität gibt es nicht.');
  const name = RARITAETEN[typ].name;
  const d = kopie(daten);
  const eintrag = (d.spiel.raritaeten || {})[typ];
  if (!eintrag || !eintrag.freigeschaltet) return fehler(name + ' ist noch nicht freigeschaltet.');
  if (eintrag.gepflanzt) return fehler(name + ' steht schon im Gewächshaus.');
  const gh = d.spiel.gewaechshaus;
  const f = pruefeOrt(gh, 'pflanze', typ, ort, null);
  if (f) return fehler(f);
  gh.pflanzen.push({ id: neueId('p'), typ, stufe: 1, ort: normOrt(ort), rar: true });
  eintrag.gepflanzt = true;
  entdecke(d, typ);
  return { daten: d };
}

// Pflanze eine Stufe hoeher. Kosten je Stufe: 30 %, 60 %, 100 % des Kaufpreises (Raritaeten: Basis 300).
export function pflanzeLeveln(daten, id) {
  const d = kopie(daten);
  const p = d.spiel.gewaechshaus.pflanzen.find(x => x.id === id);
  if (!p) return fehler('Diese Pflanze gibt es nicht.');
  if (p.saat) return fehler('Saatpflanzen wachsen mit deinen Budget-Tagen, nicht mit Samen.');
  if (p.stufe >= 4) return fehler('Die Pflanze ist schon auf Stufe 4.');
  const preis = p.rar ? RARITAET_PREIS : (preisVon(p.typ) || {}).preis;
  if (!preis) return fehler('Diese Pflanze ist nicht bekannt.');
  const neue = p.stufe + 1;
  const kosten = Math.round(preis * STUFENKOSTEN[neue] / 100);
  if (d.spiel.samen < kosten) return fehler('Dafür fehlen ' + (kosten - d.spiel.samen) + ' Samen.');
  d.spiel.samen -= kosten;
  p.stufe = neue;
  return { daten: d };
}

// Verkauf gegen 50 % des Kaufpreises. Moebel nur, wenn nichts mehr darauf steht.
export function verkaufen(daten, kategorie, id) {
  const d = kopie(daten);
  const gh = d.spiel.gewaechshaus;
  let liste;
  let tabelle;
  if (kategorie === 'pflanze') {
    liste = gh.pflanzen;
    tabelle = PREISE_PFLANZEN;
  } else if (kategorie === 'deko') {
    liste = gh.deko;
    tabelle = PREISE_DEKO;
  } else if (kategorie === 'moebel') {
    liste = gh.moebel;
    tabelle = PREISE_MOEBEL;
  } else {
    return fehler('Unbekannte Kategorie.');
  }
  const idx = liste.findIndex(x => x.id === id);
  if (idx < 0) return fehler('Diesen Gegenstand gibt es nicht.');
  if (liste[idx].rar) return fehler('Raritäten kann man nicht verkaufen.');
  if (kategorie === 'moebel' && gh.pflanzen.some(p => p.ort.moebel === id)) {
    return fehler('Auf dem Möbel stehen noch Pflanzen.');
  }
  const def = tabelle[liste[idx].typ] || preisVon(liste[idx].typ);
  const erloes = liste[idx].saat || !def ? 0 : Math.floor(def.preis / 2);
  liste.splice(idx, 1);
  d.spiel.samen += erloes;
  return { daten: d };
}

// ---------- Wochenrückblick ----------

// Rückblick auf eine Woche (Montag bis Sonntag, ab dem Starttag der App).
// Samen: die tatsächlichen Gutschriften der ganzen Woche (Mo bis So) aus bewertet.tage und bewertet.wochen.
// Fehlt ein Eintrag oder sein Feld samen (alte Spielstände, noch nicht bewertet), wird nur dieser Teil
// nach den Regeln geschätzt (10 pro Tag im Budget, 50 Woche, Challenges).
export function wochenRueckblick(daten, wochenbeginn) {
  const zr = L.zeitraum(daten, wochenbeginn);
  const f = fenster(wochenbeginn, daten);
  const tage = tageIn(f);
  const { W, ausgegeben } = wochenWerte(daten, wochenbeginn);

  const bewertetTage = new Map((daten.spiel.bewertet.tage || []).map(t => [t.datum, t.erfuellt]));
  const tageImBudget = tage.filter(t => (bewertetTage.has(t) ? bewertetTage.get(t) : L.tagErfuellt(daten, t))).length;

  const gespeicherteTage = new Map((daten.spiel.bewertet.tage || []).map(t => [t.datum, t]));
  const startTag = daten.einstellungen.startDatum || '';
  const samenTage = tageIn({ von: wochenbeginn, bis: L.datumPlusTage(wochenbeginn, 6) }).reduce((s, t) => {
    const g = gespeicherteTage.get(t);
    if (g && Number.isFinite(g.samen)) return s + g.samen;
    // Schätzung nur für Tage ab dem Startdatum (vor dem Start gab es keine Bewertung)
    const imBudget = g ? g.erfuellt : (t >= f.von && t <= f.bis && t >= startTag && L.tagErfuellt(daten, t));
    return s + (imBudget ? 10 : 0);
  }, 0);

  const gespeicherteWoche = (daten.spiel.bewertet.wochen || []).find(w => w.start === wochenbeginn);
  const erfuellt = gespeicherteWoche ? gespeicherteWoche.erfuellt : ausgegeben <= W;

  const gespeicherte = daten.spiel.challenges[wochenbeginn];
  const alle = challengesDerWoche(wochenbeginn, daten);
  const erfuellteChallenges = gespeicherte
    ? gespeicherte.filter(c => c.erfuellt).map(c => alle.find(p => p.id === c.id)).filter(Boolean)
    : alle.filter(c => c.pruefe(daten, wochenbeginn, zr));
  const samenChallenges = erfuellteChallenges.reduce((s, c) => s + c.samen, 0);
  const samenWoche = gespeicherteWoche && Number.isFinite(gespeicherteWoche.samen)
    ? gespeicherteWoche.samen
    : (erfuellt ? 50 : 0) + samenChallenges;

  const summen = new Map();
  for (const b of daten.buchungen || []) {
    if (b.art === 'ausgabe' && b.datum >= f.von && b.datum <= f.bis && b.betrag > 0) {
      summen.set(b.kategorie, (summen.get(b.kategorie) || 0) + b.betrag);
    }
  }
  let topKategorie = null;
  for (const [id, betrag] of summen) {
    if (!topKategorie || betrag > topKategorie.betrag) topKategorie = { id, betrag };
  }

  return {
    von: f.von,
    bis: f.bis,
    W,
    ausgegeben,
    gespart: W - ausgegeben,
    tageImBudget,
    samen: samenTage + samenWoche,
    topKategorie,
    erfuellt
  };
}

// ---------- Tagesgeschenk ----------

// Samen je Position im 7er-Block (Tag 1 bis 7). Ab der zweiten Woche kommen je Woche 5 Samen dazu, höchstens 20.
const GESCHENK_SAMEN = [10, 15, 20, 15, 25, 30, 60];
const GESCHENK_BONUS_MAX = 4;
const MEILENSTEIN_SAMEN = 100;

// Meilensteine (SPEC-3, Abschnitt 1): nicht kaufbar, nur über den Gutschein aus dem Tagesgeschenk
export const MEILENSTEINE = [
  { tag: 30, typ: 'goldene_giesskanne', name: 'Goldene Gießkanne' },
  { tag: 50, typ: 'vogeltraenke', name: 'Terrazzo-Vogeltränke' },
  { tag: 100, typ: 'sonnenuhr', name: 'Messing-Sonnenuhr' },
  { tag: 200, typ: 'keramikpfau', name: 'Keramik-Pfau' },
  { tag: 365, typ: 'jubilaeumsbrunnen', name: 'Jubiläums-Brunnen' }
];

// Besuchsstand: letzter Besuch und Anzahl abgeholter Geschenke (tag, nie zurückgesetzt).
// Alte Spielstände haben serie statt tag: dann wird serie übernommen.
function besuchVon(sp) {
  const b = sp.besuch && typeof sp.besuch === 'object' ? sp.besuch : {};
  const tag = Number.isFinite(b.tag) ? b.tag : (Number.isFinite(b.serie) ? b.serie : 0);
  return { letzter: b.letzter || null, tag };
}

// Samen eines Geschenktags: Grundreihe der Position plus 5 je Woche ab Woche 2, höchstens 20
function samenFuer(tag) {
  const block = Math.floor((tag - 1) / 7);
  return GESCHENK_SAMEN[(tag - 1) % 7] + 5 * Math.min(GESCHENK_BONUS_MAX, block);
}

// Gutschein-Artikel deterministisch aus dem Datum wählen. Null, wenn die Liste leer ist.
function gutscheinAusDatum(liste, heute, salz) {
  if (!liste.length) return null;
  const r = zufallAusDatum(heute + '|' + salz)();
  return liste[Math.floor(r * liste.length)];
}

// Gutschein eines Artikels (kategorie + typ) oder null
// Ein Gutschein mit typ '*' gilt für ein Teil nach Wahl dieser Kategorie bis Level bisLevel (Start-Gutschein).
export function gutscheinFuer(daten, kategorie, typ) {
  const liste = daten.spiel.gutscheine || [];
  return liste.find(g => g.kategorie === kategorie && g.typ === typ) ||
    liste.find(g => g.kategorie === kategorie && g.typ === '*' && levelVonArtikel(kategorie, typ) <= (g.bisLevel || 1)) ||
    null;
}

function levelVonArtikel(kategorie, typ) {
  const tabelle = kategorie === 'pflanze' ? PREISE_PFLANZEN : kategorie === 'moebel' ? PREISE_MOEBEL : kategorie === 'deko' ? PREISE_DEKO : {};
  return hat(tabelle, typ) ? tabelle[typ].level : Infinity;
}

// Tagesgeschenk für heute. verfuegbar: noch nicht abgeholt. tag: Nummer des Geschenks (zählt nie zurück).
// wocheStart: erster Tag der 7er-Reihe, in der tag liegt.
export function tagesgeschenk(daten, heute) {
  const besuch = besuchVon(daten.spiel);
  const verfuegbar = besuch.letzter !== heute;
  const tag = verfuegbar ? besuch.tag + 1 : Math.max(1, besuch.tag);
  const wocheStart = Math.floor((tag - 1) / 7) * 7 + 1;
  const position = (tag - 1) % 7;
  const belohnung = { samen: samenFuer(tag) };
  const k = katalog(daten);
  if (position === 3) {
    const liste = k.filter(a => a.kategorie === 'pflanze' && a.gezeichnet && a.freigeschaltet && groesseVon(a.typ) === 'klein');
    const g = gutscheinAusDatum(liste, heute, 'pflanze');
    if (g) belohnung.gutschein = { kategorie: 'pflanze', typ: g.typ };
  }
  if (position === 6) {
    const lvl = levelAus(daten.spiel.xp).level;
    if (lvl >= TUETE_LEVEL) {
      belohnung.tuete = 1;
    } else {
      const liste = k.filter(a => a.kategorie === 'deko' && a.gezeichnet && !a.meilenstein && a.level <= lvl + 1);
      const g = gutscheinAusDatum(liste, heute, 'deko');
      if (g) belohnung.gutschein = { kategorie: 'deko', typ: g.typ };
    }
  }
  const meilenstein = MEILENSTEINE.find(m => m.tag === tag);
  if (meilenstein) {
    belohnung.samen += MEILENSTEIN_SAMEN;
    belohnung.meilenstein = { tag: meilenstein.tag, typ: meilenstein.typ, name: meilenstein.name };
    belohnung.meilensteinGutschein = { kategorie: 'deko', typ: meilenstein.typ };
  }
  return { verfuegbar, tag, wocheStart, belohnung };
}

// Nächster noch nicht erreichter Meilenstein, null wenn alle erreicht sind
export function naechsterMeilenstein(daten) {
  const tag = besuchVon(daten.spiel).tag;
  const m = MEILENSTEINE.find(x => x.tag > tag);
  return m ? { tag: m.tag, typ: m.typ, name: m.name, inTagen: m.tag - tag } : null;
}

// Tagesgeschenk abholen: Samen und XP, Gutscheine, Tüte, Besuch und Verlauf. Nur einmal am Tag.
export function geschenkAbholen(daten, heute) {
  const g = tagesgeschenk(daten, heute);
  if (!g.verfuegbar) return fehler('Das Tagesgeschenk hast du heute schon abgeholt.');
  const d = migriere(kopie(daten));
  const b = g.belohnung;
  d.spiel.samen += b.samen;
  d.spiel.xp += b.samen;
  const neueGutscheine = [];
  if (b.gutschein) neueGutscheine.push({ ...b.gutschein });
  if (b.meilensteinGutschein) neueGutscheine.push({ ...b.meilensteinGutschein });
  if (neueGutscheine.length) d.spiel.gutscheine = [...d.spiel.gutscheine, ...neueGutscheine];
  if (b.tuete) d.spiel.gratisTueten += 1;
  d.spiel.besuch = { letzter: heute, tag: g.tag };
  const text = b.meilenstein ? `Tagesgeschenk, Tag ${g.tag}: ${b.meilenstein.name}` : `Tagesgeschenk, Tag ${g.tag}`;
  verlaufEintragen(d, heute, 'geschenk', text, b.samen);
  return { daten: d, belohnung: b, tag: g.tag };
}

// ---------- SPEC-2: Migration, Saatgut, Samentüten, Ernte, Designs, Herbarium, Saison ----------

// Fehlende Felder alter Spielstände ergänzen. Verändert das übergebene Objekt (immer auf einer Kopie aufrufen).
function migriere(daten) {
  const sp = daten.spiel;
  if (!sp.saatgut || typeof sp.saatgut !== 'object') sp.saatgut = {};
  const t = sp.tuete && typeof sp.tuete === 'object' ? sp.tuete : {};
  sp.tuete = {
    seitSelten: Number.isFinite(t.seitSelten) ? t.seitSelten : 0,
    seitLegendaer: Number.isFinite(t.seitLegendaer) ? t.seitLegendaer : 0,
    geoeffnet: Number.isFinite(t.geoeffnet) ? t.geoeffnet : 0
  };
  if (!Number.isFinite(sp.gratisTueten)) sp.gratisTueten = 0;
  const de = sp.design && typeof sp.design === 'object' ? sp.design : {};
  sp.design = { boden: de.boden || 'dielen', rahmen: de.rahmen || 'teak', dach: de.dach || 'giebel' };
  if (!Array.isArray(sp.designs)) sp.designs = ['dielen', 'teak'];
  if (!Array.isArray(sp.entdeckt)) sp.entdeckt = [];
  // Besuch: tag statt serie (alte Stände werden übernommen)
  sp.besuch = besuchVon(sp);
  if (!Array.isArray(sp.gutscheine)) sp.gutscheine = [];
  if (!Array.isArray(sp.verlauf)) sp.verlauf = [];
  if (!Array.isArray(sp.eintragSofort)) sp.eintragSofort = [];
  for (const p of sp.gewaechshaus.pflanzen) entdecke(daten, p.typ);
  return daten;
}

// Ein Budget-Tag: Beetpflanzen wachsen (Stufe steigt alle 2 Budget-Tage bis 4), die Erntezeit läuft.
function budgetTagWachsen(d) {
  for (const p of d.spiel.gewaechshaus.pflanzen) {
    if (!p.saat) continue;
    p.ernteTage = (p.ernteTage || 0) + 1;
    if (p.stufe < 4) {
      p.fortschritt = (p.fortschritt || 0) + 1;
      p.stufe = Math.min(4, 1 + Math.floor(p.fortschritt / 2));
    }
  }
}

function erntereif(p) {
  return !!p.saat && p.stufe === 4 && (p.ernteTage || 0) >= ERNTE_WARTE_TAGE;
}

// Sorten je Seltenheit. Im Herbst kommt der Zierkürbis als zusätzliche epische Sorte dazu.
function saatPool(seltenheit, heute) {
  const liste = Object.keys(SAAT_TYPEN).filter(t => SAAT_TYPEN[t].seltenheit === seltenheit);
  if (seltenheit === 'episch' && aktiveSaison(heute) === 'herbst') liste.push('zierkuerbis');
  return liste;
}

function ziehSeltenheit(u) {
  let summe = 0;
  for (const [s, p] of TUETE_VERTEILUNG) {
    summe += p / 100;
    if (u < summe) return s;
  }
  return 'legendaer';
}

// Garantie "mindestens selten": Verteilung 28 : 10 : 2 ohne gewöhnlich
function ziehMindestensSelten(u) {
  return u < 0.7 ? 'selten' : u < 0.95 ? 'episch' : 'legendaer';
}

// Samentüte öffnen. Zufall deterministisch aus Datum und Zählern. Gratis-Tüte kostet keine Samen.
export function samentuete(daten, heute = heuteIso()) {
  const d = migriere(kopie(daten));
  const sp = d.spiel;
  if (levelAus(sp.xp).level < TUETE_LEVEL) return fehler('Samentüten gibt es ab Level ' + TUETE_LEVEL + '.');
  const gratis = sp.gratisTueten > 0;
  if (!gratis && sp.samen < TUETE_PREIS) return fehler('Dafür fehlen ' + (TUETE_PREIS - sp.samen) + ' Samen.');
  const t = sp.tuete;
  const rnd = zufallAusDatum(heute + '|tuete|' + t.geoeffnet + '|' + t.seitSelten + '|' + t.seitLegendaer);
  const u1 = rnd();
  const u2 = rnd();
  const u3 = rnd();
  let seltenheit = ziehSeltenheit(u1);
  if (t.seitLegendaer >= GARANTIE_LEGENDAER - 1) seltenheit = 'legendaer';
  else if (t.seitSelten >= GARANTIE_SELTEN - 1 && seltenheit === 'gewoehnlich') seltenheit = ziehMindestensSelten(u2);
  const pool = saatPool(seltenheit, heute);
  const sorte = pool[Math.floor(u3 * pool.length)];
  if (gratis) sp.gratisTueten -= 1;
  else sp.samen -= TUETE_PREIS;
  t.geoeffnet += 1;
  t.seitLegendaer = seltenheit === 'legendaer' ? 0 : t.seitLegendaer + 1;
  t.seitSelten = seltenheit === 'gewoehnlich' ? t.seitSelten + 1 : 0;
  let umgetauscht = 0;
  const anzahl = sp.saatgut[sorte] || 0;
  if (anzahl >= MAX_JE_SORTE) {
    umgetauscht = TUETE_UMTAUSCH[seltenheit];
    sp.samen += umgetauscht;
    sp.xp += umgetauscht;
    verlaufEintragen(d, heute, 'tuete', `Doppelte Saat umgetauscht: ${saatName(sorte)}`, umgetauscht);
  } else {
    sp.saatgut[sorte] = anzahl + 1;
  }
  entdecke(d, sorte);
  return { daten: d, sorte, seltenheit, umgetauscht, gratis };
}

// Saat auf einen freien Beetplatz setzen. Verbraucht 1 Saatgut.
export function saatPflanzen(daten, typ, ort) {
  if (!saatSeltenheit(typ)) return fehler('Diese Saat gibt es nicht.');
  const d = migriere(kopie(daten));
  if (!(d.spiel.saatgut[typ] > 0)) return fehler('Von ' + saatName(typ) + ' hast du kein Saatgut mehr.');
  const gh = d.spiel.gewaechshaus;
  const f = pruefeOrt(gh, 'saat', typ, ort, null);
  if (f) return fehler(f);
  gh.pflanzen.push({ id: neueId('p'), typ, stufe: 1, ort: normOrt(ort), saat: true, ernteTage: 0, fortschritt: 0 });
  d.spiel.saatgut[typ] -= 1;
  if (d.spiel.saatgut[typ] === 0) delete d.spiel.saatgut[typ];
  entdecke(d, typ);
  return { daten: d };
}

// Ernte einer ausgewachsenen Saatpflanze. Samen je Seltenheit, 10 % Chance auf eine Gratis-Tüte.
export function ernten(daten, id, heute = heuteIso()) {
  const d = migriere(kopie(daten));
  const p = d.spiel.gewaechshaus.pflanzen.find(x => x.id === id);
  if (!p || !p.saat) return fehler('Diese Saatpflanze gibt es nicht.');
  if (p.stufe < 4) return fehler('Die Pflanze ist noch nicht ausgewachsen.');
  if (!erntereif(p)) return fehler('Die Pflanze wächst noch nach der letzten Ernte.');
  const samen = ERNTE_SAMEN[saatSeltenheit(p.typ)];
  d.spiel.samen += samen;
  d.spiel.xp += samen;
  verlaufEintragen(d, heute, 'ernte', `Ernte: ${saatName(p.typ)}`, samen);
  const gratis = zufallAusDatum(heute + '|ernte|' + id)() < ERNTE_GRATIS_CHANCE;
  if (gratis) d.spiel.gratisTueten += 1;
  p.ernteTage = 0;
  return { daten: d, samen, gratis };
}

// Saisonartikel im Shop: alle Artikel der aktiven Saison (leer außerhalb)
export function saisonKatalog(daten, heute = heuteIso()) {
  const s = aktiveSaison(heute);
  if (!s) return [];
  return Object.keys(SAISON_ARTIKEL).filter(typ => SAISON_ARTIKEL[typ].saison === s).map(typ => {
    const a = SAISON_ARTIKEL[typ];
    return {
      kategorie: 'saison',
      typ,
      name: (hat(SAISON, typ) && SAISON[typ].name) || a.name,
      art: a.art,
      groesse: a.groesse,
      preis: a.preis || null,
      saison: s,
      kaufbar: a.art !== 'saat',
      gezeichnet: hat(SAISON, typ)
    };
  });
}

function saisonKaufen(daten, typ, ort, heute) {
  if (!hat(SAISON_ARTIKEL, typ)) return fehler('Diesen Artikel gibt es nicht.');
  const a = SAISON_ARTIKEL[typ];
  if (aktiveSaison(heute) !== a.saison) return fehler(a.name + ' gibt es nur im ' + SAISON_NAME[a.saison] + '.');
  if (a.art === 'saat') return fehler(a.name + ' wächst nur aus Samentüten.');
  if (!hat(SAISON, typ)) return fehler(a.name + ' ist noch nicht verfügbar.');
  const d = migriere(kopie(daten));
  if (d.spiel.samen < a.preis) return fehler('Dafür fehlen ' + (a.preis - d.spiel.samen) + ' Samen.');
  const gh = d.spiel.gewaechshaus;
  const f = pruefeOrt(gh, a.art, typ, ort, null);
  if (f) return fehler(f);
  if (a.art === 'pflanze') {
    gh.pflanzen.push({ id: neueId('p'), typ, stufe: 1, ort: normOrt(ort) });
    entdecke(d, typ);
  } else {
    gh.deko.push({ id: neueId('d'), typ, ort: normOrt(ort) });
  }
  d.spiel.samen -= a.preis;
  return { daten: d };
}

// Designs: Liste mit Stand (gekauft, gewählt, freigeschaltet)
export function designListe(daten) {
  const sp = daten.spiel;
  const lvl = levelAus(sp.xp).level;
  const besitz = sp.designs || [];
  const gewaehlt = sp.design || {};
  return DESIGNS.map(e => ({
    kategorie: e.kategorie,
    id: e.id,
    name: e.name,
    preis: e.preis,
    level: e.level,
    freigeschaltet: lvl >= e.level,
    gekauft: besitz.includes(e.id),
    gewaehlt: gewaehlt[e.kategorie] === e.id
  }));
}

// Design kaufen (einmalig)
export function designKaufen(daten, kategorie, id) {
  const e = DESIGNS.find(x => x.id === id && x.kategorie === kategorie);
  if (!e) return fehler('Dieses Design gibt es nicht.');
  const d = migriere(kopie(daten));
  if (d.spiel.designs.includes(id)) return fehler(e.name + ' hast du schon.');
  if (levelAus(d.spiel.xp).level < e.level) return fehler(e.name + ' wird ab Level ' + e.level + ' freigeschaltet.');
  if (d.spiel.samen < e.preis) return fehler('Dafür fehlen ' + (e.preis - d.spiel.samen) + ' Samen.');
  d.spiel.samen -= e.preis;
  d.spiel.designs.push(id);
  return { daten: d };
}

// Design wählen (frei wechselbar, wenn gekauft)
export function designWaehlen(daten, kategorie, id) {
  const e = DESIGNS.find(x => x.id === id && x.kategorie === kategorie);
  if (!e) return fehler('Dieses Design gibt es in dieser Kategorie nicht.');
  const d = migriere(kopie(daten));
  if (!d.spiel.designs.includes(id)) return fehler(e.name + ' musst du erst kaufen.');
  d.spiel.design[kategorie] = id;
  return { daten: d };
}

// Herbarium: Sets mit Mitgliedern, komplett und belohnt (Abzeichen vorhanden)
export function herbarium(daten) {
  const sp = daten.spiel;
  const bekannt = new Set([...(sp.entdeckt || []), ...(sp.gewaechshaus.pflanzen || []).map(p => p.typ)]);
  const abz = sp.abzeichen || [];
  const sets = SETS.map(s => {
    const mitglieder = s.mitglieder.map(typ => ({ typ, entdeckt: bekannt.has(typ) }));
    return {
      id: s.id,
      name: s.name,
      samen: s.samen,
      mitglieder,
      komplett: mitglieder.every(m => m.entdeckt),
      belohnt: abz.includes('set_' + s.id)
    };
  });
  const alle = [...new Set(SETS.flatMap(s => s.mitglieder))];
  return { sets, gesamt: { entdeckt: alle.filter(t => bekannt.has(t)).length, von: alle.length } };
}

function setKomplett(daten, setId) {
  const s = herbarium(daten).sets.find(x => x.id === setId);
  return !!s && s.komplett;
}

// ---------- SPEC-3: Verlauf, Sofort-Belohnung, Samenquellen, Level-Up ----------

const VERLAUF_MAX = 60;
const EINTRAG_SOFORT_MAX = 60;

// Eintrag oben in den Verlauf schreiben (neueste zuerst, höchstens 60)
function verlaufEintragen(d, datum, art, text, samen) {
  if (!Array.isArray(d.spiel.verlauf)) d.spiel.verlauf = [];
  d.spiel.verlauf.unshift({ datum, art, text, samen });
  if (d.spiel.verlauf.length > VERLAUF_MAX) d.spiel.verlauf.length = VERLAUF_MAX;
}

// Erste Buchung eines Tages gibt sofort 2 Samen und 2 XP. Nur für heute (datum === heute), einmal je Tag.
// Der Tag wird in spiel.eintragSofort gemerkt, damit bewerte() ihn nicht noch einmal belohnt.
export function eintragBelohnen(daten, heute, datum) {
  const d = migriere(kopie(daten));
  const sp = d.spiel;
  if (datum !== heute || sp.eintragSofort.includes(datum)) return { daten: d, samen: 0 };
  sp.samen += 2;
  sp.xp += 2;
  sp.eintragSofort.push(datum);
  if (sp.eintragSofort.length > EINTRAG_SOFORT_MAX) sp.eintragSofort = sp.eintragSofort.slice(-EINTRAG_SOFORT_MAX);
  verlaufEintragen(d, heute, 'eintrag', `Erster Eintrag am ${kurz(datum)}`, 2);
  return { daten: d, samen: 2 };
}

// Woher Samen kommen, für das Info-Blatt. samen als Anzeigetext.
export function samenQuellen(daten) {
  return [
    { was: 'Tag im Budget', samen: '10', hinweis: 'Gutschrift am nächsten Morgen.' },
    { was: 'Erster Eintrag am Tag', samen: '2', hinweis: 'Sofort, nur der erste Eintrag eines Tages.' },
    { was: '7-Tage-Serie', samen: '30', hinweis: 'Zusätzlich, wenn 7 Tage in Folge im Budget sind.' },
    { was: 'Woche im Budget', samen: '50', hinweis: 'Gutschrift am Montag für die Woche davor.' },
    { was: 'Wochen-Challenges', samen: '20 bis 80', hinweis: 'Je Woche zwei Aufgaben, je nach Schwierigkeit.' },
    { was: 'Zeitraum im Budget', samen: '200', hinweis: 'Am Ende eines Zeitraums, wenn er im Budget ist.' },
    { was: 'Tagesgeschenk', samen: '10 bis 80', hinweis: 'Jeden Tag abholen. Ab der zweiten Woche steigt die Menge, Meilensteine geben extra.' },
    { was: 'Ernte', samen: '8 bis 60', hinweis: 'Je nach Seltenheit der Saat.' },
    { was: 'Herbarium-Sets', samen: '150 bis 1000', hinweis: 'Wenn ein Set vollständig ist.' }
  ];
}

// Was morgen früh gutgeschrieben wird, wenn heute so bleibt. Serie: wird die 7er-Serie voll, gibt es 30 extra.
export function heuteInAussicht(daten, heute) {
  if (!L.tagErfuellt(daten, heute)) {
    return { samen: 0, text: 'Heute bist du über dem Tagesbudget, morgen gibt es dafür keine Samen.' };
  }
  const serie = (daten.spiel.serie || 0) + 1;
  if (serie % 7 === 0) {
    return { samen: 40, text: `Heute im Budget: morgen 10 Samen, und deine ${serie}-Tage-Serie ist voll, dafür 30 Samen extra.` };
  }
  return { samen: 10, text: 'Heute im Budget: morgen früh gibt es 10 Samen.' };
}

// Artikel mit genau diesem Level (Level-Up-Dialog). Erweiterungen, Designs und bei Level 8 die Samentüte.
// Meilenstein-Deko und Raritäten und Seltenheiten-Saat gehören nicht dazu.
export function freischaltungenBei(daten, level) {
  const liste = [];
  for (const k of katalog(daten)) {
    if (k.kategorie === 'erweiterung' || k.meilenstein || k.level !== level) continue;
    liste.push({ kategorie: k.kategorie, typ: k.typ, name: k.name });
  }
  for (const e of ERWEITERUNGEN) {
    if (e.level === level) liste.push({ kategorie: 'erweiterung', typ: e.id, name: `Grundfläche ${e.groesse} × ${e.groesse}` });
  }
  for (const d of designListe(daten)) {
    if (d.level === level) liste.push({ kategorie: 'design', typ: d.id, name: d.name });
  }
  if (level === TUETE_LEVEL) liste.push({ kategorie: 'tuete', typ: 'samentuete', name: 'Samentüten' });
  return liste;
}
