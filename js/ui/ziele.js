// Bildschirm Ziele & Verträge nach UI.md Abschnitt 4: Sparziele, Verträge und regelmäßige Einnahmen,
// freie Rücklagen, Gehalt und die Abzeichen-Wand. Änderungen gehen immer über ctx.speichern.

import * as L from '../logik.js';
import { neueId } from '../speicher.js';
import { ABZEICHEN, sparzielPflanzen } from '../spiel.js';
import { PFLANZEN } from '../grafik/pflanzen.js';
import * as G_PFLANZEN2 from '../grafik/pflanzen2.js';
import { vorschau, einpassen } from '../szene.js';
import { el, euro, parseBetrag, betragText } from './bausteine.js';

const VERTRAG_KATEGORIEN = ['Wohnen', 'Versicherung', 'Abos', 'Mobilität', 'Kommunikation', 'Sonstiges'];
const INTERVALLE = [[1, 'monatlich'], [3, 'vierteljährlich'], [6, 'halbjährlich'], [12, 'jährlich']];
const INTERVALL_TEXT = Object.fromEntries(INTERVALLE);
const DATUM_RE = /^\d{4}-\d{2}-\d{2}$/;

// Alle gezeichneten Topfpflanzen (SPEC-2: pflanzen2.js dazu)
const PFLANZEN_ALLE = { ...PFLANZEN, ...(G_PFLANZEN2.PFLANZEN2 || {}) };

// Feste Auswahl nur für ältere Sparziele ohne gespeicherte Pflanze (stabil nach id, nicht nach Level)
const ALTE_SPAR_PFLANZEN = ['zitrone', 'monstera', 'sonnenblume', 'kletterrose', 'geigenfeige', 'bonsai', 'orchidee', 'erdbeere'];

export function zeige(container, ctx) {
  container.append(
    el('h1', { class: 'titel', text: 'Ziele & Verträge' }),
    el('div', { class: 'abschnitt', text: 'Sparziele' }),
    sparzieleBereich(ctx),
    el('div', { class: 'abschnitt', text: 'Verträge & regelmäßige Einnahmen' }),
    vertraegeBereich(ctx),
    el('div', { class: 'abschnitt', text: 'Freie Rücklagen' }),
    ruecklagenBereich(ctx),
    el('div', { class: 'abschnitt', text: 'Gehalt' }),
    gehaltBereich(ctx),
    el('div', { class: 'abschnitt', text: 'Abzeichen' }),
    abzeichenBereich(ctx)
  );
  einpassen(container);
}

// ---------- Kleine Helfer ----------

function datumLang(iso) {
  const [j, m, t] = iso.split('-');
  return t + '.' + m + '.' + j;
}

function aktionKnopf(text, art, onclick) {
  return el('button', { type: 'button', class: 'knopf ' + art + ' knopf-voll', text, onclick });
}

function beschriftung(text) {
  return el('div', { class: 'beschriftung', text });
}

// Auswahl als Chips (Standard) oder als Segment (reiter). Gibt das Element zurück, aendern(wert) wird bei Tippen gerufen.
function auswahl(optionen, wert, aendern, reiter = false) {
  const knoepfe = optionen.map(([w, t]) => el('button', {
    type: 'button', class: reiter ? '' : 'chip', text: t,
    onclick: () => {
      aendern(w);
      knoepfe.forEach((k, i) => k.classList.toggle('aktiv', optionen[i][0] === w));
    }
  }));
  knoepfe.forEach((k, i) => k.classList.toggle('aktiv', optionen[i][0] === wert));
  return reiter ? el('div', { class: 'reiter', role: 'group' }, knoepfe) : el('div', { class: 'chips' }, knoepfe);
}

// Bestätigung mit Abbrechen und rotem Knopf. Gibt true oder false zurück.
async function bestaetigen(ctx, titel, text, knopf) {
  const ok = await ctx.dialog({
    titel,
    text,
    knoepfe: [
      { text: 'Abbrechen', wert: false, art: 'leise' },
      { text: knopf, wert: true, art: 'gefahr' }
    ]
  });
  return ok === true;
}

