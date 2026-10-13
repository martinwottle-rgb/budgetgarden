// Bildschirm Übersicht nach UI.md Abschnitt 3: Zeitraum, Kalender, Woche, Kategorien,
// Vergleich mit früheren Zeiträumen und die Buchungsliste mit Kategorie-Filter.
// Alle Zahlen kommen aus logik.js, nichts wird hier neu gerechnet außer den Auswertungen.

import * as L from '../logik.js';
import { el, euro, balken, kategorieVon, kurzDatum, langDatum, tage, parseBetrag, betragText, zahl } from './bausteine.js';
import * as statistik from './statistik.js';

const VORSCHAU_MAX = 3; // so viele Zeiträume reicht die Vorschau nach vorn

const SVG_NS = 'http://www.w3.org/2000/svg';
const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const ART_TEXT = { ausgabe: 'Ausgabe', einnahme: 'Einnahme', fixkosten: 'Fixkosten' };
const ARTEN = [['ausgabe', 'Ausgabe'], ['einnahme', 'Einnahme'], ['fixkosten', 'Fixkosten']];
const NICHTS = 'Nichts ausgegeben';

// SVG-Element mit Attributen und Kindern, ohne innerHTML
function svg(tag, attr = {}, ...kinder) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, String(v));
  for (const kind of kinder) if (kind) e.append(kind);
  return e;
}

// '2026-10-03' -> '03.10.2026'
function datumLang(iso) {
  const [j, m, t] = iso.split('-');
  return t + '.' + m + '.' + j;
}

// Prozent aus Anteil, mit Minuszeichen wie euro()
function prozent(anteil) {
  const p = Math.round(anteil * 100);
  return (p < 0 ? '−' : '') + Math.abs(p) + ' %';
}

// Gleiche Vorzeichen wie in der Buchungsliste: Einnahme plus, Ausgaben und Fixkosten minus
function betragZeichen(b) {
  if (b.art === 'einnahme') return '+' + euro(b.betrag);
  return b.betrag ? euro(-b.betrag) : euro(0);
}

function istImZeitraum(datum, zr) {
  return datum >= zr.start && datum <= zr.ende;
}

// Stichtag aus dem Aufruf (Zeitraum blättern). Nie vor dem Startdatum, nie hinter dem Ende der Vorschau.
function stichtagVon(d, heute, param, maxEnde) {
  const s = param && param.stichtag;
  const st = (d.einstellungen && d.einstellungen.startDatum) || '';
  if (!gueltigesDatum(s) || s > maxEnde || (st && s < st)) return heute;
  return s;
}

// Letzter Tag der Vorschau: VORSCHAU_MAX Zeiträume nach dem aktuellen
function vorschauEnde(d, jetzt) {
  let z = jetzt;
  for (let i = 0; i < VORSCHAU_MAX; i++) z = L.zeitraum(d, L.datumPlusTage(z.ende, 1));
  return z.ende;
}

// Nur echte Kalenderdaten im Format JJJJ-MM-TT
function gueltigesDatum(iso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso || '') && L.datumPlusTage(iso, 0) === iso;
}

export function zeige(container, ctx, param) {
  const d = ctx.daten;
  const heute = ctx.heute;
  const jetzt = L.zeitraum(d, heute);
  const grenze = vorschauEnde(d, jetzt);
  const statistikAn = !!param && param.ansicht === 'statistik';

  container.append(
    el('h1', { class: 'titel', text: 'Übersicht' }),
    reiter(ctx, statistikAn, param)
  );
  if (statistikAn) {
    statistik.zeige(container, ctx);
    return;
  }

  const zr = L.zeitraum(d, stichtagVon(d, heute, param, grenze));
  const istAktuell = zr.start === jetzt.start;
  const zukunft = zr.start > heute;
  const vb = L.verfuegbar(d, zr);
  const ausgegeben = L.ausgabenZwischen(d, zr.start, zr.ende);
  const tagesInfo = L.heute(d, heute);
  // Wochenkarte: die Woche von heute, sonst die letzte Woche des angesehenen Zeitraums
  const anker = istAktuell ? heute : zr.ende;

  container.append(zeitraumKarte(ctx, zr, vb, ausgegeben, heute, tagesInfo, istAktuell, grenze, zukunft));
  container.append(
    el('div', { class: 'abschnitt', text: 'Kalender dieses Zeitraums' }),
    kalenderKarte(ctx, zr, heute)
  );
  if (zukunft) {
    container.append(el('section', { class: 'karte leer klein', text: 'Für diesen Zeitraum gibt es noch keine Buchungen. Sobald er beginnt, siehst du hier Woche, Kategorien und Buchungen.' }));
    return;
  }
  container.append(
    wochenKarte(ctx, zr, anker, istAktuell ? 'Diese Woche' : 'Letzte Woche des Zeitraums'),
    el('div', { class: 'abschnitt', text: 'Ausgaben nach Kategorie' }),
    kategorieKarte(d, zr),
    el('div', { class: 'abschnitt', text: 'Vergleich mit früheren Zeiträumen' }),
    vergleichKarte(d, zr),
    el('div', { class: 'abschnitt', text: 'Buchungen dieses Zeitraums' }),
    buchungenKarte(ctx, zr)
  );
}

