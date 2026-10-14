// Isometrische Gewaechshaus-Szene als SVG. Der Raum (Boden, Waende, Dach, Efeu, Licht, Zaun, Blumenkasten,
// Deckenhaken) liegt hier; Moebel, Pflanzen und Deko (inkl. Haengeampel) kommen aus js/grafik/. Reines JavaScript, keine externen Bilder.

import { iso, KON, BLATT_FARBEN, f, p2, tr, poly, linie, kreis, oval, pfad, gruppe, kiste, gerundet, qb, zufall, defs, bodenschatten, TW, TH, OX, OY } from './grafik/hilfen.js';
import { MOEBEL, platzFeld } from './grafik/moebel.js';
import { PFLANZEN } from './grafik/pflanzen.js';
import * as R from './grafik/raritaeten.js';
import { DEKO } from './grafik/deko.js';

// Groessenfaktor fuer Raritaeten (ueber R.RAR_SKALA, falls das Grafik-Modul ihn exportiert; sonst 1.15)
const RAR_SKALA = R.RAR_SKALA ?? 1.15;

const FUGE = 'stroke="#c9a27a" stroke-width="0.8" stroke-linejoin="round"';
// Standardgroesse des Bodens in Feldern. Alle Masse unten sind auf 6 gerechnet und mit faktor skaliert.
const BASIS = 6;
// Erlaubte Groessen des Gewaechshauses in Feldern
const GROESSEN = [6, 7, 8, 9, 10];
const groesseAus = (g) => (GROESSEN.includes(g) ? g : BASIS);
// Abstand zweier benachbarter Feldmitten im SVG (Maß für den Fangradius beim Verschieben)
export const FELD_PX = Math.hypot(TW / 2, TH / 2);
// Markierung (gestrichelt, koralle), antippbar
const MARKE = 'fill="rgba(232,138,122,.18)" stroke="#e88a7a" stroke-width="2.4" stroke-dasharray="5 4" stroke-linejoin="round" style="cursor:pointer"';

// Gewaechshaus-Designs (zustand.design). Fehlend oder unbekannt: dielen, teak, giebel.
const BODEN_DESIGNS = ['dielen', 'terrazzo', 'fischgraet', 'fliesen'];
const RAHMEN_DESIGNS = ['teak', 'petrol', 'messing', 'senf'];
const DACH_DESIGNS = ['giebel', 'bogen', 'shed'];
function designAus(z) {
  const d = (z && z.design) || {};
  return {
    boden: BODEN_DESIGNS.includes(d.boden) ? d.boden : 'dielen',
    rahmen: RAHMEN_DESIGNS.includes(d.rahmen) ? d.rahmen : 'teak',
    dach: DACH_DESIGNS.includes(d.dach) ? d.dach : 'giebel',
  };
}
// Farben der Rahmenteile: grund, licht (Lichtkante), schatten (Schattenkante), maser (feine Linie), verbinder (Messing-Verbinder)
const RAHMEN_FARBEN = {
  teak: { grund: '#b8743d', licht: '#d99a5b', schatten: '#8a5228', maser: '#9c5f2e', verbinder: '#c9a14a' },
  petrol: { grund: '#2f6f73', licht: '#5f9ca0', schatten: '#1f4f52', maser: '#285d61', verbinder: '#c9a14a' },
  messing: { grund: '#c9a14a', licht: '#e6c978', schatten: '#9a7530', maser: '#b38f3c', verbinder: '#a88436', glanz: '#fff6d0' },
  senf: { grund: '#d9a441', licht: '#f0cc78', schatten: '#a87a25', maser: '#bf8e35', verbinder: '#c9a14a' },
};
const GLAS = '#e4f6fa';
const BOGEN_H = 26;
const SHED_H = 24;

let zaehler = 0;

// Attributwert sicher machen (fuer data-id und data-ort)
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const linienzug = (pts, attr) => `<polyline points="${pts.map(p2).join(' ')}" ${attr}/>`;

// ---------- Tageszeit ----------

const ZEITEN = ['morgen', 'tag', 'abend', 'nacht'];
// Tageszeit aus der lokalen Uhrzeit: 5 bis 8 morgen, 8 bis 18 tag, 18 bis 21 abend, sonst nacht
export function tageszeitAus(date) {
  const h = date.getHours();
  if (h >= 5 && h < 8) return 'morgen';
  if (h >= 8 && h < 18) return 'tag';
  if (h >= 18 && h < 21) return 'abend';
  return 'nacht';
}

// Himmel-Verlauf je Tageszeit (oben nach unten). tag nutzt den Verlauf aus hilfen.js (uid-himmel).
const HIMMEL = {
  morgen: ['#ffd9c7', '#fff1e0'],
  abend: ['#c99ad6', '#f6b47a'],
  nacht: ['#2c3a66', '#4a5a8c'],
};
const himmelId = (uid, zeit) => (zeit === 'tag' ? `${uid}-himmel` : `${uid}-himmel-${zeit}`);
function himmelDefs(uid, zeit) {
  const c = HIMMEL[zeit];
  if (!c) return '';
  return '<defs>' + `<linearGradient id="${himmelId(uid, zeit)}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>` + '</defs>';
}

// Wolkenfarbe und Deckkraft je Tageszeit
const WOLKE = { abend: ['#f7b8c8', 0.9], nacht: ['#7d8db3', 0.45] };

// Sterne in der Nacht (deterministisch, eigener Zufallsgenerator), 15 bis 25 Stueck, verteilt auf beide Waende
function sternPunkte(G) {
  const r = zufall(5051);
  const n = 15 + Math.floor(r() * 11);
  const liste = [];
  for (let k = 0; k < n; k++) {
    liste.push({ w: k % 2 ? 'B' : 'A', s: 0.2 + r() * (G - 0.4), t: 40 + r() * 165, r: 0.6 + r() * 0.7 });
  }
  return liste;
}

