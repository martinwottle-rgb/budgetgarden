// Gemuetliche Zusatz-Deko fuer die Vorschau "Dein Gewaechshaus nach einem Jahr". Gleiche Schnittstelle wie DEKO (deko.js):
// zeichne() liefert SVG mit Ursprung (0,0) = Mitte des Bodenkontakts, ohne Positionierung. In der Szene mit scale(1.6).
// Lokale Isometrie wie in deko.js: x nach rechts unten, y nach links unten, z nach oben (px). Licht von links oben.
// Ein Feld entspricht ca. 33 Einheiten je Achse. Alles deterministisch (kein Math.random).

import { f, oval, p2, pfad, poly, zufall } from './hilfen.js';

let zaehler = 0;
// Eindeutige Ids fuer Verlaeufe, damit mehrere SVGs auf einer Seite nicht kollidieren
const eindeutig = (name) => `${name}-x${++zaehler}`;

const KON = 'stroke="#6b4a3a" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"';
const KONF = 'stroke="#6b4a3a" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const SCHATTEN = 'fill="#6b4a3a" opacity="0.18"';
const HOLZ = { links: '#c98f5a', rechts: '#a86b43', oben: '#e2b07c' };
const HOLZ_DUNKEL = { links: '#a86b43', rechts: '#8f5a35', oben: '#c98f5a' };
const KX = 0.9, KY = 0.45;

// Lokale Projektion: (x, y, z) zu SVG-Punkt
const P = (x, y, z = 0) => [(x - y) * KX, (x + y) * KY - z];
// Flaeche aus 3D-Punkten
const pk = (pts, attr) => poly(pts.map(([x, y, z = 0]) => P(x, y, z)), attr);
// Offener Linienzug aus 2D-Punkten (SVG-Koordinaten)
const zug = (pts, attr) => pfad('M' + pts.map(p2).join('L'), `fill="none" ${attr}`);
// Strecke zwischen zwei 3D-Punkten
const strecke = (a, b, attr) => zug([P(...a), P(...b)], attr);
// Ellipse in der waagerechten Ebene z (Radius r), als Polygon
const scheibeAuf = (z, r, attr) => {
  const pts = [];
  for (let k = 0; k < 28; k++) {
    const phi = (k / 28) * 2 * Math.PI;
    pts.push(P(r * Math.cos(phi), r * Math.sin(phi), z));
  }
  return poly(pts, attr);
};
// Quader mit sichtbaren Flaechen links (+y), rechts (+x) und oben
function quader(x0, x1, y0, y1, z0, z1, farben, kon = KON) {
  return pk([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], `fill="${farben.links}" ${kon}`) +
    pk([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], `fill="${farben.rechts}" ${kon}`) +
    pk([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], `fill="${farben.oben}" ${kon}`);
}

// Sammelt Verlaeufe und Glanzfarben eines Objekts; ende() setzt die <defs> davor
function malen() {
  const defs = [];
  const verlauf = (stops) => {
    const id = eindeutig('vl');
    defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">` +
      stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') + '</linearGradient>');
    return `url(#${id})`;
  };
  const licht = () => {
    const id = eindeutig('licht');
    defs.push(`<radialGradient id="${id}"><stop offset="0" stop-color="#ffe9a8" stop-opacity="0.95"/>` +
      `<stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>`);
    return `url(#${id})`;
  };
  const ende = (inhalt) => (defs.length ? `<defs>${defs.join('')}</defs>` : '') + inhalt;
  return { verlauf, licht, ende };
}

// Koerper um die Hochachse mit Radius r(z) zwischen z0 und z1. Umriss mit vorderem Ober- und Unterrand.
function koerper(rFn, z0, z1, fill, n = 14) {
  const rx = (r) => 0.9 * Math.SQRT2 * r, ry = (r) => 0.45 * Math.SQRT2 * r;
  const zs = [];
  for (let i = 0; i <= n; i++) zs.push(z0 + ((z1 - z0) * i) / n);
  const pts = zs.map((z) => [-rx(rFn(z)), -z]);
  const rT = rFn(z1), rB = rFn(z0);
  for (let k = 0; k <= 12; k++) {
    const t = Math.PI * (1 - k / 12);
    pts.push([rx(rT) * Math.cos(t), -z1 + ry(rT) * Math.sin(t)]);
  }
  for (let i = n; i >= 0; i--) pts.push([rx(rFn(zs[i])), -zs[i]]);
  for (let k = 0; k <= 12; k++) {
    const t = (Math.PI * k) / 12;
    pts.push([rx(rB) * Math.cos(t), -z0 + ry(rB) * Math.sin(t)]);
  }
  return poly(pts, `fill="${fill}" ${KON}`);
}

// Ringe (Flechtbaender) auf einem Koerper: nur die sichtbare Vorderseite
function ringe(rFn, zs, attr) {
  let s = '';
  for (const z of zs) {
    const r = rFn(z), pts = [];
    for (let k = 0; k <= 24; k++) {
      const phi = -Math.PI / 4 + (k / 24) * Math.PI;
      pts.push(P(r * Math.cos(phi), r * Math.sin(phi), z));
    }
    s += zug(pts, attr);
  }
  return s;
}

