// Spiel-Logik nach SPEC.md, Abschnitt "Spiel". Reine Funktionen, kein DOM.
// Funktionen, die Daten aendern, geben eine tiefe Kopie (structuredClone) zurueck; das Eingabeobjekt bleibt unveraendert.
// Shop-Aktionen geben { daten } bei Erfolg oder { fehler: 'Meldung' } zurueck.

import * as L from './logik.js';
import { neueId } from './speicher.js';
import { PFLANZEN } from './grafik/pflanzen.js';
import { MOEBEL } from './grafik/moebel.js';
import { DEKO } from './grafik/deko.js';
import { RARITAETEN } from './grafik/raritaeten.js';
import { HAKEN } from './szene.js';

// ---------- Preise und Freischaltung (Tempo mittel, SPEC.md) ----------
// preis in Samen, level = Spielerlevel, ab dem der Artikel kaufbar ist.

export const PREISE_PFLANZEN = {
  efeutute: { name: 'Efeutute', preis: 50, level: 1 },
  kaktus: { name: 'Goldkugelkaktus', preis: 40, level: 1 },
  basilikum: { name: 'Basilikum', preis: 40, level: 1 },
  monstera: { name: 'Monstera deliciosa', preis: 200, level: 1 },
  sonnenblume: { name: 'Sonnenblume', preis: 160, level: 1 },
  tomate: { name: 'Tomate', preis: 180, level: 1 },
  bogenhanf: { name: 'Bogenhanf', preis: 50, level: 2 },
  gruenlilie: { name: 'Grünlilie', preis: 50, level: 2 },
  aloe: { name: 'Aloe vera', preis: 45, level: 3 },
  gluecksfeder: { name: 'Glücksfeder', preis: 55, level: 3 },
  lavendel: { name: 'Lavendel', preis: 50, level: 4 },
  echeverie: { name: 'Echeverie', preis: 45, level: 4 },
  geigenfeige: { name: 'Geigenfeige', preis: 220, level: 5 },
  zitrone: { name: 'Zitronenbäumchen', preis: 230, level: 5 },
  bonsai: { name: 'Ficus-Bonsai', preis: 60, level: 6 },
  kletterrose: { name: 'Kletterrose', preis: 190, level: 6 },
  orchidee: { name: 'Phalaenopsis-Orchidee', preis: 60, level: 7 },
  calathea: { name: 'Calathea', preis: 55, level: 7 },
  erdbeere: { name: 'Erdbeere', preis: 50, level: 8 },
  bostonfarn: { name: 'Bostonfarn', preis: 50, level: 8 }
};

export const PREISE_MOEBEL = {
  tisch_natur: { name: 'Pflanzentisch Naturholz', preis: 150, level: 1 },
  regal_holz: { name: 'Holzregal', preis: 150, level: 1 },
  holzkiste: { name: 'Holzkiste', preis: 150, level: 1 },
  tisch_weiss: { name: 'Pflanzentisch Weiß lackiert', preis: 180, level: 2 },
  gaertnertisch_guss: { name: 'Gärtnertisch Gusseisen', preis: 250, level: 2 },
  leiterregal: { name: 'Leiterregal', preis: 220, level: 3 },
  wandregal: { name: 'Wandregal', preis: 170, level: 3 },
  metallregal: { name: 'Metallregal Industrie', preis: 260, level: 4 },
  rattan_etagere: { name: 'Rattan-Etagere', preis: 240, level: 4 },
  blumenhocker: { name: 'Blumenhocker', preis: 200, level: 5 },
  steinsockel: { name: 'Steinsockel', preis: 300, level: 5 }
};

