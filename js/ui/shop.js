// Shop nach UI.md Abschnitt 5 und SPEC-2: Reiter Pflanzen · Möbel · Deko · Erweiterungen · Raritäten,
// dazu Samentüten, Saison (nur während einer Saison) und Designs. Raster aus Karten mit Vorschau.
// Kaufen führt in den Garten zur Platzwahl, gekauft wird dort (garten.js). Erweiterungen und Designs werden hier direkt gekauft.

import {
  katalog, freiePlaetze, kaufen, levelAus, ERWEITERUNGEN, raritaetenListe,
  samentuete, saatSeltenheit, saisonKatalog, aktiveSaison, designListe, designKaufen, designWaehlen, lagerListe,
  topfKatalog, topfKaufen, lagerVerkaufen, topfAuswahl, topfKaufenUndSetzen
} from '../spiel.js';
import { TOEPFE } from '../grafik/toepfe.js';
import { mitTopf } from '../grafik/topfwahl.js';
import { PFLANZEN } from '../grafik/pflanzen.js';
import { PFLANZEN2 } from '../grafik/pflanzen2.js';
import { MOEBEL } from '../grafik/moebel.js';
import { MOEBEL2 } from '../grafik/moebel2.js';
import { DEKO } from '../grafik/deko.js';
import { DEKO2 } from '../grafik/deko2.js';
import { SAAT } from '../grafik/saat.js';
import { SAISON } from '../grafik/saison.js';
import { RARITAETEN, silhouette } from '../grafik/raritaeten.js';
import { iso, poly, linie, kreis } from '../grafik/hilfen.js';
import { vorschau, einpassen } from '../szene.js';
import { el, muenzSvg, svgBox, zahl } from './bausteine.js';

const REITER = [
  { id: 'lager', name: 'Lager 📦' },
  { id: 'pflanze', name: 'Pflanzen' },
  { id: 'moebel', name: 'Möbel' },
  { id: 'deko', name: 'Deko' },
  { id: 'topf', name: 'Töpfe 🪴' },
  { id: 'erweiterung', name: 'Erweiterungen' },
  { id: 'raritaet', name: 'Raritäten ✨' },
  { id: 'tuete', name: 'Samentüten 🌱' },
  { id: 'saison', name: 'Saison 🍂' },
  { id: 'design', name: 'Designs 🎨' }
];
const KEIN_PLATZ = 'Kein freier Platz, verkaufe oder verschiebe etwas';
const KEIN_BEET = 'Kein freier Beetplatz, kauf ein Beet im Möbel-Reiter';
const BEET_HINWEIS = 'Für Saatgut aus Samentüten';

// Werte wie in spiel.js (nur für Anzeige und Vorprüfung, die Regeln gelten dort)
const TUETE_PREIS = 50;
const TUETE_LEVEL = 8;
const GARANTIE_LEGENDAER = 40;
const UMTAUSCH_MAX = 3;
const WAHRSCHEINLICHKEIT = [['gewoehnlich', 60], ['selten', 28], ['episch', 10], ['legendaer', 2]];

const SEL_FARBE = { gewoehnlich: '#9aa1a8', selten: '#6fae6a', episch: '#9b6fc9', legendaer: '#e8b83a' };
const SEL_NAME = { gewoehnlich: 'Gewöhnlich', selten: 'Selten', episch: 'Episch', legendaer: 'Legendär' };
const SEL_SCHRIFT = { gewoehnlich: '#3d2b20', selten: '#ffffff', episch: '#ffffff', legendaer: '#3d2b20' };

const SAISON_NAME = { herbst: 'Herbst', winter: 'Winter', fruehling: 'Frühling', sommer: 'Sommer' };
const SAISON_IM = { herbst: 'im Herbst', winter: 'im Winter', fruehling: 'im Frühling', sommer: 'im Sommer' };
const SAISON_EMOJI = { herbst: '🍂', winter: '❄️', fruehling: '🌷', sommer: '☀️' };
// Monat und Tag des letzten Tages je Saison (Winter endet am 6. Januar des Folgejahres)
const SAISON_ENDE = { herbst: [11, 30], winter: [1, 6], fruehling: [4, 30], sommer: [8, 31] };

// Grafik aller Artikel: Grundspiel und SPEC-2 zusammen
const pflanzenGrafik = (typ) => PFLANZEN[typ] || PFLANZEN2[typ] || null;
const moebelDef = (typ) => MOEBEL[typ] || MOEBEL2[typ] || null;
const dekoDef = (typ) => DEKO[typ] || DEKO2[typ] || null;
const istBeet = (typ) => !!(MOEBEL2[typ] && MOEBEL2[typ].beet);

// Zustand: gewählter Reiter bleibt beim Neuzeichnen erhalten
let reiterWahl = 'pflanze';

export function zeige(container, ctx, param) {
  const d = ctx.daten;
  // Aufruf mit Reiter, z. B. aus „Topf ändern“: { reiter: 'topf' }
  if (param && param.reiter && REITER.some(r => r.id === param.reiter)) reiterWahl = param.reiter;
  const saison = aktiveSaison(ctx.heute);
  // Lager-Reiter nur mit eingelagerten Teilen, Saison-Reiter in der Saison oder mit Saison-Gutschein
  const ansicht = {
    lager: lagerListe(d).length > 0,
    saison: !!saison || saisonGutscheine(d) > 0
  };
  if (reiterWahl === 'saison' && !ansicht.saison) reiterWahl = 'pflanze';
  if (reiterWahl === 'lager' && !ansicht.lager) reiterWahl = 'pflanze';
  const gutscheine = (d.spiel.gutscheine || []).length;
  // filter(Boolean): ein null würde von append() als Text "null" angezeigt
  container.append(...[
    el('h1', { class: 'titel', text: 'Shop' }),
    samenStand(d),
    gutscheine ? el('section', { class: 'karte sp12-gutschein-hinweis', text: `🎁 Du hast ${gutscheine} ${gutscheine === 1 ? 'Gutschein' : 'Gutscheine'}` }) : null,
    reiterLeiste(ctx, ansicht),
    inhaltDesReiters(ctx, saison)
  ].filter(Boolean));
  einpassen(container);
}

// Anzahl der Saison-Gutscheine (Tagesgeschenk, Adventskalender)
function saisonGutscheine(d) {
  return (d.spiel.gutscheine || []).filter(g => g.kategorie === 'saison').length;
}

function inhaltDesReiters(ctx, saison) {
  if (reiterWahl === 'lager') return lagerBereich(ctx);
  if (reiterWahl === 'topf') return topfBereich(ctx);
  if (reiterWahl === 'raritaet') return el('div', { class: 'raster' }, raritaetenListe(ctx.daten).map(r => raritaetKarte(ctx, r)));
  if (reiterWahl === 'tuete') return tuetenBereich(ctx);
  if (reiterWahl === 'saison') return saisonBereich(ctx, saison);
  if (reiterWahl === 'design') return designBereich(ctx);
  // Reihenfolge: Gutscheine, dann kaufbar (freigeschaltet), dann gesperrt; jeweils nach Level und Preis
  const rang = (a) => (a.gutschein ? 0 : a.freigeschaltet ? 1 : 2);
  const karten = katalog(ctx.daten).filter(a => a.kategorie === reiterWahl)
    .sort((x, y) => rang(x) - rang(y) || x.level - y.level || x.preis - y.preis)
    .map(a => (a.kategorie === 'erweiterung' ? erweiterungKarte(ctx, a) : artikelKarte(ctx, a)));
  return el('div', { class: 'raster' }, karten);
}

