// Deko der Spaetspiel-Stufen (SPEC-2, Abschnitt 3). Export DEKO2, gleiche Schnittstelle wie DEKO (deko.js):
// zeichne() liefert SVG mit Ursprung (0,0) = Mitte des Bodenkontakts, ohne Positionierung. In der Szene mit scale(1.6).
// Lokale Isometrie wie in deko.js: x nach rechts unten, y nach links unten, z nach oben (px). Licht von links oben.
// Stil: Mid-Century (Teak, Messing, Akzentfarben aus STIL.md). Alles deterministisch, Animation nur per SVG <animate>.

import { f, kreis, oval, p2, pfad, poly, zufall } from './hilfen.js';

let zaehler = 0;
// Eindeutige Ids fuer Verlaeufe, damit mehrere SVGs auf einer Seite nicht kollidieren
const eindeutig = (name) => `${name}-d2${++zaehler}`;

const KON = 'stroke="#6b4a3a" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"';
const KB = 'stroke="#6b4a3a" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round"';
const KF = 'stroke="#6b4a3a" stroke-width="0.6" stroke-linejoin="round" stroke-linecap="round"';
const SCHATTEN = 'fill="#6b4a3a" opacity="0.18"';
const KX = 0.9, KY = 0.45;

// Lokale Projektion: (x, y, z) zu SVG-Punkt
const P = (x, y, z = 0) => [(x - y) * KX, (x + y) * KY - z];
// Flaeche aus 3D-Punkten
const pk = (pts, attr) => poly(pts.map(([x, y, z = 0]) => P(x, y, z)), attr);
// Offener Linienzug aus 2D-Punkten (SVG-Koordinaten)
const zug = (pts2, attr) => pfad('M' + pts2.map(p2).join('L'), `fill="none" ${attr}`);
// Offener Linienzug aus 3D-Punkten
const zug3 = (pts3, attr) => zug(pts3.map(([x, y, z = 0]) => P(x, y, z)), attr);
// Kontaktschatten fuer einen runden Fuss mit Radius r (Ellipse in der Bodenebene)
const kontakt = (r) => oval(0, 0, 0.9 * Math.SQRT2 * r, 0.45 * Math.SQRT2 * r, SCHATTEN);

// Farben mischen: t = 0 ist a, t = 1 ist b
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
const mischen = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

// Teak nach SPEC-2 und Messing
const TEAK = { links: '#b8743d', rechts: '#8a5228', oben: '#d99a5b' };
const MESSING = { links: '#c9a14a', rechts: '#9c7a33', oben: '#e6c674' };
const PETROL = { links: '#2f6f73', rechts: '#1f4f52', oben: '#4a8f93' };
const SENF = { links: '#d9a441', rechts: '#b07f26', oben: '#ecc56e' };
const CREME = { links: '#e9d6b4', rechts: '#cdb692', oben: '#f7ecd9' };

// Quader mit sichtbaren Flaechen links (+y), rechts (+x) und oben
function quader(x0, x1, y0, y1, z0, z1, farben, kon = KB) {
  return pk([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], `fill="${farben.links}" ${kon}`) +
    pk([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], `fill="${farben.rechts}" ${kon}`) +
    pk([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], `fill="${farben.oben}" ${kon}`);
}

// Kegelstumpf als Mantel aus Segmenten (nur die sichtbare Seite). Helligkeit nach Blickwinkel,
// Licht kommt aus Richtung (-1, 1) im Raum (links oben in der Ansicht).
function mantel(cx, cy, r0, z0, r1, z1, dunkel, hell, n = 28) {
  let s = '';
  for (let k = 0; k < n; k++) {
    const a0 = (2 * Math.PI * k) / n, a1 = (2 * Math.PI * (k + 1)) / n, am = (a0 + a1) / 2;
    const nx = Math.cos(am), ny = Math.sin(am);
    if (nx + ny <= 0) continue;
    const t = ((-nx + ny) / Math.SQRT2 + 1) / 2;
    const c = mischen(dunkel, hell, t);
    const q = (a, r, z) => [cx + r * Math.cos(a), cy + r * Math.sin(a), z];
    s += pk([q(a0, r0, z0), q(a1, r0, z0), q(a1, r1, z1), q(a0, r1, z1)],
      `fill="${c}" stroke="${c}" stroke-width="0.6" stroke-linejoin="round"`);
  }
  return s;
}

// Waagerechte Scheibe (Deckel, Platte) in der Hoehe z
function scheibe(cx, cy, r, z, attr, n = 28) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (2 * Math.PI * k) / n;
    pts.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a), z));
  }
  return poly(pts, attr);
}

// Waagerechte Linien auf der sichtbaren Vorderseite eines Mantels (Rattan-Geflecht, Fugen)
function bandLinien(cx, cy, r0, z0, r1, z1, schritt, attr) {
  let s = '';
  for (let z = z0 + schritt / 2; z < z1; z += schritt) {
    const r = r0 + (r1 - r0) * ((z - z0) / (z1 - z0));
    const pts = [];
    for (let k = 0; k <= 30; k++) {
      const a = -Math.PI / 4 + (Math.PI * k) / 30;
      pts.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a), z));
    }
    s += zug(pts, attr);
  }
  return s;
}

// Schraeg ausgestelltes Bein als Strich: oben bei (x, y, zOben), unten um (dx, dy) ausgestellt, Messingkappe unten
function bein(x, y, dx, dy, zOben, dicke = 1.6) {
  const a = P(x, y, zOben), b = P(x + dx, y + dy, 0.6);
  return zug([a, b], `stroke="#6b4a3a" stroke-width="${f(dicke + 1.2)}" stroke-linecap="round"`) +
    zug([a, b], `stroke="#b8743d" stroke-width="${f(dicke)}" stroke-linecap="round"`) +
    zug([a, b], 'stroke="#d99a5b" stroke-width="0.6" stroke-linecap="round" opacity="0.8"') +
    kreis(b[0], b[1], 0.9, `fill="${MESSING.links}" ${KF}`);
}

// ---------- Katzenkorb ----------
function katzenkorb() {
  const RATTAN = ['#b58450', '#efd09a'];
  const korb = mantel(0, 0, 11, 0, 11, 7, RATTAN[0], RATTAN[1]) +
    bandLinien(0, 0, 11, 0, 11, 7, 1.4, `stroke="#8a5a33" stroke-width="0.6" stroke-linecap="round" opacity="0.7"`);
  const rand = scheibe(0, 0, 11, 7, `fill="#f0d6a6" ${KON}`) + scheibe(0, 0, 9.4, 7.2, 'fill="#7a4e2c"');
  const kissen = mantel(0, 0, 8.6, 7.2, 8.6, 8.4, '#c9a07a', '#f3e6cf') + scheibe(0, 0, 8.6, 8.4, `fill="#f7ecd9" ${KF}`);
  // Schlafende Katze, im Kissen eingerollt. Basis (0, 0, 9)
  const [bx, by] = P(0, 0, 9.6);
  const katze = oval(bx + 1, by + 1.4, 6.8, 2.2, SCHATTEN) +
    `<ellipse cx="${f(bx - 0.4)}" cy="${f(by - 1.6)}" rx="6.4" ry="3.6" fill="#e0884a" ${KB}>` +
      `<animate attributeName="ry" values="3.6;3.9;3.6" dur="3.2s" repeatCount="indefinite"/></ellipse>` +
    oval(bx - 1.6, by - 0.3, 4.2, 1.6, 'fill="#f3c08a" opacity="0.8"') +
    zug([[bx - 4.6, by - 3.4], [bx - 3.8, by - 0.8]], 'stroke="#b25f2b" stroke-width="0.9" stroke-linecap="round"') +
    zug([[bx - 1.8, by - 4.0], [bx - 1.2, by - 1.0]], 'stroke="#b25f2b" stroke-width="0.9" stroke-linecap="round"') +
    zug([[bx + 0.8, by - 3.9], [bx + 1.4, by - 1.2]], 'stroke="#b25f2b" stroke-width="0.9" stroke-linecap="round"') +
    pfad(`M${f(bx - 5.6)},${f(by + 0.4)} q-4.5,-1.5 -3.4,-5.2 q0.8,-2 2.2,-0.2`,
      `fill="none" stroke="#6b4a3a" stroke-width="2.6" stroke-linecap="round"`) +
    pfad(`M${f(bx - 5.6)},${f(by + 0.4)} q-4.5,-1.5 -3.4,-5.2 q0.8,-2 2.2,-0.2`,
      `fill="none" stroke="#e0884a" stroke-width="1.6" stroke-linecap="round"`) +
    kreis(bx + 4.8, by - 3.2, 3.1, `fill="#e88f52" ${KB}`) +
    poly([[bx + 2.4, by - 4.6], [bx + 2.6, by - 8.0], [bx + 5.0, by - 5.6]], `fill="#e88f52" ${KF}`) +
    poly([[bx + 5.6, by - 6.0], [bx + 6.4, by - 8.8], [bx + 7.6, by - 5.2]], `fill="#e88f52" ${KF}`) +
    zug([[bx + 3.3, by - 3.5], [bx + 4.0, by - 3.1]], 'stroke="#6b4a3a" stroke-width="0.9" stroke-linecap="round"') +
    zug([[bx + 5.6, by - 3.2], [bx + 6.3, by - 3.6]], 'stroke="#6b4a3a" stroke-width="0.9" stroke-linecap="round"') +
    poly([[bx + 4.5, by - 1.4], [bx + 5.3, by - 1.4], [bx + 4.9, by - 0.7]], 'fill="#d9707a"');
  return kontakt(11.5) + korb + rand + kissen + katze;
}

