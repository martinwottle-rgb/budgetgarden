// Spaetspiel-Topfpflanzen (Level 6 bis 16) als SVG-Strings, gleiche Schnittstelle wie PFLANZEN in pflanzen.js.
// zeichne(stufe, welk, ebene) liefert Topf und Pflanze mit Ursprung (0,0) = Mitte der Topf-Unterkante,
// ohne Positionierung und ohne Skalierung. Stufe 1 bis 4 wachsen deutlich.
// ebene: 'boden' (Standard) oder 'brett' (Stellplatz auf einem Moebel).
// Phase 2: Blaetter, Stiele, Staemme und Bluetenteile mit Verlaeufen (Licht links oben), Adern und Glanzpunkten.
// Hintere Teile werden zuerst gezeichnet, vordere zuletzt. Keine SVG-Filter, nur Verlaeufe.

import { f, p2, gruppe, pfad, linie, oval, kreis, qb, zufall } from './hilfen.js';
import { gewaehlterTopf } from './topfwahl.js';

const RAD = Math.PI / 180;
const EF_R = 10; // Radius des kleinen Topfs

// Konturen wie in pflanzen.js: Topf braun, Blaetter, Stiele und Bluetenblaetter dunkelgruen (welk: Erdton).
const KON_TOPF = 'stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';
const KON_GRUEN = 'stroke="#2f5a30" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const KON_WELK = 'stroke="#7d6a45" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const kontur = (welk) => (welk ? KON_WELK : KON_GRUEN);

// ---------- Verlaeufe ----------
// Jede Pflanze bekommt eine eigene Id-Basis (Zaehler), damit sich die Verlaeufe mehrerer Pflanzen nicht ueberschreiben.
// Verlaeufe, die auf der Flaeche selbst liegen (objectBoundingBox), werden pro Pflanze nach Namen gecacht.
let UID = 0;
function kontext() { return { u: 'pf' + (++UID), defs: [], cache: {}, n: 0 }; }
const stopsXml = (stops) => stops.map(([o, col, op]) => `<stop offset="${o}" stop-color="${col}"${op === undefined ? '' : ` stop-opacity="${op}"`}/>`).join('');
const WELK_STOPS = [[0, '#d6d9a0'], [0.55, '#b5c48a'], [1, '#8c8650']];

// Diagonaler Verlauf auf der Flaeche: oben links hell, unten rechts dunkel
function vl(c, name, stops) {
  if (!c.cache[name]) {
    const id = `${c.u}-${name}`;
    c.defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${stopsXml(stops)}</linearGradient>`);
    c.cache[name] = `url(#${id})`;
  }
  return c.cache[name];
}

// Waagerechter Verlauf im Koordinatensystem der Pflanze (x0 bis x1), fuer Stiele und Staemme
function vlH(c, x0, x1, stops) {
  const id = `${c.u}-h${++c.n}`;
  c.defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x0)}" y1="0" x2="${f(x1)}" y2="0">${stopsXml(stops)}</linearGradient>`);
  return `url(#${id})`;
}

// Runder Verlauf mit Lichtpunkt oben links (Fruechte, Knospen, Bluetenteile)
function rl(c, name, stops) {
  if (!c.cache[name]) {
    const id = `${c.u}-${name}`;
    c.defs.push(`<radialGradient id="${id}" cx="0.35" cy="0.3" r="0.8" fx="0.3" fy="0.26">${stopsXml(stops)}</radialGradient>`);
    c.cache[name] = `url(#${id})`;
  }
  return c.cache[name];
}

// Welk: einheitlicher Welk-Verlauf, sonst der angegebene Verlauf
const fv = (c, welk, name, stops) => (welk ? vl(c, 'welk', WELK_STOPS) : vl(c, name, stops));
const defsOf = (c) => (c.defs.length ? `<defs>${c.defs.join('')}</defs>` : '');

// ---------- Topf (Terrakotta, Kegelstumpf mit Ellipse oben) ----------
// Unveraendert: der Topf wird ueber die Topf-Funktion gezeichnet, damit der gewaehlte Topf eingesetzt wird.
function topf(R, H) {
  const gewaehlt = gewaehlterTopf();
  if (gewaehlt) return gewaehlt(R, H);
  const Rb = R * 0.72, ry = R * 0.4, ryb = Rb * 0.4, k = R / 14;
  const korpus = `M${f(-R)},${-H}L${f(-Rb)},0A${f(Rb)},${f(ryb)} 0 0 0 ${f(Rb)},0L${R},${-H}A${R},${f(ry)} 0 0 1 ${f(-R)},${-H}Z`;
  const krumen = [[-6, 1.5, 1.1, 0.6], [-2, 2.6, 0.9, 0.5], [3, 0.8, 1, 0.55], [6, 2.2, 0.8, 0.45], [1, -1.2, 0.7, 0.4]]
    .map(([x, y, rx, rr]) => oval(x * k, -H + y * k, rx * k, rr * k, 'fill="#d6b08a"'))
    .join('');
  return oval(1, 0, Rb + 2.5, ryb + 1.5, 'fill="#6b4a3a" opacity="0.18"') +
    pfad(korpus, 'fill="#d9825b"') +
    pfad(`M0,${f(-H + ry)}A${R},${f(ry)} 0 0 0 ${R},${-H}L${f(Rb)},0A${f(Rb)},${f(ryb)} 0 0 1 0,${f(ryb)}Z`, 'fill="#b8643f"') +
    pfad(`M${f(-R + 3)},${f(-H + 5)}L${f(-Rb + 3)},-4`, 'fill="none" stroke="#eba47f" stroke-width="2" stroke-linecap="round" opacity="0.8"') +
    pfad(korpus, `fill="none" ${KON_TOPF}`) +
    oval(0, -H, R, ry, 'fill="#eba47f"') +
    pfad(`M0,${f(-H - ry)}A${R},${f(ry)} 0 0 1 0,${f(-H + ry)}Z`, 'fill="#d9825b"') +
    oval(0, -H, R - 2.4, ry - 1.2, 'fill="#a85a38"') +
    oval(0, -H, R - 3.4, ry - 1.7, 'fill="#7a5238"') +
    krumen +
    oval(0, -H, R, ry, `fill="none" ${KON_TOPF}`);
}

// Abgefallene Blaetter liegen flach direkt neben dem Topf. Auf dem Boden nur in Richtung Raummitte
// (positive Feldrichtungen), auf einem Brett nur entlang der Brettlaenge. Nur bei welk.
function fallLaub(ebene, c) {
  const stellen = ebene === 'brett'
    ? [[-18, 9, 20], [-9, 4, -20]]
    : [[13, 7, -35], [-12, 8, 30], [2, 11, -5]];
  return stellen.map(([x, y, w]) => fallBlatt(c, x, y, w)).join('');
}

