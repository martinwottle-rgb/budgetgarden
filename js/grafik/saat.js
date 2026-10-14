// Saatgut-Pflanzen fuer die Beete als SVG-Strings. OHNE Topf: Ursprung (0,0) = Erdoberflaeche,
// die Pflanze waechst direkt aus der Erde nach oben (negative y). Stufe 1 Keimling, 2 jung,
// 3 fast reif, 4 erntereif (mit Fruechten/Bluetenz, wo passend). welk: Erdtoene, haengend.
// Breite je Sorte hoechstens ca. 26 Einheiten (vor scale 1.6). Legendaere Sorten funkeln (animate).

import { f, p2, gruppe, pfad, linie, oval, kreis, poly, qb, zufall, rechteck } from './hilfen.js';

const RAD = Math.PI / 180;

// Konturen wie pflanzen.js: Blaetter und Stiele dunkelgruen 0.7, welk Erdton. Holz braun.
const KON_GRUEN = 'stroke="#2f5a30" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const KON_WELK = 'stroke="#7d6a45" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const KON_HOLZ = 'stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';
const kontur = (welk) => (welk ? KON_WELK : KON_GRUEN);
// Innenlinien (Adern)
const ADER = 'stroke="#3a6b3a" stroke-width="0.5" stroke-linecap="round" opacity="0.6"';

// Gruene Toene (Licht/Schatten) und Welk-Toene
const GRUEN = [
  { hell: '#7fb069', dunkel: '#5e9a52', welk: false },
  { hell: '#9ccc7a', dunkel: '#7fb069', welk: false },
];
const WELK = { hell: '#c4c98f', dunkel: '#a8a36a', welk: true };
const farben = (i, welk) => (welk ? WELK : GRUEN[i % 2]);

const stufeN = (n) => Math.min(4, Math.max(1, Math.round(Number(n) || 1)));

// ---------- Boden ----------
// Kleine dunkle Erdkuhle, Ursprung im Mittelpunkt; die Pflanze wachsen aus ihr heraus
function erdkuhle(rx = 7.5) {
  return oval(0, 0.5, rx + 1, 2.6, 'fill="#6b4a3a" opacity="0.35"') +
    oval(0, 0.2, rx, 2.1, 'fill="#5a3d2b"');
}

// Abgefallene Blaetter (nur welk), flach neben der Pflanze
function fallLaub() {
  return [[13, 7, -35], [-12, 8, 30], [2, 11, -5]].map(([x, y, w]) => fallBlatt(x, y, w)).join('');
}
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

// ---------- Geometrie ----------
// Kubischer Bezier, P = [P0, C1, C2, P3]
function bez(P, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [0, 1].map((j) => a * P[0][j] + b * P[1][j] + c * P[2][j] + d * P[3][j]);
}

// Weiche Zahnung
const WELLE = (i) => 1 + 0.05 * Math.sin((2 * Math.PI * i) / 6.5);

// Herzform: Grund (0,0) mit Lappen nach unten, Spitze (0,-L). Rechte Kante als Punktfolge.
function herzKante(L, W, zacken) {
  const A = [[0, 0], [0.35 * W, 0.22 * L], [0.62 * W, 0.05 * L], [0.55 * W, -0.25 * L]];
  const B = [[0.55 * W, -0.25 * L], [0.5 * W, -0.6 * L], [0.25 * W, -0.85 * L], [0, -L]];
  const pts = [];
  for (let i = 0; i <= 20; i++) pts.push(bez(A, i / 20));
  for (let i = 1; i <= 20; i++) pts.push(bez(B, i / 20));
  return zacken ? pts.map(([x, y], i) => (i > 0 && i < 40 ? [x * WELLE(i), y] : [x, y])) : pts;
}

// Ovale, spitze Form (Grund (0,0), Spitze (0,-L)), optional weich gezahnt
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

// Distelartige Kante: deutliche Zacken (Artischocke)
function distelKante(L, W) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    let w = W * Math.sin(Math.PI * Math.pow(t, 0.75));
    if (i > 0 && i < 40) w *= i % 4 === 2 ? 1.12 : i % 4 === 0 ? 0.82 : 0.95;
    pts.push([w, -L * t]);
  }
  return pts;
}

const p2pfad = (pts) => 'M' + pts.map(p2).join('L') + 'Z';
const an = (x, y, rot, inhalt) => gruppe(`transform="translate(${f(x)},${f(y)}) rotate(${f(rot)})"`, inhalt);

// Blatt aus rechter Kante R (Grund (0,0), Spitze (0,-L)). Linke Haelfte heller (Licht von links).
// o: { L, W, hell, dunkel, welk }
function blatt(R, o) {
  const { L, W, hell, dunkel, welk } = o;
  const lk = R.map(([x, y]) => [-x, y]).reverse();
  let out = pfad(p2pfad(R), `fill="${dunkel}"`) + pfad(p2pfad(lk), `fill="${hell}"`);
  out += linie([0, 0], [0, -L * 0.92], ADER);
  for (const t of [0.3, 0.5, 0.7]) {
    for (const s of [-1, 1]) {
      out += linie([0, -L * t], [s * W * 0.4, -L * (t + 0.12)], ADER);
    }
  }
  out += pfad(p2pfad(R.concat(lk)), `fill="none" ${kontur(welk)}`);
  out += linie([-W * 0.3, -L * 0.2], [-W * 0.2, -L * 0.5], 'stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="0.45"');
  return out;
}

// Stiel mit dunkler Kontur, Farbkern und Glanzlinie. col optional [aussen, innen] (z. B. Mangold)
function stiel(d, welk, w = 3.2, col) {
  const [rand, aussen, innen] = welk ? ['#7d6a45', '#a8a36a', '#c4c98f'] : ['#2f5a30', '#477d43', '#7fb069'];
  const [a, i] = col || [aussen, innen];
  return pfad(d, `fill="none" stroke="${rand}" stroke-width="${f(w + 1.4)}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${a}" stroke-width="${w}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${i}" stroke-width="${f(w * 0.55)}" stroke-linecap="round"`);
}

// Blaetter an Stielen aus der Erde. eintraege: [winkel, stiellaenge, blattlaenge, ...].
// welk: Stiele kuerzer, Blaetter haengen. farbeFn(i) liefert optional die Stielfarbe.
function stielBlaetter(eintraege, welk, blattFn, farbeFn = null) {
  let stiele = '', blaetter = '';
  eintraege.forEach((eintrag, i) => {
    const [a0, S] = eintrag;
    const a = welk ? a0 * 1.25 : a0;
    const ex = S * Math.sin(a * RAD), ey = -S * Math.cos(a * RAD) * (welk ? 0.45 : 1);
    const C = welk ? [ex * 0.5, ey * 0.1] : [ex * 0.1, ey * 0.75];
    stiele += stiel(`M0,0Q${f(C[0])},${f(C[1])} ${p2([ex, ey])}`, welk, 3.2, farbeFn ? farbeFn(i) : undefined);
    const rot = welk ? (a0 < 0 ? -150 : 150) : a * 0.8;
    blaetter += an(ex, ey, rot, blattFn(eintrag, i));
  });
  return stiele + blaetter;
}

