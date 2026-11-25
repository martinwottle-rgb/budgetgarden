// Saisonale Grafiken (Herbst, Winter, Fruehling, Sommer) als SVG-Strings. Export SAISON.
// art 'pflanze': zeichne(stufe, welk, ebene) mit Topf, Ursprung (0,0) = Mitte der Topf-Unterkante (wie PFLANZEN).
// art 'deko': zeichne() mit Ursprung (0,0) = Mitte des Bodenkontakts (wie DEKO), lokale Isometrie wie deko.js.
// art 'saat': zeichne(stufe, welk) ohne Topf, Ursprung (0,0) = Erdoberflaeche (wie SAAT).
// Licht von links oben, Konturen #6b4a3a, Kontaktschatten unter jedem Objekt. Alles deterministisch.

import { f, p2, gruppe, pfad, linie, oval, kreis, poly, zufall } from './hilfen.js';
import { gewaehlterTopf } from './topfwahl.js';
import { WINTER } from './winter.js';
import { WINTER2 } from './winter2.js';

const RAD = Math.PI / 180;
const FAC = [0.5, 0.72, 0.9, 1]; // Groesse je Stufe 1 bis 4

// ---------- Konturen und Farben ----------
const KON_TOPF = 'stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';
const KON_DEKO = 'stroke="#6b4a3a" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"';
const KON_GRUEN = 'stroke="#2f5a30" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const KON_WELK = 'stroke="#7d6a45" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const kontur = (welk) => (welk ? KON_WELK : KON_GRUEN);
const ADER = 'stroke="#3a6b3a" stroke-width="0.5" stroke-linecap="round" opacity="0.6"';
const GRUEN = { hell: '#7fb069', dunkel: '#5e9a52' };
const GRUEN_TIEF = { hell: '#5e9a52', dunkel: '#3a6b3a' };
// Hintere Blaetter: etwas dunkler und leicht bläulich (Tiefe)
const TIEF = { hell: '#5a8f80', dunkel: '#3b6558' };
const WELK = { hell: '#c4c98f', dunkel: '#a8a36a' };
const HOLZ = { links: '#c98f5a', rechts: '#a86b43', oben: '#e2b07c' };
const HOLZ_D = { links: '#a86b43', rechts: '#8f5a35', oben: '#c98f5a' };

let zaehler = 0;
const uid = (name) => `${name}-s${++zaehler}`;

// Lokale Isometrie fuer Deko: x nach rechts unten, y nach links unten, z nach oben (wie deko.js)
const KX = 0.9, KY = 0.45;
const P = (x, y, z = 0) => [(x - y) * KX, (x + y) * KY - z];
const pk = (pts, attr) => poly(pts.map(([x, y, z = 0]) => P(x, y, z)), attr);
const zug = (pts, attr) => pfad('M' + pts.map(p2).join('L'), `fill="none" ${attr}`);

