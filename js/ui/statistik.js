// Reiter Statistik der Übersicht: Kennzahlen und Diagramme. Jedes Diagramm ist ein eigenes SVG (responsiv per viewBox).
// Zahlen kommen aus logik.js, spiel.js und den Daten, hier wird nur gerechnet, sortiert und gezeichnet.

import * as L from '../logik.js';
import { el, euro, kategorieVon, kurzDatum, langDatum, tage, zahl } from './bausteine.js';
import { levelAus, ABZEICHEN } from '../spiel.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GRUEN = '#6fae6a';
const KORALLE = '#e88a7a';
const BRAUN = '#6b4a3a';
const MINT = '#a9d3a5';
const NEUTRAL = '#c4ab98';
// Pastelltöne für Kategorien, nach der Reihenfolge in den Daten. Dieselbe Farbe in allen Diagrammen.
const PASTELL = ['#e88a7a', '#f2c14e', '#8fc9a0', '#9ec3e6', '#c9a7e0', '#f0b48a', '#7fc8c0', '#d9c08a', '#b9a3d9', '#f29bb5', '#a9d3a5', '#e3d3b8'];
const WOCHENTAG_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WOCHENTAG_LANG = ['montags', 'dienstags', 'mittwochs', 'donnerstags', 'freitags', 'samstags', 'sonntags'];
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MIN_TAGE = 7; // ab so vielen Tagen mit Einträgen zeigen die Verlaufs-Karten ihre Diagramme

// ---------- Hilfen ----------

// SVG-Element mit Attributen und Kindern. Nutzerdaten nur als Text, nie als Markup.
function svg(tag, attr = {}, ...kinder) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attr)) {
    if (v !== null && v !== undefined && v !== false) e.setAttribute(k, String(v));
  }
  for (const kind of kinder.flat()) {
    if (kind === null || kind === undefined || kind === false) continue;
    e.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return e;
}

// Ein Element antippbar machen: zeigt den Text in der Info-Zeile der Karte
function antippen(node, info, text) {
  node.classList.add('st12-tippbar');
  node.setAttribute('role', 'button');
  node.setAttribute('tabindex', '0');
  const zeige = () => { info.textContent = text; };
  node.addEventListener('click', zeige);
  node.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zeige(); }
  });
  return node;
}

function infoZeile(text) {
  return el('div', { class: 'st12-info klein', 'aria-live': 'polite', text });
}

function prozent(anteil) {
  const p = Math.round(anteil * 100);
  return (p < 0 ? '−' : '') + Math.abs(p) + ' %';
}

// Ganze Euro (Cent in), für Achsen und Werte an Balken
function ganz(cent) {
  return zahl(Math.round(cent / 100));
}

// Skalenstufe: 1, 2 oder 5 mal Zehnerpotenz, passend zu v (Cent)
function niceStufe(v) {
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / mag;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
}

// 2 bis 3 Hilfslinien unter dem Höchstwert hoch (Cent)
function hilfslinien(hoch) {
  const zaehle = (s) => {
    const r = [];
    for (let k = 1; k * s <= hoch && r.length < 3; k++) r.push(k * s);
    return r;
  };
  const werte = zaehle(niceStufe(hoch / 3));
  return werte.length >= 2 ? werte : zaehle(niceStufe(hoch / 3) / 2);
}

// Farbe einer Kategorie, konsistent über alle Diagramme (Position in den Kategorien der Daten)
function farbe(d, id) {
  const i = (d.kategorien || []).findIndex(k => k.id === id);
  return i >= 0 ? PASTELL[i % PASTELL.length] : NEUTRAL;
}

function datumLang(iso) {
  const [j, m, t] = iso.split('-');
  return t + '.' + m + '.' + j;
}

function abschnitt(text) {
  return el('div', { class: 'abschnitt', text });
}

function karte(titel, erklaerung, ...inhalt) {
  return el('section', { class: 'karte st12-karte' },
    el('h2', { class: 'st12-titel', text: titel }),
    el('p', { class: 'klein st12-erklaer', text: erklaerung }),
    ...inhalt.flat(Infinity)
  );
}

function leer(text) {
  return el('p', { class: 'st12-leer', text });
}

// Ab 7 Tagen mit Einträgen: sonst freundlicher Hinweis statt eines leeren Diagramms
function zuWenig(zweck) {
  return `Ab 7 Tagen mit Einträgen siehst du hier ${zweck}.`;
}

// ---------- Einstieg ----------

export function zeige(container, ctx) {
  const d = ctx.daten;
  const heute = ctx.heute;
  const st = (d.einstellungen && d.einstellungen.startDatum) || heute;
  const zr = L.zeitraum(d, heute);
  const vb = L.verfuegbar(d, zr);
  const ausgegeben = L.ausgabenZwischen(d, zr.start, zr.ende);
  const tagNr = L.tageZwischen(zr.start, heute) + 1;
  const eintragTage = new Set((d.buchungen || []).filter(b => b.art === 'ausgabe' && b.betrag > 0).map(b => b.datum)).size;
  const genug = eintragTage >= MIN_TAGE;

  container.append(
    abschnitt('Überblick'),
    kennzahlen(d, zr, vb, ausgegeben, tagNr, heute),
    prognose(zr, vb.V, ausgegeben, tagNr),
    abschnitt('Verlauf'),
    verlauf(d, zr, vb.V, tagNr),
    tage30(d, heute, genug),
    abschnitt('Gewohnheiten und Kategorien'),
    kategorien(d, zr),
    wochentage(d, heute, st, genug),
    heatmap(d, heute, st, genug),
    abschnitt('Größte Ausgaben'),
    topListe(d),
    abschnitt('Ziele und Verträge'),
    sparziele(d, heute),
    fixkosten(d, heute),
    abschnitt('Spiel'),
    spiel(d, heute)
  );
}

