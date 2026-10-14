// Spaetspiel-Topfpflanzen (Level 6 bis 16) als SVG-Strings, gleiche Schnittstelle wie PFLANZEN in pflanzen.js.
// zeichne(stufe, welk, ebene) liefert Topf und Pflanze mit Ursprung (0,0) = Mitte der Topf-Unterkante,
// ohne Positionierung und ohne Skalierung. Stufe 1 bis 4 wachsen deutlich.
// ebene: 'boden' (Standard) oder 'brett' (Stellplatz auf einem Moebel).

import { f, p2, gruppe, pfad, linie, oval, kreis, qb, zufall } from './hilfen.js';

const RAD = Math.PI / 180;
const EF_R = 10; // Radius des kleinen Topfs

// Konturen wie in pflanzen.js: Topf braun, Blaetter, Stiele und Bluetenblaetter dunkelgruen (welk: Erdton).
const KON_TOPF = 'stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';
const KON_GRUEN = 'stroke="#2f5a30" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const KON_WELK = 'stroke="#7d6a45" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const kontur = (welk) => (welk ? KON_WELK : KON_GRUEN);
// Innenlinien (Adern)
const ADER = 'stroke="#3a6b3a" stroke-width="0.5" stroke-linecap="round" opacity="0.6"';

// Gruene Toene (Licht/Schatten) und Welk-Toene wie in pflanzen.js
const GRUEN = [
  { hell: '#7fb069', dunkel: '#5e9a52', welk: false },
  { hell: '#9ccc7a', dunkel: '#7fb069', welk: false },
];
const WELK = { hell: '#c4c98f', dunkel: '#a8a36a', welk: true };
const farben = (i, welk) => (welk ? WELK : GRUEN[i % 2]);

// Holz (Stamm, Aeste) und Welk-Holz
const HOLZ = { grund: '#c98f5a', schatten: '#a86b43', licht: '#e2b07c' };
const HOLZ_WELK = { grund: '#c9b07a', schatten: '#a8966a', licht: '#e6d3a4' };

