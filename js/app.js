// Start, Zustand, Router und der gemeinsame Kontext (ctx) für alle Bildschirme.
// Jeder Bildschirm exportiert zeige(container, ctx, param). ctx.daten immer frisch lesen (es wird ersetzt, nicht verändert).

import * as L from './logik.js';
import { laden, speichern as persistieren, standardDaten } from './speicher.js';
import { bewerte, levelAus, restVerwenden, ABZEICHEN, wochenRueckblick, freiePlaetze, katalog, tagesgeschenk, geschenkAbholen, MEILENSTEINE, naechsterMeilenstein, heuteInAussicht, samenQuellen, freischaltungenBei } from './spiel.js';
import { RARITAETEN } from './grafik/raritaeten.js';
import { vorschau, einpassen, tageszeitAus } from './szene.js';
import { swRegistrieren } from './push.js';
import { el, muenzSvg, zahl, heutigesDatum, svgBox, kurzDatum, tage, kategorieVon } from './ui/bausteine.js';
import * as garten from './ui/garten.js';
import * as buchen from './ui/buchen.js';
import * as uebersicht from './ui/uebersicht.js';
import * as ziele from './ui/ziele.js';
import * as shop from './ui/shop.js';
import * as einstellungen from './ui/einstellungen.js';
import * as einrichtung from './ui/einrichtung.js';
import * as herbarium from './ui/herbarium.js';

const BILDSCHIRME = { garten, buchen, uebersicht, ziele, shop, einstellungen, einrichtung, herbarium };
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
let samenHalt = false;     // Samen-Anzeige bleibt auf dem alten Stand, bis der Samenflug landet

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
  kopfAktualisieren,
  samenFlug
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
  const vorLevel = levelAus(daten.spiel.xp).level;
  const ergebnis = bewerte(daten, ctx.heute);
  daten = ergebnis.daten;
  ctx.daten = daten;
  if (!vorhanden || ergebnis.ereignisse.length) {
    if (!persistieren(daten)) toast('Die Daten konnten nicht gespeichert werden.');
  }
  if (ergebnis.ereignisse.length) belohnen(ergebnis.ereignisse);
  levelPruefen(vorLevel);

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
  const vorLevel = levelAus(ctx.daten.spiel.xp).level;
  ctx.heute = heutigesDatum();
  const ergebnis = bewerte(neueDaten, ctx.heute);
  ctx.daten = ergebnis.daten;
  if (!persistieren(ctx.daten)) toast('Die Daten konnten nicht gespeichert werden (Speicher voll?).');
  if (ergebnis.ereignisse.length) belohnen(ergebnis.ereignisse);
  levelPruefen(vorLevel);
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
kopf.muenze.addEventListener('click', () => samenBlattZeigen());
kopf.zahnrad.addEventListener('click', () => navigiere('einstellungen'));

// ---------- Kopfleiste ----------