// Karte für Raritäten (goldener Rahmen): gesperrt mit Silhouette, Bedingung und Fortschritt;
// bereit mit voller Vorschau und „Pflanzen (gratis)“; gepflanzt mit Hinweis.
function raritaetKarte(ctx, r) {
  const f = r.fortschritt;
  if (r.zustand === 'gesperrt') {
    const prozent = f.soll > 0 ? Math.min(100, (f.ist / f.soll) * 100) : 0;
    return el('section', { class: 'karte ra-karte ra-gesperrt' },
      el('div', { class: 'sh-bild ra-bild' }, vorschau(silhouette(r.typ), 'sh-vorschau')),
      el('div', { class: 'sh-name', text: r.name }),
      el('div', { class: 'klein ra-bedingung', text: r.bedingung }),
      el('div', { class: 'ra-balken', role: 'img', 'aria-label': f.text }, el('span', { style: 'width:' + prozent.toFixed(1) + '%' })),
      el('div', { class: 'klein', text: f.text })
    );
  }
  const bild = el('div', { class: 'sh-bild ra-bild' },
    vorschau(RARITAETEN[r.typ].zeichne(4), 'sh-vorschau'),
    r.zustand === 'bereit' ? el('span', { class: 'ra-funkel', 'aria-hidden': 'true', text: '✦' }) : null
  );
  if (r.zustand === 'gepflanzt') {
    return el('section', { class: 'karte ra-karte ra-gepflanzt' },
      bild,
      el('div', { class: 'sh-name', text: r.name }),
      el('div', { class: 'sh-hinweis', text: 'Im Gewächshaus ✓' })
    );
  }
  return el('section', { class: 'karte ra-karte ra-bereit' },
    bild,
    el('div', { class: 'sh-name', text: r.name }),
    el('div', { class: 'klein', text: 'Freigeschaltet' }),
    el('button', {
      type: 'button',
      class: 'knopf knopf-primaer knopf-voll ra-knopf',
      text: 'Pflanzen (gratis)',
      onclick: () => {
        if (!freiePlaetze(ctx.daten, 'raritaet', r.typ).length) return ctx.toast(KEIN_PLATZ);
        ctx.navigiere('garten', { platzieren: { kategorie: 'raritaet', typ: r.typ } });
      }
    })
  );
}

// Samen-Stand oben
function samenStand(d) {
  const lv = levelAus(d.spiel.xp).level;
  return el('section', { class: 'karte sh-stand' },
    svgBox(muenzSvg(32), 'muenze-symbol'),
    el('div', { class: 'sh-stand-text' },
      el('div', { class: 'klein', text: 'Deine Samen' }),
      el('div', { class: 'sh-stand-zahl', text: zahl(d.spiel.samen) })
    ),
    el('div', { class: 'sh-stand-level klein', text: `Level ${lv}` })
  );
}

// Lager und Saison nur, wenn sie etwas zu zeigen haben (ansicht: { lager, saison })
function reiterLeiste(ctx, ansicht) {
  const liste = REITER.filter(r => (r.id !== 'saison' || ansicht.saison) && (r.id !== 'lager' || ansicht.lager));
  return el('div', { class: 'reiter sh-reiter' }, liste.map(r => el('button', {
    type: 'button',
    class: r.id === reiterWahl ? 'aktiv' : null,
    text: r.name,
    'aria-pressed': r.id === reiterWahl ? 'true' : 'false',
    onclick: () => {
      reiterWahl = r.id;
      ctx.navigiere('shop');
    }
  })));
}

// Karte für Pflanzen, Möbel und Deko. Antippen öffnet das Kauf-Blatt.
function artikelKarte(ctx, a) {
  const samen = ctx.daten.spiel.samen;
  // Mit Gutschein (Tagesgeschenk) ist der Artikel gratis und unabhängig von Level und Samen
  const gratis = a.gutschein;
  const gesperrt = !a.freigeschaltet && !gratis;
  const zuWenig = !gratis && samen < a.preis;
  const ausgegraut = !a.gezeichnet || gesperrt || zuWenig;
  const beet = a.kategorie === 'moebel' && istBeet(a.typ);
  return el('button', {
    type: 'button',
    class: 'karte sh-karte' + (ausgegraut ? ' sh-ausgegraut' : ''),
    onclick: () => kaufBlatt(ctx, a)
  },
    a.meilenstein ? el('div', { class: 'ios-stern-band', text: `★ Meilenstein Tag ${a.meilenstein} ★` }) : null,
    bildVon(a),
    el('div', { class: 'sh-name', text: a.name }),
    gratis
      ? el('div', { class: 'sh-preis sp12-gratis', text: '🎁 Gratis' })
      : el('div', { class: 'sh-preis' }, svgBox(muenzSvg(18), 'muenze-klein'), zahl(a.preis)),
    beet ? el('div', { class: 'sh-hinweis', text: BEET_HINWEIS }) : null,
    gesperrt ? el('div', { class: 'sh-hinweis', text: `🔒 ab Level ${a.level}` }) : null,
    !gesperrt && a.gezeichnet && zuWenig ? el('div', { class: 'sh-hinweis', text: `Noch ${zahl(a.preis - samen)} Samen` }) : null
  );
}

// Karte für Erweiterungen: direkt kaufen, mit Rückfrage
function erweiterungKarte(ctx, a) {
  const e = ERWEITERUNGEN.find(x => x.id === a.typ);
  const gh = ctx.daten.spiel.gewaechshaus;
  const vorhanden = gh.groesse >= e.groesse;
  const gesperrt = !a.freigeschaltet;
  const zuWenig = ctx.daten.spiel.samen < a.preis;
  const status = vorhanden ? 'Schon vorhanden'
    : gesperrt ? `🔒 ab Level ${a.level}`
      : zuWenig ? `Noch ${zahl(a.preis - ctx.daten.spiel.samen)} Samen`
        : null;
  return el('button', {
    type: 'button',
    class: 'karte sh-karte' + (vorhanden || gesperrt || zuWenig ? ' sh-ausgegraut' : ''),
    onclick: () => erweiterungKaufen(ctx, a, e)
  },
    el('div', { class: 'sh-bild' }, vorschau(gitterInhalt(e.groesse, gh.groesse), 'sh-vorschau')),
    el('div', { class: 'sh-name', text: a.name }),
    vorhanden ? null : el('div', { class: 'sh-preis' }, svgBox(muenzSvg(18), 'muenze-klein'), zahl(a.preis)),
    status ? el('div', { class: 'sh-hinweis', text: status }) : null
  );
}

// Vorschau-Inhalt eines Artikels für Level-Up und Tagesgeschenk (SVG-Text). Null, wenn nichts gezeichnet ist.
export function bildFuer(kategorie, typ) {
  if (kategorie === 'pflanze') return pflanzenGrafik(typ) ? pflanzenGrafik(typ).zeichne(4) : saisonBild(typ);
  if (kategorie === 'moebel') return moebelDef(typ) ? moebelDef(typ).zeichne(2, 2, 0) : null;
  if (kategorie === 'deko') return dekoDef(typ) ? dekoDef(typ).zeichne() : saisonBild(typ);
  if (kategorie === 'saison') return saisonBild(typ);
  return null;
}