// ---------- Plastik-Helfer: Verlaeufe statt Volltoene (Licht von links oben) ----------
// Mischung zweier Hexfarben (t = 0 ist a, t = 1 ist b)
const mischen = (a, b, t) => {
  const teil = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = teil(a), B = teil(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
// Linearer Verlauf (objectBoundingBox). Stopps: [Offset, Farbe] oder [Offset, Farbe, Deckkraft]
const LIN = (id, stopps, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
  stopps.map(([o, c, d]) => `<stop offset="${o}" stop-color="${c}"${d === undefined ? '' : ` stop-opacity="${d}"`}/>`).join('') +
  '</linearGradient>';
// Radialer Verlauf, Mittelpunkt (cx, cy) und Radius als Anteil der Flaeche
const RAD_V = (id, stopps, cx = 0.35, cy = 0.3, r = 0.75) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${cx}" fy="${cy}">` +
  stopps.map(([o, c, d]) => `<stop offset="${o}" stop-color="${c}"${d === undefined ? '' : ` stop-opacity="${d}"`}/>`).join('') +
  '</radialGradient>';
// Weicher Kontaktschatten an beliebiger Stelle (radialer Verlauf statt harter Ellipse)
const kontaktAt = (x, y, rx, ry) => {
  const id = uid('kontakt');
  return `<defs>${RAD_V(id, [[0, '#6b4a3a', 0.32], [0.6, '#6b4a3a', 0.14], [1, '#6b4a3a', 0]], 0.5, 0.5, 0.5)}</defs>` +
    oval(x, y, rx, ry, `fill="url(#${id})"`);
};
// Kontaktschatten im Ursprung
const kontakt = (rx, ry) => kontaktAt(0, 0, rx, ry);
// Flaechen eines Quaders mit Verlauf: Oberseite hell, linke Seite mittel, rechte Seite dunkel.
// Liefert defs (vor den Quader setzen) und f (Fuellungen fuer quader()).
function plastik(fa) {
  const id = uid('pl');
  const defs = '<defs>' +
    LIN(`${id}-o`, [[0, mischen(fa.oben, '#ffffff', 0.25)], [1, fa.oben]], 0, 0, 1, 1) +
    LIN(`${id}-l`, [[0, mischen(fa.links, '#ffffff', 0.18)], [1, fa.links]], 0, 0, 0.3, 1) +
    LIN(`${id}-r`, [[0, fa.rechts], [1, mischen(fa.rechts, '#000000', 0.2)]], 0, 0, 1, 1) +
    '</defs>';
  return { defs, f: { oben: `url(#${id}-o)`, links: `url(#${id}-l)`, rechts: `url(#${id}-r)` } };
}

// Kontur-Attribut fuer Quader mit Verlauf
const quader = (x0, x1, y0, y1, z0, z1, fa, kon = KON_DEKO) =>
  pk([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], `fill="${fa.links}" ${kon}`) +
  pk([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], `fill="${fa.rechts}" ${kon}`) +
  pk([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], `fill="${fa.oben}" ${kon}`);

// Gedrehtes Teil: Ursprung an (x,y), Drehung in Grad
const an = (x, y, rot, inhalt) => gruppe(`transform="translate(${f(x)},${f(y)}) rotate(${f(rot)})"`, inhalt);
const zu = (pts) => 'M' + pts.map(p2).join('L') + 'Z';
const stufeN = (s) => Math.min(4, Math.max(1, Math.round(Number(s) || 1)));

// Quadratische Kurve von a nach b, bog = seitlicher Versatz der Mitte
const kurve = (a, b, bog = 0) => {
  const mx = (a[0] + b[0]) / 2 + bog, my = (a[1] + b[1]) / 2;
  return `M${f(a[0])},${f(a[1])}Q${f(mx)},${f(my)} ${f(b[0])},${f(b[1])}`;
};

// Stiel (grün oder welk) mit heller Lichtlinie
function stiel(d, welk, w = 2.6) {
  return pfad(d, `fill="none" stroke="${welk ? '#7d6a45' : '#2f5a30'}" stroke-width="${f(w + 0.8)}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${welk ? '#a8a36a' : '#5e9a52'}" stroke-width="${f(w)}" stroke-linecap="round"`);
}

// Holzast (Zweig, Stamm): Kern, Holzton und feiner heller Glanz
function holzAst(d, w) {
  return pfad(d, `fill="none" stroke="#6b4a3a" stroke-width="${f(w + 1)}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="#a86b43" stroke-width="${f(w)}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="#e2b07c" stroke-width="${f(w * 0.3)}" stroke-linecap="round" opacity="0.6"`);
}

// Blatt: Ansatz im Ursprung, Spitze bei -L (nach oben). W halbe Breite.
// Verlauf von links (Lichtseite, hell) nach rechts (Schatten, dunkel), Mittelader und Seitenadern.
// spitz: unter 1 = breit nahe Ansatz, ueber 1 = breit zur Spitze (Bluetenblatt, Rundblatt)
function blatt(L, W, hell, dunkel, kon, spitz = 0.8) {
  const id = uid('bl');
  const R = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    R.push([W * Math.pow(Math.sin(Math.PI * Math.pow(t, spitz)), 0.85), -L * t]);
  }
  const Lk = R.map(([x, y]) => [-x, y]);
  const umriss = zu(R.concat(Lk.slice().reverse()));
  let out = `<defs>${LIN(id, [[0, mischen(hell, '#ffffff', 0.12)], [0.45, mischen(hell, dunkel, 0.5)], [1, dunkel]], 0, 0, 1, 0)}</defs>` +
    pfad(umriss, `fill="url(#${id})"`);
  // Mittelader mit hellem Glanz daneben, Seitenadern
  out += linie([0, 0], [0, -L * 0.92], ADER);
  out += linie([-W * 0.14, -L * 0.12], [-W * 0.14, -L * 0.78], 'stroke="#ffffff" stroke-width="0.4" stroke-linecap="round" opacity="0.28"');
  for (const t of [0.3, 0.55, 0.8]) {
    for (const s of [-1, 1]) out += linie([0, -L * t], [s * W * 0.5, -L * (t + 0.14)], ADER);
  }
  return out + pfad(umriss, `fill="none" ${kon}`);
}

// Kleine Kugel mit Glanzpunkt (Blüten, Beeren)
function kugel(x, y, r, farbe, rand = '') {
  return kreis(x, y, r, `fill="${farbe}" ${rand}`) + kreis(x - r * 0.35, y - r * 0.35, r * 0.3, 'fill="#ffffff" opacity="0.45"');
}

// ---------- Topf (wie pflanzen.js) ----------
// Standard-Topf mit Verlauf. Geometrie unveraendert: Rand bei y = -H, Radius R, Standflaeche y = 0.
function topf(R, H) {
  const gewaehlt = gewaehlterTopf();
  if (gewaehlt) return gewaehlt(R, H);
  const id = uid('tp');
  const Rb = R * 0.72, ry = R * 0.4, ryb = Rb * 0.4, k = R / 14;
  const korpus = `M${f(-R)},${-H}L${f(-Rb)},0A${f(Rb)},${f(ryb)} 0 0 0 ${f(Rb)},0L${R},${-H}A${R},${f(ry)} 0 0 1 ${f(-R)},${-H}Z`;
  const krumen = [[-6, 1.5, 1.1, 0.6], [-2, 2.6, 0.9, 0.5], [3, 0.8, 1, 0.55], [6, 2.2, 0.8, 0.45], [1, -1.2, 0.7, 0.4]]
    .map(([x, y, rx, rr]) => oval(x * k, -H + y * k, rx * k, rr * k, 'fill="#d6b08a"'))
    .join('');
  const defs = '<defs>' +
    LIN(`${id}-k`, [[0, '#f0b08a'], [0.4, '#d9825b'], [1, '#a85a38']], 0, 0, 1, 0) +
    RAD_V(`${id}-r`, [[0, '#f7c7a6'], [0.6, '#d9825b'], [1, '#b8643f']], 0.35, 0.3, 0.7) +
    '</defs>';
  return defs +
    kontaktAt(1, 0, Rb + 2.5, ryb + 1.5) +
    pfad(korpus, `fill="url(#${id}-k)"`) +
    pfad(`M0,${f(-H + ry)}A${R},${f(ry)} 0 0 0 ${R},${-H}L${f(Rb)},0A${f(Rb)},${f(ryb)} 0 0 1 0,${f(ryb)}Z`, 'fill="#5a2f1c" opacity="0.3"') +
    pfad(`M${f(-R + 3)},${f(-H + 5)}L${f(-Rb + 3)},-4`, 'fill="none" stroke="#f3b996" stroke-width="2" stroke-linecap="round" opacity="0.8"') +
    pfad(korpus, `fill="none" ${KON_TOPF}`) +
    oval(0, -H, R, ry, `fill="url(#${id}-r)"`) +
    oval(0, -H, R - 2.4, ry - 1.2, 'fill="#a85a38"') +
    oval(0, -H + 0.8, R - 3.4, ry - 1.7, 'fill="#7a5238"') +
    krumen +
    oval(0, -H, R, ry, `fill="none" ${KON_TOPF}`);
}

// Goldene Manschette unter dem Topfrand mit Metallverlauf und Glanzkante
function manschette(R, H) {
  const id = uid('man');
  const Rb = R * 0.72;
  const rad = (y) => Rb + (R - Rb) * (-y) / H;
  const y1 = -H + 4.5, y2 = -H + 7.5, r1 = rad(y1), r2 = rad(y2);
  const d = `M${f(-r1)},${f(y1)}L${f(-r2)},${f(y2)}A${f(r2)},${f(r2 * 0.4)} 0 0 0 ${f(r2)},${f(y2)}L${f(r1)},${f(y1)}A${f(r1)},${f(r1 * 0.4)} 0 0 1 ${f(-r1)},${f(y1)}Z`;
  return `<defs>${LIN(id, [[0, '#f0d27a'], [0.4, '#c9a14a'], [1, '#7d5f25']], 0, 0, 1, 0)}</defs>` +
    pfad(d, `fill="url(#${id})"`) +
    pfad(`M${f(-r1 + 1.5)},${f(y1 + 1)}L${f(-r2 + 1.5)},${f(y2 - 1)}`, 'fill="none" stroke="#fff3c4" stroke-width="1.2" stroke-linecap="round" opacity="0.85"') +
    pfad(d, 'fill="none" stroke="#7a5a1e" stroke-width="0.8" stroke-linejoin="round"');
}

// Abgefallene Blaetter neben dem Topf (nur welk)
function fallLaub() {
  return an(-17, 2, -70, blatt(7, 3, WELK.hell, WELK.dunkel, KON_WELK, 0.8)) +
    an(16, 3, 60, blatt(6, 2.6, WELK.hell, WELK.dunkel, KON_WELK, 0.8));
}

// Topf plus Pflanze. Inhalt ist relativ zur Erde im Topf (0,0 = Erdoberflaeche)
function mitTopf(R, H, inhalt, welk, ebene, mitManschette = false) {
  return topf(R, H) + (mitManschette ? manschette(R, H) : '') +
    gruppe(`transform="translate(0,${-H}) rotate(${welk ? 8 : 0})"`, inhalt) +
    (welk && ebene !== 'brett' ? fallLaub() : '');
}

// ---------- Kuerbis (2D, Ursprung Mitte Bodenkontakt) ----------
const PAL = {
  orange: { col: '#e8803a', dunkel: '#c4602a', rippe: '#a84c20' },
  creme: { col: '#f3e6cf', dunkel: '#d8c29c', rippe: '#b89b6a' },
  gruen: { col: '#6fa35a', dunkel: '#4f7f3f', rippe: '#3d6a31' },
  gelb: { col: '#f5c518', dunkel: '#d9a441', rippe: '#b8862e' },
};
// Runder Kuerbis: Radialverlauf (Licht oben links), Schattenseite rechts, Rippen, Glanzpunkt
function kuerbis2d(cx, by, R, p) {
  const ry = R * 0.78, cy = by - ry;
  const verlauf = uid('kb'), seite = uid('kbs');
  const defs = '<defs>' +
    RAD_V(verlauf, [[0, mischen(p.col, '#ffffff', 0.45)], [0.5, p.col], [1, p.dunkel]], 0.36, 0.3, 0.8) +
    LIN(seite, [[0, p.dunkel, 0], [0.45, p.dunkel, 0], [1, p.dunkel, 0.7]], 0, 0, 1, 0) +
    '</defs>';
  let out = defs + kontaktAt(cx + R * 0.1, by, R * 1.05, R * 0.28) +
    oval(cx, cy, R, ry, `fill="url(#${verlauf})"`) +
    pfad(`M${f(cx)},${f(cy - ry)}A${f(R)},${f(ry)} 0 0 1 ${f(cx)},${f(cy + ry)}A${f(R * 0.5)},${f(ry)} 0 0 0 ${f(cx)},${f(cy - ry)}Z`, `fill="url(#${seite})"`);
  for (const kk of [-0.55, -0.2, 0.2, 0.55]) {
    const xk = cx + kk * R, yk = ry * Math.sqrt(1 - kk * kk) * 0.9;
    out += pfad(`M${f(xk)},${f(cy - yk)}Q${f(cx + kk * R * 1.35)},${f(cy)} ${f(xk)},${f(cy + yk)}`,
      `fill="none" stroke="${p.rippe}" stroke-width="0.9" opacity="0.6" stroke-linecap="round"`);
  }
  // Glanzpunkt links oben und Lichtkante
  out += oval(cx - R * 0.45, cy - ry * 0.2, R * 0.14, ry * 0.4, 'fill="#ffffff" opacity="0.3"') +
    oval(cx - R * 0.32, cy - ry * 0.56, R * 0.09, ry * 0.16, 'fill="#ffffff" opacity="0.6"') +
    oval(cx, cy, R, ry, `fill="none" ${KON_DEKO}`);
  const st = `M${f(cx)},${f(cy - ry + 1)}Q${f(cx + 1)},${f(cy - ry - 3)} ${f(cx + 2.5)},${f(cy - ry - 5)}`;
  out += pfad(st, 'fill="none" stroke="#6b4a3a" stroke-width="3.4" stroke-linecap="round"') +
    pfad(st, 'fill="none" stroke="#8a6a3a" stroke-width="2.2" stroke-linecap="round"');
  return out;
}

// ---------- Herbst ----------
// Deko: Kuerbis-Stapel aus drei Kuerbissen plus Herbstblaetter
function kuerbisse() {
  return kontakt(26, 8) +
    kuerbis2d(-8, 0, 14, PAL.orange) +
    kuerbis2d(11, 0, 11, PAL.creme) +
    kuerbis2d(1, -10, 10, PAL.gruen) +
    an(-25, 4, -80, blatt(9, 4.5, '#e8803a', '#c4602a', KON_DEKO, 0.8)) +
    an(23, 5, 70, blatt(8, 4, '#e8b83a', '#c9962a', KON_DEKO, 0.8)) +
    an(-4, 9, 110, blatt(7, 3.4, '#c2452d', '#8f2e1e', KON_DEKO, 0.8));
}

// Deko: flacher Laubhaufen mit Rechen. Haufen mit Radialverlauf, Blaetter mit Verlauf.
function herbstlaub() {
  const z = zufall(2026);
  const farben = [['#e8803a', '#c4602a'], ['#c2452d', '#8f2e1e'], ['#e8b83a', '#c9962a'], ['#d9a441', '#b8862e'], ['#f0a04b', '#d0712f']];
  const haufen = uid('haufen'), haufenOben = uid('haufen-o');
  const defs = '<defs>' +
    RAD_V(haufen, [[0, '#b8703a'], [0.7, '#8a4a24'], [1, '#5e3014']], 0.4, 0.3, 0.75) +
    RAD_V(haufenOben, [[0, '#d08a4e'], [1, '#a85a2e']], 0.4, 0.3, 0.7) +
    '</defs>';
  let out = defs + kontakt(28, 10) + oval(0, -4, 22, 9, `fill="url(#${haufen})"`) + oval(-3, -8, 15, 6, `fill="url(#${haufenOben})"`);
  for (let i = 0; i < 34; i++) {
    const a = z() * Math.PI * 2, rr = Math.sqrt(z());
    const x = 20 * rr * Math.cos(a), y = -4 + 8 * rr * Math.sin(a);
    const c = farben[i % farben.length];
    const L = 6 + z() * 4;
    out += an(x, y, 90 + (z() * 2 - 1) * 70, blatt(L, L * 0.38, c[0], c[1], 'stroke="#5a2a14" stroke-width="0.5" stroke-linejoin="round"', 0.8));
  }
  out += oval(-4, -10, 9, 3, 'fill="#f0a04b" opacity="0.5"');
  // Rechen, flach davor liegend: Stiel von A nach B, Kopf bei A
  const A = [-6, 12], B = [26, 0];
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const d = [(B[0] - A[0]) / len, (B[1] - A[1]) / len], n = [-d[1], d[0]];
  out += linie(A, B, 'stroke="#6b4a3a" stroke-width="3.2" stroke-linecap="round"') +
    linie(A, B, 'stroke="#c98f5a" stroke-width="1.8" stroke-linecap="round"') +
    linie([A[0], A[1] - 0.6], [B[0], B[1] - 0.6], 'stroke="#e2b07c" stroke-width="0.7" stroke-linecap="round" opacity="0.7"') +
    linie([A[0] - n[0] * 7, A[1] - n[1] * 7], [A[0] + n[0] * 7, A[1] + n[1] * 7], 'stroke="#8f9ba3" stroke-width="2" stroke-linecap="round"');
  for (let j = -3; j <= 3; j++) {
    const bx = A[0] + n[0] * j * 2.2, by = A[1] + n[1] * j * 2.2;
    out += linie([bx, by], [bx - d[0] * 7, by - d[1] * 7], 'stroke="#8f9ba3" stroke-width="1.1" stroke-linecap="round"');
  }
  return out;
}

// Saat: Zierkuerbis (episch, Rankpflanze ohne Topf)
function zierkuerbis(s, welk) {
  const k = FAC[s - 1];
  const g = welk ? WELK : GRUEN;
  const kon = kontur(welk);
  const spirale = (cx, cy, r0, dreh) => {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const w = i * 0.6 + dreh, rr = r0 * (1 - i / 18);
      pts.push([cx + rr * Math.cos(w), cy + rr * Math.sin(w)]);
    }
    return zug(pts, 'stroke="#477d43" stroke-width="0.8" stroke-linecap="round"');
  };
  const hauptTip = [-9 * k, -34 * k];
  const zweitTip = [12 * k, -22 * k];
  let out = kontakt(12 * k + 4, 4 * k + 2);
  // Keimblaetter am Ursprung (hinten dunkler und bläulich)
  out += an(-3, 0, -40, blatt(10 * k + 2, 5 * k + 1, welk ? g.hell : TIEF.hell, welk ? g.dunkel : TIEF.dunkel, kon, 0.6)) +
    an(3, 0, 40, blatt(10 * k + 2, 5 * k + 1, g.hell, g.dunkel, kon, 0.6));
  out += stiel(kurve([0, 0], hauptTip, 6), welk, 1.8);
  if (s >= 2) out += stiel(kurve([0, 0], zweitTip, -4), welk, 1.4);
  // Ranken
  out += spirale(hauptTip[0] * 0.4 - 6 * k, hauptTip[1] * 0.4, 4 * k + 1, 0);
  if (s >= 3) out += spirale(zweitTip[0] * 0.5 + 4 * k, zweitTip[1] * 0.5, 3.5 * k + 1, 1.2);
  // Grosse Blaetter
  const L = 24 * k;
  const blaetter = [
    [hauptTip[0] * 0.55, hauptTip[1] * 0.55, -55, 0.9],
    [hauptTip[0] * 0.8, hauptTip[1] * 0.8, 40, 0.8],
    [hauptTip[0], hauptTip[1], -10, 1],
  ];
  if (s >= 2) blaetter.push([zweitTip[0] * 0.7, zweitTip[1] * 0.7, 70, 0.85]);
  if (s >= 3) blaetter.push([zweitTip[0], zweitTip[1], -30, 0.9]);
  if (s >= 4) blaetter.push([hauptTip[0] * 0.3, hauptTip[1] * 0.3, 65, 0.8]);
  for (const [x, y, rot, m] of blaetter) {
    out += an(x, y, rot, blatt(L * m, L * m * 0.62, g.hell, g.dunkel, kon, 0.6));
  }
  // Kleine Zierkuerbisse in Farben
  const fruechte = [];
  if (s >= 3) fruechte.push([-6 * k, 0, 4.5 * k + 1, PAL.orange]);
  if (s >= 4) fruechte.push([10, 0, 4.2, PAL.gelb], [-22, 0, 3.6, PAL.creme], [4, 0, 3.2, PAL.gruen]);
  for (const [x, y, R, p] of fruechte) out += welk ? kuerbis2d(x, y, R, { col: '#a8845a', dunkel: '#8f6446', rippe: '#7a5a3a' }) : kuerbis2d(x, y, R, p);
  return out;
}

// ---------- Winter ----------
// Pflanze: Weihnachtsstern mit roten Hochblaetter-Sternen
const WS_ROT = { hell: '#ef4a3c', dunkel: '#a81e22', rand: '#7a1418' };
const WS_WELK = { hell: '#d9a88a', dunkel: '#b07a5c', rand: '#8f5a40' };

function stern(x, y, ro, c) {
  let out = '';
  for (let j = 0; j < 6; j++) {
    out += an(x, y, j * 60 + (j % 2 ? 14 : -6), blatt(ro, ro * 0.34, c.hell, c.dunkel, `stroke="${c.rand}" stroke-width="0.6" stroke-linejoin="round"`, 0.7));
  }
  // Gelbe Mitte mit Verlauf
  const mitte = uid('ws-mitte');
  out += `<defs>${RAD_V(mitte, [[0, '#fff3c4'], [1, '#f5c518']], 0.35, 0.3, 0.75)}</defs>` +
    kreis(x, y, ro * 0.3, `fill="url(#${mitte})"`);
  for (let j = 0; j < 6; j++) {
    const a = j * 60 * RAD;
    out += kreis(x + Math.cos(a) * ro * 0.22, y + Math.sin(a) * ro * 0.22, ro * 0.11, 'fill="#f5c518" stroke="#b8862e" stroke-width="0.4"');
  }
  return out;
}

function weihnachtsstern(s, welk, ebene) {
  const k = FAC[s - 1], R = 10, H = 16;
  const c = welk ? WS_WELK : WS_ROT;
  const g = welk ? WELK : GRUEN_TIEF;
  const hinten = welk ? WELK : TIEF;   // hintere Blaetter dunkler und bläulich
  const kon = kontur(welk);
  let basis = '', triebe = '', sterne = '';
  const grund = [[-56, 15], [52, 13], [-22, 12], [24, 11]].slice(0, s >= 3 ? 4 : 2);
  grund.forEach(([a, L], i) => {
    const t = i < 2 ? hinten : g;
    basis += an(0, 0, welk ? a * 1.2 : a, blatt(L * k, 4 * k, t.hell, t.dunkel, kon, 0.85));
  });
  const stiele = [[-30, 24], [-6, 32], [16, 28], [38, 20]].slice(0, [2, 3, 3, 4][s - 1]);
  stiele.forEach(([a0, S0], i) => {
    const a = (welk ? a0 * 1.2 : a0) * RAD;
    const S = S0 * k;
    const tip = [S * Math.sin(a), -S * Math.cos(a) * (welk ? 0.8 : 1)];
    triebe += stiel(kurve([0, 0], tip, i % 2 ? 2.5 : -2.5), welk, 1.6);
    const mid = [tip[0] * 0.5, tip[1] * 0.5];
    triebe += an(mid[0], mid[1], a0 + (i % 2 ? -42 : 42), blatt(9 * k, 3.2 * k, g.hell, g.dunkel, kon, 0.8));
    sterne += stern(tip[0], tip[1], 6 + 1.6 * k, c);
  });
  return mitTopf(R, H, basis + triebe + sterne, welk, ebene, true);
}

// Deko: Schneelaterne mit Schneehaube, Kerze und Tannenzweig. Glas mit Verlauf und Spiegelstreifen, Metall mit Glanzkante.
function schneelaterne() {
  const glanz = uid('sl-glanz');
  const glas = uid('sl-glas');
  const dachL = uid('sl-dach-l'), dachR = uid('sl-dach-r');
  const STEIN = { links: '#d9d6cf', rechts: '#b9b5ac', oben: '#ece9e3' };
  const METALL = { links: '#b8c4cc', rechts: '#8f9ba3', oben: '#eef3f6' };
  const SCHNEE = { links: '#dfe9ef', rechts: '#c4d6e0', oben: '#ffffff' };
  const KERZE = { links: '#e9dcc0', rechts: '#d4c3a0', oben: '#f7efdf' };
  const pStein = plastik(STEIN), pMetall = plastik(METALL), pKerze = plastik(KERZE);
  const GLAS_VORN = `fill="url(#${glas})" stroke="#c9a46a" stroke-width="0.7" stroke-linejoin="round"`;
  const GLAS_HINTEN = 'fill="#fff3c4" fill-opacity="0.15"';
  const ksKon = KON_DEKO;
  const defs = '<defs>' + pStein.defs + pMetall.defs + pKerze.defs +
    LIN(glas, [[0, '#ffffff', 0.5], [0.5, '#fff3c4', 0.22], [1, '#f3d9a0', 0.4]], 0, 0, 1, 1) +
    LIN(dachL, [[0, '#3f8a8e'], [1, '#2f6f73']], 0, 0, 1, 1) +
    LIN(dachR, [[0, '#2f6f73'], [1, '#1f4f52']], 0, 0, 1, 1) +
    RAD_V(glanz, [[0, '#ffe9a8', 0.75], [1, '#ffe9a8', 0]], 0.5, 0.5, 0.5) +
    '</defs>';
  let out = kontakt(13, 6.5) +
    quader(-7, 7, -7, 7, 0, 3, pStein.f) +
    quader(-5.4, 5.4, -5.4, 5.4, 3, 3.8, pMetall.f) +
    pk([[-5, -5, 3.8], [5, -5, 3.8], [5, -5, 17.6], [-5, -5, 17.6]], GLAS_HINTEN) +
    pk([[-5, -5, 3.8], [-5, 5, 3.8], [-5, 5, 17.6], [-5, -5, 17.6]], GLAS_HINTEN) +
    pk([[-5, 5, 3.8], [5, 5, 3.8], [5, 5, 17.6], [-5, 5, 17.6]], GLAS_VORN) +
    pk([[5, -5, 3.8], [5, 5, 3.8], [5, 5, 17.6], [5, -5, 17.6]], GLAS_VORN) +
    // Spiegelstreifen auf den beiden sichtbaren Scheiben
    pk([[-3.6, 5, 4.6], [-2.8, 5, 4.6], [-2.8, 5, 16.8], [-3.6, 5, 16.8]], 'fill="#ffffff" opacity="0.35"') +
    pk([[5, -3.6, 4.6], [5, -2.8, 4.6], [5, -2.8, 16.8], [5, -3.6, 16.8]], 'fill="#ffffff" opacity="0.35"') +
    quader(-1.6, 1.6, -1.6, 1.6, 3.8, 11, pKerze.f, 'stroke="#8a7a60" stroke-width="0.5"') +
    linie(P(0, 0, 11), P(0, 0, 12.6), 'stroke="#3a2a1a" stroke-width="0.7"');
  const fl = P(0, 0, 13.6);
  out += `<circle cx="${f(fl[0])}" cy="${f(fl[1])}" r="20" fill="url(#${glanz})"/>` +
    oval(fl[0], fl[1] + 0.8, 2.2, 3.6, 'fill="#ffd23f"') +
    oval(fl[0], fl[1] + 1.2, 1.1, 2, 'fill="#fff6d0"');
  // Eckpfosten aus Metall mit Glanzkante
  for (const [x, y] of [[-5, -5], [5, -5], [5, 5], [-5, 5]]) {
    out += quader(x - 0.8, x + 0.8, y - 0.8, y + 0.8, 3.8, 17.6, pMetall.f, ksKon);
  }
  out += quader(-6.2, 6.2, -6.2, 6.2, 17.6, 18.4, pMetall.f);
  // Dach: Petrol mit Verlauf, linke Flaeche heller
  out += pk([[-6.4, 6.4, 18.4], [6.4, 6.4, 18.4], [0, 0, 25]], `fill="url(#${dachL})" ${KON_DEKO}`) +
    pk([[6.4, 6.4, 18.4], [6.4, -6.4, 18.4], [0, 0, 25]], `fill="url(#${dachR})" ${KON_DEKO}`);
  // Schneehaube auf dem Dach
  out += pk([[-3.4, 3.4, 21.8], [3.4, 3.4, 21.8], [0, 0, 25.3]], 'fill="#ffffff" stroke="#b9ccd6" stroke-width="0.5" stroke-linejoin="round"') +
    pk([[3.4, 3.4, 21.8], [3.4, -3.4, 21.8], [0, 0, 25.3]], 'fill="#dfe9ef" stroke="#b9ccd6" stroke-width="0.5" stroke-linejoin="round"') +
    oval(P(0, 0, 25.4)[0], P(0, 0, 25.4)[1], 2.6, 1.3, 'fill="#ffffff"');
  // Schneerand unter der Traufe mit Tropfen
  const pSchnee = plastik(SCHNEE);
  out += pSchnee.defs + quader(-7.4, 7.4, 6.2, 7.4, 18.4, 19.6, pSchnee.f) +
    quader(6.2, 7.4, -7.4, 7.4, 18.4, 19.6, pSchnee.f);
  for (const x of [-5.5, -1.5, 2.5, 6.2]) {
    const q = P(x, 7.2, 18.4);
    out += oval(q[0], q[1] + 2.2, 1.4, 2.4, 'fill="#ffffff" stroke="#b9ccd6" stroke-width="0.4"');
  }
  // Aufhaengering
  out += kreis(P(0, 0, 26.4)[0], P(0, 0, 26.4)[1], 1.5, 'fill="none" stroke="#c9a14a" stroke-width="1.2"');
  // Tannenzweig vor der Laterne
  const A = [-4, 13], B = [12, 9];
  const dl = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const dir = [(B[0] - A[0]) / dl, (B[1] - A[1]) / dl], nrm = [-dir[1], dir[0]];
  const zz = 0.6;
  out += zug([P(A[0], A[1], zz), P(B[0], B[1], zz)], 'stroke="#6b4a3a" stroke-width="2.6" stroke-linecap="round"') +
    zug([P(A[0], A[1], zz), P(B[0], B[1], zz)], 'stroke="#a86b43" stroke-width="1.3" stroke-linecap="round"');
  // Weiche Nadelstriche: je Seite 10 bis 14 kurze, leicht gebogene Striche in zwei Gruentoenen
  const nz = zufall(5150);
  const achse = (t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
  let nadel = 0;
  for (const sd of [-1, 1]) {
    const n = 10 + Math.floor(nz() * 5);
    for (let i = 0; i < n; i++) {
      const t = 0.06 + (0.9 * (i + nz() * 0.6)) / n;
      const q = achse(t);
      const len = (7.6 - 2.4 * t) * (0.85 + nz() * 0.3);
      const tip = [q[0] + sd * nrm[0] * len - dir[0] * len * 0.35, q[1] + sd * nrm[1] * len - dir[1] * len * 0.35];
      const bog = (nz() - 0.5) * 1.2;
      const mitte = [(q[0] + tip[0]) / 2 + bog * dir[0], (q[1] + tip[1]) / 2 + bog * dir[1]];
      const farbe = nadel % 2 ? '#3a6b3a' : '#5e9a52';
      out += pfad(`M${p2(P(q[0], q[1], zz))}Q${p2(P(mitte[0], mitte[1], zz))} ${p2(P(tip[0], tip[1], zz + 0.4))}`,
        `fill="none" stroke="${farbe}" stroke-width="${nadel % 3 ? 0.6 : 0.8}" stroke-linecap="round"`);
      nadel++;
    }
  }
  // Schneetupfer auf dem Zweig
  for (const t of [0.22, 0.5, 0.78]) {
    const q = achse(t);
    const sp = P(q[0], q[1], zz + 1.3);
    out += oval(sp[0], sp[1], 1.3, 0.7, 'fill="#ffffff" opacity="0.9"');
  }
  // Drei rote Beeren mit Glanzpunkt
  for (const [t, o] of [[0.34, 1.4], [0.47, -1.3], [0.6, 1.1]]) {
    const q = achse(t);
    const b = P(q[0] + nrm[0] * o, q[1] + nrm[1] * o, zz + 1.6);
    out += kreis(b[0], b[1], 1.7, 'fill="#d94b3d" stroke="#a81e22" stroke-width="0.4"') +
      kreis(b[0] - 0.6, b[1] - 0.6, 0.5, 'fill="#ffffff" opacity="0.75"');
  }
  return defs + out;
}

// ---------- Fruehling ----------
// Pflanze: Kirschblutenbaum mit Bluetenwolke und fallenden Blueten (SMIL-Animation)
function kirschbluete(s, welk) {
  const k = FAC[s - 1], R = 14, H = 20;
  const z = zufall(4100 + s);
  const cx = 0, cy = -38 * k, rx = 25 * k, ry = 18 * k;
  const farben = welk ? ['#d9c0b6', '#c9a9a0', '#e2cbc4'] : ['#fbd3dd', '#f7b6c5', '#f29bb0', '#fde1e8'];
  // Verlaeufe: je Blütenfarbe einer, dazu die Krone
  const kroneId = uid('kr');
  let defs = '<defs>' +
    RAD_V(kroneId, welk ? [[0, '#d7bdb4'], [0.7, '#c8a8a0'], [1, '#b89088']] : [[0, '#f9c3d0'], [0.7, '#e89aae'], [1, '#d9788f']], 0.38, 0.3, 0.75);
  const blId = farben.map((c) => {
    const id = uid('kbl');
    defs += RAD_V(id, [[0, mischen(c, '#ffffff', 0.5)], [1, c]], 0.35, 0.35, 0.7);
    return id;
  });
  defs += '</defs>';
  let out = '';
  out += holzAst(kurve([0, 0], [0, -22 * k], 1), 3.4 + s * 0.5) +
    holzAst(kurve([0, -20 * k], [-13 * k, -36 * k], -3), 2.4 + s * 0.3) +
    holzAst(kurve([0, -20 * k], [13 * k, -33 * k], 3), 2.4 + s * 0.3) +
    holzAst(kurve([0, -21 * k], [0, -43 * k], 0), 2.2 + s * 0.3);
  // Bluetenwolke hinten
  out += oval(cx, cy + 2, rx * 0.98, ry * 0.95, `fill="url(#${kroneId})" opacity="0.6"`);
  const n = [10, 22, 36, 52][s - 1];
  for (let i = 0; i < n; i++) {
    const a = z() * Math.PI * 2, rr = Math.sqrt(z());
    const x = cx + rx * rr * Math.cos(a), y = cy + ry * rr * Math.sin(a);
    const r = (2.6 + z() * 1.6) * (0.8 + 0.2 * k);
    const ci = Math.floor(z() * farben.length);
    out += kreis(x, y, r, `fill="url(#${blId[ci]})" stroke="${welk ? '#a8845a' : '#d9788f'}" stroke-width="0.5"`) +
      kreis(x, y, 0.7, `fill="${welk ? '#8f6446' : '#e0607f'}"`);
  }
  // Einige Blaetter zwischen den Bluetenn
  if (!welk && s >= 2) {
    for (let i = 0; i < s * 2; i++) {
      const a = z() * Math.PI * 2, rr = Math.sqrt(z());
      out += an(cx + rx * rr * Math.cos(a), cy + ry * rr * Math.sin(a), z() * 360, blatt(5, 2.2, GRUEN.hell, GRUEN.dunkel, KON_GRUEN, 0.8));
    }
  }
  // Fallende Blueten (animiert)
  if (!welk && s >= 2) {
    const nf = s * 2;
    for (let i = 0; i < nf; i++) {
      const x = (z() * 2 - 1) * rx * 0.9, y = cy + ry * 0.2 + z() * ry * 0.7;
      const dur = (5 + z() * 3).toFixed(1), delay = (z() * 5).toFixed(1);
      const dx = (z() * 2 - 1) * 8;
      const petal = blatt(4.2, 2.1, '#fbd3dd', '#f29bb0', 'stroke="#d9788f" stroke-width="0.4"', 1.2);
      out += `<g transform="translate(${f(x)},${f(y)})"><g>` +
        `<animateTransform attributeName="transform" type="translate" values="0,0; ${f(dx)},${f(H * 1.2)}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>` +
        `<animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.1;0.8;1" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>` +
        an(0, 0, z() * 360, petal) + `</g></g>`;
    }
  }
  return mitTopf(R, H, defs + out, welk, 'boden');
}

// Pflanze: Tulpen, 5 bis 7 Blueten in Rot, Gelb und Rosa
const TULPE = [
  { hell: '#ef5a4c', dunkel: '#a81e22' },
  { hell: '#ffe27a', dunkel: '#d9a441' },
  { hell: '#f7b8c8', dunkel: '#c76a8a' },
];
// Tulpenkopf mit Verlauf: Lichtseite links hell, Schattenseite rechts dunkel
function tulpenKopf(hh, ww, c, welk) {
  const d = `M0,0C${f(-0.9 * ww)},${f(-0.2 * hh)} ${f(-1.15 * ww)},${f(-0.7 * hh)} ${f(-0.7 * ww)},${f(-hh)}` +
    `Q${f(-0.35 * ww)},${f(-0.8 * hh)} 0,${f(-1.05 * hh)}Q${f(0.35 * ww)},${f(-0.8 * hh)} ${f(0.7 * ww)},${f(-hh)}` +
    `C${f(1.15 * ww)},${f(-0.7 * hh)} ${f(0.9 * ww)},${f(-0.2 * hh)} 0,0Z`;
  const kon = 'stroke="#6b4a3a" stroke-width="0.8" stroke-linejoin="round"';
  const dunkel = welk ? '#a8845a' : c.dunkel, hell = welk ? '#d9c58a' : c.hell;
  const id = uid('tu');
  return `<defs>${LIN(id, [[0, mischen(hell, '#ffffff', 0.25)], [0.4, hell], [1, dunkel]], 0, 0, 1, 0)}</defs>` +
    pfad(d, `fill="url(#${id})"`) +
    linie([0, -0.15 * hh], [0, -0.9 * hh], ADER) +
    pfad(`M${f(-0.45 * ww)},${f(-0.3 * hh)}Q${f(-0.5 * ww)},${f(-0.7 * hh)} ${f(-0.2 * ww)},${f(-0.9 * hh)}`, 'fill="none" stroke="#ffffff" stroke-width="0.7" stroke-linecap="round" opacity="0.35"') +
    pfad(d, `fill="none" ${kon}`);
}

function tulpen(s, welk, ebene) {
  const k = FAC[s - 1], R = 10, H = 16;
  const n = [5, 6, 6, 7][s - 1];
  const g = welk ? WELK : GRUEN;
  const kon = kontur(welk);
  let basis = '', stiele = '', koepfe = '';
  for (const [a, L] of [[-22, 22], [4, 24], [26, 20]]) {
    basis += an(0, 0, welk ? a * 1.3 : a, blatt(L * k, 4.6 * k, g.hell, g.dunkel, kon, 0.9));
  }
  for (let i = 0; i < n; i++) {
    const a0 = -42 + i * (84 / (n - 1)) + (i % 2 ? 3 : -2);
    const a = (welk ? a0 * 1.3 : a0) * RAD;
    const S = (18 + (i % 3) * 5) * k * (welk ? 0.85 : 1);
    const tip = [S * Math.sin(a), -S * Math.cos(a)];
    stiele += stiel(kurve([0, 0], tip, (i % 2 ? 1.5 : -1.5)), welk, 1.4);
    const c = TULPE[i % TULPE.length];
    const hh = (8 + (i % 2)) * (0.7 + 0.3 * k) * (welk ? 0.85 : 1);
    koepfe += an(tip[0], tip[1], a0 * (welk ? 1.3 : 1), tulpenKopf(hh, hh * 0.5, c, welk));
  }
  return mitTopf(R, H, basis + stiele + koepfe, welk, ebene);
}

// ---------- Sommer ----------
// Pflanze: Hibiskus, Busch mit grossen roten Bluten und gelbem Stempel
function hibiskusBlueten(r, welk) {
  const c = welk ? { hell: '#d98a7a', dunkel: '#a8594c', rand: '#6b3a30' } : { hell: '#ef4a3c', dunkel: '#b82424', rand: '#7a1418' };
  let out = '';
  for (let j = 0; j < 5; j++) {
    out += an(0, 0, j * 72 + 8, blatt(r, r * 0.62, c.hell, c.dunkel, `stroke="${c.rand}" stroke-width="0.6" stroke-linejoin="round"`, 1.5));
  }
  out += kreis(0, 0, r * 0.2, 'fill="#8a1d1d" opacity="0.7"');
  const ende = [r * 0.22, -r * 0.8];
  out += linie([0, 0], ende, 'stroke="#f5c518" stroke-width="1" stroke-linecap="round"');
  for (let j = 0; j < 5; j++) {
    const a = j * 72 * RAD;
    out += kreis(ende[0] + Math.cos(a) * 1.2, ende[1] + Math.sin(a) * 1.2, 0.9, 'fill="#f5c518"');
  }
  return out;
}

function hibiskus(s, welk, ebene) {
  const k = FAC[s - 1], R = 14, H = 20;
  const nZw = [2, 3, 4, 5][s - 1];
  const nBl = [1, 2, 4, 5][s - 1];
  const zweige = [[-30, 30], [-8, 38], [14, 36], [34, 28], [-52, 20]].slice(0, nZw);
  const g = welk ? WELK : GRUEN;
  const kon = kontur(welk);
  let inhalt = '', blueten = '';
  zweige.forEach(([a0, L0], i) => {
    const a = (welk ? a0 * 1.2 : a0) * RAD;
    const S = L0 * k;
    const tip = [S * Math.sin(a), -S * Math.cos(a) * (welk ? 0.85 : 1)];
    inhalt += holzAst(kurve([0, 0], tip, i % 2 ? 2.5 : -2.5), 2.6 * k + 1.2);
    for (const t of [0.4, 0.75]) {
      const p = [tip[0] * t, tip[1] * t];
      for (const sd of [-1, 1]) {
        // Blaetter auf der Schattenseite (rechts) etwas dunkler und bläulich
        const t2 = !welk && sd > 0 ? TIEF : g;
        inhalt += an(p[0], p[1], a0 + sd * 58, blatt(10 * k + 3, 5.2 * k + 1.2, t2.hell, t2.dunkel, kon, 0.8));
      }
    }
    if (i < nBl) {
      const rB = (8.5 + 1.2 * s) * (welk ? 0.8 : 1);
      blueten += an(tip[0], tip[1], (i % 2 ? 10 : -8), hibiskusBlueten(rB, welk));
    }
  });
  return mitTopf(R, H, inhalt + blueten, welk, ebene);
}

// Deko: Mid-Century-Sonnenschirm mit Fransen, Teak-Stange und Fuss. Schirm mit Verlauf je Segment.
function sonnenschirm() {
  const RC = 27, zR = 40, zS = 56;
  const kreisP = (r, z, a0, a1, n = 24) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (a0 + (a1 - a0) * i / n) * RAD;
      pts.push(P(r * Math.cos(a), r * Math.sin(a), z));
    }
    return pts;
  };
  // Zylinder: sichtbare Mantelflaeche (Winkel -45 bis 135) mit Verlauf, Deckel mit Radialverlauf
  const zyl = (r, z0, z1, seite, deckel) => {
    const a = uid('zs'), b = uid('zd');
    return `<defs>${LIN(a, [[0, mischen(seite, '#ffffff', 0.3)], [0.45, seite], [1, mischen(seite, '#000000', 0.25)]], 0, 0, 1, 0)}` +
      `${RAD_V(b, [[0, mischen(deckel, '#ffffff', 0.4)], [1, deckel]], 0.4, 0.35, 0.7)}</defs>` +
      poly(kreisP(r, z0, -45, 135).concat(kreisP(r, z1, 135, -45)), `fill="url(#${a})" ${KON_DEKO}`) +
      poly(kreisP(r, z1, 0, 360, 32), `fill="url(#${b})" ${KON_DEKO}`);
  };
  const rimP = (a) => P(RC * Math.cos(a * RAD), RC * Math.sin(a * RAD), zR);

  // Schirmsegmente: je Farbe ein Radialverlauf (Licht oben links)
  const segSenf = uid('seg-senf'), segCreme = uid('seg-creme');
  const segDefs = '<defs>' +
    RAD_V(segSenf, [[0, '#f5d27a'], [0.7, '#d9a441'], [1, '#b8862e']], 0.4, 0.3, 0.8) +
    RAD_V(segCreme, [[0, '#fffaf0'], [0.7, '#f3e6cf'], [1, '#d8c29c']], 0.4, 0.3, 0.8) +
    '</defs>';

  let out = segDefs + kontakt(15, 7) +
    zyl(10, 0, 3.2, '#a86b43', '#c98f5a') +
    zyl(4.5, 3.2, 5.5, '#a86b43', '#c98f5a') +
    zyl(1.9, 5.5, zR - 3, '#b8743d', '#d99a5b') +
    zyl(2.5, 9, 10.4, '#c9a14a', '#f0d27a');

  // Fransen (vor dem Schirm oder dahinter)
  const fransen = (sichtbar) => {
    let s = '';
    for (let i = 0; i < 16; i++) {
      const th = i * 22.5 + 11.25;
      const vorn = Math.cos(th * RAD) + Math.sin(th * RAD) > 0;
      if (vorn !== sichtbar) continue;
      const tipP = P(RC * Math.cos(th * RAD), RC * Math.sin(th * RAD), zR - 6.5);
      const a = rimP(th - 4), b = rimP(th + 4);
      s += poly([a, b, tipP], `fill="${i % 2 ? '#f3e6cf' : '#d9a441'}" stroke="#6b4a3a" stroke-width="0.6" stroke-linejoin="round"`);
    }
    return s;
  };
  out += fransen(false);

  // Schirm: acht Segmente, abwechselnd Senf und Creme
  for (let i = 0; i < 8; i++) {
    const a0 = i * 45, a1 = a0 + 45, mid = (a0 + a1) / 2;
    const rand = kreisP(RC, zR, a0, a1, 6);
    const fuell = i % 2 ? `url(#${segCreme})` : `url(#${segSenf})`;
    out += poly([P(0, 0, zS)].concat(rand), `fill="${fuell}" stroke="#6b4a3a" stroke-width="0.7" stroke-linejoin="round"`);
    if (mid > -90 && mid < 90) out += poly([P(0, 0, zS)].concat(rand), 'fill="#6b4a3a" opacity="0.12"');
  }
  out += zug(kreisP(RC, zR, 0, 360, 48), KON_DEKO);
  out += fransen(true);
  out += kreis(P(0, 0, zS)[0], P(0, 0, zS)[1], 1.2, 'fill="#c9a14a"');
  return out;
}