// ---------- a) Kennzahlen ----------

function kennzahlen(d, zr, vb, ausgegeben, tagNr, heute) {
  let imBudget = 0;
  for (let i = 0; i < tagNr; i++) {
    if (L.tagErfuellt(d, L.datumPlusTage(zr.start, i))) imBudget++;
  }
  const einnahmen = vb.posten.filter(p => p.art === 'einnahme').reduce((s, p) => s + p.betrag, 0);
  const fix = -vb.posten.filter(p => p.art === 'fixkosten').reduce((s, p) => s + p.betrag, 0);
  const quote = einnahmen > 0 ? (einnahmen - (ausgegeben + fix)) / einnahmen : null;
  const angespart = (d.sparziele || []).reduce((s, x) => s + (x.angespart || 0), 0);

  const kachel = (titel, wert, text, klasse = '', wertKlasse = '') => el('div', { class: 'st12-kachel ' + klasse },
    el('div', { class: 'klein', text: titel }),
    el('div', { class: 'st12-kachel-wert ' + wertKlasse, text: wert }),
    el('div', { class: 'st12-kachel-text', text })
  );

  return el('section', { class: 'st12-kacheln', 'aria-label': 'Kennzahlen' },
    kachel('Ø Ausgaben pro Tag', euro(Math.round(ausgegeben / tagNr)), `Im Zeitraum bis heute, ${tage(tagNr)}`),
    kachel('Tage im Budget', prozent(imBudget / tagNr), `${imBudget} von ${tagNr} Tagen bis heute`),
    kachel('Längste Serie', tage(d.spiel.besteSerie || 0), 'Längste Folge von Tagen im Budget'),
    kachel('Insgesamt angespart', euro(angespart), 'In allen Sparzielen zusammen'),
    kachel('Sparquote', quote === null ? 'keine Einnahmen' : prozent(quote),
      'Aktueller Zeitraum: (Einnahmen minus Ausgaben) geteilt durch Einnahmen',
      'st12-kachel-breit',
      quote !== null && quote < 0 ? 'negativ' : 'positiv')
  );
}

// ---------- b) Prognose Monatsende ----------

function prognose(zr, V, ausgegeben, tagNr) {
  const prog = Math.round(ausgegeben / tagNr * zr.tage);
  const rest = V - prog;
  const hoch = Math.max(V, prog, 1);
  const info = infoZeile('Tippe auf einen Balken für den Wert.');
  const zeile = (y, cent, farbeFuell, name) => {
    const g = svg('g', { role: 'button', tabindex: 0 },
      svg('rect', { x: 0, y, width: 300, height: 14, rx: 7, class: 'st12-spur' }),
      svg('rect', { x: 0, y, width: Math.max(0, Math.min(300, cent / hoch * 300)).toFixed(1), height: 14, rx: 7, fill: farbeFuell })
    );
    antippen(g, info, `${name}: ${euro(cent)}`);
    return g;
  };
  const bild = svg('svg', { viewBox: '0 0 300 46', class: 'st12-svg', role: 'img', 'aria-label': `Plan ${euro(V)}, Prognose ${euro(prog)}` },
    zeile(0, V, MINT, 'Plan'),
    zeile(30, prog, prog <= V ? GRUEN : KORALLE, 'Prognose')
  );
  return karte('Prognose Monatsende',
    'Dein Ø pro Tag, auf den ganzen Zeitraum hochgerechnet.',
    el('div', { class: 'st12-prognose-wert ' + (rest >= 0 ? 'positiv' : 'negativ'),
      text: `${rest >= 0 ? 'Bei deinem Tempo bleiben' : 'Bei deinem Tempo fehlen'} am ${datumLang(zr.ende)} etwa ${euro(Math.abs(rest))}.` }),
    bild,
    info,
    el('div', { class: 'st12-legende klein' },
      el('span', {}, el('span', { class: 'st12-muster plan' }), `Plan ${euro(V)}`),
      el('span', {}, el('span', { class: 'st12-muster ' + (prog <= V ? 'gut' : 'drueber') }), `Prognose ${euro(prog)}`)
    )
  );
}

// ---------- c) Verlauf im Zeitraum ----------