// Saisonartikel aus der SAISON-Grafik (Stufe 4), sonst null
function saisonBild(typ) {
  return Object.prototype.hasOwnProperty.call(SAISON, typ) ? SAISON[typ].zeichne(4) : null;
}

// Vorschau: Bild aus dem Grafik-Modul, oder "bald" wenn der Artikel noch nicht gezeichnet ist
function bildVon(a) {
  const inhalt = grafikVon(a);
  return inhalt
    ? el('div', { class: 'sh-bild' }, vorschau(inhalt, 'sh-vorschau'))
    : el('div', { class: 'sh-bild sh-bald' }, el('span', { text: 'bald' }));
}

// SVG-Inhalt für Pflanzen (Stufe 4), Möbel, Deko und Saisonartikel. Null, wenn nicht gezeichnet.
function grafikVon(a) {
  if (!a.gezeichnet) return null;
  if (a.kategorie === 'pflanze') return pflanzenGrafik(a.typ).zeichne(4);
  if (a.kategorie === 'moebel') return moebelDef(a.typ).zeichne(2, 2, 0);
  if (a.kategorie === 'deko') return dekoDef(a.typ).zeichne();
  if (a.kategorie === 'saison') return SAISON[a.typ].zeichne(4);
  return null;
}

// Grundfläche als Raster aus Rauten. Neue Felder (über die aktuelle Größe hinaus) sind heller.
function gitterInhalt(groesse, aktuell) {
  let s = '';
  for (let i = 0; i < groesse; i++) {
    for (let j = 0; j < groesse; j++) {
      const neu = i >= aktuell || j >= aktuell;
      const farbe = neu ? '#fbf3e6' : ((i + j) % 2 ? '#e2bd94' : '#e9c9a3');
      s += poly([iso(i, j), iso(i + 1, j), iso(i + 1, j + 1), iso(i, j + 1)],
        `fill="${farbe}" stroke="#6b4a3a" stroke-width="1" stroke-linejoin="round"`);
    }
  }
  return s;
}

// Beschreibung im Kauf-Blatt: Größe und Platzbedarf
function beschreibung(a) {
  if (a.kategorie === 'saison') {
    if (!a.kaufbar) return `Nur ${SAISON_IM[a.saison]} aus Samentüten, wächst auf einem Beet.`;
    if (a.gutschein) return `Mit Gutschein gratis. Danach bleibt er dauerhaft in deinem Garten.`;
    return `Nur ${SAISON_IM[a.saison]} kaufbar. Danach bleibt er dauerhaft in deinem Garten.`;
  }
  if (a.kategorie === 'pflanze') {
    const teil = a.groesse === 'gross' ? 'Groß · nur Boden' : 'Klein · passt auf Regale';
    return `${teil}. Gekauft als Steckling (Stufe 1), mit Samen bis Stufe 4 leveln. Die Vorschau zeigt Stufe 4.`;
  }
  if (a.kategorie === 'moebel') {
    const def = moebelDef(a.typ);
    if (!def) return '';
    const beet = istBeet(a.typ) ? ' Für Saatgut aus Samentüten. Auf den Beetplätzen wächst nur Saat.' : '';
    return `Belegt ${def.breite} × ${def.tiefe} Felder · ${def.plaetze.length} Stellplätze für Pflanzen.${beet}`;
  }
  if (a.kategorie === 'deko') {
    const def = dekoDef(a.typ);
    if (!def) return '';
    return def.haengend ? 'Hängt an einem Haken unter dem Dach.' : 'Nur Boden, belegt ein Feld.';
  }
  return '';
}

// Freie Plätze für den Artikel. Saisonartikel werden nach ihrer Art (Pflanze oder Deko) geprüft.
function platzFuer(d, a) {
  if (a.kategorie === 'saison') return a.kaufbar ? freiePlaetze(d, a.art, a.typ) : [];
  return freiePlaetze(d, a.kategorie, a.typ);
}

// Kauf-Blatt: große Vorschau, Beschreibung, Preis. Kaufen führt zur Platzwahl im Garten.
function kaufBlatt(ctx, a) {
  const samen = ctx.daten.spiel.samen;
  const gratis = a.gutschein;
  const nurTueten = a.kategorie === 'saison' && !a.kaufbar;
  const zuWenig = !gratis && !nurTueten && samen < a.preis;
  const kaufbar = a.gezeichnet && !nurTueten && (gratis || (a.freigeschaltet && !zuWenig));
  const grund = !a.gezeichnet ? 'Kommt bald.'
    : nurTueten ? 'Wächst nur aus Samentüten.'
      : gratis ? null
        : !a.freigeschaltet ? `Wird ab Level ${a.level} freigeschaltet.`
          : zuWenig ? `Dafür fehlen ${zahl(a.preis - samen)} Samen.`
            : null;
  const inhalt = grafikVon(a);
  let blatt = null;
  blatt = ctx.sheet(el('div', {},
    el('h2', { class: 'sh-titel', text: a.name }),
    inhalt ? vorschau(inhalt, 'sh-vorschau-gross') : el('div', { class: 'sh-vorschau-gross sh-bald', text: 'bald' }),
    el('p', { class: 'sh-beschreibung klein', text: beschreibung(a) }),
    // Mit Gutschein steckt der Hinweis im Kaufknopf, kein eigenes Feld über dem Objekt
    gratis ? null
      : nurTueten
        ? el('div', { class: 'sh-preis sh-preis-gross', text: 'Nur aus Samentüten' })
        : el('div', { class: 'sh-preis sh-preis-gross' }, svgBox(muenzSvg(22), 'muenze-klein'), `${zahl(a.preis)} Samen`),
    el('div', { class: 'aktionen' },
      el('button', {
        type: 'button',
        class: gratis ? 'knopf knopf-voll ios-knopf-gold' : 'knopf knopf-primaer knopf-voll',
        text: gratis ? '🎁 Mit Gutschein gratis platzieren' : 'Kaufen',
        disabled: !kaufbar,
        onclick: () => {
          if (!platzFuer(ctx.daten, a).length) return ctx.toast(KEIN_PLATZ);
          blatt.schliessen();
          ctx.navigiere('garten', { platzieren: { kategorie: a.kategorie, typ: a.typ, name: a.name, preis: gratis ? 0 : a.preis } });
        }
      }),
      gratis ? el('p', { class: 'klein sh-grund', text: 'Dafür wird ein Gutschein eingelöst.' }) : null,
      grund ? el('p', { class: 'sh-grund', text: grund }) : null,
      el('button', { type: 'button', class: 'knopf knopf-leise knopf-voll', text: 'Abbrechen', onclick: () => blatt.schliessen() })
    )
  ));
  einpassen(blatt.element);
}

// Erweiterung kaufen: Rückfrage, dann direkt abbuchen. Gründe, warum es nicht geht, als Toast.
async function erweiterungKaufen(ctx, a, e) {
  const d = ctx.daten;
  if (d.spiel.gewaechshaus.groesse >= e.groesse) return ctx.toast('Diese Grundfläche hast du schon.');
  if (!a.freigeschaltet) return ctx.toast(`Wird ab Level ${a.level} freigeschaltet.`);
  if (d.spiel.samen < a.preis) return ctx.toast(`Dafür fehlen ${zahl(a.preis - d.spiel.samen)} Samen.`);
  const wahl = await ctx.dialog({
    titel: `${a.name} kaufen?`,
    text: `Der Garten wird ${e.groesse} × ${e.groesse} Felder groß. Kosten: ${zahl(a.preis)} Samen.`,
    knoepfe: [
      { text: 'Kaufen', art: 'primaer', wert: true },
      { text: 'Abbrechen', art: 'leise' }
    ]
  });
  if (wahl !== true) return;
  const r = kaufen(ctx.daten, 'erweiterung', e.id);
  if (r.fehler) return ctx.toast(r.fehler);
  ctx.speichern(r.daten);
}

