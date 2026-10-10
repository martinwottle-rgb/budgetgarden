// Ersteinrichtung: Vollbild-Assistent nach SPEC.md "Ersteinrichtung" und UI.md.
// Die Eingaben liegen im Modul, damit sie beim Zurückgehen und bei jedem Neuaufbau erhalten bleiben.
// "Los geht's" setzt ersteinrichtungFertig, startDatum und die Verträge, speichert und geht in den Garten.

import * as L from '../logik.js';
import { neueId } from '../speicher.js';
import { PFLANZEN } from '../grafik/pflanzen.js';
import { el, euro, parseBetrag, kurzDatum, svgBox, vorzeichen } from './bausteine.js';

const SCHRITTE = ['Willkommen', 'Gehalt', 'Einnahmen', 'Verträge', 'Sparziele', 'Fertig'];
const INTERVALLE = [[1, 'monatlich'], [3, 'vierteljährlich'], [6, 'halbjährlich'], [12, 'jährlich']];
const INTERVALL_TEXT = { 1: 'monatlich', 3: 'vierteljährlich', 6: 'halbjährlich', 12: 'jährlich' };
// Vertragskategorien werden als Name gespeichert (so erwartet es ziele.js)
const KATEGORIEN = ['Wohnen', 'Versicherung', 'Abos', 'Mobilität', 'Kommunikation', 'Sonstiges'];
const VORLAGEN = [
  { name: 'Miete', kategorie: 'Wohnen', intervall: 1 },
  { name: 'Strom', kategorie: 'Wohnen', intervall: 1 },
  { name: 'Handy', kategorie: 'Kommunikation', intervall: 1 },
  { name: 'Internet', kategorie: 'Kommunikation', intervall: 1 },
  { name: 'Haftpflicht', kategorie: 'Versicherung', intervall: 12 },
  { name: 'Kfz-Versicherung', kategorie: 'Versicherung', intervall: 12 },
  { name: 'Streaming', kategorie: 'Abos', intervall: 1 },
  { name: 'Fitness', kategorie: 'Abos', intervall: 1 }
];

let zustand = null;  // Eingaben des Assistenten
let huelle = null;   // Container und ctx des aktuellen Bildschirms, für Schrittwechsel

function neuerZustand(heute) {
  return {
    schritt: 0,
    fehler: '',
    gehalt: { betrag: '', tag: '' },
    einnahmen: [],
    vertraege: [],
    sparziele: [],
    neuEinnahme: { name: '', betrag: '', intervall: 1, faellig: heute },
    neuVertrag: { name: '', betrag: '', intervall: 1, kategorie: 'Sonstiges', faellig: heute },
    neuSparziel: { name: '', rate: '', ziel: '' }
  };
}

export function zeige(container, ctx) {
  if (!zustand) zustand = neuerZustand(ctx.heute);
  huelle = { container, ctx };
  container.append(baue(ctx));
}

// Neu zeichnen. oben: beim Schrittwechsel nach oben scrollen, sonst Position behalten
function zeichneNeu(oben = false) {
  const { container, ctx } = huelle;
  container.replaceChildren(baue(ctx));
  if (oben) window.scrollTo(0, 0);
}

function gehe(schritt) {
  zustand.schritt = schritt;
  zustand.fehler = '';
  zeichneNeu(true);
}

function zeigeFehler(text) {
  zustand.fehler = text;
  zeichneNeu(false);
}

function baue(ctx) {
  const s = zustand;
  const schritte = [willkommen, gehalt, einnahmen, vertraege, sparziele, zusammenfassung];
  return el('div', { class: 'ei-huelle' },
    el('div', { class: 'ei-kopf' }, punkte(s.schritt)),
    el('div', { class: 'ei-bild' }, pflanze(s.schritt)),
    schritte[s.schritt](ctx)
  );
}

// ---------- Bausteine ----------

function punkte(schritt) {
  return el('div', {
    class: 'ei-punkte',
    role: 'img',
    'aria-label': `Schritt ${schritt + 1} von ${SCHRITTE.length}: ${SCHRITTE[schritt]}`
  }, SCHRITTE.map((_, i) => el('span', {
    class: 'ei-punkt' + (i === schritt ? ' aktiv' : i < schritt ? ' erledigt' : '')
  })));
}

// Die Pflanze wächst mit jedem Schritt (Stufe 1 bis 4). Eigene, feste Grafik.
function pflanze(schritt) {
  const stufe = Math.min(4, 1 + schritt);
  return svgBox(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -100 120 118" width="150" height="148">' +
    PFLANZEN.efeutute.zeichne(stufe) + '</svg>',
    'ei-pflanze'
  );
}