// Ein abgefallenes Blatt: Laenge 5, Breite 2.5, flach liegend (y-Ausdehnung halbiert), um w Grad gedreht.
function fallBlatt(c, x, y, w) {
  const L = 5;
  const halb = ovalKante(L, 2.5, false);
  const rand = halb.concat(halb.slice().reverse().map(([px, py]) => [-px, py]));
  const cs = Math.cos(w * RAD), sn = Math.sin(w * RAD);
  const tf = ([px, py]) => [x + px * cs - py * sn, y + (px * sn + py * cs) * 0.5];
  const umr = 'M' + rand.map(tf).map(p2).join('L') + 'Z';
  const V = vl(c, 'laub', [[0, '#d8b880'], [1, '#9c7a4c']]);
  return pfad(umr, `fill="${V}" stroke="#7d6a45" stroke-width="0.6" stroke-linejoin="round"`) +
    linie(tf([0, 0]), tf([0, -L * 0.85]), 'stroke="#7d6a45" stroke-width="0.4" stroke-linecap="round"');
}

// ---------- Hilfen fuer Blaetter, Stiele und Kurven ----------
// Kubischer Bezier, P = [P0, C1, C2, P3]
function bez(P, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [0, 1].map((j) => a * P[0][j] + b * P[1][j] + c * P[2][j] + d * P[3][j]);
}

// Ovale, spitze Form (Grund (0,0), Spitze (0,-L)), optional weich gezahnt. W = halbe Breite.
const WELLE = (i) => 1 + 0.05 * Math.sin((2 * Math.PI * i) / 6.5);
function ovalKante(L, W, zacken) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    let w = W * Math.sin(Math.PI * Math.pow(t, 0.75));
    if (zacken && i > 0 && i < 40) w *= WELLE(i);
    pts.push([w, -L * t]);
  }
  return pts;
}

const p2pfad = (pts) => 'M' + pts.map(p2).join('L') + 'Z';
const sp = (q) => `${f(q[0])},${f(q[1])}`;
const an = (x, y, rot, inhalt) => gruppe(`transform="translate(${f(x)},${f(y)}) rotate(${f(rot)})"`, inhalt);

// Umriss aus rechter Kante R (Grund bis Spitze) und gespiegelter linker Kante
const umriss = (R) => R.concat(R.slice().reverse().map(([x, y]) => [-x, y]));

// Blattflaeche mit Verlauf. R: rechte Kante (Grund (0,0), Spitze (0,-L)).
// o: { L, W, V (Verlauf), ader (Aderfarbe), welk, kon (Konturfarbe), seiten, glanz }.
// Rechte Haelfte dunkler (Licht von links), Mittelrippe, Seitenadern, Glanzpunkt, Kontur.
function blattV(R, o) {
  const { L, W, V, welk } = o;
  const ader = welk ? '#e6dca0' : o.ader;
  const U = p2pfad(umriss(R));
  let out = pfad(U, `fill="${V}"`) +
    pfad(p2pfad(R), `fill="#1f3d33" opacity="${welk ? 0.1 : 0.17}"`) +
    linie([0, -0.03 * L], [0, -0.9 * L], `stroke="${ader}" stroke-width="0.8" stroke-linecap="round" opacity="0.8"`);
  if (o.seiten !== false) {
    for (const t of [0.3, 0.5, 0.7]) {
      for (const sd of [-1, 1]) {
        out += linie([0, -L * t], [sd * W * 0.45, -L * (t + 0.12)], `stroke="${ader}" stroke-width="0.45" stroke-linecap="round" opacity="0.4"`);
      }
    }
  }
  if (o.glanz !== false) {
    out += oval(-0.25 * W, -0.55 * L, 0.1 * W, 0.035 * L,
      `fill="#ffffff" opacity="${welk ? 0.2 : 0.5}" transform="rotate(-25 ${f(-0.25 * W)} ${f(-0.55 * L)})"`);
  }
  return out + pfad(U, `fill="none" ${o.kon || kontur(welk)}`);
}

// Stiel mit Verlauf ueber die Breite (hell links, dunkel rechts), dunkle Kontur und Glanzlinie.
// x0, x1: waagerechte Lage des Stiels, damit der Verlauf dort liegt.
function stiel(c, d, welk, w, x0, x1) {
  const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
  const mitte = (lo + hi) / 2, halb = (hi - lo) / 2 + w;
  const [rand, st, glanz] = welk
    ? ['#7d6a45', [[0, '#c4c98f'], [0.5, '#a8a36a'], [1, '#8c8650']], '#f0ebc8']
    : ['#2f5a30', [[0, '#b2dc96'], [0.5, '#6fa862'], [1, '#3a6b3a']], '#e8f7d8'];
  const g = vlH(c, mitte - halb, mitte + halb, st);
  return pfad(d, `fill="none" stroke="${rand}" stroke-width="${f(w + 1.2)}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${g}" stroke-width="${w}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${glanz}" stroke-width="${f(w * 0.28)}" stroke-linecap="round" opacity="0.5" transform="translate(${f(-w * 0.22)},0)"`);
}

// Holz (Stamm, Ast) mit Verlauf: drei Toene (Licht links, Grundton, Schatten rechts), Maserung und Glanzlinie
const HOLZ_ST = [[0, '#e2b07c'], [0.45, '#c98f5a'], [1, '#a86b43']];
const HOLZ_WELK_ST = [[0, '#e6d3a4'], [0.45, '#c9b07a'], [1, '#a8966a']];
function holz(c, d, w, welk, x0, x1) {
  const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
  const mitte = (lo + hi) / 2, halb = (hi - lo) / 2 + w;
  const g = vlH(c, mitte - halb, mitte + halb, welk ? HOLZ_WELK_ST : HOLZ_ST);
  return pfad(d, `fill="none" stroke="#6b4a3a" stroke-width="${f(w + 1.2)}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${g}" stroke-width="${w}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${welk ? '#8f8a70' : '#8a5a36'}" stroke-width="${f(w * 0.2)}" stroke-linecap="round" opacity="0.45" transform="translate(${f(w * 0.3)},0)"`) +
    pfad(d, `fill="none" stroke="#f3dcae" stroke-width="${f(w * 0.22)}" stroke-linecap="round" opacity="0.6" transform="translate(${f(-w * 0.25)},0)"`);
}

// Ranke ueber den Topfrand: startet an der Erde, zieht nach aussen und haengt nach unten.
// Liefert Pfad, Startpunkt S, Kontrollpunkt C und Endpunkt E (fall = Endhoehe, sg = Seite).
function rankePfad(sg, fall, ebene) {
  const fl = ebene === 'brett' ? fall * 0.6 : fall;
  const S = [sg * 3, -2], C = [sg * (EF_R + 4), -7], E = [sg * (EF_R + 5), fl];
  return { d: `M${sp(S)}Q${sp(C)} ${sp(E)}`, S, C, E };
}

