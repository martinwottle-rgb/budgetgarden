// Bildschirm Garten (Start) nach UI.md Abschnitt 1: Tagesrest, Woche, Szene, Serie, Wochen-Challenges.
// Dazu: Pflanze, Möbel oder Deko antippen (Blatt mit Verschieben, Leveln, Drehen, Verkaufen), der Einrichten-Modus
// und die Platzwahl: nach einem Kauf im Shop (param.platzieren) oder beim Verschieben (param.verschieben).

import * as L from '../logik.js';
import { zeichneSzene, vorschau, einpassen } from '../szene.js';
import { welk, challengesDerWoche, challengeStatus, freiePlaetze, kaufen, platzieren, moebelSetzen, pflanzeLeveln, verkaufen, raritaetPflanzen, PREISE_PFLANZEN, PREISE_MOEBEL, PREISE_DEKO } from '../spiel.js';
import { PFLANZEN } from '../grafik/pflanzen.js';
import { RARITAETEN } from '../grafik/raritaeten.js';
import { MOEBEL } from '../grafik/moebel.js';
import { DEKO } from '../grafik/deko.js';
import { el, euro, muenzSvg, svgBox, balken, vorzeichen, tage, kurzDatum, zahl } from './bausteine.js';

const KEIN_PLATZ = 'Kein freier Platz, verkaufe oder verschiebe etwas';

// Einrichten-Modus: freie Plätze sind markiert, ein Objekt antippen öffnet sein Blatt. Bleibt bei Bildschirmwechseln erhalten.
let einrichtenAn = false;
// Nach einem Kauf im Shop: Blätter-Konfetti beim nächsten Zeichnen (bei einer Rarität in Gold)
let konfettiNaechstes = false;
let konfettiGold = false;

export function zeige(container, ctx, param) {
  const d = ctx.daten;
  const hd = ctx.heute;
  const h = L.heute(d, hd);
  const w = L.woche(d, hd);
  const tagNr = h.zr.tage - h.tageUebrig + 1;
  const wochenStart = L.wochenbeginn(hd);
  const wochenEnde = L.datumPlusTage(wochenStart, 6);
  const aktion = aktionAus(param);

  // Hinweisleiste oben bei Platzwahl oder Verschieben
  if (aktion) container.append(hinweisLeiste(ctx));

  // Rest heute groß, Rest Woche daneben klein
  container.append(
    el('section', { class: 'karte heute-karte' },
      el('div', { class: 'spalte' },
        el('div', { class: 'klein', text: 'Heute noch' }),
        el('div', { class: 'betrag-gross ' + vorzeichen(h.rest), text: euro(h.rest) }),
        el('div', { class: 'klein', text: `von ${euro(h.B)} · Tag ${tagNr} von ${h.zr.tage}` }),
        balken(h.ausgegeben, h.B)
      ),
      el('div', { class: 'spalte' },
        el('div', { class: 'klein', text: 'Diese Woche noch' }),
        el('div', { class: 'betrag-mittel ' + vorzeichen(w.rest), text: euro(w.rest) }),
        el('div', { class: 'klein', text: `von ${euro(w.W)}` }),
        balken(w.ausgegeben, w.W)
      )
    )
  );

  // Einrichten-Knopf über der Szene (nicht während einer Platzwahl)
  if (!aktion) container.append(einrichtenLeiste(ctx));

  // Szene: mobile Ansicht mit ausschnitt, Größe aus dem Gewächshaus
  const gh = d.spiel.gewaechshaus;
  const platz = el('div', { class: 'szene-platz' });
  const karte = el('section', { class: 'karte szene-karte ga-szene' }, platz);
  container.append(karte);
  zeichneSzene(platz, {
    ...gh,
    groesse: gh.groesse,
    welk: welk(d, hd),
    ausschnitt: true,
    markierungen: markierungenFuer(d, aktion)
  });
  platz.addEventListener('click', (e) => szeneKlick(e, ctx, aktion));
  if (konfettiNaechstes) {
    konfettiNaechstes = false;
    konfettiStarten(karte, konfettiGold);
    konfettiGold = false;
  }

  // Serie
  const serie = d.spiel.serie;
  container.append(
    el('section', { class: 'karte serie' },
      el('span', { class: 'serie-flamme', 'aria-hidden': 'true', text: '🔥' }),
      el('div', {},
        el('div', { class: 'serie-titel', text: serie > 0 ? `${tage(serie)} in Folge im Budget` : 'Noch keine Serie' }),
        el('div', { class: 'klein', text: `Bestwert: ${tage(d.spiel.besteSerie)}` })
      )
    )
  );

  // Wochen-Challenges: zwei kleine Karten
  container.append(el('div', { class: 'abschnitt', text: `Wochen-Challenges · ${kurzDatum(wochenStart)} bis ${kurzDatum(wochenEnde)}` }));
  const challenges = challengesDerWoche(wochenStart).map(c => challengeKarte(c, challengeStatus(d, c, wochenStart, hd)));
  container.append(el('div', { class: 'raster' }, challenges));
}