// Schraegstrang (Flechtmuster): Schraubenlinie auf dem Koerper, nur sichtbare Abschnitte
function geflecht(rFn, z0, z1, n, steigung, attr) {
  let s = '';
  for (let k = 0; k < n; k++) {
    const laeufe = [];
    let lauf = [];
    for (let i = 0; i <= 48; i++) {
      const z = z0 + ((z1 - z0) * i) / 48;
      const phi = ((2 * Math.PI * k) / n) + (z - z0) * steigung;
      const r = rFn(z);
      if (Math.cos(phi - Math.PI / 4) > 0.02) {
        lauf.push(P(r * Math.cos(phi), r * Math.sin(phi), z));
      } else {
        if (lauf.length > 1) laeufe.push(lauf);
        lauf = [];
      }
    }
    if (lauf.length > 1) laeufe.push(lauf);
    for (const l of laeufe) s += zug(l, attr);
  }
  return s;
}

// Blatt: Ellipse mit Mittelader, um (x, y) auf der Ebene z gedreht
function blatt(x, y, z, rx, ry, winkel, farbe) {
  const [X, Y] = P(x, y, z);
  const w = f(winkel);
  return oval(X, Y, rx, ry, `transform="rotate(${w} ${f(X)} ${f(Y)})" fill="${farbe}" ${KONF}`) +
    linieAuf(X, Y, rx * 0.75, w, '#2f5a30');
}
// Mittelader eines Blatts (kurze Linie in Blattrichtung)
function linieAuf(X, Y, laenge, winkel, farbe) {
  const a = (winkel * Math.PI) / 180;
  const x2 = X + Math.cos(a) * laenge, y2 = Y + Math.sin(a) * laenge;
  return `<line x1="${f(X - Math.cos(a) * laenge)}" y1="${f(Y - Math.sin(a) * laenge)}" x2="${f(x2)}" y2="${f(y2)}" ` +
    `stroke="${farbe}" stroke-width="0.5" opacity="0.8"/>`;
}

// ---------- Rattan-Haengesessel ----------

// Eiform: unten rund, oben eingezogen (Oeffnung bei z 42)
const eiR = (z) => (z <= 36 ? 12.5 * Math.sqrt(Math.max(0, 1 - ((z - 26) / 20) ** 2)) : 10.8 - (z - 36) * 0.2);
// Kissen im Ei (sitzt in der Oeffnung, ragt etwas heraus)
const sitzR = (z) => 9.6 * Math.sqrt(Math.max(0, 1 - ((z - 38) / 7.6) ** 2));

function haengesessel() {
  const m = malen();
  const rattan = m.verlauf([[0, '#f3cf9e'], [0.42, '#e0a66c'], [1, '#a86b43']]);
  const kissen = m.verlauf([[0, '#fde0dc'], [0.45, '#f2b8b5'], [1, '#c77f79']]);
  let s = oval(0, 0, 22, 10.5, SCHATTEN);
  // Staender: Holzbogen mit zwei Fuessen, in der Ebene y = -3 hinter dem Sessel
  const bogen = [];
  for (let k = 0; k <= 36; k++) {
    const th = (Math.PI * k) / 36;
    bogen.push(P(-20 * Math.cos(th), -3, 78 * Math.sin(th)));
  }
  s += quader(-23, -17, -6, 0, 0, 2.2, HOLZ_DUNKEL) + quader(17, 23, -6, 0, 0, 2.2, HOLZ_DUNKEL);
  s += zug(bogen, 'stroke="#6b4a3a" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"');
  s += zug(bogen, 'stroke="#c98f5a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"');
  s += zug(bogen.slice(4, 30), 'stroke="#f2d3a4" stroke-width="0.7" stroke-linecap="round" opacity="0.8"');
  // Kette: fuenf Glieder vom Hakens am Bogen bis zur Oeffnung des Eis
  for (let i = 0; i < 5; i++) {
    const [X, Y] = P(0, -3, 74 - i * 6);
    s += `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="1.5" ry="2.6" fill="none" stroke="#7f8c94" stroke-width="0.8"/>`;
  }
  s += kreisAuf(P(0, -3, 77), 1.6, '#e4eaee', '#7f8c94');
  // Koerper: Rattan mit Verlauf (Licht links, Schatten rechts), Flechtmuster
  s += koerper(eiR, 6, 42, rattan);
  s += ringe(eiR, [12, 17, 22, 27, 32, 37], 'stroke="#8f5a35" stroke-width="0.7" opacity="0.75" stroke-linecap="round"');
  s += geflecht(eiR, 8, 40, 9, 0.3, 'stroke="#8f5a35" stroke-width="0.6" opacity="0.8" stroke-linecap="round"');
  s += geflecht(eiR, 8, 40, 9, -0.3, 'stroke="#f2d3a4" stroke-width="0.5" opacity="0.55" stroke-linecap="round"');
  // Oeffnung oben: dunkles Inneres mit hellem Rand
  s += scheibeAuf(42, 9.6, `fill="#7a4a2e" ${KONF}`);
  s += scheibeAuf(42, 9.6, 'fill="none" stroke="#f2d3a4" stroke-width="0.8" opacity="0.7"');
  // Sitzkissen (rosa, dick), ragt aus der Oeffnung
  s += koerper(sitzR, 30.5, 46.5, kissen, 16);
  s += pfad(`M${p2(P(-7, 6, 37))} Q${p2(P(0, 9.5, 31))} ${p2(P(7, 6, 37))}`, 'fill="none" stroke="#c77f79" stroke-width="0.8" opacity="0.7"');
  s += kreisAuf(P(-1, 0, 46.5), 0.9, '#c77f79', '#c77f79');
  // Zierkissen (mint) oben auf dem Sitzkissen
  s += oval(...P(-3, 3, 45), 6.4, 4.2, `fill="#b9d3a8" ${KON}`);
  s += oval(...P(-4.5, 1.5, 46.2), 2.6, 1.2, 'fill="#ffffff" opacity="0.55"');
  s += oval(...P(-3, 3, 45), 1.6, 1.1, 'fill="#86aa6e"');
  // Strickdecke: haengt ueber den vorderen rechten Rand, mit Maschenreihen
  const decke = [];
  const dA = -0.15, dB = 0.95;
  for (let k = 0; k <= 12; k++) {
    const phi = dA + ((dB - dA) * k) / 12;
    const r = eiR(40) + 1.6;
    decke.push(P(r * Math.cos(phi), r * Math.sin(phi), 40));
  }
  for (let k = 12; k >= 0; k--) {
    const phi = dA + ((dB - dA) * k) / 12;
    const z = 22 + 3 * Math.sin(phi * 9) + (k % 2) * 1.2;
    const r = eiR(z) + 1.6;
    decke.push(P(r * Math.cos(phi), r * Math.sin(phi), z));
  }
  s += poly(decke, `fill="#cfe8d6" ${KON}`);
  for (const z of [34, 29, 24]) {
    const reihe = [];
    for (let k = 0; k <= 12; k++) {
      const phi = dA + ((dB - dA) * k) / 12;
      const r = eiR(z) + 1.6;
      reihe.push(P(r * Math.cos(phi), r * Math.sin(phi), z));
    }
    s += zug(reihe, 'stroke="#9fc4ab" stroke-width="0.8" stroke-dasharray="2 1.4"');
  }
  return m.ende(s);
}