// Raum-Stimmung ueber Boden und Inhalt (Raumhuelle: Boden plus beide Waende). Nur abend und nacht.
function raumtoenung(G, zeit) {
  const [farbe, deckkraft] = zeit === 'nacht' ? ['#1f2a55', 0.22] : ['#ffb46b', 0.08];
  const huelle = [iso(0, G, 0), iso(G, G, 0), iso(G, 0, 0), iso(G, 0, 220), iso(0, 0, 220), iso(0, G, 220)];
  return poly(huelle, `fill="${farbe}" opacity="${deckkraft}"`);
}

// ---------- Boden und Wande ----------

const WM = { A: 'matrix(48,24,0,-1,400,315)', B: 'matrix(-48,24,0,-1,400,315)' };
// Punkt auf Wand A (entlang gy=0, Parameter s = gx) oder B (entlang gx=0, s = gy); t = Hoehe z
const wp = (w, s, t) => (w === 'A' ? iso(s, 0, t) : iso(0, s, t));

// Rahmenstab in Wand w (s entlang der Wand, t = Hoehe). Grundton, Lichtkante oben (quer) oder links (senkrecht),
// Schattenkante unten oder rechts. quer: laengs waagerecht (Riegel, Sockel, Dachbalken).
function stab(w, s0, s1, t0, t1, c, quer = false) {
  const P = (s, t) => wp(w, s, t);
  const ecken = [P(s0, t0), P(s1, t0), P(s1, t1), P(s0, t1)];
  let s = poly(ecken, `fill="${c.grund}"`);
  if (quer) {
    const h = t1 - t0, d = s1 - s0;
    s += poly([P(s0, t1 - 0.3 * h), P(s1, t1 - 0.3 * h), P(s1, t1 - 0.05 * h), P(s0, t1 - 0.05 * h)], `fill="${c.licht}" opacity="0.8"`);
    s += poly([P(s0, t0), P(s1, t0), P(s1, t0 + 0.2 * h), P(s0, t0 + 0.2 * h)], `fill="${c.schatten}" opacity="0.8"`);
    if (d > 1) {
      s += linie(P(s0 + 0.1 * d, (t0 + t1) / 2), P(s1 - 0.1 * d, (t0 + t1) / 2), `stroke="${c.maser}" stroke-width="0.6" opacity="0.7"`);
    }
    if (c.glanz) {
      s += linie(P(s0 + 0.1 * d, t1 - 0.15 * h), P(s1 - 0.1 * d, t1 - 0.15 * h), `stroke="${c.glanz}" stroke-width="0.7" opacity="0.8"`);
    }
  } else {
    const d = s1 - s0, hh = t1 - t0;
    s += poly([P(s0 + 0.15 * d, t0), P(s0 + 0.4 * d, t0), P(s0 + 0.4 * d, t1), P(s0 + 0.15 * d, t1)], `fill="${c.licht}" opacity="0.8"`);
    s += poly([P(s1 - 0.2 * d, t0), P(s1, t0), P(s1, t1), P(s1 - 0.2 * d, t1)], `fill="${c.schatten}" opacity="0.8"`);
    if (c.glanz) {
      s += linie(P(s0 + 0.25 * d, t0 + 0.1 * hh), P(s0 + 0.25 * d, t1 - 0.1 * hh), `stroke="${c.glanz}" stroke-width="0.7" opacity="0.8"`);
    }
  }
  s += poly(ecken, `fill="none" ${KON}`);
  return s;
}

// Messing-Verbinder an einer Kreuzung (kleiner Knopf mit Glanzpunkt)
function verbinder(p, c) {
  return kreis(p[0], p[1], 1.9, `fill="${c.verbinder}" stroke="#6b4a3a" stroke-width="0.8"`) +
    kreis(p[0] - 0.5, p[1] - 0.5, 0.6, 'fill="#fff6d0" opacity="0.8"');
}