// Reiter oben: Zeitraum oder Statistik
function reiter(ctx, statistikAn, param) {
  const knopf = (text, aktiv, p) => el('button', {
    type: 'button', role: 'tab', 'aria-selected': aktiv ? 'true' : 'false',
    class: aktiv ? 'aktiv' : '', text,
    onclick: () => ctx.navigiere('uebersicht', p)
  });
  return el('div', { class: 'reiter', role: 'tablist', 'aria-label': 'Ansicht der Übersicht' },
    knopf('Zeitraum', !statistikAn, param && param.stichtag ? { stichtag: param.stichtag } : null),
    knopf('Statistik', statistikAn, { ansicht: 'statistik' })
  );
}

// ---------- Zeitraum ----------

const HINWEIS_DAVOR = 'Davor hast du die App noch nicht benutzt';
const HINWEIS_VORSCHAU = 'Weiter als 3 Zeiträume in die Zukunft zeigt die Vorschau nicht';

// ‹ geht bis zum Zeitraum, der startDatum enthält; › bis VORSCHAU_MAX Zeiträume in die Zukunft.
// Nicht erlaubte Pfeile bleiben sichtbar (grau) und sagen per Toast, warum nicht.
function zeitraumKarte(ctx, zr, vb, ausgegeben, heute, tagesInfo, istAktuell, grenze, zukunft) {
  const d = ctx.daten;
  const st = (d.einstellungen && d.einstellungen.startDatum) || '';
  const vorStichtag = L.datumPlusTage(zr.start, -1);
  const naechsterStichtag = L.datumPlusTage(zr.ende, 1);
  const frueherOk = !st || vorStichtag >= st;
  const weiterOk = naechsterStichtag <= grenze;

  const pfeil = (zeichen, ok, ziel, hinweis, beschriftung) => el('button', {
    type: 'button',
    class: 'st12-pfeil' + (ok ? '' : ' aus'),
    text: zeichen,
    'aria-label': beschriftung,
    'aria-disabled': ok ? null : 'true',
    onclick: () => (ok ? ctx.navigiere('uebersicht', { stichtag: ziel }) : ctx.toast(hinweis))
  });

  const kopf = el('div', { class: 'st12-zr-kopf' },
    pfeil('‹', frueherOk, vorStichtag, HINWEIS_DAVOR, 'Früherer Zeitraum'),
    el('div', { class: 'st12-zr-mitte' },
      el('div', { class: 'klein', text: zukunft ? 'Vorschau' : (istAktuell ? 'Zeitraum' : 'Vergangener Zeitraum') }),
      el('div', { class: 'st12-zr-titel', text: `${datumLang(zr.start)} bis ${datumLang(zr.ende)}` })
    ),
    pfeil('›', weiterOk, naechsterStichtag, HINWEIS_VORSCHAU, 'Nächster Zeitraum')
  );

  const posten = el('div', { class: 'ue-posten' }, vb.posten.map(p => el('div', { class: 'ue-posten-zeile' },
    el('span', { text: p.name }),
    el('span', { class: 'ue-zahl ' + (p.betrag < 0 ? 'negativ' : 'positiv'), text: (p.betrag > 0 ? '+' : '') + euro(p.betrag) })
  )));
  const details = el('details', { class: 'ue-details' },
    el('summary', { class: 'ue-summe' },
      el('span', { text: 'Verfügbar' }),
      el('span', { class: 'ue-zahl', text: euro(vb.V) })
    ),
    posten
  );

  if (zukunft) {
    const fix = vb.posten.filter(p => p.art === 'fixkosten').reduce((s, p) => s + p.betrag, 0);
    const tagesbudget = L.rundeCent(vb.V / zr.tage);
    return el('section', { class: 'karte ue-zeitraum' },
      kopf,
      el('div', { class: 'st12-vorschau-marke', text: 'Vorschau' }),
      el('div', { class: 'klein', text: tage(zr.tage) }),
      details,
      el('div', { class: 'ue-kennzahlen' },
        el('div', {},
          el('div', { class: 'klein', text: 'Fixkosten' }),
          el('div', { class: 'betrag-mittel negativ', text: euro(fix) })
        ),
        el('div', {},
          el('div', { class: 'klein', text: 'Erwartetes Tagesbudget' }),
          el('div', { class: 'betrag-mittel ' + (tagesbudget < 0 ? 'negativ' : 'positiv'), text: euro(tagesbudget) })
        )
      ),
      el('p', { class: 'klein ue-heute', text: 'Noch keine Ausgaben. Gezeigt wird, was die App für diesen Zeitraum plant: Gehalt, Verträge, Rücklagen und Sparziele, Stand heute.' })
    );
  }

  const rest = vb.V - ausgegeben;
  const tagNr = L.tageZwischen(zr.start, heute) + 1;
  return el('section', { class: 'karte ue-zeitraum' },
    kopf,
    el('div', { class: 'klein', text: istAktuell ? `Tag ${tagNr} von ${zr.tage}` : tage(zr.tage) }),
    details,
    el('div', { class: 'ue-kennzahlen' },
      el('div', {},
        el('div', { class: 'klein', text: 'Ausgegeben' }),
        el('div', { class: 'betrag-mittel', text: euro(ausgegeben) })
      ),
      el('div', {},
        el('div', { class: 'klein', text: 'Rest' }),
        el('div', { class: 'betrag-mittel ' + (rest < 0 ? 'negativ' : 'positiv'), text: euro(rest) })
      )
    ),
    balken(ausgegeben, vb.V),
    istAktuell
      ? el('div', { class: 'ue-heute klein' },
        `Heute: Tagesbudget ${euro(tagesInfo.B)}, Rest heute `,
        el('span', { class: tagesInfo.rest < 0 ? 'negativ' : 'positiv', text: euro(tagesInfo.rest) }),
        '.'
      )
      : null
  );
}

