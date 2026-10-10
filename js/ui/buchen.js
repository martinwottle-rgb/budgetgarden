// Bildschirm Buchen nach UI.md Abschnitt 2: Ausgabe, Einnahme oder Fixkosten eintragen,
// heutige Buchungen antippen zum Bearbeiten oder Löschen.

import * as L from '../logik.js';
import { neueId } from '../speicher.js';
import { el, euro, parseBetrag, betragText, kategorieVon, kurzDatum } from './bausteine.js';

const ARTEN = [['ausgabe', 'Ausgabe'], ['einnahme', 'Einnahme'], ['fixkosten', 'Fixkosten']];
const ART_TEXT = { ausgabe: 'Ausgabe', einnahme: 'Einnahme', fixkosten: 'Fixkosten' };
const HINWEIS = {
  ausgabe: 'Wird gegen das Tagesbudget gerechnet.',
  einnahme: 'Zählt als Eingang im Zeitraum.',
  fixkosten: 'Einmalige Kosten, die vom Budget abgezogen werden.'
};
const NICHTS = 'Nichts ausgegeben';

// Entwurf, der ein Neuaufbauen des Bildschirms übersteht (nur beim Anlegen einer eigenen Kategorie)
let merkeEntwurf = null;

export function zeige(container, ctx, param) {
  const d = ctx.daten;
  const heute = ctx.heute;
  const gestern = L.datumPlusTage(heute, -1);
  const bearbeitenId = param && param.bearbeiten;
  const original = bearbeitenId ? (d.buchungen || []).find(b => b.id === bearbeitenId) : null;

  // Startwerte: Entwurf, Bearbeiten oder neue Buchung
  let z;
  if (merkeEntwurf) {
    z = { ...merkeEntwurf };
  } else if (original) {
    z = {
      id: original.id,
      art: original.art,
      betrag: betragText(original.betrag),
      kategorie: original.kategorie,
      notiz: original.notiz || '',
      datum: original.datum
    };
  } else {
    z = { id: null, art: 'ausgabe', betrag: '', kategorie: d.kategorien[0] ? d.kategorien[0].id : null, notiz: '', datum: heute };
  }
  merkeEntwurf = null;

  // ---------- Segment ----------
  const artKnoepfe = ARTEN.map(([k, t]) => el('button', {
    type: 'button', 'data-art': k, text: t,
    onclick: () => { z.art = k; markiere(); }
  }));
  const hinweis = el('div', { class: 'klein art-hinweis' });

  // ---------- Betrag ----------
  const betragFeld = el('input', {
    class: 'feld feld-betrag', type: 'text', inputmode: 'decimal', placeholder: '0,00 €',
    autocomplete: 'off', value: z.betrag,
    oninput: (e) => { z.betrag = e.target.value; }
  });

  // ---------- Kategorien ----------
  const katChips = el('div', { class: 'chips' });
  function katZeichnen() {
    katChips.replaceChildren(
      ...d.kategorien.map(k => el('button', {
        type: 'button', class: 'chip', 'data-kat': k.id, text: `${k.emoji} ${k.name}`,
        onclick: () => { z.kategorie = k.id; markiere(); }
      })),
      el('button', { type: 'button', class: 'chip leise', text: '+ eigene', onclick: eigeneKategorie })
    );
  }

  // ---------- Notiz ----------
  const notizFeld = el('input', {
    class: 'feld', type: 'text', placeholder: 'z. B. Wocheneinkauf', maxlength: 80,
    autocomplete: 'off', value: z.notiz,
    oninput: (e) => { z.notiz = e.target.value; }
  });

  // ---------- Datum ----------
  const chipHeute = el('button', { type: 'button', class: 'chip', 'data-datum': heute, text: 'Heute', onclick: () => { z.datum = heute; markiere(); } });
  const chipGestern = el('button', { type: 'button', class: 'chip', 'data-datum': gestern, text: 'Gestern', onclick: () => { z.datum = gestern; markiere(); } });
  const datumFeld = el('input', {
    class: 'feld datum-feld', type: 'date', value: z.datum,
    onchange: (e) => { if (e.target.value) z.datum = e.target.value; markiere(); }
  });

  function markiere() {
    artKnoepfe.forEach(b => b.classList.toggle('aktiv', b.dataset.art === z.art));
    hinweis.textContent = HINWEIS[z.art];
    katChips.querySelectorAll('[data-kat]').forEach(b => b.classList.toggle('aktiv', b.dataset.kat === z.kategorie));
    chipHeute.classList.toggle('aktiv', z.datum === heute);
    chipGestern.classList.toggle('aktiv', z.datum === gestern);
    datumFeld.value = z.datum;
  }

  // ---------- Aktionen ----------
  function speichernen() {
    const cent = parseBetrag(z.betrag);
    if (cent === null) {
      ctx.toast('Bitte einen Betrag eingeben, zum Beispiel 12,50.');
      betragFeld.focus();
      return;
    }
    if (cent <= 0) {
      ctx.toast('Der Betrag muss über 0 liegen.');
      betragFeld.focus();
      return;
    }
    const notiz = z.notiz.trim();
    const kat = kategorieVon(ctx.daten, z.kategorie);
    const eintrag = {
      id: z.id || neueId('b'),
      art: z.art,
      name: notiz || kat.name,
      betrag: cent,
      datum: z.datum || heute,
      kategorie: z.kategorie,
      notiz
    };
    const buchungen = z.id
      ? ctx.daten.buchungen.map(b => (b.id === z.id ? eintrag : b))
      : [...ctx.daten.buchungen, eintrag];
    ctx.speichern({ ...ctx.daten, buchungen });
    ctx.toast(`${ART_TEXT[z.art]} gespeichert: ${euro(cent)}`);
    ctx.navigiere('buchen');
  }

  function nichtsAusgegeben() {
    const schon = ctx.daten.buchungen.some(b => b.datum === heute && b.art === 'ausgabe' && b.notiz === NICHTS);
    if (schon) {
      ctx.toast('Heute ist „Nichts ausgegeben“ schon eingetragen.');
      return;
    }
    const kategorie = ctx.daten.kategorien.some(k => k.id === 'sonstiges')
      ? 'sonstiges'
      : (ctx.daten.kategorien[0] ? ctx.daten.kategorien[0].id : null);
    const eintrag = { id: neueId('b'), art: 'ausgabe', name: NICHTS, betrag: 0, datum: heute, kategorie, notiz: NICHTS };
    ctx.speichern({ ...ctx.daten, buchungen: [...ctx.daten.buchungen, eintrag] });
    ctx.toast('Heute als „Nichts ausgegeben“ eingetragen.');
  }

  function eigeneKategorie() {
    const emojiFeld = el('input', { class: 'feld', type: 'text', placeholder: '📌', maxlength: 4, autocomplete: 'off' });
    const nameFeld = el('input', { class: 'feld', type: 'text', placeholder: 'z. B. Geschenke', maxlength: 24, autocomplete: 'off' });
    const fehlerZeile = el('div', { class: 'klein negativ' });
    const anlegen = () => {
      const name = nameFeld.value.trim();
      if (!name) {
        fehlerZeile.textContent = 'Bitte einen Namen eingeben.';
        nameFeld.focus();
        return;
      }
      const kat = { id: neueId('k'), name, emoji: emojiFeld.value.trim() || '📌', eigene: true };
      merkeEntwurf = { ...z, kategorie: kat.id };
      sheet.schliessen();
      ctx.speichern({ ...ctx.daten, kategorien: [...ctx.daten.kategorien, kat] });
    };
    const sheet = ctx.sheet(el('div', {},
      el('h2', { class: 'dialog-titel', text: 'Neue Kategorie' }),
      el('div', { class: 'beschriftung', text: 'Emoji' }),
      emojiFeld,
      el('div', { class: 'beschriftung', text: 'Name' }),
      nameFeld,
      fehlerZeile,
      el('div', { class: 'aktionen' },
        el('button', { type: 'button', class: 'knopf knopf-primaer knopf-voll', text: 'Kategorie anlegen', onclick: anlegen })
      )
    ));
  }

  function buchungSheet(b) {
    const kat = kategorieVon(ctx.daten, b.kategorie);
    const sheet = ctx.sheet(el('div', {},
      el('div', { class: 'klein', text: `${ART_TEXT[b.art]} · ${kurzDatum(b.datum)} · ${kat.emoji} ${kat.name}` }),
      el('h2', { class: 'dialog-titel', text: b.name }),
      el('div', { class: 'betrag-mittel ' + (b.art === 'einnahme' ? 'positiv' : (b.betrag ? 'negativ' : '')), text: betragZeichen(b) }),
      b.notiz && b.notiz !== b.name ? el('p', { class: 'klein', text: b.notiz }) : null,
      el('div', { class: 'aktionen' },
        el('button', {
          type: 'button', class: 'knopf knopf-primaer knopf-voll', text: 'Bearbeiten',
          onclick: () => { sheet.schliessen(); ctx.navigiere('buchen', { bearbeiten: b.id }); }
        }),
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

  // ---------- Heutige Buchungen ----------
  const heutige = (d.buchungen || []).filter(b => b.datum === heute).slice().reverse();
  const liste = heutige.length
    ? el('div', { class: 'liste' }, heutige.map(b => {
      const kat = kategorieVon(ctx.daten, b.kategorie);
      const info = ART_TEXT[b.art] + (b.notiz && b.notiz !== b.name ? ' · ' + b.notiz : '');
      const farbe = b.art === 'einnahme' ? 'positiv' : (b.betrag ? 'negativ' : 'klein');
      return el('button', { type: 'button', class: 'listen-zeile', onclick: () => buchungSheet(b) },
        el('span', { class: 'symbol-kreis', 'aria-hidden': 'true', text: kat.emoji }),
        el('span', { class: 'text' },
          el('div', { class: 'titelzeile', text: b.name }),
          el('div', { class: 'klein', text: info })
        ),
        el('span', { class: 'betrag ' + farbe, text: betragZeichen(b) })
      );
    }))
    : el('div', { class: 'karte leer klein', text: 'Heute noch nichts eingetragen.' });

  // ---------- Zusammenbau ----------
  const speichernKnopf = el('button', {
    type: 'button', class: 'knopf knopf-primaer knopf-voll', text: z.id ? 'Änderung speichern' : 'Speichern',
    onclick: speichernen
  });
  const aktionen = el('div', { class: 'aktionen' }, speichernKnopf,
    z.id
      ? el('button', { type: 'button', class: 'knopf knopf-leise knopf-voll', text: 'Bearbeiten abbrechen', onclick: () => ctx.navigiere('buchen') })
      : el('button', { type: 'button', class: 'knopf knopf-leise knopf-voll', text: 'Heute nichts ausgegeben', onclick: nichtsAusgegeben })
  );

  katZeichnen();
  markiere();

  container.append(
    el('h1', { class: 'titel', text: z.id ? 'Buchung ändern' : 'Buchen' }),
    el('section', { class: 'karte formular' },
      el('div', { class: 'reiter', role: 'tablist' }, artKnoepfe),
      hinweis,
      el('div', { class: 'beschriftung', text: 'Betrag' }),
      betragFeld,
      el('div', { class: 'beschriftung', text: 'Kategorie' }),
      katChips,
      el('div', { class: 'beschriftung', text: 'Notiz (optional)' }),
      notizFeld,
      el('div', { class: 'beschriftung', text: 'Datum' }),
      el('div', { class: 'chips' }, chipHeute, chipGestern),
      datumFeld
    ),
    aktionen,
    el('div', { class: 'abschnitt', text: 'Heute eingetragen' }),
    liste
  );

  if (param && param.fokus === 'betrag') betragFeld.focus();
}

// Vorzeichen für die Liste: Einnahme plus, Ausgaben und Fixkosten minus, Nullbuchung ohne
function betragZeichen(b) {
  if (b.art === 'einnahme') return '+' + euro(b.betrag);
  return b.betrag ? euro(-b.betrag) : euro(0);
}