function wand(w, uid, G, faktor, zeit, sterne, c) {
  let s = '';
  // Clip-Pfad = Glasflaeche der Wand: Wolken werden nur innerhalb des Glases gezeichnet
  const clipId = `${uid}-glas${w}`;
  s += `<clipPath id="${clipId}">` + poly([wp(w, 0, 30), wp(w, G, 30), wp(w, G, 220), wp(w, 0, 220)], '') + '</clipPath>';
  s += poly([wp(w, 0, 30), wp(w, G, 30), wp(w, G, 220), wp(w, 0, 220)], `fill="url(#${himmelId(uid, zeit)})" ${KON}`);
  // Himmel-Deko im Glas: Sterne (nacht), Mondsichel (nacht, Wand A), blasse Sonne tief (morgen, Wand A)
  let himmel = '';
  for (const st of sterne) {
    if (st.w !== w) continue;
    const p = wp(w, st.s, st.t);
    himmel += kreis(p[0], p[1], st.r, 'fill="#fff6d5" opacity="0.85"');
  }
  if (zeit === 'nacht' && w === 'A') {
    // Mondsichel: Vollkreis mit Maske, die einen versetzten Kreis ausspart
    const m = wp('A', 2.25 * faktor, 125);
    s += `<mask id="${uid}-mond" maskUnits="userSpaceOnUse" x="-500" y="-500" width="1400" height="1400">` +
      `<rect x="-500" y="-500" width="1400" height="1400" fill="#ffffff"/>` +
      kreis(m[0] + 3.2, m[1] - 2.2, 7, 'fill="#000000"') + '</mask>';
    himmel += kreis(m[0], m[1], 8, `fill="#f4f1d6" mask="url(#${uid}-mond)"`);
  }
  if (zeit === 'morgen' && w === 'A') {
    const q = wp('A', 2.25 * faktor, 75);
    himmel += kreis(q[0], q[1], 11, 'fill="#fff3d6" opacity="0.35"') + kreis(q[0], q[1], 6.5, 'fill="#fff8e6" opacity="0.95"');
  }
  // Wolken, in Wandkoordinaten (s, t) ueber Transformationsmatrix
  const wolken = [[1.4, 185, 1.1], [3.7, 118, 0.9], [5.0, 200, 1.0]];
  const [wolkenFarbe, wolkenDeckkraft] = WOLKE[zeit] || ['#ffffff', 0.9];
  s += `<g clip-path="url(#${clipId})">` + himmel + `<g transform="${WM[w]}" fill="${wolkenFarbe}" opacity="${wolkenDeckkraft}">` + wolken.map(([cx0, cy, sc]) => {
    const cx = cx0 * faktor;
    return `<ellipse cx="${cx - 0.18 * sc}" cy="${cy}" rx="${0.2 * sc}" ry="${9 * sc}"/>` +
    `<ellipse cx="${cx + 0.12 * sc}" cy="${cy + 4 * sc}" rx="${0.22 * sc}" ry="${11 * sc}"/>` +
    `<ellipse cx="${cx + 0.4 * sc}" cy="${cy - 1}" rx="${0.18 * sc}" ry="${8 * sc}"/>`;
  }).join('') + '</g></g>';
  // Rahmen: Sprossen (senkrecht), Querriegel, Eckpfosten, Sockel; Messing-Verbinder an allen Kreuzungen
  const sprossen = [1.5, 3, 4.5].map((sv0) => sv0 * faktor);
  for (const sv of sprossen) {
    s += stab(w, sv - 0.05, sv + 0.05, 30, 220, c);
  }
  for (const th of [95, 160]) {
    s += stab(w, 0, G, th - 2, th + 2, c, true);
  }
  // Eckpfosten
  s += stab(w, 0, 0.15, 30, 220, c) + stab(w, G - 0.15, G, 30, 220, c);
  // Holzsockel
  s += stab(w, 0, G, 0, 30, c, true);
  for (const th of [95, 160]) {
    for (const sv of [0.075, ...sprossen, G - 0.075]) {
      s += verbinder(wp(w, sv, th), c);
    }
  }
  return s;
}

// Boden (Dielen): Schachbrett aus zwei Holztoenen mit Fugen
function dielen(G) {
  let s = '';
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      s += poly([iso(i, j), iso(i + 1, j), iso(i + 1, j + 1), iso(i, j + 1)],
        `fill="${(i + j) % 2 ? '#e2bd94' : '#e9c9a3'}" ${FUGE}`);
    }
  }
  return s;
}

// Terrazzo: Creme mit bunten Splittern, deterministisch (eigener Zufallsgenerator)
function terrazzo(G) {
  const r = zufall(8803);
  const farben = ['#d9693b', '#2f6f73', '#d9a441', '#9fb79a', '#8a5228', '#b8743d'];
  let s = '';
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      s += poly([iso(i, j), iso(i + 1, j), iso(i + 1, j + 1), iso(i, j + 1)],
        'fill="#f3e6cf" stroke="#d9c7a8" stroke-width="0.6" stroke-linejoin="round"');
      for (let k = 0; k < 7; k++) {
        const x = i + 0.12 + r() * 0.7, y = j + 0.12 + r() * 0.7, g = 0.05 + r() * 0.07;
        const farbe = farben[Math.floor(r() * farben.length)];
        const ecken = [[x, y], [x + g * (1 + r()), y + g * 0.3 * r()], [x + g * r(), y + g * (0.8 + r())]];
        s += poly(ecken.map((p) => iso(p[0], p[1])), `fill="${farbe}" opacity="0.9"`);
      }
    }
  }
  return s;
}

// Fischgraet: Teakdielen in Viertelfeld-Streifen, je Feld die Laufrichtung gewechselt (isometrische Andeutung)
function fischgraet(G) {
  const farben = ['#b8743d', '#c98f5a', '#a86b43', '#d99a5b'];
  let s = '';
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      const laengs = (i + j) % 2 === 0;
      for (let k = 0; k < 4; k++) {
        const a = k * 0.25, b = a + 0.25;
        const c = farben[(i * 3 + j * 5 + k) % 4];
        const ecken = laengs
          ? [[i, j + a], [i + 1, j + a], [i + 1, j + b], [i, j + b]]
          : [[i + a, j], [i + b, j], [i + b, j + 1], [i + a, j + 1]];
        s += poly(ecken.map((p) => iso(p[0], p[1])), `fill="${c}" stroke="#8a5228" stroke-width="0.6" stroke-linejoin="round"`);
      }
    }
  }
  return s;
}

// Zementfliesen: Schachbrett Creme und Petrol, in jeder Fliese eine Raute in der Gegenfarbe
function fliesen(G) {
  let s = '';
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      const hell = (i + j) % 2 === 0;
      const grund = hell ? '#f3e6cf' : '#2f6f73';
      const ziel = hell ? '#2f6f73' : '#f3e6cf';
      s += poly([iso(i, j), iso(i + 1, j), iso(i + 1, j + 1), iso(i, j + 1)],
        `fill="${grund}" stroke="#b7aa98" stroke-width="0.7" stroke-linejoin="round"`);
      const raute = [[i + 0.5, j + 0.18], [i + 0.82, j + 0.5], [i + 0.5, j + 0.82], [i + 0.18, j + 0.5]];
      s += poly(raute.map((p) => iso(p[0], p[1])), `fill="${ziel}" opacity="0.85" stroke="${grund}" stroke-width="0.6" stroke-linejoin="round"`);
      const m = iso(i + 0.5, j + 0.5);
      s += kreis(m[0], m[1], 1.6, `fill="${grund}"`);
    }
  }
  return s;
}