// ---------- Kalender ----------

function kalenderKarte(ctx, zr, heute) {
  const d = ctx.daten;
  const zellen = [];
  for (let i = 0; i < L.wochentag(zr.start); i++) zellen.push(el('div', { class: 'ue-kal-leer', 'aria-hidden': 'true' }));

  for (let i = 0; i < zr.tage; i++) {
    const datum = L.datumPlusTage(zr.start, i);
    const kommt = datum > heute;
    const status = kommt ? 'zukunft' : (L.tagErfuellt(d, datum) ? 'gut' : 'drueber');
    const tagNr = Number(datum.slice(8));
    zellen.push(el('button', {
      type: 'button',
      class: 'ue-kal-tag ' + status + (datum === heute ? ' heute' : ''),
      'aria-label': `${langDatum(datum)}, ${kommt ? 'noch offen' : (status === 'gut' ? 'im Budget' : 'über dem Budget')}`,
      'aria-current': datum === heute ? 'date' : null,
      onclick: () => tagSheet(ctx, datum),
      text: String(tagNr)
    }));
  }

  return el('section', { class: 'karte' },
    el('div', { class: 'ue-kal' },
      WOCHENTAGE.map(w => el('div', { class: 'ue-kal-kopf', 'aria-hidden': 'true', text: w })),
      zellen
    ),
    el('div', { class: 'ue-legende klein' },
      el('span', { class: 'ue-punkt gut' }), ' im Budget',
      el('span', { class: 'ue-punkt drueber' }), ' drüber',
      el('span', { class: 'ue-punkt zukunft' }), ' kommt noch'
    )
  );
}