function verlauf(d, zr, V, tagNr) {
  const N = zr.tage;
  const LINKS = 46;
  const RECHTS = 296;
  const OBEN = 14;
  const UNTEN = 150;
  const info = infoZeile('Tippe auf den Verlauf für den Stand an einem Tag.');

  const cum = [];
  let summe = 0;
  for (let i = 0; i < tagNr; i++) {
    summe += L.ausgabenAm(d, L.datumPlusTage(zr.start, i));
    cum.push(summe);
  }
  const yMax = Math.max(V, ...cum, 1);
  const yMin = Math.min(0, V);
  const x = (i) => LINKS + (N <= 1 ? 0 : i / (N - 1)) * (RECHTS - LINKS);
  const y = (v) => UNTEN - ((v - yMin) / (yMax - yMin)) * (UNTEN - OBEN);
  const ideal = (i) => V * (i + 1) / N;

  const kinder = [];
  for (const v of [yMax / 2, yMax]) {
    kinder.push(svg('line', { x1: LINKS, x2: RECHTS, y1: y(v).toFixed(1), y2: y(v).toFixed(1), class: 'st12-achse' }));
    kinder.push(svg('text', { x: LINKS - 6, y: (y(v) + 4).toFixed(1), 'text-anchor': 'end', class: 'st12-achsentext' }, ganz(v) + ' €'));
  }
  kinder.push(svg('line', { x1: LINKS, x2: RECHTS, y1: y(0).toFixed(1), y2: y(0).toFixed(1), class: 'st12-nulllinie' }));
  kinder.push(svg('text', { x: LINKS - 6, y: (y(0) + 4).toFixed(1), 'text-anchor': 'end', class: 'st12-achsentext' }, '0 €'));

  // Ideallinie: V gleichmäßig über die Tage verteilt
  const idealPunkte = [];
  for (let i = 0; i < N; i++) idealPunkte.push(`${x(i).toFixed(1)},${y(ideal(i)).toFixed(1)}`);
  kinder.push(svg('polyline', { points: idealPunkte.join(' '), class: 'st12-ideal' }));

  if (tagNr > 0) {
    const ausPunkte = cum.map((c, i) => `${x(i).toFixed(1)},${y(c).toFixed(1)}`);
    const letzte = cum[cum.length - 1];
    const linienFarbe = letzte <= ideal(tagNr - 1) ? GRUEN : KORALLE;
    const fl = `${x(0).toFixed(1)},${y(0).toFixed(1)} ${ausPunkte.join(' ')} ${x(tagNr - 1).toFixed(1)},${y(0).toFixed(1)}`;
    kinder.push(svg('polygon', { points: fl, class: 'st12-flaeche' }));
    kinder.push(svg('polyline', { points: ausPunkte.join(' '), class: 'st12-linie', stroke: linienFarbe }));
  }

  // Heute markieren
  const heuteX = x(Math.max(0, tagNr - 1));
  kinder.push(svg('line', { x1: heuteX.toFixed(1), x2: heuteX.toFixed(1), y1: OBEN - 4, y2: UNTEN, class: 'st12-heute-linie' }));
  kinder.push(svg('text', { x: heuteX.toFixed(1), y: 6, 'text-anchor': heuteX > RECHTS - 30 ? 'end' : 'middle', class: 'st12-achsentext heute' }, 'heute'));

  // Datumsbeschriftung am Anfang und Ende
  kinder.push(svg('text', { x: LINKS, y: UNTEN + 18, 'text-anchor': 'start', class: 'st12-achsentext' }, kurzDatum(zr.start)));
  kinder.push(svg('text', { x: RECHTS, y: UNTEN + 18, 'text-anchor': 'end', class: 'st12-achsentext' }, kurzDatum(zr.ende)));

  // Antippen: Stand an jedem vergangenen Tag
  const sp = N > 1 ? (RECHTS - LINKS) / (N - 1) : RECHTS - LINKS;
  for (let i = 0; i < tagNr; i++) {
    const treffer = svg('rect', { x: (x(i) - sp / 2).toFixed(1), y: 0, width: sp.toFixed(1), height: UNTEN + 22, class: 'st12-treffer' });
    antippen(treffer, info, `${langDatum(L.datumPlusTage(zr.start, i))}: bisher ausgegeben ${euro(cum[i])}, gleichmäßig wären ${euro(Math.round(ideal(i)))} da`);
    kinder.push(treffer);
  }

  const bild = svg('svg', { viewBox: `0 0 300 ${UNTEN + 26}`, class: 'st12-svg', role: 'img', 'aria-label': 'Kumulierte Ausgaben gegen die gleichmäßige Verteilung' }, ...kinder);
  const hinweis = summe === 0 ? 'Noch keine Ausgaben im Zeitraum. Die Linie startet, sobald du etwas einträgst.' : null;
  return karte('Verlauf im Zeitraum',
    'Was du bisher ausgegeben hast, gegen eine gleichmäßige Verteilung deines Verfügbaren.',
    hinweis ? leer(hinweis) : null,
    bild,
    info,
    el('div', { class: 'st12-legende klein' },
      el('span', {}, el('span', { class: 'st12-muster gut' }), 'ausgegeben'),
      el('span', {}, el('span', { class: 'st12-muster linie' }), 'gleichmäßig')
    )
  );
}

// ---------- d) Ausgaben pro Tag, letzte 30 Tage ----------

