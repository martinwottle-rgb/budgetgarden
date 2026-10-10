// Start, Zustand, Router und der gemeinsame Kontext (ctx) für alle Bildschirme.
// Jeder Bildschirm exportiert zeige(container, ctx, param). ctx.daten immer frisch lesen (es wird ersetzt, nicht verändert).

import * as L from './logik.js';
import { laden, speichern as persistieren, standardDaten } from './speicher.js';
import { bewerte, levelAus, restVerwenden, ABZEICHEN, wochenRueckblick } from './spiel.js';
import { swRegistrieren } from './push.js';
import { el, muenzSvg, zahl, heutigesDatum, svgBox, kurzDatum, tage, kategorieVon } from './ui/bausteine.js';
import * as garten from './ui/garten.js';
import * as buchen from './ui/buchen.js';
import * as uebersicht from './ui/uebersicht.js';
import * as ziele from './ui/ziele.js';
import * as shop from './ui/shop.js';
import * as einstellungen from './ui/einstellungen.js';
import * as einrichtung from './ui/einrichtung.js';

const BILDSCHIRME = { garten, buchen, uebersicht, ziele, shop, einstellungen, einrichtung };
const RING_RADIUS = 18;
const RING_UMFANG = 2 * Math.PI * RING_RADIUS;

const kopf = {
  muenze: document.getElementById('muenze'),
  muenzsymbol: document.getElementById('muenzsymbol'),
  muenzzahl: document.getElementById('muenzzahl'),
  ringfill: document.getElementById('ringfill'),
  levelzahl: document.getElementById('levelzahl'),
  zahnrad: document.getElementById('zahnrad')
};
const inhalt = document.getElementById('inhalt');
const tabs = document.getElementById('tabs');
const overlay = document.getElementById('overlay');
const toasts = document.getElementById('toasts');
const flug = document.getElementById('flug');

let aktuell = { name: 'garten', param: null };
let anzeigeSamen = 0;      // Zahl, die gerade in der Kopfleiste steht (läuft beim Zählen mit)
let zaehlt = false;        // true während der Zähl-Animation
let laufNummer = 0;        // Zähl-Animation, die veraltet ist, bricht ab
const ebenenStapel = [];   // offene Sheets und Dialoge, oberstes zuletzt
let dialogeLaufen = false; // Abschluss- und Gehaltsdialoge laufen gerade
let swRegistrierung = null; // Service-Worker-Registrierung, für Update-Prüfung
let updateGezeigt = false;  // Update-Hinweis schon angezeigt

// ---------- Kontext ----------

const ctx = {
  daten: null,
  heute: heutigesDatum(),
  speichern,
  navigiere,
  toast,
  belohnen,
  sheet,
  dialog,
  kopfAktualisieren
};
let letzterTag = ctx.heute; // für den Tageswechsel ohne Neustart

// ---------- Start ----------

function starte() {
  swRegistrieren();
  updatesBeobachten();
  const vorhanden = laden();
  let daten = vorhanden || standardDaten(ctx.heute);
  kopf.muenzsymbol.append(svgBox(muenzSvg(30)));
  anzeigeSamen = daten.spiel.samen;

  // Bewertung beim Start: fällige Tage, Wochen, Zeiträume
  const ergebnis = bewerte(daten, ctx.heute);
  daten = ergebnis.daten;
  ctx.daten = daten;
  if (!vorhanden || ergebnis.ereignisse.length) {
    if (!persistieren(daten)) toast('Die Daten konnten nicht gespeichert werden.');
  }
  if (ergebnis.ereignisse.length) belohnen(ergebnis.ereignisse);

  // Start-Bildschirm: ?eintragen=heute öffnet direkt das Buchen mit Fokus auf dem Betrag
  const url = new URL(window.location.href);
  if (url.searchParams.get('eintragen') === 'heute') {
    aktuell = { name: 'buchen', param: { fokus: 'betrag' } };
    url.searchParams.delete('eintragen');
    window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
  }

  render();
  navigator.storage?.persist?.();
  dialogeNachStart();
}