// ---------- Strelitzie (Paradiesvogelblume) ----------
// Grosse, paddelfoermige Blaetter (oben breit, blaugruen) an langen Stielen. Stufe 3 geschlossene Knospe,
// Stufe 4 Paradiesvogel-Bluete: drei orange Kelchblaetter, blaue Zunge, gruen-violette Scheide.
const STR_VORN = [[0, '#b4e3d0'], [0.5, '#7fb8a5'], [1, '#4d8074']];
const STR_HINTEN = [[0, '#7fb1b4'], [0.5, '#4f8a92'], [1, '#33626b']];
const ORANGE = [[0, '#ffcb78'], [0.5, '#f7a23a'], [1, '#d4621c']];
const BLAU = [[0, '#b2e0fa'], [0.5, '#5aa8e3'], [1, '#24659f']];
const SCHEIDE = [[0, '#9d94c8'], [0.55, '#7c6f9e'], [1, '#4d4470']];
const GRUEN_K = [[0, '#c4dca8'], [1, '#6f8a5a']];

// Paddelkante: Grund (0,0) schmal, breiteste Stelle bei etwa 70 %, Spitze (0,-L). W = halbe Breite.
function paddelKante(L, W) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    pts.push([W * Math.sin(Math.PI * Math.pow(t, 1.9)), -L * t]);
  }
  return pts;
}

// Bluetenteil (Kelchblatt oder Zunge): Grund (0,0), Spitze (0,-L)
function kelchBlatt(c, L, W, name, stops, welk, ader) {
  return blattV(ovalKante(L, W, false), { L, W, V: fv(c, welk, name, stops), ader, welk, kon: welk ? KON_WELK : 'stroke="#8a3f12" stroke-width="0.7" stroke-linejoin="round"', seiten: false, glanz: false });
}

// Bluetenkopf in lokalen Koordinaten (Ursprung = Ansatz am Stiel): Scheide, Kelchblaetter, blaue Zunge
function strelitzieKopf(c, welk, offen) {
  let out = pfad('M-4,1Q-5,-6 0,-9Q4,-6 4,1Q0,3 -4,1Z', `fill="${fv(c, welk, 'scheide', SCHEIDE)}" ${kontur(welk)}`) +
    pfad('M-4,1Q-5,-6 0,-9Q-1,-4 -1,1Z', `fill="${fv(c, welk, 'gruen', GRUEN_K)}" opacity="0.8"`);
  if (!offen) return out + an(0, -6, 0, kelchBlatt(c, 7, 2.2, 'orange', ORANGE, welk, '#fbe3b0'));
  for (const [rot, L, W] of [[-26, 13, 3.4], [-4, 14, 3.6], [18, 13, 3.4]]) {
    out += an(0, -5, rot, kelchBlatt(c, L, W, 'orange', ORANGE, welk, '#fbe3b0'));
  }
  return out + an(0, -5, 62, kelchBlatt(c, 12, 2.6, 'blau', BLAU, welk, '#c9e8fb'));
}

// Winkel, Stiellaenge, Blattlaenge, halbe Breite
const STR_BLAETTER = {
  1: [[-38, 16, 13, 4], [30, 18, 14, 4.5]],
  2: [[-46, 20, 17, 5], [-12, 24, 19, 5.5], [24, 22, 18, 5], [48, 18, 15, 4.5]],
  3: [[-52, 24, 21, 6], [-22, 28, 23, 6.5], [6, 30, 22, 6], [34, 26, 21, 6], [56, 22, 17, 5]],
  4: [[-58, 28, 25, 7], [-30, 33, 27, 7.5], [-8, 36, 26, 7], [16, 35, 27, 7.5], [40, 30, 24, 6.5], [62, 26, 20, 5.5]],
};

function strelitzie(s, welk, ebene, c) {
  let stiele = '', hinten = '', vorn = '';
  const tab = STR_BLAETTER[s].map(([a0, S, L, W], i) => ({ a0, S, L, W, i }))
    .sort((p, q) => Math.abs(q.a0) - Math.abs(p.a0) || p.i - q.i);
  const nh = Math.floor(tab.length / 2); // die ersten (weit ausladenden) Blaetter liegen hinten
  tab.forEach((b, k) => {
    const a = welk ? b.a0 * 1.2 : b.a0;
    const ex = b.S * Math.sin(a * RAD), ey = -b.S * Math.cos(a * RAD) * (welk ? 0.6 : 1);
    stiele += stiel(c, `M0,0Q${f(ex * 0.15)},${f(ey * 0.8)} ${f(ex)},${f(ey)}`, welk, 2.6, 0, ex);
    const rot = welk ? (b.a0 < 0 ? -150 : 150) : a * 0.6;
    const hint = k < nh;
    const V = fv(c, welk, hint ? 'str-h' : 'str-v', hint ? STR_HINTEN : STR_VORN);
    const bl = an(ex, ey, rot, blattV(paddelKante(b.L, b.W), { L: b.L, W: b.W, V, ader: hint ? '#9fd0d8' : '#d6f0e6', welk }));
    if (hint) hinten += bl; else vorn += bl;
  });
  if (s === 3) {
    stiele += stiel(c, 'M0,0Q2,-18 5,-36', welk, 2.4, 0, 5);
    vorn += an(5, -36, welk ? 20 : 12, strelitzieKopf(c, welk, false));
  }
  if (s === 4) {
    stiele += stiel(c, 'M0,0Q2,-22 7,-46', welk, 2.4, 0, 7);
    vorn += an(7, -46, welk ? 20 : 12, strelitzieKopf(c, welk, true));
  }
  return stiele + hinten + vorn;
}

// ---------- Alocasia ----------
// Pfeilfoermige, dunkelgruene Blaetter mit weissen Adern, aufrecht an langen, duennen Stielen.
const ALO_VORN = [[0, '#74ad6e'], [0.5, '#4a8a4c'], [1, '#2a5a32']];
const ALO_HINTEN = [[0, '#5a9a7e'], [0.5, '#3a7060'], [1, '#22463f']];
const ALO_ADER = '#e6f2d8';

// Pfeilkante: Grund (0,0) = Ansatz des Stiels in der Bucht, Spitze (0,-L), zwei Lappen nach unten.
// W = halbe Breite der Lappen. Erster Abschnitt endet am rechten Lappen (Index 12).
function pfeilKante(L, W) {
  const seg = [
    [[0, 0], [0.2 * W, 0.02 * L], [0.5 * W, 0.16 * L], [0.6 * W, 0.12 * L]],
    [[0.6 * W, 0.12 * L], [0.5 * W, -0.04 * L], [0.36 * W, -0.1 * L], [0.28 * W, -0.16 * L]],
    [[0.28 * W, -0.16 * L], [0.44 * W, -0.3 * L], [0.24 * W, -0.8 * L], [0, -L]],
  ];
  const pts = [];
  seg.forEach((P, k) => {
    for (let i = k === 0 ? 0 : 1; i <= 12; i++) pts.push(bez(P, i / 12));
  });
  return pts;
}