function knopf(text, onclick, art = 'primaer') {
  const klasse = art === 'primaer' ? 'knopf-primaer' : art === 'leise' ? 'knopf-leise' : '';
  return el('button', { type: 'button', class: `knopf knopf-voll ${klasse}`.trim(), text, onclick });
}

// Vorwärts-Knopf und optional Zurück
function fuss(weiterText, onWeiter, zurueck) {
  return el('div', { class: 'aktionen' },
    knopf(weiterText, onWeiter, 'primaer'),
    zurueck === null ? null : knopf('Zurück', () => gehe(zurueck), 'leise')
  );
}

// Textfeld, das seinen Wert direkt in das Objekt schreibt
function eingabe(objekt, schluessel, attr = {}) {
  return el('input', {
    class: 'feld', type: 'text', autocomplete: 'off', ...attr,
    value: objekt[schluessel],
    oninput: (e) => { objekt[schluessel] = e.target.value; }
  });
}

function datumFeld(objekt, schluessel) {
  return el('input', {
    class: 'feld', type: 'date', value: objekt[schluessel],
    onchange: (e) => { objekt[schluessel] = e.target.value; zeichneNeu(false); }
  });
}

function intervallChips(n) {
  return el('div', { class: 'chips ei-chips', role: 'radiogroup', 'aria-label': 'Intervall' },
    INTERVALLE.map(([wert, text]) => el('button', {
      type: 'button', class: 'chip' + (n.intervall === wert ? ' aktiv' : ''), text,
      onclick: () => { n.intervall = wert; zeichneNeu(false); }
    })));
}

function kategorieChips(n) {
  return el('div', { class: 'chips ei-chips', role: 'radiogroup', 'aria-label': 'Kategorie' },
    KATEGORIEN.map(k => el('button', {
      type: 'button', class: 'chip' + (n.kategorie === k ? ' aktiv' : ''), text: k,
      onclick: () => { n.kategorie = k; zeichneNeu(false); }
    })));
}

// Zeile einer erfassten Liste mit Entfernen-Knopf
function zeile(name, info, betrag, farbe, entfernen) {
  return el('div', { class: 'listen-zeile ei-eintrag' },
    el('span', { class: 'text' },
      el('div', { class: 'titelzeile', text: name }),
      el('div', { class: 'klein', text: info })
    ),
    el('span', { class: 'betrag ' + farbe, text: betrag }),
    el('button', { type: 'button', class: 'ei-weg', 'aria-label': `${name} entfernen`, text: '✕', onclick: entfernen })
  );
}

function fehlerZeile() {
  return zustand.fehler ? el('p', { class: 'ei-fehler', role: 'alert', text: zustand.fehler }) : null;
}

function istDatum(text) {
  return /^\d{4}-\d{2}-\d{2}$/.test(text || '');
}

// Letzter Gehaltstag am oder vor heute (Tag gekappt auf die Monatslänge)
function letzterGehaltstag(heute, tag) {
  const diesen = L.datumPlusMonate(heute, 0, tag);
  return diesen <= heute ? diesen : L.datumPlusMonate(heute, -1, tag);
}

// Gehalt aus den Eingaben, null wenn ungültig
function gehaltWerte() {
  const cent = parseBetrag(zustand.gehalt.betrag);
  const tag = Number(String(zustand.gehalt.tag).trim());
  if (cent === null || cent <= 0) return null;
  if (!Number.isInteger(tag) || tag < 1 || tag > 31) return null;
  return { cent, tag };
}

// Verträge für die Vorschau und für "Los geht's": Gehalt zuerst, dann Einnahmen und Fixkosten
function vertraegeAusEingaben(heute, g) {
  const s = zustand;
  return [
    { id: neueId('v'), art: 'einnahme', name: 'Gehalt', betrag: g.cent, intervall: 1,
      ersteFaelligkeit: letzterGehaltstag(heute, g.tag), kategorie: '', istGehalt: true, ende: null },
    ...s.einnahmen.map(e => ({ id: neueId('v'), art: 'einnahme', name: e.name, betrag: e.betrag,
      intervall: e.intervall, ersteFaelligkeit: e.faellig, kategorie: '', istGehalt: false, ende: null })),
    ...s.vertraege.map(v => ({ id: neueId('v'), art: 'ausgabe', name: v.name, betrag: v.betrag,
      intervall: v.intervall, ersteFaelligkeit: v.faellig, kategorie: v.kategorie, istGehalt: false, ende: null }))
  ];
}

function sparzieleAusEingaben() {
  return zustand.sparziele.map(s => ({
    id: neueId('s'), name: s.name, proMonat: s.proMonat, zielsumme: s.zielsumme ?? null, angespart: 0
  }));
}