// Tageswechsel ohne Neustart: beim Zurückkehren in die App prüfen, ob sich das Datum geändert hat
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const jetzt = heutigesDatum();
  if (jetzt === letzterTag) return;
  letzterTag = jetzt;
  ctx.heute = jetzt;
  if (ctx.daten.einstellungen.ersteinrichtungFertig) speichern(ctx.daten);
  else render();
  dialogeNachStart();
});

// Beim Zurückkehren in die App nach neuer Version suchen
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && swRegistrierung) swRegistrierung.update().catch(() => {});
});

// ---------- Update-Hinweis ----------

// Registrierung holen (push.js gibt sie nicht zurück), auf neue Versionen achten und einmal beim Start prüfen
async function updatesBeobachten() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistrierung = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready);
  } catch (fehler) {
    console.error(fehler);
    return;
  }
  swRegistrierung.addEventListener('updatefound', () => {
    const neu = swRegistrierung.installing;
    if (!neu) return;
    neu.addEventListener('statechange', () => {
      if (neu.state === 'installed' && navigator.serviceWorker.controller) updateHinweisZeigen();
    });
  });
  swRegistrierung.update().catch(() => {});
}

function updateHinweisZeigen() {
  if (updateGezeigt) return;
  updateGezeigt = true;
  hinweisUnten('', 'Neue Version · Jetzt aktualisieren', () => location.reload(), { bleibt: true });
}

// Kleiner Hinweis unten über der Tab-Leiste mit einem Knopf. bleibt: ohne Zeitlimit, bis zum Antippen.
function hinweisUnten(text, knopfText, aktion, { bleibt = false } = {}) {
  let hinweis = null;
  const knopf = el('button', {
    type: 'button',
    class: 'knopf knopf-primaer sp11-hinweis-knopf',
    text: knopfText,
    onclick: () => {
      hinweis.remove();
      aktion();
    }
  });
  hinweis = el('div', { class: 'sp11-hinweis', role: 'status' }, text ? el('span', { text }) : null, knopf);
  document.body.append(hinweis);
  if (!bleibt) setTimeout(() => hinweis.remove(), 9000);
}

// ---------- Speichern ----------

// Neue Daten setzen, bewerten, speichern, Ereignisse feiern, neu zeichnen
function speichern(neueDaten) {
  ctx.heute = heutigesDatum();
  const ergebnis = bewerte(neueDaten, ctx.heute);
  ctx.daten = ergebnis.daten;
  if (!persistieren(ctx.daten)) toast('Die Daten konnten nicht gespeichert werden (Speicher voll?).');
  if (ergebnis.ereignisse.length) belohnen(ergebnis.ereignisse);
  render();
}

// ---------- Router ----------

function navigiere(name, param) {
  aktuell = { name: BILDSCHIRME[name] ? name : 'garten', param: param || null };
  window.scrollTo(0, 0);
  render();
}