// Kreis in SVG-Koordinaten (Hilfsfunktion fuer Haken und Knoepfe)
function kreisAuf(p, r, fill, kante) {
  return `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(r)}" fill="${fill}" stroke="${kante}" stroke-width="0.7"/>`;
}

// ---------- Leseplatz ----------

function leseecke() {
  const m = malen();
  const holz = m.verlauf([[0, '#eac08c'], [0.45, '#d9a16a'], [1, '#a86b43']]);
  const blau = m.verlauf([[0, '#d4ebf7'], [0.5, '#a7cfe8'], [1, '#6fa7cc']]);
  const creme = m.verlauf([[0, '#ffffff'], [0.5, '#fbf1e4'], [1, '#d9c7aa']]);
  const rose = m.verlauf([[0, '#fde3e6'], [0.5, '#f4c2c2'], [1, '#d99a97']]);
  let s = oval(2, 1, 22, 10.5, SCHATTEN);
  // Standfuss und Saeule
  s += koerper(() => 7.5, 0, 2.2, holz);
  s += koerper(() => 2.4, 2, 35, holz, 6);
  // Tischplatte: Scheibe mit hellerer Oberseite und Maserung
  s += koerper(() => 13, 35, 38.5, holz);
  s += scheibeAuf(38.5, 13, `fill="#e8b98a" ${KONF}`);
  s += zug([P(-10, -4, 38.6), P(10, -4, 38.6)], 'stroke="#c98f5a" stroke-width="0.6" opacity="0.7"');
  s += zug([P(-8, 5, 38.6), P(8, 5, 38.6)], 'stroke="#c98f5a" stroke-width="0.6" opacity="0.7"');
  // Tasse links hinten
  s += tasse(-6, 5, 38.5, rose, '#c77f79', 0.98);
  // Teekanne (Pastellblau) mit Deckel, Tuelle und Henkel
  const kx = 2.5, ky = -3, kz = 38.5;
  const kannenR = (z) => 4.6 * Math.sqrt(Math.max(0, 1 - ((z - (kz + 6)) / 6.5) ** 2));
  s += zug([P(kx - 6, ky, kz + 4), P(kx - 6.5, ky, kz + 8), P(kx - 6, ky, kz + 12)], 'stroke="#4f8fb8" stroke-width="2.2" stroke-linecap="round" opacity="0.9"');
  s += zug([P(kx - 6, ky, kz + 4), P(kx - 6.5, ky, kz + 8), P(kx - 6, ky, kz + 12)], 'stroke="#a7cfe8" stroke-width="1" stroke-linecap="round"');
  s += zug([P(kx + 3, ky, kz + 4), P(kx + 8, ky, kz + 8)], 'stroke="#6b4a3a" stroke-width="3.2" stroke-linecap="round"');
  s += zug([P(kx + 3, ky, kz + 4), P(kx + 8, ky, kz + 8)], `stroke="#7fb3d8" stroke-width="1.8" stroke-linecap="round"`);
  s += koerper(kannenR, kz, kz + 12.5, blau, 14);
  s += pfad(`M${p2(P(kx - 4.2, ky - 0.2, kz + 5))} Q${p2(P(kx - 9.5, ky, kz + 6))} ${p2(P(kx - 4.2, ky + 0.2, kz + 9.5))}`,
    'fill="none" stroke="#6b4a3a" stroke-width="2.6" stroke-linecap="round"');
  s += pfad(`M${p2(P(kx - 4.2, ky - 0.2, kz + 5))} Q${p2(P(kx - 9.5, ky, kz + 6))} ${p2(P(kx - 4.2, ky + 0.2, kz + 9.5))}`,
    'fill="none" stroke="#a7cfe8" stroke-width="1" stroke-linecap="round"');
  s += scheibeAuf(kz + 12.5, 3, `fill="#8fbad8" ${KONF}`);
  s += kreisAuf(P(kx, ky, kz + 14.5), 1.3, '#a7cfe8', '#4f8fb8');
  // Dampf: zwei geschwungene, halbtransparente Linien ueber der Tuelle
  const dampf = (dx, phase) => {
    const pts = [];
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
      pts.push(P(kx + 9 + dx + 1.4 * Math.sin(t * 5 + phase), ky, kz + 13 + t * 17));
    }
    return zug(pts, 'stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity="0.55"');
  };
  s += dampf(0, 0) + dampf(3.6, 1.6);
  // Tasse rechts vorn (cremefarben) mit dunklem Tee
  s += tasse(7, -4, 38.5, creme, '#d9c7aa', 1.0);
  // Stapel aus vier Buechern am Boden, rechts neben dem Tisch (vorn)
  s += buecherStapel(14, 3);
  return m.ende(s);
}