// Kopie für die Berechnung auf dem Bildschirm, nichts wird gespeichert. startDatum = heute, sonst wird
// der Zeitraum anteilig ab Starttag gerechnet (logik.js anteilAbStart).
function vorschauDaten(heute, g) {
  return {
    einstellungen: { gehaltstag: g.tag, ersteinrichtungFertig: false, startDatum: heute, push: { abonniert: false } },
    kategorien: [],
    vertraege: vertraegeAusEingaben(heute, g),
    gehaltseingaenge: [],
    buchungen: [],
    ruecklagen: [],
    sparziele: sparzieleAusEingaben(),
    abschluesse: []
  };
}

// ---------- Schritte ----------

function willkommen() {
  return [
    el('h1', { class: 'titel', text: 'Willkommen beim Budgetgarten' }),
    el('p', { class: 'ei-text', text: 'Dein Garten wächst mit jedem Tag, an dem du im Budget bleibst. Damit er die richtigen Zahlen zeigt, richten wir jetzt dein Geld ein: Gehalt, Verträge und Sparziele. Das dauert ein paar Minuten.' }),
    el('p', { class: 'ei-hinweis', text: 'Alles bleibt auf deinem Gerät. Jeder Schritt lässt sich später unter Ziele und Einstellungen ändern.' }),
    fuss('Weiter', () => gehe(1), null)
  ];
}

function gehalt() {
  const g = zustand.gehalt;
  return [
    el('h1', { class: 'titel', text: 'Dein Gehalt' }),
    el('p', { class: 'ei-text', text: 'Das Gehalt ist der Start deines Budgets. Gib den Betrag netto an, so wie er aufs Konto kommt.' }),
    el('section', { class: 'karte' },
      el('div', { class: 'beschriftung', text: 'Nettogehalt im Monat' }),
      eingabe(g, 'betrag', { inputmode: 'decimal', placeholder: '2.400,00 €' }),
      el('div', { class: 'beschriftung', text: 'Üblicher Eingangstag (1 bis 31)' }),
      el('input', {
        class: 'feld', type: 'number', inputmode: 'numeric', min: 1, max: 31, placeholder: 'z. B. 27',
        value: g.tag, oninput: (e) => { g.tag = e.target.value; }
      }),
      el('p', { class: 'klein', text: 'Ist der Tag länger als der Monat, zählt der letzte Tag des Monats.' })
    ),
    fehlerZeile(),
    fuss('Weiter', weiterGehalt, 0)
  ];
}

function weiterGehalt() {
  if (!gehaltWerte()) {
    const cent = parseBetrag(zustand.gehalt.betrag);
    if (cent === null || cent <= 0) return zeigeFehler('Bitte das Nettogehalt angeben, zum Beispiel 2.400,00.');
    return zeigeFehler('Bitte einen Eingangstag zwischen 1 und 31 angeben.');
  }
  gehe(2);
}

function einnahmen() {
  const n = zustand.neuEinnahme;
  const liste = zustand.einnahmen;
  return [
    el('h1', { class: 'titel', text: 'Weitere Einnahmen' }),
    el('p', { class: 'ei-text', text: 'Regelmäßige Eingänge außer dem Gehalt, zum Beispiel Kindergeld oder ein Nebenjob. Dieser Schritt ist optional.' }),
    liste.length
      ? el('div', { class: 'liste ei-liste' }, liste.map((e, i) => zeile(
        e.name, `${INTERVALL_TEXT[e.intervall]} · ab ${kurzDatum(e.faellig)}`, '+' + euro(e.betrag), 'positiv',
        () => { liste.splice(i, 1); zeichneNeu(false); })))
      : el('p', { class: 'klein ei-leer', text: 'Noch nichts eingetragen.' }),
    el('section', { class: 'karte' },
      el('div', { class: 'beschriftung', text: 'Name' }),
      eingabe(n, 'name', { placeholder: 'z. B. Nebenjob', maxlength: 40 }),
      el('div', { class: 'beschriftung', text: 'Betrag' }),
      eingabe(n, 'betrag', { inputmode: 'decimal', placeholder: '0,00 €' }),
      el('div', { class: 'beschriftung', text: 'Intervall' }),
      intervallChips(n),
      el('div', { class: 'beschriftung', text: 'Nächste Fälligkeit' }),
      datumFeld(n, 'faellig'),
      knopf('Eintrag hinzufügen', neueEinnahme, 'normal')
    ),
    fehlerZeile(),
    fuss(liste.length ? 'Weiter' : 'Überspringen', () => gehe(3), 1)
  ];
}