function bodenplatte(uid, G, boden) {
  const P0 = iso(0, 0), P1 = iso(G, 0), P2 = iso(G, G), P3 = iso(0, G);
  // Silhouette mit 14 px dicker Kante nach unten
  const kontur = [P0, P1, [P1[0], P1[1] + 14], [P2[0], P2[1] + 14], [P3[0], P3[1] + 14], P3];
  let s = pfad(gerundet(kontur.map((p) => [p[0], p[1] + 10]), 12), 'fill="#7fb87a" opacity="0.55"');
  s += pfad(gerundet(kontur, 12), `fill="#e8e4df" ${KON}`);
  if (boden === 'terrazzo') s += terrazzo(G);
  else if (boden === 'fischgraet') s += fischgraet(G);
  else if (boden === 'fliesen') s += fliesen(G);
  else s += dielen(G);
  s += poly([P0, P1, P2, P3], `fill="none" ${KON}`);
  return s;
}

// Dachbalken entlang der oberen Wandkanten (Rahmen), mit Ueberstand am Giebel
function dachRahmen(G, c) {
  return stab('A', 0, G, 220, 234, c, true) + stab('B', 0, G, 220, 234, c, true);
}

// Gewoelbtes Glasdach: Sparren als Boegen in Richtung gy, Firstlinie oben, Glasflaechen zwischen den Sparren
function bogenDach(G, c) {
  const N = 12;
  const bogen = (gx) => {
    const pts = [];
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      pts.push(iso(gx, G * t, 220 + BOGEN_H * Math.sin(Math.PI * t)));
    }
    return pts;
  };
  const b = [];
  for (let k = 0; k <= G; k++) b.push(bogen(k));
  let s = '';
  for (let k = 0; k < G; k++) {
    s += poly(b[k].concat(b[k + 1].slice().reverse()), `fill="${GLAS}" opacity="0.55" ${KON}`);
  }
  for (let k = 0; k <= G; k++) {
    s += linienzug(b[k], `fill="none" stroke="${c.schatten}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"`);
    s += linienzug(b[k], `fill="none" stroke="${c.grund}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"`);
  }
  const first = [];
  for (let k = 0; k <= G; k++) first.push(iso(k, G / 2, 220 + BOGEN_H));
  s += linienzug(first, `fill="none" stroke="${c.grund}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`);
  return s;
}

// Saegezahn-Sheddach: je Feld eine schraege Glasflaeche, hoch am Grat gx = k, tief bei gx = k + 1
function shedDach(G, c) {
  let s = '';
  for (let k = 0; k < G; k++) {
    s += poly([iso(k, 0, 220 + SHED_H), iso(k, G, 220 + SHED_H), iso(k + 1, G, 220), iso(k + 1, 0, 220)],
      `fill="${GLAS}" opacity="0.6" ${KON}`);
  }
  // Grate als Leisten, Sagezahnkante vorn
  for (let k = 0; k < G; k++) {
    s += linie(iso(k, 0, 220 + SHED_H), iso(k, G, 220 + SHED_H), `stroke="${c.schatten}" stroke-width="3" stroke-linecap="round"`);
    s += linie(iso(k, 0, 220 + SHED_H), iso(k, G, 220 + SHED_H), `stroke="${c.grund}" stroke-width="1.6" stroke-linecap="round"`);
  }
  const zacke = [];
  for (let k = 0; k < G; k++) {
    zacke.push(iso(k, G, 220 + SHED_H), iso(k + 1, G, 220));
  }
  s += linienzug(zacke, `fill="none" ${KON}`);
  return s;
}

// Dachaufbau je Dachdesign (giebel hat keinen Aufbau, nur den Balken)
function dachAufbau(art, G, c) {
  if (art === 'bogen') return bogenDach(G, c);
  if (art === 'shed') return shedDach(G, c);
  return '';
}

// Winter: Schnee auf den oberen Kanten der Dachbalken (Deckflaeche je Wand)
function schneeDach(G) {
  const farbe = 'fill="#fbfdfe" stroke="#c7d3dc" stroke-width="0.6" stroke-linejoin="round"';
  return poly([iso(0, 0, 234), iso(G, 0, 234), iso(G, 0.3, 234), iso(0, 0.3, 234)], farbe) +
    poly([iso(0, 0, 234), iso(0, G, 234), iso(0.3, G, 234), iso(0.3, 0, 234)], farbe);
}

// Haengende Ranke von a nach b (Bildschirmkoordinaten), Blaetter wechselseitig am Stiel
function ranke(a, b, rnd, blattR) {
  const c = [(a[0] + b[0]) / 2 + (rnd() - 0.5) * 14, (a[1] + b[1]) / 2];
  let s = pfad(`M${p2(a)} Q${p2(c)} ${p2(b)}`, 'fill="none" stroke="#5e9a52" stroke-width="1.5" stroke-linecap="round"');
  const N = Math.max(3, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 9));
  for (let i = 1; i <= N; i++) {
    const q = qb(a, c, b, i / (N + 1));
    const seite = i % 2 ? 1 : -1;
    const r = blattR[0] + rnd() * (blattR[1] - blattR[0]);
    const x = q[0] + seite * r * 0.8, y = q[1];
    const winkel = seite * (30 + rnd() * 30);
    s += oval(x, y, r, r * 0.7, `transform="rotate(${f(winkel)} ${f(x)} ${f(y)})" fill="${BLATT_FARBEN[i % 2]}" ${KON}`);
    if (rnd() < 0.3) s += kreis(x + seite * 2, y + 3, 2.4, `fill="#e07a5f" ${KON}`);
  }
  return s;
}