// Tasse: Zylinder mit Tee-Oberflaeche und Henkel auf der +x-Seite
function tasse(x, y, z, fill, dunkel, skal) {
  const r = 2.9 * skal, h = 5.2;
  let s = `<path d="M${p2(P(x + r, y, z + 3.5))} Q${p2(P(x + r + 3.4, y, z + 2.2))} ${p2(P(x + r + 0.6, y, z + 0.6))}" ` +
    `fill="none" stroke="#6b4a3a" stroke-width="1.8" stroke-linecap="round"/>`;
  s += koerper(() => r, z, z + h, fill, 6);
  s += scheibeAuf(z + h, r, `fill="#8a5a3a" ${KONF}`);
  s += scheibeAuf(z + h - 0.2, r * 0.7, 'fill="#c98f5a" opacity="0.8"');
  return s;
}

// Buecherstapel: vier Buecher in Pastellfarben, leicht versetzt
function buecherStapel(x, y) {
  const farben = ['#f4b6c2', '#bfe3d0', '#b9d3f0', '#ffe3a3'];
  const masse = [[9, 6.5, 2.4, 0], [8, 6, 2.2, 0.8], [9.5, 6.8, 2.2, -0.6], [8.5, 6, 2.4, 0.4]];
  let s = oval(x + 0.5, y + 0.5, 10, 6, SCHATTEN);
  let z = 0;
  masse.forEach(([b, t, h, dx], i) => {
    const c = farben[i];
    const x0 = x + dx, y0 = y + (i % 2 ? 0.4 : -0.3);
    s += quader(x0, x0 + b, y0, y0 + t, z, z + h, { links: c, rechts: shade(c), oben: '#fff8ee' }, KONF);
    // Seitenkante mit Buchseiten (cremefarben)
    s += pk([[x0 + 0.6, y0 + t + 0.02, z + 0.5], [x0 + b - 0.6, y0 + t + 0.02, z + 0.5],
      [x0 + b - 0.6, y0 + t + 0.02, z + h - 0.5], [x0 + 0.6, y0 + t + 0.02, z + h - 0.5]], 'fill="#fff6e6" opacity="0.85"');
    z += h;
  });
  return s;
}

// Dunklere Seitenfarbe zu einem Hex-Ton (rund 18 Prozent dunkler)
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const k = 0.82;
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// ---------- Schaukelstuhl ----------

