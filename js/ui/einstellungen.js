// Einstellungen nach UI.md "Einstellungen": Gehaltstag, Kategorien, Erinnerung 22 Uhr,
// Export und Import, "Alles zurücksetzen", Version.

import * as L from '../logik.js';
import { standardDaten, exportDatei, importText } from '../speicher.js';
import { pushMoeglich, pushAbonnieren } from '../push.js';
import { el } from './bausteine.js';

const VERSION = 'Budgetgarten 1.0';

// Abo-Code nach dem Aktivieren. Bleibt bis zum Neuladen sichtbar, auch wenn danach neu gezeichnet wird.
let abo = null;
let aktiviert = false;  // läuft gerade eine Aktivierung

export function zeige(container, ctx) {
  container.append(
    el('h1', { class: 'titel', text: 'Einstellungen' }),
    gehaltstagAbschnitt(ctx),
    kategorienAbschnitt(ctx),
    erinnerungAbschnitt(),
    datenAbschnitt(ctx),
    zuruecksetzenAbschnitt(ctx),
    el('p', { class: 'es-version klein', text: VERSION }),
    webPushAbschnitt(ctx)
  );
}

function knopf(text, onclick, art = 'normal') {
  const klasse = { primaer: 'knopf-primaer', gefahr: 'knopf-gefahr', leise: 'knopf-leise' }[art] || '';
  return el('button', { type: 'button', class: `knopf knopf-voll ${klasse}`.trim(), text, onclick });
}

function abschnitt(titel, ...kinder) {
  return el('div', { class: 'es-abschnitt' }, el('div', { class: 'abschnitt', text: titel }), ...kinder);
}

// ---------- Gehaltstag ----------

function gehaltstagAbschnitt(ctx) {
  const tagFeld = el('input', {
    class: 'feld es-tag', type: 'number', inputmode: 'numeric', min: 1, max: 31,
    value: String(ctx.daten.einstellungen.gehaltstag), 'aria-label': 'Gehaltstag'
  });
  const speichern = () => {
    const tag = Number(String(tagFeld.value).trim());
    if (!Number.isInteger(tag) || tag < 1 || tag > 31) {
      ctx.toast('Bitte einen Tag zwischen 1 und 31 wählen.');
      return;
    }
    ctx.speichern({ ...ctx.daten, einstellungen: { ...ctx.daten.einstellungen, gehaltstag: tag } });
    ctx.toast('Gehaltstag gespeichert.');
  };
  return abschnitt('Gehaltstag',
    el('section', { class: 'karte' },
      el('p', { class: 'klein', text: 'Der Tag, an dem dein Gehalt üblicherweise eingeht (1 bis 31). Ist der Tag länger als der Monat, zählt der letzte Tag.' }),
      el('div', { class: 'es-zeile' },
        tagFeld,
        el('button', { type: 'button', class: 'knopf knopf-primaer es-knopf', text: 'Speichern', onclick: speichern })
      )
    )
  );
}

// ---------- Kategorien ----------

function kategorienAbschnitt(ctx) {
  const zeilen = ctx.daten.kategorien.map(k => el('button', {
    type: 'button', class: 'listen-zeile', onclick: () => kategorieBearbeiten(ctx, k)
  },
  el('span', { class: 'symbol-kreis', 'aria-hidden': 'true', text: k.emoji }),
  el('span', { class: 'text' },
    el('div', { class: 'titelzeile', text: k.name }),
    el('div', { class: 'klein', text: k.eigene ? 'eigene Kategorie' : 'Standard' })
  ),
  el('span', { class: 'es-pfeil', 'aria-hidden': 'true', text: '›' })));
  return abschnitt('Kategorien',
    el('div', { class: 'liste' }, zeilen),
    el('p', { class: 'klein es-hinweis', text: 'Antippen zum Ändern. Standard-Kategorien lassen sich umbenennen, eigene auch löschen.' })
  );
}

