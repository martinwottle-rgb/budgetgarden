// Bildschirm Übersicht nach UI.md Abschnitt 3: Zeitraum, Kalender, Woche, Kategorien,
// Vergleich mit früheren Zeiträumen und die Buchungsliste mit Kategorie-Filter.
// Alle Zahlen kommen aus logik.js, nichts wird hier neu gerechnet außer den Auswertungen.

import * as L from '../logik.js';
import { el, euro, balken, kategorieVon, kurzDatum, langDatum } from './bausteine.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const ART_TEXT = { ausgabe: 'Ausgabe', einnahme: 'Einnahme', fixkosten: 'Fixkosten' };

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

export function zeige(container, ctx) {
  const d = ctx.daten;
  const heute = ctx.heute;
  const zr = L.zeitraum(d, heute);
  const vb = L.verfuegbar(d, zr);
  const ausgegeben = L.ausgabenZwischen(d, zr.start, zr.ende);
  const tagesInfo = L.heute(d, heute);

  container.append(
    el('h1', { class: 'titel', text: 'Übersicht' }),
    zeitraumKarte(zr, vb, ausgegeben, heute, tagesInfo),
    el('div', { class: 'abschnitt', text: 'Kalender dieses Zeitraums' }),
    kalenderKarte(ctx, zr, heute),
    el('div', { class: 'abschnitt', text: 'Diese Woche' }),
    wochenKarte(ctx, zr, heute),
    el('div', { class: 'abschnitt', text: 'Ausgaben nach Kategorie' }),
    kategorieKarte(d, zr),
    el('div', { class: 'abschnitt', text: 'Vergleich mit früheren Zeiträumen' }),
    vergleichKarte(d, zr),
    el('div', { class: 'abschnitt', text: 'Buchungen dieses Zeitraums' }),
    buchungenKarte(ctx, zr)
  );
}

// ---------- Zeitraum ----------