// Grasartiges Halm-Blatt: Mittellinie als kubischer Bezier P, Breite W, zur Spitze schmal
function halm(P, W, welk, i) {
  const c = farben(i, welk);
  const C = [], R = [], Lk = [];
  for (let k = 0; k <= 16; k++) {
    const t = k / 16;
    const [x, y] = bez(P, t);
    const w = W * 2 * Math.sqrt(t * (1 - t)) * 0.9 + 0.25;
    C.push([x, y]); R.push([x + w, y]); Lk.push([x - w, y]);
  }
  const ganz = R.concat(Lk.slice().reverse());
  return pfad(p2pfad(ganz), `fill="${c.hell}" ${kontur(welk)}`) +
    pfad(p2pfad(C.concat(R.slice().reverse())), `fill="${c.dunkel}" opacity="0.8"`) +
    pfad('M' + C.map(p2).join('L'), `fill="none" stroke="${welk ? '#d8d6a0' : '#c8e6a8'}" stroke-width="0.5" opacity="0.7"`);
}

// Geschlossene glatte Kurve durch die Punkte (Paprika, Erdbeere)
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

// Goldenes Funkeln per <animate>: punkte = [x, y, beginn in Sekunden]
function funkeln(punkte) {
  return punkte.map(([x, y, b]) => `<circle cx="${f(x)}" cy="${f(y)}" r="0.9" fill="#ffe08a" stroke="#b8862a" stroke-width="0.3">` +
    `<animate attributeName="opacity" values="0.15;1;0.15" dur="2.4s" begin="${b}s" repeatCount="indefinite"/></circle>`).join('');
}

// ---------- Basilikum ----------
const BAS_TRIEBE = {
  1: [[-22, 10, 2], [0, 13, 2], [22, 10, 2]],
  2: [[-26, 12, 2], [-8, 16, 2], [10, 15, 2], [28, 11, 2]],
  3: [[-30, 13, 3], [-14, 18, 3], [0, 20, 3], [14, 17, 3], [30, 13, 2]],
  4: [[-34, 14, 3], [-18, 19, 3], [-4, 22, 3], [10, 21, 3], [24, 18, 3], [38, 14, 3]],
};
// Stufe 4: Triebe (Index) mit Bluetenquirl an der Spitze
const BAS_BLUETEN = [1, 2, 4];
const BAS = { grund: '#5e9a52', licht: '#7fb069', glanz: '#b9dd9a', ader: '#477d43' };
const BAS_WELK = { grund: '#a8a36a', licht: '#c4c98f', glanz: '#d8d6a0', ader: '#8c8650' };

// Basilikumblatt: eifoermig, breite Mitte im unteren Drittel, glatter Rand
function basilBlatt(L, W, welk) {
  const c = welk ? BAS_WELK : BAS;
  const breite = (t) => {
    const c0 = 0.35;
    const q = t < c0 ? (t - c0) / c0 : (t - c0) / (1 - c0);
    return W * Math.sqrt(Math.max(0, 1 - q * q));
  };
  const R = [], lk = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    R.push([breite(t), -L * t]);
  }
  for (let i = 30; i >= 0; i--) {
    const [x, y] = R[i];
    lk.push([-0.9 * x, y]);
  }
  const rand = welk ? 'stroke="#a6845a" stroke-width="0.8" stroke-linejoin="round"' : 'stroke="#2f5a30" stroke-width="0.6" stroke-linejoin="round"';
  let out = pfad(p2pfad(R), `fill="${c.grund}"`) + pfad(p2pfad(lk), `fill="${c.licht}"`);
  const glanz = [];
  for (let i = 8; i <= 20; i++) glanz.push([-0.55 * breite(i / 30), -L * (i / 30)]);
  for (let i = 20; i >= 8; i--) glanz.push([-0.33 * breite(i / 30), -L * (i / 30)]);
  out += pfad(p2pfad(glanz), `fill="${c.glanz}" opacity="0.75"`);
  out += pfad(p2pfad(R.concat(lk)), `fill="none" ${rand}`);
  out += linie([0, 0], [0, -L * 0.92], `stroke="${c.ader}" stroke-width="0.6" stroke-linecap="round"`);
  for (const t of [0.35, 0.6]) {
    for (const sd of [-1, 1]) {
      out += linie([0, -L * t], [sd * breite(t + 0.15) * 0.75, -L * (t + 0.15)], `stroke="${c.ader}" stroke-width="0.45" stroke-linecap="round" opacity="0.7"`);
    }
  }
  return out;
}

// Weisser Lippenbluetenquirl
function lippenQuirl(x, y) {
  let out = '';
  for (let k = 0; k < 5; k++) {
    const w = k * 72 - 90;
    const a = w * RAD;
    const bx = x + 1.7 * Math.cos(a), by = y + 1.7 * Math.sin(a);
    out += oval(bx, by, 1.1, 0.75, `transform="rotate(${w} ${f(bx)} ${f(by)})" fill="#ffffff" stroke="#9ccc7a" stroke-width="0.4"`);
  }
  return out + kreis(x, y, 0.8, 'fill="#7fb069"');
}

function basilikum(s, welk) {
  const r = zufall(31 + s);
  let stiele = '', blaetter = '', bluten = '';
  BAS_TRIEBE[s].forEach(([a0, h0, paare], idx) => {
    const a = (welk ? a0 * 1.2 : a0) * 0.85;
    const h = h0 * (welk ? 0.8 : 1);
    const tip = [h * Math.sin(a * RAD), -h * Math.cos(a * RAD)];
    stiele += stiel(`M0,0L${p2(tip)}`, welk, 1.6);
    const ts = paare === 2 ? [0.5, 0.85] : [0.4, 0.65, 0.9];
    for (const t of ts) {
      const N = [tip[0] * t, tip[1] * t];
      for (const sd of [-1, 1]) {
        const L = (welk ? 5.5 : 7) * (0.85 + 0.3 * r()) * (1 - 0.35 * t);
        const stielchen = linie([0, 1.2], [0, 0], `stroke="${welk ? '#7d6a45' : '#2f5a30'}" stroke-width="0.8" stroke-linecap="round"`);
        blaetter += an(N[0], N[1], a + sd * (welk ? 55 : 42), stielchen + basilBlatt(L, 0.32 * L, welk));
      }
    }
    if (s === 4 && BAS_BLUETEN.includes(idx) && !welk) bluten += lippenQuirl(tip[0], tip[1]);
  });
  return stiele + blaetter + bluten;
}

