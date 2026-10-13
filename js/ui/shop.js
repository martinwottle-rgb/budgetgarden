// Shop nach UI.md Abschnitt 5: Reiter Pflanzen · Möbel · Deko · Erweiterungen, Raster aus Karten mit Vorschau.
// Kaufen führt in den Garten zur Platzwahl, gekauft wird dort (garten.js). Erweiterungen werden hier direkt gekauft.

import { katalog, freiePlaetze, kaufen, levelAus, ERWEITERUNGEN, raritaetenListe } from '../spiel.js';
import { PFLANZEN } from '../grafik/pflanzen.js';
import { MOEBEL } from '../grafik/moebel.js';
import { DEKO } from '../grafik/deko.js';
import { RARITAETEN, silhouette } from '../grafik/raritaeten.js';
import { iso, poly } from '../grafik/hilfen.js';
import { vorschau, einpassen } from '../szene.js';
import { el, muenzSvg, svgBox, zahl } from './bausteine.js';

const REITER = [
  { id: 'pflanze', name: 'Pflanzen' },
  { id: 'moebel', name: 'Möbel' },
  { id: 'deko', name: 'Deko' },
  { id: 'erweiterung', name: 'Erweiterungen' },
  { id: 'raritaet', name: 'Raritäten ✨' }
];
const KEIN_PLATZ = 'Kein freier Platz, verkaufe oder verschiebe etwas';

// Gewählter Reiter bleibt beim Neuzeichnen erhalten
let reiterWahl = 'pflanze';

export function zeige(container, ctx) {
  const d = ctx.daten;
  const karten = reiterWahl === 'raritaet'
    ? raritaetenListe(d).map(r => raritaetKarte(ctx, r))
    : katalog(d).filter(a => a.kategorie === reiterWahl).map(a => (a.kategorie === 'erweiterung' ? erweiterungKarte(ctx, a) : artikelKarte(ctx, a)));
  const gutscheine = (d.spiel.gutscheine || []).length;
  container.append(
    el('h1', { class: 'titel', text: 'Shop' }),
    samenStand(d),
    gutscheine ? el('section', { class: 'karte sp12-gutschein-hinweis', text: `🎁 Du hast ${gutscheine} ${gutscheine === 1 ? 'Gutschein' : 'Gutscheine'}` }) : null,
    reiterLeiste(ctx),
    el('div', { class: 'raster' }, karten)
  );
  einpassen(container);
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

function reiterLeiste(ctx) {
  return el('div', { class: 'reiter sh-reiter' }, REITER.map(r => el('button', {
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
  return el('button', {
    type: 'button',
    class: 'karte sh-karte' + (ausgegraut ? ' sh-ausgegraut' : ''),
    onclick: () => kaufBlatt(ctx, a)
  },
    bildVon(a),
    el('div', { class: 'sh-name', text: a.name }),
    gratis
      ? el('div', { class: 'sh-preis sp12-gratis', text: '🎁 Gratis' })
      : el('div', { class: 'sh-preis' }, svgBox(muenzSvg(18), 'muenze-klein'), zahl(a.preis)),
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

// Vorschau: Bild aus dem Grafik-Modul, oder "bald" wenn der Artikel noch nicht gezeichnet ist
function bildVon(a) {
  const inhalt = grafikVon(a);
  return inhalt
    ? el('div', { class: 'sh-bild' }, vorschau(inhalt, 'sh-vorschau'))
    : el('div', { class: 'sh-bild sh-bald' }, el('span', { text: 'bald' }));
}

// SVG-Inhalt für Pflanzen (Stufe 4), Möbel und Deko. Null, wenn nicht gezeichnet.
function grafikVon(a) {
  if (!a.gezeichnet) return null;
  if (a.kategorie === 'pflanze') return PFLANZEN[a.typ].zeichne(4);
  if (a.kategorie === 'moebel') return MOEBEL[a.typ].zeichne(2, 2, 0);
  if (a.kategorie === 'deko') return DEKO[a.typ].zeichne();
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
  if (a.kategorie === 'pflanze') {
    const def = PFLANZEN[a.typ];
    if (!def) return '';
    const teil = def.groesse === 'gross' ? 'Groß · nur Boden' : 'Klein · passt auf Regale';
    return `${teil}. Gekauft als Steckling (Stufe 1), mit Samen bis Stufe 4 leveln. Die Vorschau zeigt Stufe 4.`;
  }
  if (a.kategorie === 'moebel') {
    const def = MOEBEL[a.typ];
    if (!def) return '';
    return `Belegt ${def.breite} × ${def.tiefe} Felder · ${def.plaetze.length} Stellplätze für Pflanzen.`;
  }
  if (a.kategorie === 'deko') {
    const def = DEKO[a.typ];
    if (!def) return '';
    return def.haengend ? 'Hängt an einem Haken unter dem Dach.' : 'Nur Boden, belegt ein Feld.';
  }
  return '';
}

// Kauf-Blatt: große Vorschau, Beschreibung, Preis. Kaufen führt zur Platzwahl im Garten.
function kaufBlatt(ctx, a) {
  const samen = ctx.daten.spiel.samen;
  const gratis = a.gutschein;
  const zuWenig = !gratis && samen < a.preis;
  const kaufbar = a.gezeichnet && (gratis || (a.freigeschaltet && !zuWenig));
  const grund = !a.gezeichnet ? 'Kommt bald.'
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
    gratis
      ? el('div', { class: 'sh-preis sh-preis-gross sp12-gratis', text: '🎁 Gratis mit Gutschein' })
      : el('div', { class: 'sh-preis sh-preis-gross' }, svgBox(muenzSvg(22), 'muenze-klein'), `${zahl(a.preis)} Samen`),
    el('div', { class: 'aktionen' },
      el('button', {
        type: 'button',
        class: 'knopf knopf-primaer knopf-voll',
        text: 'Kaufen',
        disabled: !kaufbar,
        onclick: () => {
          if (!freiePlaetze(ctx.daten, a.kategorie, a.typ).length) return ctx.toast(KEIN_PLATZ);
          blatt.schliessen();
          ctx.navigiere('garten', { platzieren: { kategorie: a.kategorie, typ: a.typ } });
        }
      }),
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