function render() {
  ctx.heute = heutigesDatum();
  const fertig = !!ctx.daten.einstellungen.ersteinrichtungFertig;
  const name = fertig ? aktuell.name : 'einrichtung';
  const param = name === aktuell.name ? aktuell.param : null;

  document.body.classList.toggle('vollbild', !fertig);
  tabs.querySelectorAll('[data-ziel]').forEach(b => {
    const aktiv = b.dataset.ziel === name;
    b.classList.toggle('aktiv', aktiv);
    if (aktiv) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  inhalt.replaceChildren();
  try {
    BILDSCHIRME[name].zeige(inhalt, ctx, param);
  } catch (fehler) {
    console.error(fehler);
    inhalt.append(el('section', { class: 'karte negativ', text: 'Dieser Bildschirm konnte nicht angezeigt werden: ' + fehler.message }));
  }
  kopfAktualisieren();
}

tabs.addEventListener('click', (e) => {
  const knopf = e.target.closest('[data-ziel]');
  if (knopf) navigiere(knopf.dataset.ziel);
});
kopf.muenze.addEventListener('click', () => navigiere('shop'));
kopf.zahnrad.addEventListener('click', () => navigiere('einstellungen'));

// ---------- Kopfleiste ----------

function kopfAktualisieren() {
  const sp = ctx.daten.spiel;
  const lv = levelAus(sp.xp);
  if (!zaehlt) anzeigeSamen = sp.samen;
  kopf.muenzzahl.textContent = zahl(anzeigeSamen);
  kopf.muenze.setAttribute('aria-label', `${zahl(anzeigeSamen)} Samen, zum Shop`);
  kopf.levelzahl.textContent = String(lv.level);
  kopf.ringfill.style.strokeDasharray = `${(RING_UMFANG * lv.anteil).toFixed(2)} ${RING_UMFANG.toFixed(2)}`;
}

// Zahl von der alten Anzeige zum neuen Stand zählen (600 ms)
function zaehleHoch(bis) {
  const von = anzeigeSamen;
  if (von === bis) return;
  const lauf = ++laufNummer;
  zaehlt = true;
  const start = performance.now();
  const schritt = (jetzt) => {
    if (lauf !== laufNummer) return;
    const t = Math.min(1, (jetzt - start) / 600);
    anzeigeSamen = Math.round(von + (bis - von) * t);
    kopf.muenzzahl.textContent = zahl(anzeigeSamen);
    if (t < 1) {
      requestAnimationFrame(schritt);
    } else {
      zaehlt = false;
      anzeigeSamen = bis;
      kopfAktualisieren();
    }
  };
  requestAnimationFrame(schritt);
}

function wackeln() {
  kopf.muenze.classList.remove('wackel');
  void kopf.muenze.offsetWidth;
  kopf.muenze.classList.add('wackel');
  kopf.muenze.addEventListener('animationend', () => kopf.muenze.classList.remove('wackel'), { once: true });
}

// Kleine Münzen fliegen von der Bildmitte zur Münz-Anzeige
function muenzFlug(anzahl) {
  const ziel = kopf.muenze.getBoundingClientRect();
  const zx = ziel.left + ziel.width / 2;
  const zy = ziel.top + ziel.height / 2;
  const sx = window.innerWidth / 2;
  const sy = window.innerHeight * 0.4;
  for (let i = 0; i < anzahl; i++) {
    const m = el('div', { class: 'flug-muenze' });
    m.innerHTML = muenzSvg(22);
    m.style.left = (sx - 11) + 'px';
    m.style.top = (sy - 11) + 'px';
    m.style.setProperty('--dx', (zx - sx + (i - (anzahl - 1) / 2) * 4) + 'px');
    m.style.setProperty('--dy', (zy - sy) + 'px');
    m.style.animationDelay = (i * 70) + 'ms';
    m.addEventListener('animationend', () => m.remove());
    flug.append(m);
    setTimeout(() => m.remove(), 1600);
  }
}

// Ereignisse aus bewerte(): ein Sammel-Toast mit den Summen, jedes Abzeichen einzeln,
// bei Samen Münzflug und Zählen (einmal)
function belohnen(ereignisse) {
  const samen = ereignisse.reduce((s, e) => s + (e.samen || 0), 0);
  const anzahl = (art) => ereignisse.filter(e => e.art === art).length;
  const teile = [];
  if (samen > 0) teile.push(`+${zahl(samen)} Samen`);
  const tage = anzahl('tag');
  if (tage) teile.push(`${tage} ${tage === 1 ? 'Tag' : 'Tage'} im Budget`);
  const wochen = anzahl('woche');
  if (wochen) teile.push(`${wochen} ${wochen === 1 ? 'Woche' : 'Wochen'} geschafft`);
  const zeitraeume = anzahl('zeitraum');
  if (zeitraeume) teile.push(`${zeitraeume} ${zeitraeume === 1 ? 'Zeitraum' : 'Zeiträume'} geschafft`);
  const serien = anzahl('serie');
  if (serien) teile.push(`${serien} ${serien === 1 ? 'Serie' : 'Serien'} geschafft`);
  const challenges = anzahl('challenge');
  if (challenges) teile.push(`${challenges} ${challenges === 1 ? 'Challenge' : 'Challenges'} erfüllt`);
  if (teile.length) toast(teile.join(' · '));

  ereignisse.filter(e => e.art === 'abzeichen').forEach((e, i) => {
    setTimeout(() => {
      const name = e.text.replace(/^Abzeichen: /, '');
      const abzeichen = ABZEICHEN.find(a => a.name === name);
      toast(`${abzeichen ? abzeichen.emoji : '🏅'} Neues Abzeichen: ${name}`, { gold: true });
    }, (i + 1) * 400);
  });

  if (samen > 0) {
    muenzFlug(samen >= 100 ? 8 : samen >= 30 ? 6 : 5);
    zaehleHoch(ctx.daten.spiel.samen);
    wackeln();
  }
}

// ---------- Toasts ----------

// gold: auffälliger Toast, z. B. für Abzeichen
function toast(text, { gold = false } = {}) {
  const t = el('div', { class: 'toast', role: 'status', text });
  if (gold) Object.assign(t.style, { background: 'var(--gold)', color: 'var(--braun)', fontSize: '17px' });
  toasts.append(t);
  while (toasts.children.length > 4) toasts.firstElementChild.remove();
  setTimeout(() => {
    t.classList.add('weg');
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

// ---------- Ebenen: Sheets und Dialoge ----------

// Legt eine Ebene mit Hintergrund über das Panel. abbruch wird bei Tippen auf den Hintergrund oder Escape gerufen.
function oeffneEbene(panel, { mitte = false, abbruch = null } = {}) {
  const hinter = el('div', { class: 'hinter' });
  const ebene = el('div', { class: 'ebene' + (mitte ? ' mitte' : '') }, hinter, panel);
  let offen = true;
  const eintrag = {
    abbruch,
    schliessen() {
      if (!offen) return;
      offen = false;
      const i = ebenenStapel.indexOf(eintrag);
      if (i >= 0) ebenenStapel.splice(i, 1);
      ebene.classList.add('weg');
      setTimeout(() => ebene.remove(), 220);
    }
  };
  hinter.addEventListener('click', () => {
    if (abbruch) abbruch();
    eintrag.schliessen();
  });
  overlay.append(ebene);
  ebenenStapel.push(eintrag);
  return eintrag;
}

// Escape schließt die oberste Ebene
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !ebenenStapel.length) return;
  const oberste = ebenenStapel[ebenenStapel.length - 1];
  if (oberste.abbruch) oberste.abbruch();
  oberste.schliessen();
});

// Bottom Sheet. inhalt: Element oder HTML-String (nur für feste Texte, Nutzerdaten immer als Element).
function sheet(inhalt) {
  const blatt = el('div', { class: 'sheet', role: 'dialog' }, el('div', { class: 'griff', onclick: () => ebene.schliessen() }));
  if (typeof inhalt === 'string') blatt.insertAdjacentHTML('beforeend', inhalt);
  else if (inhalt) blatt.append(inhalt);
  const ebene = oeffneEbene(blatt);
  return { schliessen: () => ebene.schliessen(), element: blatt };
}

// Dialog mit Knöpfen. inhalt: optionales Element zwischen Text und Knöpfen (z. B. ein Datumsfeld).
// Gibt ein Promise mit dem wert des gewählten Knopfs zurück, null bei Abbruch.
function dialog({ titel, text, inhalt = null, knoepfe = [] }) {
  return new Promise((resolve) => {
    let ebene = null;
    const knopfEls = knoepfe.map(k => el('button', {
      type: 'button',
      class: 'knopf ' + klasseFuer(k.art),
      text: k.text,
      onclick: () => {
        resolve(k.wert === undefined ? null : k.wert);
        ebene.schliessen();
      }
    }));
    const panel = el('div', { class: 'dialog', role: 'alertdialog' },
      titel ? el('h2', { class: 'dialog-titel', text: titel }) : null,
      text ? el('p', { class: 'dialog-text', text }) : null,
      inhalt,
      el('div', { class: 'dialog-knoepfe' }, knopfEls)
    );
    ebene = oeffneEbene(panel, { mitte: true, abbruch: () => resolve(null) });
  });
}

function klasseFuer(art) {
  if (art === 'primaer') return 'knopf-primaer';
  if (art === 'gefahr') return 'knopf-gefahr';
  if (art === 'leise') return 'knopf-leise';
  return '';
}

// ---------- Dialoge nach dem Start und nach dem Tageswechsel ----------

// Nacheinander: offene Monatsabschlüsse, dann die Gehaltsfrage, dann der Wochenrückblick, dann die Backup-Erinnerung.
// Nie zwei Abläufe gleichzeitig.
async function dialogeNachStart() {
  if (dialogeLaufen || !ctx.daten.einstellungen.ersteinrichtungFertig) return;
  dialogeLaufen = true;
  try {
    await abschluesseZeigen();
    await gehaltZeigen();
    await rueckblickZeigen();
    backupPruefen();
  } finally {
    dialogeLaufen = false;
  }
}

// Monatsabschluss: für jeden offenen Zeitraum ein Dialog. Abbruch lässt den Rest offen (nächstes Öffnen).
async function abschluesseZeigen() {
  while ((ctx.daten.spiel.offeneAbschluesse || []).length) {
    const offen = ctx.daten.spiel.offeneAbschluesse[0];
    const sparziele = ctx.daten.sparziele || [];
    const wahl = await ctx.dialog({
      titel: 'Zeitraum geschafft! 🎉',
      text: `Rest: ${L.euro(offen.rest)}. Wohin damit?`,
      knoepfe: [
        ...sparziele.map(s => ({ text: `In ${s.name}`, wert: 'sparziel:' + s.id, art: 'primaer' })),
        { text: 'Ins nächste Monat übertragen', wert: 'uebertrag', art: sparziele.length ? 'leise' : 'primaer' }
      ]
    });
    if (!wahl) return;
    const ergebnis = restVerwenden(ctx.daten, offen.zeitraumStart, wahl);
    if (ergebnis.fehler) {
      toast(ergebnis.fehler);
      return;
    }
    speichern(ergebnis.daten);
  }
}

// Erwarteter Gehaltstag: der heutige Tag oder bis zu 3 Tage danach (Tag gekappt auf die Monatslänge)
function erwarteterGehaltstag(daten, heute) {
  const gt = daten.einstellungen.gehaltstag || 1;
  for (const monat of [0, -1]) {
    const erwartet = L.datumPlusMonate(heute, monat, gt);
    const tage = L.tageZwischen(erwartet, heute);
    if (tage >= 0 && tage <= 3) return erwartet;
  }
  return null;
}

// Gehalt eingegangen? Einmal pro Tag, nicht wenn für diesen Gehaltstag schon ein Eingang steht.
async function gehaltZeigen() {
  const heute = ctx.heute;
  const erwartet = erwarteterGehaltstag(ctx.daten, heute);
  if (!erwartet || ctx.daten.einstellungen.gehaltGefragt === heute) return;
  const frueheste = L.datumPlusTage(erwartet, -15);
  if ((ctx.daten.gehaltseingaenge || []).some(g => g >= frueheste && g <= heute)) return;

  // Heute gefragt: merken, damit der Dialog bei jedem Öffnen nicht wieder kommt
  speichern({ ...ctx.daten, einstellungen: { ...ctx.daten.einstellungen, gehaltGefragt: heute } });

  const datumFeld = el('input', { class: 'feld', type: 'date', value: erwartet, max: heute, 'aria-label': 'Eingangsdatum' });
  const inhalt = el('div', { class: 'ei-dialogfeld' },
    el('div', { class: 'klein', text: 'Wann war es? Nur bei „Schon früher“ nötig.' }),
    datumFeld
  );
  for (;;) {
    const wahl = await ctx.dialog({
      titel: 'Gehalt eingegangen?',
      text: `Erwarteter Gehaltstag: ${kurzDatum(erwartet)}`,
      inhalt,
      knoepfe: [
        { text: 'Ja, heute', wert: 'heute', art: 'primaer' },
        { text: 'Schon früher', wert: 'frueher' },
        { text: 'Noch nicht', wert: 'nein', art: 'leise' }
      ]
    });
    if (!wahl || wahl === 'nein') return;
    let datum = heute;
    if (wahl === 'frueher') {
      datum = datumFeld.value;
      if (!datum || datum > heute || datum < L.datumPlusTage(heute, -40)) {
        toast('Bitte ein Datum wählen, bis heute und höchstens 40 Tage zurück.');
        continue;
      }
    }
    const gehaltseingaenge = [...new Set([...(ctx.daten.gehaltseingaenge || []), datum])].sort();
    speichern({ ...ctx.daten, gehaltseingaenge });
    return;
  }
}

// Wochenrückblick: einmal für die Vorwoche, ab deren Montag der Start liegt. Merken, bevor der Dialog offen ist.
async function rueckblickZeigen() {
  const e = ctx.daten.einstellungen;
  const vorwoche = L.datumPlusTage(L.wochenbeginn(ctx.heute), -7);
  if (!e.startDatum || vorwoche < e.startDatum || e.rueckblickGezeigt === vorwoche) return;
  speichern({ ...ctx.daten, einstellungen: { ...e, rueckblickGezeigt: vorwoche } });

  const r = wochenRueckblick(ctx.daten, vorwoche);
  const d = ctx.daten;
  const zeilen = [
    el('div', { class: 'klein', text: `${kurzDatum(r.von)} bis ${kurzDatum(r.bis)}` }),
    el('div', { class: 'sp11-rueck-zeile' }, el('span', { text: 'Ausgegeben' }), el('span', { text: `${L.euro(r.ausgegeben)} von ${L.euro(r.W)}` })),
    el('div', { class: 'sp11-rueck-zeile' }, el('span', { text: 'Tage im Budget' }), el('span', { text: tage(r.tageImBudget) })),
    el('div', { class: 'sp11-rueck-zeile' }, el('span', { text: 'Samen verdient' }), el('span', { text: zahl(r.samen) }))
  ];
  if (r.topKategorie) {
    const k = kategorieVon(d, r.topKategorie.id);
    zeilen.push(el('div', { class: 'sp11-rueck-zeile' },
      el('span', { text: 'Größte Ausgabe' }),
      el('span', { text: `${k.emoji} ${k.name}, ${L.euro(r.topKategorie.betrag)}` })));
  }
  zeilen.push(r.gespart >= 0
    ? el('div', { class: 'sp11-rueck-gespart positiv', text: `Gespart: ${L.euro(r.gespart)}` })
    : el('div', { class: 'sp11-rueck-drueber', text: `Diesmal ${L.euro(-r.gespart)} drüber, neue Woche, neues Glück` }));

  await ctx.dialog({
    titel: 'Deine Woche 🌿',
    inhalt: el('div', { class: 'sp11-rueck' }, zeilen),
    knoepfe: [{ text: 'Weiter', art: 'primaer' }]
  });
}

// Backup-Erinnerung: startDatum älter als 30 Tage, letzter Export älter als 30 Tage (oder nie), höchstens einmal pro 7 Tage
function backupPruefen() {
  const e = ctx.daten.einstellungen;
  const h = ctx.heute;
  if (!e.startDatum || L.tageZwischen(e.startDatum, h) <= 30) return;
  if (e.letzterExport && L.tageZwischen(e.letzterExport, h) <= 30) return;
  if (e.backupErinnert && L.tageZwischen(e.backupErinnert, h) < 7) return;
  speichern({ ...ctx.daten, einstellungen: { ...e, backupErinnert: h } });
  hinweisUnten('Zeit für ein Backup? Einstellungen → Export', 'Zu den Einstellungen', () => navigiere('einstellungen'));
}


starte();