// Sheet mit Budget und Buchungen eines Tages
function tagSheet(ctx, datum) {
  const d = ctx.daten;
  const zr = L.zeitraum(d, datum);
  const B = L.tagesbudget(d, datum);
  const ausgegeben = L.ausgabenAm(d, datum);
  const buchungen = (d.buchungen || []).filter(b => b.datum === datum).slice().reverse();

  const blatt = ctx.sheet(el('div', {},
    el('div', { class: 'klein', text: `Zeitraum ${datumLang(zr.start)} bis ${datumLang(zr.ende)}` }),
    el('h2', { class: 'dialog-titel', text: langDatum(datum) }),
    el('div', { class: 'ue-kennzahlen' },
      el('div', {},
        el('div', { class: 'klein', text: 'Budget dieses Tages' }),
        el('div', { class: 'betrag-mittel', text: euro(B) })
      ),
      el('div', {},
        el('div', { class: 'klein', text: 'Ausgegeben' }),
        el('div', { class: 'betrag-mittel ' + (ausgegeben > B ? 'negativ' : ''), text: euro(ausgegeben) })
      )
    ),
    el('div', { class: 'klein ue-tag-rest' },
      'Rest dieses Tages: ',
      el('span', { class: B - ausgegeben < 0 ? 'negativ' : 'positiv', text: euro(B - ausgegeben) })
    ),
    el('div', { class: 'abschnitt', text: 'Buchungen' }),
    buchungen.length
      ? el('div', { class: 'liste' }, buchungen.map(b => {
        const kat = kategorieVon(d, b.kategorie);
        return el('button', {
          type: 'button', class: 'listen-zeile',
          onclick: () => { blatt.schliessen(); buchungSheet(ctx, b); }
        },
          el('span', { class: 'symbol-kreis', 'aria-hidden': 'true', text: kat.emoji }),
          el('span', { class: 'text' },
            el('div', { class: 'titelzeile', text: b.name }),
            el('div', { class: 'klein', text: ART_TEXT[b.art] + (b.notiz && b.notiz !== b.name ? ' · ' + b.notiz : '') })
          ),
          el('span', { class: 'betrag ' + (b.art === 'einnahme' ? 'positiv' : (b.betrag ? 'negativ' : 'klein')), text: betragZeichen(b) })
        );
      }))
      : el('div', { class: 'karte leer klein', text: 'An diesem Tag ist nichts gebucht.' })
  ));
}

// ---------- Woche ----------

// Schönste Stufe (1, 2 oder 5 mal 10er-Potenz), die etwa dem Wert entspricht (Cent)
function niceStufe(v) {
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / mag;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
}

// 2 bis 3 Hilfslinien unter dem Höchstwert (Cent), Vielfache einer Stufe
function hilfslinien(hoch) {
  const zaehle = (s) => {
    const r = [];
    for (let k = 1; k * s <= hoch && r.length < 3; k++) r.push(k * s);
    return r;
  };
  const stufe = niceStufe(hoch / 3);
  const werte = zaehle(stufe);
  return werte.length >= 2 ? werte : zaehle(stufe / 2);
}

// Ganze Euro für Achse und Balkenwerte (Cent in, Text aus)
function ganzEuro(cent) {
  return zahl(Math.round(cent / 100));
}