// ---------- Saison ----------

// Enddatum der aktiven Saison, z. B. 30.11.2026
function saisonEnde(heute) {
  const s = aktiveSaison(heute);
  if (!s) return '';
  const [monat, tag] = SAISON_ENDE[s];
  const jahr = Number(heute.slice(0, 4)) + (s === 'winter' && Number(heute.slice(5, 7)) === 12 ? 1 : 0);
  return `${String(tag).padStart(2, '0')}.${String(monat).padStart(2, '0')}.${jahr}`;
}

function saisonBereich(ctx, saison) {
  // Saisonartikel sind nur in ihrer Saison zu haben und danach dauerhaft im Besitz, daher ohne Level-Sperre.
  // Saison-Gutscheine (gutschein: true) zeigt saisonKatalog auch außerhalb der Saison, dort gratis.
  const liste = saisonKatalog(ctx.daten, ctx.heute).map(a => ({ ...a, freigeschaltet: true }));
  const banner = saison
    ? [
      el('div', { class: 's20-banner-titel', text: `${SAISON_NAME[saison]}-Saison ${SAISON_EMOJI[saison]}` }),
      el('div', { class: 'klein', text: `Nur bis ${saisonEnde(ctx.heute)}` })
    ]
    : [
      el('div', { class: 's20-banner-titel', text: 'Saison-Gutscheine 🎁' }),
      el('div', { class: 'klein', text: 'Gratis mit Gutschein aus dem Tagesgeschenk' })
    ];
  return el('div', {},
    el('section', { class: 'karte s20-banner' }, banner),
    el('div', { class: 'raster' }, liste.map(a => saisonKarte(ctx, a)))
  );
}

function saisonKarte(ctx, a) {
  const samen = ctx.daten.spiel.samen;
  const gratis = !!a.gutschein;
  const zuWenig = a.kaufbar && !gratis && samen < a.preis;
  return el('button', {
    type: 'button',
    class: 'karte sh-karte' + (zuWenig || !a.kaufbar ? ' sh-ausgegraut' : ''),
    onclick: () => kaufBlatt(ctx, a)
  },
    a.exklusiv ? el('div', { class: 'adv-band', text: 'Exklusiv' }) : null,
    bildVon(a),
    el('div', { class: 'sh-name', text: a.name }),
    !a.kaufbar ? el('div', { class: 'sh-hinweis', text: 'Nur aus Samentüten' })
      : gratis ? el('div', { class: 'sh-preis sp12-gratis', text: '🎁 Gratis' })
        : el('div', { class: 'sh-preis' }, svgBox(muenzSvg(18), 'muenze-klein'), zahl(a.preis)),
    zuWenig ? el('div', { class: 'sh-hinweis', text: `Noch ${zahl(a.preis - samen)} Samen` }) : null
  );
}

// ---------- Lager (eingelagerte Teile, gratis wieder aufstellen) ----------

const hatEintrag = (tabelle, typ) => Object.prototype.hasOwnProperty.call(tabelle, typ);

function lagerBereich(ctx) {
  return el('div', { class: 'raster' }, lagerListe(ctx.daten).map(e => lagerKarte(ctx, e)));
}

// Karte wie artikelKarte. Antippen startet die Platzwahl im Garten (lagerId), ohne Kosten.
function lagerKarte(ctx, e) {
  const eintrag = (ctx.daten.spiel.lager || []).find(x => x.id === e.lagerId) || null;
  const art = eintrag ? lagerArt(eintrag) : e.kategorie;
  const passt = freiePlaetze(ctx.daten, art, e.typ).length > 0;
  const istTopf = e.kategorie === 'topf';
  return el('button', {
    type: 'button',
    class: 'karte sh-karte lg-karte' + (passt || istTopf ? '' : ' sh-ausgegraut'),
    onclick: () => lagerBlatt(ctx, e, eintrag, passt)
  },
    lagerBild(eintrag),
    el('div', { class: 'sh-name', text: e.name }),
    el('div', { class: 'sh-preis sp12-gratis', text: istTopf ? 'Für „Topf ändern“' : 'Gratis aufstellen' }),
    passt || istTopf ? null : el('div', { class: 'sh-hinweis', text: 'Gerade kein freier Platz' })
  );
}

// Blatt eines Lagerteils: aufstellen (bzw. Hinweis für Töpfe) und verkaufen zum halben Preis
function lagerBlatt(ctx, e, eintrag, passt) {
  const probe = lagerVerkaufen(ctx.daten, e.lagerId);
  const istTopf = e.kategorie === 'topf';
  let blatt = null;
  blatt = ctx.sheet(el('div', { class: 'lg-blatt' },
    el('h2', { class: 'sh-titel', text: e.name }),
    lagerBild(eintrag),
    istTopf
      ? el('p', { class: 'klein', text: 'Tippe im Garten eine Pflanze an und wähle „Topf ändern“. Kleine Töpfe passen zu kleinen Pflanzen, Kübel zu großen.' })
      : el('button', {
        type: 'button', class: 'knopf knopf-primaer knopf-voll', text: passt ? 'Gratis aufstellen' : 'Gerade kein freier Platz',
        disabled: passt ? null : true,
        onclick: () => { blatt.schliessen(); ctx.navigiere('garten', { platzieren: { kategorie: e.kategorie, typ: e.typ, lagerId: e.lagerId } }); }
      }),
    probe.fehler ? el('p', { class: 'klein', text: probe.fehler }) : el('button', {
      type: 'button', class: 'knopf knopf-leise knopf-voll',
      text: probe.erloes > 0 ? `Verkaufen für ${zahl(probe.erloes)} Samen` : 'Weggeben (ohne Samen)',
      onclick: () => {
        const r = lagerVerkaufen(ctx.daten, e.lagerId);
        if (r.fehler) return ctx.toast(r.fehler);
        blatt.schliessen();
        ctx.speichern(r.daten);
        ctx.toast(r.erloes > 0 ? `Verkauft: +${zahl(r.erloes)} Samen` : 'Weggegeben');
      }
    })
  ));
  einpassen(blatt.element);
}

// Saat im Lager wird wie Saat auf dem Beet geprüft, sonst zählt die Kategorie
function lagerArt(eintrag) {
  return eintrag.kategorie === 'pflanze' && eintrag.eigenschaften && eintrag.eigenschaften.saat ? 'saat' : eintrag.kategorie;
}

// Bild eines Lagerteils: Raritäten und Saat mit eigener Grafik, sonst die übliche Vorschau
function lagerBild(eintrag) {
  let inhalt = null;
  if (eintrag) {
    const eig = eintrag.eigenschaften || {};
    if (eintrag.kategorie === 'pflanze' && eig.rar && hatEintrag(RARITAETEN, eintrag.typ)) inhalt = RARITAETEN[eintrag.typ].zeichne(4);
    else if (eintrag.kategorie === 'pflanze' && eig.saat && hatEintrag(SAAT, eintrag.typ)) inhalt = SAAT[eintrag.typ].zeichne(4);
    else inhalt = bildFuer(eintrag.kategorie, eintrag.typ);
  }
  return inhalt
    ? el('div', { class: 'sh-bild lg-bild' }, vorschau(inhalt, 'sh-vorschau'))
    : el('div', { class: 'sh-bild sh-bald' }, el('span', { text: 'bald' }));
}

