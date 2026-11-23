// Winter-Nachzuegler: Christrose und Amaryllis (Pflanzen), Holzschlitten und Teekanne (Deko). Export WINTER2.
// Gleiche Schnittstelle wie js/grafik/saison.js:
// art 'pflanze': zeichne(stufe 1..4, welk, ebene) mit Topf, Ursprung (0,0) = Mitte der Topf-Unterkante.
// art 'deko': zeichne() mit Ursprung (0,0) = Mitte des Bodenkontakts, lokale Isometrie wie deko.js.
// Licht von links oben, Konturen #6b4a3a, Kontaktschatten unter jedem Objekt. Alles deterministisch.

import { f, p2, gruppe, pfad, linie, oval, kreis, poly } from './hilfen.js';

const RAD = Math.PI / 180;
const FAC = [0.5, 0.72, 0.9, 1]; // Groesse je Stufe 1 bis 4

// ---------- Konturen und Farben ----------
const KON_TOPF = 'stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';
const KON_DEKO = 'stroke="#6b4a3a" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"';
const KON_GRUEN = 'stroke="#2f5a30" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const KON_WELK = 'stroke="#7d6a45" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const kontur = (welk) => (welk ? KON_WELK : KON_GRUEN);
const ADER = 'stroke="#3a6b3a" stroke-width="0.5" stroke-linecap="round" opacity="0.6"';
const SCHATTEN = 'fill="#6b4a3a" opacity="0.18"';
const GRUEN = { hell: '#7fb069', dunkel: '#5e9a52' };
const GRUEN_LEDER = { hell: '#5e9a52', dunkel: '#3a6b3a' };
const WELK = { hell: '#c4c98f', dunkel: '#a8a36a' };
const TEAK = { links: '#b8743d', rechts: '#8a5228', oben: '#d99a5b' };
const PETROL = '#2f6f73';

let zaehler = 0;
const uid = (name) => `${name}-w2${++zaehler}`;

// Lokale Isometrie wie in deko.js und saison.js: x nach rechts unten, y nach links unten, z nach oben
const KX = 0.9, KY = 0.45;
const P = (x, y, z = 0) => [(x - y) * KX, (x + y) * KY - z];
const pk = (pts, attr) => poly(pts.map(([x, y, z = 0]) => P(x, y, z)), attr);
const zug = (pts, attr) => pfad('M' + pts.map(p2).join('L'), `fill="none" ${attr}`);
const kontakt = (rx, ry) => oval(0, 0, rx, ry, SCHATTEN);
const an = (x, y, rot, inhalt) => gruppe(`transform="translate(${f(x)},${f(y)}) rotate(${f(rot)})"`, inhalt);
const zu = (pts) => 'M' + pts.map(p2).join('L') + 'Z';
const stufeN = (s) => Math.min(4, Math.max(1, Math.round(Number(s) || 1)));

// Quadratische Kurve von a nach b, bog = seitlicher Versatz der Mitte
const kurve = (a, b, bog = 0) => {
  const mx = (a[0] + b[0]) / 2 + bog, my = (a[1] + b[1]) / 2;
  return `M${f(a[0])},${f(a[1])}Q${f(mx)},${f(my)} ${f(b[0])},${f(b[1])}`;
};

// Stiel (gruen oder welk)
function stiel(d, welk, w = 2.6) {
  return pfad(d, `fill="none" stroke="${welk ? '#7d6a45' : '#2f5a30'}" stroke-width="${f(w + 0.8)}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${welk ? '#a8a36a' : '#5e9a52'}" stroke-width="${f(w)}" stroke-linecap="round"`);
}