// anker: Tag, dessen Woche gezeigt wird. Zeigt Balken pro Tag gegen das Tagesbudget.
function wochenKarte(ctx, zr, anker, titel) {
  const d = ctx.daten;
  const heute = ctx.heute;
  const montag = L.wochenbeginn(anker);
  const tageWerte = [];
  for (let i = 0; i < 7; i++) {
    const datum = L.datumPlusTage(montag, i);
    const im = istImZeitraum(datum, zr);
    tageWerte.push({
      datum,
      im,
      zukunft: datum > heute,
      ausgegeben: im ? L.ausgabenAm(d, datum) : 0,
      B: im ? L.tagesbudget(d, datum) : 0
    });
  }

  const LINKS = 46;
  const RECHTS = 296;
  const OBEN = 26;
  const UNTEN = 176;
  const HOEHE = 214;
  const spalte = (RECHTS - LINKS) / 7;
  const breite = Math.min(22, spalte * 0.6);

  const werte = tageWerte.filter(t => t.im).flatMap(t => [t.ausgegeben, t.B]).concat([0]);
  const hoch = Math.max(1000, ...werte); // mindestens 10 € Skala
  const tief = Math.min(0, ...werte);
  const y = (v) => OBEN + ((hoch - v) / (hoch - tief)) * (UNTEN - OBEN);
  const y0 = y(0);
  const mitte = (i) => LINKS + spalte * i + spalte / 2;

  const info = el('div', { class: 'st12-info klein', 'aria-live': 'polite', text: 'Tippe auf einen Balken für Datum, Ausgaben und Budget.' });
  const infoText = (t) => {
    const k = langDatum(t.datum);
    if (!t.im) return `${k}: nicht im Zeitraum`;
    if (t.zukunft) return `${k}: noch offen, Budget ${euro(t.B)}`;
    return `${k}: ausgegeben ${euro(t.ausgegeben)}, Budget ${euro(t.B)}`;
  };

  const kinder = [];
  for (const v of hilfslinien(hoch)) {
    kinder.push(svg('line', { x1: LINKS, x2: RECHTS, y1: y(v).toFixed(1), y2: y(v).toFixed(1), class: 'st12-achse' }));
    kinder.push(svg('text', { x: LINKS - 6, y: (y(v) + 4).toFixed(1), 'text-anchor': 'end', class: 'st12-achsentext' }, ganzEuro(v) + ' €'));
  }
  kinder.push(svg('line', { x1: LINKS, x2: RECHTS, y1: y0.toFixed(1), y2: y0.toFixed(1), class: 'st12-nulllinie' }));
  kinder.push(svg('text', { x: LINKS - 6, y: (y0 + 4).toFixed(1), 'text-anchor': 'end', class: 'st12-achsentext' }, '0 €'));

  tageWerte.forEach((t, i) => {
    const m = mitte(i);
    const x0 = m - breite / 2;
    const gruppe = svg('g', { class: 'st12-tag' });
    if (t.im && t.zukunft) {
      const oben = Math.min(y(t.B), y0);
      const h = Math.max(2, Math.abs(y(t.B) - y0));
      gruppe.append(svg('rect', { x: x0.toFixed(1), y: oben.toFixed(1), width: breite.toFixed(1), height: h.toFixed(1), rx: 4, class: 'st12-zukunft' }));
    } else if (t.im) {
      const ueber = t.ausgegeben > t.B;
      const oben = Math.min(y(t.ausgegeben), y0);
      const h = Math.max(2, Math.abs(y(t.ausgegeben) - y0));
      gruppe.append(svg('rect', { x: x0.toFixed(1), y: oben.toFixed(1), width: breite.toFixed(1), height: h.toFixed(1), rx: 4, class: ueber ? 'st12-drueber' : 'st12-gut' }));
      gruppe.append(svg('text', { x: m.toFixed(1), y: (y(t.ausgegeben) - 5).toFixed(1), 'text-anchor': 'middle', class: 'st12-balkenwert' }, ganzEuro(t.ausgegeben)));
    }
    if (t.im) {
      gruppe.append(svg('line', { x1: (x0 - 4).toFixed(1), x2: (x0 + breite + 4).toFixed(1), y1: y(t.B).toFixed(1), y2: y(t.B).toFixed(1), class: 'st12-budget' }));
    }
    const heuteTag = t.datum === heute;
    if (heuteTag) {
      gruppe.append(svg('rect', { x: (m - 16).toFixed(1), y: HOEHE - 30, width: 32, height: 20, rx: 10, class: 'st12-heute-hinter' }));
    }
    gruppe.append(svg('text', { x: m.toFixed(1), y: HOEHE - 16, 'text-anchor': 'middle', class: 'st12-tagname' + (heuteTag ? ' heute' : '') + (t.im ? '' : ' aus') }, WOCHENTAGE[i]));
    // Trefferfläche über der ganzen Spalte, zuletzt, damit sie oben liegt
    const treffer = svg('rect', { x: (LINKS + spalte * i).toFixed(1), y: 0, width: spalte.toFixed(1), height: HOEHE, class: 'st12-treffer', role: 'button', tabindex: 0, 'aria-label': infoText(t) });
    const zeige = () => { info.textContent = infoText(t); };
    treffer.addEventListener('click', zeige);
    treffer.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zeige(); } });
    gruppe.append(treffer);
    kinder.push(gruppe);
  });

  const chart = svg('svg', { viewBox: `0 0 300 ${HOEHE}`, class: 'st12-svg', role: 'img', 'aria-label': 'Ausgaben der Woche gegen das Tagesbudget' }, ...kinder);

  const w = L.woche(d, anker);
  return el('section', { class: 'karte' },
    el('h2', { class: 'st12-titel', text: titel }),
    el('p', { class: 'klein st12-erklaer', text: 'Balken = deine Ausgaben pro Tag, gestrichelte Linie = dein Tagesbudget' }),
    chart,
    info,
    el('div', { class: 'st12-legende klein' },
      el('span', {}, el('span', { class: 'st12-muster gut' }), 'im Budget'),
      el('span', {}, el('span', { class: 'st12-muster drueber' }), 'über dem Budget'),
      el('span', {}, el('span', { class: 'st12-muster zukunft' }), 'kommt noch'),
      el('span', {}, el('span', { class: 'st12-muster linie' }), 'Tagesbudget')
    ),
    el('div', { class: 'ue-woche-werte' },
      el('div', {},
        el('div', { class: 'klein', text: 'Wochenbudget' }),
        el('div', { class: 'ue-zahl', text: euro(w.W) })
      ),
      el('div', {},
        el('div', { class: 'klein', text: 'Ausgegeben' }),
        el('div', { class: 'ue-zahl', text: euro(w.ausgegeben) })
      ),
      el('div', {},
        el('div', { class: 'klein', text: 'Rest' }),
        el('div', { class: 'ue-zahl ' + (w.rest < 0 ? 'negativ' : 'positiv'), text: euro(w.rest) })
      )
    )
  );
}