// ---------- Samentüten ----------

function tuetenBereich(ctx) {
  const sp = ctx.daten.spiel;
  const gesperrt = levelAus(sp.xp).level < TUETE_LEVEL;
  const gratis = sp.gratisTueten || 0;
  const zuWenig = sp.samen < TUETE_PREIS;
  const offen = Math.max(1, GARANTIE_LEGENDAER - ((sp.tuete && sp.tuete.seitLegendaer) || 0));
  const hinweis = gesperrt ? `🔒 ab Level ${TUETE_LEVEL}, du brauchst ein Beet`
    : gratis > 0 ? 'Zuerst deine Gratis-Tüten öffnen.'
      : zuWenig ? `Noch ${zahl(TUETE_PREIS - sp.samen)} Samen`
        : null;
  return el('div', {},
    el('section', { class: 'karte s20-tuete-karte' },
      el('div', { class: 's20-tuete-kopf' },
        svgBox(tuetenSvg(), 's20-tuete-bild'),
        el('div', { class: 's20-tuete-text' },
          el('h2', { class: 'sh-titel', text: 'Samentüte' }),
          el('p', { class: 'klein', text: 'Enthält eine zufällige Sorte. Von einer Sorte passen 3 ins Saatgut, jede weitere bringt Samen zurück.' })
        )
      ),
      el('div', { class: 'sh-preis sh-preis-gross' }, svgBox(muenzSvg(22), 'muenze-klein'), `${zahl(TUETE_PREIS)} Samen`),
      gratis > 0 ? el('p', { class: 's20-gratis', text: `Gratis-Tüten: ${gratis}` }) : null,
      el('div', { class: 'aktionen' },
        el('button', {
          type: 'button',
          class: gratis > 0 ? 'knopf knopf-leise knopf-voll' : 'knopf knopf-primaer knopf-voll',
          text: 'Kaufen',
          disabled: gesperrt || zuWenig || gratis > 0,
          onclick: () => tuetOeffnen(ctx)
        }),
        gratis > 0
          ? el('button', { type: 'button', class: 'knopf knopf-primaer knopf-voll', text: 'Gratis öffnen', disabled: gesperrt, onclick: () => tuetOeffnen(ctx) })
          : null,
        hinweis ? el('p', { class: 'sh-grund', text: hinweis }) : null
      )
    ),
    el('section', { class: 'karte s20-tuete-karte' },
      el('h3', { class: 's20-ueberschrift', text: 'Wahrscheinlichkeiten' }),
      el('ul', { class: 's20-liste' }, WAHRSCHEINLICHKEIT.map(([s, p]) => el('li', { class: 's20-zeile' },
        el('span', { class: 's20-punkt', style: `background:${SEL_FARBE[s]}`, 'aria-hidden': 'true' }),
        el('span', { class: 's20-zeile-name', text: SEL_NAME[s] }),
        el('span', { class: 's20-zeile-wert', text: s === 'legendaer' ? `${p} % · garantiert spätestens jede ${GARANTIE_LEGENDAER}. Tüte` : `${p} %` })
      ))),
      el('p', { class: 'klein', text: 'Garantiert spätestens jede 10. Tüte mindestens selten.' }),
      el('p', { class: 's20-fortschritt', text: offen === 1 ? 'Die nächste Tüte ist garantiert legendär.' : `Noch ${offen} Tüten bis garantiert legendär.` })
    ),
    saatgutBereich(ctx)
  );
}

// Tüte öffnen. samentuete() nimmt zuerst eine Gratis-Tüte, sonst kostet sie 50 Samen. Danach speichern und Animation zeigen.
function tuetOeffnen(ctx) {
  const vorher = { ...(ctx.daten.spiel.saatgut || {}) };
  const r = samentuete(ctx.daten, ctx.heute);
  if (r.fehler) return ctx.toast(r.fehler);
  ctx.speichern(r.daten);
  oeffneTuete(ctx, r, vorher[r.sorte] || 0);
}

// Saatgut-Pflanze auf einen freien Beetplatz setzen (Platzwahl im Garten)
function saatPflanzenWaehlen(ctx, typ) {
  if (!freiePlaetze(ctx.daten, 'saat', typ).length) return ctx.toast(KEIN_BEET);
  ctx.navigiere('garten', { platzieren: { kategorie: 'saat', typ } });
}

// Alle Saatsorten: Saatgut-Pflanzen und die Saison-Saat (Zierkürbis)
function saatSorten() {
  const typen = [...Object.keys(SAAT), ...Object.keys(SAISON).filter(t => SAISON[t].art === 'saat')];
  return typen.map(typ => ({ typ, name: saatName(typ), seltenheit: saatSeltenheit(typ) }));
}

function saatName(typ) {
  return (SAAT[typ] || SAISON[typ]).name;
}

function saatGrafik(typ) {
  return (SAAT[typ] || SAISON[typ]).zeichne(4);
}

function saatgutBereich(ctx) {
  return el('div', { class: 's20-saatgut' },
    el('h3', { class: 's20-ueberschrift', text: 'Dein Saatgut' }),
    el('div', { class: 'raster' }, saatSorten().map(s => saatKarte(ctx, s)))
  );
}

// Vorhandene Sorte: Anzahl und Knopf Pflanzen. Bekannte ohne Vorrat: gedämpft. Unbekannte: Fragezeichen.
function saatKarte(ctx, s) {
  const sp = ctx.daten.spiel;
  const anzahl = (sp.saatgut || {})[s.typ] || 0;
  const bekannt = (sp.entdeckt || []).includes(s.typ);
  const farbe = SEL_FARBE[s.seltenheit];
  if (!bekannt && !anzahl) {
    return el('section', { class: 'karte s20-saatkarte s20-unbekannt' },
      el('div', { class: 'sh-bild' }, el('span', { class: 's20-frage', style: `background:${farbe}`, 'aria-hidden': 'true', text: '?' })),
      el('div', { class: 'sh-name', text: 'Unbekannte Sorte' }),
      marke(s.seltenheit)
    );
  }
  return el('section', { class: 'karte s20-saatkarte' + (anzahl ? '' : ' s20-leer') },
    el('div', { class: 'sh-bild' }, vorschau(saatGrafik(s.typ), 'sh-vorschau')),
    el('div', { class: 'sh-name', text: s.name }),
    marke(s.seltenheit),
    el('div', { class: 'sh-hinweis', text: anzahl ? `${anzahl} auf Lager` : 'Gerade keins da' }),
    anzahl ? el('button', { type: 'button', class: 'knopf knopf-primaer knopf-voll', text: 'Pflanzen', onclick: () => saatPflanzenWaehlen(ctx, s.typ) }) : null
  );
}

function marke(seltenheit) {
  return el('span', {
    class: 's20-marke',
    style: `background:${SEL_FARBE[seltenheit]};color:${SEL_SCHRIFT[seltenheit]}`,
    text: SEL_NAME[seltenheit]
  });
}