// ---------- Leseplatz ----------
function leseecke() {
  // Teak-Beistelltisch: runde Platte auf drei schraegen Beinen
  const beine = [[-5.2, -3, -3.5, -2], [5.2, -3, 3.5, -2], [0, 6, 0, 4]]
    .map(([x, y, dx, dy]) => bein(x, y, dx, dy, 13.6, 1.5)).join('');
  const platte = mantel(0, 0, 9, 13.6, 9, 15.2, TEAK.rechts, TEAK.links) +
    scheibe(0, 0, 9, 15.2, `fill="${TEAK.oben}" ${KON}`) +
    bandLinien(0, 0, 9, 13.8, 9, 15.2, 2.2, 'stroke="#8a5228" stroke-width="0.5" stroke-linecap="round" opacity="0.6"');
  // Teekanne petrol mit Dampf, Stellung neben der Mitte
  const tx = 1.5, ty = -1.2;
  const profil = [[15.2, 1.4], [15.9, 2.5], [17.0, 2.9], [18.3, 2.6], [19.2, 1.8], [19.8, 0.9]];
  let kanne = '';
  for (let i = 0; i < profil.length - 1; i++) {
    kanne += mantel(tx, ty, profil[i][1], profil[i][0], profil[i + 1][1], profil[i + 1][0], '#1f4f52', '#5fb0b4');
  }
  kanne += scheibe(tx, ty, 0.9, 19.9, `fill="#2f6f73" ${KF}`) +
    zug3([[tx + 2.4, ty, 16.4], [tx + 3.8, ty, 17.4], [tx + 4.6, ty, 18.8]], 'stroke="#1f4f52" stroke-width="2" stroke-linecap="round"') +
    zug3([[tx + 2.4, ty, 16.4], [tx + 3.8, ty, 17.4], [tx + 4.6, ty, 18.8]], 'stroke="#5fb0b4" stroke-width="0.8" stroke-linecap="round"') +
    zug3([[tx - 2.5, ty, 16.6], [tx - 4.2, ty, 17.4], [tx - 3.6, ty, 19.0]], 'stroke="#1f4f52" stroke-width="1.5" stroke-linecap="round"');
  const [sx, sy] = P(tx + 4.6, ty, 18.8);
  const dampf = [0, 1].map((i) =>
    `<path d="M${f(sx + i * 1.5)},${f(sy)} q2,-3 0,-6 q-2,-3 0,-6" fill="none" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.7">` +
    `<animate attributeName="opacity" values="0;0.8;0" dur="2.6s" begin="${i * 1.3}s" repeatCount="indefinite"/>` +
    `<animate attributeName="stroke-dashoffset" values="0;-4" dur="2.6s" begin="${i * 1.3}s" repeatCount="indefinite"/></path>`
  ).join('');
  // Zwei Tassen creme, Innenseite dunkler
  const tasse = (x, y) => mantel(x, y, 1.5, 15.2, 1.3, 17.2, CREME.rechts, CREME.oben) + scheibe(x, y, 1.3, 17.2, 'fill="#b5764a"');
  const tassen = tasse(-3.6, 3.4) + tasse(4.4, 4.2);
  // Bücherstapel daneben, auf dem Boden
  const buecher = quader(8, 13, 4, 10, 0, 1.6, PETROL) +
    quader(8.5, 12.5, 4.5, 9.5, 1.6, 3.2, SENF) +
    quader(8, 12.6, 4, 9.6, 3.2, 4.6, { links: '#d9693b', rechts: '#b04e26', oben: '#ee8c5e' });

  return kontakt(10) + beine + platte + kanne + dampf + tassen + buecher;
}

// ---------- Lounge-Sessel ----------
const LEDER = { links: '#a8612f', rechts: '#7f4420', oben: '#c77d44' };
const RATTAN = ['#b58450', '#efd09a'];

function loungesessel() {
  // Teak-Rueckenrahmen mit Lederpolster davor
  const rueck = quader(-9.4, -7.6, -9.4, -7.0, 6.5, 21, TEAK) + quader(7.6, 9.4, -9.4, -7.0, 6.5, 21, TEAK) +
    quader(-9.4, 9.4, -9.4, -7.6, 18.6, 21, TEAK) +
    quader(-7.6, 7.6, -7.4, -6.0, 10, 19, LEDER) +
    zug3([[-6.2, -6.6, 13], [6.2, -6.6, 13]], 'stroke="#4a2814" stroke-width="0.5" stroke-dasharray="1.2 1.2" opacity="0.6"');
  // Schalenfuesse, schraeg ausgestellt
  const beine = [[-7.5, -6], [7.5, -6], [-7.5, 6], [7.5, 6]]
    .map(([x, y]) => bein(x, y, Math.sign(x) * 1.2, Math.sign(y) * 1.2, 5, 1.8)).join('');
  const basis = quader(-8.6, 8.6, -7.4, 7.4, 5, 6.5, TEAK);
  // Sitzkissen aus Leder mit Steppnaht vorne
  const sitz = quader(-8.2, 8.2, -7.0, 7.8, 6.5, 10.2, LEDER) +
    zug3([[-7.4, 7.5, 7.2], [7.4, 7.5, 7.2]], 'stroke="#4a2814" stroke-width="0.5" stroke-dasharray="1.2 1.2" opacity="0.7"') +
    zug3([[-7.0, -3, 10.25], [7.0, -3, 10.25]], 'stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.35"');
  // Armlehnen: Teak-Platte auf zwei Pfosten je Seite
  const arm = (x0, x1) => quader(x0, x1, -7.2, 7.2, 12, 13.6, TEAK) +
    quader(x0 + 0.2, x1 - 0.2, -6.6, -6.2, 6.5, 12, TEAK) + quader(x0 + 0.2, x1 - 0.2, 6.2, 6.6, 6.5, 12, TEAK);
  // Fussbank, vorne rechts: Teak-Sockel mit Lederplatte
  const fussbank = kontakt(5) +
    mantel(15, 11, 4.6, 0, 4.6, 4.6, TEAK.rechts, TEAK.links) +
    bandLinien(15, 11, 4.6, 0.4, 4.6, 4.5, 1.6, 'stroke="#8a5228" stroke-width="0.5" stroke-linecap="round" opacity="0.6"') +
    mantel(15, 11, 4.9, 4.6, 4.9, 5.6, LEDER.rechts, LEDER.links) +
    scheibe(15, 11, 4.9, 5.6, `fill="${LEDER.oben}" ${KB}`);

  return kontakt(12) + rueck + beine + basis + arm(-10.4, -8.4) + sitz + arm(8.4, 10.4) + fussbank;
}

// ---------- Haengesessel ----------
// Rattan-Ei: groesste Breite bei z 14, unten bauchig (Boden z 7), oben schmal (Oberkante z 24.9, Aufhaengung).
// Vorne, Richtung (1,1) zum Betrachter, eine grosse ovale Oeffnung (z 8 bis 22).
const EI = { zmax: 14, hb: 7, ht: 11.5, oben: 24.9, rmax: 11, zoc: 15, ho: 7, k: 0.85 };
const EI_UNTEN = EI.zmax - EI.hb;
const VORNE = Math.PI / 4;
// Winkel relativ zur Vorderseite, im Bereich (-pi, pi]
const RELW = (a) => {
  let d = a - VORNE;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};
// Radius des Eis in der Hoehe z
function eiR(z) {
  const t = z <= EI.zmax ? (z - EI.zmax) / EI.hb : (z - EI.zmax) / EI.ht;
  return EI.rmax * Math.sqrt(Math.max(0, 1 - t * t));
}
// Halber Winkel der Oeffnung in der Hoehe z (0 = keine Oeffnung)
function fensterWinkel(z) {
  const q = (z - EI.zoc) / EI.ho;
  return Math.abs(q) < 1 ? Math.asin(EI.k * Math.sqrt(1 - q * q)) : 0;
}
const imFenster = (a, z) => Math.abs(RELW(a)) < fensterWinkel(z);

function haengesessel() {
  // Punkte seitlich: t entlang (1,-1), also waagerecht im Bild
  const AX = (t, z = 0) => [t * Math.SQRT1_2, -t * Math.SQRT1_2, z];
  // C-Bogen in der Ebene der Mitte: Fuss vorne links (Winkel 250 Grad), oben Ende ueber dem Sessel (50 Grad)
  const bogen = [];
  for (let k = 0; k <= 40; k++) {
    const phi = ((250 - (200 * k) / 40) * Math.PI) / 180;
    bogen.push(AX(20 * Math.cos(phi), 20 + 20 * Math.sin(phi)));
  }
  const [fx, fy] = bogen[0];
  const tSessel = 20 * Math.cos((50 * Math.PI) / 180);
  const zAuf = 20 + 20 * Math.sin((50 * Math.PI) / 180);
  const [cx, cy] = AX(tSessel);
  const zOese = 25.4;

  // Schatten: Fuss am Boden, Sessel schwebt darueber
  let s = oval(...P(fx, fy, 0), 0.9 * Math.SQRT2 * 6.5, 0.45 * Math.SQRT2 * 6.5, SCHATTEN) +
    oval(...P(cx, cy, 0), 0.9 * Math.SQRT2 * 8, 0.45 * Math.SQRT2 * 8, 'fill="#6b4a3a" opacity="0.13"');
  // Runder, flacher Fuss und der C-Bogen aus Teak, Kette (Kordel) senkrecht zum Sessel
  s += mantel(fx, fy, 5.5, 0, 5.5, 1.2, TEAK.rechts, TEAK.links) +
    scheibe(fx, fy, 5.5, 1.2, `fill="${TEAK.oben}" ${KB}`) +
    zug3([[cx, cy, zAuf], [cx, cy, zOese]], 'stroke="#a86b43" stroke-width="1" stroke-dasharray="1.4 0.9" stroke-linecap="round"') +
    zug3(bogen, 'stroke="#6b4a3a" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"') +
    zug3(bogen, 'stroke="#b8743d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"') +
    zug3(bogen, 'stroke="#e2b07c" stroke-width="0.7" stroke-linecap="round" opacity="0.8"');

  const R = eiR;
  const hinten = (a) => Math.abs(RELW(a)) >= Math.PI / 2;
  const vorne = (a) => Math.abs(RELW(a)) < Math.PI / 2;
  // Ring aus Segmenten des Eis, nur Teile die der Filter (Winkel, Hoehe) zulaesst; rs skaliert den Radius
  const flaeche = (filter, rs, dunkel, hell) => {
    let out = '';
    const N = 32;
    for (let z0 = EI_UNTEN; z0 < EI.oben - 1e-6; z0 += 1.5) {
      const z1 = Math.min(EI.oben, z0 + 1.5);
      for (let j = 0; j < N; j++) {
        const a0 = (2 * Math.PI * j) / N, a1 = (2 * Math.PI * (j + 1)) / N, am = (a0 + a1) / 2;
        if (!filter(am, (z0 + z1) / 2)) continue;
        const c = mischen(dunkel, hell, ((-Math.cos(am) + Math.sin(am)) / Math.SQRT2 + 1) / 2);
        const r0 = R(z0) * rs, r1 = R(z1) * rs;
        out += pk([
          [cx + r0 * Math.cos(a0), cy + r0 * Math.sin(a0), z0], [cx + r0 * Math.cos(a1), cy + r0 * Math.sin(a1), z0],
          [cx + r1 * Math.cos(a1), cy + r1 * Math.sin(a1), z1], [cx + r1 * Math.cos(a0), cy + r1 * Math.sin(a0), z1],
        ], `fill="${c}" stroke="${c}" stroke-width="0.6" stroke-linejoin="round"`);
      }
    }
    return out;
  };
  const aussen = (a, z) => !imFenster(a, z);

  // Rueckseite des Eis (von vorne nicht sichtbar, nur an den Raendern)
  s += flaeche(hinten, 1, RATTAN[0], RATTAN[1]);
  // Innenwand hinten: dunkler Rattan-Innenraum, durch die Oeffnung sichtbar
  s += flaeche(hinten, 0.9, '#5a3a22', '#8a5a33');
  // Sitzkissen (Creme) unten im Ei
  s += mantel(cx, cy, 7.6, 9.5, 7.6, 12.5, CREME.rechts, CREME.oben) +
    scheibe(cx, cy, 7.6, 12.5, `fill="${CREME.oben}" ${KB}`);
  // Zierkissen (Senf) an der Rueckwand, in einer Ebene quer zur Blickrichtung
  const ra = (5 * Math.PI) / 4;
  const pcx = cx + 0.72 * R(16) * Math.cos(ra), pcy = cy + 0.72 * R(16) * Math.sin(ra);
  const kreisAuf = (ru, rz, du, dz) => {
    const out = [];
    for (let k = 0; k < 24; k++) {
      const th = (2 * Math.PI * k) / 24;
      const u = du + ru * Math.cos(th);
      out.push([pcx + u * Math.SQRT1_2, pcy - u * Math.SQRT1_2, 17 + dz + rz * Math.sin(th)]);
    }
    return out;
  };
  s += pk(kreisAuf(4.2, 3.8, 0, 0), `fill="#d9a441" stroke="#6b4a3a" stroke-width="0.9" stroke-linejoin="round"`) +
    pk(kreisAuf(2.2, 1.6, -1.2, 1.3), 'fill="#ecc56e" opacity="0.9"');
  // Vorderseite: Rattan ausserhalb der Oeffnung
  s += flaeche((a, z) => vorne(a) && aussen(a, z), 1, RATTAN[0], RATTAN[1]);
  // Rattan-Geflecht (Rauten): zwei Scharen schraeger Linien, nur auf der Vorderseite ausserhalb der Oeffnung
  const geflecht = (vz, c) => {
    let out = '';
    let pts = [];
    const ende = () => {
      if (pts.length > 1) out += zug3(pts, 'stroke="#8a5a33" stroke-width="0.6" stroke-linecap="round" opacity="0.7"');
      pts = [];
    };
    for (let k = 0; k <= 40; k++) {
      const da = -Math.PI / 2 + (Math.PI * k) / 40, a = VORNE + da, z = c + vz * 2.2 * da;
      const r = R(z);
      if (z < EI_UNTEN || z > EI.oben || r <= 0.3 || imFenster(a, z)) { ende(); continue; }
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]);
    }
    ende();
    return out;
  };
  for (const vz of [1, -1]) {
    for (let c = 4; c <= 28; c += 3.2) s += geflecht(vz, c);
  }
  // Randlinie der Oeffnung
  const rand = [];
  for (let k = 0; k <= 48; k++) {
    const th = (2 * Math.PI * k) / 48;
    const z = EI.zoc + EI.ho * Math.sin(th), a = VORNE + Math.asin(EI.k * Math.cos(th));
    const r = R(z);
    rand.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]);
  }
  s += zug3(rand, 'stroke="#6b4a3a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"') +
    zug3(rand, 'stroke="#efd09a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"');
  // Oberer Abschluss mit Oese fuer die Kordel
  s += scheibe(cx, cy, R(EI.oben), EI.oben, 'fill="#6e4426"') +
    kreis(...P(cx, cy, zOese), 1.2, `fill="none" stroke="${MESSING.links}" stroke-width="1.2"`);
  return s;
}