function kopfAktualisieren() {
  const sp = ctx.daten.spiel;
  const lv = levelAus(sp.xp);
  if (!zaehlt && !samenHalt) anzeigeSamen = sp.samen;
  kopf.muenzzahl.textContent = zahl(anzeigeSamen);
  kopf.muenze.setAttribute('aria-label', `${zahl(anzeigeSamen)} Samen, Übersicht`);
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

// Samen-Schild: „+2 🌱“ fliegt in einem Bogen vom Ausgangselement (Mitte) zur Münz-Anzeige (700 ms).
// Danach zählt die Anzeige von der alten Zahl auf den neuen Stand und wackelt.
// samenHalt hält die Anzeige auf dem alten Stand, weil speichern() den Kopf sonst sofort neu setzt.
function samenFlug(von, samen) {
  samenHalt = true;
  const a = von.getBoundingClientRect();
  const ziel = kopf.muenze.getBoundingClientRect();
  const sx = a.left + a.width / 2;
  const sy = a.top + a.height / 2;
  const schild = el('div', { class: 'ios-schild', text: `+${zahl(samen)} 🌱` });
  schild.style.left = sx + 'px';
  schild.style.top = sy + 'px';
  schild.style.setProperty('--dx', (ziel.left + ziel.width / 2 - sx) + 'px');
  schild.style.setProperty('--dy', (ziel.top + ziel.height / 2 - sy) + 'px');
  flug.append(schild);
  setTimeout(() => {
    schild.remove();
    samenHalt = false;
    zaehleHoch(ctx.daten.spiel.samen);
    wackeln();
  }, 700);
}

// Ereignisse aus bewerte(): ein Sammel-Toast mit den Summen, jedes Abzeichen einzeln,
// bei Samen Münzflug und Zählen (einmal)
function belohnen(ereignisse) {
  const samen = ereignisse.reduce((s, e) => s + (e.samen || 0), 0);
  // Challenges und Herbarium-Sets bekommen ihren eigenen Glückwunsch-Dialog, deshalb nicht im Sammel-Toast
  const ohneDialoge = ereignisse.filter(e => e.art !== 'challenge' && e.art !== 'set');
  const samenToast = ohneDialoge.reduce((s, e) => s + (e.samen || 0), 0);
  const anzahl = (art) => ohneDialoge.filter(e => e.art === art).length;
  const teile = [];
  if (samenToast > 0) teile.push(`+${zahl(samenToast)} Samen`);
  const tage = anzahl('tag');
  if (tage) teile.push(`${tage} ${tage === 1 ? 'Tag' : 'Tage'} im Budget`);
  const wochen = anzahl('woche');
  if (wochen) teile.push(`${wochen} ${wochen === 1 ? 'Woche' : 'Wochen'} geschafft`);
  const zeitraeume = anzahl('zeitraum');
  if (zeitraeume) teile.push(`${zeitraeume} ${zeitraeume === 1 ? 'Zeitraum' : 'Zeiträume'} geschafft`);
  const serien = anzahl('serie');
  if (serien) teile.push(`${serien} ${serien === 1 ? 'Serie' : 'Serien'} geschafft`);
  if (teile.length) toast(teile.join(' · '));

  ereignisse.filter(e => e.art === 'abzeichen').forEach((e, i) => {
    setTimeout(() => {
      const name = e.text.replace(/^Abzeichen: /, '');
      const abzeichen = ABZEICHEN.find(a => a.name === name);
      toast(`${abzeichen ? abzeichen.emoji : '🏅'} Neues Abzeichen: ${name}`, { gold: true });
    }, (i + 1) * 400);
  });

  // Raritaeten: eigener Fest-Dialog, nacheinander (kein Toast, der würde den Dialogtitel verdecken)
  const raritaeten = ereignisse.filter(e => e.art === 'raritaet');
  for (const e of raritaeten) festWarteschlange.push(e.typ);
  if (raritaeten.length) festeZeigen();

  // Challenges: Glückwunsch-Dialog, nacheinander
  const challenges = ereignisse.filter(e => e.art === 'challenge');
  for (const e of challenges) challengeWarteschlange.push(e);
  if (challenges.length) challengeZeigen();

  // Erstattete Dachdesigns: eigener Hinweis mit Text
  ereignisse.filter(e => e.art === 'erstattung').forEach(e => toast(e.text));

  // Herbarium-Sets vollständig: eigener Glückwunsch-Dialog, nacheinander
  const sets = ereignisse.filter(e => e.art === 'set');
  for (const e of sets) setWarteschlange.push(e);
  if (sets.length) setZeigen();

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

// ---------- Fest-Dialoge der Raritaeten ----------

// Wartende Raritaeten (Typ) und die Kette, die sie nacheinander zeigt
const festWarteschlange = [];
let festLauf = Promise.resolve();

function festeZeigen() {
  festLauf = festLauf.then(async () => {
    while (festWarteschlange.length) {
      try {
        await raritaetFest(festWarteschlange.shift());
      } catch (fehler) {
        console.error(fehler);
      }
    }
  });
  return festLauf;
}

// Fest-Dialog: große Vorschau in goldenem Rahmen, Name, „Weil du: …“. Jetzt pflanzen führt in die Platzwahl.
async function raritaetFest(typ) {
  const r = RARITAETEN[typ];
  if (!r) return;
  const vorschauEl = vorschau(r.zeichne(4, false, 'boden', { tageszeit: tageszeitAus(new Date()) }), 'ra-fest-vorschau');
  const inhalt = el('div', { class: 'ra-fest' },
    el('div', { class: 'ra-rahmen' }, vorschauEl),
    el('div', { class: 'ra-fest-name', text: r.name }),
    el('p', { class: 'klein ra-fest-grund', text: `Freigeschaltet durch: ${r.bedingung}` })
  );
  const dialog = ctx.dialog({
    titel: 'Rarität freigeschaltet! ✨',
    inhalt,
    knoepfe: [
      { text: 'Jetzt pflanzen', wert: 'jetzt', art: 'primaer' },
      { text: 'Später', wert: 'spaeter', art: 'leise' }
    ]
  });
  einpassen(inhalt); // der Dialog ist schon im Dokument, getBBox funktioniert
  const wahl = await dialog;
  if (wahl !== 'jetzt') return;
  if (!freiePlaetze(ctx.daten, 'raritaet', typ).length) {
    toast('Kein freier Platz, verkaufe oder verschiebe etwas');
    return;
  }
  navigiere('garten', { platzieren: { kategorie: 'raritaet', typ } });
}

// ---------- Glückwunsch-Dialoge der Challenges ----------

// Wartende Challenge-Ereignisse und die Kette, die sie nacheinander zeigt
const challengeWarteschlange = [];
let challengeLauf = Promise.resolve();

function challengeZeigen() {
  challengeLauf = challengeLauf.then(async () => {
    while (challengeWarteschlange.length) {
      const e = challengeWarteschlange.shift();
      try {
        await challengeFest(e);
      } catch (fehler) {
        console.error(fehler);
      }
    }
  });
  return challengeLauf;
}

// Glückwunsch: Challenge-Text, Belohnung, Münzflug
async function challengeFest(e) {
  muenzFlug(e.samen >= 30 ? 6 : 5);
  await ctx.dialog({
    titel: 'Challenge geschafft! 🎉',
    text: e.text,
    inhalt: el('div', { class: 'sp12-belohnung', text: `Deine Belohnung: +${zahl(e.samen)} Samen` }),
    knoepfe: [{ text: 'Weiter so!', art: 'primaer' }]
  });
}

// ---------- Glückwunsch-Dialoge der Herbarium-Sets ----------

// Wartende Set-Ereignisse und die Kette, die sie nacheinander zeigt
const setWarteschlange = [];
let setLauf = Promise.resolve();

function setZeigen() {
  setLauf = setLauf.then(async () => {
    while (setWarteschlange.length) {
      const e = setWarteschlange.shift();
      try {
        await setFest(e);
      } catch (fehler) {
        console.error(fehler);
      }
    }
  });
  return setLauf;
}

// Set vollständig: Setname, Belohnung, Münzflug. Der Text kommt aus spiel.js: „Herbarium-Set vollständig: Name“
async function setFest(e) {
  muenzFlug(e.samen >= 30 ? 6 : 5);
  const name = e.text.replace(/^Herbarium-Set vollständig: /, '');
  await ctx.dialog({
    titel: 'Set vollständig! 📖',
    text: 'Alle Pflanzen dieses Sets stehen jetzt im Herbarium.',
    inhalt: el('div', { class: 'h20-set-dialog' },
      el('div', { class: 'h20-set-dialog-name', text: name }),
      el('div', { class: 'sp12-belohnung', text: `+${zahl(e.samen)} Samen` })),
    knoepfe: [{ text: 'Weiter so!', art: 'primaer' }]
  });
}

// ---------- Level-Up-Dialoge ----------

// Wartende Stufen und die Kette, die sie nacheinander zeigt. Sie kommt nach den Challenge-Dialogen.
const levelWarteschlange = [];
let levelLauf = Promise.resolve();

// Neue Stufen seit vorLevel in die Warteschlange, dann anzeigen
function levelPruefen(vorLevel) {
  const jetzt = levelAus(ctx.daten.spiel.xp).level;
  if (jetzt <= vorLevel) return;
  for (let lv = vorLevel + 1; lv <= jetzt; lv++) levelWarteschlange.push(lv);
  levelZeigen();
}

function levelZeigen() {
  levelLauf = levelLauf.then(() => challengeLauf).then(async () => {
    while (levelWarteschlange.length) {
      const lv = levelWarteschlange.shift();
      try {
        await levelFest(lv);
      } catch (fehler) {
        console.error(fehler);
      }
    }
  });
  return levelLauf;
}

// Level-Up: große Stufe im goldenen Kreis mit Strahlenkranz, Liste der Freischaltungen, Zum Shop oder Weiter
async function levelFest(lv) {
  const neu = freischaltungenBei(ctx.daten, lv);
  const liste = neu.length
    ? el('ul', { class: 'ios-lu-liste' }, neu.map(f => el('li', { class: 'ios-lu-zeile' },
      freischaltBild(f),
      el('span', { class: 'ios-lu-name', text: f.name }))))
    : el('p', { class: 'klein ios-lu-leer', text: 'Diesmal nichts Neues im Shop, aber deine Pflanzen freuen sich.' });
  const inhalt = el('div', { class: 'ios-lu' },
    konfettiSchicht(40),
    el('div', { class: 'ios-lu-kreis-wrap', 'aria-hidden': 'true' },
      el('div', { class: 'ios-lu-strahlen' }),
      el('div', { class: 'ios-lu-kreis' }, el('span', { class: 'ios-lu-zahl', text: String(lv) }))),
    el('h3', { class: 'ios-lu-ueber', text: 'Neu freigeschaltet' }),
    liste
  );
  const wahlPromise = ctx.dialog({
    titel: `Level ${lv} erreicht!`,
    inhalt,
    knoepfe: [
      { text: 'Zum Shop', wert: 'shop', art: 'primaer' },
      { text: 'Weiter', wert: 'weiter', art: 'leise' }
    ]
  });
  einpassen(inhalt);
  if ((await wahlPromise) === 'shop') navigiere('shop');
}

// Vorschaubild einer Freischaltung: Grafik, wenn vorhanden, sonst ein Emoji
function freischaltBild(f) {
  const bild = shop.bildFuer(f.kategorie, f.typ);
  if (bild) return el('span', { class: 'ios-lu-bild' }, vorschau(bild, 'ios-lu-vorschau'));
  const emoji = { erweiterung: '🏡', design: '🎨', tuete: '🌱' }[f.kategorie] || '🪴';
  return el('span', { class: 'ios-lu-bild ios-emoji', 'aria-hidden': 'true', text: emoji });
}

// Konfetti: Schnipsel fallen aus der Schicht. Sie ist absolut positioniert im relativen Eltern-Element.
function konfettiSchicht(anzahl = 36) {
  const farben = ['#f2c14e', '#e88a7a', '#6fae6a', '#fbf3e6', '#a9d3a5', '#e8b83a'];
  const schicht = el('div', { class: 'ios-konfetti', 'aria-hidden': 'true' });
  for (let i = 0; i < anzahl; i++) {
    schicht.append(el('span', {
      style: `left:${(Math.random() * 100).toFixed(1)}%;background:${farben[i % farben.length]};` +
        `--dx:${Math.round(Math.random() * 120 - 60)}px;--rot:${Math.round(Math.random() * 720 - 360)}deg;` +
        `animation-delay:${(Math.random() * 0.35).toFixed(2)}s`
    }));
  }
  return schicht;
}

// ---------- Level-Blatt ----------

// Erklärung zum Level: Fortschritt, nächste Freischaltungen, wie man Samen und XP verdient
function levelBlattZeigen() {
  const d = ctx.daten;
  const lv = levelAus(d.spiel.xp);
  const fehlt = lv.xpNaechste - d.spiel.xp;
  const naechste = katalog(d)
    .filter(a => a.level > lv.level && a.level <= lv.level + 3)
    .sort((a, b) => a.level - b.level);
  sheet(el('div', { class: 'sp12-level' },
    el('h2', { class: 'sh-titel', text: 'Dein Level' }),
    el('div', { class: 'sp12-level-gross', text: String(lv.level) }),
    el('div', { class: 'sp12-xp', role: 'img', 'aria-label': `${Math.round(lv.anteil * 100)} Prozent bis Level ${lv.level + 1}` },
      el('span', { style: `width:${(lv.anteil * 100).toFixed(1)}%` })),
    el('div', { class: 'klein sp12-xp-text', text: `Noch ${zahl(fehlt)} XP bis Level ${lv.level + 1}` }),
    el('h3', { class: 'sp12-ueberschrift', text: 'Als Nächstes freigeschaltet' }),
    naechste.length
      ? el('ul', { class: 'sp12-liste' }, naechste.map(a => el('li', {},
        el('span', { text: a.name }),
        el('span', { class: 'klein', text: `Level ${a.level}` }))))
      : el('p', { class: 'klein', text: 'Im Shop ist für die nächsten Level nichts mehr offen.' }),
    el('h3', { class: 'sp12-ueberschrift', text: 'So verdienst du Samen und XP' }),
    samenTabelle(),
    el('p', { class: 'klein sp12-raritaet-hinweis', text: 'Raritäten sind seltene echte Pflanzen. Sie gibt es nicht im Shop, du schaltest sie durch besondere Leistungen frei. Der Goldene Ginkgo-Bonsai zum Beispiel ab Level 15.' })
  ));
}

// Der Level-Kreis in der Kopfleiste öffnet das Level-Blatt (die Münze bleibt beim Shop)
const levelKreis = document.querySelector('.kopf-level');
levelKreis.classList.add('sp12-level-knopf');
levelKreis.setAttribute('role', 'button');
levelKreis.setAttribute('tabindex', '0');
levelKreis.addEventListener('click', levelBlattZeigen);
levelKreis.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    levelBlattZeigen();
  }
});

