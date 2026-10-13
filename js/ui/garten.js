// Bildschirm Garten (Start) nach UI.md Abschnitt 1: Tagesrest, Woche, Szene, Serie, Wochen-Challenges.
// Dazu: Pflanze, Möbel oder Deko antippen (Blatt mit Verschieben, Leveln, Drehen, Verkaufen), der Bewegungsmodus
// (lange drücken, Objekte ziehen und drehen, wie auf dem iPhone-Home-Bildschirm) und die Platzwahl nach einem Kauf
// im Shop (param.platzieren).

import * as L from '../logik.js';
import { zeichneSzene, vorschau, einpassen, feldAusPunkt, punktAusOrt, FELD_PX } from '../szene.js';
import { iso } from '../grafik/hilfen.js';
import { welk, challengesDerWoche, challengeStatus, freiePlaetze, kaufen, platzieren, moebelSetzen, pflanzeLeveln, verkaufen, raritaetPflanzen, PREISE_PFLANZEN, PREISE_MOEBEL, PREISE_DEKO } from '../spiel.js';
import { PFLANZEN } from '../grafik/pflanzen.js';
import { RARITAETEN } from '../grafik/raritaeten.js';
import { MOEBEL } from '../grafik/moebel.js';
import { DEKO } from '../grafik/deko.js';
import { el, euro, muenzSvg, svgBox, balken, vorzeichen, tage, kurzDatum, zahl } from './bausteine.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
// Bewegungsmodus: Zeit bis zum Start (ms), Abstand (px) ab dem eine Bewegung als Ziehen gilt, Dauer des Zurückgleitens (ms)
const LANG_DRUCK = 500;
const SCHWELLE = 8;
const GLEITZEIT = 200;
// Anheben beim Ziehen, Farben der Vorschau
const LUPE = 1.06;
const FARBE_GUT = '#6fae6a';
const FARBE_SCHLECHT = '#d9625a';

// Bewegungsmodus und zuletzt angefasstes Objekt bleiben bei Bildschirmwechseln erhalten
let bewegen = false;
let gewaehlt = null;   // {art, id}
// Laufende Geste: Langdruck (Modus aus) oder Ziehen und Tippen (Modus an). Wird beim Loslassen beendet.
let zug = null;
// Zurückgleiten läuft gerade (neue Gesten sind dann gesperrt)
let gleitet = false;
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
  // Platzwahl nach dem Kauf schließt den Bewegungsmodus aus
  if (aktion) { bewegen = false; gewaehlt = null; }

  // Hinweisleiste oben bei Platzwahl
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

  // Einrichten-Knopf über der Szene (nicht während einer Platzwahl oder im Bewegungsmodus)
  if (!aktion && !bewegen) container.append(einrichtenLeiste(ctx));

  // Szene: mobile Ansicht mit ausschnitt, Größe aus dem Gewächshaus
  const gh = d.spiel.gewaechshaus;
  const platz = el('div', { class: 'szene-platz zi12-platz' });
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
  // Im Bewegungsmodus gehört jeder Klick den Zeigerereignissen, nicht dem Blatt
  platz.addEventListener('click', (e) => { if (bewegen) { e.stopPropagation(); e.preventDefault(); } }, true);
  platz.addEventListener('pointerdown', (e) => zeigerRunter(e, ctx, platz, aktion));
  platz.addEventListener('contextmenu', (e) => e.preventDefault());
  if (bewegen) bewegungsAufbau(ctx, container, karte, platz);
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
  const challenges = challengesDerWoche(wochenStart, d).map(c => challengeKarte(c, challengeStatus(d, c, wochenStart, hd)));
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

// ---------- Modus: Platzwahl (Shop) und Bewegungsmodus ----------

// param.platzieren = {kategorie, typ} (Kauf im Shop)
function aktionAus(param) {
  if (param && param.platzieren) return { ...param.platzieren };
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
  return el('div', { class: 'ga-werkzeug zi12-einrichten' },
    el('button', {
      type: 'button',
      class: 'knopf',
      text: '🛠️ Einrichten',
      onclick: () => { bewegen = true; gewaehlt = null; neuZeichnen(ctx); }
    })
  );
}