// ---------- Kategorien ----------

function kategorieKarte(d, zr) {
  const summen = new Map();
  for (const b of d.buchungen || []) {
    if (b.art !== 'ausgabe' || !istImZeitraum(b.datum, zr)) continue;
    summen.set(b.kategorie, (summen.get(b.kategorie) || 0) + b.betrag);
  }
  const liste = [...summen].filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  if (!liste.length) return el('section', { class: 'karte leer klein', text: 'Im Zeitraum sind noch keine Ausgaben eingetragen.' });

  const gesamt = liste.reduce((s, [, c]) => s + c, 0);
  const groesster = liste[0][1];
  return el('section', { class: 'karte' }, liste.map(([id, cent]) => {
    const kat = kategorieVon(d, id);
    const anteil = cent / groesster;
    return el('div', { class: 'ue-kat' },
      el('div', { class: 'ue-kat-kopf' },
        el('span', { class: 'ue-kat-name', text: `${kat.emoji} ${kat.name}` }),
        el('span', { class: 'ue-zahl', text: euro(cent) + ' · ' + prozent(cent / gesamt) })
      ),
      svg('svg', { viewBox: '0 0 100 10', preserveAspectRatio: 'none', class: 'ue-bar', role: 'img', 'aria-label': `${kat.name}: ${euro(cent)}` },
        svg('rect', { x: 0, y: 0, width: 100, height: 10, rx: 0, class: 'ue-bar-spur' }),
        svg('rect', { x: 0, y: 0, width: (anteil * 100).toFixed(2), height: 10, class: 'ue-bar-fill' })
      )
    );
  }));
}

// ---------- Vergleich ----------

// Einnahmen und Ausgaben gesamt eines Zeitraums. Ausgaben: variable Ausgaben plus Fixkosten,
// Verträge und einmalige Fixkosten. Rücklagen und Sparziele zählen nicht als Ausgabe.
function kennzahlenVon(d, z) {
  const vb = L.verfuegbar(d, z);
  let einnahmen = 0;
  let fix = 0;
  for (const p of vb.posten) {
    if (p.art === 'einnahme') einnahmen += p.betrag;
    if (p.art === 'fixkosten') fix += -p.betrag;
  }
  const ausgaben = L.ausgabenZwischen(d, z.start, z.ende) + fix;
  return { einnahmen, ausgaben, quote: einnahmen > 0 ? (einnahmen - ausgaben) / einnahmen : null };
}

function vergleichKarte(d, zr) {
  const untergrenze = (d.einstellungen && d.einstellungen.startDatum) || '0000-00-00';
  const frueher = [];
  let ende = L.datumPlusTage(zr.start, -1);
  for (let i = 0; i < 3; i++) {
    const z = L.zeitraum(d, ende);
    if (z.start < untergrenze) break;
    frueher.push(z);
    ende = L.datumPlusTage(z.start, -1);
  }

  if (!frueher.length) {
    return el('section', { class: 'karte leer klein', text: 'Noch kein abgeschlossener Zeitraum seit dem Startdatum.' });
  }

  return el('section', { class: 'karte ue-vergleich' },
    el('div', { class: 'ue-vgl-zeile ue-vgl-kopf klein' },
      el('span', { text: 'Zeitraum' }),
      el('span', { class: 'ue-vgl-zahl', text: 'Ausgaben' }),
      el('span', { class: 'ue-vgl-zahl', text: 'Sparquote' })
    ),
    frueher.map(z => {
      const k = kennzahlenVon(d, z);
      return el('div', { class: 'ue-vgl-zeile' },
        el('span', { text: `${kurzDatum(z.start)} bis ${kurzDatum(z.ende)}` }),
        el('span', { class: 'ue-vgl-zahl ue-zahl', text: euro(k.ausgaben) }),
        el('span', { class: 'ue-vgl-zahl ue-zahl ' + (k.quote === null ? 'klein' : (k.quote < 0 ? 'negativ' : 'positiv')), text: k.quote === null ? 'keine Einnahmen' : prozent(k.quote) })
      );
    }),
    el('div', { class: 'klein ue-vgl-fuss', text: 'Sparquote: (Einnahmen minus Ausgaben) geteilt durch Einnahmen. Rücklagen und Sparziele zählen nicht als Ausgaben.' })
  );
}

// ---------- Buchungsliste mit Filter ----------