// ---------- Erdbeere ----------
const ERD_BLAETTER = {
  1: [[-40, 9], [-5, 11], [30, 9]],
  2: [[-40, 10], [-16, 12], [8, 12], [30, 9]],
  3: [[-40, 11], [-20, 13], [-4, 14], [10, 13], [30, 10]],
  4: [[-40, 12], [-20, 14], [-4, 15], [10, 14], [30, 11]],
};
const ERD_AUSLAEUFER = { 1: [], 2: [1], 3: [1, -1], 4: [1, -1] };
// Fruechte je Stufe: [x, y, Radius] (Stufe 4)
const ERD_FRUECHTE = { 1: [], 2: [], 3: [], 4: [[-9, -4, 3.2], [9, -2, 3.4], [-4, -12, 3.0], [5, -13, 2.8]] };

function erdFrucht(x, y, r) {
  const w = r * 0.9, h = r;
  const pts = [[0, -0.55 * h], [0.55 * w, -0.95 * h], [0.95 * w, -0.2 * h], [0.5 * w, 0.6 * h], [0, 1.2 * h], [-0.5 * w, 0.6 * h], [-0.95 * w, -0.2 * h], [-0.55 * w, -0.95 * h]]
    .map(([px, py]) => [x + px, y + py]);
  let out = pfad(glattGeschlossen(pts), 'fill="#e8453c" stroke="#8a2a24" stroke-width="0.6" stroke-linejoin="round"') +
    oval(x - 0.4 * w, y - 0.2 * h, 0.3 * w, 0.2 * h, 'fill="#ffffff" opacity="0.5"');
  for (const [px, py] of [[-0.5, -0.45], [0.4, -0.35], [-0.2, 0.1], [0.45, 0.25], [-0.45, 0.4], [0, 0.65], [0.25, 0.8]]) {
    out += kreis(x + px * w, y + py * h, 0.3, 'fill="#ffe08a"');
  }
  const kelch = [];
  for (let k = 0; k < 10; k++) {
    const a = k * 36 * RAD, rr = k % 2 ? 0.3 * w : 0.7 * w;
    kelch.push([x + rr * Math.cos(a), y - 0.6 * h + rr * Math.sin(a) * 0.45]);
  }
  return out + poly(kelch, `fill="#5e9a52" ${KON_GRUEN}`);
}

function weissBlute(x, y, k, welk) {
  let out = '';
  for (let j = 0; j < 5; j++) {
    const a = (j * 72 - 90) * RAD;
    out += oval(x + 1.9 * k * Math.cos(a), y + 1.9 * k * Math.sin(a), 1.3 * k, 1.3 * k, `fill="${welk ? '#e6d8c8' : '#ffffff'}" ${kontur(welk)}`);
  }
  return out + kreis(x, y, 1.1 * k, `fill="${welk ? '#c9a46a' : '#f5c518'}"`);
}

function erdbeere(s, welk) {
  let stiele = '', blaetter = '', bluten = '', ausl = '', fr = '';
  ERD_BLAETTER[s].forEach(([a0, S], i) => {
    const a = welk ? a0 * 1.25 : a0;
    const len = welk ? S * 0.8 : S;
    const N = [len * Math.sin(a * RAD), -len * Math.cos(a * RAD) * (welk ? 0.6 : 1)];
    stiele += stiel(`M0,0L${p2(N)}`, welk, 1.4);
    for (const [da, k] of [[0, 1], [-50, 0.85], [50, 0.85]]) {
      const Lf = 6.5 * k * (welk ? 0.8 : 1);
      blaetter += an(N[0], N[1], a + da, blatt(ovalKante(Lf, 0.6 * Lf, true), { L: Lf, W: 0.6 * Lf, ...farben(i + (da > 0 ? 1 : 0), welk) }));
    }
    if (s === 3 && i < 3 && !welk) bluten += weissBlute(N[0], N[1] - 2, 0.9, welk);
  });
  for (const sg of ERD_AUSLAEUFER[s]) {
    const E = [sg * 9, -2];
    ausl += stiel(`M${sg * 3},-3Q${sg * 6},-7 ${p2(E)}`, welk, 1.2);
    for (const da of [-30, 30]) {
      ausl += an(E[0], E[1], sg * da, blatt(ovalKante(4.5, 2.4, true), { L: 4.5, W: 2.4, ...farben(da > 0 ? 1 : 0, welk) }));
    }
  }
  if (!welk) {
    for (const [x, y, rad] of ERD_FRUECHTE[s]) {
      fr += linie([x * 0.2, -3], [x, y - rad * 0.6], 'stroke="#5e9a52" stroke-width="0.9" stroke-linecap="round"') + erdFrucht(x, y, rad);
    }
  }
  return stiele + ausl + blaetter + bluten + fr;
}

// ---------- Tomate (auch Goldtomate) ----------
const TOM_H = [16, 30, 42, 52];
const TOM_LEN = [5.5, 7, 8.5, 9];

// Fiederblatt: Spindel nach oben, Fiederblaettchen paarweise und ein Endblaettchen
function tomatenBlatt(len, welk, i) {
  const col = farben(i, welk);
  let out = linie([0, 0], [0, -len], `stroke="${welk ? '#a8a36a' : '#477d43'}" stroke-width="1" stroke-linecap="round"`);
  const blaettchen = (x, y, rot, L) => an(x, y, rot, blatt(ovalKante(L, 0.5 * L, true), { L, W: 0.5 * L, ...col }));
  for (const fr of [0.4, 0.7]) {
    for (const sd of [-1, 1]) out += blaettchen(0, -len * fr, sd * 42, len * 0.55);
  }
  out += blaettchen(0, -len, 0, len * 0.6);
  return out;
}

// Tomatenfrucht mit Glanzpunkt und gruenem Kelch-Stern. gold: Goldtomate
function frucht(x, y, r, gold = false) {
  const [dunkel, hell, kon] = gold ? ['#c99a1c', '#f5d061', 'stroke="#8a6a1a" stroke-width="0.6"'] : ['#b8362e', '#e0533d', KON_GRUEN];
  return kreis(x, y, r, `fill="${dunkel}"`) +
    kreis(x - r * 0.22, y - r * 0.22, r * 0.9, `fill="${hell}"`) +
    kreis(x - r * 0.4, y - r * 0.42, r * 0.22, 'fill="#ffffff" opacity="0.75"') +
    kreis(x, y, r, `fill="none" ${kon}`) +
    poly(stern(x, y - r * 0.9, r * 0.5), `fill="#5e9a52" stroke="#3a6b3a" stroke-width="0.3" stroke-linejoin="round"`);
}

// Stern (Kelch): fuenf Spitzen
function stern(x, y, ro, n = 5) {
  const pts = [];
  for (let k = 0; k < 2 * n; k++) {
    const a = (-90 + k * 180 / n) * RAD;
    const r = k % 2 ? ro * 0.42 : ro;
    pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
  }
  return pts;
}