// Oben im Bewegungsmodus: Hinweis und Fertig
function bewegungsLeiste(ctx) {
  return el('section', { class: 'karte zi12-leiste', role: 'status' },
    el('span', { text: 'Bewegungsmodus · Ziehen zum Verschieben' }),
    el('button', { type: 'button', class: 'knopf knopf-primaer zi12-fertig', text: 'Fertig', onclick: () => beendeBewegen(ctx) })
  );
}

// Markierungen nur bei der Platzwahl nach einem Kauf
function markierungenFuer(d, aktion) {
  if (!aktion) return [];
  return freiePlaetze(d, aktion.kategorie, aktion.typ).map(ort => ({ ort, ok: true, typ: aktion.typ }));
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

// Platz gewählt: kaufen. Danach Platzwahl beenden und speichern.
function zielGewaehlt(ctx, aktion, ort) {
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

// Aus dem Blatt: Blatt schließen und den Bewegungsmodus mit diesem Objekt ausgewählt starten
function verschiebenStarten(ctx, kategorie, id, schliessen) {
  schliessen();
  bewegen = true;
  gewaehlt = { art: kategorie, id };
  neuZeichnen(ctx);
}

// Bildschirm neu zeichnen, die Scroll-Position bleibt erhalten
function neuZeichnen(ctx) {
  const y = window.scrollY;
  ctx.navigiere('garten');
  window.scrollTo(0, y);
}

function beendeBewegen(ctx) {
  zugBeenden();
  bewegen = false;
  gewaehlt = null;
  neuZeichnen(ctx);
}

// Bewegungsmodus einrichten (auch beim Langdruck, ohne neu zu zeichnen): Leiste oben, Wackeln, Hervorhebung, Dreh-Knopf.
// Idempotent: entfernt vorher, was es selbst angelegt hat.
function bewegungsAufbau(ctx, container, karte, platz) {
  const gh = ctx.daten.spiel.gewaechshaus;
  container.querySelectorAll('.zi12-leiste').forEach(e => e.remove());
  // Einrichten-Knopf nur unsichtbar machen, nicht entfernen: sonst springt die Szene unter dem Finger
  container.querySelectorAll('.zi12-einrichten').forEach(e => { e.style.visibility = 'hidden'; });
  karte.querySelectorAll('.zi12-dreh').forEach(e => e.remove());
  container.prepend(bewegungsLeiste(ctx));
  platz.classList.add('zi12-bewegen');
  const svg = platz.querySelector('svg');
  if (!svg) return;
  // Nur äußerste Objekte wackeln; Pflanzen auf einem Möbel wackeln mit dem Möbel
  const ziele = [...svg.querySelectorAll('[data-art][data-id]')].filter(g => !g.parentElement.closest('[data-id]'));
  ziele.forEach((g, i) => {
    if (g.querySelector(':scope > .zi12-kippen')) return;
    const huelle = svgNeu('g', { class: 'zi12-kippen', style: `animation-delay:${(-((i * 0.07) % 0.28)).toFixed(2)}s` });
    while (g.firstChild) huelle.append(g.firstChild);
    g.append(huelle);
  });
  svg.querySelectorAll('.zi12-gewaehlt').forEach(g => g.classList.remove('zi12-gewaehlt'));
  if (gewaehlt) {
    const g = gruppeVon(svg, gewaehlt.art, gewaehlt.id);
    if (g) g.classList.add('zi12-gewaehlt');
    if (g && gewaehlt.art === 'moebel') {
      const m = gh.moebel.find(x => x.id === gewaehlt.id);
      if (m) karte.append(drehKnopf(ctx, m, svg, karte));
    }
  }
}

// Runder Knopf über dem Möbel: dreht 0 und 90 Grad
function drehKnopf(ctx, m, svg, karte) {
  const def = MOEBEL[m.typ];
  const breite = def ? def.breite : 1;
  const tiefe = def ? def.tiefe : 1;
  const [w, h] = m.drehung === 90 ? [tiefe, breite] : [breite, tiefe];
  const p = iso(m.gx + w / 2, m.gy + h / 2, 110);
  const pt = svg.createSVGPoint();
  pt.x = p[0];
  pt.y = p[1];
  const s = pt.matrixTransform(svg.getScreenCTM());
  const kr = karte.getBoundingClientRect();
  const neue = m.drehung === 90 ? 0 : 90;
  const knopf = el('button', {
    type: 'button',
    class: 'zi12-dreh',
    'aria-label': neue === 90 ? 'Auf 90 Grad drehen' : 'Zurück auf 0 Grad drehen',
    text: '⟳',
    onclick: () => {
      const r = moebelSetzen(ctx.daten, m.id, m.gx, m.gy, neue);
      if (r.fehler) return ctx.toast(r.fehler);
      ctx.speichern(r.daten);
    }
  });
  knopf.style.left = `${s.x - kr.left}px`;
  knopf.style.top = `${s.y - kr.top}px`;
  return knopf;
}

// ---------- Bewegungsmodus: Zeiger ----------

function svgNeu(tag, attr) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attr || {})) e.setAttribute(k, v);
  return e;
}