// Fortschritt in Prozent, ohne die Überschreitung rot zu färben (Ziel erreicht ist gut)
function fortschritt(anteil) {
  const p = Math.max(0, Math.min(100, anteil * 100));
  return el('div', { class: 'balken', role: 'img', 'aria-label': `${Math.round(p)} Prozent erreicht` },
    el('span', { style: 'width:' + p.toFixed(1) + '%' })
  );
}

// Nächste Fälligkeit ab heute, null wenn keine mehr kommt (beendet oder ohne Termin in den nächsten 24 Monaten)
function naechsteFaelligkeit(v, heute) {
  return L.faelligkeiten(v, heute, L.datumPlusMonate(heute, 24))[0] || null;
}

// Volle Kalendermonate seit der letzten Fälligkeit (oder seit dem Beginn der Rücklage, wenn noch keine war)
function monateSeitLetzter(v, heute) {
  const vergangen = L.faelligkeiten(v, '0000-01-01', heute);
  const ref = vergangen.length ? vergangen[vergangen.length - 1] : L.datumPlusMonate(v.ersteFaelligkeit, -(v.intervall || 1));
  const [rj, rm] = ref.split('-').map(Number);
  const [hj, hm] = heute.split('-').map(Number);
  return Math.max(0, (hj * 12 + hm) - (rj * 12 + rm));
}

// ---------- Sparziele ----------

function sparzieleBereich(ctx) {
  const liste = ctx.daten.sparziele || [];
  return el('div', {},
    liste.length
      ? el('div', { class: 'zi-karten' }, liste.map(s => sparzielKarte(ctx, s)))
      : el('section', { class: 'karte leer klein', text: 'Noch kein Sparziel. Ein Sparziel legt jeden Monat einen festen Betrag zurück.' }),
    aktionKnopf('+ Sparziel anlegen', 'knopf-primaer', () => sparzielSheet(ctx, null))
  );
}

// Deterministische Zahl aus einer id
function hashVon(text) {
  let summe = 0;
  for (const zeichen of String(text || '')) summe = (summe * 31 + zeichen.charCodeAt(0)) >>> 0;
  return summe;
}

// Pflanze eines Sparziels. Ohne Feld pflanze (ältere Ziele): deterministisch nach id aus ALTE_SPAR_PFLANZEN.
// Die Karte zeigt eine gespeicherte Pflanze auch dann, wenn sie nicht mehr kaufbar ist (Sheet ersetzt sie).
function pflanzeVon(s) {
  if (s.pflanze && PFLANZEN_ALLE[s.pflanze]) return s.pflanze;
  return ALTE_SPAR_PFLANZEN[hashVon(s.id) % ALTE_SPAR_PFLANZEN.length];
}

// Stufe 1 bis 4: mit Zielsumme nach Anteil, ohne nach Anzahl angesparter Monatsraten
function pflanzenStufe(s) {
  const angespart = s.angespart || 0;
  if (s.zielsumme) {
    const anteil = angespart / s.zielsumme;
    if (anteil < 0.25) return 1;
    if (anteil < 0.5) return 2;
    if (anteil < 1) return 3;
    return 4;
  }
  const raten = s.proMonat > 0 ? Math.floor(angespart / s.proMonat) : 0;
  if (raten < 3) return 1;
  if (raten < 6) return 2;
  if (raten < 12) return 3;
  return 4;
}

// Monate bis zur nächsten Stufe (ohne Zielsumme), null in Stufe 4
function monateBisStufe(s) {
  const raten = s.proMonat > 0 ? Math.floor((s.angespart || 0) / s.proMonat) : 0;
  const naechste = raten < 3 ? 3 : raten < 6 ? 6 : raten < 12 ? 12 : null;
  return naechste === null ? null : naechste - raten;
}

function wachstumsHinweis(s) {
  if (s.zielsumme) return 'Wächst bei 25 %, 50 %, 100 %';
  const monate = monateBisStufe(s);
  if (monate === null) return 'Voll erblüht';
  return `Nächste Stufe in ${monate} ${monate === 1 ? 'Monat' : 'Monaten'}`;
}