function zeitraumKarte(zr, vb, ausgegeben, heute, tagesInfo) {
  const rest = vb.V - ausgegeben;
  const tagNr = L.tageZwischen(zr.start, heute) + 1;

  const posten = el('div', { class: 'ue-posten' }, vb.posten.map(p => el('div', { class: 'ue-posten-zeile' },
    el('span', { text: p.name }),
    el('span', { class: 'ue-zahl ' + (p.betrag < 0 ? 'negativ' : 'positiv'), text: (p.betrag > 0 ? '+' : '') + euro(p.betrag) })
  )));

  return el('section', { class: 'karte ue-zeitraum' },
    el('div', { class: 'klein', text: 'Zeitraum' }),
    el('div', { class: 'ue-zeitraum-titel', text: `${datumLang(zr.start)} bis ${datumLang(zr.ende)}` }),
    el('div', { class: 'klein', text: `Tag ${tagNr} von ${zr.tage}` }),
    el('details', { class: 'ue-details' },
      el('summary', { class: 'ue-summe' },
        el('span', { text: 'Verfügbar' }),
        el('span', { class: 'ue-zahl', text: euro(vb.V) })
      ),
      posten
    ),
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
    el('div', { class: 'ue-heute klein' },
      `Heute: Tagesbudget ${euro(tagesInfo.B)}, Rest heute `,
      el('span', { class: tagesInfo.rest < 0 ? 'negativ' : 'positiv', text: euro(tagesInfo.rest) }),
      '.'
    )
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

  ctx.sheet(el('div', {},
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
        return el('div', { class: 'listen-zeile ue-zeile-statisch' },
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

function wochenKarte(ctx, zr, heute) {
  const d = ctx.daten;
  const montag = L.wochenbeginn(heute);
  const tageWerte = [];
  for (let i = 0; i < 7; i++) {
    const datum = L.datumPlusTage(montag, i);
    const im = istImZeitraum(datum, zr);
    tageWerte.push({
      datum,
      im,
      ausgegeben: im ? L.ausgabenAm(d, datum) : 0,
      B: im ? L.tagesbudget(d, datum) : 0
    });
  }

  // Skala: alles, was im Zeitraum liegt, plus Null
  const werte = tageWerte.filter(t => t.im).flatMap(t => [t.ausgegeben, t.B]).concat([0]);
  const hoch = Math.max(...werte);
  const tief = Math.min(...werte);
  const spanne = hoch - tief || 1;

  const BREITE = 320;
  const HOEHE = 170;
  const OBEN = 12;
  const UNTEN = 130;
  const spalte = BREITE / 7;
  const y = (v) => OBEN + ((hoch - v) / spanne) * (UNTEN - OBEN);
  const y0 = y(0);

  const tagGruppen = [];
  const linie = [];
  tageWerte.forEach((t, i) => {
    const mitte = spalte * i + spalte / 2;
    const breite = 26;
    const gruppe = svg('g', {});
    gruppe.append(svg('title', {}, document.createTextNode(
      t.im ? `${WOCHENTAGE[i]} ${kurzDatum(t.datum)}: ausgegeben ${euro(t.ausgegeben)}, Budget ${euro(t.B)}` : `${WOCHENTAGE[i]} ${kurzDatum(t.datum)}: nicht im Zeitraum`
    )));
    if (t.im) {
      const ueber = t.ausgegeben > t.B;
      if (t.ausgegeben !== 0) {
        const oben = Math.min(y(t.ausgegeben), y0);
        const h = Math.max(2, Math.abs(y(t.ausgegeben) - y0));
        gruppe.append(svg('rect', {
          x: (mitte - breite / 2).toFixed(1), y: oben.toFixed(1), width: breite, height: h.toFixed(1), rx: 6,
          class: 'ue-saeule ' + (ueber ? 'drueber' : 'gut')
        }));
      }
      linie.push(`${mitte.toFixed(1)},${y(t.B).toFixed(1)}`);
      gruppe.append(svg('circle', { cx: mitte.toFixed(1), cy: y(t.B).toFixed(1), r: 3.5, class: 'ue-budget-punkt' }));
    }
    tagGruppen.push(gruppe);
  });

  const chart = svg('svg', { viewBox: `0 0 ${BREITE} ${HOEHE}`, class: 'ue-woche', role: 'img', 'aria-label': 'Ausgaben der Woche gegen das Tagesbudget' },
    svg('line', { x1: 0, x2: BREITE, y1: y0.toFixed(1), y2: y0.toFixed(1), class: 'ue-nulllinie' }),
    ...tagGruppen,
    linie.length > 1 ? svg('polyline', { points: linie.join(' '), class: 'ue-budget-linie' }) : null,
    ...tageWerte.map((t, i) => svg('text', {
      x: (spalte * i + spalte / 2).toFixed(1), y: HOEHE - 18, 'text-anchor': 'middle',
      class: 'ue-tag-beschriftung' + (t.datum === heute ? ' heute' : '') + (t.im ? '' : ' aus')
    }, document.createTextNode(WOCHENTAGE[i]))),
    ...tageWerte.map((t, i) => svg('text', {
      x: (spalte * i + spalte / 2).toFixed(1), y: HOEHE - 4, 'text-anchor': 'middle',
      class: 'ue-tag-datum' + (t.im ? '' : ' aus')
    }, document.createTextNode(Number(t.datum.slice(8)).toString())))
  );

  const w = L.woche(d, heute);
  return el('section', { class: 'karte' },
    chart,
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
    ),
    el('div', { class: 'ue-legende klein' },
      el('span', { class: 'ue-punkt gut' }), ' im Budget',
      el('span', { class: 'ue-punkt drueber' }), ' drüber',
      el('span', { class: 'ue-linie-probe' }), ' Tagesbudget'
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

// Sheet für eine Buchung mit Löschen (Rückfrage)
function buchungSheet(ctx, b) {
  const kat = kategorieVon(ctx.daten, b.kategorie);
  const sheet = ctx.sheet(el('div', {},
    el('div', { class: 'klein', text: `${ART_TEXT[b.art]} · ${langDatum(b.datum)} · ${kat.emoji} ${kat.name}` }),
    el('h2', { class: 'dialog-titel', text: b.name }),
    el('div', { class: 'betrag-mittel ' + (b.art === 'einnahme' ? 'positiv' : (b.betrag ? 'negativ' : '')), text: betragZeichen(b) }),
    b.notiz && b.notiz !== b.name ? el('p', { class: 'klein', text: b.notiz }) : null,
    el('div', { class: 'aktionen' },
      el('button', {
        type: 'button', class: 'knopf knopf-gefahr knopf-voll', text: 'Löschen',
        onclick: async () => {
          sheet.schliessen();
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
  ));
}