// Blatt: Ansatz im Ursprung, Spitze bei -L (nach oben). W halbe Breite.
// spitz: unter 1 = breit nahe Ansatz, ueber 1 = breit zur Spitze (Bluetenblatt, Rundblatt)
// ader: Mittelader und Seitenadern (bei Bluetenblaettern aus)
function blatt(L, W, hell, dunkel, kon, spitz = 0.8, ader = true) {
  const R = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    R.push([W * Math.pow(Math.sin(Math.PI * Math.pow(t, spitz)), 0.85), -L * t]);
  }
  const Lk = R.map(([x, y]) => [-x, y]);
  let out = pfad(zu(R), `fill="${dunkel}"`) + pfad(zu(Lk), `fill="${hell}"`);
  if (ader) {
    out += linie([0, 0], [0, -L * 0.92], ADER);
    for (const t of [0.3, 0.55, 0.8]) {
      for (const s of [-1, 1]) out += linie([0, -L * t], [s * W * 0.5, -L * (t + 0.14)], ADER);
    }
  }
  return out + pfad(zu(R), `fill="none" ${kon}`) + pfad(zu(Lk), `fill="none" ${kon}`);
}

// Scheibe in der Grundebene auf Hoehe z (Teller, Deckel)
function scheibe(cx, cy, z, r, attr, n = 28) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a), z));
  }
  return poly(pts, attr);
}

// Quader mit sichtbaren Flaechen links (+y), rechts (+x) und oben
function quader(x0, x1, y0, y1, z0, z1, fa, kon = KON_DEKO) {
  return pk([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], `fill="${fa.links}" ${kon}`) +
    pk([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], `fill="${fa.rechts}" ${kon}`) +
    pk([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], `fill="${fa.oben}" ${kon}`);
}

// ---------- Topf (wie pflanzen.js und saison.js) ----------
function topf(R, H) {
  const Rb = R * 0.72, ry = R * 0.4, ryb = Rb * 0.4, k = R / 14;
  const korpus = `M${f(-R)},${-H}L${f(-Rb)},0A${f(Rb)},${f(ryb)} 0 0 0 ${f(Rb)},0L${R},${-H}A${R},${f(ry)} 0 0 1 ${f(-R)},${-H}Z`;
  const krumen = [[-6, 1.5, 1.1, 0.6], [-2, 2.6, 0.9, 0.5], [3, 0.8, 1, 0.55], [6, 2.2, 0.8, 0.45], [1, -1.2, 0.7, 0.4]]
    .map(([x, y, rx, rr]) => oval(x * k, -H + y * k, rx * k, rr * k, 'fill="#d6b08a"'))
    .join('');
  return oval(1, 0, Rb + 2.5, ryb + 1.5, SCHATTEN) +
    pfad(korpus, 'fill="#d9825b"') +
    pfad(`M0,${f(-H + ry)}A${R},${f(ry)} 0 0 0 ${R},${-H}L${f(Rb)},0A${f(Rb)},${f(ryb)} 0 0 1 0,${f(ryb)}Z`, 'fill="#b8643f"') +
    pfad(`M${f(-R + 3)},${f(-H + 5)}L${f(-Rb + 3)},-4`, 'fill="none" stroke="#eba47f" stroke-width="2" stroke-linecap="round" opacity="0.8"') +
    pfad(korpus, `fill="none" ${KON_TOPF}`) +
    oval(0, -H, R, ry, 'fill="#eba47f"') +
    pfad(`M0,${f(-H - ry)}A${R},${f(ry)} 0 0 1 0,${f(-H + ry)}Z`, 'fill="#d9825b"') +
    oval(0, -H, R - 2.4, ry - 1.2, 'fill="#a85a38"') +
    oval(0, -H + 0.8, R - 3.4, ry - 1.7, 'fill="#7a5238"') +
    krumen +
    oval(0, -H, R, ry, `fill="none" ${KON_TOPF}`);
}

// Abgefallene Blaetter neben dem Topf (nur welk)
function fallLaub() {
  return an(-17, 2, -70, blatt(7, 3, WELK.hell, WELK.dunkel, KON_WELK, 0.8)) +
    an(16, 3, 60, blatt(6, 2.6, WELK.hell, WELK.dunkel, KON_WELK, 0.8));
}