// ---------- Bogenlampe ----------
const MARMOR = { hell: '#ece9e3', dunkel: '#b9b5ac' };

function bogenlampe() {
  const glow = eindeutig('bogen-glow');
  // Punkte seitlich: t entlang (1,-1), also waagerecht im Bild
  const AX = (t, z = 0) => [t * Math.SQRT1_2, -t * Math.SQRT1_2, z];
  // Messingstange steigt aus dem Fuss bis z 10, dann ein Kreisbogen (Radius 25) vom Stangenende ueber den Scheitel
  // bis 25 Grad ueber der Waagerechten; der Schirm haengt am Bogenende
  const ZS = 10, RB = 25;
  const bogen = [];
  for (let k = 0; k <= 40; k++) {
    const phi = Math.PI - ((Math.PI - (25 * Math.PI) / 180) * k) / 40;
    bogen.push(AX(RB + RB * Math.cos(phi), ZS + RB * Math.sin(phi)));
  }
  const [ex, ey, ez] = bogen[40];
  const zTop = ez - 1.5;     // Oberkante des Schirms
  const zRand = zTop - 4.6;  // Schirmkante

  // Warmer Lichtschein auf dem Boden unter dem Schirm
  const [gx, gy] = P(ex, ey, 0);
  let s = `<defs><radialGradient id="${glow}"><stop offset="0" stop-color="#ffe9a8" stop-opacity="0.75"/>` +
    `<stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient></defs>` +
    `<ellipse cx="${f(gx)}" cy="${f(gy)}" rx="26" ry="13" fill="url(#${glow})">` +
    `<animate attributeName="opacity" values="0.8;1;0.8" dur="4s" repeatCount="indefinite"/></ellipse>`;
  // Lichtkegel als flache, durchscheinende Scheiben von der Schirmkante bis zum Boden
  for (let i = 0; i < 6; i++) {
    const z = (zRand * i) / 6;
    s += scheibe(ex, ey, 6 + 11 * (1 - z / zRand), z, 'fill="#ffe9a8" opacity="0.08"');
  }
  // Schwerer runder Marmorfuss mit grauen Adern und Messingring oben
  s += kontakt(10) + mantel(0, 0, 9, 0, 9, 3.6, MARMOR.dunkel, MARMOR.hell) +
    scheibe(0, 0, 9, 3.6, `fill="${MARMOR.hell}" ${KB}`) +
    zug3([[-7, -4, 3.6], [-3, 1.5, 3.6], [1, -3, 3.6], [5, 2, 3.6], [8, -1, 3.6]], 'stroke="#9d9990" stroke-width="0.6" fill="none" opacity="0.8"') +
    zug3([[-1, 6, 3.6], [1.5, 0.5, 3.6], [6, 5, 3.6]], 'stroke="#9d9990" stroke-width="0.5" fill="none" opacity="0.6"') +
    mantel(0, 0, 2.2, 3.6, 2.2, 5.0, MESSING.rechts, MESSING.oben);
  // Duenne Messingstange senkrecht, dann der Bogen
  const stange = [[0, 0, 5.0], [0, 0, ZS]];
  s += zug3(stange, 'stroke="#6b4a3a" stroke-width="2.6" stroke-linecap="round"') +
    zug3(stange, `stroke="${MESSING.links}" stroke-width="1.5" stroke-linecap="round"`) +
    zug3(bogen, 'stroke="#6b4a3a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"') +
    zug3(bogen, `stroke="${MESSING.links}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`) +
    zug3(bogen, 'stroke="#fff4cc" stroke-width="0.6" stroke-linecap="round" opacity="0.8"') +
    kreis(...P(0, 0, ZS), 1.3, `fill="${MESSING.oben}" ${KF}`);
  // Kabel vom Bogenende zum Schirm
  s += zug3([[ex, ey, ez], [ex, ey, zTop]], 'stroke="#6b4a3a" stroke-width="0.8" stroke-linecap="round"');
  // Kleiner Kuppelschirm (Senf, Durchmesser ca. 12) am Bogenende, nach unten geoeffnet
  const profil = [[zTop, 1.2], [zTop - 1.0, 3.2], [zTop - 2.6, 5.2], [zTop - 4.6, 6.0]];
  for (let i = 0; i < profil.length - 1; i++) {
    s += mantel(ex, ey, profil[i][1], profil[i][0], profil[i + 1][1], profil[i + 1][0], SENF.rechts, SENF.oben);
  }
  s += scheibe(ex, ey, 1.2, zTop, `fill="${SENF.oben}" ${KF}`) +
    kreis(...P(ex, ey, zTop + 0.9), 1.0, `fill="${MESSING.links}" ${KF}`);
  // Innen hell: vordere Haelfte der Schirmkante leuchtet
  const mund = [];
  for (let k = 0; k <= 24; k++) {
    const a = -Math.PI / 4 + (Math.PI * k) / 24;
    mund.push([ex + 6 * Math.cos(a), ey + 6 * Math.sin(a), zRand]);
  }
  s += pk([[ex, ey, zRand], ...mund], 'fill="#fff3c4" opacity="0.85"') +
    zug3(mund, 'stroke="#b07f26" stroke-width="0.8" stroke-linecap="round"');
  return s;
}

// ---------- Schaukelstuhl ----------
const SALBEI = { links: '#9fb79a', rechts: '#7d9577', oben: '#b8cdb0' };
// Kufen: lange, gebogene Teakleisten unter den Beinen, laufen entlang der Sitztiefe (y), vorne und hinten ueber die Beine hinaus
const kufenZ = (y) => 0.8 + 0.035 * y * y;

function schaukelstuhl() {
  // Achsen wie bei der Bank: Breite x, Tiefe y (vorne +y), Hoehe z
  // Sitzrahmen aus Teak und salbeigruenes Polster darauf
  const sitz = quader(-14, 14, -7, 7, 9, 10.5, TEAK) +
    quader(-12.8, 12.8, -5.8, 6.4, 10.5, 12, SALBEI);
  // Rueckenlehne: zwei Pfosten an der hinteren Sitzkante, nach hinten geneigt, dazu drei Sprossen
  const pfosten = [-12.6, 12.6].map((x) => zug3([[x, -6.6, 10.5], [x, -9.2, 27]], 'stroke="#6b4a3a" stroke-width="2.6" stroke-linecap="round"') +
    zug3([[x, -6.6, 10.5], [x, -9.2, 27]], 'stroke="#b8743d" stroke-width="1.6" stroke-linecap="round"')).join('');
  const sprossen = [14, 18.6, 23].map((z) => quader(-13, 13, -9.6, -8.4, z, z + 1.2, TEAK, KB)).join('');
  // Wolldecke ueber der Lehne, mit einem Streifen
  const decke = quader(-11.5, 11.5, -8.4, -7.2, 15.2, 22, CREME) +
    quader(-11.5, 11.5, -8.4, -7.2, 19, 20.2, { links: '#d9693b', rechts: '#b04e26', oben: '#ee8c5e' });
  // Armlehnen links und rechts, auf je zwei Stuetzen
  const arm = [-1, 1].map((s) => {
    const x0 = s > 0 ? 12.8 : -15, x1 = s > 0 ? 15 : -12.8;
    return quader(x0, x1, -6, 6, 14, 15.2, TEAK) +
      quader(s * 13.4 - 0.6, s * 13.4 + 0.6, -5.6, -4.8, 10.5, 14, TEAK) +
      quader(s * 13.4 - 0.6, s * 13.4 + 0.6, 4.8, 5.6, 10.5, 14, TEAK);
  }).join('');
  // Vier kurze Beine vom Sitz zu den Kufen
  const beine = [-1, 1].map((s) => [-5.8, 5.8].map((y) =>
    zug3([[s * 12.6, y, 9], [s * 12.6, y, kufenZ(y)]], 'stroke="#6b4a3a" stroke-width="2.6" stroke-linecap="round"') +
    zug3([[s * 12.6, y, 9], [s * 12.6, y, kufenZ(y)]], 'stroke="#b8743d" stroke-width="1.6" stroke-linecap="round"')
  ).join('')).join('');
  // Zwei lange Kufen, je unter einem Beinpaar, von hinten (y -10) nach vorne (y +10) gebogen
  const kufen = [-1, 1].map((s) => {
    const pts = [];
    for (let k = 0; k <= 30; k++) {
      const y = -10 + (20 * k) / 30;
      pts.push([s * 12.6, y, kufenZ(y)]);
    }
    return zug3(pts, 'stroke="#6b4a3a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"') +
      zug3(pts, 'stroke="#b8743d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"') +
      zug3(pts, 'stroke="#e2b07c" stroke-width="0.6" stroke-linecap="round" opacity="0.8"');
  }).join('');

  // Hinten liegende Teile zuerst: Lehne, Kufen, Beine, dann Sitz, Decke und Armlehnen
  const inhalt = kufen + beine + pfosten + sprossen + sitz + decke + arm;
  // Schaukeln: Skalierung in Tiefenrichtung um den Bodenkontakt
  return oval(0, 0, 21, 10.5, 'fill="#6b4a3a" opacity="0.18"') +
    `<g><animateTransform attributeName="transform" type="scale" values="1 0.96;1 1.04;1 0.96" dur="5s" repeatCount="indefinite"/>${inhalt}</g>`;
}