// Links auf der Karte: Pflanzenvorschau mit Funkeln in Stufe 4, darunter der Wachstumshinweis
function pflanzenBlock(s, stufe) {
  return el('div', { class: 'zi11-links' },
    el('div', { class: 'zi11-pflanze' },
      vorschau(PFLANZEN_ALLE[pflanzeVon(s)].zeichne(stufe, false, 'boden'), 'zi11-pflanze-bild'),
      stufe === 4 ? [
        el('span', { class: 'zi11-funke f1' }),
        el('span', { class: 'zi11-funke f2' }),
        el('span', { class: 'zi11-funke f3' }),
        el('span', { class: 'zi11-funke f4' }),
        el('span', { class: 'zi11-funke f5' })
      ] : null
    ),
    el('div', { class: 'klein zi11-hinweis', text: wachstumsHinweis(s) })
  );
}

function sparzielKarte(ctx, s) {
  const angespart = s.angespart || 0;
  const erreicht = !!s.zielsumme && angespart >= s.zielsumme;
  return el('section', { class: 'karte zi-sparziel' },
    el('div', { class: 'zi11-karte-oben' },
      pflanzenBlock(s, pflanzenStufe(s)),
      el('div', { class: 'zi-kopf zi11-text' },
        el('div', { class: 'titelzeile', text: s.name }),
        el('div', { class: 'klein', text: `Rate: ${euro(s.proMonat || 0)} pro Monat` })
      )
    ),
    s.zielsumme ? fortschritt(angespart / s.zielsumme) : null,
    el('div', { class: 'zi-werte' },
      s.zielsumme
        ? el('span', { text: `${euro(angespart)} von ${euro(s.zielsumme)}` })
        : el('span', { text: `${euro(angespart)} angespart (ohne Zielsumme)` })
    ),
    erreicht ? el('div', { class: 'zi-erreicht', text: 'Ziel erreicht 🎉' }) : null,
    el('div', { class: 'zi-aktion' },
      el('button', { type: 'button', class: 'knopf knopf-leise', text: 'Bearbeiten', onclick: () => sparzielSheet(ctx, s) })
    )
  );
}

// Auswahl als horizontale Kachelreihe (Stufe 4). liste: [{typ, name}] aus sparzielPflanzen (nur kaufbare Topfpflanzen).
// aendern(typ) wird bei Tippen gerufen.
function pflanzenWahl(liste, gewaehlt, aendern) {
  const kacheln = liste.map(({ typ, name }) => el('button', {
    type: 'button',
    class: 'zi11-kachel' + (typ === gewaehlt ? ' aktiv' : ''),
    'aria-pressed': typ === gewaehlt ? 'true' : 'false',
    'aria-label': name,
    onclick: () => {
      aendern(typ);
      kacheln.forEach((k, i) => {
        const an = liste[i].typ === typ;
        k.classList.toggle('aktiv', an);
        k.setAttribute('aria-pressed', String(an));
      });
    }
  },
  vorschau(PFLANZEN_ALLE[typ].zeichne(4, false, 'boden'), 'zi11-kachel-bild'),
  el('span', { class: 'zi11-kachel-name', text: name })
  ));
  return el('div', { class: 'zi11-kachelreihe', role: 'group', 'aria-label': 'Pflanze wählen' }, kacheln);
}