const ZUSTAND_TEXT = { geschafft: 'Geschafft', auf_kurs: 'Auf Kurs', gefaehrdet: 'Gefährdet', verpasst: 'Verpasst' };

// Challenge-Karte: farbige Marke für den Zustand, Fortschrittsbalken mit Text (ist von soll)
function challengeKarte(c, s) {
  const prozent = s.soll > 0 ? Math.min(100, (s.ist / s.soll) * 100) : (s.ist > 0 ? 100 : 0);
  const beloh = el('div', { class: 'klein challenge-lohn' }, svgBox(muenzSvg(16), 'muenze-klein'), ` ${zahl(c.samen)} Samen`);
  return el('section', { class: 'karte challenge sp11-karte sp11-' + s.zustand },
    el('div', { class: 'sp11-marke sp11-' + s.zustand, text: ZUSTAND_TEXT[s.zustand] }),
    el('div', { class: 'challenge-text', text: c.text }),
    beloh,
    el('div', { class: 'sp11-balken', role: 'img', 'aria-label': s.text }, el('span', { style: 'width:' + prozent.toFixed(1) + '%' })),
    el('div', { class: 'sp11-fortschritt klein', text: s.text })
  );
}

// ---------- Modus: Platzwahl (Shop), Verschieben, Einrichten ----------

// param.platzieren = {kategorie, typ} (Kauf im Shop), param.verschieben = {kategorie, id, typ}
function aktionAus(param) {
  if (param && param.platzieren) return { modus: 'platzieren', ...param.platzieren };
  if (param && param.verschieben) return { modus: 'verschieben', ...param.verschieben };
  return null;
}

function hinweisLeiste(ctx) {
  return el('section', { class: 'karte ga-hinweis', role: 'status' },
    el('span', { text: 'Tippe auf einen freien Platz' }),
    el('span', { class: 'ga-punkt', 'aria-hidden': 'true', text: '·' }),
    el('button', { type: 'button', class: 'knopf knopf-leise ga-hinweis-knopf', text: 'Abbrechen', onclick: () => ctx.navigiere('garten') })
  );
}

function einrichtenLeiste(ctx) {
  return el('div', { class: 'ga-werkzeug' },
    einrichtenAn ? el('span', { class: 'klein', text: 'Freie Plätze sind markiert. Tippe ein Objekt an.' }) : null,
    el('button', {
      type: 'button',
      class: 'knopf' + (einrichtenAn ? ' knopf-primaer' : ''),
      text: einrichtenAn ? '✓ Fertig' : '🛠️ Einrichten',
      onclick: () => {
        einrichtenAn = !einrichtenAn;
        ctx.navigiere('garten');
      }
    })
  );
}

// Markierungen für die Szene: Platzwahl und Verschieben zeigen die freien Orte des Gegenstands,
// der Einrichten-Modus zeigt alle freien Felder und Stellplätze (mit einem kleinen Pflanzen-Typ als Maßstab)
function markierungenFuer(d, aktion) {
  if (aktion) return freiePlaetze(d, aktion.kategorie, aktion.typ).map(ort => ({ ort, ok: true, typ: aktion.typ }));
  if (einrichtenAn) return freiePlaetze(d, 'pflanze', 'efeutute').map(ort => ({ ort, ok: true }));
  return [];
}

// Tippen auf eine Markierung: Platz wählen. Tippen auf ein Objekt: Blatt (nur ohne Platzwahl).
function szeneKlick(e, ctx, aktion) {
  const markierung = e.target.closest('[data-ort]');
  if (markierung) {
    if (aktion) zielGewaehlt(ctx, aktion, JSON.parse(markierung.dataset.ort));
    return;
  }
  const objekt = e.target.closest('[data-art][data-id]');
  if (objekt && !aktion) oeffneBlatt(ctx, objekt.dataset.art, objekt.dataset.id);
}

// Platz gewählt: bei Platzwahl kaufen, sonst verschieben. Danach Modus beenden und speichern.
function zielGewaehlt(ctx, aktion, ort) {
  if (aktion.modus === 'platzieren') {
    const istRaritaet = aktion.kategorie === 'raritaet';
    const r = istRaritaet
      ? raritaetPflanzen(ctx.daten, aktion.typ, ort)
      : kaufen(ctx.daten, aktion.kategorie, aktion.typ, ort);
    if (r.fehler) return ctx.toast(r.fehler);
    ctx.navigiere('garten');  // Platzwahl beenden, bevor gespeichert und neu gezeichnet wird
    konfettiNaechstes = true;
    konfettiGold = istRaritaet;
    return ctx.speichern(r.daten);
  }
  const r = aktion.kategorie === 'moebel'
    ? moebelSetzen(ctx.daten, aktion.id, ort.gx, ort.gy, ort.drehung)
    : platzieren(ctx.daten, aktion.kategorie, aktion.id, ort);
  if (r.fehler) return ctx.toast(r.fehler);
  ctx.navigiere('garten');
  return ctx.speichern(r.daten);
}