function blume(x, y) {
  let out = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * RAD;
    out += kreis(x + 2.3 * Math.cos(a), y + 2.3 * Math.sin(a), 1.7, `fill="#ffd23f" ${KON_GRUEN}`);
  }
  return out + kreis(x, y, 1.1, 'fill="#f5c518"');
}

function tomate(s, welk, gold = false) {
  const H = TOM_H[s - 1];
  const P = (t) => qb([2, 0], [6, -H / 2], [4, -H], t);
  const SH = H + 8;
  // Holzstab mit Licht, Schatten und Maserung, steht im Erdboden
  let out = rechteck(-5, -SH, 4, SH, 1.5, `fill="#c98f5a" ${KON_HOLZ}`) +
    linie([-4.2, -SH + 2], [-4.2, -2], 'stroke="#e2b07c" stroke-width="1" stroke-linecap="round"') +
    linie([-1.6, -SH + 2], [-1.6, -2], 'stroke="#a86b43" stroke-width="1"') +
    linie([-3, -SH * 0.6], [-2.6, -SH * 0.4], 'stroke="#a86b43" stroke-width="0.5"') +
    linie([-3.4, -SH * 0.25], [-3, -SH * 0.1], 'stroke="#a86b43" stroke-width="0.5"');
  out += stiel(`M2,0Q6,${f(-H / 2)} 4,${-H}`, welk, 2.4);
  for (const t of [0.3, 0.55, 0.8]) {
    const [x, y] = P(t);
    out += linie([-3.5, y + 1.6], [x + 0.5, y - 1.4], 'stroke="#e8c48a" stroke-width="1.4" stroke-linecap="round"');
  }
  const T = { 1: [0.55, 0.8], 2: [0.35, 0.75], 3: [0.3, 0.6, 0.85], 4: [0.25, 0.5, 0.78] }[s];
  const LEN = TOM_LEN[s - 1];
  T.forEach((t, i) => {
    const [x, y] = P(t);
    const sd = i % 2 ? 1 : -1;
    out += an(x, y, sd * (welk ? 110 : 40), tomatenBlatt(LEN, welk, i));
  });
  if (s === 3) {
    const [gx, gy] = P(0.55), [hx, hy] = P(0.4);
    out += linie([gx, gy], [-6, -H * 0.6 + 6], 'stroke="#5e9a52" stroke-width="1" stroke-linecap="round"') +
      kreis(-6, -H * 0.6 + 6, 2.6, `fill="#9ccc7a" ${KON_GRUEN}`) +
      linie([hx, hy], [8, -H * 0.55], 'stroke="#5e9a52" stroke-width="1" stroke-linecap="round"') +
      kreis(8, -H * 0.55, 2.4, `fill="#9ccc7a" ${KON_GRUEN}`);
    if (!welk) out += blume(1, -H - 3) + blume(-5, -H + 2) + blume(9, -H + 5);
  }
  if (s === 4) {
    const [px, py] = P(0.6);
    for (const [x, y, r] of [[-4, -30, 3.2], [4, -31, 3.0], [-1, -22, 3.3], [5, -19, 2.6]]) {
      out += linie([px, py], [x, y - r], 'stroke="#5e9a52" stroke-width="1" stroke-linecap="round"') + frucht(x, y, r, gold);
    }
  }
  return out;
}

// ---------- Chili ----------
const CHILI = {
  1: [[-20, 8], [18, 9]],
  2: [[-24, 12], [0, 14], [24, 12]],
  3: [[-26, 16], [-8, 19], [12, 18], [28, 14]],
  4: [[-28, 19], [-12, 24], [4, 25], [20, 22], [32, 16]],
};
// Schoten je Stufe: [Index des Triebs, Farbe]
const CHILI_SCHOTEN = {
  2: [[1, '#9ccc7a']],
  3: [[0, '#d7261e'], [2, '#9ccc7a']],
  4: [[0, '#d7261e'], [1, '#d7261e'], [2, '#e0342a'], [3, '#d7261e'], [4, '#9ccc7a']],
};

// Spitze, haengende Schote: Stiel oben am Punkt (x,y), Spitze nach unten
function schote(x, y, len, dx, col) {
  const tx = x + dx, ty = y + len;
  const d = `M${f(x - 1.5)},${f(y)}Q${f(x - 2.2 + dx * 0.4)},${f(y + len * 0.55)} ${f(tx)},${f(ty)}Q${f(x + 2.2 + dx * 0.4)},${f(y + len * 0.55)} ${f(x + 1.5)},${f(y)}Z`;
  return linie([x, y - 1.6], [x + 0.2, y + 0.4], 'stroke="#5e9a52" stroke-width="1" stroke-linecap="round"') +
    pfad(d, `fill="${col}" ${KON_GRUEN}`) +
    pfad(`M${f(x - 0.8)},${f(y + 2)}Q${f(x - 1.2 + dx * 0.3)},${f(y + len * 0.5)} ${f(x + dx * 0.5)},${f(y + len * 0.85)}`,
      'fill="none" stroke="#ffffff" stroke-width="0.7" stroke-linecap="round" opacity="0.5"');
}

function chili(s, welk) {
  let out = '', schoten = '';
  CHILI[s].forEach(([a0, h], i) => {
    const a = welk ? a0 * 1.3 : a0;
    const hh = welk ? h * 0.85 : h;
    const tip = welk ? [hh * 1.1 * Math.sin(a * RAD), -hh * 0.5] : [hh * Math.sin(a * RAD), -hh * Math.cos(a * RAD)];
    out += stiel(`M0,0L${p2(tip)}`, welk, 1.8);
    for (const t of [0.45, 0.75]) {
      const x = tip[0] * t, y = tip[1] * t;
      for (const sd of [-1, 1]) {
        const L = (welk ? 4.5 : 6) * (1 - 0.2 * t);
        out += an(x, y, a + sd * (welk ? 60 : 48), blatt(ovalKante(L, 0.38 * L, false), { L, W: 0.38 * L, ...farben(i + (sd > 0 ? 1 : 0), welk) }));
      }
    }
    const treffer = (CHILI_SCHOTEN[s] || []).find(([idx]) => idx === i);
    if (treffer && !welk) schoten += schoteSvg(tip, treffer[1], i);
  });
  return out + schoten;
}
function schoteSvg(tip, col, i) {
  const dx = i % 2 ? 1.5 : -1.5;
  return schote(tip[0], tip[1] + 1, 8, dx, col);
}

// ---------- Paprika ----------
const PAPR = {
  1: [[-22, 7], [20, 8]],
  2: [[-26, 11], [0, 12], [26, 11]],
  3: [[-26, 15], [-9, 17], [10, 17], [26, 14]],
  4: [[-28, 18], [-10, 21], [8, 21], [26, 17]],
};
// Fruechte je Stufe: [Index des Triebs, Radius, Farbe]
const PAPR_FRUECHTE = {
  3: [[1, 3, '#f2c230']],
  4: [[1, 4.2, '#f2c230'], [2, 4.2, '#d9412e'], [3, 4.0, '#f2c230']],
};