function alocasiaBlatt(c, L, welk, hinten) {
  const W = 0.42 * L;
  const R = pfeilKante(L, W);
  const lappen = R[12];
  const V = fv(c, welk, hinten ? 'alo-h' : 'alo-v', hinten ? ALO_HINTEN : ALO_VORN);
  const ader = welk ? '#e4e3b4' : hinten ? '#bfe0cc' : ALO_ADER;
  const weiss = `stroke="${ader}" stroke-linecap="round"`;
  const U = p2pfad(umriss(R));
  let out = pfad(U, `fill="${V}"`) +
    pfad(p2pfad(R), `fill="#1f3d33" opacity="${welk ? 0.1 : 0.17}"`) +
    linie([0, -L * 0.04], [0, -L * 0.9], `${weiss} stroke-width="0.9" opacity="0.9"`);
  // Weisse Adern: zu jedem Lappen und drei Seitenadern je Seite
  for (const sd of [-1, 1]) {
    out += linie([0, L * 0.02], [sd * lappen[0], lappen[1]], `${weiss} stroke-width="0.6" opacity="0.7"`);
    for (const t of [0.3, 0.5, 0.7]) {
      out += linie([0, -L * t], [sd * W * 0.55, -L * (t + 0.14)], `${weiss} stroke-width="0.5" opacity="0.7"`);
    }
  }
  out += linie([-W * 0.3, -L * 0.35], [-W * 0.22, -L * 0.6], `stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="${welk ? 0.2 : 0.4}"`);
  return out + pfad(U, `fill="none" ${kontur(welk)}`);
}

// Winkel, Stiellaenge, Blattlaenge
const ALO_BLAETTER = {
  1: [[-22, 16, 14], [18, 17, 15]],
  2: [[-30, 24, 17], [-6, 27, 19], [20, 24, 17]],
  3: [[-36, 30, 20], [-14, 34, 22], [10, 33, 22], [32, 28, 19]],
  4: [[-42, 34, 22], [-22, 40, 25], [0, 42, 27], [18, 39, 25], [40, 33, 21]],
};

function alocasia(s, welk, ebene, c) {
  let stiele = '', hinten = '', vorn = '';
  const list = ALO_BLAETTER[s];
  const nh = Math.floor(list.length / 2);
  list.forEach(([a0, S, L], k) => {
    const a = welk ? a0 * 1.3 : a0;
    const ex = S * Math.sin(a * RAD), ey = -S * Math.cos(a * RAD) * (welk ? 0.7 : 1);
    stiele += stiel(c, `M0,0Q${f(ex * 0.1)},${f(ey * 0.6)} ${f(ex)},${f(ey)}`, welk, 1.8, 0, ex);
    const bl = an(ex, ey, welk ? a0 * 0.8 : a0 * 0.25, alocasiaBlatt(c, welk ? L * 0.8 : L, welk, k < nh));
    if (k < nh) hinten += bl; else vorn += bl;
  });
  return stiele + hinten + vorn;
}

// ---------- Olivenbaum ----------
// Knorriger grauer Stamm mit Astgabeln, Krone aus schmalen silbrig-gruenen Blaettern.
// Stufe 4 mit Oliven (gruen und schwarz) an duennen Zweigen.
const OLI_VORN = [[0, '#f0f5df'], [0.5, '#c9d6aa'], [1, '#97a77e']];
const OLI_HINTEN = [[0, '#c6d6cc'], [0.5, '#9db0a6'], [1, '#748a82']];
const OLI_GRUEN = [[0, '#dcf0a4'], [0.5, '#8fb35a'], [1, '#5a7a33']];
const OLI_SCHWARZ = [[0, '#9d92aa'], [0.5, '#4a3f52'], [1, '#231c2a']];
// H Stammhoehe, KR Kronenradius, N Blaetter, L Blattlaenge
const OLI_STUFE = {
  1: { H: 12, KR: 10, N: 12, L: 6.5 },
  2: { H: 20, KR: 13, N: 20, L: 7 },
  3: { H: 28, KR: 16, N: 30, L: 7.5 },
  4: { H: 34, KR: 19, N: 42, L: 8 },
};
// Oliven in Kronen-Koordinaten (Anteil am Kronenradius), nur Stufe 4
const OLI_FRUECHTE = [[-0.5, 0.3], [0.2, 0.55], [0.6, 0.2], [-0.15, 0.85], [0.45, 0.8], [-0.7, -0.1]];

function olive(c, x, y, schwarz, welk) {
  const fill = welk ? rl(c, 'olwelk', [[0, '#e6e1c8'], [1, '#9d9672']])
    : schwarz ? rl(c, 'olschwarz', OLI_SCHWARZ) : rl(c, 'olgruen', OLI_GRUEN);
  const glanz = welk ? '#f0ecd8' : schwarz ? '#b8aec4' : '#e6f5b8';
  return oval(x, y, 2.3, 2.9, `fill="${fill}" ${kontur(welk)}`) +
    oval(x - 0.8, y - 1.1, 0.8, 0.9, `fill="${glanz}" opacity="0.8"`);
}

function olivenbaum(s, welk, ebene, c) {
  const St = OLI_STUFE[s];
  const r = zufall(81 + s);
  const H = St.H, KR = St.KR, cy = -H - KR * 0.35;
  const rinde = welk ? '#8f8a70' : '#7f7d70';
  // Schatten der Krone, Stamm mit zwei Astgabeln (Rinde mit Verlauf)
  let out = oval(0, cy + KR * 0.55, KR * 0.95, KR * 0.35, `fill="${welk ? '#a8a36a' : '#3a6b3a'}" opacity="0.25"`) +
    holz(c, `M0,2C-3,${f(-H * 0.2)} 3,${f(-H * 0.4)} 0,${f(-H * 0.55)}C-4,${f(-H * 0.7)} 2.5,${f(-H * 0.8)} 0,${f(-H * 0.95)}`, s === 1 ? 3.8 : 5, welk, -4, 3) +
    holz(c, `M0,${f(-H * 0.7)}Q${f(KR * 0.2)},${f(-H * 0.82)} ${f(KR * 0.5)},${f(cy + KR * 0.25)}`, s === 1 ? 2.2 : 3, welk, 0, KR * 0.5) +
    holz(c, `M0,${f(-H * 0.6)}Q${f(-KR * 0.2)},${f(-H * 0.8)} ${f(-KR * 0.5)},${f(cy + KR * 0.2)}`, s === 1 ? 2.2 : 3, welk, -KR * 0.5, 0);
  // Knorren und Rindenrisse
  out += oval(-0.8, -H * 0.3, 1.2, 0.7, `fill="${rinde}" opacity="0.8"`) +
    linie([0.6, -H * 0.55], [1.4, -H * 0.5], `stroke="${rinde}" stroke-width="0.6" stroke-linecap="round"`) +
    linie([-1.2, -H * 0.8], [-0.6, -H * 0.72], `stroke="${rinde}" stroke-width="0.6" stroke-linecap="round"`);
  // Krone: schmale, silbrig-gruene Blaetter, nach oben und aussen gerichtet
  const bl = [];
  for (let k = 0; k < St.N; k++) {
    const phi = r() * 2 * Math.PI, rho = Math.sqrt(r()) * 0.92;
    const x = KR * rho * Math.cos(phi), y = cy + KR * 0.7 * rho * Math.sin(phi);
    bl.push({ x, y, rot: (x / KR) * 70 + (r() - 0.5) * 50, L: St.L * (0.85 + 0.3 * r()) });
  }
  // Nach Hoehe sortiert: hoehere Blaetter liegen hinten (zuerst), tiefere vorn (zuletzt)
  bl.sort((p, q) => p.y - q.y);
  bl.forEach((b, k) => {
    const hint = k < bl.length / 2;
    const V = fv(c, welk, hint ? 'oli-h' : 'oli-v', hint ? OLI_HINTEN : OLI_VORN);
    out += an(b.x, b.y, b.rot, blattV(ovalKante(b.L, 0.15 * b.L, false), {
      L: b.L, W: 0.15 * b.L, V, ader: hint ? '#dfe9d6' : '#f4f8e6', welk, seiten: false, glanz: false,
    }));
  });
  if (s === 4) {
    OLI_FRUECHTE.forEach(([dx, dy], j) => {
      const x = KR * dx, y = cy + KR * 0.7 * dy;
      out += linie([x * 0.5, cy - KR * 0.3], [x, y - 2.5], 'stroke="#6b4a3a" stroke-width="0.9" stroke-linecap="round"') +
        olive(c, x, y, j % 2 === 1, welk);
    });
  }
  return out;
}