// ---------- Plattenspieler-Moebel ----------
// Herzblatt der Efeutute: Einbuchtung oben bei (0, 0), Spitze unten bei (0, 2.3)
const HERZ = 'M0,0C-0.6,-0.7 -1.5,-0.2 -1.3,0.7C-1.1,1.5 -0.4,2.0 0,2.3C0.4,2.0 1.1,1.5 1.3,0.7C1.5,-0.2 0.6,-0.7 0,0Z';
// Blatt am Ansatzpunkt (x, y) im Bild, leicht schwingend um den Ansatz
function herzBlatt(x, y, rot, s, farbe) {
  return `<g transform="translate(${f(x)},${f(y)})"><g>` +
    `<animateTransform attributeName="transform" type="rotate" values="${f(rot - 5)} 0 0;${f(rot + 5)} 0 0;${f(rot - 5)} 0 0" dur="4.5s" repeatCount="indefinite"/>` +
    `<path d="${HERZ}" transform="rotate(${rot}) scale(${s})" fill="${farbe}" stroke="#6b4a3a" stroke-width="${f(0.5 / s)}" stroke-linejoin="round"/>` +
    `<path d="M0,0.4L0,1.9" transform="rotate(${rot}) scale(${s})" stroke="#3a6b3a" stroke-width="${f(0.25 / s)}" fill="none"/>` +
    `</g></g>`;
}

function plattenspieler() {
  // Niedriges Teak-Sideboard auf schraegen Beinen
  const beine = [[-12, -5], [12, -5], [-12, 5], [12, 5]]
    .map(([x, y]) => bein(x, y, Math.sign(x) * 1.4, Math.sign(y) * 1.0, 2.5, 1.6)).join('');
  const korpus = quader(-13, 13, -6, 6, 2.5, 11, TEAK) +
    zug3([[0, 6, 3], [0, 6, 10.5]], 'stroke="#6b3d1e" stroke-width="0.6" fill="none"') +
    zug3([[-13, 6, 6.8], [13, 6, 6.8]], 'stroke="#c98f5a" stroke-width="0.4" fill="none" opacity="0.6"') +
    kreis(...P(-1.4, 6, 6.8), 0.9, `fill="${MESSING.links}" ${KF}`) +
    kreis(...P(1.4, 6, 6.8), 0.9, `fill="${MESSING.links}" ${KF}`);
  // Plattenteller mit Schallarm
  const teller = mantel(-2, 0, 5, 11, 5, 11.8, '#1d1d1d', '#4f4f4f') +
    scheibe(-2, 0, 5, 11.8, `fill="#2b2b2b" ${KF}`) +
    scheibe(-2, 0, 1.8, 11.9, 'fill="#d9693b"') +
    kreis(...P(-2, 0, 12), 0.5, `fill="${MESSING.oben}"`) +
    zug3([[-4.5, -3, 11.9], [-1.5, -3.6, 11.9]], 'stroke="#ffffff" stroke-width="0.7" stroke-linecap="round" opacity="0.35"');
  const arm = kreis(...P(9, -4, 11.4), 1.1, `fill="${MESSING.links}" ${KF}`) +
    zug3([[9, -4, 11.4], [9, -2, 13.2], [3.6, -0.6, 12.2]], 'stroke="#6b4a3a" stroke-width="1.6" stroke-linecap="round"') +
    zug3([[9, -4, 11.4], [9, -2, 13.2], [3.6, -0.6, 12.2]], `stroke="${MESSING.oben}" stroke-width="0.7" stroke-linecap="round"`);
  // Plattenstapel rechts, Cover als dünne Kartons
  const stapel = [PETROL, SENF, { links: '#d9693b', rechts: '#b04e26', oben: '#ee8c5e' }, CREME]
    .map((c, i) => quader(7.8, 11.6, 1.8, 5.6, 11 + i * 0.9, 11.8 + i * 0.9, c)).join('');

  // Efeutute in Terrakotta vorne links: Topf auf der Platte, die Ranken haengen ueber die Vorderkante herab
  const [tx, ty] = [-9.4, 4.2];
  const [px, py] = P(tx, ty, 12.9);
  const topf = mantel(tx, ty, 2.1, 11, 1.7, 12.9, '#b8643f', '#eba47f') +
    scheibe(tx, ty, 1.7, 12.9, 'fill="#5a3a22"');
  // Zwei kurze Triebe nach oben, mit je einem Blatt
  const FARBEN = ['#7fb069', '#5e9a52', '#9ccc7a', '#477d43'];
  let triebe = '';
  for (const [ende, rot] of [[[tx - 0.9, ty - 0.6, 13.6], 115], [[tx + 0.9, ty - 0.7, 13.3], -115]]) {
    const [ex, ey] = P(...ende);
    triebe += zug([[px, py], [ex, ey]], 'stroke="#5e9a52" stroke-width="0.9" stroke-linecap="round"') +
      herzBlatt(ex, ey, rot, 0.8, FARBEN[rot > 0 ? 0 : 1]);
  }
  // Zwei Ranken, die ueber die Vorderkante (y 6) herabhaengen, mit Herzblaettern
  const ranken = [
    [[-10.0, 5.0, 12.9], [-10.7, 6.0, 12.3], [-11.1, 6.3, 10.0], [-11.5, 6.3, 7.6], [-11.9, 6.3, 5.4]],
    [[-8.3, 5.1, 12.9], [-8.1, 6.1, 12.0], [-7.9, 6.3, 9.6], [-7.3, 6.3, 7.4]],
  ];
  let ranke = '';
  for (const r of ranken) {
    const sc = r.map(([x, y, z]) => P(x, y, z));
    ranke += zug(sc, 'stroke="#6b4a3a" stroke-width="1.4" stroke-linecap="round"') +
      zug(sc, 'stroke="#5e9a52" stroke-width="0.6" stroke-linecap="round"');
    for (let i = 1; i < r.length; i++) {
      const [bx, by] = sc[i];
      const seite = i % 2 ? 1 : -1;
      ranke += herzBlatt(bx, by, seite * (40 + 6 * (i % 3)), 0.95, FARBEN[(i + 1) % 4]);
    }
  }
  // Die Ranken schwingen leicht um den Topfrand
  const vg = `<g><animateTransform attributeName="transform" type="rotate" values="-1.5 ${f(px)} ${f(py)};1.5 ${f(px)} ${f(py)};-1.5 ${f(px)} ${f(py)}" dur="4.5s" repeatCount="indefinite"/>${ranke}</g>`;

  return kontakt(14) + beine + korpus + teller + arm + stapel + topf + triebe + vg;
}

// ---------- Lichterlaube ----------
function lichterlaube() {
  const hz = (x) => 32 + 4 * Math.sin((Math.PI * (x + 12)) / 24);
  const bogen = [];
  for (let k = 0; k <= 24; k++) {
    const x = -12 + k;
    bogen.push([x, 0, hz(x)]);
  }
  let s = kontakt(14);
  // Gitterwerk aus Teak hinter den Rosen
  for (let x = -10; x <= 10; x += 2.5) {
    s += zug3([[x, 0, 1.5], [x, 0, hz(x) - 0.5]], 'stroke="#a86b43" stroke-width="0.9" stroke-linecap="round"');
  }
  for (const z of [8, 16, 24]) {
    const pts = [];
    for (let x = -12; x <= 12; x += 1) pts.push([x, 0, z + 0 * x]);
    s += zug3(pts, 'stroke="#a86b43" stroke-width="0.9" stroke-linecap="round"');
  }
  // Pfosten und Bogen aus Teak
  s += zug3([[-12, 0, 0.6], [-12, 0, 32]], 'stroke="#6b4a3a" stroke-width="3.6" stroke-linecap="round"') +
    zug3([[12, 0, 0.6], [12, 0, 32]], 'stroke="#6b4a3a" stroke-width="3.6" stroke-linecap="round"') +
    zug3([[-12, 0, 0.6], [-12, 0, 32]], 'stroke="#b8743d" stroke-width="2.4" stroke-linecap="round"') +
    zug3([[12, 0, 0.6], [12, 0, 32]], 'stroke="#b8743d" stroke-width="2.4" stroke-linecap="round"') +
    zug3(bogen, 'stroke="#6b4a3a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"') +
    zug3(bogen, 'stroke="#b8743d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"');

  // Kletterrosen: Haufen aus Bluetenkoepfen und Blaettern, deterministisch verteilt
  const rnd = zufall(31);
  const farben = ['#e0606a', '#f29aa6', '#c94b5c', '#f7c1c7'];
  for (let i = 0; i < 26; i++) {
    const x = -11 + 22 * rnd();
    const z = hz(x) + (rnd() - 0.5) * 4 - (rnd() < 0.3 ? 4 + rnd() * 6 : 0);
    const [rx, ry] = P(x, 0.8, z);
    for (let j = 0; j < 3; j++) {
      const dx = (rnd() - 0.5) * 4, dy = (rnd() - 0.5) * 3;
      s += oval(rx + dx + 0.3, ry + dy + 0.4, 0.9 + rnd() * 0.3, 0.9 + rnd() * 0.3, `fill="#5e9a52" ${KF}`);
      s += kreis(rx + dx, ry + dy, 1.3 + rnd() * 0.5, `fill="${farben[(i + j) % 4]}" ${KF}`);
    }
  }
  // Lichterkette entlang dem Bogen, leicht durchhaengend, Lampen gestaffelt pulsierend
  const kette = [];
  for (let k = 0; k <= 24; k++) {
    const x = -12 + k;
    kette.push([x, 0.8, hz(x) - 1.6 - 0.4 * Math.sin(Math.PI * k / 24)]);
  }
  s += zug3(kette, 'stroke="#6b4a3a" stroke-width="0.5" fill="none" opacity="0.8"');
  for (let k = 1; k < 24; k += 2) {
    const [lx, ly] = P(...kette[k]);
    const begin = ((k % 6) * 0.5).toFixed(1);
    s += `<circle cx="${f(lx)}" cy="${f(ly + 1)}" r="2.6" fill="#fff3c4" opacity="0.35">` +
      `<animate attributeName="opacity" values="0.15;0.5;0.15" dur="2.4s" begin="${begin}s" repeatCount="indefinite"/></circle>` +
      `<circle cx="${f(lx)}" cy="${f(ly + 1)}" r="1.1" fill="#fffbe6">` +
      `<animate attributeName="opacity" values="0.5;1;0.5" dur="2.4s" begin="${begin}s" repeatCount="indefinite"/></circle>`;
  }
  return s;
}