// Topf plus Pflanze. Inhalt ist relativ zur Erde im Topf (0,0 = Erdoberflaeche)
function mitTopf(R, H, inhalt, welk, ebene) {
  return topf(R, H) +
    gruppe(`transform="translate(0,${-H}) rotate(${welk ? 8 : 0})"`, inhalt) +
    (welk && ebene !== 'brett' ? fallLaub() : '');
}

// ---------- Winter: Christrose ----------
const CR = { hell: '#fdfbf6', dunkel: '#f1dfe3', rand: '#c9a9b3' };
const CR_WELK = { hell: '#d8bf9a', dunkel: '#b4916a', rand: '#8f6446' };

// Handfoermig geteiltes, lederiges Blatt: fuenf Fiedern faecheln vom Stielende aus
function handBlatt(x, y, rot, L, welk) {
  const g = welk ? WELK : GRUEN_LEDER;
  const kon = welk ? KON_WELK : 'stroke="#2f5a30" stroke-width="0.6" stroke-linejoin="round" stroke-linecap="round"';
  const winkel = [-62, -31, 0, 31, 62];
  const lang = [0.78, 0.92, 1, 0.92, 0.78];
  const spreiz = welk ? 1.3 : 1;
  let out = '';
  winkel.forEach((a, i) => {
    out += an(x, y, rot + a * spreiz, blatt(L * lang[i], L * 0.28, g.hell, g.dunkel, kon, 0.9));
  });
  return out;
}

// Schalenbluete mit fuenf Blaettern und gelben Staubgefaessen
function christroseBluete(x, y, r, welk) {
  const c = welk ? CR_WELK : CR;
  const kon = `stroke="${c.rand}" stroke-width="0.5" stroke-linejoin="round"`;
  let out = '';
  for (let j = 0; j < 5; j++) {
    out += an(x, y, j * 72 + 6, blatt(r, r * 0.62, c.hell, c.dunkel, kon, 1.1, false));
  }
  for (let j = 0; j < 7; j++) {
    const a = j * (360 / 7) * RAD;
    out += kreis(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, r * 0.13, 'fill="#f5c518" stroke="#b8862e" stroke-width="0.3"');
  }
  out += kreis(x, y, r * 0.18, `fill="${welk ? '#8f6446' : '#d9a441'}"`);
  return out;
}

// Knospe: rosa Spitze auf dem Stiel, kleiner gruener Kelch darunter
function christroseKnospe(x, y, L, welk) {
  const c = welk ? CR_WELK : { hell: '#fbe3e8', dunkel: '#f1c3cf', rand: '#c9a9b3' };
  return an(x, y, welk ? 15 : -6, blatt(L, L * 0.42, c.hell, c.dunkel, `stroke="${c.rand}" stroke-width="0.5" stroke-linejoin="round"`, 0.7, false)) +
    an(x, y, 180, blatt(L * 0.55, L * 0.22, GRUEN.hell, GRUEN.dunkel, KON_GRUEN, 0.8, false));
}