// ---------- Kentia-Palme ----------
// Mehrere schlanke Wedel, die aus der Erde aufsteigen, sich bogen und ueberhaengen. Schmale, gefiederte Fiedern.
const KEN_V = [[0, '#b4dfa0'], [0.5, '#7fb36e'], [1, '#4a8552']];
const KEN_VD = [[0, '#8fc27e'], [0.5, '#5e9a5e'], [1, '#34663f']];
const KEN_H = [[0, '#9cc9a8'], [0.5, '#6a9c86'], [1, '#3f6f62']];
const KEN_HD = [[0, '#74a58e'], [0.5, '#4f7f72'], [1, '#2d5a52']];
// Wedel: [Endpunkt x (negativ = links), Bogenhoehe]
const KEN_WEDEL = {
  1: [[-16, 26], [14, 28], [-2, 32]],
  2: [[-22, 30], [-6, 36], [12, 36], [24, 30]],
  3: [[-30, 34], [-14, 42], [2, 44], [18, 40], [30, 32]],
  4: [[-36, 36], [-22, 44], [-7, 50], [9, 50], [22, 44], [36, 34], [-42, 22], [42, 24]],
};
const KEN_FIEDER = { 1: 5, 2: 7, 3: 9, 4: 11 };

// Ein Wedel: Spindel als Bezier vom Boden bis zum Endpunkt, Fiedern paarweise hängend nach beiden Seiten
function kentiaWedel(c, X, Y, n, welk, hinten) {
  const P = [[0, 0], [X * 0.1, -Y], [X * 0.85, -Y * 0.8], [X, welk ? 12 : 5]];
  const L = welk ? 6 : 8.5;
  const U = p2pfad(umriss(ovalKante(L, 0.1 * L, false)));
  const hell = fv(c, welk, hinten ? 'ken-h' : 'ken-v', hinten ? KEN_H : KEN_V);
  const dunkel = fv(c, welk, hinten ? 'ken-hd' : 'ken-vd', hinten ? KEN_HD : KEN_VD);
  const ader = welk ? '#e6dca0' : hinten ? '#9fc4b2' : '#d7efb8';
  const kon = welk ? KON_WELK : KON_GRUEN;
  let out = stiel(c, `M0,0C${sp(P[1])} ${sp(P[2])} ${sp(P[3])}`, welk, 1.8, 0, X);
  for (let k = 0; k < n; k++) {
    const t = 0.18 + 0.78 * k / (n - 1);
    const [x, y] = bez(P, t);
    const [x2, y2] = bez(P, t + 0.02);
    const tRot = Math.atan2(x2 - x, -(y2 - y)) / RAD;
    for (const sd of [-1, 1]) {
      out += an(x, y, tRot + sd * (welk ? 95 : 48),
        pfad(U, `fill="${sd > 0 ? hell : dunkel}" stroke="${welk ? '#7d6a45' : '#2f5a30'}" stroke-width="0.35" stroke-linejoin="round"`) +
        linie([0, 0], [0, -L * 0.85], `stroke="${ader}" stroke-width="0.3" stroke-linecap="round" opacity="0.5"`));
    }
  }
  return out;
}

function kentia(s, welk, ebene, c) {
  let hinten = '', vorn = '';
  const tab = KEN_WEDEL[s].slice().sort((p, q) => Math.abs(q[0]) - Math.abs(p[0]));
  const nh = Math.floor(tab.length / 2);
  tab.forEach(([X0, Y0], k) => {
    const X = welk ? X0 * 1.15 : X0, Y = welk ? Y0 * 0.6 : Y0;
    const w = kentiaWedel(c, X, Y, KEN_FIEDER[s], welk, k < nh);
    if (k < nh) hinten += w; else vorn += w;
  });
  return hinten + vorn;
}

// ---------- Feigenbaum ----------
// Stamm mit Astgabeln, grosse dreilappige Blaetter (ein Lappen nach oben, zwei seitlich), Stufe 4 mit lila Feigen.
const FEI_VORN = [[0, '#a6d98c'], [0.5, '#6fae62'], [1, '#3f7a48']];
const FEI_HINTEN = [[0, '#86b8a0'], [0.5, '#56877a'], [1, '#34605c']];
const FEI_N = 96;

// Feigenkante: Grund (0,0), oberster Punkt bei etwa -0.86 L. Radius mit drei Lappen (0, 120 und 240 Grad).
// Liefert Umrisspunkte (Index 0 oben, FEI_N/2 unten am Grund) und den Mittelpunkt C der Blattflaeche.
function feigenKante(L) {
  const R0 = 0.6 * L, cy = -0.4 * L;
  const rad = (th) => R0 * (0.72 + 0.28 * Math.cos(3 * th));
  const shift = -(cy + rad(Math.PI));
  const pts = [];
  for (let k = 0; k <= FEI_N; k++) {
    const th = (2 * Math.PI * k) / FEI_N, r = rad(th);
    pts.push([r * Math.sin(th), cy - r * Math.cos(th) + shift]);
  }
  return { pts, C: [0, cy + shift] };
}

function feigenBlatt(c, L, welk, hinten) {
  const { pts: P, C } = feigenKante(L);
  const n = FEI_N / 2;
  const V = fv(c, welk, hinten ? 'fei-h' : 'fei-v', hinten ? FEI_HINTEN : FEI_VORN);
  const ader = welk ? '#e4e3b4' : hinten ? '#a9cdbb' : '#d2ebb0';
  const U = p2pfad(P);
  let out = pfad(U, `fill="${V}"`) +
    pfad(p2pfad(P.slice(0, n + 1)), `fill="#1f3d33" opacity="${welk ? 0.1 : 0.17}"`) +
    linie([0, -L * 0.02], [0, -L * 0.86], `stroke="${ader}" stroke-width="0.9" stroke-linecap="round" opacity="0.85"`);
  for (const k of [FEI_N / 3, (2 * FEI_N) / 3]) {
    out += linie(C, P[k], `stroke="${ader}" stroke-width="0.6" stroke-linecap="round" opacity="0.6"`);
  }
  out += linie([-L * 0.12, -L * 0.3], [-L * 0.1, -L * 0.5], 'stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.35"');
  return out + pfad(U, `fill="none" ${kontur(welk)}`);
}