// Extra einzahlen: betrag wandert ins Sparziel und wird als Fixkosten gebucht, damit er vom Budget abgeht
async function extraEinzahlen(ctx, id, sheetSchliessen) {
  const ziel = (ctx.daten.sparziele || []).find(x => x.id === id);
  if (!ziel) return;
  const betragFeld = el('input', {
    class: 'feld', type: 'text', inputmode: 'decimal', placeholder: '0,00 €', autocomplete: 'off', 'aria-label': 'Betrag'
  });
  const inhalt = el('div', { class: 'zi11-einzahlen' }, beschriftung('Betrag'), betragFeld);
  for (;;) {
    const ok = await ctx.dialog({
      titel: `Extra in ${ziel.name}?`,
      text: 'Der Betrag wird vom aktuellen Budget abgezogen und dem Sparziel gutgeschrieben.',
      inhalt,
      knoepfe: [
        { text: 'Abbrechen', wert: false, art: 'leise' },
        { text: 'Einzahlen', wert: true, art: 'primaer' }
      ]
    });
    if (ok !== true) return;
    const cent = parseBetrag(betragFeld.value);
    if (cent === null || cent <= 0) {
      ctx.toast('Bitte einen Betrag über 0 eingeben, zum Beispiel 50,00.');
      continue;
    }
    const d = ctx.daten;
    const sparziele = (d.sparziele || []).map(x => (x.id === id ? { ...x, angespart: (x.angespart || 0) + cent } : x));
    const buchung = {
      id: neueId('b'), art: 'fixkosten', name: `Extra in ${ziel.name}`, betrag: cent,
      datum: ctx.heute, kategorie: 'sonstiges', notiz: ''
    };
    if (sheetSchliessen) sheetSchliessen();
    ctx.speichern({ ...d, sparziele, buchungen: [...(d.buchungen || []), buchung] });
    ctx.toast(`${euro(cent)} in ${ziel.name} eingezahlt.`);
    return;
  }
}

function sparzielSheet(ctx, original) {
  // Neue Ziele bekommen ihre id schon hier, damit die Vorauswahl der Pflanze daraus folgt
  const neueSparId = original ? null : neueId('s');
  // Nur kaufbare Topfpflanzen. Ein Ziel mit ungültiger Pflanze bekommt beim Öffnen die erste gültige.
  const { pflanzen: auswahl, weitere } = sparzielPflanzen(ctx.daten);
  const gueltig = (typ) => auswahl.some(p => p.typ === typ);
  let pflanze;
  if (original) pflanze = gueltig(pflanzeVon(original)) ? pflanzeVon(original) : (auswahl[0] ? auswahl[0].typ : null);
  else pflanze = auswahl.length ? auswahl[hashVon(neueSparId) % auswahl.length].typ : null;
  const nameFeld = el('input', {
    class: 'feld', type: 'text', placeholder: 'z. B. Urlaub', maxlength: 40, autocomplete: 'off',
    value: original ? original.name : ''
  });
  const rateFeld = el('input', {
    class: 'feld', type: 'text', inputmode: 'decimal', placeholder: '0,00 €', autocomplete: 'off',
    value: original ? betragText(original.proMonat) : ''
  });
  const zielFeld = el('input', {
    class: 'feld', type: 'text', inputmode: 'decimal', placeholder: 'leer lassen für kein Ziel', autocomplete: 'off',
    value: original && original.zielsumme ? betragText(original.zielsumme) : ''
  });
  const fehlerZeile = el('div', { class: 'klein negativ zi-hinweis' });

  function fehler(text, feld) {
    fehlerZeile.textContent = text;
    feld.focus();
  }

  function speichernen() {
    const name = nameFeld.value.trim();
    const rate = parseBetrag(rateFeld.value);
    const hatZiel = zielFeld.value.trim() !== '';
    const ziel = hatZiel ? parseBetrag(zielFeld.value) : null;
    if (!name) return fehler('Bitte einen Namen eingeben.', nameFeld);
    if (rate === null || rate <= 0) return fehler('Bitte eine Rate über 0 eingeben, zum Beispiel 150,00.', rateFeld);
    if (hatZiel && (ziel === null || ziel <= 0)) return fehler('Die Zielsumme muss über 0 liegen oder leer bleiben.', zielFeld);

    const d = ctx.daten;
    const eintrag = original
      ? { ...original, name, proMonat: rate, zielsumme: ziel, pflanze }
      : { id: neueSparId, name, proMonat: rate, zielsumme: ziel, angespart: 0, pflanze };
    const sparziele = original
      ? (d.sparziele || []).map(x => (x.id === original.id ? eintrag : x))
      : [...(d.sparziele || []), eintrag];
    sheet.schliessen();
    ctx.speichern({ ...d, sparziele });
    ctx.toast(original ? 'Sparziel geändert.' : 'Sparziel angelegt.');
  }

  async function loeschen() {
    sheet.schliessen();
    const ok = await bestaetigen(ctx, 'Sparziel löschen?', `„${original.name}“ wird entfernt. Was dort angespart ist, ist dann weg.`, 'Löschen');
    if (!ok) return;
    ctx.speichern({ ...ctx.daten, sparziele: (ctx.daten.sparziele || []).filter(x => x.id !== original.id) });
    ctx.toast('Sparziel gelöscht.');
  }

  const sheet = ctx.sheet(el('div', {},
    el('h2', { class: 'dialog-titel', text: original ? 'Sparziel ändern' : 'Neues Sparziel' }),
    beschriftung('Name'), nameFeld,
    beschriftung('Rate pro Monat'), rateFeld,
    beschriftung('Zielsumme (optional)'), zielFeld,
    beschriftung('Pflanze'), pflanzenWahl(auswahl, pflanze, (k) => { pflanze = k; }),
    weitere ? el('div', { class: 'klein zi11-hinweis', text: 'Weitere Pflanzen ab höherem Level' }) : null,
    fehlerZeile,
    el('div', { class: 'aktionen' },
      aktionKnopf('Speichern', 'knopf-primaer', speichernen),
      original ? aktionKnopf('Löschen', 'knopf-gefahr', loeschen) : null
    ),
    original ? el('div', { class: 'zi11-extra' },
      aktionKnopf('+ Extra einzahlen', 'knopf-leise', () => extraEinzahlen(ctx, original.id, () => sheet.schliessen()))
    ) : null
  ));
  einpassen(sheet.element);
}