// Pflanze: Christrose. Stufe 1 nur Blaetter, 2 Knospen, 3 zwei Blueten, 4 vier Blueten und eine Knospe
function christrose(s, welk, ebene) {
  const k = FAC[s - 1], R = 10, H = 13;
  const ws = welk ? 1.25 : 1, wy = welk ? 0.6 : 1;
  let blaetter = '', stiele = '', koepfe = '';
  const grund = [[-16, -7, -14], [-5, -10, 6], [7, -9, 20], [16, -5, 36]].slice(0, s === 1 ? 3 : 4);
  for (const [x, y, rot] of grund) {
    const t = [x * k * ws, y * k * wy];
    blaetter += stiel(kurve([0, 0], t, x < 0 ? -1.5 : 1.5), welk, 1.3) +
      handBlatt(t[0], t[1], rot + (welk ? (x < 0 ? -20 : 20) : 0), 8.5 * k, welk);
  }
  const rf = 3.2 + 3.3 * k;
  const geo = {
    2: [[-4, -20, 'k'], [4, -22, 'k']],
    3: [[-7, -22, 'b'], [6, -24, 'b']],
    4: [[-10, -18, 'b'], [-2, -24, 'b'], [7, -24, 'b'], [14, -16, 'b'], [2, -13, 'k']],
  };
  for (const [x, y, art] of (geo[s] || [])) {
    const c = [x * k * ws, y * k * wy];
    stiele += stiel(kurve([0, 0], c, x < 0 ? -2 : 2), welk, 1.1);
    koepfe += art === 'k'
      ? christroseKnospe(c[0], c[1], 4 + 2 * k, welk)
      : christroseBluete(c[0], c[1], rf, welk);
  }
  return mitTopf(R, H, blaetter + stiele + koepfe, welk, ebene);
}

// ---------- Winter: Amaryllis ----------
const AM = { hell: '#f07a6a', dunkel: '#d94b3d', rand: '#a8321f' };
const AM_WELK = { hell: '#d9a08a', dunkel: '#b07a5c', rand: '#8f5a40' };
const ZWIEBEL_KON = 'stroke="#6b4a3a" stroke-width="1" stroke-linejoin="round"';

// Trichterbluete: sechs breite Blaetter, weisser Schlund, Staubfaeden
function amaryllisBluete(x, y, r, welk) {
  const c = welk ? AM_WELK : AM;
  const kon = `stroke="${c.rand}" stroke-width="0.5" stroke-linejoin="round"`;
  let out = '';
  for (let j = 0; j < 6; j++) {
    out += an(x, y, j * 60 + (j % 2 ? 9 : -3), blatt(r * (j % 2 ? 0.92 : 1), r * 0.5, c.hell, c.dunkel, kon, 1.45, false));
  }
  out += kreis(x, y, r * 0.28, `fill="${welk ? '#e8d8c0' : '#fff6ef'}"`);
  for (const [dx, dy] of [[0.3, -0.7], [-0.4, -0.6], [0.05, -0.9]]) {
    out += linie([x, y], [x + dx * r, y + dy * r], `stroke="${welk ? '#c4a58a' : '#fff6ef'}" stroke-width="0.6" stroke-linecap="round"`) +
      kreis(x + dx * r, y + dy * r, 0.7, `fill="${welk ? '#8f6446' : '#6b3a2a'}"`);
  }
  return out;
}

// Pflanze: Amaryllis. Zwiebel halb im Topf, langer Schaft mit Bluetenkopf
function amaryllis(s, welk, ebene) {
  const k = FAC[s - 1], R = 11, H = 14;
  const g = welk ? WELK : GRUEN;
  const kon = kontur(welk);
  const ws = welk ? 1.2 : 1, wy = welk ? 0.85 : 1;
  // Zwiebel: obere Haelfte sichtbar, Erde am Rand
  let out = pfad('M-7,0A7,7.5 0 0 1 7,0Z', `fill="${welk ? '#c9b08a' : '#f1e2c4'}" ${ZWIEBEL_KON}`) +
    pfad('M-4.5,-1Q-5.5,-5 -2.5,-6.5', 'fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.7"') +
    pfad('M2,0Q4,-3 6,-1', 'fill="none" stroke="#c9a77a" stroke-width="0.7" opacity="0.8"') +
    oval(0, 0.5, 7.6, 2.3, 'fill="#7a5238"');
  if (s === 1) {
    // Stufe 1: nur die Zwiebel mit einer Spitze
    out += an(0, -6, 0, blatt(5, 1.9, g.hell, g.dunkel, kon, 0.6));
    return mitTopf(R, H, out, welk, ebene);
  }
  // Riemenblaetter aus der Zwiebel
  for (const [a, Lf] of [[-14, 11 + 5 * k], [5, 13 + 5 * k], [18, 10 + 5 * k]]) {
    out += an(0, -3, a * (welk ? 1.2 : 1), blatt(Lf, 2.2 * k + 0.8, g.hell, g.dunkel, kon, 0.6));
  }
  // Kraeftiger Schaft
  const T = [1.5 * k * ws, -18 * k * wy];
  out += stiel(kurve([0, -3], T, 1.5), welk, 2.8);
  const rf = 5.5 * (0.6 + 0.4 * k);
  if (s === 2) {
    // Stufe 2: geschlossene Knospe am Schaftende
    out += an(T[0], T[1], 0, blatt(5 + 2 * k, (5 + 2 * k) * 0.42, AM.hell, AM.dunkel, `stroke="${AM.rand}" stroke-width="0.5" stroke-linejoin="round"`, 0.6, false));
    return mitTopf(R, H, out, welk, ebene);
  }
  const offs = s === 3 ? [[-6, -3], [6, -3]] : [[-9, -3], [-3, -8], [4, -8], [10, -3]];
  for (const [dx, dy] of offs) {
    const c = [T[0] + dx * k, T[1] + dy * k];
    out += stiel(kurve(T, c, 0), welk, 1.0) + amaryllisBluete(c[0], c[1], rf, welk);
  }
  return mitTopf(R, H, out, welk, ebene);
}