// Paprika: gerundeter Koerper mit drei Lappen oben, Stiel und Kelch
function paprikaFrucht(x, y, r, col) {
  const pts = [[0, -0.9 * r], [0.8 * r, -1.0 * r], [1.05 * r, -0.2 * r], [0.9 * r, 0.6 * r], [0.4 * r, 1.05 * r],
    [0, 0.95 * r], [-0.4 * r, 1.05 * r], [-0.9 * r, 0.6 * r], [-1.05 * r, -0.2 * r], [-0.8 * r, -1.0 * r]]
    .map(([px, py]) => [x + px, y + py]);
  return linie([x, y - 0.9 * r], [x + 0.6, y - 1.8 * r], 'stroke="#5e9a52" stroke-width="1" stroke-linecap="round"') +
    pfad(glattGeschlossen(pts), `fill="${col}" ${KON_GRUEN}`) +
    oval(x - 0.45 * r, y + 0.1 * r, 0.3 * r, 0.6 * r, 'fill="#ffffff" opacity="0.45"') +
    poly(stern(x, y - 0.9 * r, 0.9 * r, 4), `fill="#5e9a52" ${KON_GRUEN}`);
}

function paprika(s, welk) {
  let out = '', fr = '';
  PAPR[s].forEach(([a0, h], i) => {
    const a = welk ? a0 * 1.3 : a0;
    const hh = welk ? h * 0.85 : h;
    const tip = welk ? [hh * 1.1 * Math.sin(a * RAD), -hh * 0.5] : [hh * Math.sin(a * RAD), -hh * Math.cos(a * RAD)];
    out += stiel(`M0,0Q${f(tip[0] * 0.2)},${f(tip[1] * 0.6)} ${p2(tip)}`, welk, 1.9);
    const L = (welk ? 6 : 8.5);
    out += an(tip[0], tip[1], welk ? a + 70 : a * 0.6 + (i % 2 ? 12 : -12), blatt(ovalKante(L * 0.9, 0.55 * L * 0.9, true), { L: L * 0.9, W: 0.55 * L * 0.9, ...farben(i, welk) }));
    out += an(tip[0] * 0.5, tip[1] * 0.5, welk ? a - 60 : a * 0.6 - (i % 2 ? 12 : -12), blatt(ovalKante(L * 0.75, 0.5 * L * 0.75, true), { L: L * 0.75, W: 0.5 * L * 0.75, ...farben(i + 1, welk) }));
    const treffer = (PAPR_FRUECHTE[s] || []).find(([idx]) => idx === i);
    if (treffer && !welk) fr += paprikaFrucht(tip[0], tip[1] + 4 + treffer[1] * 0.5, treffer[1], treffer[2]);
  });
  return out + fr;
}

// ---------- Minze ----------
function minze(s, welk) {
  const N = [2, 3, 4, 5][s - 1], dy = [5, 5.2, 5.4, 5.6][s - 1], L = [5, 6.5, 8, 9][s - 1];
  const k = welk ? 0.8 : 1;
  const top = -(N * dy + 2) * k;
  let out = stiel(`M0,0Q0.8,${f(top / 2)} 0,${f(top)}`, welk, 2.2);
  for (let j = 0; j < N; j++) {
    const y = -(3 + j * dy) * k;
    for (const sd of [-1, 1]) {
      const rot = sd * (welk ? 125 : 68) + (j % 2 ? 6 : -4);
      out += an(0, y, rot, blatt(ovalKante(L, 0.5 * L, true), { L, W: 0.5 * L, ...farben(1, welk) }));
    }
  }
  return out;
}

// ---------- Thymian ----------
function thymian(s, welk) {
  const r = zufall(41 + s);
  const N = [5, 8, 11, 14][s - 1];
  const skal = [0.6, 0.8, 1, 1.05][s - 1];
  let out = '', bl = '';
  for (let k = 0; k < N; k++) {
    const a0 = -68 + (136 * k) / (N - 1) + (r() - 0.5) * 8;
    const a = welk ? a0 * 1.3 : a0;
    const h = (7 + 5 * r()) * skal * (welk ? 0.75 : 1);
    const tip = welk ? [h * 1.15 * Math.sin(a * RAD), -h * 0.45] : [h * Math.sin(a * RAD), -h * Math.cos(a * RAD)];
    const mid = [tip[0] * 0.5, tip[1] * 0.5];
    out += stiel(`M0,0Q${f(mid[0] * 0.2)},${f(mid[1])} ${p2(tip)}`, welk, 0.9);
    for (const pt of [mid, tip]) {
      for (let j = 0; j < 3; j++) {
        const rot = a + (j - 1) * 55;
        out += an(pt[0], pt[1], rot, blatt(ovalKante(2.8, 1.1, false), { L: 2.8, W: 1.1, ...farben(j + k, welk) }));
      }
    }
    if (s === 4 && !welk && k % 2 === 0) {
      for (const [dx, dy] of [[-1, -1], [1, -0.8], [0, -2.2]]) {
        bl += kreis(tip[0] + dx, tip[1] + dy, 1.2, 'fill="#e88fb0" stroke="#b5557f" stroke-width="0.4"') +
          kreis(tip[0] + dx, tip[1] + dy, 0.4, 'fill="#fbe3ec"');
      }
    }
  }
  return out + bl;
}

// ---------- Rosmarin ----------
const ROS = {
  1: [[-12, 10], [8, 12], [16, 8]],
  2: [[-16, 16], [-6, 19], [8, 17], [17, 13]],
  3: [[-18, 22], [-9, 26], [2, 27], [13, 24], [20, 18]],
  4: [[-20, 28], [-12, 32], [-3, 34], [7, 33], [16, 28], [22, 22]],
};

function rosmarin(s, welk) {
  let out = '', bl = '';
  const dunkel = welk ? '#7d6a45' : '#2f5a30', hell = welk ? '#c4c98f' : '#7fb069';
  ROS[s].forEach(([a0, h]) => {
    const a = welk ? a0 * 1.4 : a0;
    const hh = welk ? h * 0.8 : h;
    const tip = welk ? [hh * 1.1 * Math.sin(a * RAD), -hh * 0.55] : [hh * Math.sin(a * RAD), -hh * Math.cos(a * RAD)];
    const ctrl = [tip[0] * 0.25, tip[1] * 0.55];
    out += stiel(`M0,0Q${p2(ctrl)} ${p2(tip)}`, welk, 1.6);
    const nlen = welk ? 2.2 : 3.2;
    for (const t of [0.2, 0.35, 0.5, 0.65, 0.8, 0.95]) {
      const [px, py] = qb([0, 0], ctrl, tip, t);
      for (const sd of [-1, 1]) {
        const da = (a + sd * 42) * RAD;
        const ex = px + nlen * Math.sin(da), ey = py - nlen * Math.cos(da);
        out += linie([px, py], [ex, ey], `stroke="${dunkel}" stroke-width="1.5" stroke-linecap="round"`) +
          linie([px, py], [ex, ey], `stroke="${hell}" stroke-width="0.6" stroke-linecap="round"`);
      }
    }
    if (s >= 3 && !welk) {
      for (const t of [0.7, 0.95]) {
        const [px, py] = qb([0, 0], ctrl, tip, t);
        bl += kreis(px, py, 1.3, 'fill="#7fa8d9" stroke="#3f6a9a" stroke-width="0.4"') +
          kreis(px, py, 0.45, 'fill="#e8f0ff"');
      }
    }
  });
  return out + bl;
}

