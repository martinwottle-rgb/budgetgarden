// Isometrische Gewaechshaus-Szene als SVG. Der Raum (Boden, Waende, Dach, Efeu, Licht, Zaun, Blumenkasten,
// Deckenhaken) liegt hier; Moebel, Pflanzen und Deko (inkl. Haengeampel) kommen aus js/grafik/. Reines JavaScript, keine externen Bilder.

import { iso, KON, BLATT_FARBEN, f, p2, tr, poly, linie, kreis, oval, pfad, gruppe, kiste, gerundet, qb, zufall, defs, bodenschatten } from './grafik/hilfen.js';
import { MOEBEL, platzFeld } from './grafik/moebel.js';
import { PFLANZEN } from './grafik/pflanzen.js';
import { DEKO } from './grafik/deko.js';

const FUGE = 'stroke="#c9a27a" stroke-width="0.8" stroke-linejoin="round"';
// Standardgroesse des Bodens in Feldern (6, 7 oder 8). Alle Masse unten sind auf 6 gerechnet und mit faktor skaliert.
const BASIS = 6;
// Markierung (gestrichelt, koralle), antippbar
const MARKE = 'fill="rgba(232,138,122,.18)" stroke="#e88a7a" stroke-width="2.4" stroke-dasharray="5 4" stroke-linejoin="round" style="cursor:pointer"';

let zaehler = 0;

// Attributwert sicher machen (fuer data-id und data-ort)
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

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

function wand(w, uid, G, faktor, zeit, sterne) {
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
  // Sprossen: 3 senkrechte, 2 waagerechte
  for (const sv0 of [1.5, 3, 4.5]) {
    const sv = sv0 * faktor;
    s += poly([wp(w, sv - 0.05, 30), wp(w, sv + 0.05, 30), wp(w, sv + 0.05, 220), wp(w, sv - 0.05, 220)], `fill="#c98f5a" ${KON}`);
  }
  for (const th of [95, 160]) {
    s += poly([wp(w, 0, th - 2), wp(w, G, th - 2), wp(w, G, th + 2), wp(w, 0, th + 2)], `fill="#c98f5a" ${KON}`);
  }
  // Eckpfosten
  s += poly([wp(w, 0, 30), wp(w, 0.15, 30), wp(w, 0.15, 220), wp(w, 0, 220)], `fill="#c98f5a" ${KON}`);
  s += poly([wp(w, G - 0.15, 30), wp(w, G, 30), wp(w, G, 220), wp(w, G - 0.15, 220)], `fill="#c98f5a" ${KON}`);
  // Holzsockel
  s += poly([wp(w, 0, 0), wp(w, G, 0), wp(w, G, 30), wp(w, 0, 30)], `fill="#c98f5a" ${KON}`);
  return s;
}

function bodenplatte(uid, G) {
  const P0 = iso(0, 0), P1 = iso(G, 0), P2 = iso(G, G), P3 = iso(0, G);
  // Silhouette mit 14 px dicker Kante nach unten
  const kontur = [P0, P1, [P1[0], P1[1] + 14], [P2[0], P2[1] + 14], [P3[0], P3[1] + 14], P3];
  let s = pfad(gerundet(kontur.map((p) => [p[0], p[1] + 10]), 12), 'fill="#7fb87a" opacity="0.55"');
  s += pfad(gerundet(kontur, 12), `fill="#e8e4df" ${KON}`);
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      s += poly([iso(i, j), iso(i + 1, j), iso(i + 1, j + 1), iso(i, j + 1)],
        `fill="${(i + j) % 2 ? '#e2bd94' : '#e9c9a3'}" ${FUGE}`);
    }
  }
  s += poly([P0, P1, P2, P3], `fill="none" ${KON}`);
  return s;
}