// ---------- Topf (Terrakotta, Kegelstumpf mit Ellipse oben) ----------
function topf(R, H) {
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
function fallLaub(ebene) {
  const stellen = ebene === 'brett'
    ? [[-18, 9, 20], [-9, 4, -20]]
    : [[13, 7, -35], [-12, 8, 30], [2, 11, -5]];
  return stellen.map(([x, y, w]) => fallBlatt(x, y, w)).join('');
}

// Ein abgefallenes Blatt: Laenge 5, Breite 2.5, flach liegend (y-Ausdehnung halbiert), um w Grad gedreht.
function fallBlatt(x, y, w) {
  const L = 5;
  const halb = ovalKante(L, 2.5, false);
  const rand = halb.concat(halb.slice().reverse().map(([px, py]) => [-px, py]));
  const c = Math.cos(w * RAD), s = Math.sin(w * RAD);
  const tf = ([px, py]) => [x + px * c - py * s, y + (px * s + py * c) * 0.5];
  const umriss = 'M' + rand.map(tf).map(p2).join('L') + 'Z';
  return pfad(umriss, 'fill="#b8955f" stroke="#7d6a45" stroke-width="0.6" stroke-linejoin="round"') +
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

// Zweiteilige Flaeche: rechte Haelfte dunkel, linke Haelfte hell (Licht von links)
function zweiseitig(R, hell, dunkel) {
  return pfad(p2pfad(R), `fill="${dunkel}"`) +
    pfad(p2pfad(R.map(([x, y]) => [-x, y]).reverse()), `fill="${hell}"`);
}

// Blatt aus rechter Kante R (Grund (0,0), Spitze (0,-L)). Linke Haelfte heller (Licht von links), rechte dunkler.
// o: { L, W, hell, dunkel, welk }. Mittelader, Seitenadern, Glanzstrich und Kontur.
function blatt(R, o) {
  const { L, W, hell, dunkel, welk } = o;
  const Lk = R.map(([x, y]) => [-x, y]);
  const lk = Lk.slice().reverse();
  let out = pfad(p2pfad(R), `fill="${dunkel}"`) +
    pfad(p2pfad(lk), `fill="${hell}"`);
  out += linie([0, 0], [0, -L * 0.92], `${ADER}`);
  for (const t of [0.3, 0.5, 0.7]) {
    for (const s of [-1, 1]) {
      out += linie([0, -L * t], [s * W * 0.4, -L * (t + 0.12)], `${ADER}`);
    }
  }
  out += pfad(p2pfad(R.concat(lk)), `fill="none" ${kontur(welk)}`);
  out += linie([-W * 0.3, -L * 0.2], [-W * 0.2, -L * 0.5], 'stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="0.45"');
  return out;
}

// Stiel mit dunkler Kontur, Farbkern und Glanzlinie
function stiel(d, welk, w = 3.2) {
  const [rand, aussen, innen] = welk ? ['#7d6a45', '#a8a36a', '#c4c98f'] : ['#2f5a30', '#477d43', '#7fb069'];
  return pfad(d, `fill="none" stroke="${rand}" stroke-width="${f(w + 1.4)}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${aussen}" stroke-width="${w}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${innen}" stroke-width="${f(w * 0.55)}" stroke-linecap="round"`);
}

// Holzstrich (Stamm, Ast): dunkle Kontur, Holzfarbe, heller Streifen links, Schatten rechts
function holzStrich(d, w, T) {
  return pfad(d, `fill="none" stroke="#6b4a3a" stroke-width="${f(w + 1.2)}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${T.grund}" stroke-width="${w}" stroke-linecap="round"`) +
    gruppe(`transform="translate(${f(-w * 0.22)},0)"`, pfad(d, `fill="none" stroke="${T.licht}" stroke-width="${f(w * 0.3)}" stroke-linecap="round" opacity="0.8"`)) +
    gruppe(`transform="translate(${f(w * 0.25)},0)"`, pfad(d, `fill="none" stroke="${T.schatten}" stroke-width="${f(w * 0.3)}" stroke-linecap="round" opacity="0.6"`));
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
const STR = { hell: '#8fc0b0', dunkel: '#5f9486', welk: false };
const ORANGE = { hell: '#f7a23a', dunkel: '#e0701f' };
const BLAU = { hell: '#6fb4e8', dunkel: '#2f7fc1' };

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
function kelchBlatt(L, W, c, welk) {
  const R = ovalKante(L, W, false);
  const T = welk ? WELK : c;
  return zweiseitig(R, T.hell, T.dunkel) +
    linie([0, -L * 0.1], [0, -L * 0.8], `stroke="${T.dunkel}" stroke-width="0.5" opacity="0.7"`) +
    pfad(p2pfad(umriss(R)), `fill="none" ${welk ? KON_WELK : 'stroke="#8a3f12" stroke-width="0.7" stroke-linejoin="round"'}`);
}

// Bluetenkopf in lokalen Koordinaten (Ursprung = Ansatz am Stiel): Scheide, Kelchblaetter, blaue Zunge
function strelitzieKopf(welk, offen) {
  const sch = welk ? '#c9a46a' : '#7c6f9e', grn = welk ? '#c4c98f' : '#8fa27a';
  let out = pfad('M-4,1Q-5,-6 0,-9Q4,-6 4,1Q0,3 -4,1Z', `fill="${sch}" ${kontur(welk)}`) +
    pfad('M-4,1Q-5,-6 0,-9Q-1,-4 -1,1Z', `fill="${grn}" opacity="0.8"`);
  if (!offen) return out + an(0, -6, 0, kelchBlatt(7, 2.2, ORANGE, welk));
  for (const [rot, L, W] of [[-26, 13, 3.4], [-4, 14, 3.6], [18, 13, 3.4]]) {
    out += an(0, -5, rot, kelchBlatt(L, W, ORANGE, welk));
  }
  return out + an(0, -5, 62, kelchBlatt(12, 2.6, BLAU, welk));
}

// Winkel, Stiellaenge, Blattlaenge, halbe Breite
const STR_BLAETTER = {
  1: [[-38, 16, 13, 4], [30, 18, 14, 4.5]],
  2: [[-46, 20, 17, 5], [-12, 24, 19, 5.5], [24, 22, 18, 5], [48, 18, 15, 4.5]],
  3: [[-52, 24, 21, 6], [-22, 28, 23, 6.5], [6, 30, 22, 6], [34, 26, 21, 6], [56, 22, 17, 5]],
  4: [[-58, 28, 25, 7], [-30, 33, 27, 7.5], [-8, 36, 26, 7], [16, 35, 27, 7.5], [40, 30, 24, 6.5], [62, 26, 20, 5.5]],
};

function strelitzie(s, welk) {
  let stiele = '', blaetter = '';
  const tab = STR_BLAETTER[s].map(([a0, S, L, W], i) => ({ a0, S, L, W, i }))
    .sort((p, q) => Math.abs(q.a0) - Math.abs(p.a0) || p.i - q.i);
  for (const b of tab) {
    const a = welk ? b.a0 * 1.2 : b.a0;
    const ex = b.S * Math.sin(a * RAD), ey = -b.S * Math.cos(a * RAD) * (welk ? 0.6 : 1);
    stiele += stiel(`M0,0Q${f(ex * 0.15)},${f(ey * 0.8)} ${f(ex)},${f(ey)}`, welk, 2.6);
    const rot = welk ? (b.a0 < 0 ? -150 : 150) : a * 0.6;
    blaetter += an(ex, ey, rot, blatt(paddelKante(b.L, b.W), { L: b.L, W: b.W, ...(welk ? WELK : STR) }));
  }
  if (s === 3) {
    stiele += stiel('M0,0Q2,-18 5,-36', welk, 2.4);
    blaetter += an(5, -36, welk ? 20 : 12, strelitzieKopf(welk, false));
  }
  if (s === 4) {
    stiele += stiel('M0,0Q2,-22 7,-46', welk, 2.4);
    blaetter += an(7, -46, welk ? 20 : 12, strelitzieKopf(welk, true));
  }
  return stiele + blaetter;
}

// ---------- Alocasia ----------
// Pfeilfoermige, dunkelgruene Blaetter mit weissen Adern, aufrecht an langen, duennen Stielen.
const ALO = { hell: '#4f8a4c', dunkel: '#2f5a30', welk: false };
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

function alocasiaBlatt(L, welk) {
  const T = welk ? WELK : ALO;
  const W = 0.42 * L;
  const R = pfeilKante(L, W);
  const lappen = R[12];
  const ader = welk ? '#e4e3b4' : ALO_ADER;
  const weiss = `stroke="${ader}" stroke-linecap="round"`;
  let out = zweiseitig(R, T.hell, T.dunkel) +
    linie([0, -L * 0.04], [0, -L * 0.9], `${weiss} stroke-width="0.9" opacity="0.9"`);
  // Weisse Adern: zu jedem Lappen und drei Seitenadern je Seite
  for (const sd of [-1, 1]) {
    out += linie([0, L * 0.02], [sd * lappen[0], lappen[1]], `${weiss} stroke-width="0.6" opacity="0.7"`);
    for (const t of [0.3, 0.5, 0.7]) {
      out += linie([0, -L * t], [sd * W * 0.55, -L * (t + 0.14)], `${weiss} stroke-width="0.5" opacity="0.7"`);
    }
  }
  out += linie([-W * 0.3, -L * 0.35], [-W * 0.22, -L * 0.6], 'stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.35"');
  return out + pfad(p2pfad(umriss(R)), `fill="none" ${kontur(welk)}`);
}

// Winkel, Stiellaenge, Blattlaenge
const ALO_BLAETTER = {
  1: [[-22, 16, 14], [18, 17, 15]],
  2: [[-30, 24, 17], [-6, 27, 19], [20, 24, 17]],
  3: [[-36, 30, 20], [-14, 34, 22], [10, 33, 22], [32, 28, 19]],
  4: [[-42, 34, 22], [-22, 40, 25], [0, 42, 27], [18, 39, 25], [40, 33, 21]],
};

function alocasia(s, welk) {
  let stiele = '', blaetter = '';
  for (const [a0, S, L] of ALO_BLAETTER[s]) {
    const a = welk ? a0 * 1.3 : a0;
    const ex = S * Math.sin(a * RAD), ey = -S * Math.cos(a * RAD) * (welk ? 0.7 : 1);
    stiele += stiel(`M0,0Q${f(ex * 0.1)},${f(ey * 0.6)} ${f(ex)},${f(ey)}`, welk, 1.8);
    blaetter += an(ex, ey, welk ? a0 * 0.8 : a0 * 0.25, alocasiaBlatt(welk ? L * 0.8 : L, welk));
  }
  return stiele + blaetter;
}

// ---------- Olivenbaum ----------
// Knorriger grauer Stamm mit Astgabeln, Krone aus schmalen silbrig-gruenen Blaettern.
// Stufe 4 mit Oliven (gruen und schwarz) an duennen Zweigen.
const OLI = { hell: '#c9d5b8', dunkel: '#9aaa86', welk: false };
const OLI_HOLZ = { grund: '#a9a797', schatten: '#7f7d70', licht: '#d4d1bf' };
const OLI_HOLZ_WELK = { grund: '#b8b296', schatten: '#8f8a70', licht: '#d9d3b5' };
// H Stammhoehe, KR Kronenradius, N Blaetter, L Blattlaenge
const OLI_STUFE = {
  1: { H: 12, KR: 10, N: 12, L: 6.5 },
  2: { H: 20, KR: 13, N: 20, L: 7 },
  3: { H: 28, KR: 16, N: 30, L: 7.5 },
  4: { H: 34, KR: 19, N: 42, L: 8 },
};
// Oliven in Kronen-Koordinaten (Anteil am Kronenradius), nur Stufe 4
const OLI_FRUECHTE = [[-0.5, 0.3], [0.2, 0.55], [0.6, 0.2], [-0.15, 0.85], [0.45, 0.8], [-0.7, -0.1]];

function olive(x, y, schwarz, welk) {
  const fill = welk ? '#b5b08c' : schwarz ? '#3b3142' : '#8fb35a';
  const glanz = welk ? '#e6e1c8' : schwarz ? '#8a7f96' : '#c5e08f';
  return oval(x, y, 2.3, 2.9, `fill="${fill}" ${kontur(welk)}`) +
    oval(x - 0.8, y - 1.1, 0.8, 0.9, `fill="${glanz}"`);
}

function olivenbaum(s, welk) {
  const St = OLI_STUFE[s];
  const r = zufall(81 + s);
  const T = welk ? OLI_HOLZ_WELK : OLI_HOLZ;
  const H = St.H, KR = St.KR, cy = -H - KR * 0.35;
  // Schatten der Krone, Stamm mit zwei Astgabeln
  let out = oval(0, cy + KR * 0.55, KR * 0.95, KR * 0.35, `fill="${welk ? '#a8a36a' : '#3a6b3a'}" opacity="0.25"`) +
    holzStrich(`M0,2C-3,${f(-H * 0.2)} 3,${f(-H * 0.4)} 0,${f(-H * 0.55)}C-4,${f(-H * 0.7)} 2.5,${f(-H * 0.8)} 0,${f(-H * 0.95)}`, s === 1 ? 3.8 : 5, T) +
    holzStrich(`M0,${f(-H * 0.7)}Q${f(KR * 0.2)},${f(-H * 0.82)} ${f(KR * 0.5)},${f(cy + KR * 0.25)}`, s === 1 ? 2.2 : 3, T) +
    holzStrich(`M0,${f(-H * 0.6)}Q${f(-KR * 0.2)},${f(-H * 0.8)} ${f(-KR * 0.5)},${f(cy + KR * 0.2)}`, s === 1 ? 2.2 : 3, T);
  // Knorren und Rindenrisse
  out += oval(-0.8, -H * 0.3, 1.2, 0.7, `fill="${T.schatten}" opacity="0.8"`) +
    linie([0.6, -H * 0.55], [1.4, -H * 0.5], `stroke="${T.schatten}" stroke-width="0.6" stroke-linecap="round"`) +
    linie([-1.2, -H * 0.8], [-0.6, -H * 0.72], `stroke="${T.schatten}" stroke-width="0.6" stroke-linecap="round"`);
  // Krone: schmale, silbrig-gruene Blaetter, nach oben und aussen gerichtet
  const bl = [];
  for (let k = 0; k < St.N; k++) {
    const phi = r() * 2 * Math.PI, rho = Math.sqrt(r()) * 0.92;
    const x = KR * rho * Math.cos(phi), y = cy + KR * 0.7 * rho * Math.sin(phi);
    bl.push({ x, y, rot: (x / KR) * 70 + (r() - 0.5) * 50, L: St.L * (0.85 + 0.3 * r()) });
  }
  bl.sort((p, q) => p.y - q.y);
  for (const b of bl) {
    out += an(b.x, b.y, b.rot, blatt(ovalKante(b.L, 0.15 * b.L, false), { L: b.L, W: 0.15 * b.L, ...(welk ? WELK : OLI) }));
  }
  if (s === 4) {
    OLI_FRUECHTE.forEach(([dx, dy], j) => {
      const x = KR * dx, y = cy + KR * 0.7 * dy;
      out += linie([x * 0.5, cy - KR * 0.3], [x, y - 2.5], 'stroke="#6b4a3a" stroke-width="0.9" stroke-linecap="round"') +
        olive(x, y, j % 2 === 1, welk);
    });
  }
  return out;
}

// ---------- Kentia-Palme ----------
// Mehrere schlanke Wedel, die aus der Erde aufsteigen, sich bogen und ueberhaengen. Schmale, gefiederte Fiedern.
const KEN = { hell: '#86bb70', dunkel: '#4f8a4c' };
// Wedel: [Endpunkt x (negativ = links), Bogenhoehe]
const KEN_WEDEL = {
  1: [[-16, 26], [14, 28], [-2, 32]],
  2: [[-22, 30], [-6, 36], [12, 36], [24, 30]],
  3: [[-30, 34], [-14, 42], [2, 44], [18, 40], [30, 32]],
  4: [[-36, 36], [-22, 44], [-7, 50], [9, 50], [22, 44], [36, 34], [-42, 22], [42, 24]],
};
const KEN_FIEDER = { 1: 5, 2: 7, 3: 9, 4: 11 };

// Ein Wedel: Spindel als Bezier vom Boden bis zum Endpunkt, Fiedern paarweise hängend nach beiden Seiten
function kentiaWedel(X, Y, n, welk) {
  const T = welk ? WELK : KEN;
  const P = [[0, 0], [X * 0.1, -Y], [X * 0.85, -Y * 0.8], [X, welk ? 12 : 5]];
  const L = welk ? 6 : 8.5;
  const R = ovalKante(L, 0.1 * L, false);
  const fiederA = pfad(p2pfad(umriss(R)), `fill="${T.hell}" stroke="#2f5a30" stroke-width="0.35" stroke-linejoin="round"`);
  const fiederB = pfad(p2pfad(umriss(R)), `fill="${T.dunkel}" stroke="#2f5a30" stroke-width="0.35" stroke-linejoin="round"`);
  let out = stiel(`M0,0C${sp(P[1])} ${sp(P[2])} ${sp(P[3])}`, welk, 1.8);
  for (let k = 0; k < n; k++) {
    const t = 0.18 + 0.78 * k / (n - 1);
    const [x, y] = bez(P, t);
    const [x2, y2] = bez(P, t + 0.02);
    const tRot = Math.atan2(x2 - x, -(y2 - y)) / RAD;
    for (const sd of [-1, 1]) {
      out += an(x, y, tRot + sd * (welk ? 95 : 48), sd > 0 ? fiederA : fiederB);
    }
  }
  return out;
}

function kentia(s, welk) {
  let out = '';
  const tab = KEN_WEDEL[s].slice().sort((p, q) => Math.abs(q[0]) - Math.abs(p[0]));
  for (const [X0, Y0] of tab) {
    const X = welk ? X0 * 1.15 : X0, Y = welk ? Y0 * 0.6 : Y0;
    out += kentiaWedel(X, Y, KEN_FIEDER[s], welk);
  }
  return out;
}

// ---------- Feigenbaum ----------
// Stamm mit Astgabeln, grosse dreilappige Blaetter (ein Lappen nach oben, zwei seitlich), Stufe 4 mit lila Feigen.
const FEI = { hell: '#7fb069', dunkel: '#4f8a4c' };
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

function feigenBlatt(L, welk) {
  const T = welk ? WELK : FEI;
  const { pts: P, C } = feigenKante(L);
  const n = FEI_N / 2;
  let out = pfad(p2pfad(P.slice(0, n + 1)), `fill="${T.dunkel}"`) +
    pfad(p2pfad(P.slice(n)), `fill="${T.hell}"`);
  out += linie([0, -L * 0.02], [0, -L * 0.86], `stroke="${welk ? '#e4e3b4' : '#b9d99a'}" stroke-width="0.9" stroke-linecap="round" opacity="0.85"`);
  for (const k of [FEI_N / 3, (2 * FEI_N) / 3]) {
    out += linie(C, P[k], `stroke="${welk ? '#e4e3b4' : '#b9d99a'}" stroke-width="0.6" stroke-linecap="round" opacity="0.6"`);
  }
  out += linie([-L * 0.12, -L * 0.3], [-L * 0.1, -L * 0.5], 'stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.35"');
  return out + pfad(p2pfad(P), `fill="none" ${kontur(welk)}`);
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

function feige(x, y, welk) {
  if (welk) return oval(x, y, 3, 3.6, `fill="#9c8b7a" ${KON_WELK}`);
  return oval(x, y, 3, 3.8, `fill="#6b3a7a" ${KON_GRUEN}`) +
    oval(x - 0.9, y - 1.2, 1, 1.2, 'fill="#b08ac4" opacity="0.8"') +
    kreis(x, y + 2.8, 0.5, 'fill="#2a1a2e"');
}

function feigenbaum(s, welk) {
  const St = FEI_STUFE[s];
  const T = welk ? HOLZ_WELK : HOLZ;
  const H = St.H;
  let out = holzStrich(`M0,2Q-1.5,${f(-H * 0.5)} 0,${-H}`, 4.6, T);
  // Aeste vom Stammende zu den Blattansaetzen, Blaetter zuletzt (weiter aussen zuerst)
  for (const [x, y] of St.blaetter) {
    out += holzStrich(`M0,${-H}Q${f(x * 0.3)},${f((y - H) * 0.4 - H)} ${f(x)},${f(y)}`, 2.2, T);
  }
  for (const [x, y, rot, L] of St.blaetter) {
    out += an(x, y, welk ? rot * 1.2 : rot, feigenBlatt(welk ? L * 0.8 : L, welk));
  }
  if (s === 4) {
    for (const [x, y] of FEI_FEIGEN) {
      out += linie([0, -H * 0.85], [x, y - 3.2], 'stroke="#6b4a3a" stroke-width="0.8" stroke-linecap="round"') + feige(x, y, welk);
    }
  }
  return out;
}

// ---------- Bananenstaude ----------
// Pseudostamm aus ineinandergeschobenen Blattscheiden, grosse laengliche Blaetter mit eingerissenem Rand.
// Stufe 4 mit Bananenbuescheln und violetter Bluete.
const BAN = { hell: '#9ccc7a', dunkel: '#6fa35f', welk: false };
// S Stammhoehe, blaetter [Winkel, Blattlaenge]
const BAN_STUFE = {
  1: { S: 14, blaetter: [[-50, 20], [-14, 22], [24, 21]] },
  2: { S: 20, blaetter: [[-64, 24], [-30, 28], [0, 30], [34, 27]] },
  3: { S: 26, blaetter: [[-72, 26], [-42, 31], [-12, 33], [16, 33], [46, 30]] },
  4: { S: 30, blaetter: [[-78, 26], [-52, 32], [-24, 36], [2, 38], [28, 36], [54, 32], [76, 26]] },
};

function bananenBlatt(L, welk) {
  const T = welk ? WELK : BAN;
  const W = 0.17 * L;
  const R = ovalKante(L, W, false);
  let out = blatt(R, { L, W, ...T });
  // Eingerissener Rand: Risse von der Kante ins Blatt
  for (const t of [0.42, 0.66]) {
    const [ex, ey] = R[Math.round(t * 40)];
    out += linie([ex, ey], [ex * 0.35, ey - 0.02 * L], `stroke="${welk ? '#7d6a45' : '#2f5a30'}" stroke-width="0.8" stroke-linecap="round"`);
  }
  return out;
}

function bananenstaude(s, welk) {
  const St = BAN_STUFE[s];
  const S = welk ? St.S * 0.85 : St.S;
  const streifen = welk ? '#a8a36a' : '#477d43';
  let out = stiel(`M0,0Q1,${f(-S * 0.5)} 0,${f(-S)}`, welk, 5);
  for (const x of [-1.6, 0.8]) {
    out += linie([x, -2], [x * 0.6, -S + 2], `stroke="${streifen}" stroke-width="0.5" stroke-linecap="round" opacity="0.6"`);
  }
  if (s === 4) {
    // Bananenbuschel haengt unter den Blattansatz, violette Bluete am Ende
    out += stiel(`M0,${f(-S + 2)}Q5,${f(-S + 4)} 8,${f(-S + 12)}`, welk, 1.4);
    for (const [x, y] of [[5, -S + 10], [8, -S + 11], [11, -S + 10]]) {
      const d = `M${f(x)},${f(y)}Q${f(x + 5)},${f(y + 2)} ${f(x + 3)},${f(y + 9)}`;
      out += pfad(d, 'fill="none" stroke="#8a6a1a" stroke-width="3.6" stroke-linecap="round"') +
        pfad(d, `fill="none" stroke="${welk ? '#d9c27a' : '#f2d33a'}" stroke-width="2.4" stroke-linecap="round"`) +
        pfad(d, 'fill="none" stroke="#fff3a8" stroke-width="0.7" stroke-linecap="round" opacity="0.8"');
    }
    out += oval(9, -S + 21, 2.2, 3.6, `transform="rotate(10 9 ${f(-S + 21)})" fill="${welk ? '#9c8b7a' : '#7a3577'}" ${kontur(welk)}`) +
      oval(8.4, -S + 19.6, 0.9, 1.4, `fill="${welk ? '#c9b09a' : '#b57ab0'}" opacity="0.8"`);
  }
  // Bananenblaetter: breit, laenglich, mit Mittelader und Seitenadern
  const tab = St.blaetter.slice().sort((p, q) => Math.abs(q[0]) - Math.abs(p[0]));
  for (const [a, L] of tab) {
    out += an(0, -S, welk ? a * 1.1 : a, bananenBlatt(welk ? L * 0.8 : L, welk));
  }
  return out;
}

// ---------- Kannenpflanze ----------
// Blaetter mit Ranken, an denen gruen-rote, bauchige Kannen mit Deckel ueber den Topfrand haengen.
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
function kanne(x, y, k, welk) {
  const K = ([px, py]) => [x + px * k, y + py * k];
  const umriss = [[0, 0], [1.6, 1], [3.2, 3], [3.8, 6], [3.2, 9], [1.8, 11.2], [0, 12], [-1.8, 11.2], [-3.2, 9], [-3.8, 6], [-3.2, 3], [-1.6, 1]];
  const hell = welk ? '#c4c98f' : '#8fc27a', dunkel = welk ? '#a8a36a' : '#5e9a52', rot = welk ? '#a6845a' : '#b8402e';
  const rechts = [[0, 0], [1.6, 1], [3.2, 3], [3.8, 6], [3.2, 9], [1.8, 11.2], [0, 12]].map(K);
  let out = pfad(glattGeschlossen(umriss.map(K)), `fill="${hell}"`) +
    pfad(glattGeschlossen(rechts), `fill="${dunkel}" opacity="0.85"`);
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
  out += oval(dx, dy, 2.6 * k, 1.7 * k, `transform="rotate(-12 ${f(dx)} ${f(dy)})" fill="${hell}" ${kontur(welk)}`);
  return out + oval(dx, dy, 1.6 * k, 0.9 * k, `transform="rotate(-12 ${f(dx)} ${f(dy)})" fill="${dunkel}" opacity="0.6"`);
}

function kannenpflanze(s, welk, ebene) {
  let stiele = '', blaetter = '', ranken = '', kannen = '';
  KAN_BLAETTER[s].forEach(([a0, S, L], i) => {
    const a = welk ? a0 * 1.25 : a0;
    const ex = S * Math.sin(a * RAD), ey = -S * Math.cos(a * RAD) * (welk ? 0.5 : 1);
    stiele += stiel(`M0,0Q${f(ex * 0.1)},${f(ey * 0.6)} ${f(ex)},${f(ey)}`, welk, 2);
    const rot = welk ? (a0 < 0 ? -140 : 140) : a0 * 0.4;
    blaetter += an(ex, ey, rot, blatt(ovalKante(L, 0.42 * L, true), { L, W: 0.42 * L, ...farben(i, welk) }));
  });
  for (const [sg, fall, k] of KAN_RANKEN[s]) {
    const Rk = rankePfad(sg, fall, ebene);
    ranken += stiel(Rk.d, welk, 1.4);
    kannen += kanne(Rk.E[0], Rk.E[1], k, welk);
  }
  return stiele + ranken + blaetter + kannen;
}

// ---------- Wachsblume (Hoya) ----------
// Rankende Triebe ueber den Topfrand mit dicken, wachsigen, ovalen Blaettern in Paaren.
// Stufe 3 Knospen, Stufe 4 sternfoermige rosa-weisse Bluetendolden an den Triebspitzen.
const HOY = { hell: '#9cc98a', dunkel: '#6fa35f', welk: false };
// Triebe: [Seite, Endhoehe]
const HOY_RANKEN = { 1: [[1, 10]], 2: [[1, 12], [-1, 14]], 3: [[1, 18], [-1, 16]], 4: [[1, 24], [-1, 20], [1, 13]] };
const HOY_BLATT_N = { 1: 3, 2: 4, 3: 5, 4: 6 };

// Wachsiges Blatt: Grund (0,0), Spitze (0,-L), dicke Form mit Glanzfleck
function hoyaBlatt(L, welk) {
  const T = welk ? WELK : HOY;
  const R = ovalKante(L, 0.5 * L, false);
  return zweiseitig(R, T.hell, T.dunkel) +
    linie([0, -L * 0.06], [0, -L * 0.9], `stroke="${welk ? '#e4e3b4' : '#4f8a4c'}" stroke-width="0.6" stroke-linecap="round" opacity="0.6"`) +
    oval(-0.2 * L, -0.5 * L, 0.12 * L, 0.2 * L, 'fill="#ffffff" opacity="0.55"') +
    pfad(p2pfad(umriss(R)), `fill="none" ${kontur(welk)}`);
}

// Einzelner Stern aus fuenf Blueten-Blaettchen mit heller Mitte
function hoyaStern(x, y, welk) {
  const pink = welk ? '#d8c4b0' : '#f2a7bd', weiss = welk ? '#e6d8c8' : '#fff4f7';
  let out = '';
  for (let j = 0; j < 5; j++) {
    out += an(x, y, j * 72, oval(0, -2, 1, 2, `fill="${pink}" ${kontur(welk)}`));
  }
  return out + kreis(x, y, 1.1, `fill="${weiss}"`) + kreis(x, y, 0.5, welk ? '#9c8b7a' : '#d9587a');
}

// Bluetendolde: sieben Sterne zu einer Kugel gruppiert, Mittelpunkt (x,y)
function hoyaDolde(x, y, welk) {
  const pos = [[0, 0], [-3.4, 1.4], [3.4, 1.4], [0, 3.6], [-1.8, -2.6], [2, -2.6], [0, -5]];
  return pos.map(([dx, dy]) => hoyaStern(x + dx, y + dy, welk)).join('');
}

function hoyaKnospe(x, y, welk) {
  return oval(x, y, 1.4, 2, `fill="#9ccc7a" ${kontur(welk)}`) +
    kreis(x + 0.3, y - 0.8, 0.5, `fill="${welk ? '#d8c4b0' : '#f2a7bd'}"`);
}

function hoya(s, welk, ebene) {
  let triebe = '', blaetter = '', bluten = '';
  HOY_RANKEN[s].forEach(([sg, fall], j) => {
    const Rk = rankePfad(sg, fall, ebene);
    triebe += stiel(Rk.d, welk, 1.2);
    const n = HOY_BLATT_N[s];
    for (let k = 0; k < n; k++) {
      const t = 0.3 + 0.65 * k / (n - 1);
      const [x, y] = qb(Rk.S, Rk.C, Rk.E, t);
      const rot = welk ? sg * 150 : sg * 60 + (k % 2 ? 25 : -25);
      blaetter += an(x, y, rot, hoyaBlatt(welk ? 6.5 : 8, welk));
    }
    const [ex, ey] = Rk.E;
    if (s === 3 && j === 0) bluten += hoyaKnospe(ex, ey + 2, welk);
    if (s === 4 && j < 2) bluten += hoyaDolde(ex, ey + 3, welk);
    if (s === 4 && j === 2) bluten += hoyaKnospe(ex, ey + 2, welk);
  });
  return triebe + blaetter + bluten;
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
  const inhalt = FIGUREN[typ](s, welk, ebene);
  return topf(R, H) +
    gruppe(`transform="translate(0,${-H}) rotate(${welk ? 8 : 0})"`, inhalt) +
    (welk ? fallLaub(ebene) : '');
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