function tage30(d, heute, genug) {
  if (!genug) return karte('Ausgaben pro Tag', 'Die letzten 30 Tage, mit deinem Tagesbudget', leer(zuWenig('wie viel du pro Tag ausgibst')));

  const liste = [];
  for (let i = 29; i >= 0; i--) {
    const datum = L.datumPlusTage(heute, -i);
    liste.push({ datum, a: L.ausgabenAm(d, datum), B: Math.max(0, L.tagesbudget(d, datum)) });
  }
  const LINKS = 40;
  const RECHTS = 296;
  const OBEN = 12;
  const UNTEN = 150;
  const yMax = Math.max(1000, ...liste.flatMap(t => [t.a, t.B]));
  const yMin = 0; // Budget ist unten auf 0 begrenzt, sonst staucht ein überzogener Tag die Skala
  const y = (v) => UNTEN - ((v - yMin) / (yMax - yMin)) * (UNTEN - OBEN);
  const y0 = y(0);
  const sp = (RECHTS - LINKS) / 30;
  const bw = sp * 0.62;
  const info = infoZeile('Tippe auf einen Balken für Ausgaben und Budget.');

  const kinder = [];
  for (const v of hilfslinien(yMax)) {
    kinder.push(svg('line', { x1: LINKS, x2: RECHTS, y1: y(v).toFixed(1), y2: y(v).toFixed(1), class: 'st12-achse' }));
    kinder.push(svg('text', { x: LINKS - 6, y: (y(v) + 4).toFixed(1), 'text-anchor': 'end', class: 'st12-achsentext' }, ganz(v) + ' €'));
  }
  kinder.push(svg('line', { x1: LINKS, x2: RECHTS, y1: y0.toFixed(1), y2: y0.toFixed(1), class: 'st12-nulllinie' }));

  liste.forEach((t, i) => {
    const x0 = LINKS + i * sp + (sp - bw) / 2;
    if (t.a > 0) {
      const top = Math.min(y(t.a), y0);
      const h = Math.max(2, Math.abs(y(t.a) - y0));
      kinder.push(svg('rect', { x: x0.toFixed(1), y: top.toFixed(1), width: bw.toFixed(1), height: h.toFixed(1), rx: 3, class: t.a > t.B ? 'st12-drueber' : 'st12-gut' }));
    }
    const treffer = svg('rect', { x: (LINKS + i * sp).toFixed(1), y: 0, width: sp.toFixed(1), height: UNTEN + 20, class: 'st12-treffer' });
    antippen(treffer, info, `${langDatum(t.datum)}: ausgegeben ${euro(t.a)}, Budget ${euro(t.B)}`);
    kinder.push(treffer);
  });

  // Tagesbudget als gestrichelte Linie
  const punkte = liste.map((t, i) => `${(LINKS + i * sp + sp / 2).toFixed(1)},${y(t.B).toFixed(1)}`);
  kinder.push(svg('polyline', { points: punkte.join(' '), class: 'st12-budget-linie' }));

  // Datum unter einigen Balken
  [0, 7, 14, 21, 29].forEach((i) => {
    const anker = i === 0 ? 'start' : i === 29 ? 'end' : 'middle';
    const xs = i === 0 ? LINKS : i === 29 ? RECHTS : LINKS + i * sp + sp / 2;
    kinder.push(svg('text', { x: xs.toFixed(1), y: UNTEN + 16, 'text-anchor': anker, class: 'st12-achsentext' }, kurzDatum(liste[i].datum)));
  });

  const bild = svg('svg', { viewBox: `0 0 300 ${UNTEN + 22}`, class: 'st12-svg', role: 'img', 'aria-label': 'Ausgaben der letzten 30 Tage gegen das Tagesbudget' }, ...kinder);
  return karte('Ausgaben pro Tag', 'Balken = Ausgaben je Tag, gestrichelte Linie = Tagesbudget',
    bild,
    info,
    el('div', { class: 'st12-legende klein' },
      el('span', {}, el('span', { class: 'st12-muster gut' }), 'im Budget'),
      el('span', {}, el('span', { class: 'st12-muster drueber' }), 'über dem Budget'),
      el('span', {}, el('span', { class: 'st12-muster linie' }), 'Tagesbudget')
    )
  );
}

// ---------- e) Kategorien mit Donut und Vergleich ----------