// Bildschirmpunkt (Client-Koordinaten) in SVG-Einheiten
function punktIm(svg, x, y) {
  const pt = svg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

// Objekt unter dem Zeiger: {art, id, el} oder null
function objektVon(e) {
  const g = e.target instanceof Element ? e.target.closest('[data-art][data-id]') : null;
  return g ? { art: g.dataset.art, id: g.dataset.id, el: g } : null;
}

function gruppeVon(svg, art, id) {
  return [...svg.querySelectorAll('[data-art][data-id]')].find(g => g.dataset.art === art && g.dataset.id === id) || null;
}

function objektDaten(gh, art, id) {
  const liste = art === 'moebel' ? gh.moebel : art === 'pflanze' ? gh.pflanzen : gh.deko;
  return liste.find(x => x.id === id) || null;
}

// Zeigerdruck auf der Szene: Langdruck auf ein Objekt (Modus aus) oder Ziehen und Tippen (Modus an)
function zeigerRunter(e, ctx, platz, aktion) {
  if (gleitet || zug || aktion) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const svg = platz.querySelector('svg');
  if (!svg) return;
  const obj = objektVon(e);
  if (!bewegen && !obj) return;
  const p = punktIm(svg, e.clientX, e.clientY);
  const z = {
    pid: e.pointerId, cx: e.clientX, cy: e.clientY, p0: [p.x, p.y], obj,
    modus: bewegen ? 'bewegen' : 'druck', bewegt: false, drag: false, timer: null, teile: null, platz, svg
  };
  z.move = (ev) => zeigerBewegt(ev, ctx, z);
  z.up = (ev) => zeigerHoch(ev, ctx, z);
  z.abbruch = (ev) => zeigerAbbruch(ev, ctx, z);
  // iOS: Sobald gezogen wird, darf Safari die Seite nicht scrollen (sonst kommt pointercancel).
  // Vor dem Langdruck bleibt Scrollen erlaubt.
  z.touch = (ev) => { if (zug === z && z.modus === 'bewegen') ev.preventDefault(); };
  window.addEventListener('touchmove', z.touch, { passive: false });
  zug = z;
  window.addEventListener('pointermove', z.move);
  window.addEventListener('pointerup', z.up);
  window.addEventListener('pointercancel', z.abbruch);
  if (!bewegen) {
    z.timer = setTimeout(() => langDruckFertig(ctx, z), LANG_DRUCK);
  } else if (obj) {
    z.drag = vorbereiten(ctx, z);
  }
}

function zugBeenden() {
  if (!zug) return null;
  const z = zug;
  zug = null;
  clearTimeout(z.timer);
  window.removeEventListener('pointermove', z.move);
  window.removeEventListener('pointerup', z.up);
  window.removeEventListener('pointercancel', z.abbruch);
  window.removeEventListener('touchmove', z.touch, { passive: false });
  return z;
}

// Nach 500 ms ohne Bewegung: Bewegungsmodus an, das Objekt ist sofort ziehbar
function langDruckFertig(ctx, z) {
  if (zug !== z || z.modus !== 'druck') return;
  z.timer = null;
  z.modus = 'bewegen';
  bewegen = true;
  gewaehlt = { art: z.obj.art, id: z.obj.id };
  const karte = z.platz.parentElement;
  bewegungsAufbau(ctx, karte.parentElement, karte, z.platz);
  // Die Leiste oben verschiebt die Szene: den Griffpunkt am neuen Stand neu bestimmen
  const p = punktIm(z.svg, z.cx, z.cy);
  z.p0 = [p.x, p.y];
  z.drag = vorbereiten(ctx, z);
}

function zeigerBewegt(ev, ctx, z) {
  if (ev.pointerId !== z.pid) return;
  const dist = Math.hypot(ev.clientX - z.cx, ev.clientY - z.cy);
  if (z.modus === 'druck') {
    // Bewegung vor Ablauf der Zeit: kein Langdruck (Scrollen bleibt möglich)
    if (dist > SCHWELLE) zugBeenden();
    return;
  }
  if (!z.drag) return;
  if (!z.bewegt) {
    if (dist <= SCHWELLE) return;
    z.bewegt = true;
    liften(z);
  }
  const p = punktIm(z.svg, ev.clientX, ev.clientY);
  z.d = [p.x - z.p0[0], p.y - z.p0[1]];
  versatzSetzen(z);
  zielBestimmen(ctx, z);
}

function zeigerHoch(ev, ctx, z) {
  if (ev.pointerId !== z.pid) return;
  const weit = Math.hypot(ev.clientX - z.cx, ev.clientY - z.cy) > SCHWELLE;
  zugBeenden();
  // Antippen ohne Modus: der Klick öffnet das Blatt
  if (z.modus === 'druck') return;
  // Tipp ins Leere beendet den Modus
  if (!z.obj) {
    if (!weit) beendeBewegen(ctx);
    return;
  }
  if (!z.drag) return;
  if (!z.bewegt) {
    gewaehlt = { art: z.obj.art, id: z.obj.id };
    neuZeichnen(ctx);
    return;
  }
  ablegen(ctx, z);
}

function zeigerAbbruch(ev, ctx, z) {
  if (ev.pointerId !== z.pid) return;
  zugBeenden();
  if (z.teile && z.bewegt) zurueckGleiten(ctx, z, null);
  else if (z.teile) wiederherstellen(z);
}

// Ziel-Daten für das gezogene Objekt: Ursprung, Kandidaten, Vorschau-Ebene. Gibt false bei fehlendem Objekt zurück.
function vorbereiten(ctx, z) {
  const gh = ctx.daten.spiel.gewaechshaus;
  const dat = objektDaten(gh, z.obj.art, z.obj.id);
  if (!dat) return false;
  z.dat = dat;
  z.teile = [];
  z.d = [0, 0];
  const teil = (elem, a0, lupe) => ({ el: elem, orig: elem.getAttribute('transform') || '', a0, lupe });
  if (z.obj.art === 'moebel') {
    const a0 = punktAusOrt({ gx: dat.gx, gy: dat.gy, drehung: dat.drehung, typ: dat.typ }, gh);
    z.teile.push(teil(z.obj.el, a0, true));
    // Pflanzen und Deko auf dem Möbel: liegen sie außerhalb der Gruppe (Lichter), werden sie mit verschoben
    for (const k of z.svg.querySelectorAll(`[data-auf="${dat.id}"]`)) {
      if (!k.closest('g[data-art="moebel"]')) z.teile.push(teil(k, null, false));
    }
    const f0 = feldAusPunkt(z.p0[0], z.p0[1], gh);
    z.versatzF = { gx: f0.gx - dat.gx, gy: f0.gy - dat.gy };
    z.letzt = { gx: dat.gx, gy: dat.gy };
    z.ziel = { gx: dat.gx, gy: dat.gy };
    z.fehler = null;
  } else {
    const a0 = punktAusOrt(dat.ort, gh);
    if (!a0) return false;
    z.a0 = a0;
    z.teile.push(teil(z.obj.el, a0, true));
    // Kandidaten: freie Orte, der eigene Platz zählt als frei
    const kat = z.obj.art === 'deko' ? 'deko' : 'pflanze';
    const liste = freiePlaetze(ctx.daten, kat, dat.typ);
    liste.push(dat.ort);
    const gesehen = new Set();
    z.kand = [];
    for (const o of liste) {
      const schluessel = JSON.stringify(o);
      if (gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      const p = punktAusOrt(o, gh);
      if (p) z.kand.push({ ort: o, p });
    }
    z.ziel = dat.ort;
    z.fehler = null;
  }
  // Vorschau über dem Boden: eine Raute für Felder und Grundflächen, ein Kreis für Stellplätze und Haken
  z.vor = { raute: svgNeu('polygon', { 'pointer-events': 'none' }), kreis: svgNeu('circle', { 'pointer-events': 'none' }) };
  z.vor.raute.style.display = 'none';
  z.vor.kreis.style.display = 'none';
  z.svg.append(z.vor.raute, z.vor.kreis);
  return true;
}

// Gezogenes Objekt hebt sich: kein Wackeln, Schatten (per CSS-Klasse), Dreh-Knopf aus
function liften(z) {
  z.obj.el.classList.add('zi12-zieht');
  z.platz.parentElement.querySelectorAll('.zi12-dreh').forEach(b => { b.hidden = true; });
}

// Verschiebung auf alle Teile anwenden: Objekt (mit Anheben um die Mitte) und mitgeführte Teile in SVG-Einheiten
function versatzSetzen(z) {
  const [dx, dy] = z.d;
  const n = (v) => v.toFixed(2);
  for (const t of z.teile) {
    if (t.a0) {
      const [ax, ay] = t.a0;
      const s = t.lupe && z.bewegt ? LUPE : 1;
      t.el.setAttribute('transform', `translate(${n(ax + dx)},${n(ay + dy)}) scale(${s}) translate(${n(-ax)},${n(-ay)}) ${t.orig}`.trim());
    } else {
      t.el.setAttribute('transform', `translate(${n(dx)},${n(dy)}) ${t.orig}`.trim());
    }
  }
}

// Vorschau und Ziel nach der Verschiebung bestimmen
function zielBestimmen(ctx, z) {
  const gh = ctx.daten.spiel.gewaechshaus;
  const dat = z.dat;
  if (z.obj.art === 'moebel') {
    const fe = feldAusPunkt(z.p0[0] + z.d[0], z.p0[1] + z.d[1], gh);
    const gx = Math.round(fe.gx - z.versatzF.gx);
    const gy = Math.round(fe.gy - z.versatzF.gy);
    // Gültigkeit nur bei Feldwechsel neu prüfen
    if (gx !== z.letzt.gx || gy !== z.letzt.gy) {
      z.letzt = { gx, gy };
      const r = moebelSetzen(ctx.daten, dat.id, gx, gy, dat.drehung);
      z.ziel = r.fehler ? null : { gx, gy };
      z.fehler = r.fehler || null;
    }
    const def = MOEBEL[dat.typ];
    const breite = def ? def.breite : 1;
    const tiefe = def ? def.tiefe : 1;
    const [w, h] = dat.drehung === 90 ? [tiefe, breite] : [breite, tiefe];
    const ecken = [iso(gx, gy), iso(gx + w, gy), iso(gx + w, gy + h), iso(gx, gy + h)];
    vorschauSetzen(z, ecken, null, z.ziel !== null);
    return;
  }
  // Pflanze oder Deko: nächster Kandidat innerhalb von 0.9 Feldbreiten (inkl. Stellplatz-Höhe)
  const anker = [z.a0[0] + z.d[0], z.a0[1] + z.d[1]];
  let bestKand = null;
  let bestDist = Infinity;
  for (const k of z.kand) {
    const dd = Math.hypot(k.p[0] - anker[0], k.p[1] - anker[1]);
    if (dd < bestDist) { bestDist = dd; bestKand = k; }
  }
  if (bestKand && bestDist <= 0.9 * FELD_PX) {
    z.ziel = bestKand.ort;
    z.fehler = null;
    const o = bestKand.ort;
    if (Array.isArray(o.feld)) {
      const [gx, gy] = o.feld;
      vorschauSetzen(z, [iso(gx, gy), iso(gx + 1, gy), iso(gx + 1, gy + 1), iso(gx, gy + 1)], null, true);
    } else {
      vorschauSetzen(z, null, bestKand.p, true);
    }
  } else {
    z.ziel = null;
    z.fehler = DEKO[dat.typ] && DEKO[dat.typ].haengend
      ? 'Die Hängeampel passt nur an einen freien Haken.'
      : 'Hier ist kein freier Platz.';
    vorschauSetzen(z, null, anker, false);
  }
}

// Vorschau: Raute (Polygon) oder Kreis (Mittelpunkt), grün gültig, rot ungültig
function vorschauSetzen(z, ecken, mitte, gut) {
  const farbe = gut ? FARBE_GUT : FARBE_SCHLECHT;
  const r = z.vor.raute;
  const k = z.vor.kreis;
  for (const e of [r, k]) {
    e.setAttribute('fill', farbe);
    e.setAttribute('fill-opacity', '0.25');
    e.setAttribute('stroke', farbe);
    e.setAttribute('stroke-width', '1.6');
  }
  if (ecken) {
    r.setAttribute('points', ecken.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' '));
    r.style.display = '';
  } else {
    r.style.display = 'none';
  }
  if (mitte) {
    k.setAttribute('cx', mitte[0].toFixed(1));
    k.setAttribute('cy', mitte[1].toFixed(1));
    k.setAttribute('r', '12');
    k.style.display = '';
  } else {
    k.style.display = 'none';
  }
}

// Loslassen: gültig speichern (Modus bleibt aktiv), ungültig zurückgleiten lassen und den Fehler melden
function ablegen(ctx, z) {
  const dat = z.dat;
  gewaehlt = { art: z.obj.art, id: z.obj.id };
  if (z.obj.art === 'moebel') {
    if (!z.ziel) return zurueckGleiten(ctx, z, z.fehler || 'Das Möbel passt hier nicht.');
    const { gx, gy } = z.ziel;
    if (gx === dat.gx && gy === dat.gy) return neuZeichnen(ctx);
    const r = moebelSetzen(ctx.daten, dat.id, gx, gy, dat.drehung);
    if (r.fehler) return zurueckGleiten(ctx, z, r.fehler);
    return ctx.speichern(r.daten);
  }
  if (!z.ziel) return zurueckGleiten(ctx, z, z.fehler);
  if (JSON.stringify(z.ziel) === JSON.stringify(dat.ort)) return neuZeichnen(ctx);
  const kat = z.obj.art === 'deko' ? 'deko' : 'pflanze';
  const r = platzieren(ctx.daten, kat, dat.id, z.ziel);
  if (r.fehler) return zurueckGleiten(ctx, z, r.fehler);
  return ctx.speichern(r.daten);
}

// Zurückgleiten in 200 ms auf den alten Platz, danach Toast mit dem Fehlertext
function zurueckGleiten(ctx, z, text) {
  if (text) ctx.toast(text);
  if (!z.teile) return neuZeichnen(ctx);
  gleitet = true;
  const [x0, y0] = z.d;
  const t0 = performance.now();
  const schritt = (jetzt) => {
    const f = Math.min(1, (jetzt - t0) / GLEITZEIT);
    z.d = [x0 * (1 - f), y0 * (1 - f)];
    versatzSetzen(z);
    if (f < 1) {
      requestAnimationFrame(schritt);
    } else {
      wiederherstellen(z);
      gleitet = false;
    }
  };
  requestAnimationFrame(schritt);
}

// Ursprüngliche Attribute und Klassen zurücksetzen, Vorschau entfernen
function wiederherstellen(z) {
  for (const t of z.teile) {
    if (t.orig) t.el.setAttribute('transform', t.orig);
    else t.el.removeAttribute('transform');
  }
  z.obj.el.classList.remove('zi12-zieht');
  z.platz.parentElement.querySelectorAll('.zi12-dreh').forEach(b => { b.hidden = false; });
  if (z.vor) {
    z.vor.raute.remove();
    z.vor.kreis.remove();
  }
  z.teile = null;
}

// ---------- Blätter (Bottom Sheets) ----------
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
        onclick: () => verschiebenStarten(ctx, 'pflanze', p.id, schliessen)
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
        onclick: () => verschiebenStarten(ctx, 'moebel', m.id, schliessen)
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
        onclick: () => verschiebenStarten(ctx, 'deko', o.id, schliessen)
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