function schaukelstuhl() {
  const m = malen();
  let s = oval(0, 0, 24, 11, SCHATTEN);
  // Kufen: gebogene Laeufer in der Ebene x = +-9, vorn und hinten nach oben gebogen
  const kufenZ = (y) => 1 + 5 * (y / 13) ** 2;
  for (const x of [-9, 9]) {
    const pts = [];
    for (let k = 0; k <= 26; k++) {
      const y = -13 + (26 * k) / 26;
      pts.push(P(x, y, kufenZ(y)));
    }
    s += zug(pts, 'stroke="#6b4a3a" stroke-width="4" stroke-linecap="round"');
    s += zug(pts, 'stroke="#c98f5a" stroke-width="2.2" stroke-linecap="round"');
    s += zug(pts.slice(3, 22), 'stroke="#f2d3a4" stroke-width="0.6" stroke-linecap="round" opacity="0.8"');
  }
  // Beine: vier Pfosten, auf den Kufen stehend
  for (const x of [-8, 8]) {
    for (const y of [-8, 8]) {
      s += quader(x - 1.2, x + 1.2, y - 1.2, y + 1.2, kufenZ(y), 22, HOLZ, KON);
    }
  }
  // Sitz mit Latten und Sitzkissen (salbeigruen)
  s += quader(-10, 10, -9, 9, 22, 24.5, HOLZ);
  for (const y of [-4, 0, 4]) s += strecke([-10, y, 24.5], [10, y, 24.5], 'stroke="#c98f5a" stroke-width="0.5" opacity="0.7"');
  s += quader(-8.5, 8.5, -7.5, 7.5, 24.5, 28, { links: '#b9d3a8', rechts: '#98b889', oben: '#d2e7c4' }, KONF);
  s += strecke([-8.5, 0, 28], [8.5, 0, 28], 'stroke="#86aa6e" stroke-width="0.5" opacity="0.6"');
  // Rueckenlehne: zwei Stuetzen, Querlatten, Stege
  const stuetze = (x) => [P(x, -9, 24), P(x, -11.5, 58)];
  for (const x of [-8, 8]) {
    const [a, b] = stuetze(x);
    s += zug([a, b], 'stroke="#6b4a3a" stroke-width="4.2" stroke-linecap="round"');
    s += zug([a, b], 'stroke="#c98f5a" stroke-width="2.4" stroke-linecap="round"');
  }
  s += zug([P(-8, -11.5, 56), P(8, -11.5, 56)], 'stroke="#6b4a3a" stroke-width="5" stroke-linecap="round"');
  s += zug([P(-8, -11.5, 56), P(8, -11.5, 56)], 'stroke="#c98f5a" stroke-width="3" stroke-linecap="round"');
  s += zug([P(-8, -11, 44), P(8, -11, 44)], 'stroke="#6b4a3a" stroke-width="3" stroke-linecap="round"');
  s += zug([P(-8, -11, 44), P(8, -11, 44)], 'stroke="#c98f5a" stroke-width="1.6" stroke-linecap="round"');
  // Armlehnen (rechts und links), gestuetzt von vorderen Pfosten
  for (const x of [-10.2, 10.2]) {
    s += quader(x - 1.1, x + 1.1, -9, 8, 33, 34.5, HOLZ);
    s += quader(x - 1.1, x + 1.1, 6.6, 8, 24.5, 33, HOLZ_DUNKEL);
  }
  // Wolldecke: gefaltet auf dem Sitz (links), haengt ueber die linke Armlehne
  s += quader(-9.4, -1.5, -7.2, 7.2, 28, 30.4, { links: '#f7eedf', rechts: '#e2d4bb', oben: '#fdf8ef' }, KONF);
  for (const y of [-5, -1.5, 2, 5.5]) {
    s += strecke([-9.4, y, 30.45], [-1.5, y, 30.45], 'stroke="#e8a9a4" stroke-width="0.9" opacity="0.8"');
  }
  s += strecke([-4.5, -7.2, 30.45], [-4.5, 7.2, 30.45], 'stroke="#b9d3a8" stroke-width="1.1" opacity="0.8"');
  s += pk([[-10.1, -7.5, 33.5], [-9.4, -7.5, 33.5], [-9.4, -7.5, 24], [-10.4, -7.5, 24]], 'fill="#f7eedf" stroke="#6b4a3a" stroke-width="0.6"');
  return m.ende(s);
}

// ---------- Kräuterbeet ----------