function efeu(rnd, G, faktor) {
  let s = '';
  const kanten = [[iso(0, 0, 226), iso(G, 0, 226)], [iso(0, 0, 226), iso(0, G, 226)]];
  for (const [a, b] of kanten) {
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 14];
    s += pfad(`M${p2(a)} Q${p2(c)} ${p2(b)}`, 'fill="none" stroke="#5e9a52" stroke-width="1.2"');
    const N = Math.round(108 * faktor);
    for (let i = 0; i < N; i++) {
      const q = qb(a, c, b, (i + rnd()) / N);
      const x = q[0] + (rnd() - 0.5) * 10;
      const y = q[1] + (rnd() - 0.5) * 8 - 2;
      const r = 5 + rnd() * 3;
      const winkel = rnd() * 360;
      const farbe = rnd() < 0.5 ? BLATT_FARBEN[0] : BLATT_FARBEN[1];
      s += oval(x, y, r, r * 0.7, `transform="rotate(${f(winkel)} ${f(x)} ${f(y)})" fill="${farbe}" ${KON}`);
      if (rnd() < 0.3) s += kreis(x + 3, y - 3, 2.6, `fill="#e07a5f" ${KON}`);
    }
  }
  // Haengende Ranken: drei an Wand A, drei an Wand B (bei s = 5.7 an den vorderen Eckpfosten)
  const ranken = [['A', 0.9, 80], ['A', 3.0, 50], ['A', 5.7, 110], ['B', 1.2, 90], ['B', 3.6, 60], ['B', 5.7, 40]];
  for (const [w, sp, len] of ranken) {
    s += ranke(wp(w, sp * faktor, 226), wp(w, sp * faktor, 226 - len), rnd, [5, 7]);
  }
  return s;
}

function lichterkette(uid, G, faktor, zeit) {
  let s = '';
  const straenge = [[iso(0, G, 200), iso(0, 0, 206)], [iso(0, 0, 206), iso(G, 0, 200)]];
  const n = Math.round(9 * faktor);
  // Abend und Nacht leuchten deutlich, morgen und tag nur schwach
  const schein = zeit === 'abend' || zeit === 'nacht' ? 0.7 : 0.3;
  for (const [a, b] of straenge) {
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 40];
    s += pfad(`M${p2(a)} Q${p2(c)} ${p2(b)}`, 'fill="none" stroke="#6b4a3a" stroke-width="1"');
    for (let i = 1; i <= n; i++) {
      const q = qb(a, c, b, i / (n + 1));
      s += kreis(q[0], q[1], 7, `fill="url(#${uid}-glow)" opacity="${schein}"`);
      s += kreis(q[0], q[1], 2.8, `fill="#ffe08a" ${KON}`);
    }
  }
  return s;
}

// Zaun vorn: Teak-Riegel und schlichte senkrechte Latten mit abgerundeten Koepfen (winter: Schnee auf den Koepfen)
function zaun(G, c, winter) {
  // w = 0: Kante gy=G, w = 1: Kante gx=G; beide mit Luecke an der vorderen Ecke iso(G,G)
  const E = (w, u, z) => (w === 0 ? iso(u, G, z) : iso(G, u, z));
  let s = '';
  for (let w = 0; w < 2; w++) {
    for (const z of [9, 20]) {
      s += poly([E(w, 0, z - 3), E(w, G - 1.1, z - 3), E(w, G - 1.1, z + 3), E(w, 0, z + 3)], `fill="${c.grund}" ${KON}`);
    }
    for (let k = 0; ; k++) {
      const u = 0.25 + k * 0.5;
      if (u > G - 1.1) break;
      // Kopf als Halbkreis: von rechts oben ueber die Mitte nach links oben
      const kopf = [];
      for (let a = 0; a <= 8; a++) {
        const th = Math.PI * a / 8;
        kopf.push(E(w, u + 0.06 * Math.cos(th), 24 + 3 * Math.sin(th)));
      }
      s += poly([E(w, u - 0.06, 0), E(w, u + 0.06, 0), ...kopf], `fill="${c.grund}" ${KON}`);
      s += poly([E(w, u - 0.06, 0), E(w, u - 0.03, 0), E(w, u - 0.03, 24), E(w, u - 0.06, 24)], `fill="${c.licht}" opacity="0.7"`);
      s += poly([E(w, u + 0.03, 0), E(w, u + 0.06, 0), E(w, u + 0.06, 24), E(w, u + 0.03, 24)], `fill="${c.schatten}" opacity="0.6"`);
      if (winter) {
        const p = E(w, u, 27);
        s += oval(p[0], p[1], 3.2, 1.5, 'fill="#fbfdfe" stroke="#c7d3dc" stroke-width="0.6"');
      }
    }
  }
  return s;
}

function blumenkasten(G) {
  let s = kiste(G - 1, G - 0.05, G - 1, G - 0.05, 0, 24, { oben: '#8a6a4a', links: '#d9a574', rechts: '#c98f5a' });
  const blueten = ['#ff8c42', '#e07a5f', '#ffb347', '#e4572e'];
  // Blattwerk quillt ueber die beiden vorderen Kanten
  for (let k = 0; k < 10; k++) {
    const u = G - 0.95 + k * 0.09;
    for (const [gx, gy] of [[u, G - 0.05], [G - 0.05, u]]) {
      const b = iso(gx, gy, 22);
      s += oval(b[0], b[1] + 6, 7, 4.5, `transform="rotate(${k % 2 ? 25 : -25} ${f(b[0])} ${f(b[1] + 6)})" fill="${BLATT_FARBEN[k % 2]}" ${KON}`);
    }
  }
  // Bluetenstiele mit roten und orangen Bluetenkoepfen
  for (let k = 0; k < 12; k++) {
    const bx = iso(G - 0.9 + (k % 4) * 0.25, G - 0.9 + Math.floor(k / 4) * 0.3, 24);
    const p = [bx[0], bx[1] - 12 - (k % 3) * 5];
    s += linie(bx, p, 'stroke="#5e9a52" stroke-width="2" stroke-linecap="round"');
    s += kreis(p[0], p[1], 5, `fill="${blueten[k % 4]}" ${KON}`);
  }
  return s;
}