// Stufen: Stammhoehe H, Blaetter [x, y (Ansatz am Ast), Winkel, Laenge]
const FEI_STUFE = {
  1: { H: 14, blaetter: [[-10, -30, -36, 13], [9, -31, 34, 13], [0, -36, 0, 12]] },
  2: { H: 22, blaetter: [[-12, -38, -40, 16], [10, -40, 38, 16], [-2, -46, -6, 15], [-18, -30, -70, 12], [16, -30, 70, 12]] },
  3: { H: 30, blaetter: [[-14, -44, -42, 17], [12, -46, 40, 17], [-4, -54, -4, 16], [-24, -34, -72, 15], [22, -36, 72, 15]] },
  4: { H: 40, blaetter: [[-16, -52, -44, 19], [14, -56, 42, 19], [-6, -62, -6, 18], [-28, -42, -74, 17], [26, -44, 74, 17], [0, -48, 0, 15]] },
};
// Feigen (Stufe 4): Mittelpunkt, Stielansatz liegt am Ast
const FEI_FEIGEN = [[-12, -36], [8, -34], [-22, -28], [18, -30]];

function feige(c, x, y, welk) {
  if (welk) return oval(x, y, 3, 3.6, `fill="${rl(c, 'feigewelk', [[0, '#c4b8a8'], [1, '#7d6c5c']])}" ${KON_WELK}`);
  return oval(x, y, 3, 3.8, `fill="${rl(c, 'feige', [[0, '#c49ad8'], [0.5, '#6b3a7a'], [1, '#3a1f48']])}" ${KON_GRUEN}`) +
    oval(x - 0.9, y - 1.2, 1, 1.2, 'fill="#e6cdf0" opacity="0.7"') +
    kreis(x, y + 2.8, 0.5, 'fill="#2a1a2e"');
}

function feigenbaum(s, welk, ebene, c) {
  const St = FEI_STUFE[s];
  const H = St.H;
  let out = holz(c, `M0,2Q-1.5,${f(-H * 0.5)} 0,${-H}`, 4.6, welk, -1.5, 0);
  // Aeste vom Stammende zu den Blattansaetzen, Blaetter zuletzt
  for (const [x, y] of St.blaetter) {
    out += holz(c, `M0,${-H}Q${f(x * 0.3)},${f((y - H) * 0.4 - H)} ${f(x)},${f(y)}`, 2.2, welk, 0, x);
  }
  const nh = Math.floor(St.blaetter.length / 2);
  let hinten = '', vorn = '';
  St.blaetter.forEach(([x, y, rot, L], k) => {
    const hint = k < nh;
    const bl = an(x, y, welk ? rot * 1.2 : rot, feigenBlatt(c, welk ? L * 0.8 : L, welk, hint));
    if (hint) hinten += bl; else vorn += bl;
  });
  out += hinten + vorn;
  if (s === 4) {
    for (const [x, y] of FEI_FEIGEN) {
      out += linie([0, -H * 0.85], [x, y - 3.2], 'stroke="#6b4a3a" stroke-width="0.8" stroke-linecap="round"') + feige(c, x, y, welk);
    }
  }
  return out;
}

// ---------- Bananenstaude ----------
// Pseudostamm aus ineinandergeschobenen Blattscheiden, grosse laengliche Blaetter mit eingerissenem Rand.
// Stufe 4 mit Bananenbuescheln und violetter Bluete.
const BAN_VORN = [[0, '#c4e6a0'], [0.5, '#8dbf6e'], [1, '#5a9a52']];
const BAN_HINTEN = [[0, '#8fbf9c'], [0.5, '#5f9075'], [1, '#3d6b58']];
// S Stammhoehe, blaetter [Winkel, Blattlaenge]
const BAN_STUFE = {
  1: { S: 14, blaetter: [[-50, 20], [-14, 22], [24, 21]] },
  2: { S: 20, blaetter: [[-64, 24], [-30, 28], [0, 30], [34, 27]] },
  3: { S: 26, blaetter: [[-72, 26], [-42, 31], [-12, 33], [16, 33], [46, 30]] },
  4: { S: 30, blaetter: [[-78, 26], [-52, 32], [-24, 36], [2, 38], [28, 36], [54, 32], [76, 26]] },
};

function bananenBlatt(c, L, welk, hinten) {
  const W = 0.17 * L;
  const R = ovalKante(L, W, false);
  const V = fv(c, welk, hinten ? 'ban-h' : 'ban-v', hinten ? BAN_HINTEN : BAN_VORN);
  let out = blattV(R, { L, W, V, ader: hinten ? '#c5e2d2' : '#e8f7d0', welk });
  // Eingerissener Rand: Risse von der Kante ins Blatt
  for (const t of [0.42, 0.66]) {
    const [ex, ey] = R[Math.round(t * 40)];
    out += linie([ex, ey], [ex * 0.35, ey - 0.02 * L], `stroke="${welk ? '#7d6a45' : '#2f5a30'}" stroke-width="0.8" stroke-linecap="round"`);
  }
  return out;
}