function kategorieBearbeiten(ctx, k) {
  const emojiFeld = el('input', { class: 'feld es-emoji', type: 'text', maxlength: 4, autocomplete: 'off', value: k.emoji, 'aria-label': 'Emoji' });
  const nameFeld = el('input', { class: 'feld', type: 'text', maxlength: 24, autocomplete: 'off', value: k.name, 'aria-label': 'Name' });
  const fehlerZeile = el('p', { class: 'klein negativ' });
  const sheet = ctx.sheet(el('div', {},
    el('h2', { class: 'dialog-titel', text: 'Kategorie bearbeiten' }),
    el('div', { class: 'beschriftung', text: 'Emoji' }),
    emojiFeld,
    el('div', { class: 'beschriftung', text: 'Name' }),
    nameFeld,
    fehlerZeile,
    el('div', { class: 'aktionen' },
      el('button', {
        type: 'button', class: 'knopf knopf-primaer knopf-voll', text: 'Speichern',
        onclick: () => {
          const name = nameFeld.value.trim();
          if (!name) {
            fehlerZeile.textContent = 'Bitte einen Namen eingeben.';
            nameFeld.focus();
            return;
          }
          const emoji = emojiFeld.value.trim() || k.emoji;
          const kategorien = ctx.daten.kategorien.map(x => (x.id === k.id ? { ...x, name, emoji } : x));
          sheet.schliessen();
          ctx.speichern({ ...ctx.daten, kategorien });
          ctx.toast('Kategorie gespeichert.');
        }
      }),
      k.eigene
        ? el('button', { type: 'button', class: 'knopf knopf-gefahr knopf-voll', text: 'Löschen', onclick: () => kategorieLoeschen(ctx, k, sheet) })
        : null,
      el('button', { type: 'button', class: 'knopf knopf-leise knopf-voll', text: 'Abbrechen', onclick: () => sheet.schliessen() })
    )
  ));
}

async function kategorieLoeschen(ctx, k, sheet) {
  sheet.schliessen();
  const ok = await ctx.dialog({
    titel: 'Kategorie löschen?',
    text: `„${k.name}“ wird entfernt. Buchungen mit dieser Kategorie zeigen danach „Sonstiges“.`,
    knoepfe: [
      { text: 'Abbrechen', wert: false, art: 'leise' },
      { text: 'Löschen', wert: true, art: 'gefahr' }
    ]
  });
  if (ok !== true) return;
  ctx.speichern({ ...ctx.daten, kategorien: ctx.daten.kategorien.filter(x => x.id !== k.id) });
  ctx.toast('Kategorie gelöscht.');
}

// ---------- Erinnerung 22 Uhr (Kurzbefehle-Automation, ANLEITUNG-ERINNERUNG.md) ----------

const KURZBEFEHL_SCHRITTE = [
  ['Die App ', 'Kurzbefehle', ' öffnen und unten ', 'Automation', ' wählen.'],
  ['Oben rechts ', '+', ' antippen, dann ', 'Tageszeit', '.'],
  ['', '22:00', ' einstellen, ', 'Täglich', ' wählen und darunter ', 'Sofort ausführen', ' aktivieren. ', 'Bei Ausführung mitteilen', ' ausschalten. Dann ', 'Weiter', '.'],
  ['', 'Neue leere Automation', ' wählen, dann ', 'Aktion hinzufügen', ' antippen und nach ', 'Mitteilung anzeigen', ' suchen.'],
  ['Als Text eintragen: Wie viel hast du heute ausgegeben? 🌱'],
  ['Oben rechts ', 'Fertig', ' antippen.']
];

// Die Teile abwechselnd: normaler Text und fett (ungerade Position)
function schrittInhalt(teile) {
  return teile.map((t, i) => (i % 2 === 1 ? el('strong', { text: t }) : t)).filter(t => t !== '');
}