// Winter: ein paar Schneeflocken vor dem Glas, fallen langsam (SMIL-Animation, deterministisch verteilt)
function schneeflocken(G) {
  const r = zufall(7331);
  let s = '';
  for (let k = 0; k < 9; k++) {
    const w = k % 2 ? 'A' : 'B';
    const p = wp(w, 0.4 + r() * (G - 0.8), 60 + r() * 150);
    const dauer = 7 + Math.floor(r() * 4);
    const beginn = -(r() * dauer).toFixed(1);
    const radius = 1.4 + r() * 1.0;
    s += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(radius)}" fill="#ffffff" opacity="0.7">` +
      `<animate attributeName="cy" from="${f(p[1])}" to="${f(p[1] + 70)}" dur="${dauer}s" begin="${beginn}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values="0.7;0.7;0" keyTimes="0;0.8;1" dur="${dauer}s" begin="${beginn}s" repeatCount="indefinite"/>` +
      '</circle>';
  }
  return s;
}

// Sonnenlicht durch die linke Glaswand (Wand B, gx = 0): weiche Flaeche auf dem Boden
function sonnenlicht(uid) {
  return poly([iso(0.05, 1.2), iso(2.9, 1.2), iso(2.9, 3.4), iso(0.05, 3.4)],
    `fill="#fff3c4" opacity="0.45" filter="url(#${uid}-weich)"`);
}

// Schwacher diagonaler Lichtstrahl von der Glaswand zum Boden
function sonnenstrahl() {
  return poly([iso(0, 1.0, 205), iso(0, 2.0, 205), iso(2.6, 2.0, 0), iso(2.6, 1.0, 0)], 'fill="#fff3c4" opacity="0.15"');
}

// Deckenhaken an der Dachkante (z 226). Eine Haengeampel (Deko mit ort {haken: 'h1'}) haengt an einem freien Haken.
// HAKEN gilt fuer groesse 6 (wird von spiel.js fuer die Spiellogik genutzt). Groessere Gewaechshaeuser: hakenFuer(G).
export const HAKEN = { h1: { gx: 4.6, gy: 0.6 }, h2: { gx: 0.6, gy: 4.4 } };
const HAKEN_Z = 226;

// Haken je Groesse: gleiche Lage relativ zur Rueckwand (h1 an Wand A, h2 an Wand B), bei 6 genau HAKEN
export function hakenFuer(G) {
  const k = groesseAus(G) - BASIS;
  return { h1: { gx: HAKEN.h1.gx + k, gy: HAKEN.h1.gy }, h2: { gx: HAKEN.h2.gx, gy: HAKEN.h2.gy + k } };
}

// Metallring an jedem Haken. Ohne Ampel ist nur dieser kleine Haken sichtbar.
function haken(hk) {
  return Object.values(hk).map((h) => {
    const p = iso(h.gx, h.gy, HAKEN_Z);
    return kreis(p[0], p[1], 2.4, 'fill="none" stroke="#6b4a3a" stroke-width="1.1"') +
      kreis(p[0], p[1], 2.4, 'fill="none" stroke="#cfd8dc" stroke-width="0.6"');
  }).join('');
}

// Pflanze oder Deko: Ursprung am Bodenkontakt, Skalierung 1.6 (Raritaeten 1.6 * RAR_SKALA), Kontaktschatten darunter.
// attr (optional): zusaetzliche Attribute der Gruppe, z. B. data-id und data-art
function platziert(fuss, inhalt, attr = '', skala = 1.6) {
  return gruppe(`${attr} ${tr(fuss, skala)}`.trim(), inhalt);
}

// Markierungen: Rauten fuer Bodenfelder und Moebel-Grundflaechen, Kreise fuer Stellplaetze und Haken.
// Jede Markierung traegt ihren Ort als data-ort (JSON), damit ein Klick zugeordnet werden kann.
function markierungenSvg(liste, moebel, hk) {
  if (!Array.isArray(liste)) return '';
  let s = '';
  for (const mk of liste) {
    if (!mk || mk.ok === false || !mk.ort || typeof mk.ort !== 'object') continue;
    const ort = mk.ort;
    const attr = `data-ort="${escAttr(JSON.stringify(ort))}" ${MARKE}`;
    if (Array.isArray(ort.feld)) {
      const [gx, gy] = ort.feld;
      s += poly([iso(gx, gy), iso(gx + 1, gy), iso(gx + 1, gy + 1), iso(gx, gy + 1)], attr);
    } else if (Number.isFinite(ort.gx) && Number.isFinite(ort.gy)) {
      // Moebel-Position: Grundflaeche des Moebels in der Drehung des Ortes
      const def = MOEBEL[mk.typ];
      const breite = def ? def.breite : 1;
      const tiefe = def ? def.tiefe : 1;
      const [w, h] = ort.drehung === 90 ? [tiefe, breite] : [breite, tiefe];
      const { gx, gy } = ort;
      s += poly([iso(gx, gy), iso(gx + w, gy), iso(gx + w, gy + h), iso(gx, gy + h)], attr);
    } else if (ort.moebel !== undefined) {
      const m = (moebel || []).find(x => x.id === ort.moebel);
      const pos = m && platzFeld(m, ort.platz);
      if (pos) {
        const p = iso(pos.gx, pos.gy, pos.z);
        s += kreis(p[0], p[1], 12, attr);
      }
    } else if (ort.haken !== undefined && Object.prototype.hasOwnProperty.call(hk, ort.haken)) {
      const h = hk[ort.haken];
      const p = iso(h.gx, h.gy, HAKEN_Z);
      s += kreis(p[0], p[1], 12, attr);
    }
  }
  return s;
}