// ---------- Verträge und regelmäßige Einnahmen ----------

function vertraegeBereich(ctx) {
  const alle = ctx.daten.vertraege || [];
  const einnahmen = alle.filter(v => v.art === 'einnahme');
  const ausgaben = alle.filter(v => v.art !== 'einnahme');
  return el('div', {},
    gruppe(ctx, 'Einnahmen', einnahmen, 'Keine regelmäßigen Einnahmen eingetragen.'),
    gruppe(ctx, 'Ausgaben und Fixkosten', ausgaben, 'Keine Verträge eingetragen.'),
    aktionKnopf('+ Vertrag oder Einnahme anlegen', 'knopf-primaer', () => vertragSheet(ctx, null))
  );
}

function gruppe(ctx, titel, liste, leerText) {
  return el('div', {},
    el('div', { class: 'zi-gruppe', text: titel }),
    liste.length
      ? el('div', { class: 'liste' }, liste.map(v => vertragZeile(ctx, v)))
      : el('section', { class: 'karte leer klein', text: leerText })
  );
}

function vertragZeile(ctx, v) {
  const heute = ctx.heute;
  const einnahme = v.art === 'einnahme';
  const vorbei = !!v.ende && v.ende < heute;
  const naechste = vorbei ? null : naechsteFaelligkeit(v, heute);
  const rate = L.rundeCent(v.betrag / Math.max(1, v.intervall || 1));
  const mitRuecklage = !einnahme && (v.intervall || 1) > 1 && !vorbei;

  let fuss = 'keine Fälligkeit mehr';
  if (naechste) fuss = 'nächste Fälligkeit: ' + datumLang(naechste);
  else if (vorbei) fuss = 'beendet am ' + datumLang(v.ende);

  return el('button', {
    type: 'button', class: 'listen-zeile zi-vertrag' + (vorbei ? ' gedimmt' : ''),
    onclick: () => vertragSheet(ctx, v)
  },
  el('span', { class: 'text' },
    el('div', { class: 'titelzeile', text: v.name }),
    el('div', { class: 'zi-zeile2' },
      el('span', { class: 'zi-badge', text: INTERVALL_TEXT[v.intervall] || `alle ${v.intervall} Monate` }),
      v.istGehalt ? el('span', { class: 'zi-badge zi-badge-gold', text: 'Gehalt' }) : null,
      el('span', { class: 'klein', text: v.kategorie || 'ohne Kategorie' })
    ),
    el('div', { class: 'klein', text: fuss }),
    v.ende && !vorbei ? el('div', { class: 'klein', text: 'endet am ' + datumLang(v.ende) }) : null,
    mitRuecklage ? el('div', {
      class: 'klein zi-ruecklage',
      text: `Rücklage: ${euro(rate)} pro Monat, angespart seit letzter Fälligkeit: ${euro(rate * monateSeitLetzter(v, heute))}`
    }) : null
  ),
  el('span', { class: 'betrag ' + (einnahme ? 'positiv' : 'negativ'), text: einnahme ? '+' + euro(v.betrag) : euro(-v.betrag) })
  );
}