// Verschieben starten: nur, wenn es einen freien Ort gibt
function verschiebenStarten(ctx, kategorie, typ, id, schliessen) {
  if (!freiePlaetze(ctx.daten, kategorie, typ).length) return ctx.toast(KEIN_PLATZ);
  schliessen();
  ctx.navigiere('garten', { verschieben: { kategorie, id, typ } });
}

// ---------- Blätter (Bottom Sheets) ----------

function oeffneBlatt(ctx, art, id) {
  const gh = ctx.daten.spiel.gewaechshaus;
  if (art === 'pflanze') {
    const p = gh.pflanzen.find(x => x.id === id);
    if (p) pflanzenBlatt(ctx, p);
  } else if (art === 'moebel') {
    const m = gh.moebel.find(x => x.id === id);
    if (m) moebelBlatt(ctx, m);
  } else if (art === 'deko') {
    const o = gh.deko.find(x => x.id === id);
    if (o) dekoBlatt(ctx, o);
  }
}

// Blatt öffnen und die Vorschau nach dem Einhängen einpassen
function blattOeffnen(ctx, inhalt) {
  const blatt = ctx.sheet(inhalt);
  einpassen(blatt.element);
  return blatt;
}

// Kosten für die nächste Stufe, über die echte Logik ermittelt (null, wenn nicht möglich, z. B. Stufe 4)
function levelKosten(daten, id) {
  const probe = pflanzeLeveln({ ...daten, spiel: { ...daten.spiel, samen: 1e9 } }, id);
  return probe.fehler ? null : 1e9 - probe.daten.spiel.samen;
}

// Verkaufsbereich: Knopf mit Erlös und Rückfrage, oder ein deaktivierter Knopf mit Grund
function verkaufBereich(ctx, kategorie, id, name, schliessen) {
  const probe = verkaufen(ctx.daten, kategorie, id);
  if (probe.fehler) {
    return [
      el('button', { type: 'button', class: 'knopf knopf-voll', text: 'Verkaufen', disabled: true }),
      el('p', { class: 'ga-grund', text: probe.fehler })
    ];
  }
  const erloes = probe.daten.spiel.samen - ctx.daten.spiel.samen;
  const knopf = el('button', {
    type: 'button',
    class: 'knopf knopf-voll',
    text: `Verkaufen für ${zahl(erloes)} Samen`,
    onclick: async () => {
      const wahl = await ctx.dialog({
        titel: 'Verkaufen?',
        text: `${name} für ${zahl(erloes)} Samen verkaufen?`,
        knoepfe: [
          { text: 'Verkaufen', art: 'gefahr', wert: true },
          { text: 'Behalten', art: 'leise' }
        ]
      });
      if (wahl !== true) return;
      const r = verkaufen(ctx.daten, kategorie, id);
      if (r.fehler) return ctx.toast(r.fehler);
      schliessen();
      ctx.speichern(r.daten);
    }
  });
  return [knopf];
}

function pflanzenBlatt(ctx, p) {
  const d = ctx.daten;
  const def = p.rar ? RARITAETEN[p.typ] : PFLANZEN[p.typ];
  const name = def ? def.name : (PREISE_PFLANZEN[p.typ] ? PREISE_PFLANZEN[p.typ].name : p.typ);
  const kosten = p.stufe >= 4 ? null : levelKosten(d, p.id);
  const zuWenig = kosten !== null && d.spiel.samen < kosten;
  let blatt = null;
  const schliessen = () => { if (blatt) blatt.schliessen(); };

  const levelKnopf = el('button', {
    type: 'button',
    class: 'knopf knopf-primaer knopf-voll',
    text: kosten === null ? 'Schon auf Stufe 4' : `Leveln auf Stufe ${p.stufe + 1} für ${zahl(kosten)} Samen`,
    disabled: kosten === null || zuWenig,
    onclick: () => {
      const r = pflanzeLeveln(ctx.daten, p.id);
      if (r.fehler) return ctx.toast(r.fehler);
      schliessen();
      ctx.speichern(r.daten);
    }
  });

  const inhalt = el('div', {},
    el('h2', { class: 'ga-titel', text: name }),
    p.rar ? el('div', { class: 'ra-marke', text: 'Rarität' }) : null,
    el('div', { class: 'ga-sterne', 'aria-hidden': 'true', text: '★'.repeat(p.stufe) + '☆'.repeat(4 - p.stufe) }),
    el('div', { class: 'klein', text: `Stufe ${p.stufe} von 4` }),
    def ? vorschau(def.zeichne(p.stufe, false, 'boden'), 'ga-vorschau') : null,
    el('div', { class: 'aktionen' },
      levelKnopf,
      p.stufe >= 4 ? el('p', { class: 'ga-grund', text: 'Die Pflanze ist schon auf Stufe 4.' }) : null,
      zuWenig ? el('p', { class: 'ga-grund', text: `Dafür fehlen ${zahl(kosten - d.spiel.samen)} Samen.` }) : null,
      el('button', {
        type: 'button',
        class: 'knopf knopf-voll',
        text: 'Verschieben',
        onclick: () => verschiebenStarten(ctx, 'pflanze', p.typ, p.id, schliessen)
      }),
      // Raritäten lassen sich nicht verkaufen: kein Verkaufen-Knopf
      ...(p.rar ? [] : verkaufBereich(ctx, 'pflanze', p.id, name, schliessen))
    )
  );
  blatt = blattOeffnen(ctx, inhalt);
}