// ---------- Aquarium ----------
function aquarium() {
  const WASSER = { links: '#2fb3b9', rechts: '#1f8f97', oben: '#8fe6e9' };
  const boden = 12.4, oben = 24.5;
  // Teak-Unterschrank mit zwei Tueren
  let s = kontakt(13) + quader(-12, 12, -7, 7, 0, 11, TEAK) + quader(-12, 12, -7, 7, 11, 11.8, TEAK) +
    zug3([[0, 7, 1], [0, 7, 10]], 'stroke="#6b3d1e" stroke-width="0.6" fill="none"') +
    kreis(...P(-1.4, 7, 5.5), 0.9, `fill="${MESSING.links}" ${KF}`) +
    kreis(...P(1.4, 7, 5.5), 0.9, `fill="${MESSING.links}" ${KF}`);
  // Sand am Boden des Beckens
  s += pk([[-10.6, -5.6, boden], [10.6, -5.6, boden], [10.6, 5.6, boden], [-10.6, 5.6, boden]], 'fill="#f0dca8"');
  // Hintere Innenwand und linke Innenwand des Wassers (von innen sichtbar)
  s += pk([[-10.6, -5.6, boden], [10.6, -5.6, boden], [10.6, -5.6, oben], [-10.6, -5.6, oben]], `fill="${WASSER.links}" opacity="0.75"`) +
    pk([[-10.6, -5.6, boden], [-10.6, 5.6, boden], [-10.6, 5.6, oben], [-10.6, -5.6, oben]], `fill="${WASSER.rechts}" opacity="0.7"`) +
    pk([[-10.6, -5.6, oben], [10.6, -5.6, oben], [10.6, 5.6, oben], [-10.6, 5.6, oben]], `fill="${WASSER.oben}" opacity="0.55"`);
  // Wasserpflanzen: Stiele mit Blaettern, wiegen dezent um den Bodenpunkt
  const pflanze = (x, y, hoehe, farbe) => {
    const [bx, by] = P(x, y, boden);
    let p = `<g><animateTransform attributeName="transform" type="rotate" values="-3 ${f(bx)} ${f(by)};3 ${f(bx)} ${f(by)};-3 ${f(bx)} ${f(by)}" dur="5s" repeatCount="indefinite"/>`;
    p += zug3([[x, y, boden], [x + 0.6, y + 0.3, boden + hoehe * 0.5], [x - 0.4, y - 0.2, boden + hoehe]], `stroke="#3a6b3a" stroke-width="1.1" fill="none" stroke-linecap="round"`);
    for (let k = 1; k <= 4; k++) {
      const z = boden + (hoehe * k) / 5;
      const side = k % 2 ? 1 : -1;
      const [lx, ly] = P(x + side * 1.6, y, z);
      p += oval(lx, ly, 3.2, 1.3, `fill="${farbe}" transform="rotate(${side * 28} ${f(lx)} ${f(ly)})" ${KF}`);
    }
    return p + '</g>';
  };
  s += pflanze(-6, -2, 9, '#5e9a52') + pflanze(4, -3, 11, '#7fb069') + pflanze(5, 3, 7, '#9ccc7a') + pflanze(-3, 3.5, 6, '#477d43');
  // Drei bunte Fische, schwimmen waagerecht hin und her
  const fisch = (x, y, z, farbe, dauer, weg) => {
    const [fx, fy] = P(x, y, z);
    return `<g><animateTransform attributeName="transform" type="translate" values="0 0;${weg} 0.6;0 0" dur="${dauer}s" repeatCount="indefinite"/>` +
      oval(fx, fy, 3.4, 1.7, `fill="${farbe}" ${KF}`) +
      poly([[fx - 3, fy], [fx - 5.2, fy - 1.9], [fx - 5.2, fy + 1.9]], `fill="${farbe}" ${KF}`) +
      kreis(fx + 1.8, fy - 0.4, 0.45, 'fill="#2b2b2b"') + '</g>';
  };
  s += fisch(-2, -1, 15, '#f08a3c', 6, 5) + fisch(3, 2, 16.5, '#ffd166', 7, -4) + fisch(-5, 3, 14, '#e0524d', 5.5, 4);
  // Blasen steigen auf
  for (const [x, y, t] of [[-3, 0, 0], [2, -2, 1.1], [-6, 2, 2.2], [4, 1, 0.6]]) {
    const [bx, by] = P(x, y, boden + 1);
    s += `<circle cx="${f(bx)}" cy="${f(by)}" r="0.9" fill="#ffffff" opacity="0.7">` +
      `<animate attributeName="cy" values="${f(by)};${f(by - 13)}" dur="3.6s" begin="${t}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values="0.8;0" dur="3.6s" begin="${t}s" repeatCount="indefinite"/></circle>`;
  }
  // Glas vorne: zwei Scheiben, Glanzstreifen
  s += pk([[-10.6, 5.6, boden], [10.6, 5.6, boden], [10.6, 5.6, oben], [-10.6, 5.6, oben]], `fill="${WASSER.links}" opacity="0.3"`) +
    pk([[10.6, -5.6, boden], [10.6, 5.6, boden], [10.6, 5.6, oben], [10.6, -5.6, oben]], `fill="${WASSER.rechts}" opacity="0.3"`) +
    pk([[-11, 6, boden], [11, 6, boden], [11, 6, oben], [-11, 6, oben]], 'fill="#dff6fb" opacity="0.18"') +
    pk([[11, -6, boden], [11, 6, boden], [11, 6, oben], [11, -6, oben]], 'fill="#dff6fb" opacity="0.22"') +
    zug3([[-9, 6, oben - 1.5], [-9, 6, boden + 2]], 'stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.6"');
  // Teak-Rahmen oben
  s += quader(-12, 12, 6, 7, 24.5, 25.5, TEAK) + quader(11, 12, -7, 7, 24.5, 25.5, TEAK) +
    quader(-12, 12, -7, -6, 24.5, 25.5, TEAK) + quader(-12, -11, -7, 7, 24.5, 25.5, TEAK);
  return s;
}

// ---------- Teewagen ----------
function teewagen() {
  const CREME_P = { links: '#f3e6cf', rechts: '#d6c3a0', oben: '#fbf4e6' };
  // Messing-Gestell: vier Staebe, Rollen unten
  const gestell = [[-10, -6], [10, -6], [-10, 6], [10, 6]]
    .map(([x, y]) => zug3([[x, y, 0.8], [x, y, 25]], 'stroke="#6b4a3a" stroke-width="2.2" stroke-linecap="round"') +
      zug3([[x, y, 0.8], [x, y, 25]], `stroke="${MESSING.links}" stroke-width="1.2" stroke-linecap="round"`) +
      kreis(...P(x, y, 0.8), 1.4, 'fill="#2b2b2b"')).join('');
  // Zwei Ebenen aus Teak mit Messingkante vorne
  const ebenen = [7, 21].map((z) =>
    quader(-11, 11, -7, 7, z, z + 1.4, TEAK) +
    zug3([[-11, 7, z + 0.7], [11, 7, z + 0.7]], `stroke="${MESSING.oben}" stroke-width="0.8" stroke-linecap="round"`)).join('');
  // Griff hinten oben
  const griff = zug3([[-10, -6, 25], [-10, -6.5, 27.5], [10, -6.5, 27.5], [10, -6, 25]], 'stroke="#6b4a3a" stroke-width="2" fill="none" stroke-linecap="round"') +
    zug3([[-10, -6, 25], [-10, -6.5, 27.5], [10, -6.5, 27.5], [10, -6, 25]], `stroke="${MESSING.oben}" stroke-width="0.9" fill="none" stroke-linecap="round"`);
  // Oberste Ebene: Teeservice aus Porzellan, Kanne mit Deckel
  const kanne = [[22.4, 1.2], [23.2, 2.1], [24.4, 2.3], [25.4, 1.6], [26, 0.6]];
  let service = '';
  for (let i = 0; i < kanne.length - 1; i++) {
    service += mantel(-3, 0, kanne[i][1], kanne[i][0], kanne[i + 1][1], kanne[i + 1][0], CREME_P.rechts, CREME_P.oben);
  }
  service += scheibe(-3, 0, 0.6, 26, `fill="#d9825b" ${KF}`) +
    zug3([[-0.9, 0, 23.6], [0.4, 0, 24.6], [0.9, 0, 25.2]], `stroke="${CREME_P.rechts}" stroke-width="1.4" fill="none" stroke-linecap="round"`) +
    zug3([[-5.2, 0, 23.4], [-6.4, 0, 24.6], [-5.6, 0, 25.6]], `stroke="${CREME_P.rechts}" stroke-width="1.2" fill="none" stroke-linecap="round"`);
  for (const [x, y] of [[3, -2.5], [3.2, 2.5]]) {
    service += mantel(x, y, 1.1, 22.4, 0.9, 24, CREME_P.rechts, CREME_P.oben) + scheibe(x, y, 0.9, 24, 'fill="#8a5a33"');
  }
  service += quader(0.8, 6.8, -4, 4, 22.4, 22.8, PETROL);
  // Unterste Ebene: Pflanze in Terrakotta und Teedose
  const pflanzeTopf = mantel(5, -2, 2, 8.4, 1.6, 11.2, '#b8643f', '#eba47f') + scheibe(5, -2, 1.6, 11.2, 'fill="#5a3a22"');
  const [px, py] = P(5, -2, 11.2);
  const blaetter = [[-35, 0, 0], [35, 0, 0], [-80, -2, 0], [70, -1, 0], [0, -4, 0]]
    .map(([winkel, dx, dy], i) => oval(px + dx * 1.5, py + dy, 4, 1.4, `fill="${['#7fb069', '#5e9a52', '#9ccc7a', '#477d43', '#7fb069'][i]}" transform="rotate(${winkel} ${f(px + dx * 1.5)} ${f(py + dy)})" ${KF}`)).join('');
  const dose = mantel(-5, 1, 1.8, 8.4, 1.8, 12.4, PETROL.rechts, PETROL.oben) + scheibe(-5, 1, 1.8, 12.4, `fill="${PETROL.oben}" ${KF}`);
  const stapel = [0, 1].map((i) => quader(-1.5, 3.5, -3, 1.5, 8.4 + i * 1.2, 9.6 + i * 1.2, i ? SENF : CREME)).join('');
  return kontakt(13) + gestell + griff + ebenen + pflanzeTopf + blaetter + dose + stapel + service;
}

// ---------- Messing-Skulptur ----------
// Geschlossene, weich gerundete Kurve durch die Punkte (Catmull-Rom als Bezierkurven)
function glattZu(pts) {
  const n = pts.length;
  let d = `M${p2(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n], e = pts[(i + 2) % n];
    const c1 = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6];
    const c2 = [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6];
    d += `C${p2(c1)} ${p2(c2)} ${p2(c)}`;
  }
  return d + 'Z';
}

// Offene, weich gerundete Kurve durch die Punkte (Hals, Bein)
function kurve(pts) {
  let d = `M${p2(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], e = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6];
    const c2 = [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6];
    d += `C${p2(c1)} ${p2(c2)} ${p2(c)}`;
  }
  return d;
}