// ---------- Salbei ----------
const SALBEI = {
  1: [[-28, 5, 6], [28, 5, 6]],
  2: [[-32, 8, 8], [0, 9, 9], [32, 8, 8]],
  3: [[-30, 9, 9], [-10, 11, 10], [12, 11, 10], [32, 9, 9]],
  4: [[-30, 11, 9], [-10, 13, 10], [12, 13, 10], [32, 11, 9]],
};
const SALBEI_FARBEN = { hell: '#b8c9a8', dunkel: '#8fa885' };

// Samtige, graugruene Oval-Blaetter mit hellem Filz-Schimmer
function salbeiBlatt(L, welk) {
  const c = welk ? WELK : { ...SALBEI_FARBEN, welk: false };
  let out = blatt(ovalKante(L, 0.5 * L, false), { L, W: 0.5 * L, ...c });
  if (!welk) {
    out += oval(-0.15 * L, -0.5 * L, 0.9, 0.28 * L, 'fill="#e6efd9" opacity="0.35"') +
      oval(0.12 * L, -0.3 * L, 0.6, 0.18 * L, 'fill="#e6efd9" opacity="0.2"');
  }
  return out;
}

// ---------- Artischocke ----------
const ARTI = {
  1: [[-30, 4, 6], [30, 4, 6]],
  2: [[-36, 7, 9], [0, 8, 10], [36, 7, 9]],
  3: [[-32, 9, 9], [-12, 11, 10], [12, 11, 10], [32, 9, 9]],
  4: [[-34, 10, 10], [-14, 12, 11], [6, 12, 11], [26, 11, 10]],
};
const SILBER = { hell: '#c9d8d0', dunkel: '#9fb4aa' };

// Knospe (Stufe 4): gruene Schuppen in Reihen, oben gerundet
function artiKnospe(x, y) {
  let out = oval(x, y, 5, 6.5, `fill="#7f9a5a" ${KON_GRUEN}`) +
    oval(x - 1.8, y - 1.5, 1.2, 3.2, 'fill="#a9c27a" opacity="0.6"');
  const reihen = [[-6.2, 4, '#6f8a4a'], [-3.2, 4.6, '#8aa562'], [0, 4.8, '#a9c27a']];
  reihen.forEach(([dy, n, col], row) => {
    for (let k = 0; k < n; k++) {
      const sx = (k - (n - 1) / 2) * 2.5 + (row % 2 ? 1.1 : 0);
      const sy = y + dy * 0.9 + (k % 2 ? 0.8 : 0);
      out += oval(sx, sy, 1.5, 2.3, `transform="rotate(${f(sx * 4)} ${f(sx)} ${f(sy)})" fill="${col}" ${KON_GRUEN}`);
    }
  });
  return out;
}

function artischocke(s, welk) {
  const sil = welk ? WELK : { ...SILBER, welk: false };
  let out = stielBlaetter(ARTI[s], welk, ([a0, S, L]) => blatt(distelKante(L, 0.45 * L), { L, W: 0.45 * L, ...sil }));
  if (s === 4 && !welk) {
    const H = 24;
    out += stiel(`M0,0Q1,${-H / 2} 0,${-H}`, welk, 2.8) + artiKnospe(0, -H - 3);
  }
  return out;
}

// ---------- Zitronengras ----------
// Halmlaenge len, seitliche Neigung lean, Spitze haengt zur Seite
function gras(x0, len, lean, welk, i, W) {
  const kl = welk ? 1.3 : 1, kh = welk ? 0.8 : 1;
  const L = len * kh, Ln = lean * kl;
  return halm([[x0, 0], [x0 + Ln * 0.2, -L * 0.5], [x0 + Ln * 0.9, -L * 0.95], [x0 + Ln * 1.1, -L * 0.55]], W, welk, i);
}

const ZITG = {
  1: [[-2, 11, -4], [2, 13, 4], [0, 9, -2]],
  2: [[-3, 16, -6], [1, 18, 5], [3, 14, 6], [-1, 15, -3], [-4, 12, -2]],
  3: [[-3, 22, -6], [-1, 26, 6], [2, 24, 7], [4, 20, -5], [-2, 19, 3], [-4, 17, -2]],
  4: [[-3, 28, -7], [-1, 33, 6], [0, 30, -5], [1, 36, 7], [3, 31, -6], [-4, 24, -3], [4, 26, 4]],
};

function zitronengras(s, welk) {
  return ZITG[s].map(([x0, len, lean], i) => gras(x0, len, lean, welk, i, 1.6)).join('');
}

// ---------- Regenbogenmangold ----------
const MANG = {
  1: [[-16, 7, 5], [14, 8, 5]],
  2: [[-22, 10, 7], [0, 12, 8], [22, 10, 7]],
  3: [[-22, 12, 8], [-8, 14, 9], [8, 14, 9], [22, 12, 8]],
  4: [[-24, 14, 9], [-8, 16, 10], [8, 16, 10], [24, 14, 9]],
};
// Bunte Stiele: rot, gelb, pink, orange (aussen, innen)
const MANG_STIELE = [['#d9364a', '#f08a9a'], ['#f2c230', '#fbe58a'], ['#e75a9c', '#f7a8cb'], ['#e8803a', '#f5b98a']];

function mangold(s, welk) {
  return stielBlaetter(MANG[s], welk, ([a0, S, L], i) => blatt(ovalKante(L, 0.55 * L, true), { L, W: 0.55 * L, ...farben(i, welk) }),
    (i) => MANG_STIELE[i % MANG_STIELE.length]);
}

// ---------- Physalis ----------
// Lampion: Huelle mit Adern, gruener Kelch oben
function lampion(x, y, col) {
  return oval(x, y, 3.6, 4.6, `fill="${col}" ${KON_GRUEN}`) +
    oval(x + 1.4, y, 2.2, 4.1, 'fill="#b8602a" opacity="0.3"') +
    [-1.6, 0, 1.6].map((dx) => linie([x + dx * 0.5, y - 4], [x + dx, y + 4], 'stroke="#b8602a" stroke-width="0.5" opacity="0.7"')).join('') +
    oval(x - 1.4, y - 0.8, 0.7, 1.6, 'fill="#ffffff" opacity="0.5"') +
    pfad(`M${f(x - 2.2)},${f(y - 3.6)}Q${f(x)},${f(y - 6.2)} ${f(x + 2.2)},${f(y - 3.6)}Z`, `fill="#5e9a52" ${KON_GRUEN}`);
}