function vertragSheet(ctx, original) {
  const heute = ctx.heute;
  const z = original
    ? {
      art: original.art,
      intervall: original.intervall || 1,
      kategorie: original.kategorie || 'Sonstiges',
      istGehalt: !!original.istGehalt,
      datum: naechsteFaelligkeit(original, heute) || original.ersteFaelligkeit
    }
    : { art: 'ausgabe', intervall: 1, kategorie: 'Sonstiges', istGehalt: false, datum: heute };
  const vorbei = !!original && !!original.ende && original.ende < heute;

  const nameFeld = el('input', {
    class: 'feld', type: 'text', placeholder: 'z. B. Haftpflicht', maxlength: 40, autocomplete: 'off',
    value: original ? original.name : ''
  });
  const betragFeld = el('input', {
    class: 'feld', type: 'text', inputmode: 'decimal', placeholder: '0,00 €', autocomplete: 'off',
    value: original ? betragText(original.betrag) : ''
  });
  const datumFeld = el('input', { class: 'feld datum-feld', type: 'date', value: z.datum });
  const schalter = el('input', {
    type: 'checkbox', checked: z.istGehalt ? true : null,
    onchange: (e) => { z.istGehalt = e.target.checked; }
  });
  const gehaltBox = el('label', { class: 'zi-schalter' }, schalter, el('span', { text: 'Das ist mein Gehalt' }));
  const fehlerZeile = el('div', { class: 'klein negativ zi-hinweis' });

  const artAuswahl = auswahl([['ausgabe', 'Ausgabe'], ['einnahme', 'Einnahme']], z.art, (w) => {
    z.art = w;
    gehaltBox.hidden = w !== 'einnahme';
  }, true);
  gehaltBox.hidden = z.art !== 'einnahme';

  function fehler(text, feld) {
    fehlerZeile.textContent = text;
    feld.focus();
  }

  function speichernen() {
    const name = nameFeld.value.trim();
    const betrag = parseBetrag(betragFeld.value);
    if (!name) return fehler('Bitte einen Namen eingeben.', nameFeld);
    if (betrag === null || betrag <= 0) return fehler('Bitte einen Betrag über 0 eingeben, zum Beispiel 60,00.', betragFeld);
    if (!DATUM_RE.test(datumFeld.value)) return fehler('Bitte eine nächste Fälligkeit wählen.', datumFeld);

    const d = ctx.daten;
    const eintrag = {
      id: original ? original.id : neueId('v'),
      art: z.art,
      name,
      betrag,
      intervall: z.intervall,
      ersteFaelligkeit: datumFeld.value,
      kategorie: z.kategorie,
      istGehalt: z.art === 'einnahme' && z.istGehalt,
      ende: original ? (original.ende || null) : null
    };
    let vertraege = original
      ? (d.vertraege || []).map(v => (v.id === original.id ? eintrag : v))
      : [...(d.vertraege || []), eintrag];
    // Es gibt nur ein Gehalt: ein neues Gehalt nimmt die Markierung von den anderen
    if (eintrag.istGehalt) {
      vertraege = vertraege.map(v => (v.id !== eintrag.id && v.istGehalt ? { ...v, istGehalt: false } : v));
    }
    sheet.schliessen();
    ctx.speichern({ ...d, vertraege });
    ctx.toast(original ? 'Vertrag geändert.' : 'Vertrag angelegt.');
  }

  async function beenden() {
    sheet.schliessen();
    const ok = await bestaetigen(ctx, 'Vertrag beenden?', `„${original.name}“ endet heute (${datumLang(ctx.heute)}). Spätere Fälligkeiten entfallen.`, 'Beenden');
    if (!ok) return;
    ctx.speichern({
      ...ctx.daten,
      vertraege: (ctx.daten.vertraege || []).map(v => (v.id === original.id ? { ...v, ende: ctx.heute } : v))
    });
    ctx.toast('Vertrag beendet.');
  }

  async function loeschen() {
    sheet.schliessen();
    const ok = await bestaetigen(ctx, 'Vertrag löschen?', `„${original.name}“ wird entfernt. Gebuchte Beträge bleiben erhalten.`, 'Löschen');
    if (!ok) return;
    ctx.speichern({ ...ctx.daten, vertraege: (ctx.daten.vertraege || []).filter(v => v.id !== original.id) });
    ctx.toast('Vertrag gelöscht.');
  }

  const aktionen = [aktionKnopf('Speichern', 'knopf-primaer', speichernen)];
  if (original && !vorbei && !original.ende) aktionen.push(aktionKnopf('Beenden', 'knopf-leise', beenden));
  if (original) aktionen.push(aktionKnopf('Löschen', 'knopf-gefahr', loeschen));

  const sheet = ctx.sheet(el('div', {},
    el('h2', { class: 'dialog-titel', text: original ? 'Vertrag ändern' : 'Neuer Vertrag' }),
    artAuswahl,
    beschriftung('Name'), nameFeld,
    beschriftung('Betrag'), betragFeld,
    beschriftung('Intervall'),
    auswahl(INTERVALLE, z.intervall, (w) => { z.intervall = w; }),
    beschriftung('Nächste Fälligkeit'), datumFeld,
    beschriftung('Kategorie'),
    auswahl(VERTRAG_KATEGORIEN.map(k => [k, k]), z.kategorie, (w) => { z.kategorie = w; }),
    gehaltBox,
    fehlerZeile,
    el('div', { class: 'aktionen' }, aktionen)
  ));
}