function erinnerungAbschnitt() {
  return abschnitt('Erinnerung um 22 Uhr',
    el('section', { class: 'karte es-kurzbefehl' },
      el('p', { class: 'klein', text: 'Jeden Abend um 22 Uhr erinnert dich eine Mitteilung an deine Ausgaben. Sie läuft auf die Minute genau und braucht weder Server noch GitHub.' }),
      el('ol', { class: 'es-schritte' },
        KURZBEFEHL_SCHRITTE.map(teile => el('li', {}, schrittInhalt(teile)))),
      el('p', { class: 'klein', text: 'Die Mitteilung kommt von Kurzbefehle. Antippen öffnet die Kurzbefehle-App, nicht den Budgetgarten.' }),
      el('p', { class: 'klein', text: 'Ab jetzt erscheint jeden Abend um 22 Uhr die Mitteilung.' })
    )
  );
}

// ---------- Web-Push (alt): nicht mehr angeboten, nur noch zugeklappt erreichbar ----------

function webPushAbschnitt(ctx) {
  const inhalt = [];
  const status = pushMoeglich();
  const eingerichtet = !!(ctx.daten.einstellungen.push && ctx.daten.einstellungen.push.abonniert);

  if (eingerichtet && !abo) {
    inhalt.push(el('p', { class: 'klein', text: 'Die Erinnerung ist eingerichtet.' }));
  }
  if (!status.moeglich) {
    inhalt.push(el('p', { class: 'klein es-warnung', text: 'Gerade nicht möglich: ' + status.grund }));
  } else if (!abo) {
    inhalt.push(
      el('p', { class: 'klein', text: 'Jeden Abend um 22 Uhr erinnert dich eine Benachrichtigung an deine Ausgaben.' }),
      knopf('Erinnerung aktivieren', () => erinnerungAktivieren(ctx), 'primaer')
    );
  }
  if (abo) inhalt.push(aboBox(ctx));

  return el('details', { class: 'es-altpush' },
    el('summary', { class: 'klein es-altpush-titel', text: 'Web-Push (alt)' }),
    el('section', { class: 'karte' }, inhalt)
  );
}

async function erinnerungAktivieren(ctx) {
  if (aktiviert) return;
  aktiviert = true;
  let code;
  try {
    code = await pushAbonnieren();
  } catch (fehler) {
    aktiviert = false;
    ctx.toast('Die Erinnerung konnte nicht aktiviert werden. ' + (fehler && fehler.message ? fehler.message : ''));
    return;
  }
  aktiviert = false;
  abo = code;
  ctx.speichern({
    ...ctx.daten,
    einstellungen: { ...ctx.daten.einstellungen, push: { ...ctx.daten.einstellungen.push, abonniert: true } }
  });
}

function aboBox(ctx) {
  const feld = el('textarea', {
    class: 'es-abo', readonly: true, rows: 4, spellcheck: false, 'aria-label': 'Abo-Code', text: abo
  });
  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(abo);
      ctx.toast('Abo-Code kopiert.');
    } catch (fehler) {
      feld.focus();
      feld.select();
      ctx.toast('Bitte den Code von Hand kopieren.');
    }
  };
  return el('div', { class: 'es-abo-box' },
    el('p', { class: 'klein', text: 'Dein Abo-Code. Er wird als Geheimnis bei GitHub hinterlegt:' }),
    feld,
    knopf('Kopieren', kopieren, 'primaer'),
    el('ol', { class: 'es-schritte klein' },
      el('li', { text: 'Den Code kopieren.' }),
      el('li', { text: 'Auf GitHub das Repository öffnen: Settings, dann Secrets and variables, dann Actions.' }),
      el('li', { text: '„New repository secret“ wählen. Name: PUSH_ABO. Wert: den Code einfügen, speichern.' }),
      el('li', { text: 'Danach kommt die Erinnerung jeden Abend um 22 Uhr. Ein Test steht im Repository unter Actions.' })
    )
  );
}

// ---------- Daten: Export und Import ----------

function datenAbschnitt(ctx) {
  const importFeld = el('input', {
    type: 'file', accept: 'application/json,.json', hidden: true, 'aria-label': 'Importdatei',
    onchange: (e) => importieren(ctx, e.target)
  });
  return abschnitt('Daten',
    el('section', { class: 'karte' },
      el('p', { class: 'klein', text: 'Deine Daten bleiben auf diesem Gerät. Mit Export sicherst du sie, mit Import stellst du sie wieder her.' }),
      knopf('Daten exportieren', () => exportieren(ctx), 'primaer'),
      backupZeile(ctx),
      knopf('Datei importieren', () => importFeld.click(), 'normal'),
      importFeld
    )
  );
}