// ---------- Deko: Holzschlitten ----------
const DECKE = { links: '#c2452d', rechts: '#8f2e1e', oben: '#d9553a' };
const GESCHENK = { links: '#f0c040', rechts: '#c9962a', oben: '#f7d86a' };
const BAND = { links: '#d94b3d', rechts: '#a81e22', oben: '#ef4a3c' };

// Kufe auf Hoehe y: hinten leicht hochgezogen, vorn stark nach oben gebogen. Liefert Punkte [x, y, z]
function kufenLinie(y) {
  const L = [];
  for (let x = -19; x <= 19; x += 2) {
    const z = 0.8 + (x < -14 ? Math.pow((-14 - x) / 5, 2) * 1.5 : 0) + (x > 6 ? Math.pow((x - 6) / 13, 2) * 5.5 : 0);
    L.push([x, y, z]);
  }
  return L;
}
const kz = (L, dz = 0) => L.map(([x, y, z]) => P(x, y, z + dz));

function schlitten() {
  let out = kontakt(22, 7);
  // Kufen zuerst (hinten, dann vorn)
  for (const y of [-3.6, 3.6]) {
    const L = kufenLinie(y);
    out += zug(kz(L), 'stroke="#6b4a3a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"') +
      zug(kz(L), 'stroke="#8a5228" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"') +
      zug(kz(L, 0.6), 'stroke="#d99a5b" stroke-width="0.8" stroke-linecap="round" opacity="0.9"');
  }
  // Querverstrebungen zwischen den Kufen
  for (const xs of [-12, -3, 6]) {
    out += quader(xs - 1, xs + 1, -3.8, 3.8, 1.2, 2.0, TEAK);
  }
  // Sitzlatten, von hinten nach vorn
  for (const xs of [-15, -9, -3, 3, 9]) {
    out += quader(xs - 1, xs + 1, -5.2, 5.2, 2.0, 2.8, TEAK);
  }
  // Karierte rote Wolldecke
  out += quader(-10, 6, -5.6, 5.6, 2.8, 3.6, DECKE, 'stroke="#6b4a3a" stroke-width="0.8" stroke-linejoin="round"');
  const dz = 3.62;
  for (const x of [-7, -2, 3]) {
    out += linie(P(x, -5.6, dz), P(x, 5.6, dz), 'stroke="#f5e6d8" stroke-width="0.9" opacity="0.8"');
  }
  for (const y of [-3, 0, 3]) {
    out += linie(P(-10, y, dz), P(6, y, dz), 'stroke="#f5e6d8" stroke-width="0.9" opacity="0.8"');
  }
  // Kleines Geschenk mit Schleife auf der Decke
  out += quader(0.5, 3.5, -1.5, 1.5, 3.6, 6.0, GESCHENK) +
    quader(1.8, 2.2, -1.6, 1.6, 6.0, 6.2, BAND, 'stroke="#8a2a1e" stroke-width="0.4"') +
    quader(0.5, 3.5, -0.2, 0.2, 6.0, 6.2, BAND, 'stroke="#8a2a1e" stroke-width="0.4"');
  return out;
}