// ---------- Tagesgeschenk ----------

// Geschenkbox (fest gezeichnet). Der Deckel hat die Klasse ios-deckel und wird per CSS angehoben.
const GESCHENK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="150" height="150" aria-hidden="true">' +
  '<ellipse cx="60" cy="110" rx="42" ry="6" fill="#6b4a3a" opacity="0.18"/>' +
  '<rect x="22" y="50" width="76" height="60" rx="6" fill="#e88a7a" stroke="#6b4a3a" stroke-width="2"/>' +
  '<rect x="54" y="50" width="12" height="60" fill="#f2c14e" stroke="#6b4a3a" stroke-width="1.5"/>' +
  '<g class="ios-deckel">' +
  '<rect x="16" y="36" width="88" height="18" rx="5" fill="#f08f7e" stroke="#6b4a3a" stroke-width="2"/>' +
  '<rect x="54" y="36" width="12" height="18" fill="#f2c14e" stroke="#6b4a3a" stroke-width="1.5"/>' +
  '<path d="M60 36 C44 14 24 20 32 34 C38 42 54 38 60 36 Z" fill="#f2c14e" stroke="#6b4a3a" stroke-width="2" stroke-linejoin="round"/>' +
  '<path d="M60 36 C76 14 96 20 88 34 C82 42 66 38 60 36 Z" fill="#f2c14e" stroke="#6b4a3a" stroke-width="2" stroke-linejoin="round"/>' +
  '<circle cx="60" cy="36" r="5" fill="#e0a93a" stroke="#6b4a3a" stroke-width="1.5"/>' +
  '</g></svg>';