function kategorien(d, zr) {
  const summenVon = (z) => {
    const m = new Map();
    for (const b of d.buchungen || []) {
      if (b.art !== 'ausgabe' || b.betrag <= 0 || b.datum < z.start || b.datum > z.ende) continue;
      m.set(b.kategorie, (m.get(b.kategorie) || 0) + b.betrag);
    }
    return m;
  };
  const aktuell = summenVon(zr);
  const liste = [...aktuell].sort((a, b) => b[1] - a[1]);
  if (!liste.length) {
    return karte('Ausgaben nach Kategorie', 'Anteil jeder Kategorie an den Ausgaben dieses Zeitraums', leer('Noch keine Ausgaben in diesem Zeitraum.'));
  }

  // Vorzeitraum nur, wenn er ganz nach dem Startdatum liegt
  const st = (d.einstellungen && d.einstellungen.startDatum) || '';
  const vorZr = L.zeitraum(d, L.datumPlusTage(zr.start, -1));
  const vergleichbar = !st || vorZr.start >= st;
  const vorher = vergleichbar ? summenVon(vorZr) : null;

  const gesamt = liste.reduce((s, [, c]) => s + c, 0);
  const info = infoZeile('Tippe auf ein Stück oder eine Zeile für den Wert.');
  const R = 70;
  const U = 2 * Math.PI * R;
  let offset = 0;
  const kreis = [];
  for (const [id, cent] of liste) {
    const anteil = cent / gesamt;
    const laenge = anteil * U;
    const seg = svg('circle', {
      cx: 100, cy: 100, r: R, fill: 'none', stroke: farbe(d, id), 'stroke-width': 28,
      'stroke-dasharray': `${laenge.toFixed(2)} ${(U - laenge).toFixed(2)}`,
      'stroke-dashoffset': (-offset).toFixed(2), transform: 'rotate(-90 100 100)'
    });
    const kat = kategorieVon(d, id);
    antippen(seg, info, `${kat.emoji} ${kat.name}: ${euro(cent)}, ${prozent(anteil)} der Ausgaben`);
    kreis.push(seg);
    offset += laenge;
  }

  const donut = svg('svg', { viewBox: '0 0 200 200', class: 'st12-donut', role: 'img', 'aria-label': 'Ausgaben nach Kategorie' },
    svg('circle', { cx: 100, cy: 100, r: R, class: 'st12-donut-spur', 'stroke-width': 28 }),
    ...kreis,
    svg('text', { x: 100, y: 96, 'text-anchor': 'middle', class: 'st12-donut-klein' }, 'Gesamt'),
    svg('text', { x: 100, y: 116, 'text-anchor': 'middle', class: 'st12-donut-wert' }, ganz(gesamt) + ' €')
  );

  const zeilen = liste.map(([id, cent]) => {
    const kat = kategorieVon(d, id);
    let trend = null;
    if (vorher) {
      const v = vorher.get(id) || 0;
      if (v > 0) {
        const p = (cent - v) / v;
        trend = p === 0
          ? el('span', { class: 'klein', text: '→ 0 %' })
          : el('span', { class: p > 0 ? 'negativ' : 'positiv', text: (p > 0 ? '↑ ' : '↓ ') + prozent(Math.abs(p)) });
      } else {
        trend = el('span', { class: 'negativ', text: '↑ neu' });
      }
    }
    return el('div', { class: 'st12-kat-zeile', role: 'button', tabindex: 0,
      onclick: () => { info.textContent = `${kat.emoji} ${kat.name}: ${euro(cent)}, ${prozent(cent / gesamt)} der Ausgaben`; } },
    el('span', { class: 'st12-punkt', style: `background:${farbe(d, id)}` }),
    el('span', { class: 'st12-kat-name', text: `${kat.emoji} ${kat.name}` }),
    el('span', { class: 'ue-zahl', text: `${euro(cent)} · ${prozent(cent / gesamt)}` }),
    trend
    );
  });

  return karte('Ausgaben nach Kategorie',
    'Anteil jeder Kategorie an den Ausgaben dieses Zeitraums.',
    el('div', { class: 'st12-donut-huelle' }, donut),
    info,
    el('div', { class: 'st12-kat-liste' }, zeilen),
    el('p', { class: 'klein st12-fuss', text: vergleichbar
      ? 'Pfeile: Veränderung gegenüber dem Vorzeitraum.'
      : 'Ein Vergleich mit dem Vorzeitraum gibt es, sobald der Vorzeitraum ganz nach dem Startdatum liegt.' })
  );
}

// ---------- f) Wochentage ----------

function wochentage(d, heute, st, genug) {
  if (!genug) return karte('Ausgaben nach Wochentag', 'Dein Ø pro Wochentag seit Beginn', leer(zuWenig('an welchem Wochentag du am meisten ausgibst')));

  const summe = [0, 0, 0, 0, 0, 0, 0];
  const anzahl = [0, 0, 0, 0, 0, 0, 0];
  for (let t = st; t <= heute; t = L.datumPlusTage(t, 1)) {
    const wd = L.wochentag(t);
    summe[wd] += L.ausgabenAm(d, t);
    anzahl[wd] += 1;
  }
  const schnitt = summe.map((s, i) => (anzahl[i] ? s / anzahl[i] : 0));
  const hoch = Math.max(1000, ...schnitt);
  const teuerster = schnitt.indexOf(Math.max(...schnitt));
  const satz = schnitt[teuerster] > 0
    ? `Am meisten gibst du ${WOCHENTAG_LANG[teuerster]} aus.`
    : 'Bisher hast du an keinem Wochentag etwas ausgegeben.';

  const LINKS = 6;
  const SPALTE = 300 / 7;
  const BASIS = 130;
  const OBEN = 22;
  const info = infoZeile('Tippe auf einen Balken für den Durchschnitt.');
  const kinder = [];
  kinder.push(svg('line', { x1: 0, x2: 300, y1: BASIS, y2: BASIS, class: 'st12-nulllinie' }));
  schnitt.forEach((v, i) => {
    const m = LINKS + SPALTE * i + SPALTE / 2;
    const bw = 26;
    const h = Math.max(v > 0 ? 2 : 0, (v / hoch) * (BASIS - OBEN));
    if (h > 0) {
      kinder.push(svg('rect', { x: (m - bw / 2).toFixed(1), y: (BASIS - h).toFixed(1), width: bw, height: h.toFixed(1), rx: 6, class: i === teuerster ? 'st12-teuer' : 'st12-normal' }));
    }
    kinder.push(svg('text', { x: m.toFixed(1), y: (BASIS - h - 6).toFixed(1), 'text-anchor': 'middle', class: 'st12-balkenwert' }, ganz(v)));
    kinder.push(svg('text', { x: m.toFixed(1), y: BASIS + 20, 'text-anchor': 'middle', class: 'st12-tagname' + (i === teuerster ? ' heute' : '') }, WOCHENTAG_KURZ[i]));
    const treffer = svg('rect', { x: (LINKS + SPALTE * i).toFixed(1), y: 0, width: SPALTE.toFixed(1), height: BASIS + 26, class: 'st12-treffer' });
    antippen(treffer, info, `${WOCHENTAG_KURZ[i]}: Ø ${euro(Math.round(v))} pro Tag an ${anzahl[i]} Tagen`);
    kinder.push(treffer);
  });
  const bild = svg('svg', { viewBox: `0 0 300 ${BASIS + 30}`, class: 'st12-svg', role: 'img', 'aria-label': 'Durchschnittliche Ausgaben je Wochentag' }, ...kinder);
  return karte('Ausgaben nach Wochentag', 'Dein Ø pro Wochentag seit Beginn',
    el('p', { class: 'st12-satz', text: satz }),
    bild,
    info
  );
}