function neueEinnahme() {
  const n = zustand.neuEinnahme;
  const betrag = parseBetrag(n.betrag);
  if (!n.name.trim()) return zeigeFehler('Bitte einen Namen eingeben.');
  if (betrag === null || betrag <= 0) return zeigeFehler('Bitte einen Betrag über 0 eingeben, zum Beispiel 150,00.');
  if (!istDatum(n.faellig)) return zeigeFehler('Bitte die nächste Fälligkeit wählen.');
  zustand.einnahmen.push({ name: n.name.trim(), betrag, intervall: n.intervall, faellig: n.faellig });
  zustand.neuEinnahme = { ...n, name: '', betrag: '' };
  zustand.fehler = '';
  zeichneNeu(false);
}

function vertraege() {
  const n = zustand.neuVertrag;
  const liste = zustand.vertraege;
  return [
    el('h1', { class: 'titel', text: 'Verträge und Fixkosten' }),
    el('p', { class: 'ei-text', text: 'Alles, was regelmäßig Geld kostet. Ein Antippen auf eine Vorlage füllt Name, Kategorie und Intervall aus, den Betrag trägst du ein.' }),
    el('div', { class: 'ei-vorlagen' }, VORLAGEN.map(v => el('button', {
      type: 'button', class: 'chip', text: v.name,
      onclick: () => {
        n.name = v.name;
        n.kategorie = v.kategorie;
        n.intervall = v.intervall;
        zeichneNeu(false);
      }
    }))),
    el('p', { class: 'ei-hinweis', text: 'Nicht-monatliche Verträge werden automatisch auf die Monate verteilt.' }),
    el('section', { class: 'karte' },
      el('div', { class: 'beschriftung', text: 'Name' }),
      eingabe(n, 'name', { placeholder: 'z. B. Miete', maxlength: 40 }),
      el('div', { class: 'beschriftung', text: 'Betrag' }),
      eingabe(n, 'betrag', { inputmode: 'decimal', placeholder: '0,00 €' }),
      el('div', { class: 'beschriftung', text: 'Intervall' }),
      intervallChips(n),
      el('div', { class: 'beschriftung', text: 'Kategorie' }),
      kategorieChips(n),
      el('div', { class: 'beschriftung', text: 'Nächste Fälligkeit' }),
      datumFeld(n, 'faellig'),
      knopf('Vertrag hinzufügen', neuerVertrag, 'normal')
    ),
    liste.length
      ? el('div', { class: 'liste ei-liste' }, liste.map((v, i) => zeile(
        v.name, `${v.kategorie} · ${INTERVALL_TEXT[v.intervall]} · ab ${kurzDatum(v.faellig)}`, euro(-v.betrag), 'negativ',
        () => { liste.splice(i, 1); zeichneNeu(false); })))
      : el('p', { class: 'klein ei-leer', text: 'Noch keine Verträge eingetragen.' }),
    fehlerZeile(),
    fuss(liste.length ? 'Weiter' : 'Überspringen', () => gehe(4), 2)
  ];
}

function neuerVertrag() {
  const n = zustand.neuVertrag;
  const betrag = parseBetrag(n.betrag);
  if (!n.name.trim()) return zeigeFehler('Bitte einen Namen eingeben.');
  if (betrag === null || betrag <= 0) return zeigeFehler('Bitte einen Betrag über 0 eingeben, zum Beispiel 850,00.');
  if (!istDatum(n.faellig)) return zeigeFehler('Bitte die nächste Fälligkeit wählen.');
  zustand.vertraege.push({ name: n.name.trim(), betrag, intervall: n.intervall, kategorie: n.kategorie, faellig: n.faellig });
  zustand.neuVertrag = { ...n, name: '', betrag: '' };
  zustand.fehler = '';
  zeichneNeu(false);
}