// Vorschau eines Gutscheins (Pflanze, Deko, auch aus den Grafiken der Erweiterungen PFLANZEN2 und DEKO2)
function gutscheinVorschau(daten, gutschein) {
  const treffer = katalog(daten).find(k => k.kategorie === gutschein.kategorie && k.typ === gutschein.typ);
  const name = treffer ? treffer.name : gutschein.typ;
  const bild = shop.bildFuer(gutschein.kategorie, gutschein.typ);
  return el('div', { class: 'ios-gutschein' },
    el('div', { class: 'ios-gutschein-bild' }, bild ? vorschau(bild, 'ios-gutschein-vorschau') : el('span', { class: 'ios-emoji', 'aria-hidden': 'true', text: '🪴' })),
    el('div', { class: 'sh-name', text: name }),
    el('div', { class: 'klein', text: 'Gutschein, gratis im Shop' }));
}

// Meilenstein-Karte: die exklusive Deko (DEKO2) mit Tag und Name
function meilensteinKarte(m) {
  const bild = shop.bildFuer('deko', m.typ);
  return el('div', { class: 'ios-meilenstein-karte' },
    el('div', { class: 'ios-stern-band', text: '⭐ Meilenstein' }),
    el('div', { class: 'ios-meilenstein-bild' }, bild ? vorschau(bild, 'ios-meilenstein-vorschau') : el('span', { class: 'ios-emoji', 'aria-hidden': 'true', text: '🏆' })),
    el('div', { class: 'sh-name', text: `Tag ${m.tag}: ${m.name}` }),
    el('div', { class: 'klein', text: 'Gratis im Shop, mit diesem Gutschein' }));
}