// Vorschau eines Objekts (SVG-Inhalt aus zeichne()) fuer Karten und Blaetter. Der Ausschnitt wird erst nach
// dem Einhaengen in das Dokument mit einpassen() um das Objekt gelegt (getBBox braucht ein sichtbares Element).
export function vorschau(inhalt, klasse = '') {
  const box = document.createElement('span');
  box.className = klasse;
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" data-einpassen="" viewBox="-60 -120 120 120" preserveAspectRatio="xMidYMid meet"><g>${inhalt}</g></svg>`;
  return box;
}

// Setzt den Ausschnitt aller Vorschauen unter wurzel: quadratisch, um das Objekt zentriert, mit Rand
export function einpassen(wurzel) {
  for (const svg of wurzel.querySelectorAll('svg[data-einpassen]')) {
    let b;
    try {
      b = svg.querySelector('g').getBBox();
    } catch (e) {
      continue;
    }
    if (!b || (b.width === 0 && b.height === 0)) continue;
    const seite = Math.max(b.width, b.height) * 1.12 + 6;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    svg.setAttribute('viewBox', `${f(cx - seite / 2)} ${f(cy - seite / 2)} ${f(seite)} ${f(seite)}`);
  }
}

// ---------- Verschieben: Zuordnung Bildschirm zu Ort ----------

// Feldkoordinaten (gx, gy) zu einem SVG-Punkt (inverse Isometrie). z: Hoehe des Punkts (Standard 0 = Boden).
// feld: [floor(gx), floor(gy)], innen: liegt der Punkt im Gewaechshaus (groesse aus zustand)?
export function feldAusPunkt(x, y, zustand, z = 0) {
  const G = groesseAus(zustand && zustand.groesse);
  const u = (x - OX) * 2 / TW;        // gx - gy
  const v = (y + z - OY) * 2 / TH;    // gx + gy
  const gx = (u + v) / 2;
  const gy = (v - u) / 2;
  const fx = Math.floor(gx), fy = Math.floor(gy);
  return { gx, gy, feld: [fx, fy], innen: fx >= 0 && fy >= 0 && fx < G && fy < G };
}

// SVG-Punkt eines Ortes: Feldmitte (Boden), Stellplatz auf einem Moebel (mit Hoehe z), Haken, oder Mitte einer Moebel-Position
export function punktAusOrt(ort, zustand) {
  if (!ort || typeof ort !== 'object') return null;
  if (Array.isArray(ort.feld)) return iso(ort.feld[0] + 0.5, ort.feld[1] + 0.5, 0);
  if (ort.moebel !== undefined) {
    const m = ((zustand && zustand.moebel) || []).find(x => x.id === ort.moebel);
    const pos = m && platzFeld(m, ort.platz);
    return pos ? iso(pos.gx, pos.gy, pos.z) : null;
  }
  if (ort.haken !== undefined) {
    const hk = hakenFuer(zustand && zustand.groesse);
    if (Object.prototype.hasOwnProperty.call(hk, ort.haken)) {
      const h = hk[ort.haken];
      return iso(h.gx, h.gy, HAKEN_Z);
    }
  }
  if (Number.isFinite(ort.gx) && Number.isFinite(ort.gy)) {
    const def = MOEBEL[ort.typ];
    const breite = def ? def.breite : 1;
    const tiefe = def ? def.tiefe : 1;
    const [w, h] = ort.drehung === 90 ? [tiefe, breite] : [breite, tiefe];
    return iso(ort.gx + w / 2, ort.gy + h / 2, 0);
  }
  return null;
}

// ---------- Hauptfunktion ----------