function sparziele() {
  const n = zustand.neuSparziel;
  const liste = zustand.sparziele;
  return [
    el('h1', { class: 'titel', text: 'Sparziele' }),
    el('p', { class: 'ei-text', text: 'Wie viel legst du jeden Monat zur Seite? Die Rate wird schon vorab vom Budget abgezogen. Eine Zielsumme ist optional.' }),
    liste.length
      ? el('div', { class: 'liste ei-liste' }, liste.map((s, i) => zeile(
        s.name,
        s.zielsumme ? `Ziel ${euro(s.zielsumme)}` : 'ohne Zielsumme',
        euro(-s.proMonat) + ' / Monat', 'negativ',
        () => { liste.splice(i, 1); zeichneNeu(false); })))
      : el('p', { class: 'klein ei-leer', text: 'Noch kein Sparziel eingetragen.' }),
    el('section', { class: 'karte' },
      el('div', { class: 'beschriftung', text: 'Name' }),
      eingabe(n, 'name', { placeholder: 'z. B. Urlaub', maxlength: 40 }),
      el('div', { class: 'beschriftung', text: 'Rate pro Monat' }),
      eingabe(n, 'rate', { inputmode: 'decimal', placeholder: '50,00 €' }),
      el('div', { class: 'beschriftung', text: 'Zielsumme (optional)' }),
      eingabe(n, 'ziel', { inputmode: 'decimal', placeholder: '1.000,00 €' }),
      knopf('Sparziel hinzufügen', neuesSparziel, 'normal')
    ),
    fehlerZeile(),
    fuss(liste.length ? 'Weiter' : 'Überspringen', () => gehe(5), 3)
  ];
}

function neuesSparziel() {
  const n = zustand.neuSparziel;
  const rate = parseBetrag(n.rate);
  const ziel = n.ziel.trim() ? parseBetrag(n.ziel) : null;
  if (!n.name.trim()) return zeigeFehler('Bitte einen Namen eingeben.');
  if (rate === null || rate <= 0) return zeigeFehler('Bitte eine Rate über 0 eingeben, zum Beispiel 50,00.');
  if (n.ziel.trim() && (ziel === null || ziel <= 0)) return zeigeFehler('Die Zielsumme muss eine Zahl über 0 sein oder leer bleiben.');
  zustand.sparziele.push({ name: n.name.trim(), proMonat: rate, zielsumme: ziel });
  zustand.neuSparziel = { name: '', rate: '', ziel: '' };
  zustand.fehler = '';
  zeichneNeu(false);
}

function zusammenfassung(ctx) {
  const heute = ctx.heute;
  const g = gehaltWerte();
  if (!g) return [el('p', { class: 'ei-fehler', text: 'Das Gehalt fehlt noch.' }), fuss('Zum Gehalt', () => gehe(1), null)];
  const vorschau = vorschauDaten(heute, g);
  const h = L.heute(vorschau, heute);
  const w = L.woche(vorschau, heute);
  const posten = L.verfuegbar(vorschau, h.zr).posten;
  return [
    el('h1', { class: 'titel', text: 'Fast geschafft' }),
    el('p', { class: 'ei-text', text: 'So viel darfst du heute ausgeben, damit der Zeitraum aufgeht.' }),
    el('section', { class: 'karte ei-summe' },
      el('div', { class: 'klein', text: 'Dein Tagesbudget' }),
      el('div', { class: 'betrag-gross ' + vorzeichen(h.B), text: euro(h.B) }),
      el('div', { class: 'klein', text: `Zeitraum ${kurzDatum(h.zr.start)} bis ${kurzDatum(h.zr.ende)}` }),
      el('div', { class: 'ei-trenner' }),
      el('div', { class: 'klein', text: 'Dein Wochenbudget' }),
      el('div', { class: 'betrag-mittel ' + vorzeichen(w.W), text: euro(w.W) }),
      el('div', { class: 'klein', text: 'Montag bis Sonntag, begrenzt auf den Zeitraum' })
    ),
    el('div', { class: 'abschnitt', text: 'So setzt sich dein Zeitraum zusammen' }),
    el('div', { class: 'liste' }, posten.map(p => el('div', { class: 'listen-zeile' },
      el('span', { class: 'text', text: p.name }),
      el('span', { class: 'betrag ' + vorzeichen(p.betrag), text: euro(p.betrag) })
    ))),
    el('div', { class: 'ei-summe-zeile' },
      el('span', { class: 'klein', text: 'Verfügbar im Zeitraum' }),
      el('span', { class: 'betrag-mittel ' + vorzeichen(h.V), text: euro(h.V) })
    ),
    el('p', { class: 'ei-hinweis', text: 'Dein Garten startet mit einer Efeutute und zwei Möbelstücken.' }),
    fuss("Los geht's", () => losGehts(ctx, g), 4)
  ];
}

// Speichert alles, setzt ersteinrichtungFertig und geht in den Garten
function losGehts(ctx, g) {
  const heute = ctx.heute;
  const daten = {
    ...ctx.daten,
    einstellungen: {
      ...ctx.daten.einstellungen,
      ersteinrichtungFertig: true,
      startDatum: heute,
      gehaltstag: g.tag
    },
    vertraege: vertraegeAusEingaben(heute, g),
    sparziele: sparzieleAusEingaben()
  };
  zustand = null;
  huelle = null;
  ctx.speichern(daten);
  ctx.navigiere('garten');
}