// Deko: die elf Namen aus SPEC.md. Lichterkette und Haengeampel stehen in SPEC, aber nicht in der Auftragsliste.
export const PREISE_DEKO = {
  laterne: { name: 'Laterne', preis: 60, level: 1 },
  bank: { name: 'Bank', preis: 80, level: 1 },
  giesskanne: { name: 'Gießkanne', preis: 40, level: 1 },
  katze: { name: 'Katze', preis: 50, level: 1 },
  teppich: { name: 'Teppich', preis: 60, level: 2 },
  vogelhaus: { name: 'Vogelhaus', preis: 70, level: 2 },
  gartenzwerg: { name: 'Gartenzwerg', preis: 40, level: 3 },
  windspiel: { name: 'Windspiel', preis: 30, level: 3 },
  lichterkette: { name: 'Lichterkette', preis: 50, level: 4 },
  haengeampel: { name: 'Hängeampel', preis: 60, level: 4 },
  springbrunnen: { name: 'Springbrunnen', preis: 500, level: 5 }
};

export const ERWEITERUNGEN = [
  { id: 'flaeche7', groesse: 7, preis: 1000, level: 6 },
  { id: 'flaeche8', groesse: 8, preis: 2000, level: 10 }
];

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
function fenster(wochenbeginn, zr) {
  const so = L.datumPlusTage(wochenbeginn, 6);
  return {
    von: wochenbeginn > zr.start ? wochenbeginn : zr.start,
    bis: so < zr.ende ? so : zr.ende
  };
}

function tageIn(f) {
  const tage = [];
  for (let t = f.von; t <= f.bis; t = L.datumPlusTage(t, 1)) tage.push(t);
  return tage;
}