function kraeuterbeet() {
  const m = malen();
  const rnd = zufall(9031);
  let s = oval(0, 0, 36, 15, SCHATTEN);
  // Beet: Holzkasten (Breite 50 entlang x, Tiefe 20 entlang y, Hoehe 11)
  s += quader(-25, 25, -10, 10, 0, 11, HOLZ);
  for (const z of [3.5, 7.2]) s += strecke([-25, 10.03, z], [25, 10.03, z], 'stroke="#a86b43" stroke-width="0.7"');
  for (const x of [-16, -8, 0, 8, 16]) s += strecke([x, 10.03, 0.2], [x, 10.03, 10.8], 'stroke="#a86b43" stroke-width="0.5" opacity="0.7"');
  // Erde
  s += pk([[-23.5, -8.5, 11], [23.5, -8.5, 11], [23.5, 8.5, 11], [-23.5, 8.5, 11]], 'fill="#8a6a4a" stroke="#6b4a3a" stroke-width="0.7"');
  const erdeZ = 11.1;
  // Kraeuter als Gruppen, nach Tiefe (y) sortiert
  const teile = [];
  // Schnittlauch: Roehren mit lila Kugelbluete (links)
  for (let k = 0; k < 9; k++) {
    const x = -21 + (k % 5) * 2.2 + rnd() * 0.8;
    const y = -6 + Math.floor(k / 5) * 9 + rnd() * 1.2;
    const hoehe = 16 + rnd() * 8;
    let svg = strecke([x, y, erdeZ], [x + (rnd() - 0.5), y, erdeZ + hoehe], 'stroke="#6b4a3a" stroke-width="2.4" stroke-linecap="round"') +
      strecke([x, y, erdeZ], [x + (rnd() - 0.5), y, erdeZ + hoehe], 'stroke="#8fbf6f" stroke-width="1.3" stroke-linecap="round"');
    const top = P(x, y, erdeZ + hoehe);
    svg += `<circle cx="${f(top[0])}" cy="${f(top[1])}" r="3.3" fill="#b983d9" stroke="#6b4a3a" stroke-width="0.7"/>`;
    svg += `<circle cx="${f(top[0] - 1)}" cy="${f(top[1] - 1.1)}" r="1.1" fill="#e6cdf2" opacity="0.8"/>`;
    teile.push({ y, svg });
  }
  // Basilikum: buschige Blattbueschel (Mitte links)
  for (let k = 0; k < 12; k++) {
    const x = -10 + rnd() * 7, y = -6 + rnd() * 11;
    const z = erdeZ + 6 + rnd() * 6;
    const farbe = k % 2 ? '#7fb069' : '#5e9a52';
    teile.push({ y, svg: blatt(x, y, z, 4.2, 3.2, rnd() * 180, farbe) });
  }
  // Rosmarin: holzige Zweige mit feinen Nadeln (Mitte rechts)
  for (let k = 0; k < 4; k++) {
    const x = 3 + k * 2.4, y = -4 + (k % 2) * 6;
    const hoehe = 14 + rnd() * 5;
    let svg = strecke([x, y, erdeZ], [x + 1.5, y + 0.8, erdeZ + hoehe], 'stroke="#8f5a35" stroke-width="1.8" stroke-linecap="round"');
    for (let j = 0; j < 9; j++) {
      const z = erdeZ + 3 + j * (hoehe / 9);
      const seite = j % 2 ? 1 : -1;
      const a = P(x + 0.3 * seite, y, z), b = P(x + 2.6 * seite, y + 0.3, z + 2.5);
      svg += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="#477d43" stroke-width="1.1" stroke-linecap="round"/>`;
    }
    teile.push({ y, svg });
  }
  // Petersilie: flache, gekrauste Blattbueschel (rechts vorn)
  for (let k = 0; k < 14; k++) {
    const x = 9 + rnd() * 9, y = 1 + rnd() * 8;
    const z = erdeZ + 3 + rnd() * 4;
    const farbe = k % 2 ? '#9ccc7a' : '#7fb069';
    teile.push({ y, svg: blatt(x, y, z, 3.4, 2.4, rnd() * 180, farbe) });
  }
  teile.sort((a, b) => a.y - b.y);
  s += teile.map((t) => t.svg).join('');
  // Kleine Holzschilder vorn am Beet (Stiel und Brettchen)
  for (const x of [-16, 13]) {
    s += strecke([x, 6, erdeZ], [x, 6, erdeZ + 9], 'stroke="#a86b43" stroke-width="1.1" stroke-linecap="round"');
    s += quader(x - 3.4, x + 3.4, 5.6, 6.4, erdeZ + 7.5, erdeZ + 13.5,
      { links: '#f6e2c4', rechts: '#d9b98a', oben: '#fff4e0' }, 'stroke="#6b4a3a" stroke-width="0.7" stroke-linejoin="round"');
    s += strecke([x - 2.2, 6.45, erdeZ + 10], [x + 2.2, 6.45, erdeZ + 10], 'stroke="#8a6a4a" stroke-width="0.5"');
    s += strecke([x - 1.6, 6.45, erdeZ + 11.8], [x + 1.6, 6.45, erdeZ + 11.8], 'stroke="#8a6a4a" stroke-width="0.5"');
  }
  return m.ende(s);
}

// ---------- Lichterbogen ----------

function lichterlaube() {
  const m = malen();
  const licht = m.licht();
  const rnd = zufall(4411);
  let s = oval(0, 0, 22, 10, SCHATTEN);
  // Bogen: zwei Pfosten und ein Halbkreis (Radius 14, Scheitel bei z 70)
  const bogenPunkt = (th, r = 14, dy = 0) => P(r * Math.cos(th), dy, 56 + r * Math.sin(th));
  const halbkreis = [];
  for (let k = 0; k <= 30; k++) halbkreis.push(bogenPunkt((Math.PI * k) / 30));
  s += quader(-16, -12, -2, 2, 0, 56, HOLZ);
  s += quader(12, 16, -2, 2, 0, 56, HOLZ);
  s += quader(-17, -11, -2.5, 2.5, 0, 2.5, HOLZ_DUNKEL) + quader(11, 17, -2.5, 2.5, 0, 2.5, HOLZ_DUNKEL);
  s += zug(halbkreis, 'stroke="#6b4a3a" stroke-width="5.6" stroke-linecap="round"');
  s += zug(halbkreis, 'stroke="#c98f5a" stroke-width="3.4" stroke-linecap="round"');
  s += zug(halbkreis.slice(2, 26), 'stroke="#f2d3a4" stroke-width="0.8" stroke-linecap="round" opacity="0.8"');
  // Kletterrose: Ranken auf dem Bogen (vorn) und an den Pfosten
  const ranke = [];
  for (let k = 0; k <= 30; k++) {
    const th = (Math.PI * k) / 30;
    const wellen = 1.3 * Math.sin(k * 0.9);
    ranke.push(bogenPunkt(th, 14 + wellen * 0.4, 3.4 + 0.6 * Math.sin(k * 0.6)));
  }
  s += zug(ranke, 'stroke="#5e9a52" stroke-width="1" stroke-linecap="round"');
  for (let k = 0; k < 16; k++) {
    const th = (Math.PI * (k + 0.5)) / 16;
    const [X, Y] = bogenPunkt(th, 14, 3.4 + 0.6 * Math.sin((k + 0.5) * 0.6));
    const sgn = k % 2 ? 1 : -1;
    s += oval(X + sgn * 3.5, Y - 1.5, 3.2, 2, `transform="rotate(${f(sgn * 35)} ${f(X + sgn * 3.5)} ${f(Y - 1.5)})" fill="${k % 3 ? '#7fb069' : '#5e9a52'}" ${KONF}`);
  }
  // Rosen: rosa Bluetenkoepfe mit Blaettern
  const rosen = [[0.35, 4.2], [0.9, 5.5], [1.6, 3.6], [2.2, 5.2], [2.7, 4.0]];
  for (const [th, r] of rosen) {
    const [X, Y] = bogenPunkt(th, 14, 4.6);
    s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r)}" fill="#f28b9b" ${KONF}/>`;
    s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r * 0.55)}" fill="#f7b6c2" ${KONF}/>`;
    s += `<circle cx="${f(X - r * 0.2)}" cy="${f(Y - r * 0.25)}" r="${f(r * 0.2)}" fill="#fde3e6" opacity="0.9"/>`;
  }
  // Kletterrose am linken Pfosten (Ranke, Blaetter, zwei Rosen)
  const pfostenRanke = [];
  for (let k = 0; k <= 16; k++) pfostenRanke.push(P(-13.5 + Math.sin(k * 0.7) * 1.3, 2.6, 4 + k * 3.2));
  s += zug(pfostenRanke, 'stroke="#5e9a52" stroke-width="1" stroke-linecap="round"');
  for (let k = 0; k < 9; k++) {
    const [X, Y] = P(-13.5 + (rnd() - 0.5) * 3, 2.6, 8 + k * 5.2);
    s += oval(X + (k % 2 ? 3 : -3), Y, 2.8, 1.8, `transform="rotate(${k % 2 ? 30 : -30} ${f(X)} ${f(Y)})" fill="${k % 2 ? '#7fb069' : '#5e9a52'}" ${KONF}`);
  }
  // Lichterkette: Draht mit Durchhang vor dem Bogen, warme Lampen (leuchtend)
  const draht = [];
  for (let k = 0; k <= 30; k++) {
    const th = (Math.PI * k) / 30;
    draht.push(bogenPunkt(th, 14, 6.2 - 0.6 * Math.sin(th)));
  }
  s += zug(draht, 'stroke="#6b4a3a" stroke-width="0.5"');
  for (let k = 1; k < 13; k++) {
    const th = (Math.PI * k) / 13;
    const [X, Y] = bogenPunkt(th, 14, 6.2 - 0.6 * Math.sin(th));
    s += `<circle cx="${f(X)}" cy="${f(Y)}" r="6" fill="${licht}" opacity="0.95"/>`;
    s += `<circle cx="${f(X)}" cy="${f(Y)}" r="1.8" fill="#ffd65a" stroke="#c9a46a" stroke-width="0.4"/>`;
  }
  return m.ende(s);
}