// ---------- g) Kalender-Heatmap, 12 Wochen ----------

function heatmap(d, heute, st, genug) {
  if (!genug) return karte('Die letzten 12 Wochen', 'Jeder Tag als Kästchen', leer(zuWenig('wie oft du im Budget bleibst')));

  const start = L.datumPlusTage(L.wochenbeginn(heute), -7 * 11);
  const Z = 19;
  const G = 4;
  const LINKS = 24;
  const OBEN = 22;
  const info = infoZeile('Tippe auf einen Tag für Details.');
  const kinder = [];
  let letzterMonat = '';

  for (let w = 0; w < 12; w++) {
    const montag = L.datumPlusTage(start, w * 7);
    const monat = montag.slice(5, 7);
    if (monat !== letzterMonat) {
      kinder.push(svg('text', { x: (LINKS + w * (Z + G)).toFixed(1), y: 12, class: 'st12-achsentext' }, MONATE[Number(monat) - 1].slice(0, 3)));
      letzterMonat = monat;
    }
    for (let wd = 0; wd < 7; wd++) {
      const datum = L.datumPlusTage(montag, wd);
      const x = LINKS + w * (Z + G);
      const y = OBEN + wd * (Z + G);
      let klasse;
      let status;
      if (datum > heute) {
        klasse = 'st12-zelle-leer';
        status = 'noch offen';
      } else if (datum < st) {
        klasse = 'st12-zelle-leer';
        status = 'keine Daten';
      } else if (L.tagErfuellt(d, datum)) {
        klasse = 'st12-zelle-gut';
        status = `im Budget, ausgegeben ${euro(L.ausgabenAm(d, datum))}`;
      } else {
        klasse = 'st12-zelle-drueber';
        status = `über dem Budget, ausgegeben ${euro(L.ausgabenAm(d, datum))}`;
      }
      const zelle = svg('rect', { x, y, width: Z, height: Z, rx: 5, class: klasse });
      kinder.push(zelle);
      if (datum === heute) {
        kinder.push(svg('rect', { x: x - 2, y: y - 2, width: Z + 4, height: Z + 4, rx: 7, class: 'st12-heute-rahmen' }));
      }
      const treffer = svg('rect', { x, y, width: Z, height: Z, rx: 5, class: 'st12-treffer' });
      antippen(treffer, info, `${langDatum(datum)}: ${status}`);
      kinder.push(treffer);
    }
  }
  ['Mo', 'Mi', 'Fr', 'So'].forEach((name, k) => {
    const wd = [0, 2, 4, 6][k];
    kinder.push(svg('text', { x: LINKS - 5, y: OBEN + wd * (Z + G) + 14, 'text-anchor': 'end', class: 'st12-achsentext' }, name));
  });

  const bild = svg('svg', { viewBox: `0 0 300 ${OBEN + 7 * (Z + G)}`, class: 'st12-svg', role: 'img', 'aria-label': 'Kalender der letzten 12 Wochen: im Budget, über dem Budget oder ohne Daten' }, ...kinder);
  return karte('Die letzten 12 Wochen', 'Spalten sind Wochen, Zeilen sind Mo bis So. Heute ist umrandet.',
    bild,
    info,
    el('div', { class: 'st12-legende klein' },
      el('span', {}, el('span', { class: 'st12-muster gut' }), 'im Budget'),
      el('span', {}, el('span', { class: 'st12-muster drueber' }), 'über dem Budget'),
      el('span', {}, el('span', { class: 'st12-muster leer' }), 'keine Daten')
    )
  );
}

// ---------- h) Größte Ausgaben und häufige Notizen ----------