function bananenstaude(s, welk, ebene, c) {
  const St = BAN_STUFE[s];
  const S = welk ? St.S * 0.85 : St.S;
  const streifen = welk ? '#a8a36a' : '#477d43';
  let out = stiel(c, `M0,0Q1,${f(-S * 0.5)} 0,${f(-S)}`, welk, 5, -2, 1);
  for (const x of [-1.6, 0.8]) {
    out += linie([x, -2], [x * 0.6, -S + 2], `stroke="${streifen}" stroke-width="0.5" stroke-linecap="round" opacity="0.6"`);
  }
  if (s === 4) {
    // Bananenbuschel haengt unter den Blattansatz, violette Bluete am Ende
    out += stiel(c, `M0,${f(-S + 2)}Q5,${f(-S + 4)} 8,${f(-S + 12)}`, welk, 1.4, 0, 8);
    const gelb = welk ? WELK_STOPS : [[0, '#fff3a8'], [0.5, '#f2d33a'], [1, '#c9a21a']];
    const gelbV = welk ? vl(c, 'welk', WELK_STOPS) : vl(c, 'banane', gelb);
    for (const [x, y] of [[5, -S + 10], [8, -S + 11], [11, -S + 10]]) {
      const d = `M${f(x)},${f(y)}Q${f(x + 5)},${f(y + 2)} ${f(x + 3)},${f(y + 9)}`;
      out += pfad(d, 'fill="none" stroke="#8a6a1a" stroke-width="3.6" stroke-linecap="round"') +
        pfad(d, `fill="none" stroke="${gelbV}" stroke-width="2.4" stroke-linecap="round"`) +
        pfad(d, `fill="none" stroke="${welk ? '#f0e6b8' : '#fff9d0'}" stroke-width="0.7" stroke-linecap="round" opacity="0.7"`);
    }
    const bluete = fv(c, welk, 'bluete', [[0, '#b86ab0'], [0.6, '#7a3577'], [1, '#4a1d4a']]);
    out += oval(9, -S + 21, 2.2, 3.6, `transform="rotate(10 9 ${f(-S + 21)})" fill="${bluete}" ${kontur(welk)}`) +
      oval(8.4, -S + 19.6, 0.9, 1.4, `fill="${welk ? '#c9b09a' : '#e2a8dc'}" opacity="0.7"`);
  }
  // Bananenblaetter: breit, laenglich, mit Mittelader und Seitenadern. Hinten zuerst, vorn zuletzt.
  const tab = St.blaetter.slice().sort((p, q) => Math.abs(q[0]) - Math.abs(p[0]));
  const nh = Math.floor(tab.length / 2);
  let hinten = '', vorn = '';
  tab.forEach(([a, L], k) => {
    const bl = an(0, -S, welk ? a * 1.1 : a, bananenBlatt(c, welk ? L * 0.8 : L, welk, k < nh));
    if (k < nh) hinten += bl; else vorn += bl;
  });
  return out + hinten + vorn;
}

// ---------- Kannenpflanze ----------
// Blaetter mit Ranken, an denen gruen-rote, bauchige Kannen mit Deckel ueber den Topfrand haengen.
const KAN_VORN = [[0, '#b4e2a0'], [0.5, '#7fb873'], [1, '#4a8552']];
const KAN_HINTEN = [[0, '#94c4a6'], [0.5, '#5c8f76'], [1, '#36604f']];
const KAN_BLAETTER = {
  1: [[-40, 9, 9], [28, 10, 9]],
  2: [[-50, 10, 10], [-14, 13, 11], [22, 11, 10], [50, 9, 9]],
  3: [[-56, 11, 11], [-24, 14, 12], [4, 15, 12], [30, 13, 11], [58, 11, 10]],
  4: [[-60, 12, 12], [-32, 15, 13], [-10, 17, 13], [14, 16, 12], [38, 14, 12], [62, 12, 11]],
};
// Ranken: [Seite (+1 rechts, -1 links), Endhoehe der Kanne, Kannengroesse]
const KAN_RANKEN = {
  1: [[1, 14, 0.75]],
  2: [[1, 14, 0.85]],
  3: [[1, 14, 1], [-1, 18, 0.9]],
  4: [[1, 16, 1], [-1, 20, 1], [-1, 6, 0.8]],
};

// Kanne: Ansatz (x,y) oben am Deckel, bauchiger Korpus nach unten, Mund unter dem Deckel, k = Groesse
function kanne(c, x, y, k, welk) {
  const K = ([px, py]) => [x + px * k, y + py * k];
  const form = [[0, 0], [1.6, 1], [3.2, 3], [3.8, 6], [3.2, 9], [1.8, 11.2], [0, 12], [-1.8, 11.2], [-3.2, 9], [-3.8, 6], [-3.2, 3], [-1.6, 1]];
  const rot = welk ? '#a6845a' : '#b8402e';
  const rechts = [[0, 0], [1.6, 1], [3.2, 3], [3.8, 6], [3.2, 9], [1.8, 11.2], [0, 12]].map(K);
  const V = welk ? vl(c, 'welk', WELK_STOPS) : vl(c, 'kanne', [[0, '#c3ecae'], [0.45, '#8fc27a'], [1, '#4f8a4a']]);
  let out = pfad(glattGeschlossen(form.map(K)), `fill="${V}"`) +
    pfad(glattGeschlossen(rechts), 'fill="#1f3d33" opacity="0.2"');
  // Rote Maserung auf dem Korpus
  for (const [sx, sy] of [[-1.8, 3.5], [1.6, 4.5], [-0.8, 7], [1.5, 8.5], [-1.9, 9]]) {
    const [ax, ay] = K([sx, sy]);
    out += linie([ax, ay], [ax + 0.4 * k, ay + 1.6 * k], `stroke="${rot}" stroke-width="${f(0.9 * k)}" stroke-linecap="round" opacity="0.8"`);
  }
  const [gx, gy] = K([-2.4, 3]), [hx, hy] = K([-2.6, 8]);
  out += linie([gx, gy], [hx, hy], 'stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.5"');
  // Mund (rot umrandet) und Deckel darueber
  const [mx, my] = K([0, 1.2]);
  out += oval(mx, my, 1.8 * k, 0.7 * k, `fill="${rot}" stroke="#5a2a1a" stroke-width="0.5"`);
  const [dx, dy] = K([0, -1.4]);
  const deckel = fv(c, welk, 'deckel', [[0, '#d4f0b8'], [1, '#5a9a52']]);
  out += oval(dx, dy, 2.6 * k, 1.7 * k, `transform="rotate(-12 ${f(dx)} ${f(dy)})" fill="${deckel}" ${kontur(welk)}`);
  return out + oval(dx, dy, 1.6 * k, 0.9 * k, `transform="rotate(-12 ${f(dx)} ${f(dy)})" fill="#3a6b3a" opacity="0.3"`);
}

function kannenpflanze(s, welk, ebene, c) {
  let stiele = '', hinten = '', vorn = '', ranken = '', kannen = '';
  const list = KAN_BLAETTER[s];
  const nh = Math.floor(list.length / 2);
  list.forEach(([a0, S, L], k) => {
    const a = welk ? a0 * 1.25 : a0;
    const ex = S * Math.sin(a * RAD), ey = -S * Math.cos(a * RAD) * (welk ? 0.5 : 1);
    stiele += stiel(c, `M0,0Q${f(ex * 0.1)},${f(ey * 0.6)} ${f(ex)},${f(ey)}`, welk, 2, 0, ex);
    const rot = welk ? (a0 < 0 ? -140 : 140) : a0 * 0.4;
    const hint = k < nh;
    const V = fv(c, welk, hint ? 'kan-h' : 'kan-v', hint ? KAN_HINTEN : KAN_VORN);
    const bl = an(ex, ey, rot, blattV(ovalKante(L, 0.42 * L, true), { L, W: 0.42 * L, V, ader: hint ? '#c5e2d2' : '#e2f5d4', welk }));
    if (hint) hinten += bl; else vorn += bl;
  });
  for (const [sg, fall, k] of KAN_RANKEN[s]) {
    const Rk = rankePfad(sg, fall, ebene);
    ranken += stiel(c, Rk.d, welk, 1.4, Rk.S[0], Rk.E[0]);
    kannen += kanne(c, Rk.E[0], Rk.E[1], k, welk);
  }
  return stiele + hinten + ranken + vorn + kannen;
}