function physalis(s, welk) {
  const H = [12, 18, 24, 28][s - 1];
  const k = welk ? 0.8 : 1;
  let out = stiel(`M0,0Q1,${f(-H / 2)} 0,${f(-H * k)}`, welk, 2.4);
  const knoten = s === 1 ? [0.45] : s === 2 ? [0.4, 0.75] : [0.35, 0.6, 0.85];
  const tipps = [];
  knoten.forEach((t, j) => {
    const ny = -H * t * k;
    for (const sd of [-1, 1]) {
      const bx = sd * 6, by = ny - 4;
      out += stiel(`M0,${f(ny)}Q${f(sd * 3)},${f(ny - 1)} ${f(bx)},${f(by)}`, welk, 1.6);
      out += an(bx, by, sd * (welk ? 120 : 50), blatt(ovalKante(6.5, 3.3, true), { L: 6.5, W: 3.3, ...farben(j + (sd > 0 ? 1 : 0), welk) }));
      tipps.push([bx, by, sd]);
    }
  });
  // Laternen an den obersten Seitentrieben: Stufe 2 eine gruene, 3 zwei gelbe, 4 drei orange
  const n = [0, 1, 2, 3][s - 1];
  const col = ['#9ccc7a', '#e8b94a', '#e8803a'][Math.min(2, Math.max(0, s - 2))];
  if (!welk) {
    for (const [bx, by, sd] of n ? tipps.slice(-n) : []) {
      const lx = bx + sd * 1.5, ly = by + 7;
      out += linie([bx, by], [lx, ly - 4.6], `stroke="#5e9a52" stroke-width="0.8" stroke-linecap="round"`) + lampion(lx, ly, col);
    }
  }
  return out;
}

// ---------- Safran (legendaer) ----------
// Krokusbluete: drei Blaetter als Becher, rote Faeden (Narben) ragen heraus
function krokus(x, y, welk) {
  const petal = 'M0,0C-3.2,-1.5 -3.4,-7.5 0,-9.5C3.4,-7.5 3.2,-1.5 0,0Z';
  const [seite, mitte, faden] = welk ? ['#a08a6a', '#b5a07a', '#c4a06a'] : ['#8a5cc0', '#a878d8', '#e0302a'];
  let out = an(x, y, -24, pfad(petal, `fill="${seite}" ${kontur(welk)}`));
  out += an(x, y, 24, pfad(petal, `fill="${seite}" ${kontur(welk)}`));
  out += an(x, y, 0, pfad(petal, `fill="${mitte}" ${kontur(welk)}`));
  out += pfad(`M${f(x)},${f(y - 3.5)}L${f(x - 0.4)},${f(y - 9)}`, `fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.35" stroke-linecap="round"`);
  out += kreis(x, y - 2.5, 1.1, 'fill="#f5c518"');
  for (const [dx, dy] of [[-3.6, -11], [0, -12.5], [3.6, -11]]) {
    out += linie([x, y - 3], [x + dx, y + dy], `stroke="${faden}" stroke-width="0.8" stroke-linecap="round"`) +
      kreis(x + dx, y + dy, 0.8, `fill="${welk ? '#c4a06a' : '#c81e1a'}"`);
  }
  return out;
}

function safran(s, welk) {
  const L = [[-3, 8, -5], [-1, 10, 4], [1, 9, -3], [3, 8, 6], [5, 7, -2], [-5, 7, 2]];
  const anz = [3, 4, 5, 6][s - 1];
  let out = L.slice(0, anz).map(([x0, len, lean], i) => gras(x0, len, lean * 0.7, welk, i + 1, 1.2)).join('');
  const blueten = {
    1: [[1, -7]],
    2: [[-2, -11]],
    3: [[-5, -12], [4, -14]],
    4: [[-6, -12], [2, -17], [7, -11]],
  }[s];
  for (const [x, y] of blueten) {
    out += stiel(`M0,0Q${f(x * 0.3)},${f(y * 0.5)} ${p2([x, y])}`, welk, 1.4);
    out += krokus(x, y, welk);
  }
  if (!welk) out += funkeln([[-11, -20, 0], [10, -26, 0.9], [-4, -34, 1.7], [8, -10, 0.4]]);
  return out;
}

// ---------- Wasabi (legendaer) ----------
const WASA = {
  1: [[-26, 9, 6], [22, 10, 6]],
  2: [[-22, 12, 7], [0, 14, 7], [22, 12, 7]],
  3: [[-24, 15, 8], [-8, 17, 9], [10, 16, 9], [26, 14, 8]],
  4: [[-24, 16, 9], [-8, 19, 10], [10, 18, 10], [26, 15, 8]],
};

// Rhizom (Stufe 3 klein, Stufe 4 gross) ragt aus der Erde
function rhizom(s, welk) {
  if (s < 3) return '';
  const rx = s === 4 ? 6.5 : 4.5;
  const grund = welk ? '#b5a57a' : '#8bb062';
  let out = oval(0, -1.2, rx, 2.6, `fill="${grund}" ${kontur(welk)}`) +
    oval(-1.5, -2.2, rx * 0.5, 0.8, 'fill="#c3dc9a" opacity="0.8"');
  for (const [x, y, r] of [[-3, -1.5, 1.1], [1.5, -2.6, 1.3], [4, -0.8, 0.9]]) {
    out += kreis(x * rx / 6.5, y, r, `fill="${welk ? '#c9b48a' : '#a6c97e'}" ${kontur(welk)}`);
  }
  out += linie([-2, 1], [-4, 3], 'stroke="#c9b07a" stroke-width="0.6" stroke-linecap="round"') +
    linie([3, 1], [5, 3], 'stroke="#c9b07a" stroke-width="0.6" stroke-linecap="round"');
  return out;
}

function wasabi(s, welk) {
  let out = stielBlaetter(WASA[s], welk, ([a0, S, L], i) => blatt(herzKante(L, 0.75 * L, true), { L, W: 0.75 * L, ...farben(i, welk) }));
  if (s === 4 || s === 3) out += rhizom(s, welk);
  return out;
}

// ---------- Goldtomate (legendaer) ----------
function goldtomate(s, welk) {
  let out = tomate(s, welk, true);
  if (!welk) out += funkeln([[-11, -14, 0], [10, -24, 0.9], [-4, -36, 1.7], [8, -42, 0.4]]);
  return out;
}