// ---------- Öffnen-Animation (Vollbild-Overlay) ----------
// Stufen: 1 wackelt, 2 reißt auf und das Kartenband läuft durch die Seltenheiten, bremst ab und rastet ein,
// 3 Karte erscheint (legendär mit Konfetti), 4 Knöpfe. Antippen des Hintergrunds springt zur letzten Stufe.
const ZEITEN = [900];
const BAND_DAUER = 4300;      // Laufzeit des Bands bis zum Einrasten (ms)
const KACHEL_BREITE = 74;     // Kachel 64 px plus 10 px Abstand
const BAND_VOR = 44;          // Kacheln vor dem Treffer
const SEL_ORDNUNG = ['gewoehnlich', 'selten', 'episch', 'legendaer'];

// Farbe mischen: a und b als #rrggbb, t = Anteil von b
function mische(a, b, t) {
  const h = (x) => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16));
  const [p, q] = [h(a), h(b)];
  return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// Eine Kachel im Band: nur Farbe (Verlauf, Glanz, Samenkorn), kein Text
function bandKachel(seltenheit) {
  const f = SEL_FARBE[seltenheit];
  return el('div', {
    class: 's20-kachel s20-k-' + seltenheit,
    style: `--k-hell:${mische(f, '#ffffff', 0.45)};--k-mitte:${f};--k-dunkel:${mische(f, '#3d2b20', 0.35)}`
  }, el('span', { class: 's20-korn', 'aria-hidden': 'true' }));
}

// Zufällige Folge, die natürlich wirkt (viel gewöhnlich, wenig legendär), mit dem Treffer an Stelle BAND_VOR.
// Direkt danach liegt oft eine seltenere Kachel: das knappe Verpassen macht das Abbremsen spannend.
function bandFolge(treffer) {
  const gewicht = [['gewoehnlich', 52], ['selten', 28], ['episch', 14], ['legendaer', 6]];
  const zieh = () => { let x = Math.random() * 100; for (const [k, g] of gewicht) { if ((x -= g) < 0) return k; } return 'gewoehnlich'; };
  const folge = [];
  for (let i = 0; i < BAND_VOR; i++) {
    let k = zieh();
    if (i > 0 && k === folge[i - 1] && Math.random() < 0.6) k = zieh();
    folge.push(k);
  }
  folge[BAND_VOR - 1] = treffer === 'legendaer' ? 'episch' : SEL_ORDNUNG[Math.max(0, SEL_ORDNUNG.indexOf(treffer) - 1)];
  folge.push(treffer);
  const hoeher = SEL_ORDNUNG[Math.min(3, SEL_ORDNUNG.indexOf(treffer) + 1)];
  folge.push(treffer === 'legendaer' ? 'selten' : (Math.random() < 0.7 ? hoeher : zieh()), zieh(), zieh(), zieh());
  return folge;
}

function oeffneTuete(ctx, r, vorherAnzahl) {
  const farbe = SEL_FARBE[r.seltenheit];
  const hinweis = r.umgetauscht ? `Schon ${UMTAUSCH_MAX} auf Lager: +${zahl(r.umgetauscht)} Samen`
    : vorherAnzahl ? `Jetzt ${vorherAnzahl + 1} auf Lager`
      : 'Neu in deinem Saatgut';
  const timer = [];
  let stufe = 1;
  let konfetti = false;

  const hinter = el('div', {
    class: 's20-hinter s20-wackel',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Samentüte öffnen',
    style: `--s20-ziel:${farbe}`
  });

  const setze = (neu) => {
    if (neu <= stufe) return;
    stufe = neu;
    if (stufe === 2) timer.push(setTimeout(bandLaufen, 380));
    hinter.classList.toggle('s20-wackel', stufe === 1);
    hinter.classList.toggle('s20-reisst', stufe >= 2);
    hinter.classList.toggle('s20-zeigt', stufe >= 3);
    hinter.classList.toggle('s20-fertig', stufe >= 4);
    if (stufe >= 3 && r.seltenheit === 'legendaer' && !konfetti) {
      konfetti = true;
      hinter.append(konfettiSchicht());
    }
  };
  const schliesse = () => {
    timer.forEach(clearTimeout);
    cancelAnimationFrame(raf);
    hinter.remove();
  };

  // Kartenband mit Zeiger oben und unten, Rand weich ausgeblendet
  const folge = bandFolge(r.seltenheit);
  const kacheln = folge.map(bandKachel);
  const band = el('div', { class: 's20-band' }, ...kacheln);
  const ring = el('div', { class: 's20-ring', 'aria-hidden': 'true' });
  const bandWrap = el('div', { class: 's20-band-wrap', 'aria-hidden': 'true' },
    el('div', { class: 's20-zeiger s20-zeiger-oben' }), band, el('div', { class: 's20-zeiger s20-zeiger-unten' }), ring);
  let raf = 0;
  const bandLaufen = () => {
    const breite = bandWrap.clientWidth || 320;
    // Ziel: Mitte der Trefferkachel unter dem Zeiger, mit kleinem Zufallsversatz innerhalb der Kachel
    const versatz = (Math.random() - 0.5) * 30;
    const ziel = BAND_VOR * KACHEL_BREITE + 32 - breite / 2 + versatz;
    const ueber = 14; // federt etwas über das Ziel hinaus und kommt zurück
    const start = performance.now();
    let zuletzt = -1;
    const schritt = (jetzt) => {
      const t = Math.min(1, (jetzt - start) / BAND_DAUER);
      // Schnell an, sehr lang auslaufend (Quint), am Ende kleines Nachfedern
      let x;
      if (t < 0.93) x = (ziel + ueber) * (1 - Math.pow(1 - t / 0.93, 5));
      else { const u = (t - 0.93) / 0.07; x = ziel + ueber * (1 - (1 - Math.pow(1 - u, 3))); }
      band.style.transform = `translate3d(${-x}px,0,0)`;
      const mitte = Math.floor((x + breite / 2) / KACHEL_BREITE);
      if (mitte !== zuletzt && kacheln[mitte]) {
        if (kacheln[zuletzt]) kacheln[zuletzt].classList.remove('s20-mitte');
        kacheln[mitte].classList.add('s20-mitte');
        zuletzt = mitte;
        if (navigator.vibrate && t > 0.55) navigator.vibrate(4);
      }
      if (t < 1) { raf = requestAnimationFrame(schritt); return; }
      kacheln[BAND_VOR].classList.add('s20-treffer');
      hinter.classList.add('s20-eingerastet');
      if (r.seltenheit === 'episch' || r.seltenheit === 'legendaer') hinter.classList.add('s20-blitz');
      timer.push(setTimeout(() => setze(3), 900));
      timer.push(setTimeout(() => setze(4), 1400));
    };
    raf = requestAnimationFrame(schritt);
  };

  const buehne = el('div', { class: 's20-buehne' },
    el('div', { class: 's20-licht', 'aria-hidden': 'true' }),
    svgBox(tuetenSvg(), 's20-tuete-svg'),
    bandWrap,
    el('div', { class: 's20-ergebnis-wrap' },
      el('section', { class: 'karte s20-ergebnis' },
        el('div', { class: 'sh-bild s20-ergebnis-bild' }, vorschau(saatGrafik(r.sorte), 'sh-vorschau')),
        el('div', { class: 's20-ergebnis-name', text: saatName(r.sorte) }),
        marke(r.seltenheit),
        el('div', { class: 'klein s20-ergebnis-hinweis', text: hinweis })
      )
    )
  );
  const moeglich = ctx.daten.spiel.gratisTueten > 0 || ctx.daten.spiel.samen >= TUETE_PREIS;
  const aktionen = el('div', { class: 's20-aktionen' },
    el('button', {
      type: 'button',
      class: 'knopf knopf-leise',
      text: 'Noch eine',
      disabled: !moeglich,
      onclick: () => { schliesse(); tuetOeffnen(ctx); }
    }),
    el('button', {
      type: 'button',
      class: 'knopf knopf-primaer',
      text: 'Jetzt pflanzen',
      onclick: () => { schliesse(); saatPflanzenWaehlen(ctx, r.sorte); }
    })
  );

  hinter.append(buehne, aktionen);
  hinter.addEventListener('click', () => {
    if (stufe >= 4) return;
    timer.forEach(clearTimeout);
    cancelAnimationFrame(raf);
    setze(4);
  });
  document.body.append(hinter);
  einpassen(hinter);

  // Erst wackeln, dann reißt die Tüte auf und das Band läuft; Stufe 3 und 4 setzt das Band nach dem Einrasten.
  // Ohne Bewegung (prefers-reduced-motion) direkt zur Karte.
  const ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (ruhig) { setze(4); return; }
  timer.push(setTimeout(() => setze(2), ZEITEN[0]));
}