// Samen-Zahl im Geschenk von 0 auf den Wert zählen (ease-out, 900 ms)
function zaehleZahl(ziel, element, dauer = 900) {
  const start = performance.now();
  const schritt = (jetzt) => {
    const t = Math.min(1, (jetzt - start) / dauer);
    element.textContent = `+${zahl(Math.round(ziel * (1 - Math.pow(1 - t, 3))))} Samen`;
    if (t < 1) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
}

// Erster Besuch am Tag: Geschenk antippen. Die Box wippt, dann schüttelt sie sich (400 ms), der Deckel fliegt auf,
// Strahlen und Konfetti erscheinen, die Belohnung springt herein und die Samen zählen hoch.
// „Danke!“ holt sie ab: Münzen fliegen zur Anzeige, der Zähler wächst.
function tagesgeschenkZeigen() {
  const heute = ctx.heute;
  const g = tagesgeschenk(ctx.daten, heute);
  if (!g.verfuegbar) return Promise.resolve();
  return new Promise((resolve) => {
    let ebene = null;
    let offen = false;
    const timer = [];
    const meilensteinTage = new Set(MEILENSTEINE.map(m => m.tag));

    // Die sieben Kästchen der Woche mit echten Tageszahlen
    const kaestchen = [];
    for (let t = g.wocheStart; t < g.wocheStart + 7; t++) {
      const erledigt = t < g.tag;
      const heuteTag = t === g.tag;
      const meilen = meilensteinTage.has(t);
      kaestchen.push(el('span', {
        class: 'ios-tag' + (erledigt ? ' erledigt' : '') + (heuteTag ? ' heute' : '') + (meilen ? ' meilenstein' : ''),
        'aria-label': `Tag ${t}` + (erledigt ? ', erledigt' : '') + (heuteTag ? ', heute' : '') + (meilen ? ', Meilenstein' : '')
      }, erledigt ? '✓' : String(t), meilen ? el('span', { class: 'ios-tag-stern', 'aria-hidden': 'true', text: '⭐' }) : null));
    }
    // Entfernung ab dem heutigen Geschenktag: Tag 30 heute zeigt den Meilenstein, nicht „noch 1 Tag“
    const naechster = MEILENSTEINE.find(m => m.tag >= g.tag) || null;
    const meilenHinweis = !naechster ? null
      : naechster.tag === g.tag
        ? el('p', { class: 'klein ios-meilen-hinweis', text: `Heute ist Tag ${g.tag}: ein Meilenstein! ⭐` })
        : el('p', { class: 'klein ios-meilen-hinweis', text: `Nächster Meilenstein: Tag ${naechster.tag} (in ${tage(naechster.tag - g.tag)})` });

    const hinweis = el('p', { class: 'klein ios-hinweis', text: 'Tippe auf das Geschenk.' });
    const samenZahl = el('div', { class: 'ios-geschenk-samen', text: '+0 Samen', 'aria-live': 'polite' });
    const danke = el('button', {
      type: 'button',
      class: 'knopf knopf-primaer knopf-voll ios-danke',
      text: 'Danke!',
      onclick: () => {
        danke.disabled = true;
        const r = geschenkAbholen(ctx.daten, heute);
        if (r.fehler) {
          toast(r.fehler);
          danke.disabled = false;
          return;
        }
        muenzFlug(r.belohnung.samen >= 30 ? 6 : 5);
        zaehleHoch(r.daten.spiel.samen);
        ebene.schliessen();
        speichern(r.daten);
        resolve();
      }
    });
    const belohnung = el('div', { class: 'ios-belohnung' },
      samenZahl,
      g.belohnung.gutschein ? gutscheinVorschau(ctx.daten, g.belohnung.gutschein) : null,
      g.belohnung.tuete
        ? el('div', { class: 'ios-extra' },
          el('span', { class: 'ios-emoji', 'aria-hidden': 'true', text: '🌱' }),
          el('div', {}, el('div', { class: 'sh-name', text: '+1 Samentüte' }), el('div', { class: 'klein', text: 'Gratis im Shop öffnen' })))
        : null,
      g.belohnung.meilenstein ? meilensteinKarte(g.belohnung.meilenstein) : null,
      danke);

    const strahlen = el('div', { class: 'ios-strahlen', 'aria-hidden': 'true' });
    const bild = el('span', { class: 'ios-geschenk-bild' });
    bild.innerHTML = GESCHENK_SVG;
    const box = el('button', {
      type: 'button',
      class: 'ios-geschenk wippt',
      'aria-label': 'Geschenk öffnen',
      onclick: () => {
        if (offen) return;
        offen = true;
        box.disabled = true;
        box.classList.remove('wippt');
        box.classList.add('schuettelt');
        hinweis.remove();
        timer.push(setTimeout(() => {
          box.classList.remove('schuettelt');
          box.classList.add('offen');
          panel.append(konfettiSchicht(44));
          timer.push(setTimeout(() => {
            belohnung.classList.add('sichtbar');
            requestAnimationFrame(() => einpassen(belohnung));
            zaehleZahl(g.belohnung.samen, samenZahl);
          }, 150));
        }, 400));
      }
    }, strahlen, bild);

    const panel = el('div', { class: 'dialog ios-geschenk-dialog', role: 'alertdialog' },
      el('h2', { class: 'dialog-titel', text: 'Dein Tagesgeschenk 🎁' }),
      el('div', { class: 'ios-tage' }, kaestchen),
      meilenHinweis,
      el('div', { class: 'ios-geschenk-mitte' }, box, hinweis),
      belohnung
    );
    ebene = oeffneEbene(panel, {
      mitte: true,
      abbruch: () => {
        timer.forEach(clearTimeout);
        resolve();
      }
    });
    einpassen(panel);
  });
}

// ---------- Samen-Blatt ----------

// Tabelle „So verdienst du Samen“ (Spalten: was, samen, hinweis), aus samenQuellen
function samenTabelle() {
  return el('table', { class: 'ios-quellen' },
    el('thead', {}, el('tr', {}, el('th', { text: 'Was' }), el('th', { text: 'Samen' }), el('th', { text: 'Hinweis' }))),
    el('tbody', {}, samenQuellen(ctx.daten).map(q => el('tr', {},
      el('td', { text: q.was }),
      el('td', { class: 'ios-quellen-samen', text: q.samen }),
      el('td', { class: 'klein', text: q.hinweis }))))
  );
}

// Tippen auf die Münz-Anzeige: Bestand, Aussicht für morgen, Quellen, letzte Gutschriften und Weg zum Shop
function samenBlattZeigen() {
  const d = ctx.daten;
  const aussicht = heuteInAussicht(d, ctx.heute);
  const letzte = (d.spiel.verlauf || []).slice(0, 10);
  const blatt = sheet(el('div', { class: 'ios-samen-blatt' },
    el('h2', { class: 'sh-titel', text: 'Deine Samen' }),
    el('div', { class: 'ios-samen-gross' },
      svgBox(muenzSvg(44), 'ios-samen-muenze'),
      el('span', { class: 'ios-samen-zahl', text: zahl(d.spiel.samen) })),
    el('section', { class: 'karte ios-aussicht' },
      el('div', { class: 'klein', text: 'Heute in Aussicht' }),
      aussicht.samen > 0 ? el('div', { class: 'ios-aussicht-zahl', text: `+${zahl(aussicht.samen)} Samen` }) : null,
      el('p', { class: 'ios-aussicht-text', text: aussicht.text })),
    el('h3', { class: 'ios-ueberschrift', text: 'So verdienst du Samen' }),
    samenTabelle(),
    el('h3', { class: 'ios-ueberschrift', text: 'Zuletzt verdient' }),
    letzte.length
      ? el('ul', { class: 'ios-verlauf' }, letzte.map(e => el('li', { class: 'ios-verlauf-zeile' },
        el('span', { class: 'ios-verlauf-datum klein', text: kurzDatum(e.datum) }),
        el('span', { class: 'ios-verlauf-text', text: e.text }),
        el('span', { class: 'ios-verlauf-samen', text: `+${zahl(e.samen)}` }))))
      : el('p', { class: 'klein', text: 'Noch nichts, trag deine erste Ausgabe ein.' }),
    el('div', { class: 'aktionen' },
      el('button', {
        type: 'button',
        class: 'knopf knopf-primaer knopf-voll',
        text: 'Zum Shop',
        onclick: () => {
          blatt.schliessen();
          navigiere('shop');
        }
      }))
  ));
}

// ---------- Dialoge nach dem Start und nach dem Tageswechsel ----------

// Nacheinander: Raritaeten-Feiern, Challenges, offene Monatsabschlüsse, dann die Gehaltsfrage, dann der Wochenrückblick,
// dann das Tagesgeschenk, dann die Backup-Erinnerung. Nie zwei Abläufe gleichzeitig.
async function dialogeNachStart() {
  if (dialogeLaufen || !ctx.daten.einstellungen.ersteinrichtungFertig) return;
  dialogeLaufen = true;
  try {
    await festeZeigen();
    await challengeZeigen();
    await abschluesseZeigen();
    await gehaltZeigen();
    await rueckblickZeigen();
    await tagesgeschenkZeigen();
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