// Stand des letzten Exports (TT.MM.JJJJ). Orange, wenn er älter als 30 Tage ist oder noch nie war.
function backupZeile(ctx) {
  const letzter = ctx.daten.einstellungen.letzterExport;
  const alt = !letzter || L.tageZwischen(letzter, ctx.heute) > 30;
  const [j, m, t] = letzter ? letzter.split('-') : [];
  return el('div', {
    class: 'zi11-backup' + (alt ? ' zi11-backup-alt' : ''),
    text: letzter ? `Letztes Backup: ${t}.${m}.${j}` : 'Noch kein Backup'
  });
}

// Merkt den Tag des erfolgreichen Exports
function exportMerken(ctx) {
  ctx.speichern({ ...ctx.daten, einstellungen: { ...ctx.daten.einstellungen, letzterExport: ctx.heute } });
}

async function exportieren(ctx) {
  const datei = exportDatei(ctx.daten);
  if (typeof File === 'function' && navigator.canShare) {
    const file = new File([datei.text], datei.name, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Budgetgarten-Sicherung' });
        exportMerken(ctx);
        return;
      } catch (fehler) {
        if (fehler && fehler.name === 'AbortError') return;
      }
    }
  }
  const url = URL.createObjectURL(new Blob([datei.text], { type: 'application/json' }));
  const link = el('a', { href: url, download: datei.name, hidden: true });
  document.body.append(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
  exportMerken(ctx);
  ctx.toast('Export als Datei gespeichert.');
}

async function importieren(ctx, eingabe) {
  const datei = eingabe.files && eingabe.files[0];
  eingabe.value = '';
  if (!datei) return;
  let daten;
  try {
    daten = importText(await datei.text());
  } catch (fehler) {
    ctx.toast(fehler.message);
    return;
  }
  const ok = await ctx.dialog({
    titel: 'Alle Daten ersetzen?',
    text: 'Deine jetzigen Daten werden durch die Datei ersetzt. Das lässt sich nicht rückgängig machen.',
    knoepfe: [
      { text: 'Abbrechen', wert: false, art: 'leise' },
      { text: 'Ersetzen', wert: true, art: 'gefahr' }
    ]
  });
  if (ok !== true) return;
  abo = null;
  ctx.speichern(daten);
  ctx.toast('Daten importiert.');
}

// ---------- Alles zurücksetzen ----------

function zuruecksetzenAbschnitt(ctx) {
  return abschnitt('Alles zurücksetzen',
    el('section', { class: 'karte es-gefahr' },
      el('p', { class: 'klein', text: 'Löscht alle Buchungen, Verträge, Sparziele und dein Gewächshaus. Danach beginnt die Ersteinrichtung von vorn.' }),
      knopf('Alles zurücksetzen', () => zuruecksetzen(ctx), 'gefahr')
    )
  );
}

async function zuruecksetzen(ctx) {
  const erste = await ctx.dialog({
    titel: 'Alles zurücksetzen?',
    text: 'Alle Daten auf diesem Gerät werden gelöscht.',
    knoepfe: [
      { text: 'Abbrechen', wert: false, art: 'leise' },
      { text: 'Weiter', wert: true, art: 'gefahr' }
    ]
  });
  if (erste !== true) return;
  const zweite = await ctx.dialog({
    titel: 'Wirklich alles löschen?',
    text: 'Das lässt sich nicht rückgängig machen. Ein Export vorher lohnt sich.',
    knoepfe: [
      { text: 'Nein, behalten', wert: false, art: 'leise' },
      { text: 'Ja, alles löschen', wert: true, art: 'gefahr' }
    ]
  });
  if (zweite !== true) return;
  abo = null;
  ctx.speichern(standardDaten(ctx.heute));
  ctx.toast('Alles zurückgesetzt.');
}