// zustand = { groesse: 6|7|8|9|10, moebel: [{id, typ, gx, gy, drehung}], pflanzen: [{id, typ, stufe, ort}], deko: [{id, typ, ort}],
//   welk, markierungen: [{ort, ok: true, typ?}], ausschnitt: true, design: {boden, rahmen, dach}, saison: 'winter'? }
// ort = {feld: [gx, gy]} (Feld-Mitte gx+0.5, gy+0.5) oder {moebel: id, platz: n}; haengende Deko: {haken: 'h1'}
// Markierung: ort wie oben, bei Moebel-Positionen {gx, gy, drehung} plus typ des Moebels.
export function zeichneSzene(container, zustand) {
  const z = zustand || {};
  const welk = !!z.welk;
  const uid = 'szene' + (++zaehler);
  const rnd = zufall(4217);
  const G = groesseAus(z.groesse);
  const faktor = G / BASIS;
  const hk = hakenFuer(G);
  const design = designAus(z);
  const rc = RAHMEN_FARBEN[design.rahmen];
  const winter = z.saison === 'winter';
  // Tageszeit: ohne Angabe aus der lokalen Uhrzeit
  const zeit = ZEITEN.includes(z.tageszeit) ? z.tageszeit : tageszeitAus(new Date());
  // abend und nacht: Raum-Stimmung ueber Boden und Inhalt, Laternen und Lichterkette bleiben hell darueber
  const getoent = zeit === 'abend' || zeit === 'nacht';
  const sterne = zeit === 'nacht' ? sternPunkte(G) : [];

  // Hintere Teile: Bodenplatte, Boden-Design, Waende, Dachbalken, Dachaufbau, Efeu, Lichter (tag und morgen; sonst siehe unten)
  let hinten = bodenplatte(uid, G, design.boden);
  if (zeit === 'tag' || zeit === 'morgen') hinten += sonnenlicht(uid);
  hinten += himmelDefs(uid, zeit);
  hinten += wand('A', uid, G, faktor, zeit, sterne, rc) + wand('B', uid, G, faktor, zeit, sterne, rc);
  hinten += dachRahmen(G, rc);
  hinten += dachAufbau(design.dach, G, rc);
  hinten += efeu(rnd, G, faktor);
  // Schnee nach dem Efeu, damit die Dachkante auch bei dichtem Bewuchs sichtbar bleibt
  if (winter) hinten += schneeDach(G);
  hinten += haken(hk);
  if (!getoent) hinten += lichterkette(uid, G, faktor, zeit);

  // Moebel: Sortierschluessel gx+gy des Ursprungs. Darauf stehende Objekte folgen direkt danach.
  const moebelEintraege = [];
  const moebelById = new Map();
  for (const m of z.moebel || []) {
    const def = MOEBEL[m.typ];
    if (!def || moebelById.has(m.id)) continue;
    const e = { key: m.gx + m.gy, m, def, aufsatz: [] };
    moebelById.set(m.id, e);
    moebelEintraege.push(e);
  }

  // Pflanzen und Deko: auf Moebel-Stellplatz oder frei auf dem Boden
  const bodenEintraege = [];
  // Laternen bei abend und nacht: nach der Raum-Stimmung gezeichnet, damit sie hell bleiben
  const lichtEintraege = [];
  const objekte = [
    ...(z.pflanzen || []).map((p) => ({ ...p, art: 'pflanze' })),
    ...(z.deko || []).map((d) => ({ ...d, art: 'deko' })),
  ];
  for (const o of objekte) {
    // Raritaeten (rar: true) kommen aus eigenem Grafik-Modul, mit Tageszeit und eigener Skalierung
    const rar = o.art === 'pflanze' && !!o.rar;
    const def = o.art === 'pflanze' ? (rar ? R.RARITAETEN[o.typ] : PFLANZEN[o.typ]) : DEKO[o.typ];
    if (!def || !o.ort) continue;
    const aufMoebel = 'moebel' in o.ort;
    const ebene = aufMoebel ? 'brett' : 'boden';
    const inhalt = rar ? def.zeichne(o.stufe, welk, ebene, { tageszeit: zeit })
      : o.art === 'pflanze' ? def.zeichne(o.stufe, welk, ebene) : def.zeichne();
    const skala = rar ? 1.6 * RAR_SKALA : 1.6;
    // Auf einem Moebel stehende Objekte tragen data-auf, damit der Bewegungsmodus sie mit dem Moebel verschieben kann
    const attr = `data-art="${o.art}" data-id="${escAttr(o.id)}"` + (aufMoebel ? ` data-auf="${escAttr(o.ort.moebel)}"` : '');
    const istLicht = getoent && o.art === 'deko' && o.typ === 'laterne';
    if (def.haengend) {
      // Haengende Deko sitzt am Haken und wird nach allen Objekten mit gleicher oder kleinerer Tiefe gezeichnet
      const h = Object.prototype.hasOwnProperty.call(hk, o.ort.haken) ? hk[o.ort.haken] : null;
      if (h) bodenEintraege.push({ key: h.gx + h.gy + 1e-6, svg: platziert(iso(h.gx, h.gy, HAKEN_Z), inhalt, attr) });
      continue;
    }
    if (aufMoebel) {
      const e = moebelById.get(o.ort.moebel);
      const pos = e && platzFeld(e.m, o.ort.platz);
      if (pos) {
        const svg = platziert(iso(pos.gx, pos.gy, pos.z), inhalt, attr, skala);
        if (istLicht) lichtEintraege.push({ key: e.key + 0.5, svg });
        else e.aufsatz.push(svg);
      }
    } else if (o.ort.feld) {
      const [gx, gy] = o.ort.feld;
      const svg = platziert(iso(gx + 0.5, gy + 0.5, 0), inhalt, attr, skala);
      if (istLicht) lichtEintraege.push({ key: gx + gy + 1, svg });
      else bodenEintraege.push({ key: gx + gy + 1, svg });
    }
  }

  // Moebel-Gruppe umschliesst Moebel und die darauf stehenden Pflanzen (eigene Gruppen mit data-art)
  const alle = moebelEintraege
    .map((e) => ({
      key: e.key,
      svg: `<g data-art="moebel" data-id="${escAttr(e.m.id)}">` + e.def.zeichne(e.m.gx, e.m.gy, e.m.drehung) + e.aufsatz.join('') + '</g>'
    }))
    .concat(bodenEintraege);
  alle.sort((a, b) => a.key - b.key);
  const inhalt = alle.map((o) => o.svg).join('');

  // Markierungen liegen ueber dem Boden, aber unter Zaun und Blumenkasten
  const marken = markierungenSvg(z.markierungen, z.moebel, hk);

  // Lichtstrahl; Raum-Stimmung (abend, nacht); Lichter danach; vorn: Zaun, Blumenkasten, Schnee vor dem Glas
  const strahl = zeit === 'tag' || zeit === 'morgen' ? sonnenstrahl() : '';
  const stimmung = getoent ? raumtoenung(G, zeit) : '';
  const lichter = getoent
    ? lichterkette(uid, G, faktor, zeit) + lichtEintraege.sort((a, b) => a.key - b.key).map((o) => o.svg).join('')
    : '';
  const vorn = zaun(G, rc, winter) + blumenkasten(G) + (winter ? schneeflocken(G) : '');

  // Ausschnitt: eng um das Gewaechshaus. Sonst: wie bisher, bei 6 x 6 unveraendert 0 0 800 644, groesser wachsend.
  let x0, y0, breite, hoehe;
  if (z.ausschnitt) {
    x0 = 400 - 48 * G - 12;
    y0 = 69;
    breite = 96 * G + 24;
    hoehe = 284 + 48 * G;
  } else {
    x0 = 400 - (48 * G + 112);
    y0 = 0;
    breite = 96 * G + 224;
    hoehe = 96 * G + 68;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${breite} ${hoehe}" width="100%">` +
    defs(uid) + `<rect x="${x0}" y="${y0}" width="${breite}" height="${hoehe}" fill="#a9d3a5"/>` +
    hinten + inhalt + '<g pointer-events="none">' + strahl + stimmung + lichter + '</g>' + '<g pointer-events="none">' + vorn + '</g>' + marken + '</svg>';

  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', svg);
}