// ---------- Katzenkorb ----------

function katzenkorb() {
  const m = malen();
  const flecht = m.verlauf([[0, '#f3cf9e'], [0.45, '#dba06a'], [1, '#a86b43']]);
  const polster = m.verlauf([[0, '#e4f2d8'], [0.5, '#c4dfb2'], [1, '#98b889']]);
  let s = oval(0, 0, 19, 9, SCHATTEN);
  // Korb: nach oben etwas weiter, mit Flechtmuster
  const korbR = (z) => 10.5 + (z / 18) * 2.5;
  s += koerper(korbR, 0, 18, flecht);
  s += ringe(korbR, [4, 8, 12, 16], 'stroke="#8f5a35" stroke-width="0.7" opacity="0.8" stroke-linecap="round"');
  s += geflecht(korbR, 1, 17, 10, 0.35, 'stroke="#8f5a35" stroke-width="0.6" opacity="0.8" stroke-linecap="round"');
  s += geflecht(korbR, 1, 17, 10, -0.35, 'stroke="#f2d3a4" stroke-width="0.5" opacity="0.5" stroke-linecap="round"');
  // Randwulst oben und dunkles Inneres
  s += koerper(() => 13.3, 17, 19.2, '#c9955e', 3);
  s += scheibeAuf(19.2, 13, 'fill="#7a4a2e" stroke="#6b4a3a" stroke-width="0.6"');
  // Polster: flaches Kissen im Korb, ragt ueber den Rand
  s += koerper((z) => 11.6 * Math.sqrt(Math.max(0, 1 - ((z - 20.5) / 3.6) ** 2)), 16.9, 24.1, polster, 10);
  // Schlafende orange getigerte Katze auf dem Kissen (Ursprung auf der Kissenflaeche)
  s += `<g transform="translate(0,${f(-24.2)})">${katzeImKorb()}</g>`;
  return m.ende(s);
}