// ---------- Freie Rücklagen ----------

function ruecklagenBereich(ctx) {
  const liste = ctx.daten.ruecklagen || [];
  return el('div', {},
    liste.length
      ? el('div', { class: 'liste' }, liste.map(r => ruecklageZeile(ctx, r)))
      : el('section', { class: 'karte leer klein', text: 'Keine freien Rücklagen. Zum Beispiel für Geschenke oder Reparaturen.' }),
    aktionKnopf('+ Rücklage anlegen', 'knopf-primaer', () => ruecklageSheet(ctx))
  );
}

function ruecklageZeile(ctx, r) {
  return el('div', { class: 'listen-zeile zi-zeile-statisch' },
    el('span', { class: 'text' },
      el('div', { class: 'titelzeile', text: r.name }),
      el('div', { class: 'klein', text: `${euro(r.betragProJahr)} pro Jahr, ${euro(L.rundeCent(r.betragProJahr / 12))} pro Monat` })
    ),
    el('button', {
      type: 'button', class: 'knopf knopf-leise zi-knopf-klein', text: 'Löschen',
      onclick: async () => {
        const ok = await bestaetigen(ctx, 'Rücklage löschen?', `„${r.name}“ wird entfernt.`, 'Löschen');
        if (!ok) return;
        ctx.speichern({ ...ctx.daten, ruecklagen: (ctx.daten.ruecklagen || []).filter(x => x.id !== r.id) });
        ctx.toast('Rücklage gelöscht.');
      }
    })
  );
}

function ruecklageSheet(ctx) {
  const nameFeld = el('input', { class: 'feld', type: 'text', placeholder: 'z. B. Geschenke', maxlength: 40, autocomplete: 'off' });
  const betragFeld = el('input', { class: 'feld', type: 'text', inputmode: 'decimal', placeholder: '0,00 €', autocomplete: 'off' });
  const fehlerZeile = el('div', { class: 'klein negativ zi-hinweis' });

  function speichernen() {
    const name = nameFeld.value.trim();
    const betrag = parseBetrag(betragFeld.value);
    if (!name) {
      fehlerZeile.textContent = 'Bitte einen Namen eingeben.';
      return nameFeld.focus();
    }
    if (betrag === null || betrag <= 0) {
      fehlerZeile.textContent = 'Bitte einen Betrag pro Jahr über 0 eingeben, zum Beispiel 240,00.';
      return betragFeld.focus();
    }
    sheet.schliessen();
    ctx.speichern({ ...ctx.daten, ruecklagen: [...(ctx.daten.ruecklagen || []), { id: neueId('r'), name, betragProJahr: betrag }] });
    ctx.toast('Rücklage angelegt.');
  }

  const sheet = ctx.sheet(el('div', {},
    el('h2', { class: 'dialog-titel', text: 'Neue Rücklage' }),
    beschriftung('Name'), nameFeld,
    beschriftung('Betrag pro Jahr'), betragFeld,
    fehlerZeile,
    el('div', { class: 'aktionen' }, aktionKnopf('Speichern', 'knopf-primaer', speichernen))
  ));
}