// ---------- Radieschen ----------
const RADI = {
  1: [[-30, 3, 6], [30, 3, 6]],
  2: [[-38, 4, 7], [-12, 5, 8], [14, 5, 8], [38, 4, 7]],
  3: [[-42, 5, 7.5], [-20, 6, 8.5], [4, 6, 8.5], [24, 6, 8.5], [44, 5, 7.5]],
  4: [[-44, 6, 8], [-20, 7, 9], [0, 7, 9], [20, 7, 9], [44, 6, 8]],
};

// Knolle halb aus der Erde: rote Kuppel auf der Erdlinie
function knolle(x, r, welk) {
  const d = `M${f(x - r)},0A${f(r)},${f(r * 0.9)} 0 0 1 ${f(x + r)},0Z`;
  return pfad(d, `fill="${welk ? '#b8917a' : '#d9364a'}" ${kontur(welk)}`) +
    oval(x - r * 0.35, -r * 0.45, r * 0.3, r * 0.22, 'fill="#ffffff" opacity="0.5"');
}

function radieschen(s, welk) {
  let out = stielBlaetter(RADI[s], welk, ([a0, S, L], i) => blatt(ovalKante(L, 0.55 * L, true), { L, W: 0.55 * L, ...farben(i, welk) }),
    () => ['#c9e3a8', '#b5d68f']);
  if (s === 3) out += knolle(-2.5, 2.6, welk) + knolle(2.5, 2.2, welk);
  if (s === 4) out += knolle(-3.5, 4.2, welk) + knolle(3.5, 4.0, welk);
  return out;
}

// ---------- Zusammenbau ----------
// Jede Sorte: Erdkuhle, Pflanze, bei welk abgefallene Blaetter
const eintrag = (name, seltenheit, fn) => ({
  name,
  seltenheit,
  zeichne: (stufe, welk = false) => erdkuhle() + fn(stufeN(stufe), welk) + (welk ? fallLaub() : ''),
});

export const SAAT = {
  schnittlauch: eintrag('Schnittlauch', 'gewoehnlich', (s, welk) => {
    // Roehrige Halme, Stufe 4 mit lila Kugelbluten
    const SCHN = {
      1: [[-8, 9], [7, 11], [0, 8]],
      2: [[-12, 14], [-4, 17], [5, 15], [12, 12]],
      3: [[-14, 19], [-7, 22], [0, 24], [7, 21], [14, 18]],
      4: [[-16, 24], [-10, 28], [-4, 30], [2, 31], [8, 28], [15, 24]],
    };
    const kugel = (x, y) => kreis(x, y, 4, 'fill="#9b6fc9" stroke="#5f3f8a" stroke-width="0.6"') +
      [0, 1, 2, 3, 4, 5, 6, 7].map((k) => kreis(x + 2.4 * Math.cos(k * 45 * RAD), y + 2.4 * Math.sin(k * 45 * RAD), 1.1, 'fill="#c9a6e8"')).join('') +
      kreis(x, y, 0.9, 'fill="#e7d4f5"');
    let out = oval(0, -1, 3.4, 1.8, `fill="#e8dcc0" ${kontur(welk)}`);
    SCHN[s].forEach(([a0, h]) => {
      const a = welk ? a0 * 1.6 : a0;
      const tip = welk ? [h * 1.1 * Math.sin(a * RAD), -h * 0.5] : [h * Math.sin(a * RAD), -h * Math.cos(a * RAD)];
      out += stiel(`M0,0Q${f(tip[0] * 0.2)},${f(tip[1] * 0.6)} ${p2(tip)}`, welk, 2.2);
      if (s === 4 && !welk) out += kugel(tip[0], tip[1] - 3);
    });
    return out;
  }),

  petersilie: eintrag('Petersilie', 'gewoehnlich', (s, welk) => {
    const PETER = {
      1: [[-25, 6, 5], [25, 6, 5]],
      2: [[-30, 9, 6.5], [0, 10, 7], [30, 9, 6.5]],
      3: [[-30, 11, 6.5], [-12, 12, 7], [12, 12, 7], [30, 11, 6.5]],
      4: [[-32, 13, 7], [-16, 14, 7.5], [0, 15, 7.5], [16, 14, 7.5], [32, 13, 7]],
    };
    // Gefiedertes Blatt: Spindel mit Fiederblaettchen paarweise, krause Ränder
    const fieder = (L, i) => {
      const c = farben(i, welk);
      let out = linie([0, 0], [0, -L], `stroke="${welk ? '#a8a36a' : '#477d43'}" stroke-width="0.7" stroke-linecap="round"`);
      for (const t of [0.3, 0.6]) {
        const l = L * 0.42 * (1 - t * 0.4);
        for (const sd of [-1, 1]) out += an(0, -L * t, sd * 62, blatt(ovalKante(l, 0.55 * l, true), { L: l, W: 0.55 * l, ...c }));
      }
      return out + an(0, -L, 0, blatt(ovalKante(L * 0.36, 0.5 * L * 0.36, true), { L: L * 0.36, W: 0.5 * L * 0.36, ...c }));
    };
    return stielBlaetter(PETER[s], welk, ([a0, S, L], i) => fieder(L, i));
  }),

  minze: eintrag('Minze', 'gewoehnlich', (s, welk) => minze(s, welk)),

  thymian: eintrag('Thymian', 'gewoehnlich', (s, welk) => thymian(s, welk)),

  rosmarin: eintrag('Rosmarin', 'gewoehnlich', (s, welk) => rosmarin(s, welk)),

  salbei: eintrag('Salbei', 'gewoehnlich', (s, welk) => {
    const SALB_L = SALBEI[s];
    return stielBlaetter(SALB_L, welk, ([a0, S, L]) => salbeiBlatt(L, welk));
  }),

  basilikum: eintrag('Basilikum', 'selten', (s, welk) => basilikum(s, welk)),

  tomate: eintrag('Tomate', 'selten', (s, welk) => tomate(s, welk)),

  erdbeere: eintrag('Erdbeere', 'selten', (s, welk) => erdbeere(s, welk)),

  chili: eintrag('Chili', 'selten', (s, welk) => chili(s, welk)),

  paprika: eintrag('Paprika', 'selten', (s, welk) => paprika(s, welk)),

  radieschen: eintrag('Radieschen', 'selten', (s, welk) => radieschen(s, welk)),

  artischocke: eintrag('Artischocke', 'episch', (s, welk) => artischocke(s, welk)),

  zitronengras: eintrag('Zitronengras', 'episch', (s, welk) => zitronengras(s, welk)),

  regenbogenmangold: eintrag('Regenbogenmangold', 'episch', (s, welk) => mangold(s, welk)),

  physalis: eintrag('Physalis', 'episch', (s, welk) => physalis(s, welk)),

  safran: eintrag('Safran', 'legendaer', (s, welk) => safran(s, welk)),

  wasabi: eintrag('Wasabi', 'legendaer', (s, welk) => wasabi(s, welk)),

  goldtomate: eintrag('Goldtomate', 'legendaer', (s, welk) => goldtomate(s, welk)),
};