function topListe(d) {
  const ausgaben = (d.buchungen || []).filter(b => b.art === 'ausgabe' && b.betrag > 0);
  if (!ausgaben.length) return karte('Größte Ausgaben', 'Die fünf teuersten Ausgaben und deine häufigsten Notizen', leer('Noch keine Ausgaben gebucht.'));

  const top = [...ausgaben].sort((a, b) => (b.betrag - a.betrag) || (a.datum < b.datum ? 1 : -1)).slice(0, 5);
  const notizen = new Map();
  for (const b of ausgaben) {
    const n = (b.notiz || '').trim();
    if (!n || n === 'Nichts ausgegeben') continue;
    notizen.set(n, (notizen.get(n) || 0) + 1);
  }
  const notizListe = [...notizen].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return karte('Größte Ausgaben und Notizen', 'Die fünf teuersten Einzelausgaben und die Notizen, die du am häufigsten nutzt.',
    el('h3', { class: 'st12-unter', text: 'Größte Ausgaben' }),
    el('div', { class: 'st12-liste' }, top.map(b => {
      const kat = kategorieVon(d, b.kategorie);
      return el('div', { class: 'st12-liste-zeile' },
        el('span', { class: 'st12-liste-emoji', 'aria-hidden': 'true', text: kat.emoji }),
        el('span', { class: 'st12-liste-text' },
          el('div', { class: 'st12-liste-name', text: b.name }),
          el('div', { class: 'klein', text: `${kurzDatum(b.datum)} · ${kat.name}` })
        ),
        el('span', { class: 'st12-liste-wert', text: euro(b.betrag) })
      );
    })),
    el('h3', { class: 'st12-unter', text: 'Häufige Notizen' }),
    notizListe.length
      ? el('div', { class: 'st12-liste' }, notizListe.map(([n, anz]) => el('div', { class: 'st12-liste-zeile' },
        el('span', { class: 'st12-liste-text' }, el('div', { class: 'st12-liste-name', text: n })),
        el('span', { class: 'st12-liste-wert', text: `${anz}×` })
      )))
      : el('p', { class: 'klein', text: 'Noch keine Notizen bei Ausgaben.' })
  );
}

// ---------- i) Sparziele ----------

function sparziele(d, heute) {
  const liste = d.sparziele || [];
  if (!liste.length) return karte('Sparziele', 'Fortschritt je Ziel', leer('Lege unter Ziele ein Sparziel an, dann siehst du hier den Fortschritt.'));

  return karte('Sparziele', 'Fortschritt je Ziel, und wann du es bei deiner Monatsrate erreichst.',
    liste.map((s) => {
      const ang = s.angespart || 0;
      const rate = s.proMonat || 0;
      const info = infoZeile('Tippe auf den Balken für den Stand.');
      let prognoseText;
      if (s.zielsumme) {
        if (ang >= s.zielsumme) {
          prognoseText = 'Ziel erreicht';
        } else if (rate <= 0) {
          prognoseText = 'Keine Monatsrate eingetragen, deshalb keine Prognose';
        } else {
          const monate = Math.ceil((s.zielsumme - ang) / rate);
          const [j, m] = L.datumPlusMonate(heute, monate, 1).split('-');
          prognoseText = `Ziel erreicht etwa im ${MONATE[Number(m) - 1]} ${j}`;
        }
      } else {
        prognoseText = `Ohne Zielsumme, Rate ${euro(rate)} pro Monat`;
      }
      const bild = s.zielsumme
        ? svg('svg', { viewBox: '0 0 300 16', class: 'st12-svg', role: 'img', 'aria-label': `${s.name}: ${euro(ang)} von ${euro(s.zielsumme)}` },
          svg('rect', { x: 0, y: 0, width: 300, height: 16, rx: 8, class: 'st12-spur' }),
          svg('rect', { x: 0, y: 0, width: (Math.min(1, ang / s.zielsumme) * 300).toFixed(1), height: 16, rx: 8, class: ang >= s.zielsumme ? 'st12-gut' : 'st12-fortschritt' })
        )
        : null;
      if (bild) antippen(bild, info, `${s.name}: ${euro(ang)} von ${euro(s.zielsumme)}, ${prozent(ang / s.zielsumme)}`);
      return el('div', { class: 'st12-ziel' },
        el('div', { class: 'st12-ziel-kopf' },
          el('span', { class: 'st12-liste-name', text: s.name }),
          el('span', { class: 'st12-liste-wert', text: s.zielsumme ? `${euro(ang)} von ${euro(s.zielsumme)}` : euro(ang) })
        ),
        bild,
        el('div', { class: 'klein', text: prognoseText }),
        bild ? info : null
      );
    })
  );
}

// ---------- j) Fixkosten-Struktur ----------