// Goldenes Konfetti für legendäre Samen
function konfettiSchicht() {
  const farben = ['#f2c14e', '#e8b83a', '#fff0b3', '#d9a441', '#fbf3e6'];
  const schicht = el('div', { class: 's20-konfetti', 'aria-hidden': 'true' });
  for (let i = 0; i < 36; i++) {
    const links = (Math.random() * 96).toFixed(1);
    const dx = Math.round(Math.random() * 120 - 60);
    const rot = Math.round(Math.random() * 720 - 360);
    const verzoegerung = (Math.random() * 0.5).toFixed(2);
    schicht.append(el('span', {
      style: `left:${links}%;background:${farben[i % farben.length]};--s20-dx:${dx}px;--s20-rot:${rot}deg;animation-delay:${verzoegerung}s`
    }));
  }
  return schicht;
}

// Papiertüte im Mid-Century-Stil: Senf-Körper, Petrol-Kragen mit Zackenrand, Creme-Etikett mit Keimling.
// Klassen für die Animation: s20-klappe (oberer Kragen), s20-innen (Öffnung, leuchtet in Seltenheitsfarbe).
function tuetenSvg() {
  let zacken = 'M12,46 L12,30';
  for (let x = 12; x < 108; x += 8) zacken += ` L${x + 4},24 L${x + 8},30`;
  zacken += ' L108,46 Z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" aria-hidden="true">' +
    '<path d="M18,46 L102,46 L96,140 Q95,146 89,146 L31,146 Q25,146 24,140 Z" fill="#d9a441" stroke="#6b4a3a" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<rect class="s20-innen" x="18" y="34" width="84" height="12"/>' +
    `<path class="s20-klappe" d="${zacken}" fill="#2f6f73" stroke="#6b4a3a" stroke-width="1.5" stroke-linejoin="round"/>` +
    '<rect x="34" y="70" width="52" height="46" rx="4" fill="#f3e6cf" stroke="#6b4a3a" stroke-width="1.2"/>' +
    '<path d="M60,112 V88" stroke="#2f6f73" stroke-width="2" stroke-linecap="round"/>' +
    '<ellipse cx="51" cy="88" rx="8" ry="4.5" transform="rotate(-30 51 88)" fill="#9fb79a" stroke="#2f5a30" stroke-width="0.9"/>' +
    '<ellipse cx="69" cy="84" rx="8" ry="4.5" transform="rotate(30 69 84)" fill="#9fb79a" stroke="#2f5a30" stroke-width="0.9"/>' +
    '<path d="M44,112 H76" stroke="#2f6f73" stroke-width="1.5" stroke-linecap="round"/>' +
    '<text x="60" y="131" text-anchor="middle" font-size="9" font-weight="800" fill="#2f6f73" letter-spacing="1">SAMEN</text>' +
    '</svg>';
}

// ---------- Designs ----------

// Farben der Vorschau-Kacheln (Boden: zwei Töne und Muster, Rahmen: Profilfarbe)
const BODEN_FARBE = {
  dielen: { a: '#c58b55', b: '#b87a48', linie: '#8a5228' },
  terrazzo: { a: '#ece4d6', b: '#e2d8c6', linie: '#b9a58c' },
  fischgraet: { a: '#b8743d', b: '#a86a36', linie: '#8a5228' },
  marmor: { a: '#eef0ec', b: '#e1e5df', linie: '#9aa39a' },
  fliesen: { a: '#dcebea', b: '#c9e0df', linie: '#2f6f73' }
};
const RAHMEN_FARBE = { teak: '#b8743d', petrol: '#2f6f73', messing: '#c9a14a', senf: '#d9a441' };

// Dächer entfallen (SPEC-2, Nachtrag 14.10.): nur Boden und Rahmen
function designBereich(ctx) {
  const liste = designListe(ctx.daten);
  const gruppen = [['boden', 'Boden'], ['rahmen', 'Rahmen']];
  return el('div', {}, gruppen.map(([kat, titel]) => el('div', { class: 's20-gruppe' },
    el('h3', { class: 's20-ueberschrift', text: titel }),
    el('div', { class: 'raster' }, liste.filter(e => e.kategorie === kat).map(e => designKarte(ctx, e)))
  )));
}

function designKarte(ctx, e) {
  const samen = ctx.daten.spiel.samen;
  const zuWenig = !e.gekauft && samen < e.preis;
  let aktion;
  if (e.gewaehlt) aktion = el('button', { type: 'button', class: 'knopf knopf-leise knopf-voll', text: 'Aktiv ✓' });
  else if (e.gekauft) aktion = el('button', { type: 'button', class: 'knopf knopf-primaer knopf-voll', text: 'Verwenden', onclick: () => designAktion(ctx, e, 'waehlen') });
  else if (!e.freigeschaltet) aktion = el('p', { class: 'sh-hinweis', text: `🔒 ab Level ${e.level}` });
  else aktion = el('button', { type: 'button', class: 'knopf knopf-primaer knopf-voll', text: 'Kaufen', disabled: zuWenig, onclick: () => designAktion(ctx, e, 'kaufen') });
  return el('section', { class: 'karte s20-design' + (e.gewaehlt ? ' s20-aktiv' : '') },
    el('div', { class: 'sh-bild' }, svgBox(designSvg(e.kategorie, e.id), 's20-design-bild')),
    el('div', { class: 'sh-name', text: e.name }),
    e.gekauft ? null
      : e.preis ? el('div', { class: 'sh-preis' }, svgBox(muenzSvg(18), 'muenze-klein'), zahl(e.preis))
        : el('div', { class: 'sh-hinweis', text: 'Gratis' }),
    !e.gekauft && e.freigeschaltet && zuWenig ? el('div', { class: 'sh-hinweis', text: `Noch ${zahl(e.preis - samen)} Samen` }) : null,
    aktion
  );
}

function designAktion(ctx, e, art) {
  const r = art === 'kaufen'
    ? designKaufen(ctx.daten, e.kategorie, e.id)
    : designWaehlen(ctx.daten, e.kategorie, e.id);
  if (r.fehler) return ctx.toast(r.fehler);
  ctx.speichern(r.daten);
}

function designSvg(kategorie, id) {
  const inhalt = kategorie === 'boden' ? bodenSvg(id) : rahmenSvg(id);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90" aria-hidden="true">${inhalt}</svg>`;
}