function buchungenKarte(ctx, zr) {
  const d = ctx.daten;
  const liste = (d.buchungen || []).filter(b => istImZeitraum(b.datum, zr)).reverse()
    .sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0));

  if (!liste.length) return el('section', { class: 'karte leer klein', text: 'In diesem Zeitraum ist noch nichts gebucht.' });

  const katIds = [...new Set(liste.map(b => b.kategorie))];
  let filter = null;
  const chips = el('div', { class: 'chips ue-filter', role: 'group', 'aria-label': 'Nach Kategorie filtern' });
  const liste_el = el('div', { class: 'liste' });

  function zeileFuer(b) {
    const kat = kategorieVon(d, b.kategorie);
    const info = `${kurzDatum(b.datum)} · ${ART_TEXT[b.art]}` + (b.notiz && b.notiz !== b.name ? ' · ' + b.notiz : '');
    return el('button', { type: 'button', class: 'listen-zeile', onclick: () => buchungSheet(ctx, b) },
      el('span', { class: 'symbol-kreis', 'aria-hidden': 'true', text: kat.emoji }),
      el('span', { class: 'text' },
        el('div', { class: 'titelzeile', text: b.name }),
        el('div', { class: 'klein', text: info })
      ),
      el('span', { class: 'betrag ' + (b.art === 'einnahme' ? 'positiv' : (b.betrag ? 'negativ' : 'klein')), text: betragZeichen(b) })
    );
  }

  function listeZeichnen() {
    const sichtbar = filter ? liste.filter(b => b.kategorie === filter) : liste;
    liste_el.replaceChildren(...(sichtbar.length
      ? sichtbar.map(zeileFuer)
      : [el('div', { class: 'listen-zeile klein', text: 'Keine Buchungen in dieser Kategorie.' })]));
    chips.querySelectorAll('[data-kat]').forEach(b => b.classList.toggle('aktiv', (b.dataset.kat || null) === filter));
  }

  const alleChip = el('button', { type: 'button', class: 'chip', 'data-kat': '', text: 'Alle', onclick: () => { filter = null; listeZeichnen(); } });
  chips.append(alleChip, ...katIds.map(id => {
    const kat = kategorieVon(d, id);
    return el('button', { type: 'button', class: 'chip', 'data-kat': id, text: `${kat.emoji} ${kat.name}`, onclick: () => { filter = id; listeZeichnen(); } });
  }));
  listeZeichnen();

  return el('section', {}, chips, liste_el);
}