// Kranich in Seitenansicht: er blickt nach rechts (Richtung (1,-1), im Bild waagerecht), auf rundem Terrazzo-Sockel.
// q(x, z) setzt Breite x und Hoehe z direkt in den Bildpunkt; Ursprung = Mitte des Bodenkontakts.
function skulptur() {
  const metall = eindeutig('skulptur-metall');
  const rnd = zufall(12);
  const q = (x, z) => [x, -z];
  // Sockel aus Terrazzo: runder Zylinder mit bunten Einschluessen
  let s = kontakt(8) + mantel(0, 0, 7.5, 0, 7.5, 3.6, '#c9c3b8', '#f2efe9') +
    scheibe(0, 0, 7.5, 3.6, `fill="#f2efe9" ${KB}`);
  const farben = ['#d9825b', '#2f6f73', '#d9a441', '#9fb79a', '#6b4a3a', '#e8e0d2'];
  for (let i = 0; i < 30; i++) {
    const a = rnd() * 2 * Math.PI, r = 6.9 * Math.sqrt(rnd());
    const [px, py] = P(r * Math.cos(a), r * Math.sin(a), 3.6);
    s += kreis(px, py, 0.5 + rnd() * 0.5, `fill="${farben[i % farben.length]}" opacity="0.85"`);
  }
  // Polierter Messingverlauf: Glanz oben links, Schatten unten rechts
  s += `<defs><radialGradient id="${metall}" cx="0.38" cy="0.32" r="0.8">` +
    `<stop offset="0" stop-color="#fff3c4"/><stop offset="0.3" stop-color="#f2d98a"/>` +
    `<stop offset="0.7" stop-color="#c9a14a"/><stop offset="1" stop-color="#9c7a2e"/></radialGradient></defs>`;
  const KANTE = 'stroke="#6b4a3a" stroke-width="1.1" stroke-linejoin="round"';

  // Bein: ein duenner Messingstab vom Sockel zum Koerper
  const bein = kurve([q(0.9, 13.8), q(0.6, 9.0), q(0.2, 3.6)]);
  s += pfad(bein, 'fill="none" stroke="#6b4a3a" stroke-width="2.6" stroke-linecap="round"') +
    pfad(bein, `fill="none" stroke="${MESSING.links}" stroke-width="1.4" stroke-linecap="round"`);
  // Hintere Schwinge und Schwanzfedern: dunkler, hinter dem Koerper
  s += poly([[-2.2, 19.4], [-8.4, 22.6], [-13.4, 19.2], [-9.4, 16.2]].map(([x, z]) => q(x, z)), `fill="#c9a14a" ${KANTE}`) +
    poly([[-5.6, 15.6], [-10.8, 13.4], [-9.6, 16.2], [-6.4, 17.2]].map(([x, z]) => q(x, z)), `fill="#c9a14a" ${KANTE}`);
  // Koerper: glatt gerundet, polierter Verlauf
  const korper = [[-6.2, 16.8], [-4.6, 20.4], [-0.8, 22.4], [3.2, 21.6], [5.4, 18.4], [4.6, 15.0], [1.0, 13.2], [-3.2, 13.6], [-5.8, 15.0]];
  s += `<path d="${glattZu(korper.map(([x, z]) => q(x, z)))}" fill="url(#${metall})" ${KANTE}/>`;
  // Hals: S-foermig nach oben und vorne, mit Schattenkante rechts und Glanzstreifen links
  const hals = kurve([[4.4, 20.2], [5.9, 23.6], [5.0, 27.4], [6.9, 31.0], [9.9, 33.8], [12.0, 35.4]].map(([x, z]) => q(x, z)));
  s += pfad(hals, 'fill="none" stroke="#6b4a3a" stroke-width="5" stroke-linecap="round"') +
    pfad(hals, 'fill="none" stroke="#9c7a2e" stroke-width="3.8" stroke-linecap="round" transform="translate(0.9,0.2)"') +
    pfad(hals, `fill="none" stroke="${MESSING.links}" stroke-width="3.4" stroke-linecap="round"`) +
    pfad(hals, 'fill="none" stroke="#fff3c4" stroke-width="1" stroke-linecap="round" opacity="0.9" transform="translate(-0.8,0)"');
  // Kopf mit langem, spitzem Schnabel und Auge
  s += oval(...q(12.4, 36.4), 2.8, 2.2, `fill="url(#${metall})" ${KANTE}`) +
    poly([[13.4, 37.3], [20.6, 35.8], [13.6, 35.3]].map(([x, z]) => q(x, z)), `fill="#c9a14a" ${KANTE}`) +
    kreis(...q(13.1, 36.9), 0.55, 'fill="#2b2b2b"');
  // Vordere Schwinge: zwei eckige, polierte Flaechen mit hellen Kanten
  s += poly([[-0.6, 20.8], [-5.4, 26.2], [-10.8, 25.4], [-7.4, 20.4], [-3.4, 17.6]].map(([x, z]) => q(x, z)), `fill="#f2d98a" ${KANTE}`) +
    zug([q(-0.6, 20.8), q(-5.4, 26.2), q(-10.8, 25.4)], 'stroke="#fff6d6" stroke-width="0.9" stroke-linecap="round" opacity="0.9"') +
    zug([q(-7.4, 20.4), q(-3.4, 17.6)], 'stroke="#9c7a2e" stroke-width="0.8" stroke-linecap="round" opacity="0.7"');
  // Glanzlicht auf dem Koerper
  s += zug([q(-2.6, 20.4), q(0.4, 21.6), q(2.6, 20.8)], 'stroke="#fff6d6" stroke-width="1.1" stroke-linecap="round" opacity="0.9"');
  return s;
}

// ---------- Meilenstein-Belohnungen (exklusiv, Tag 30 bis 365) ----------
const TERRA = { dunkel: '#cdb692', hell: '#f7efe0' };
const SPRENKEL = ['#d9a441', '#2f6f73', '#d9693b', '#9fb79a'];
const WASSER_HELL = '#8fd9ef';
const STEIN = { dunkel: '#c9c3b8', hell: '#f2efe9' };

// Bunte Sprenkel auf der sichtbaren Vorderseite eines Koerpers; rFn liefert den Radius in der Hoehe z
function sprenkel(seed, n, rFn, z0, z1) {
  const rnd = zufall(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 4 + rnd() * Math.PI;
    const z = z0 + rnd() * (z1 - z0);
    const r = rFn(z);
    s += kreis(...P(r * Math.cos(a), r * Math.sin(a), z), 0.4 + rnd() * 0.4,
      `fill="${SPRENKEL[i % SPRENKEL.length]}" opacity="0.85"`);
  }
  return s;
}

// Wellenring auf der Wasserflaeche in der Hoehe z, waechst und verblasst (Beginn versetzt)
function welle(z, begin) {
  const [cx, cy] = P(0, 0, z);
  return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="2.5" ry="1.3" fill="none" stroke="#ffffff" stroke-width="0.6">` +
    `<animate attributeName="rx" values="2.5;10" dur="3.6s" begin="${begin}s" repeatCount="indefinite"/>` +
    `<animate attributeName="ry" values="1.3;5" dur="3.6s" begin="${begin}s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0.9;0" dur="3.6s" begin="${begin}s" repeatCount="indefinite"/></ellipse>`;
}

// ---------- Goldene Giesskanne (30 Tage) ----------
// Vektorhelfer fuer die Rohr- und Trichtergeometrie der Giesskanne
const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; },
};

// Zwei Achsen quer zur Richtung d (waagerecht und senkrecht dazu)
function rahmen(d) {
  const uu = v3.norm(v3.cross(d, [0, 0, 1]));
  return [uu, v3.cross(d, uu)];
}

// Kegelstumpf bzw. Rohr von P0 (Radius r0) nach P1 (Radius r1) aus Segmenten; Licht von links oben
function rohrFlaechen(P0, r0, P1, r1, seg, dunkel, hell) {
  const LICHT = v3.norm([-1, 1, 1.5]), BLICK = v3.norm([1, 1, 1]);
  const d = v3.norm(v3.sub(P1, P0));
  const [uu, vv] = rahmen(d);
  const ring = (C, r, t) => v3.add(C, v3.add(v3.mul(uu, r * Math.cos(t)), v3.mul(vv, r * Math.sin(t))));
  let s = '';
  for (let i = 0; i < seg; i++) {
    const ta = i / seg, tb = (i + 1) / seg;
    const Ca = v3.add(P0, v3.mul(v3.sub(P1, P0), ta)), Cb = v3.add(P0, v3.mul(v3.sub(P1, P0), tb));
    const ra = r0 + (r1 - r0) * ta, rb = r0 + (r1 - r0) * tb;
    for (let j = 0; j < 16; j++) {
      const t1 = (2 * Math.PI * j) / 16, t2 = (2 * Math.PI * (j + 1)) / 16, tm = (t1 + t2) / 2;
      const n = v3.add(v3.mul(uu, Math.cos(tm)), v3.mul(vv, Math.sin(tm)));
      if (v3.dot(n, BLICK) <= 0) continue;
      const c = mischen(dunkel, hell, (v3.dot(n, LICHT) + 1) / 2);
      s += pk([ring(Ca, ra, t1), ring(Ca, ra, t2), ring(Cb, rb, t2), ring(Cb, rb, t1)],
        `fill="${c}" stroke="${c}" stroke-width="0.6" stroke-linejoin="round"`);
    }
  }
  return s;
}

function giesskanne() {
  const DUNKEL = '#b8871f', HELL = '#f7da7a', GRUND = '#e8b83a', MESS = '#c9a14a';
  // Teak-Sockel
  let s = kontakt(8) + mantel(0, 0, 7.4, 0, 7.4, 1.6, TEAK.rechts, TEAK.links) +
    scheibe(0, 0, 7.4, 1.6, `fill="${TEAK.oben}" ${KB}`);
  // Tuelle: schlankes, leicht verjuengtes Goldrohr, unten vorne am Koerper angesetzt
  const ex = 0.8, ey = -0.6;
  const A = [ex * 4.0, ey * 4.0, 2.4], B = [ex * 11.0, ey * 11.0, 11.2];
  const d = v3.norm(v3.sub(B, A));
  const F = v3.add(B, v3.mul(d, 1.8));   // Stirnflaeche des Trichters
  s += rohrFlaechen(A, 1.0, B, 0.8, 6, DUNKEL, HELL);
  // Trichter: kurzer Kegelstumpf, weitet sich nach vorn
  s += rohrFlaechen(B, 0.8, F, 1.7, 3, DUNKEL, HELL);
  // Geschlossener, hoher Koerper (Zylinder mit leicht gewoelbter Flanke)
  const profil = [[1.6, 4.6], [4.0, 5.9], [8.0, 6.3], [11.0, 6.0], [12.6, 5.4]];
  for (let i = 0; i < profil.length - 1; i++) {
    s += mantel(0, 0, profil[i][1], profil[i][0], profil[i + 1][1], profil[i + 1][0], DUNKEL, HELL);
  }
  // Deckel mit kleiner ovaler Einfuellöffnung hinten
  s += scheibe(0, 0, 5.4, 12.6, `fill="${GRUND}" ${KB}`);
  const loch = [];
  for (let k = 0; k < 20; k++) {
    const th = (2 * Math.PI * k) / 20;
    loch.push([-2.2 + 1.7 * Math.cos(th), -2.2 + 1.2 * Math.sin(th), 12.65]);
  }
  s += pk(loch, `fill="${DUNKEL}" stroke="#6b4a3a" stroke-width="0.8" stroke-linejoin="round"`);
  // Glanzstreifen links oben am Koerper
  const gl = (r, z) => [Math.cos((3 * Math.PI) / 4) * r * 0.92, Math.sin((3 * Math.PI) / 4) * r * 0.92, z];
  s += zug3([gl(5.0, 4.0), gl(6.0, 7.0), gl(5.5, 10.0)], 'stroke="#fff8dc" stroke-width="1.1" stroke-linecap="round" opacity="0.9"');
  // Buegel: grosser Bogen von der Vorderkante oben ueber den Deckel zur Rueckwand
  const buegel = [];
  for (let k = 0; k <= 24; k++) {
    const t = k / 24;
    // Bügel quer zur Tülle, vom Betrachter nach hinten (wirkt in der Ansicht wie ein senkrechter Griff)
    const sv = 4.8 * (1 - 2 * t);
    buegel.push([Math.SQRT1_2 * sv, Math.SQRT1_2 * sv, 12.4 + 6.4 * Math.sin(Math.PI * t)]);
  }
  s += zug3(buegel, 'stroke="#6b4a3a" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"') +
    zug3(buegel, `stroke="${GRUND}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`) +
    zug3(buegel, `stroke="${HELL}" stroke-width="0.7" stroke-linecap="round" opacity="0.8"`);
  // Brausekopf: Stirnflaeche des Trichters als Ellipse quer zur Spritzrichtung, Messing, dunkler Rand
  const [uu, vv] = rahmen(d);
  const aufKreis = (C, r, th) => v3.add(C, v3.add(v3.mul(uu, r * Math.cos(th)), v3.mul(vv, r * Math.sin(th))));
  const rand = [];
  for (let k = 0; k < 28; k++) rand.push(aufKreis(F, 1.7, (2 * Math.PI * k) / 28));
  s += pk(rand, `fill="${MESS}" stroke="#6b4a3a" stroke-width="1.0" stroke-linejoin="round"`);
  // Sechs Loecher im Kreis plus eines in der Mitte
  const loecher = [[0, 0]];
  for (let k = 0; k < 6; k++) {
    loecher.push([Math.cos((2 * Math.PI * k) / 6) * 1.0, Math.sin((2 * Math.PI * k) / 6) * 1.0]);
  }
  for (const [x, y] of loecher) {
    const p = v3.add(F, v3.add(v3.mul(uu, x), v3.mul(vv, y)));
    s += kreis(...P(...p), 0.25, 'fill="#6b4a3a"');
  }
  return s;
}