export const SAISON = {
  kuerbis: { name: 'Kürbisse', art: 'deko', saison: 'herbst', zeichne: () => kuerbisse() },
  herbstlaub: { name: 'Herbstlaub', art: 'deko', saison: 'herbst', zeichne: () => herbstlaub() },
  zierkuerbis: { name: 'Zierkürbis', art: 'saat', saison: 'herbst', seltenheit: 'episch', zeichne: (stufe = 1, welk = false) => zierkuerbis(stufeN(stufe), welk) },
  weihnachtsstern: { name: 'Weihnachtsstern', art: 'pflanze', groesse: 'klein', saison: 'winter', zeichne: (stufe = 1, welk = false, ebene = 'boden') => weihnachtsstern(stufeN(stufe), welk, ebene) },
  schneelaterne: { name: 'Schneelaterne', art: 'deko', saison: 'winter', zeichne: () => schneelaterne() },
  kirschbluete: { name: 'Kirschblütenbaum', art: 'pflanze', groesse: 'gross', saison: 'fruehling', zeichne: (stufe = 1, welk = false, ebene = 'boden') => kirschbluete(stufeN(stufe), welk) },
  tulpen: { name: 'Tulpen', art: 'pflanze', groesse: 'klein', saison: 'fruehling', zeichne: (stufe = 1, welk = false, ebene = 'boden') => tulpen(stufeN(stufe), welk, ebene) },
  sonnenschirm: { name: 'Sonnenschirm', art: 'deko', saison: 'sommer', zeichne: () => sonnenschirm() },
  hibiskus: { name: 'Hibiskus', art: 'pflanze', groesse: 'gross', saison: 'sommer', zeichne: (stufe = 1, welk = false, ebene = 'boden') => hibiskus(stufeN(stufe), welk, ebene) },
  // Winter 2.2 (SPEC-4): Zimmertanne mit Schmuck, Strohstern, Adventskranz, Schneekugel, Christrose, Amaryllis, Schlitten, Teekanne
  ...WINTER,
  ...WINTER2,
};