// Sheet für eine Buchung: Ansicht mit Bearbeiten und Löschen (Rückfrage).
// Bearbeiten ersetzt den Inhalt des Sheets durch ein Formular, Speichern ersetzt die Buchung mit gleicher id.
function buchungSheet(ctx, b) {
  const inhalt = el('div', {});
  const blatt = ctx.sheet(inhalt);
  // Der Eintrag „Nichts ausgegeben“ (0 Euro) ist nur löschbar
  const nichtsEintrag = b.betrag === 0 && b.notiz === NICHTS;

  function ansicht() {
    const kat = kategorieVon(ctx.daten, b.kategorie);
    // replaceChildren macht aus null den Text „null“, daher nur echte Elemente übergeben
    inhalt.replaceChildren(...[
      el('div', { class: 'klein', text: `${ART_TEXT[b.art]} · ${langDatum(b.datum)} · ${kat.emoji} ${kat.name}` }),
      el('h2', { class: 'dialog-titel', text: b.name }),
      el('div', { class: 'betrag-mittel ' + (b.art === 'einnahme' ? 'positiv' : (b.betrag ? 'negativ' : '')), text: betragZeichen(b) }),
      b.notiz && b.notiz !== b.name ? el('p', { class: 'klein', text: b.notiz }) : null,
      el('div', { class: 'aktionen' },
        nichtsEintrag ? null : el('button', {
          type: 'button', class: 'knopf knopf-primaer knopf-voll', text: 'Bearbeiten',
          onclick: () => formular()
        }),
        el('button', {
          type: 'button', class: 'knopf knopf-gefahr knopf-voll', text: 'Löschen',
          onclick: async () => {
            blatt.schliessen();
            const ok = await ctx.dialog({
              titel: 'Buchung löschen?',
              text: `„${b.name}“ über ${euro(b.betrag)} wird entfernt.`,
              knoepfe: [
                { text: 'Abbrechen', wert: false, art: 'leise' },
                { text: 'Löschen', wert: true, art: 'gefahr' }
              ]
            });
            if (ok === true) {
              ctx.speichern({ ...ctx.daten, buchungen: ctx.daten.buchungen.filter(x => x.id !== b.id) });
              ctx.toast('Buchung gelöscht.');
            }
          }
        })
      )
    ].filter(Boolean));
  }

  function formular() {
    const z = { art: b.art, betrag: betragText(b.betrag), kategorie: b.kategorie, notiz: b.notiz || '', datum: b.datum };

    const artKnoepfe = ARTEN.map(([k, t]) => el('button', {
      type: 'button', 'data-art': k, text: t,
      onclick: () => { z.art = k; markiere(); }
    }));
    const betragFeld = el('input', {
      class: 'feld feld-betrag', type: 'text', inputmode: 'decimal', placeholder: '0,00 €',
      autocomplete: 'off', value: z.betrag,
      oninput: (e) => { z.betrag = e.target.value; }
    });
    // Kategorie gibt es bei Einnahmen nicht, dort bleibt die bisherige Kategorie unverändert gespeichert
    const katChips = el('div', { class: 'chips' }, ctx.daten.kategorien.map(k => el('button', {
      type: 'button', class: 'chip', 'data-kat': k.id, text: `${k.emoji} ${k.name}`,
      onclick: () => { z.kategorie = k.id; markiere(); }
    })));
    const katZeile = el('div', { class: 'bu11-kat' },
      el('div', { class: 'beschriftung', text: 'Kategorie' }),
      katChips
    );
    const notizFeld = el('input', {
      class: 'feld', type: 'text', placeholder: 'z. B. Wocheneinkauf', maxlength: 80,
      autocomplete: 'off', value: z.notiz,
      oninput: (e) => { z.notiz = e.target.value; }
    });
    const datumFeld = el('input', {
      class: 'feld datum-feld', type: 'date', value: z.datum,
      onchange: (e) => { z.datum = e.target.value; }
    });
    const fehlerZeile = el('div', { class: 'klein negativ bu11-fehler', role: 'alert' });

    function markiere() {
      artKnoepfe.forEach(k => k.classList.toggle('aktiv', k.dataset.art === z.art));
      katZeile.hidden = z.art === 'einnahme';
      katChips.querySelectorAll('[data-kat]').forEach(k => k.classList.toggle('aktiv', k.dataset.kat === z.kategorie));
    }

    function speichernen() {
      fehlerZeile.textContent = '';
      const cent = parseBetrag(z.betrag);
      if (cent === null) {
        fehlerZeile.textContent = 'Bitte einen Betrag eingeben, zum Beispiel 12,50.';
        betragFeld.focus();
        return;
      }
      if (cent <= 0) {
        fehlerZeile.textContent = 'Der Betrag muss über 0 liegen.';
        betragFeld.focus();
        return;
      }
      if (!gueltigesDatum(z.datum)) {
        fehlerZeile.textContent = 'Bitte ein gültiges Datum wählen.';
        datumFeld.focus();
        return;
      }
      const aktuell = ctx.daten.buchungen || [];
      if (!aktuell.some(x => x.id === b.id)) {
        ctx.toast('Diese Buchung gibt es nicht mehr.');
        blatt.schliessen();
        return;
      }
      const notiz = z.notiz.trim();
      const kat = kategorieVon(ctx.daten, z.kategorie);
      const eintrag = {
        id: b.id, art: z.art, name: notiz || kat.name, betrag: cent,
        datum: z.datum, kategorie: z.kategorie, notiz
      };
      blatt.schliessen();
      ctx.speichern({ ...ctx.daten, buchungen: aktuell.map(x => (x.id === b.id ? eintrag : x)) });
      ctx.toast('Buchung geändert: ' + euro(cent));
    }

    inhalt.replaceChildren(
      el('h2', { class: 'dialog-titel', text: 'Buchung bearbeiten' }),
      el('div', { class: 'reiter', role: 'tablist' }, artKnoepfe),
      el('div', { class: 'beschriftung', text: 'Betrag' }),
      betragFeld,
      katZeile,
      el('div', { class: 'beschriftung', text: 'Notiz (optional)' }),
      notizFeld,
      el('div', { class: 'beschriftung', text: 'Datum' }),
      datumFeld,
      fehlerZeile,
      el('div', { class: 'aktionen' },
        el('button', { type: 'button', class: 'knopf knopf-primaer knopf-voll', text: 'Änderung speichern', onclick: speichernen }),
        el('button', { type: 'button', class: 'knopf knopf-leise knopf-voll', text: 'Abbrechen', onclick: () => ansicht() })
      )
    );
    markiere();
  }

  ansicht();
}