// Bodenmuster aus Rauten, je Design eine Zusatzlinie
function bodenSvg(id) {
  const b = BODEN_FARBE[id] || BODEN_FARBE.dielen;
  const w = 24;
  const h = 12;
  let s = '';
  for (let m = -8; m <= 8; m++) {
    for (let n = -8; n <= 8; n++) {
      const cx = 60 + (m + n) * w / 2;
      const cy = 45 + (m - n) * h / 2;
      const fuell = (m + n) % 2 ? b.a : b.b;
      s += poly([[cx, cy - h / 2], [cx + w / 2, cy], [cx, cy + h / 2], [cx - w / 2, cy]],
        `fill="${fuell}" stroke="${b.linie}" stroke-width="0.8" stroke-linejoin="round"`);
      if (id === 'dielen') s += linie([cx - w / 2, cy], [cx + w / 2, cy], `stroke="${b.linie}" stroke-width="0.6" opacity="0.5"`);
      if (id === 'fischgraet') s += linie([cx, cy - h / 2], [cx, cy + h / 2], `stroke="${b.linie}" stroke-width="0.8"`);
      if (id === 'terrazzo') s += kreis(cx, cy, 1.3, `fill="${(m + n) % 3 ? '#9aa1a8' : '#c9a14a'}"`);
    }
  }
  return s;
}

// Fenster mit Rahmenprofil in der Designfarbe
function rahmenSvg(id) {
  const f = RAHMEN_FARBE[id] || RAHMEN_FARBE.teak;
  return '<rect x="0" y="0" width="120" height="90" fill="#f3e6cf"/>' +
    '<rect x="30" y="12" width="60" height="66" rx="3" fill="#dff1f3"/>' +
    `<path d="M60,12 V78 M30,45 H90" stroke="${f}" stroke-width="4"/>` +
    `<rect x="30" y="12" width="60" height="66" rx="3" fill="none" stroke="${f}" stroke-width="8"/>` +
    '<rect x="26" y="8" width="68" height="74" rx="4" fill="none" stroke="#6b4a3a" stroke-width="0.8"/>';
}

// ---------- Töpfe (SPEC-5): kaufen, landen im Lager, Wechsel über das Pflanzenblatt ----------

function topfBild(typ) {
  const t = TOEPFE[typ];
  const [R, H] = t && t.groesse === 'kuebel' ? [18, 26] : [12, 18];
  return el('div', { class: 'sh-bild' }, vorschau(t ? t.zeichne(R, H) : '', 'sh-vorschau'));
}

function topfBereich(ctx) {
  const liste = topfKatalog(ctx.daten);
  const gruppe = (groesse, titel, text) => [
    el('div', { class: 'abschnitt', text: titel }),
    el('p', { class: 'klein tp-hinweis', text }),
    el('div', { class: 'raster' }, liste.filter(a => a.groesse === groesse).map(a => topfKarte(ctx, a)))
  ];
  return el('div', {},
    ...gruppe('klein', 'Kleine Töpfe', 'Für kleine Pflanzen. Gekaufte Töpfe liegen im Lager; tippe eine Pflanze an und wähle „Topf ändern“.'),
    ...gruppe('kuebel', 'Kübel', 'Für große Pflanzen wie Monstera, Strelitzie oder Feigenbaum.'));
}

function topfKarte(ctx, a) {
  const samen = ctx.daten.spiel.samen;
  const zuWenig = samen < a.preis;
  return el('button', {
    type: 'button',
    class: 'karte sh-karte' + (!a.freigeschaltet || zuWenig ? ' sh-ausgegraut' : ''),
    onclick: () => topfKaufBlatt(ctx, a)
  },
    topfBild(a.typ),
    el('div', { class: 'sh-name', text: a.name }),
    el('div', { class: 'sh-preis' }, svgBox(muenzSvg(18), 'muenze-klein'), zahl(a.preis)),
    !a.freigeschaltet ? el('div', { class: 'sh-hinweis', text: `🔒 ab Level ${a.level}` })
      : a.imLager ? el('div', { class: 'sh-hinweis', text: `${a.imLager} im Lager` })
        : zuWenig ? el('div', { class: 'sh-hinweis', text: `Noch ${zahl(a.preis - samen)} Samen` }) : null
  );
}

function topfKaufBlatt(ctx, a) {
  // Erst die Pflanze wählen, dann wird bezahlt (Kauf und Einsetzen in einem Schritt)
  const passend = ctx.daten.spiel.gewaechshaus.pflanzen.filter(p => topfAuswahl(ctx.daten, p.id).some(t => t.typ === a.typ && !t.aktuell));
  let wahl = null;
  let blatt = null;
  const raster = el('div', { class: 'raster' });
  const knopfBox = el('div', { class: 'aktionen tp-knoepfe' });
  const zeichnen = () => {
    raster.replaceChildren(...passend.map(p => {
      const def = PFLANZEN[p.typ] || PFLANZEN2[p.typ] || SAISON[p.typ];
      return el('button', {
        type: 'button',
        class: 'karte sh-karte tp-wahl' + (p === wahl ? ' tp-aktuell' : ''),
        'aria-pressed': p === wahl ? 'true' : 'false',
        onclick: () => { wahl = p; zeichnen(); }
      },
        el('div', { class: 'sh-bild' }, def ? vorschau(mitTopf(TOEPFE[a.typ].zeichne, () => def.zeichne(p.stufe, false, 'boden', p.schmuck || null)), 'sh-vorschau') : null),
        el('div', { class: 'sh-name', text: def ? def.name : p.typ }));
    }));
    const zuWenig = ctx.daten.spiel.samen < a.preis;
    knopfBox.replaceChildren(
      el('button', {
        type: 'button', class: 'knopf knopf-primaer knopf-voll',
        disabled: !a.freigeschaltet || zuWenig || !wahl ? true : null,
        text: !a.freigeschaltet ? `🔒 ab Level ${a.level}` : zuWenig ? `Noch ${zahl(a.preis - ctx.daten.spiel.samen)} Samen`
          : !wahl ? 'Pflanze auswählen' : `Für ${zahl(a.preis)} Samen kaufen und einsetzen`,
        onclick: () => {
          const r = topfKaufenUndSetzen(ctx.daten, wahl.id, a.typ);
          if (r.fehler) return ctx.toast(r.fehler);
          blatt.schliessen();
          ctx.speichern(r.daten);
          ctx.toast(`${a.name} gekauft und eingesetzt`);
        }
      }),
      el('button', { type: 'button', class: 'knopf knopf-leise knopf-voll', text: 'Abbrechen', onclick: () => blatt.schliessen() }));
    if (blatt) einpassen(blatt.element);
  };
  zeichnen();
  blatt = ctx.sheet(el('div', {},
    el('h2', { class: 'sh-titel', text: a.name }),
    topfBild(a.typ),
    el('div', { class: 'sh-preis sh-preis-gross' }, svgBox(muenzSvg(22), 'muenze-klein'), `${zahl(a.preis)} Samen`),
    passend.length
      ? el('p', { class: 'klein', text: 'Für welche Pflanze? Bezahlt wird erst beim Einsetzen, der alte Topf kommt ins Lager.' })
      : el('p', { class: 'klein', text: a.groesse === 'kuebel' ? 'Gerade gibt es keine große Pflanze für diesen Kübel.' : 'Gerade gibt es keine kleine Pflanze für diesen Topf.' }),
    raster, knopfBox));
  einpassen(blatt.element);
}