// Katze in 2D-Koordinaten (wie deko.js katze, Orange statt Weiss). Ursprung = Mitte der Kissenflaeche.
function katzeImKorb() {
  const rand = 'stroke="#6b4a3a" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"';
  const streifen = 'stroke="#c4691f" stroke-width="1.2" fill="none" stroke-linecap="round"';
  const schwanz = 'M9,-1.5 C15,-1 16,3 10,3.6 C2,4 -6,3.6 -11,1.6';
  return oval(0, 0.6, 15, 4.2, SCHATTEN) +
    // Schwanz um den Koerper gelegt (vorn)
    pfad(schwanz, 'fill="none" stroke="#6b4a3a" stroke-width="4.8" stroke-linecap="round"') +
    pfad(schwanz, 'fill="none" stroke="#f2a65a" stroke-width="2.6" stroke-linecap="round"') +
    pfad(schwanz, 'fill="none" stroke="#c4691f" stroke-width="0.7" stroke-dasharray="1.4 2.2" stroke-linecap="round"') +
    // Koerper als weiche Bohne, Schattenseite rechts unten
    pfad('M-12,-2 C-14,-10 -5,-14 3,-12.5 C11,-11 14,-6.5 13,-2 C12,1 6,1.2 0,0.6 C-6,0.2 -11,1 -12,-2Z', `fill="#f2a65a" ${rand}`) +
    pfad('M13,-2 C12,1 6,1.2 0,0.6 C4,-2 9,-4.2 13,-2Z', 'fill="#d9822b"') +
    // Streifen auf dem Ruecken
    pfad('M-6,-12 q1.6,2.2 1,4.2', streifen) + pfad('M-0.5,-13.2 q1.6,2.2 1.2,4.4', streifen) + pfad('M4.6,-11.8 q1.4,1.8 1,3.8', streifen) +
    // Kopf auf den Pfoten mit Ohren
    pfad('M-16.2,-9.4 L-15.4,-17 L-10.8,-12.2Z', `fill="#f7b264" ${rand}`) +
    pfad('M-11,-12.8 L-6.6,-18.4 L-4.2,-10.8Z', `fill="#f7b264" ${rand}`) +
    pfad('M-15,-10.6 L-14.6,-14.8 L-12.4,-12.2Z', 'fill="#f5b9b5"') +
    pfad('M-10,-12.8 L-6.8,-16.4 L-5.4,-11.6Z', 'fill="#f5b9b5"') +
    oval(-9.6, -6.6, 7.2, 5.4, `fill="#f7b264" ${rand}`) +
    pfad('M-14,-13 L-13.6,-9.6', 'stroke="#c4691f" stroke-width="0.9" stroke-linecap="round"') +
    pfad('M-9.4,-14 L-9.2,-10.6', 'stroke="#c4691f" stroke-width="0.9" stroke-linecap="round"') +
    // Geschlossene Augen, Nase, Wangen
    pfad('M-13,-7.4 Q-11.4,-5.4 -9.8,-7.4', 'fill="none" stroke="#6b4a3a" stroke-width="1.1" stroke-linecap="round"') +
    pfad('M-8.6,-7.4 Q-7,-5.4 -5.4,-7.4', 'fill="none" stroke="#6b4a3a" stroke-width="1.1" stroke-linecap="round"') +
    pfad('M-8.2,-5.3 L-6.4,-5.3 L-7.3,-4.2Z', 'fill="#f2a0a0" stroke="#6b4a3a" stroke-width="0.5" stroke-linejoin="round"') +
    oval(-12.8, -4.7, 1.3, 0.8, 'fill="#f5b9b5" opacity="0.7"') +
    oval(-4.6, -4.7, 1.3, 0.8, 'fill="#f5b9b5" opacity="0.7"') +
    // Pfoten unter dem Kopf (hell)
    oval(-12.4, -0.6, 3.4, 1.8, `fill="#fff6ea" ${rand}`) +
    oval(-6.4, -0.2, 3.4, 1.8, `fill="#fff6ea" ${rand}`);
}

export const EXTRAS = {
  haengesessel: { name: 'Rattan-Hängesessel', zeichne: () => haengesessel() },
  leseecke: { name: 'Leseplatz', zeichne: () => leseecke() },
  kraeuterbeet: { name: 'Kräuterbeet', zeichne: () => kraeuterbeet() },
  schaukelstuhl: { name: 'Schaukelstuhl', zeichne: () => schaukelstuhl() },
  lichterlaube: { name: 'Lichterbogen', zeichne: () => lichterlaube() },
  katzenkorb: { name: 'Katzenkorb', zeichne: () => katzenkorb() },
};