// Ausgegebene Summe und Wochenbudget (wie logik.js woche())
function wochenWerte(daten, wochenbeginn, zr) {
  const tage = tageIn(fenster(wochenbeginn, zr));
  const W = tage.length ? L.tagesbudget(daten, tage[0]) * tage.length : 0;
  const ausgegeben = tage.reduce((s, t) => s + L.ausgabenAm(daten, t), 0);
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
    pruefe: (daten, wb, zr) => tageIn(fenster(wb, zr)).filter(t => L.ausgabenAm(daten, t) === 0).length >= 2,
    fortschritt: (daten, wb, zr, heute) => ({
      ist: bisHeute(tageIn(fenster(wb, zr)), heute).filter(t => L.ausgabenAm(daten, t) === 0).length,
      soll: 2,
      einheit: 'Tage'
    })
  },
  {
    id: 'woche_15_unter',
    text: 'Woche 15 % unter Wochenbudget',
    samen: 60,
    art: 'grenze',
    pruefe: (daten, wb, zr) => {
      const w = wochenWerte(daten, wb, zr);
      return w.ausgegeben * 100 <= w.W * 85;
    },
    fortschritt: (daten, wb, zr, heute) => {
      const { W } = wochenWerte(daten, wb, zr);
      const ausgegeben = bisHeute(tageIn(fenster(wb, zr)), heute).reduce((s, t) => s + L.ausgabenAm(daten, t), 0);
      return { ist: ausgegeben, soll: Math.floor(W * 85 / 100), einheit: 'cent' };
    }
  },
  {
    id: 'jeden_tag_eintragen',
    text: 'Jeden Tag etwas eintragen',
    samen: 70,
    art: 'grenze',
    pruefe: (daten, wb, zr) => {
      const tage = tageIn(fenster(wb, zr));
      return tage.length > 0 && tage.every(t => buchungenAm(daten, t) > 0);
    },
    // Heute zählt nicht als Verstoß, der Eintrag kann noch nachkommen
    fortschritt: (daten, wb, zr, heute) => ({
      ist: tageIn(fenster(wb, zr)).filter(t => t < heute && buchungenAm(daten, t) === 0).length,
      soll: 0,
      einheit: 'verbot'
    })
  },
  {
    id: 'keine_essen_gehen',
    text: 'Keine Ausgabe in Essen gehen',
    samen: 50,
    art: 'grenze',
    pruefe: (daten, wb, zr) => {
      const f = fenster(wb, zr);
      return !(daten.buchungen || []).some(b => b.art === 'ausgabe' && b.kategorie === 'essen' && b.datum >= f.von && b.datum <= f.bis);
    },
    fortschritt: (daten, wb, zr, heute) => {
      const f = fenster(wb, zr);
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
    pruefe: (daten, wb, zr) => tageIn(fenster(wb, zr)).filter(t => L.tagErfuellt(daten, t)).length >= 5,
    fortschritt: (daten, wb, zr, heute) => ({
      ist: bisHeute(tageIn(fenster(wb, zr)), heute).filter(t => L.tagErfuellt(daten, t)).length,
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
      const f = fenster(wb, zr);
      return (daten.buchungen || []).filter(b => b.art === 'ausgabe' && b.betrag > 2000 && b.datum >= f.von && b.datum <= f.bis).length <= 3;
    },
    fortschritt: (daten, wb, zr, heute) => {
      const f = fenster(wb, zr);
      return {
        ist: (daten.buchungen || []).filter(b => b.art === 'ausgabe' && b.betrag > 2000 && b.datum >= f.von && b.datum <= f.bis && b.datum <= heute).length,
        soll: 3,
        einheit: 'Ausgaben'
      };
    }
  },
  {
    id: 'kein_tag_150',
    text: 'Kein Tag über 150 % des Tagesbudgets',
    samen: 60,
    art: 'grenze',
    pruefe: (daten, wb, zr) => tageIn(fenster(wb, zr)).every(t => {
      const a = L.ausgabenAm(daten, t);
      return a === 0 || a * 100 <= L.tagesbudget(daten, t) * 150;
    }),
    fortschritt: (daten, wb, zr, heute) => ({
      ist: bisHeute(tageIn(fenster(wb, zr)), heute).filter(t => {
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
    pruefe: (daten, wb, zr) => tageIn(fenster(wb, zr)).filter(t => buchungenAm(daten, t) > 0).length >= 4,
    fortschritt: (daten, wb, zr, heute) => ({
      ist: bisHeute(tageIn(fenster(wb, zr)), heute).filter(t => buchungenAm(daten, t) > 0).length,
      soll: 4,
      einheit: 'Tage'
    })
  },
  {
    id: 'drei_am_stueck',
    text: 'Drei Tage am Stück im Budget',
    samen: 45,
    art: 'zaehl',
    pruefe: (daten, wb, zr) => {
      let beste = 0;
      let lauf = 0;
      for (const t of tageIn(fenster(wb, zr))) {
        lauf = L.tagErfuellt(daten, t) ? lauf + 1 : 0;
        beste = Math.max(beste, lauf);
      }
      return beste >= 3;
    },
    fortschritt: (daten, wb, zr, heute) => {
      let beste = 0;
      let lauf = 0;
      for (const t of bisHeute(tageIn(fenster(wb, zr)), heute)) {
        lauf = L.tagErfuellt(daten, t) ? lauf + 1 : 0;
        beste = Math.max(beste, lauf);
      }
      return { ist: beste, soll: 3, einheit: 'Tage' };
    }
  }
];

// Tage bis einschließlich heute (Datumsvergleich als Text, ISO-Format)
function bisHeute(tage, heute) {
  return tage.filter(t => t <= heute);
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

// Zwei Challenges je Woche, deterministisch aus dem Wochenbeginn
export function challengesDerWoche(wochenbeginn) {
  const rnd = zufallAusDatum(wochenbeginn);
  const reihe = challengePool.map((_, i) => i);
  for (let i = reihe.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [reihe[i], reihe[j]] = [reihe[j], reihe[i]];
  }
  return reihe.slice(0, 2).map(i => challengePool[i]);
}

const EINHEIT_TEXT = { Tage: 'Tagen' };

// Anzeigetext zu Fortschritt. verbot: 0 erlaubt; cent: Luft bis zum Limit
function challengeText(art, ist, soll, einheit) {
  if (einheit === 'cent') {
    return ist <= soll ? `Noch ${L.euro(soll - ist)} Luft` : `${L.euro(ist - soll)} über dem Limit`;
  }
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
  } else if (challenge.art === 'grenze') {
    zustand = ist <= soll ? 'auf_kurs' : 'verpasst';
  } else {
    const fehlt = soll - ist;
    const uebrig = tageIn(fenster(wochenbeginn, zr)).filter(t => t > heute).length;
    if (fehlt <= 0) zustand = 'geschafft';
    else if (fehlt > uebrig) zustand = 'verpasst';
    else if (fehlt === uebrig) zustand = 'gefaehrdet';
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
  { id: 'level_10', name: 'Level 10', emoji: '🏆', text: 'Level 10 erreicht.', pruefe: d => levelAus(d.spiel.xp).level >= 10 }
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
  d.spiel.bewertet.zeitraeume.push({ start: zr.start, erfuellt: imBudget });
  if (imBudget) {
    d.spiel.offeneAbschluesse.push({ zeitraumStart: zr.start, zeitraumEnde: zr.ende, rest: a.rest });
    gut('zeitraum', `Zeitraum im Budget (${kurz(zr.start)} bis ${kurz(zr.ende)})`, 200);
  }
}

// Woche bewerten. Eine Woche, die einen Zeitraumwechsel enthaelt, wird am Wochenziel des ersten Teils geprueft
// und am Teil des folgenden Zeitraums; Challenges nur im Zeitraum des Montags.
function wocheBewerten(d, wb, gut) {
  const so = L.datumPlusTage(wb, 6);
  const zrA = L.zeitraum(d, wb);
  let erfuellt = L.wocheErfuellt(d, wb, zrA);
  if (zrA.ende < so) {
    const folgeStart = L.datumPlusTage(zrA.ende, 1);
    erfuellt = erfuellt && L.wocheErfuellt(d, folgeStart, L.zeitraum(d, folgeStart));
  }
  d.spiel.bewertet.wochen.push({ start: wb, erfuellt });
  if (erfuellt) gut('woche', `Woche im Budget (${kurz(wb)} bis ${kurz(so)})`, 50);

  const challenges = challengesDerWoche(wb).map(c => ({ c, ok: c.pruefe(d, wb, zrA) }));
  d.spiel.challenges[wb] = challenges.map(({ c, ok }) => ({ id: c.id, erfuellt: ok }));
  for (const { c, ok } of challenges) {
    if (ok) gut('challenge', `Challenge erfüllt: ${c.text}`, c.samen);
  }
}

// Alle abgeschlossenen, noch nicht bewerteten Zeitraeume, Tage und Wochen bewerten.
// Reihenfolge: Zeitraeume (Uebertraege), dann Tage (Serie), dann Wochen, dann Abzeichen.
export function bewerte(daten, heute) {
  const d = kopie(daten);
  const sp = d.spiel;
  const start = d.einstellungen.startDatum || heute;
  const ereignisse = [];
  const gut = (art, text, samen) => {
    sp.samen += samen;
    sp.xp += samen;
    ereignisse.push({ art, text, samen });
  };

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
    const erfuellt = L.tagErfuellt(d, tag);
    if (erfuellt) {
      sp.serie += 1;
      gut('tag', `Tag im Budget (${kurz(tag)})`, 10);
      if (sp.serie % 7 === 0) gut('serie', `${sp.serie}-Tage-Serie!`, 30);
    } else {
      sp.serie = 0;
    }
    if (buchungenAm(d, tag) > 0) gut('eintrag', `Eintrag am ${kurz(tag)}`, 2);
    sp.besteSerie = Math.max(sp.besteSerie, sp.serie);
    sp.bewertet.tage.push({ datum: tag, erfuellt });
  }

  // 3. Komplette Wochen (Montag ab Startdatum, Sonntag vor heute)
  const bekannteWochen = new Set(sp.bewertet.wochen.map(w => w.start));
  let wb = L.wochenbeginn(start);
  if (wb < start) wb = L.datumPlusTage(wb, 7);
  for (; L.datumPlusTage(wb, 6) < heute; wb = L.datumPlusTage(wb, 7)) {
    if (!bekannteWochen.has(wb)) wocheBewerten(d, wb, gut);
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
  if (Object.prototype.hasOwnProperty.call(PFLANZEN, typ)) return PFLANZEN[typ];
  if (Object.prototype.hasOwnProperty.call(RARITAETEN, typ)) return RARITAETEN[typ];
  return null;
}

function groesseVon(typ) {
  const def = pflanzenDef(typ);
  return def ? def.groesse : 'klein';
}

function moebelMass(m) {
  const def = MOEBEL[m.typ];
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
    if (d.id !== ausser && d.ort.feld) belegt.add(schluessel(d.ort.feld[0], d.ort.feld[1]));
  }
  return belegt;
}

function feldFrei(gh, x, y, ausser) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (x < 0 || y < 0 || x >= gh.groesse || y >= gh.groesse) return false;
  return !belegung(gh, ausser).has(schluessel(x, y));
}

// Hoehe der Moebel in px (Oberkante hoechstes Brett bzw. Platte), fuer die Haengeampel. Ohne Eintrag: 100.
const MOEBEL_HOEHE = {
  regal_holz: 130, tisch_natur: 76, tisch_weiss: 76, leiterregal: 150,
  metallregal: 140, blumenhocker: 45, holzkiste: 30, steinsockel: 55
};
const HOEHE_UNBEKANNT = 100;
// Moebel und Pflanzen ueber dieser Hoehe passen nicht unter eine Haengeampel
const HOHE_GRENZE = 60;

function hoeheVon(typ) {
  const def = MOEBEL[typ];
  if (def && Number.isFinite(def.hoehe)) return def.hoehe;
  return Object.prototype.hasOwnProperty.call(MOEBEL_HOEHE, typ) ? MOEBEL_HOEHE[typ] : HOEHE_UNBEKANNT;
}

// Die vier Bodenfelder unter einem Haken: floor(gx ± 0.5), floor(gy ± 0.5)
function hakenFelder(h) {
  const { gx, gy } = HAKEN[h];
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
  for (const h of Object.keys(HAKEN)) {
    if (hakenBelegt(gh, h, null)) hakenFelder(h).forEach(f => felder.add(f));
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
  const haengend = kategorie === 'deko' && !!(DEKO[typ] && DEKO[typ].haengend);
  if (haengend) {
    if (ort.haken === undefined) return 'Die Hängeampel braucht einen Haken.';
    if (!Object.prototype.hasOwnProperty.call(HAKEN, ort.haken)) return 'Diesen Haken gibt es nicht.';
    if (hakenBelegt(gh, ort.haken, ausser)) return 'An diesem Haken hängt schon eine Hängeampel.';
    const hoch = hohBelegt(gh, ausser);
    if (hakenFelder(ort.haken).some(f => hoch.has(f))) {
      return 'An diesem Haken ist kein Platz: Darunter steht ein hohes Möbel oder eine große Pflanze.';
    }
    return null;
  }
  if (ort.haken !== undefined) return kategorie === 'deko' ? 'Diese Deko steht auf dem Boden.' : 'Unbekannter Platz.';
  if (Array.isArray(ort.feld)) {
    if (!feldFrei(gh, ort.feld[0], ort.feld[1], ausser)) return 'Dieses Feld ist nicht frei oder liegt außerhalb.';
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
    const def = MOEBEL[m.typ];
    const n = ort.platz;
    if (!def || !Number.isInteger(n) || n < 0 || n >= def.plaetze.length) return 'Diesen Stellplatz gibt es nicht.';
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
        gezeichnet
      });
    }
  };
  eintragen('pflanze', PREISE_PFLANZEN, PFLANZEN);
  eintragen('moebel', PREISE_MOEBEL, MOEBEL);
  eintragen('deko', PREISE_DEKO, DEKO);
  for (const e of ERWEITERUNGEN) {
    liste.push({
      kategorie: 'erweiterung',
      typ: e.id,
      name: `Grundfläche ${e.groesse} × ${e.groesse}`,
      preis: e.preis,
      level: e.level,
      freigeschaltet: lvl >= e.level,
      gezeichnet: true
    });
  }
  return liste;
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
  // Raritaeten: wie normale Pflanzen gleicher Groesse
  if (kategorie === 'pflanze' || kategorie === 'raritaet') {
    if (groesseVon(typ) === 'gross') return felder.filter(o => !pruefeOrt(gh, 'pflanze', typ, o, null));
    const plaetze = [];
    for (const m of gh.moebel) {
      const def = MOEBEL[m.typ];
      if (!def) continue;
      def.plaetze.forEach((_, n) => {
        const ort = { moebel: m.id, platz: n };
        if (!pruefeOrt(gh, 'pflanze', typ, ort, null)) plaetze.push(ort);
      });
    }
    return [...plaetze, ...felder];
  }
  if (kategorie === 'deko') {
    if (DEKO[typ] && DEKO[typ].haengend) {
      return Object.keys(HAKEN).map(haken => ({ haken })).filter(o => !pruefeOrt(gh, 'deko', typ, o, null));
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
export function kaufen(daten, kategorie, typ, ort) {
  if (kategorie === 'erweiterung') return erweiterungKaufen(daten, typ);
  const eintrag = katalog(daten).find(k => k.kategorie === kategorie && k.typ === typ);
  if (!eintrag) return fehler('Diesen Artikel gibt es nicht.');
  if (!eintrag.gezeichnet) return fehler(eintrag.name + ' ist noch nicht verfügbar.');
  if (!eintrag.freigeschaltet) return fehler(eintrag.name + ' wird ab Level ' + eintrag.level + ' freigeschaltet.');

  const d = kopie(daten);
  if (d.spiel.samen < eintrag.preis) return fehler('Dafür fehlen ' + (eintrag.preis - d.spiel.samen) + ' Samen.');
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
  d.spiel.samen -= eintrag.preis;
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
  const f = pruefeOrt(gh, kategorie, obj.typ, ort, id);
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
  return { daten: d };
}

// Pflanze eine Stufe hoeher. Kosten je Stufe: 30 %, 60 %, 100 % des Kaufpreises (Raritaeten: Basis 300).
export function pflanzeLeveln(daten, id) {
  const d = kopie(daten);
  const p = d.spiel.gewaechshaus.pflanzen.find(x => x.id === id);
  if (!p) return fehler('Diese Pflanze gibt es nicht.');
  if (p.stufe >= 4) return fehler('Die Pflanze ist schon auf Stufe 4.');
  const preis = p.rar ? RARITAET_PREIS : (PREISE_PFLANZEN[p.typ] || {}).preis;
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
  const def = tabelle[liste[idx].typ];
  const erloes = def ? Math.floor(def.preis / 2) : 0;
  liste.splice(idx, 1);
  d.spiel.samen += erloes;
  return { daten: d };
}

// ---------- Wochenrückblick ----------

// Rückblick auf eine Woche (Montag bis Sonntag, geschnitten mit dem Zeitraum).
// Samen: gespeicherte Bewertung, sonst neu aus den Regeln (10 pro Tag im Budget, 50 Woche, Challenges).
export function wochenRueckblick(daten, wochenbeginn) {
  const zr = L.zeitraum(daten, wochenbeginn);
  const f = fenster(wochenbeginn, zr);
  const tage = tageIn(f);
  const { W, ausgegeben } = wochenWerte(daten, wochenbeginn, zr);

  const bewertetTage = new Map((daten.spiel.bewertet.tage || []).map(t => [t.datum, t.erfuellt]));
  const tageImBudget = tage.filter(t => (bewertetTage.has(t) ? bewertetTage.get(t) : L.tagErfuellt(daten, t))).length;

  const gespeicherteWoche = (daten.spiel.bewertet.wochen || []).find(w => w.start === wochenbeginn);
  const erfuellt = gespeicherteWoche ? gespeicherteWoche.erfuellt : ausgegeben <= W;

  const gespeicherte = daten.spiel.challenges[wochenbeginn];
  const erfuellteChallenges = gespeicherte
    ? gespeicherte.filter(c => c.erfuellt).map(c => challengePool.find(p => p.id === c.id)).filter(Boolean)
    : challengesDerWoche(wochenbeginn).filter(c => c.pruefe(daten, wochenbeginn, zr));
  const samenChallenges = erfuellteChallenges.reduce((s, c) => s + c.samen, 0);

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
    samen: tageImBudget * 10 + (erfuellt ? 50 : 0) + samenChallenges,
    topKategorie,
    erfuellt
  };
}