// ---------- Terrazzo-Vogeltraenke (50 Tage) ----------
function vogeltraenke() {
  // Sockel und dicke Saeule aus Terrazzo, oben in den Schalenfuss uebergehend
  let s = kontakt(9) + mantel(0, 0, 5.4, 0, 5.4, 1.2, TERRA.dunkel, TERRA.hell) +
    scheibe(0, 0, 5.4, 1.2, `fill="${TERRA.hell}" ${KB}`);
  const saeule = (z) => 2.5 - (0.3 * (z - 1.2)) / 8.6;
  s += mantel(0, 0, saeule(1.2), 1.2, saeule(9.4), 9.4, TERRA.dunkel, TERRA.hell) +
    sprenkel(41, 30, saeule, 1.6, 9.0);
  // Schalenfuss: weicher Uebergang von der Saeule zur Schale
  s += mantel(0, 0, 2.2, 9.4, 3.4, 10.0, TERRA.dunkel, TERRA.hell);
  // Schale mit geschwungener Wand, Rand und Wasser
  const wand = [[3.4, 10.0], [4.1, 10.4], [5.0, 11.2], [5.7, 12.4], [6.0, 13.4]];
  for (let i = 0; i < wand.length - 1; i++) {
    s += mantel(0, 0, wand[i][0], wand[i][1], wand[i + 1][0], wand[i + 1][1], TERRA.dunkel, TERRA.hell);
  }
  s += sprenkel(42, 34, (z) => 3.4 + ((z - 10.0) * 2.6) / 3.4, 10.3, 12.9) +
    scheibe(0, 0, 6.0, 13.4, `fill="${TERRA.hell}" ${KON}`) +
    scheibe(0, 0, 5.1, 13.45, `fill="${WASSER_HELL}"`);
  // Glanz auf dem Wasser
  const glanz = [];
  for (let k = 0; k <= 10; k++) {
    const a = 2.0 + (0.7 * k) / 10;
    glanz.push([3.4 * Math.cos(a), 3.4 * Math.sin(a), 13.5]);
  }
  s += zug3(glanz, 'stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" opacity="0.8"');
  // Rotkehlchen am Rand, 30 Prozent kleiner, Blick nach rechts (Koordinaten relativ zum Fusspunkt)
  const [bx, by] = P(5.5, -1.7, 13.4);
  const vogel = zug([[-0.6, -0.6], [-0.9, 0.9]], 'stroke="#c9a14a" stroke-width="0.7" stroke-linecap="round"') +
    zug([[0.6, -0.6], [0.7, 0.9]], 'stroke="#c9a14a" stroke-width="0.7" stroke-linecap="round"') +
    poly([[-2.6, -3.2], [-5.4, -2.2], [-4.8, -0.9], [-2.0, -1.8]], `fill="#6e5238" ${KF}`) +
    oval(0, -3.4, 3.2, 2.4, `fill="#8a6a4f" ${KF}`) +
    oval(1.2, -2.6, 2.1, 1.9, `fill="#d9693b" ${KF}`) +
    oval(-0.4, -3.6, 2.0, 1.1, `fill="#6e5238" ${KF}`) +
    kreis(2.6, -6.2, 1.8, `fill="#8a6a4f" ${KF}`) +
    kreis(3.0, -5.2, 1.0, `fill="#e8803e" ${KF}`) +
    poly([[4.2, -6.4], [5.8, -5.9], [4.2, -5.5]], `fill="#c9a14a" ${KF}`) +
    kreis(3.0, -6.6, 0.4, 'fill="#2b2b2b"');
  s += oval(bx + 0.4, by + 0.3, 2.1, 0.6, SCHATTEN) +
    `<g transform="translate(${f(bx)},${f(by)}) scale(0.7)">${vogel}</g>`;
  return s;
}

// ---------- Messing-Sonnenuhr (100 Tage) ----------
function sonnenuhr() {
  let s = kontakt(8) + mantel(0, 0, 6.2, 0, 6.2, 1.8, STEIN.dunkel, STEIN.hell) +
    scheibe(0, 0, 6.2, 1.8, `fill="${STEIN.hell}" ${KB}`);
  // Steinsaeule, nach oben leicht schmaler, mit feinen Adern
  s += mantel(0, 0, 4.2, 1.8, 3.6, 12.6, STEIN.dunkel, STEIN.hell);
  for (const a0 of [0.4, 1.9]) {
    const ader = [];
    for (let k = 0; k <= 12; k++) {
      const z = 2.6 + k * 0.8;
      const r = 4.2 - (0.6 * (z - 1.8)) / 10.8;
      const a = a0 + 0.15 * Math.sin(k * 0.9);
      ader.push([r * Math.cos(a), r * Math.sin(a), z]);
    }
    s += zug3(ader, 'stroke="#9d9990" stroke-width="0.5" stroke-linecap="round" opacity="0.7"');
  }
  // Kapitell und Messingscheibe
  s += mantel(0, 0, 4.7, 12.6, 4.7, 13.4, STEIN.dunkel, STEIN.hell) +
    scheibe(0, 0, 4.7, 13.4, `fill="${STEIN.hell}" ${KB}`) +
    mantel(0, 0, 6.6, 13.4, 6.6, 14.0, MESSING.rechts, MESSING.links) +
    scheibe(0, 0, 6.6, 14.0, `fill="${MESSING.oben}" ${KON}`);
  // Stundenmarken: Doppelstriche bei XII, III, VI, IX (roemisch angedeutet), sonst einfache Striche
  for (let k = 0; k < 12; k++) {
    const th = (2 * Math.PI * k) / 12;
    const ri = k % 3 === 0 ? 4.5 : 5.3, ro = 5.9;
    const tx = -Math.sin(th), ty = Math.cos(th);
    const offs = k % 3 === 0 ? [-0.25, 0.25] : [0];
    for (const o of offs) {
      s += zug3([[ri * Math.cos(th) + o * tx, ri * Math.sin(th) + o * ty, 14.02],
        [ro * Math.cos(th) + o * tx, ro * Math.sin(th) + o * ty, 14.02]],
        'stroke="#6b4a3a" stroke-width="0.7" stroke-linecap="round"');
    }
  }
  const ring = [];
  for (let k = 0; k <= 32; k++) {
    const th = (2 * Math.PI * k) / 32;
    ring.push([3.4 * Math.cos(th), 3.4 * Math.sin(th), 14.02]);
  }
  s += zug3(ring, 'stroke="#9c7a33" stroke-width="0.5" stroke-linecap="round" opacity="0.7"');
  // Gnomon: flaches dreieckiges Messingblech. Grundlinie auf der Scheibe nach hinten (Richtung (-1,-1)),
  // Senkrechte hinten, Hypotenuse steigt von vorne nach hinten oben an. Dicke quer dazu.
  // Grundlinie quer zur Blickrichtung (in der Ansicht nach links), sonst sieht man das Blech nur als Strich
  const bk = [-Math.SQRT1_2, Math.SQRT1_2], qd = [-Math.SQRT1_2, -Math.SQRT1_2], dk = 0.35;
  const gp = (sv, dz, t) => [bk[0] * sv + qd[0] * t, bk[1] * sv + qd[1] * t, 14.0 + dz];
  // Schattenkeil auf der Scheibe, faellt nach rechts unten
  const s0 = gp(0, 0, 0), s3 = gp(3.6, 0, 0);
  s += pk([gp(0, 0, dk), gp(3.6, 0, dk), [s3[0] + 4.0, s3[1] + 0.2, 14.0], [s0[0] + 3.0, s0[1] + 0.2, 14.0]],
    'fill="#6b4a3a" opacity="0.3"');
  // Hypotenuse (Lichtseite) und Senkrechte hinten (Schattenseite)
  s += pk([gp(0, 0, dk), gp(0, 0, -dk), gp(3.6, 4.6, -dk), gp(3.6, 4.6, dk)], `fill="${MESSING.oben}" ${KF}`) +
    pk([gp(3.6, 0, dk), gp(3.6, 0, -dk), gp(3.6, 4.6, -dk), gp(3.6, 4.6, dk)], `fill="${MESSING.rechts}" ${KF}`) +
    // Vordere Dreiecksflaeche des Blechs (zum Betrachter), mit Glanz entlang der Hypotenuse
    pk([gp(0, 0, -dk), gp(3.6, 0, -dk), gp(3.6, 4.6, -dk)], `fill="${MESSING.links}" ${KB}`) +
    zug3([gp(0.7, 0.35, -dk), gp(3.2, 3.6, -dk)], 'stroke="#fff8dc" stroke-width="0.6" stroke-linecap="round" opacity="0.9"');
  return s;
}