function dach(G) {
  // Holzbalken entlang der oberen Wandkanten, mit Ueberstand am Giebel
  return poly([iso(0, G, 220), iso(0, 0, 220), iso(G, 0, 220), iso(G, 0, 234), iso(0, 0, 234), iso(0, G, 234)],
    `fill="#a86b43" ${KON}`);
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

function zaun(G) {
  // w = 0: Kante gy=G, w = 1: Kante gx=G; beide mit Luecke an der vorderen Ecke iso(G,G)
  const E = (w, u, z) => (w === 0 ? iso(u, G, z) : iso(G, u, z));
  let s = '';
  for (let w = 0; w < 2; w++) {
    const segmente = [[0, G - 1.1]];
    for (const z of [9, 20]) {
      for (const [u0, u1] of segmente) {
        s += poly([E(w, u0, z - 3), E(w, u1, z - 3), E(w, u1, z + 3), E(w, u0, z + 3)], `fill="#c98f5a" ${KON}`);
      }
    }
    for (let k = 0; ; k++) {
      const u = 0.25 + k * 0.5;
      if (u > G - 1.1) break;
      s += poly([E(w, u - 0.06, 0), E(w, u + 0.06, 0), E(w, u + 0.06, 24), E(w, u, 30), E(w, u - 0.06, 24)],
        `fill="#d9a574" ${KON}`);
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
export const HAKEN = { h1: { gx: 4.6, gy: 0.6 }, h2: { gx: 0.6, gy: 4.4 } };
const HAKEN_Z = 226;

// Metallring an jedem Haken. Ohne Ampel ist nur dieser kleine Haken sichtbar.
function haken() {
  return Object.values(HAKEN).map((h) => {
    const p = iso(h.gx, h.gy, HAKEN_Z);
    return kreis(p[0], p[1], 2.4, 'fill="none" stroke="#6b4a3a" stroke-width="1.1"') +
      kreis(p[0], p[1], 2.4, 'fill="none" stroke="#cfd8dc" stroke-width="0.6"');
  }).join('');
}

// Pflanze oder Deko: Ursprung am Bodenkontakt, Skalierung 1.6, Kontaktschatten darunter.
// attr (optional): zusaetzliche Attribute der Gruppe, z. B. data-id und data-art
function platziert(fuss, inhalt, attr = '') {
  return gruppe(`${attr} ${tr(fuss, 1.6)}`.trim(), inhalt);
}

// Markierungen: Rauten fuer Bodenfelder und Moebel-Grundflaechen, Kreise fuer Stellplaetze und Haken.
// Jede Markierung traegt ihren Ort als data-ort (JSON), damit ein Klick zugeordnet werden kann.
function markierungenSvg(liste, moebel) {
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
    } else if (ort.haken !== undefined && Object.prototype.hasOwnProperty.call(HAKEN, ort.haken)) {
      const h = HAKEN[ort.haken];
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

// ---------- Hauptfunktion ----------

// zustand = { groesse: 6|7|8, moebel: [{id, typ, gx, gy, drehung}], pflanzen: [{id, typ, stufe, ort}], deko: [{id, typ, ort}],
//   welk, markierungen: [{ort, ok: true, typ?}], ausschnitt: true }
// ort = {feld: [gx, gy]} (Feld-Mitte gx+0.5, gy+0.5) oder {moebel: id, platz: n}; haengende Deko: {haken: 'h1'}
// Markierung: ort wie oben, bei Moebel-Positionen {gx, gy, drehung} plus typ des Moebels.
export function zeichneSzene(container, zustand) {
  const z = zustand || {};
  const welk = !!z.welk;
  const uid = 'szene' + (++zaehler);
  const rnd = zufall(4217);
  const G = [6, 7, 8].includes(z.groesse) ? z.groesse : BASIS;
  const faktor = G / BASIS;
  // Tageszeit: ohne Angabe aus der lokalen Uhrzeit
  const zeit = ZEITEN.includes(z.tageszeit) ? z.tageszeit : tageszeitAus(new Date());
  // abend und nacht: Raum-Stimmung ueber Boden und Inhalt, Laternen und Lichterkette bleiben hell darueber
  const getoent = zeit === 'abend' || zeit === 'nacht';
  const sterne = zeit === 'nacht' ? sternPunkte(G) : [];

  // Hintere Teile: Bodenplatte, Dielen, Wande, Dach, Efeu, Lichter (tag und morgen; sonst siehe unten)
  let hinten = bodenplatte(uid, G);
  if (zeit === 'tag' || zeit === 'morgen') hinten += sonnenlicht(uid);
  hinten += himmelDefs(uid, zeit);
  hinten += wand('A', uid, G, faktor, zeit, sterne) + wand('B', uid, G, faktor, zeit, sterne);
  hinten += dach(G);
  hinten += efeu(rnd, G, faktor);
  hinten += haken();
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
    const def = o.art === 'pflanze' ? PFLANZEN[o.typ] : DEKO[o.typ];
    if (!def || !o.ort) continue;
    const aufMoebel = 'moebel' in o.ort;
    const inhalt = o.art === 'pflanze' ? def.zeichne(o.stufe, welk, aufMoebel ? 'brett' : 'boden') : def.zeichne();
    const attr = `data-art="${o.art}" data-id="${escAttr(o.id)}"`;
    const istLicht = getoent && o.art === 'deko' && o.typ === 'laterne';
    if (def.haengend) {
      // Haengende Deko sitzt am Haken und wird nach allen Objekten mit gleicher oder kleinerer Tiefe gezeichnet
      const h = Object.prototype.hasOwnProperty.call(HAKEN, o.ort.haken) ? HAKEN[o.ort.haken] : null;
      if (h) bodenEintraege.push({ key: h.gx + h.gy + 1e-6, svg: platziert(iso(h.gx, h.gy, HAKEN_Z), inhalt, attr) });
      continue;
    }
    if (aufMoebel) {
      const e = moebelById.get(o.ort.moebel);
      const pos = e && platzFeld(e.m, o.ort.platz);
      if (pos) {
        const svg = platziert(iso(pos.gx, pos.gy, pos.z), inhalt, attr);
        if (istLicht) lichtEintraege.push({ key: e.key + 0.5, svg });
        else e.aufsatz.push(svg);
      }
    } else if (o.ort.feld) {
      const [gx, gy] = o.ort.feld;
      const svg = platziert(iso(gx + 0.5, gy + 0.5, 0), inhalt, attr);
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
  const marken = markierungenSvg(z.markierungen, z.moebel);

  // Lichtstrahl; Raum-Stimmung (abend, nacht); Lichter danach; vorn: Zaun und Blumenkasten
  const strahl = zeit === 'tag' || zeit === 'morgen' ? sonnenstrahl() : '';
  const stimmung = getoent ? raumtoenung(G, zeit) : '';
  const lichter = getoent
    ? lichterkette(uid, G, faktor, zeit) + lichtEintraege.sort((a, b) => a.key - b.key).map((o) => o.svg).join('')
    : '';
  const vorn = zaun(G) + blumenkasten(G);

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
    hinten + inhalt + marken + strahl + stimmung + lichter + vorn + '</svg>';

  container.innerHTML = '';
  container.insertAdjacentHTML('beforeend', svg);
}
