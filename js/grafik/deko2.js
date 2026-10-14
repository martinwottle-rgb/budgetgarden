// Deko der Spaetspiel-Stufen (SPEC-2, Abschnitt 3). Export DEKO2, gleiche Schnittstelle wie DEKO (deko.js):
// zeichne() liefert SVG mit Ursprung (0,0) = Mitte des Bodenkontakts, ohne Positionierung. In der Szene mit scale(1.6).
// Lokale Isometrie wie in deko.js: x nach rechts unten, y nach links unten, z nach oben (px). Licht von links oben.
// Stil: Mid-Century (Teak, Messing, Akzentfarben aus STIL.md). Alles deterministisch, Animation nur per SVG <animate>.

import { f, kreis, linie, oval, p2, pfad, poly, zufall } from './hilfen.js';

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

// Flaches Kissen als Ellipse in der Ebene z, mit Glanz links oben
function kissenFlach(cx, cy, z, rx, ry, hell, dunkel) {
  const [sx, sy] = P(cx, cy, z);
  return oval(sx + 0.8, sy + 1.2, rx, ry, `fill="${dunkel}" ${KB}`) +
    oval(sx, sy, rx, ry, `fill="${hell}" ${KB}`) +
    oval(sx - rx * 0.3, sy - ry * 0.35, rx * 0.45, ry * 0.2, 'fill="#ffffff" opacity="0.5"');
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
function haengesessel() {
  // Teak-Bogenstaender: zwei Beine und ein gebogener Balken, daran das Rattan-Ei
  const hz = (x) => 40 + 4 * Math.sin((Math.PI * (x + 12)) / 24);
  const bogen = [];
  for (let k = 0; k <= 24; k++) {
    const x = -12 + (24 * k) / 24;
    bogen.push([x, 0, hz(x)]);
  }
  let s = kontakt(12) + bein(-12, 0, -3, 0, 40, 2.2) + bein(12, 0, 3, 0, 40, 2.2);
  s += zug3(bogen, 'stroke="#6b4a3a" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"') +
    zug3(bogen, 'stroke="#b8743d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"') +
    zug3(bogen, 'stroke="#e2b07c" stroke-width="0.7" stroke-linecap="round" opacity="0.8"');
  // Rattan-Ei: Ellipsoid, oben offen. Radius nach Hoehe (Mitte z 21, halbe Hoehe 13)
  const R = (z) => 9 * Math.sqrt(Math.max(0, 1 - ((z - 21) / 13) ** 2));
  const zs = [8, 11, 14, 17, 20, 23, 26, 28.5, 30];
  for (let i = 0; i < zs.length - 2; i++) {
    const z0 = zs[i], z1 = zs[i + 1];
    s += mantel(0, 0, R(z0), z0, R(z1), z1, RATTAN[0], RATTAN[1]) +
      bandLinien(0, 0, R(z0), z0, R(z1), z1, 1.5, 'stroke="#8a5a33" stroke-width="0.6" stroke-linecap="round" opacity="0.7"');
  }
  // Oeffnung, Kissen darin, dann der vorderste Ring
  s += scheibe(0, 0, R(30), 30, 'fill="#6e4426"') +
    kissenFlach(-1.6, 0.2, 28.4, 4.2, 2.6, '#eebf55', '#c08f2c') +
    kissenFlach(2.2, -0.4, 28.8, 3.6, 2.3, '#f3e6cf', '#cdb692');
  const z0 = zs[zs.length - 2], z1 = zs[zs.length - 1];
  s += mantel(0, 0, R(z0), z0, R(z1), z1, RATTAN[0], RATTAN[1]) +
    bandLinien(0, 0, R(z0), z0, R(z1), z1, 1.5, 'stroke="#8a5a33" stroke-width="0.6" stroke-linecap="round" opacity="0.7"');
  // Seile zum Balken
  for (const x of [-4.6, 4.6]) {
    s += zug3([[x, 0, 30], [x, 0, hz(x)]], 'stroke="#8a5a33" stroke-width="0.9" stroke-linecap="round"');
  }
  // Strickdecke, ueber den vorderen Rand gelegt, mit Streifen
  s += quader(-4.8, 4.8, 6.2, 7.6, 20, 29.5, CREME) +
    quader(-4.8, 4.8, 6.2, 7.6, 24, 25.4, { links: '#d9693b', rechts: '#b04e26', oben: '#ee8c5e' }) +
    quader(-4.8, 4.8, 6.2, 7.6, 27.2, 28.4, { links: '#2f6f73', rechts: '#1f4f52', oben: '#4a8f93' });
  return s;
}

// ---------- Bogenlampe ----------
const MARMOR = { hell: '#ece9e3', dunkel: '#b9b5ac' };

function bogenlampe() {
  const glow = eindeutig('bogen-glow');
  // Warmer Lichtschein auf dem Boden, unter dem Schirm
  const [gx, gy] = P(18, 0, 0);
  let s = `<defs><radialGradient id="${glow}"><stop offset="0" stop-color="#ffe9a8" stop-opacity="0.75"/>` +
    `<stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient></defs>` +
    `<ellipse cx="${f(gx)}" cy="${f(gy)}" rx="22" ry="11" fill="url(#${glow})">` +
    `<animate attributeName="opacity" values="0.8;1;0.8" dur="4s" repeatCount="indefinite"/></ellipse>`;
  // Marmorfuss: runde Scheibe mit feinen Adern
  s += kontakt(8) + mantel(0, 0, 8, 0, 8, 2.5, MARMOR.dunkel, MARMOR.hell) +
    scheibe(0, 0, 8, 2.5, `fill="${MARMOR.hell}" ${KB}`) +
    zug3([[-5, -3, 2.5], [-1, 1, 2.5], [3, -2, 2.5], [6, 2, 2.5]], 'stroke="#9d9990" stroke-width="0.6" fill="none" opacity="0.8"') +
    zug3([[-2, 4, 2.5], [1, 0, 2.5], [4, 4, 2.5]], 'stroke="#9d9990" stroke-width="0.5" fill="none" opacity="0.6"');
  // Bogen aus Messing: steigt vom Fuss an und endet ueber dem Schirm
  const bogen = [];
  for (let k = 0; k <= 30; k++) {
    const t = k / 30;
    bogen.push([18 * t, 0, 2.5 + 36 * (1 - (1 - t) ** 2)]);
  }
  s += zug3(bogen, 'stroke="#6b4a3a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"') +
    zug3(bogen, `stroke="${MESSING.links}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`) +
    zug3(bogen, 'stroke="#fff4cc" stroke-width="0.6" stroke-linecap="round" opacity="0.8"');
  // Schirm: Kuppel als Mantel aus Ringen, unten offen, oben Messingknauf
  const profil = [[24, 10], [27, 9.8], [30, 8.2], [33, 5.6], [36, 3.2], [38, 2.4]];
  for (let i = 0; i < profil.length - 1; i++) {
    s += mantel(18, 0, profil[i][1], profil[i][0], profil[i + 1][1], profil[i + 1][0], SENF.rechts, SENF.oben);
  }
  s += scheibe(18, 0, 2.4, 38, `fill="${MESSING.oben}" ${KF}`) +
    kreis(...P(18, 0, 39.5), 1.4, `fill="${MESSING.links}" ${KF}`);
  return s;
}

// ---------- Schaukelstuhl ----------
const SALBEI = { links: '#9fb79a', rechts: '#7d9577', oben: '#b8cdb0' };

function schaukelstuhl() {
  // Kufen: flach in der Mitte, nach oben gebogen an den Enden
  const kufe = (y) => {
    const pts = [];
    for (let k = 0; k <= 20; k++) {
      const x = -11 + (22 * k) / 20;
      pts.push([x, y, 0.5 + 0.014 * x * x]);
    }
    return zug3(pts, 'stroke="#6b4a3a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"') +
      zug3(pts, 'stroke="#b8743d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"') +
      zug3(pts, 'stroke="#e2b07c" stroke-width="0.6" stroke-linecap="round" opacity="0.8"');
  };
  // Schaukeln um den Bodenkontakt in der Mitte
  const posten = [[-7, -6.5], [7, -6.5], [-7, 6.5], [7, 6.5]]
    .map(([x, y]) => zug3([[x, y, 2], [x, y, 9]], 'stroke="#b8743d" stroke-width="2" stroke-linecap="round"')).join('');
  // Rueckenlehne: zwei Pfosten nach hinten geneigt, Teak-Latte und Salbeipolster
  const lehneHinten =
    zug3([[-6.5, -5.5, 10.2], [-6.5, -8.2, 24]], 'stroke="#6b4a3a" stroke-width="2.8" stroke-linecap="round"') +
    zug3([[-6.5, -5.5, 10.2], [-6.5, -8.2, 24]], 'stroke="#b8743d" stroke-width="1.8" stroke-linecap="round"') +
    zug3([[6.5, -5.5, 10.2], [6.5, -8.2, 24]], 'stroke="#6b4a3a" stroke-width="2.8" stroke-linecap="round"') +
    zug3([[6.5, -5.5, 10.2], [6.5, -8.2, 24]], 'stroke="#b8743d" stroke-width="1.8" stroke-linecap="round"') +
    quader(-7.5, 7.5, -8.6, -7.2, 17.5, 20.5, TEAK) +
    quader(-6.2, 6.2, -7.6, -6.2, 11.8, 17.5, SALBEI);
  // Sitz: Teak-Rahmen, Salbeipolster darauf
  const sitz = quader(-7.5, 7.5, -5.5, 5.5, 9, 10.2, TEAK) +
    quader(-6.8, 6.8, -4.8, 4.8, 10.2, 11.8, SALBEI);
  // Armlehnen auf beiden Seiten
  const arm = (x0, x1) => quader(x0, x1, -5.6, 5, 14.5, 15.6, TEAK) +
    quader(x0 + 0.4, x1 - 0.4, -5.2, -4.8, 10.2, 14.5, TEAK) + quader(x0 + 0.4, x1 - 0.4, 4.8, 5.2, 10.2, 14.5, TEAK);
  // Wolldecke vorne ueber dem Sitz, mit Streifen
  const decke = quader(-5.6, 5.6, 4.4, 6.4, 8.6, 11.2, CREME) +
    quader(-5.6, 5.6, 4.4, 6.4, 9.6, 10.2, { links: '#d9693b', rechts: '#b04e26', oben: '#ee8c5e' });

  const inhalt = posten + kufe(-6.5) + kufe(6.5) + lehneHinten + arm(-8.2, -6.6) + sitz + decke + arm(6.6, 8.2);
  return kontakt(11) + `<g><animateTransform attributeName="transform" type="rotate" values="-2;2;-2" dur="5s" repeatCount="indefinite"/>${inhalt}</g>`;
}

// ---------- Plattenspieler-Moebel ----------
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
  // Kleine Pflanze links in Terrakotta, Blaetter wiegen dezent
  const [px, py] = P(-9, 3, 14.5);
  const topf = mantel(-9, 3, 2.4, 11, 1.8, 14.5, '#b8643f', '#eba47f') + scheibe(-9, 3, 1.8, 14.5, 'fill="#5a3a22"');
  const blaetter = [[-30, 5, 2.6, -6, 0], [25, 6, 2.6, 6, 0], [-70, 4.2, 1.8, -10, -2], [60, 4, 1.8, 9, -2]]
    .map(([winkel, rx, ry, dx, dy], i) => {
      const cx = px + dx * 0.5, cy = py - 1.5 + dy * 0.5;
      const farbe = ['#7fb069', '#5e9a52', '#9ccc7a', '#477d43'][i];
      return `<g><animateTransform attributeName="transform" type="rotate" values="${winkel - 3} ${f(cx)} ${f(cy)};${winkel + 3} ${f(cx)} ${f(cy)};${winkel - 3} ${f(cx)} ${f(cy)}" dur="4.5s" repeatCount="indefinite"/>` +
        oval(cx, cy, rx * 1.3, ry * 0.8, `fill="${farbe}" ${KF}`) + linie([cx - rx * 1.3 * 0.8, cy], [cx + rx * 1.3 * 0.8, cy], 'stroke="#3a6b3a" stroke-width="0.5"') + `</g>`;
    }).join('');

  return kontakt(14) + beine + korpus + teller + arm + stapel + topf + blaetter;
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

// Blatt in einer ebenen Flaeche: Ursprung o, Achsen U und V (3D), Umriss (u, v) in Einheiten
function blatt3d(o, U, V, umriss) {
  return umriss.map(([u, v]) => [o[0] + u * U[0] + v * V[0], o[1] + u * U[1] + v * V[1], o[2] + u * U[2] + v * V[2]]);
}

function skulptur() {
  const metall = eindeutig('skulptur-metall');
  const rnd = zufall(12);
  // Sockel aus Terrazzo: Zylinder mit bunten Einschluessen
  let s = kontakt(9) + mantel(0, 0, 8, 0, 8, 4, '#c9c3b8', '#f2efe9') +
    scheibe(0, 0, 8, 4, `fill="#f2efe9" ${KB}`);
  const farben = ['#d9825b', '#2f6f73', '#d9a441', '#9fb79a', '#6b4a3a', '#e8e0d2'];
  for (let i = 0; i < 34; i++) {
    const a = rnd() * 2 * Math.PI, r = 7.2 * Math.sqrt(rnd());
    const [px, py] = P(r * Math.cos(a), r * Math.sin(a), 4);
    s += kreis(px, py, 0.5 + rnd() * 0.5, `fill="${farben[i % farben.length]}" opacity="0.85"`);
  }
  // Metallverlauf: hell oben links, dunkel unten rechts
  s += `<defs><linearGradient id="${metall}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#fbeeb8"/><stop offset="0.45" stop-color="#c9a14a"/>` +
    `<stop offset="1" stop-color="#6e4f1c"/></linearGradient></defs>`;
  // Drei geschwungene Blaetter aus Messing, hintere zuerst
  const umriss = [[0, 0], [3, 2], [4.6, 6], [2.4, 11], [0, 13.5], [-2.2, 10.5], [-4.4, 5.5], [-2.4, 1.2]];
  const blaetter = [
    { o: [0, 0, 4], U: [0.7, 0.7, 0], V: [0, 0, 1], k: 1 },
    { o: [-2, 2, 4], U: [0.7, -0.7, 0], V: [0.25, 0.25, 1], k: 0.9 },
    { o: [2, -2, 6], U: [0, 1, 0], V: [0.3, 0, 1], k: 0.8 },
  ];
  for (const b of blaetter) {
    const pts = blatt3d(b.o, b.U.map((c) => c * b.k), b.V.map((c) => c * b.k), umriss).map(([x, y, z]) => P(x, y, z));
    s += `<path d="${glattZu(pts)}" fill="url(#${metall})" ${KON}/>`;
    const innen = blatt3d(b.o, b.U.map((c) => c * b.k * 0.55), b.V.map((c) => c * b.k * 0.8), [[0.4, 1], [1.8, 6], [0.6, 10.5]])
      .map(([x, y, z]) => P(x, y, z));
    s += zug(innen, 'stroke="#fff6d6" stroke-width="0.9" stroke-linecap="round" opacity="0.7"');
  }
  // Ring als Schwung: schmaler Messingbogen in der Waagerechten
  const ring = [];
  for (let k = 0; k <= 40; k++) {
    const a = (k / 40) * 1.6 * Math.PI;
    ring.push([4.5 * Math.cos(a), 4.5 * Math.sin(a), 15 + 1.6 * Math.sin(a * 1.5)]);
  }
  s += zug3(ring, 'stroke="#6b4a3a" stroke-width="2.4" stroke-linecap="round"') +
    zug3(ring, `stroke="url(#${metall})" stroke-width="1.6" stroke-linecap="round"`);
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
};