// ---------- Gehalt ----------

function gehaltBereich(ctx) {
  const d = ctx.daten;
  const heute = ctx.heute;
  const tag = (d.einstellungen && d.einstellungen.gehaltstag) || 1;
  const eingaenge = [...(d.gehaltseingaenge || [])].sort();
  const letzter = eingaenge[eingaenge.length - 1];
  const heuteDa = eingaenge.includes(heute);

  const tagWahl = el('select', {
    class: 'feld', 'aria-label': 'Gehaltstag',
    onchange: (e) => {
      const neu = Number(e.target.value);
      ctx.speichern({ ...ctx.daten, einstellungen: { ...ctx.daten.einstellungen, gehaltstag: neu } });
      ctx.toast(`Gehaltstag ist jetzt der ${neu}.`);
    }
  }, Array.from({ length: 31 }, (_, i) => el('option', { value: String(i + 1), selected: i + 1 === tag ? true : null, text: `${i + 1}.` })));

  function gehaltHeute() {
    const aktuell = ctx.daten;
    if ((aktuell.gehaltseingaenge || []).includes(ctx.heute)) return ctx.toast('Heute ist der Gehalteingang schon eingetragen.');
    ctx.speichern({ ...aktuell, gehaltseingaenge: [...(aktuell.gehaltseingaenge || []), ctx.heute].sort() });
    ctx.toast(`Gehalt eingetragen: ${datumLang(ctx.heute)}.`);
  }

  return el('section', { class: 'karte' },
    el('div', { class: 'zi-gehalt-zeile' },
      el('span', { text: 'Gehaltstag' }),
      tagWahl
    ),
    el('div', { class: 'zi-gehalt-zeile' },
      el('span', { text: 'Letzter Eingang' }),
      el('span', { class: 'zi-zahl', text: letzter ? datumLang(letzter) : 'noch keiner' })
    ),
    el('p', { class: 'klein zi-hinweis', text: 'Der Zeitraum beginnt am Tag des Gehaltseingangs. Ohne Eingang gilt der Gehaltstag.' }),
    el('div', { class: 'aktionen' },
      el('button', {
        type: 'button', class: 'knopf knopf-primaer knopf-voll', disabled: heuteDa ? true : null,
        text: heuteDa ? 'Heute schon eingegangen' : 'Gehalt heute eingegangen',
        onclick: gehaltHeute
      })
    )
  );
}

// ---------- Abzeichen-Wand ----------

function abzeichenBereich(ctx) {
  const erreicht = new Set(ctx.daten.spiel.abzeichen || []);
  const anzahl = ABZEICHEN.filter(a => erreicht.has(a.id)).length;
  return el('div', {},
    el('div', { class: 'h20-zugang' },
      el('button', { type: 'button', class: 'knopf knopf-primaer knopf-voll', text: '📖 Herbarium öffnen', onclick: () => ctx.navigiere('herbarium') })),
    el('div', { class: 'klein zi-wand-zahl', text: `${anzahl} von ${ABZEICHEN.length} erreicht` }),
    el('div', { class: 'zi-wand' }, ABZEICHEN.map(a => {
      const ok = erreicht.has(a.id);
      return el('div', { class: 'zi-abz ' + (ok ? 'an' : 'aus') },
        el('div', { class: 'zi-abz-emoji', 'aria-hidden': 'true', text: a.emoji }),
        el('div', { class: 'zi-abz-name', text: a.name }),
        el('div', { class: 'klein', text: a.text }),
        el('div', { class: 'zi-abz-status', text: ok ? 'Erreicht' : 'Noch offen' })
      );
    }))
  );
}