function moebelBlatt(ctx, m) {
  const def = MOEBEL[m.typ];
  const name = def ? def.name : (PREISE_MOEBEL[m.typ] ? PREISE_MOEBEL[m.typ].name : m.typ);
  const breite = def ? def.breite : 1;
  const tiefe = def ? def.tiefe : 1;
  const [w, h] = m.drehung === 90 ? [tiefe, breite] : [breite, tiefe];
  const plaetze = def ? def.plaetze.length : 0;
  const neueDrehung = m.drehung === 90 ? 0 : 90;
  let blatt = null;
  const schliessen = () => { if (blatt) blatt.schliessen(); };

  const inhalt = el('div', {},
    el('h2', { class: 'ga-titel', text: name }),
    def ? vorschau(def.zeichne(2, 2, m.drehung), 'ga-vorschau') : null,
    el('p', { class: 'klein', text: `Belegt ${w} × ${h} Felder · ${plaetze} Stellplätze für Pflanzen` }),
    el('div', { class: 'aktionen' },
      el('button', {
        type: 'button',
        class: 'knopf knopf-voll',
        text: 'Verschieben',
        onclick: () => verschiebenStarten(ctx, 'moebel', m.typ, m.id, schliessen)
      }),
      el('button', {
        type: 'button',
        class: 'knopf knopf-voll',
        text: neueDrehung === 90 ? 'Auf 90° drehen' : 'Zurück auf 0° drehen',
        onclick: () => {
          const r = moebelSetzen(ctx.daten, m.id, m.gx, m.gy, neueDrehung);
          if (r.fehler) return ctx.toast(r.fehler);
          schliessen();
          ctx.speichern(r.daten);
        }
      }),
      ...verkaufBereich(ctx, 'moebel', m.id, name, schliessen)
    )
  );
  blatt = blattOeffnen(ctx, inhalt);
}

function dekoBlatt(ctx, o) {
  const def = DEKO[o.typ];
  const name = def ? def.name : (PREISE_DEKO[o.typ] ? PREISE_DEKO[o.typ].name : o.typ);
  let blatt = null;
  const schliessen = () => { if (blatt) blatt.schliessen(); };

  const inhalt = el('div', {},
    el('h2', { class: 'ga-titel', text: name }),
    def ? vorschau(def.zeichne(), 'ga-vorschau') : null,
    el('div', { class: 'aktionen' },
      el('button', {
        type: 'button',
        class: 'knopf knopf-voll',
        text: 'Verschieben',
        onclick: () => verschiebenStarten(ctx, 'deko', o.typ, o.id, schliessen)
      }),
      ...verkaufBereich(ctx, 'deko', o.id, name, schliessen)
    )
  );
  blatt = blattOeffnen(ctx, inhalt);
}

// ---------- Konfetti ----------

// 20 kleine grüne Blätter fallen über die Szene, danach werden sie entfernt. gold: goldene Blätter (Rarität).
function konfettiStarten(wurzel, gold = false) {
  const schicht = el('div', { class: 'ga-konfetti', 'aria-hidden': 'true' });
  for (let i = 0; i < 20; i++) {
    const links = (8 + Math.random() * 84).toFixed(1);
    const dx = Math.round(Math.random() * 120 - 60);
    const rot = Math.round(Math.random() * 540 - 270);
    const verzoegerung = (Math.random() * 0.35).toFixed(2);
    schicht.append(el('span', {
      class: gold ? 'ga-blatt ra-blatt' : 'ga-blatt',
      style: `left:${links}%;--ga-dx:${dx}px;--ga-rot:${rot}deg;animation-delay:${verzoegerung}s`
    }));
  }
  wurzel.append(schicht);
  setTimeout(() => schicht.remove(), 2200);
}