function fixkosten(d, heute) {
  const monatlich = (v) => L.rundeCent(v.betrag / Math.max(1, v.intervall || 1));
  const aktiv = (d.vertraege || []).filter(v => !v.ende || v.ende >= heute);
  const einkommen = aktiv.filter(v => v.art === 'einnahme').reduce((s, v) => s + monatlich(v), 0);
  const ausgabenV = aktiv.filter(v => v.art === 'ausgabe');
  if (!ausgabenV.length) {
    return karte('Fixkosten', 'Deine Verträge nach Kategorie', leer('Noch keine Verträge. Unter Ziele legst du Fixkosten an, dann siehst du hier ihren Anteil.'));
  }

  const gruppen = new Map();
  for (const v of ausgabenV) {
    const id = v.kategorie || 'sonstiges';
    gruppen.set(id, (gruppen.get(id) || 0) + monatlich(v));
  }
  const liste = [...gruppen].sort((a, b) => b[1] - a[1]);
  const gesamt = liste.reduce((s, [, c]) => s + c, 0);
  const skala = Math.max(einkommen, gesamt, 1);
  const info = infoZeile('Tippe auf ein Stück für den Betrag.');

  let off = 0;
  const stapel = [];
  for (const [id, cent] of liste) {
    const breite = cent / skala * 300;
    if (breite > 0) {
      const r = svg('rect', { x: off.toFixed(1), y: 6, width: breite.toFixed(1), height: 26, fill: farbe(d, id), class: 'st12-segment' });
      const kat = kategorieVon(d, id);
      antippen(r, info, `${kat.emoji} ${kat.name}: ${euro(cent)} im Monat`);
      stapel.push(r);
    }
    off += breite;
  }
  const bild = svg('svg', { viewBox: '0 0 300 40', class: 'st12-svg', role: 'img', 'aria-label': 'Fixkosten pro Monat gegen das monatliche Einkommen' },
    svg('rect', { x: 0, y: 6, width: 300, height: 26, rx: 6, class: 'st12-spur' }),
    ...stapel,
    einkommen > 0 ? svg('line', { x1: (einkommen / skala * 300).toFixed(1), x2: (einkommen / skala * 300).toFixed(1), y1: 0, y2: 38, class: 'st12-einkommen' }) : null
  );

  return karte('Fixkosten',
    'Verträge nach Kategorie, als Monatsrate (Betrag geteilt durch Intervall) gegen dein monatliches Einkommen.',
    bild,
    info,
    el('p', { class: 'st12-satz', text: einkommen > 0
      ? `${prozent(gesamt / einkommen)} deines monatlichen Einkommens gehen in Fixkosten.`
      : 'Ohne Einkommen-Vertrag lässt sich kein Anteil berechnen.' }),
    el('div', { class: 'st12-kat-liste' }, liste.map(([id, cent]) => {
      const kat = kategorieVon(d, id);
      return el('div', { class: 'st12-kat-zeile' },
        el('span', { class: 'st12-punkt', style: `background:${farbe(d, id)}` }),
        el('span', { class: 'st12-kat-name', text: `${kat.emoji} ${kat.name}` }),
        el('span', { class: 'ue-zahl', text: `${euro(cent)} im Monat` }),
        el('span', { class: 'klein', text: einkommen > 0 ? prozent(cent / einkommen) : 'k. A.' })
      );
    }))
  );
}

// ---------- k) Spiel: Samen pro Woche, Level, Abzeichen ----------

function spiel(d, heute) {
  const wb0 = L.wochenbeginn(heute);
  const tageBew = d.spiel.bewertet.tage || [];
  const wochenBew = d.spiel.bewertet.wochen || [];
  const werte = [];
  for (let k = 7; k >= 0; k--) {
    const start = L.datumPlusTage(wb0, -7 * k);
    const ende = L.datumPlusTage(start, 6);
    let s = 0;
    for (const t of tageBew) {
      if (t.datum >= start && t.datum <= ende && Number.isFinite(t.samen)) s += t.samen;
    }
    for (const w of wochenBew) {
      if (w.start === start && Number.isFinite(w.samen)) s += w.samen;
    }
    werte.push({ start, s });
  }
  const hoch = Math.max(50, ...werte.map(w => w.s));
  const info = infoZeile('Tippe auf eine Säule für die Samen der Woche.');
  const BASIS = 120;
  const OBEN = 20;
  const SPALTE = 300 / 8;
  const kinder = [svg('line', { x1: 0, x2: 300, y1: BASIS, y2: BASIS, class: 'st12-nulllinie' })];
  werte.forEach((w, i) => {
    const m = SPALTE * i + SPALTE / 2;
    const h = w.s > 0 ? Math.max(2, (w.s / hoch) * (BASIS - OBEN)) : 0;
    if (h > 0) kinder.push(svg('rect', { x: (m - 11).toFixed(1), y: (BASIS - h).toFixed(1), width: 22, height: h.toFixed(1), rx: 5, class: 'st12-normal' }));
    kinder.push(svg('text', { x: m.toFixed(1), y: (BASIS - h - 5).toFixed(1), 'text-anchor': 'middle', class: 'st12-balkenwert' }, zahl(w.s)));
    kinder.push(svg('text', { x: m.toFixed(1), y: BASIS + 17, 'text-anchor': 'middle', class: 'st12-achsentext' }, kurzDatum(w.start).slice(0, -1)));
    const treffer = svg('rect', { x: (SPALTE * i).toFixed(1), y: 0, width: SPALTE.toFixed(1), height: BASIS + 24, class: 'st12-treffer' });
    antippen(treffer, info, `Woche ab ${kurzDatum(w.start)}: ${zahl(w.s)} Samen`);
    kinder.push(treffer);
  });
  const bild = svg('svg', { viewBox: `0 0 300 ${BASIS + 26}`, class: 'st12-svg', role: 'img', 'aria-label': 'Samen pro Woche, letzte 8 Wochen' }, ...kinder);
  const alleNull = werte.every(w => w.s === 0);

  return karte('Spiel', 'Samen pro Woche in den letzten 8 Wochen, dazu dein Level und deine Abzeichen.',
    el('div', { class: 'st12-kacheln' },
      el('div', { class: 'st12-kachel' },
        el('div', { class: 'klein', text: 'Level' }),
        el('div', { class: 'st12-kachel-wert', text: String(levelAus(d.spiel.xp).level) })
      ),
      el('div', { class: 'st12-kachel' },
        el('div', { class: 'klein', text: 'Abzeichen' }),
        el('div', { class: 'st12-kachel-wert', text: `${(d.spiel.abzeichen || []).length} von ${ABZEICHEN.length}` })
      )
    ),
    alleNull ? leer('Sobald Tage im Budget bewertet sind, siehst du hier deine Samen.') : null,
    bild,
    info
  );
}