// ---------- Wachsblume (Hoya) ----------
// Rankende Triebe ueber den Topfrand mit dicken, wachsigen, ovalen Blaettern in Paaren.
// Stufe 3 Knospen, Stufe 4 sternfoermige rosa-weisse Bluetendolden an den Triebspitzen.
const HOY_VORN = [[0, '#d6efbe'], [0.5, '#9cc98a'], [1, '#5e9356']];
const HOY_HINTEN = [[0, '#a2c8b6'], [0.5, '#6b9b8a'], [1, '#3f6a62']];
const HOY_ROSA = [[0, '#ffe3ec'], [0.55, '#f2a7bd'], [1, '#c96a8c']];
// Triebe: [Seite, Endhoehe]
const HOY_RANKEN = { 1: [[1, 10]], 2: [[1, 12], [-1, 14]], 3: [[1, 18], [-1, 16]], 4: [[1, 24], [-1, 20], [1, 13]] };
const HOY_BLATT_N = { 1: 3, 2: 4, 3: 5, 4: 6 };

// Wachsiges Blatt: Grund (0,0), Spitze (0,-L), dicke Form mit Glanzfleck
function hoyaBlatt(c, L, welk, hinten) {
  const V = fv(c, welk, hinten ? 'hoy-h' : 'hoy-v', hinten ? HOY_HINTEN : HOY_VORN);
  return blattV(ovalKante(L, 0.5 * L, false), {
    L, W: 0.5 * L, V, ader: hinten ? '#7fa898' : '#4f8a4c', welk, seiten: false, glanz: false,
  }) + oval(-0.2 * L, -0.5 * L, 0.12 * L, 0.2 * L, `fill="#ffffff" opacity="${welk ? 0.2 : 0.5}"`);
}

// Einzelner Stern aus fuenf Blueten-Blaettchen mit heller Mitte
function hoyaStern(c, x, y, welk) {
  const blatt = fv(c, welk, 'blute', HOY_ROSA);
  const weiss = welk ? '#e6d8c8' : '#fff4f7';
  let out = '';
  for (let j = 0; j < 5; j++) {
    out += an(x, y, j * 72, oval(0, -2, 1, 2, `fill="${blatt}" ${kontur(welk)}`));
  }
  return out + kreis(x, y, 1.1, `fill="${weiss}"`) + kreis(x, y, 0.5, welk ? '#9c8b7a' : '#d9587a');
}

// Bluetendolde: sieben Sterne zu einer Kugel gruppiert, Mittelpunkt (x,y)
function hoyaDolde(c, x, y, welk) {
  const pos = [[0, 0], [-3.4, 1.4], [3.4, 1.4], [0, 3.6], [-1.8, -2.6], [2, -2.6], [0, -5]];
  return pos.map(([dx, dy]) => hoyaStern(c, x + dx, y + dy, welk)).join('');
}

function hoyaKnospe(c, x, y, welk) {
  return oval(x, y, 1.4, 2, `fill="${fv(c, welk, 'knospe', [[0, '#d6f0b8'], [1, '#6f9f5a']])}" ${kontur(welk)}`) +
    kreis(x + 0.3, y - 0.8, 0.5, `fill="${welk ? '#d8c4b0' : '#f2a7bd'}"`);
}

function hoya(s, welk, ebene, c) {
  let triebe = '', hinten = '', vorn = '', bluten = '';
  HOY_RANKEN[s].forEach(([sg, fall], j) => {
    const Rk = rankePfad(sg, fall, ebene);
    triebe += stiel(c, Rk.d, welk, 1.2, Rk.S[0], Rk.E[0]);
    const n = HOY_BLATT_N[s];
    for (let k = 0; k < n; k++) {
      const t = 0.3 + 0.65 * k / (n - 1);
      const [x, y] = qb(Rk.S, Rk.C, Rk.E, t);
      const rot = welk ? sg * 150 : sg * 60 + (k % 2 ? 25 : -25);
      const hint = !welk && k % 2 === 0;
      const bl = an(x, y, rot, hoyaBlatt(c, welk ? 6.5 : 8, welk, hint));
      if (hint) hinten += bl; else vorn += bl;
    }
    const [ex, ey] = Rk.E;
    if (s === 3 && j === 0) bluten += hoyaKnospe(c, ex, ey + 2, welk);
    if (s === 4 && j < 2) bluten += hoyaDolde(c, ex, ey + 3, welk);
    if (s === 4 && j === 2) bluten += hoyaKnospe(c, ex, ey + 2, welk);
  });
  return triebe + hinten + vorn + bluten;
}

// Glatter geschlossener Pfad durch Punkte (Catmull-Rom als kubische Beziers), lokal kopiert aus pflanzen.js
function glattGeschlossen(pts) {
  const n = pts.length;
  let d = `M${p2(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n], e = pts[(i + 2) % n];
    const k1 = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6];
    const k2 = [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6];
    d += `C${p2(k1)} ${p2(k2)} ${p2(c)}`;
  }
  return d + 'Z';
}

// ---------- Zusammensetzen ----------
// Pflanzen mit kleinem Topf (Radius EF_R, Hoehe 16); alle anderen bekommen den grossen Topf
const KLEIN = ['kannenpflanze', 'hoya'];
const FIGUREN = { strelitzie, alocasia, olivenbaum, kentia, feigenbaum, kannenpflanze, bananenstaude, hoya };

function zeichnePflanze(typ, stufe, welk, ebene) {
  const s = Math.min(4, Math.max(1, Math.round(Number(stufe) || 1)));
  const klein = KLEIN.includes(typ);
  const R = klein ? EF_R : 16, H = klein ? 16 : 22;
  const c = kontext();
  const inhalt = FIGUREN[typ](s, welk, ebene, c);
  const laub = welk ? fallLaub(ebene, c) : '';
  return topf(R, H) +
    gruppe(`transform="translate(0,${-H}) rotate(${welk ? 8 : 0})"`, defsOf(c) + inhalt) +
    laub;
}

// ebene: 'boden' (Standard) oder 'brett' (Stellplatz auf einem Moebel)
export const PFLANZEN2 = {
  strelitzie: { name: 'Strelitzie', groesse: 'gross', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('strelitzie', stufe, welk, ebene) },
  alocasia: { name: 'Alocasia', groesse: 'gross', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('alocasia', stufe, welk, ebene) },
  olivenbaum: { name: 'Olivenbaum', groesse: 'gross', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('olivenbaum', stufe, welk, ebene) },
  kentia: { name: 'Kentia-Palme', groesse: 'gross', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('kentia', stufe, welk, ebene) },
  feigenbaum: { name: 'Feigenbaum', groesse: 'gross', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('feigenbaum', stufe, welk, ebene) },
  kannenpflanze: { name: 'Kannenpflanze', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('kannenpflanze', stufe, welk, ebene) },
  bananenstaude: { name: 'Bananenstaude', groesse: 'gross', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('bananenstaude', stufe, welk, ebene) },
  hoya: { name: 'Wachsblume (Hoya)', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('hoya', stufe, welk, ebene) },
};