// ---------- Deko: Teekanne mit Plaetzchen ----------
// Sternplaetzchen auf Hoehe z, Mitte (cx, cy) in der Grundebene
function plaetzchen(cx, cy, z, r, rot) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (rot + i * 36) * RAD, rr = i % 2 ? r * 0.45 : r;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a), z]);
  }
  const c = P(cx, cy, z);
  return pk(pts, 'fill="#e0a85a" stroke="#a8733a" stroke-width="0.5" stroke-linejoin="round"') +
    kreis(c[0], c[1], 0.6, 'fill="#fff6ef"');
}

function teekanne() {
  const gid = uid('tk-kanne');
  // Tablett aus Teak mit leicht vertiefter Mitte
  let out = kontakt(19, 7) +
    quader(-11, 11, -8, 8, 0, 1.4, TEAK) +
    pk([[-9.5, -6.5, 1.42], [9.5, -6.5, 1.42], [9.5, 6.5, 1.42], [-9.5, 6.5, 1.42]], 'fill="#b8743d" opacity="0.35"');

  // Teekanne hinten links
  const tb = P(-6, -1, 1.4);
  const pt = (dx, dy) => p2([tb[0] + dx, tb[1] + dy]);
  out += oval(tb[0] + 1, tb[1] + 0.5, 10, 3, SCHATTEN) +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf3e4"/><stop offset="1" stop-color="#e3d2b2"/></linearGradient></defs>` +
    pfad(`M${pt(7, -11)}C${pt(13, -12)} ${pt(13, -4)} ${pt(6.5, -4)}`, 'fill="none" stroke="#6b4a3a" stroke-width="3.2" stroke-linecap="round"') +
    pfad(`M${pt(7, -11)}C${pt(13, -12)} ${pt(13, -4)} ${pt(6.5, -4)}`, 'fill="none" stroke="#f3e6cf" stroke-width="1.6" stroke-linecap="round"') +
    pfad(`M${pt(-6.5, -6)}Q${pt(-11.5, -6.5)} ${pt(-13, -13)}L${pt(-11, -13.8)}Q${pt(-9.5, -8)} ${pt(-5.5, -3.5)}Z`, `fill="#f3e6cf" ${KON_DEKO}`) +
    pfad(`M${pt(-7, -3)}C${pt(-9.5, -8)} ${pt(-9, -14)} ${pt(0, -14)}C${pt(9, -14)} ${pt(9.5, -8)} ${pt(7, -3)}C${pt(4.5, 0.5)} ${pt(-4.5, 0.5)} ${pt(-7, -3)}Z`,
      `fill="url(#${gid})" ${KON_DEKO}`) +
    pfad(`M${pt(-8, -9)}Q${pt(0, -4.5)} ${pt(8, -9)}`, `fill="none" stroke="${PETROL}" stroke-width="1"`) +
    [[-4, -7.3], [0, -6.75], [4, -7.3]].map(([dx, dy]) => kreis(tb[0] + dx, tb[1] + dy, 0.9, `fill="${PETROL}"`)).join('') +
    pfad(`M${pt(-5.5, -11)}C${pt(-6.5, -9)} ${pt(-6, -6.5)} ${pt(-4.5, -4.5)}`, 'fill="none" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity="0.7"') +
    oval(tb[0], tb[1] - 14.6, 4, 1.5, 'fill="#fbf4e6" stroke="#6b4a3a" stroke-width="0.6"') +
    kreis(tb[0], tb[1] - 16.6, 1.5, `fill="${PETROL}"`);

  // Teller mit Sternplaetzchen hinten rechts
  out += scheibe(5, -5, 1.4, 5.4, 'fill="#d9c7a4" stroke="#8a7a60" stroke-width="0.5"') +
    scheibe(5, -5, 2.2, 4.4, 'fill="#fbf4e6" stroke="#b9ab8a" stroke-width="0.5"') +
    plaetzchen(4.2, -5.6, 2.2, 2.1, 0) +
    plaetzchen(6.2, -4.4, 2.2, 2.1, 40) +
    plaetzchen(5.2, -3.4, 2.2, 2.1, 20);

  // Tasse mit Dampf vorn
  const c = P(5, 5, 1.4);
  const [cx, cy] = c;
  out += oval(cx + 1, cy, 5.5, 2, SCHATTEN) +
    pfad(`M${p2([cx + 3.8, cy - 5])}C${p2([cx + 7.5, cy - 5.5])} ${p2([cx + 7.5, cy - 1.5])} ${p2([cx + 3.6, cy - 1.8])}`, 'fill="none" stroke="#6b4a3a" stroke-width="1.4" stroke-linecap="round"') +
    pfad(`M${p2([cx - 4, cy - 6])}L${p2([cx + 4, cy - 6])}Q${p2([cx + 3.6, cy])} ${p2([cx, cy])}Q${p2([cx - 3.6, cy])} ${p2([cx - 4, cy - 6])}Z`, `fill="#f7efe0" ${KON_DEKO}`) +
    pfad(`M${p2([cx - 3.9, cy - 3])}Q${p2([cx, cy - 1.2])} ${p2([cx + 3.9, cy - 3])}`, `fill="none" stroke="${PETROL}" stroke-width="0.8"`) +
    oval(cx, cy - 6, 4, 1.5, 'fill="#fbf4e6" stroke="#6b4a3a" stroke-width="0.5"') +
    oval(cx, cy - 6, 3.2, 1, 'fill="#8a5a3a"');
  // Zwei weiche Dampfkringel, leicht animiert
  out += `<path d="M${p2([cx - 1.2, cy - 8])}C${p2([cx - 3.2, cy - 11])} ${p2([cx + 1.4, cy - 13])} ${p2([cx - 0.6, cy - 17])}" fill="none" stroke="#9fb8c4" stroke-width="1.1" stroke-linecap="round" opacity="0.7"><animate attributeName="opacity" values="0.2;0.8;0.2" dur="3.2s" repeatCount="indefinite"/></path>` +
    `<path d="M${p2([cx + 1.8, cy - 8])}C${p2([cx + 3.8, cy - 11])} ${p2([cx, cy - 14])} ${p2([cx + 2, cy - 18])}" fill="none" stroke="#9fb8c4" stroke-width="1.1" stroke-linecap="round" opacity="0.7"><animate attributeName="opacity" values="0.2;0.8;0.2" dur="3.8s" begin="0.8s" repeatCount="indefinite"/></path>`;
  return out;
}

export const WINTER2 = {
  christrose: { name: 'Christrose', art: 'pflanze', groesse: 'klein', saison: 'winter', zeichne: (stufe = 1, welk = false, ebene = 'boden') => christrose(stufeN(stufe), welk, ebene) },
  amaryllis: { name: 'Amaryllis', art: 'pflanze', groesse: 'klein', saison: 'winter', zeichne: (stufe = 1, welk = false, ebene = 'boden') => amaryllis(stufeN(stufe), welk, ebene) },
  schlitten: { name: 'Holzschlitten', art: 'deko', saison: 'winter', zeichne: () => schlitten() },
  teekanne: { name: 'Teekanne mit Plätzchen', art: 'deko', groesse: 'klein', saison: 'winter', zeichne: () => teekanne() },
};