// ---------- Keramik-Pfau (200 Tage) ----------
function keramikpfau() {
  const PF = '#2f6f73', PFH = '#5fb0b4', PFD = '#1f4f52', SENF_H = '#d9a441';
  // Glasierter Sockel; alles Weitere sitzt auf seiner Oberkante (y -1.8)
  let s = kontakt(7) + mantel(0, 0, 5.6, 0, 5.6, 1.8, PFD, PFH) +
    scheibe(0, 0, 5.6, 1.8, `fill="#4a8f93" ${KB}`);
  // Aufgefaechertes Rad hinter dem Koerper, mit Augenflecken an den Federspitzen
  const F = [-2.6, -7.5];
  const FED = [PF, '#4a8f93', PFD];
  let federn = '', augen = '';
  for (let i = 0; i < 9; i++) {
    const phi = ((-75 + (150 * i) / 8) * Math.PI) / 180;
    const L = 12.5 - (1.2 * Math.abs(i - 4)) / 4;
    const dx = Math.sin(phi), dy = -Math.cos(phi);
    const cx = F[0] + (L / 2) * dx, cy = F[1] + (L / 2) * dy;
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    federn += oval(cx, cy, L / 2, 2.5, `fill="${FED[i % 3]}" transform="rotate(${f(deg)} ${f(cx)} ${f(cy)})" ${KF}`);
    const ax = F[0] + 0.74 * L * dx, ay = F[1] + 0.74 * L * dy;
    augen += kreis(ax, ay, 1.9, `fill="${SENF_H}" ${KF}`) +
      kreis(ax, ay, 1.1, `fill="${PF}"`) +
      kreis(ax, ay, 0.4, 'fill="#f7ecd9"');
  }
  const fac = `<g><animateTransform attributeName="transform" type="rotate" values="-2 ${f(F[0])} ${f(F[1])};2 ${f(F[0])} ${f(F[1])};-2 ${f(F[0])} ${f(F[1])}" dur="6s" repeatCount="indefinite"/>${federn}${augen}</g>`;
  // Koerper mit Glasur-Glanz und Fluegel-Andeutung
  const koerper = [[-5.4, -1.0], [-6.2, -4.6], [-4.2, -8.2], [-0.2, -9.2], [3.6, -7.6], [5.6, -4.2], [5.2, -1.2], [2.0, 0.2], [-2.6, 0.0]];
  const hals = kurve([[3.6, -7.4], [5.2, -11.0], [5.6, -13.8], [7.0, -16.0]]);
  const koerperTeil = pfad(glattZu(koerper), `fill="${PF}" ${KON}`) +
    pfad(glattZu([[1.4, -1.2], [4.6, -3.0], [5.0, -1.4], [2.4, -0.4]]), `fill="${PFD}" opacity="0.6"`) +
    pfad(glattZu([[-3.8, -4.6], [-0.8, -6.0], [1.8, -4.4], [-0.6, -2.6]]), `fill="${PFD}" opacity="0.5" ${KF}`) +
    oval(-2.4, -6.4, 2.2, 1.2, `fill="${PFH}" opacity="0.9"`) +
    oval(-2.8, -7.4, 1.0, 0.5, 'fill="#ffffff" opacity="0.55"');
  const halsTeil = pfad(hals, 'fill="none" stroke="#6b4a3a" stroke-width="4.4" stroke-linecap="round"') +
    pfad(hals, `fill="none" stroke="${PF}" stroke-width="3.2" stroke-linecap="round"`) +
    pfad(hals, `fill="none" stroke="${PFH}" stroke-width="0.9" stroke-linecap="round" opacity="0.8" transform="translate(-0.9,0)"`);
  // Kopf mit Haube aus drei Federn, Schnabel und Auge
  const kopfTeil = oval(7.4, -16.6, 2.2, 2.0, `fill="${PF}" ${KB}`) +
    zug([[6.6, -18.4], [5.6, -21.0]], `stroke="${PF}" stroke-width="1" stroke-linecap="round"`) +
    zug([[7.4, -18.6], [7.4, -21.4]], `stroke="${PF}" stroke-width="1" stroke-linecap="round"`) +
    zug([[8.2, -18.4], [9.2, -20.8]], `stroke="${PF}" stroke-width="1" stroke-linecap="round"`) +
    kreis(5.6, -21.2, 0.7, `fill="${SENF_H}" ${KF}`) +
    kreis(7.4, -21.6, 0.7, `fill="${SENF_H}" ${KF}`) +
    kreis(9.2, -21.0, 0.7, `fill="${SENF_H}" ${KF}`) +
    poly([[9.2, -16.8], [11.6, -16.0], [9.2, -15.4]], `fill="${SENF_H}" ${KF}`) +
    kreis(8.3, -17.0, 0.5, 'fill="#2b2b2b"') +
    kreis(8.2, -17.2, 0.18, 'fill="#ffffff"');
  s += `<g transform="translate(0,-1.8)">${fac}${koerperTeil}${halsTeil}${kopfTeil}</g>`;
  return s;
}

// ---------- Jubilaeums-Brunnen (365 Tage) ----------
function jubilaeumsbrunnen() {
  const SR = 2.6;
  // Untere Schale aus Terrazzo mit Wasser und Wellen
  let s = kontakt(12) +
    mantel(0, 0, 10.6, 0, 10.6, 2.6, TERRA.dunkel, TERRA.hell) +
    sprenkel(51, 36, () => 10.6, 0.4, 2.2) +
    scheibe(0, 0, 10.6, 2.6, `fill="${TERRA.hell}" ${KON}`) +
    scheibe(0, 0, 9.5, 2.62, `fill="${WASSER_HELL}"`) +
    welle(2.62, 0) + welle(2.62, 1.8);
  // Saeule zwischen den Schalen, mit Messingringen unten und unter der oberen Schale
  s += mantel(0, 0, SR + 0.3, 2.62, SR + 0.3, 3.3, MESSING.rechts, MESSING.oben) +
    mantel(0, 0, SR, 3.3, SR, 14.0, TERRA.dunkel, TERRA.hell) +
    sprenkel(52, 40, () => SR, 3.6, 13.8) +
    mantel(0, 0, SR + 0.2, 14.0, SR + 0.2, 14.4, MESSING.rechts, MESSING.oben);
  // Obere Schale: etwa 55 Prozent der unteren, hoeher, mit Fuss
  s += mantel(0, 0, SR + 0.2, 14.4, 3.6, 14.7, TERRA.dunkel, TERRA.hell);
  const schale = [[3.6, 14.7], [4.6, 15.0], [5.5, 15.4], [5.8, 15.8]];
  for (let i = 0; i < schale.length - 1; i++) {
    s += mantel(0, 0, schale[i][0], schale[i][1], schale[i + 1][0], schale[i + 1][1], TERRA.dunkel, TERRA.hell);
  }
  s += sprenkel(53, 30, (z) => 4.6 + (z - 15.0) * 2.25, 15.1, 15.5) +
    scheibe(0, 0, 5.8, 15.8, `fill="${TERRA.hell}" ${KON}`) +
    scheibe(0, 0, 4.9, 15.85, `fill="${WASSER_HELL}"`) +
    welle(15.85, 0.6) + welle(15.85, 2.4);
  // Messingstab mit Kugel, traegt die Fontaene
  s += mantel(0, 0, 0.8, 15.85, 0.7, 17.6, MESSING.rechts, MESSING.oben) +
    kreis(...P(0, 0, 17.9), 0.8, `fill="${MESSING.oben}" ${KF}`);
  // Wasserstrahl: vier Baegen vom Kopf in die obere Schale
  for (const th of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    const bogen = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      bogen.push([2.6 * t * Math.cos(th), 2.6 * t * Math.sin(th), 18.0 - 2.1 * t * t]);
    }
    s += zug3(bogen, 'stroke="#5fc8dc" stroke-width="1" stroke-linecap="round" opacity="0.9"') +
      zug3(bogen, 'stroke="#ffffff" stroke-width="0.4" stroke-linecap="round" opacity="0.9"');
  }
  // Wasserfall von der oberen in die untere Schale: unterlegte Bahn mit animierten Tropfen
  for (const th of [-0.55, 2.12]) {
    const x = 5.2 * Math.cos(th), y = 5.2 * Math.sin(th);
    const [a1, b1] = P(x, y, 15.6), [a2, b2] = P(x, y, 2.8);
    s += `<path d="M${f(a1)},${f(b1)}L${f(a2)},${f(b2)}" fill="none" stroke="#5fc8dc" stroke-width="2.2" stroke-linecap="round" opacity="0.6"/>` +
      `<path d="M${f(a1)},${f(b1)}L${f(a2)},${f(b2)}" fill="none" stroke="#ffffff" stroke-width="1" stroke-linecap="round" stroke-dasharray="1.2 1.6" opacity="0.9">` +
      `<animate attributeName="stroke-dashoffset" values="0;-5.6" dur="1.4s" repeatCount="indefinite"/></path>`;
  }
  // Messing-Plakette mit „365“ vorne auf der Säule: zur Ansicht gedrehtes Schild, breit genug für die Zahl
  const [px, py] = P(SR * Math.cos(Math.PI / 4), SR * Math.sin(Math.PI / 4), 8.8);
  s += `<rect x="${f(px - 3.6)}" y="${f(py - 1.9)}" width="7.2" height="3.8" rx="0.8" fill="${MESSING.rechts}" stroke="#6b4a3a" stroke-width="0.7"/>` +
    `<rect x="${f(px - 3.1)}" y="${f(py - 1.45)}" width="6.2" height="2.9" rx="0.5" fill="${MESSING.oben}"/>` +
    `<text x="${f(px)}" y="${f(py + 0.95)}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="2.7" font-weight="bold" fill="#6b4a3a" textLength="5" lengthAdjust="spacingAndGlyphs">365</text>`;
  return s;
}

// ---------- Export ----------
export const DEKO2 = {
  katzenkorb: { name: 'Katzenkorb', zeichne: () => katzenkorb() },
  leseecke: { name: 'Leseplatz', zeichne: () => leseecke() },
  loungesessel: { name: 'Lounge-Sessel', zeichne: () => loungesessel() },
  haengesessel: { name: 'Rattan-Hängesessel', zeichne: () => haengesessel() },
  bogenlampe: { name: 'Bogenlampe', zeichne: () => bogenlampe() },
  schaukelstuhl: { name: 'Schaukelstuhl', zeichne: () => schaukelstuhl() },
  plattenspieler: { name: 'Plattenspieler-Möbel', zeichne: () => plattenspieler() },
  lichterlaube: { name: 'Lichterbogen', zeichne: () => lichterlaube() },
  aquarium: { name: 'Aquarium', zeichne: () => aquarium() },
  teewagen: { name: 'Teewagen', zeichne: () => teewagen() },
  skulptur: { name: 'Messing-Skulptur', zeichne: () => skulptur() },
  goldene_giesskanne: { name: 'Goldene Gießkanne', zeichne: () => giesskanne() },
  vogeltraenke: { name: 'Terrazzo-Vogeltränke', zeichne: () => vogeltraenke() },
  sonnenuhr: { name: 'Messing-Sonnenuhr', zeichne: () => sonnenuhr() },
  keramikpfau: { name: 'Keramik-Pfau', zeichne: () => keramikpfau() },
  jubilaeumsbrunnen: { name: 'Jubiläums-Brunnen', zeichne: () => jubilaeumsbrunnen() },
};
