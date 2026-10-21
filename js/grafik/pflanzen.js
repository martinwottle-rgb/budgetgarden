// Pflanzen als SVG-Strings. zeichne(stufe, welk, ebene) liefert Topf und Pflanze mit Ursprung (0,0) = Mitte der
// Topf-Unterkante, ohne Positionierung und ohne Skalierung. Stufe 1 bis 4 wachsen deutlich.
// ebene: 'boden' (Standard) oder 'brett' (Stellplatz auf einem Moebel).

import { f, p2, gruppe, pfad, linie, oval, kreis, rechteck, poly, qb, zufall, iso, kiste, OX, OY } from './hilfen.js';

const RAD = Math.PI / 180;

// Konturen: Topf und Holzstab braun, Blaetter, Stiele und Bluetenblaetter in dunklem Gruen (welk: Erdton).
const KON_TOPF = 'stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';
const KON_GRUEN = 'stroke="#2f5a30" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const KON_WELK = 'stroke="#7d6a45" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const kontur = (welk) => (welk ? KON_WELK : KON_GRUEN);
// Innenlinien (Adern)
const ADER = 'stroke="#3a6b3a" stroke-width="0.5" stroke-linecap="round" opacity="0.6"';

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
    oval(0, -H + 0.8, R - 3.4, ry - 1.7, 'fill="#7a5238"') +
    krumen +
    oval(0, -H, R, ry, `fill="none" ${KON_TOPF}`);
}

// Abgefallene Blaetter liegen flach direkt neben dem Topf. Auf dem Boden nur in Richtung Raummitte
// (positive Feldrichtungen), damit nichts in eine Wand ragt. Auf einem Brett nur entlang der Brettlaenge (gy),
// weil die Brettbreite nur ca. 0.45 Feld betraegt. Nur bei welk.
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

// ---------- Blattgeometrie ----------
// Kubischer Bezier, P = [P0, C1, C2, P3]
function bez(P, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [0, 1].map((j) => a * P[0][j] + b * P[1][j] + c * P[2][j] + d * P[3][j]);
}

// Weiche Zahnung: sanfte Wellen statt spitzer Zacken
const WELLE = (i) => 1 + 0.05 * Math.sin((2 * Math.PI * i) / 6.5);

// Herzform: Blattgrund (0,0) mit Lappen nach unten, Spitze (0,-L). Rechte Kante als Punktfolge (40 Schritte).
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

const p2pfad = (pts) => 'M' + pts.map(p2).join('L') + 'Z';
const an = (x, y, rot, inhalt) => gruppe(`transform="translate(${f(x)},${f(y)}) rotate(${f(rot)})"`, inhalt);

// Blatt aus rechter Kante R (Grund (0,0), Spitze (0,-L)). Linke Haelfte heller (Licht von links), rechte dunkler.
// o: { L, W, hell, dunkel, welk, loecher: [[x, y, rx, ry]] }. Loecher liegen je auf einer Seite.
function blatt(R, o) {
  const { L, W, hell, dunkel, welk } = o;
  const Lk = R.map(([x, y]) => [-x, y]);
  const lk = Lk.slice().reverse();
  const loecher = o.loecher || [];
  const ell = ([x, y, rx, ry]) => `M${f(x - rx)},${f(y)}a${f(rx)},${f(ry)} 0 1,0 ${f(2 * rx)},0a${f(rx)},${f(ry)} 0 1,0 ${f(-2 * rx)},0Z`;
  const seite = (s) => loecher.filter((h) => Math.sign(h[0]) === s).map(ell).join('');
  let out = pfad(p2pfad(R) + seite(1), `fill="${dunkel}" fill-rule="evenodd"`) +
    pfad(p2pfad(lk) + seite(-1), `fill="${hell}" fill-rule="evenodd"`);
  out += linie([0, 0], [0, -L * 0.92], `${ADER}`);
  for (const t of [0.3, 0.5, 0.7]) {
    for (const s of [-1, 1]) {
      out += linie([0, -L * t], [s * W * 0.4, -L * (t + 0.12)], `${ADER}`);
    }
  }
  out += pfad(p2pfad(R.concat(lk)) + loecher.map(ell).join(''), `fill="none" ${kontur(welk)}`);
  out += linie([-W * 0.3, -L * 0.2], [-W * 0.2, -L * 0.5], 'stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="0.45"');
  return out;
}

// Gruene Toene (Licht/Schatten) und Welk-Toene
const GRUEN = [
  { hell: '#7fb069', dunkel: '#5e9a52', welk: false },
  { hell: '#9ccc7a', dunkel: '#7fb069', welk: false },
];
const WELK = { hell: '#c4c98f', dunkel: '#a8a36a', welk: true };
const farben = (i, welk) => (welk ? WELK : GRUEN[i % 2]);

// Stiel mit dunkler Kontur (0.7 px je Seite), Farbkern und Glanzlinie
function stiel(d, welk, w = 3.2) {
  const [rand, aussen, innen] = welk ? ['#7d6a45', '#a8a36a', '#c4c98f'] : ['#2f5a30', '#477d43', '#7fb069'];
  return pfad(d, `fill="none" stroke="${rand}" stroke-width="${f(w + 1.4)}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${aussen}" stroke-width="${w}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${innen}" stroke-width="${f(w * 0.55)}" stroke-linecap="round"`);
}

// Stern (Blattkranz, Sternchen, Dornen): n Spitzen
function stern(x, y, ro, c, n = 5) {
  const pts = [];
  for (let k = 0; k < 2 * n; k++) {
    const a = (-90 + k * 180 / n) * RAD;
    const r = k % 2 ? ro * 0.42 : ro;
    pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
  }
  return poly(pts, `fill="${c}" stroke="#7a5a1a" stroke-width="0.3" stroke-linejoin="round"`);
}

// Blaetter an langen, bogigen Stielen aus der Erde (Ursprung = Erdoberflaeche).
// eintraege: [winkel, stiellaenge, blattlaenge, ...]. welk: Stiele kuerzer, Blaetter haengen.
function stielBlaetter(eintraege, welk, blattFn) {
  let stiele = '', blaetter = '';
  eintraege.forEach((eintrag, i) => {
    const [a0, S] = eintrag;
    const a = welk ? a0 * 1.25 : a0;
    const ex = S * Math.sin(a * RAD), ey = -S * Math.cos(a * RAD) * (welk ? 0.45 : 1);
    const C = welk ? [ex * 0.5, ey * 0.1] : [ex * 0.1, ey * 0.75];
    stiele += stiel(`M0,0Q${f(C[0])},${f(C[1])} ${f(ex)},${f(ey)}`, welk);
    const rot = welk ? (a0 < 0 ? -150 : 150) : a * 0.8;
    blaetter += an(ex, ey, rot, blattFn(eintrag, i));
  });
  return stiele + blaetter;
}

// ---------- Monstera ----------
// Blattumriss: Ansatz (0,0), Spitze (0,-L). Rechte Haelfte als kubische Beziers [P0, C1, C2, P3].
// Breiteste Stelle bei y = -0.45 L, Herzbucht am Ansatz, die Lappen gehen 0.12 L unter den Ansatz.
function monsteraRechts(L) {
  const p = (x, y) => [x * L, y * L];
  return [
    [p(0, 0), p(0.02, 0.1), p(0.12, 0.15), p(0.2, 0.12)],
    [p(0.2, 0.12), p(0.36, 0.12), p(0.45, -0.1), p(0.45, -0.45)],
    [p(0.45, -0.45), p(0.45, -0.75), p(0.25, -0.92), p(0, -1)],
  ];
}

const sp = (q) => `${f(q[0])},${f(q[1])}`;
const spiegel = (q) => [-q[0], q[1]];

function monsteraUmriss(L) {
  const seg = monsteraRechts(L);
  const rechts = seg.map(([, c1, c2, e]) => `C${sp(c1)} ${sp(c2)} ${sp(e)}`).join('');
  const links = seg.slice().reverse().map(([a, c1, c2]) => `C${sp(spiegel(c2))} ${sp(spiegel(c1))} ${sp(spiegel(a))}`).join('');
  return {
    rechts,
    links,
    ganz: `M0,0${rechts}${links}Z`,
    halbRechts: `M0,0${rechts}L0,0Z`,
    halbLinks: `M0,0L0,${f(-L)}${links}Z`,
  };
}

// Halbe Blattbreite (Abstand zur Mittelader) auf Hoehe y
function monsteraBreite(L, y) {
  const pts = [];
  for (const seg of monsteraRechts(L)) for (let i = 0; i <= 30; i++) pts.push(bez(seg, i / 30));
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (y0 !== y1 && (y0 - y) * (y1 - y) <= 0) return x0 + (x1 - x0) * (y - y0) / (y1 - y0);
  }
  return 0;
}

// Keilfoermiger Einschnitt von einer Seite (sd = +1 rechts, -1 links). Spitze bei 20 % der Halbbreite (nahe an der Mittelrippe),
// leicht zur Blattspitze geneigt. keil: Maskenform (schwarz), kante: Konturlinie an den Schnittstellen.
function monsteraSchlitz(L, y, sd, tief) {
  const wE = monsteraBreite(L, y);
  const xI = tief * wE, yI = y - 0.1 * L;
  const xo = wE + 0.12 * L, hb = 0.075 * L;
  const at = (x, yy) => [sd * x, yy];
  const t = (wE - xI) / (xo - xI); // Schnitt der Keilkanten mit dem Rand
  return {
    keil: [at(xI, yI), at(xo, y + hb), at(xo, y - hb)],
    kante: [
      at(wE, yI + t * (y + hb - yI)),
      at(xI, yI),
      at(wE, yI + t * (y - hb - yI)),
    ],
  };
}

// Farben: Licht von links (linke Haelfte heller), Mittelader und Glanz hell
const MON_GRUEN = { links: '#58995b', rechts: '#3f7d4a', mittel: '#a8d690', glanz: '#c9e8b4', ader: '#8fc27a' };
const MON_WELK = { links: '#c4c98f', rechts: '#a8a36a', mittel: '#e4e3b4', glanz: '#f0efcc', ader: '#d6d59c' };

// Monsterablatt: Ansatz bei (0,0), Winkel dreht das Blatt um den Ansatz, persp staucht es in Laengsrichtung
// (schraeg gestellt, perspektivisch verkuerzt). schlitze: Einschnitte je Seite, loecher: Anzahl ovaler Loecher,
// ton: 'gruen' oder 'welk'. Schlitze und Loecher liegen ueber eine <mask>, damit der Umriss sauber ausgeschnitten ist.
function monsteraBlatt(L, winkel, schlitze, loecher, ton, persp = 1, tief = 0.3) {
  const welk = ton === 'welk';
  const T = welk ? MON_WELK : MON_GRUEN;
  const kon = kontur(welk);
  const U = monsteraUmriss(L);
  const id = `mon${Math.round(L)}s${schlitze}h${loecher}t${Math.round(tief * 100)}`;
  const ys = schlitze === 0 ? [] : Array.from({ length: schlitze }, (_, k) =>
    (schlitze === 1 ? -0.5 : -(0.15 + 0.7 * k / (schlitze - 1))) * L);

  let maske = pfad(U.ganz, 'fill="#fff" stroke="#fff" stroke-width="1.5"');
  let kanten = '';
  for (const y of ys) {
    for (const sd of [1, -1]) {
      const k = monsteraSchlitz(L, y, sd, tief);
      maske += poly(k.keil, 'fill="#000"');
      kanten += pfad(`M${sp(k.kante[0])}L${sp(k.kante[1])}L${sp(k.kante[2])}`, `fill="none" ${kon}`);
    }
  }
  // Loecher: eine Reihe neben der Mittelrippe, abwechselnd links und rechts
  const lochPos = [];
  for (let j = 0; j < loecher; j++) {
    const y = -(0.3 + 0.2 * j) * L;
    const x = (j % 2 ? -1 : 1) * 0.22 * monsteraBreite(L, y);
    lochPos.push([x, y]);
    maske += oval(x, y, 0.07 * L, 0.045 * L, 'fill="#000"');
  }

  // Seitenadern: von der Mittelrippe schraeg nach oben zum Rand, heller als die Flaeche
  const nAd = L > 20 ? 4 : 3;
  let adern = '';
  for (let k = 0; k < nAd; k++) {
    const yk = -(0.28 + 0.42 * k / (nAd - 1)) * L;
    for (const sd of [1, -1]) {
      const w1 = monsteraBreite(L, yk), w2 = monsteraBreite(L, yk - 0.2 * L);
      adern += pfad(`M0,${f(yk)}Q${f(sd * w1 * 0.5)},${f(yk - 0.03 * L)} ${f(sd * w2 * 0.9)},${f(yk - 0.2 * L)}`,
        `fill="none" stroke="${T.ader}" stroke-width="0.6" stroke-linecap="round" opacity="0.7"`);
    }
  }

  const innen = pfad(U.halbRechts, `fill="${T.rechts}"`) +
    pfad(U.halbLinks, `fill="${T.links}"`) +
    adern +
    linie([0, 0], [0, -0.92 * L], `stroke="${T.mittel}" stroke-width="1" stroke-linecap="round"`) +
    linie([-0.22 * L, -0.25 * L], [-0.3 * L, -0.5 * L], `stroke="${T.glanz}" stroke-width="1.2" stroke-linecap="round" opacity="0.55"`) +
    pfad(U.ganz, `fill="none" ${kon}`);
  const lochKontur = lochPos.map(([x, y]) => oval(x, y, 0.07 * L, 0.045 * L, `fill="none" ${kon}`)).join('');

  const sc = persp === 1 ? '' : ` scale(1,${f(persp)})`;
  return gruppe(`transform="rotate(${f(winkel)})${sc}"`,
    `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${f(-1.5 * L)}" y="${f(-1.5 * L)}" width="${f(3 * L)}" height="${f(3 * L)}">${maske}</mask></defs>` +
    `<g mask="url(#${id})">${innen}</g>` + kanten + lochKontur);
}

// Monstera-Stufen: [Winkel, Stiellaenge, Blattlaenge, Schlitze je Seite, Loecher, Verkuerzung (1 = flach von vorn)]
const MONSTERA = {
  1: [[-35, 15, 14, 0, 0, 1], [30, 16, 14, 0, 0, 0.9]],
  2: [[-45, 17, 18, 0, 0, 0.9], [0, 19, 18, 0, 0, 1], [42, 17, 18, 0, 0, 0.85]],
  // Stufe 3: zwei tiefe, zwei mittelhohe Blaetter mit kuerzeren Schlitzen (tief 0.45, siehe monstera())
  3: [[-70, 18, 22, 2, 1, 0.9], [68, 18, 22, 2, 1, 0.9], [-26, 28, 23, 3, 2, 1], [12, 34, 22, 3, 2, 1]],
  // Stufe 4: lockerer Busch, zwei tief seitlich, zwei mittelhoch, eins oben
  4: [[-84, 16, 26, 5, 3, 0.9], [82, 18, 26, 5, 3, 0.9], [-50, 30, 26, 5, 3, 1], [48, 30, 26, 5, 3, 1], [-6, 40, 24, 4, 2, 0.95]],
};
// Junges, noch eingerolltes Blatt (nur Stufe 4): [Winkel, Stiellaenge, Blattlaenge]
const MONSTERA_ROLLE = { 4: [14, 34, 13] };

// Welk: Blaetter haengen nach aussen und unten
const welkWinkel = (a0) => (a0 < 0 ? -120 : 120) + a0 * 0.2;

// Junges, eingerolltes Blatt: schmale, hellgruene Spindel mit Rolllinie
function monsteraRolle(L, winkel) {
  const R = ovalKante(L, 1.6, false);
  return gruppe(`transform="rotate(${f(winkel)})"`,
    zweiseitig(R, '#c8e8a8', '#8cc47a') +
    linie([0.3, -L * 0.2], [0.8, -L * 0.75], 'stroke="#5e9a52" stroke-width="0.6" stroke-linecap="round" opacity="0.8"') +
    pfad(p2pfad(umriss(R)), `fill="none" ${KON_GRUEN}`));
}

// Moosstab (braun-gruen, 2.5 breit) mit einer Luftwurzel, nur Stufe 4
function monsteraStab(welk) {
  const holz = welk ? '#9c9466' : '#8a7f4e';
  const moos = welk ? '#a8a36a' : '#5e9a52';
  const moos2 = welk ? '#c4c98f' : '#8cc47a';
  let out = rechteck(-1.25, -44, 2.5, 44, 1.2, `fill="${holz}" ${KON_TOPF}`) +
    linie([-0.6, -42], [-0.6, -3], 'stroke="#b3a774" stroke-width="0.5" stroke-linecap="round" opacity="0.7"');
  for (let k = 0; k < 7; k++) {
    out += oval(k % 2 ? -0.6 : 0.6, -6 - k * 6, 2.2, 1.3, `fill="${k % 2 ? moos2 : moos}" stroke="#3a6b3a" stroke-width="0.5"`);
  }
  // Eine Luftwurzel: vom Stab nach unten Richtung Topfrand
  out += pfad('M1.2,-26Q5,-21 3.6,-6', 'fill="none" stroke="#a86b43" stroke-width="0.9" stroke-linecap="round"') +
    pfad('M1.5,-26Q4.4,-21.5 3,-7', 'fill="none" stroke="#e2b07c" stroke-width="0.35" stroke-linecap="round" opacity="0.8"');
  return out;
}

function monstera(s, welk) {
  const ton = welk ? 'welk' : 'gruen';
  const tab = MONSTERA[s].map(([a0, S, L, schlitze, loecher, persp]) => ({ a0, S, L, schlitze, loecher, persp }));
  const rolle = welk || !MONSTERA_ROLLE[s] ? null
    : { a0: MONSTERA_ROLLE[s][0], S: MONSTERA_ROLLE[s][1], L: MONSTERA_ROLLE[s][2] };
  let stiele = '';
  const ansatz = [...tab, ...(rolle ? [rolle] : [])].map((b) => {
    const ex = b.S * Math.sin(b.a0 * RAD) * (welk ? 0.8 : 1);
    const ey = -b.S * Math.cos(b.a0 * RAD) * (welk ? 0.7 : 1);
    stiele += stiel(`M0,0Q${f(ex * 0.1)},${f(ey * 0.75)} ${f(ex)},${f(ey)}`, welk, 2.2);
    return [ex, ey];
  });
  // Hintere (weit aussen) zuerst, die mittleren Blaetter liegen oben
  const reihe = tab.map((b, i) => ({ b, i })).sort((p, q) => Math.abs(q.b.a0) - Math.abs(p.b.a0) || p.i - q.i);
  let blaetter = '';
  for (const { b, i } of reihe) {
    const [ex, ey] = ansatz[i];
    const winkel = welk ? welkWinkel(b.a0) : b.a0;
    blaetter += an(ex, ey, 0, monsteraBlatt(b.L, winkel, b.schlitze, b.loecher, ton, b.persp, s === 3 ? 0.45 : 0.3));
  }
  if (rolle) {
    const [ex, ey] = ansatz[tab.length];
    blaetter += an(ex, ey, 0, monsteraRolle(rolle.L, rolle.a0));
  }
  return (s === 4 ? monsteraStab(welk) : '') + stiele + blaetter;
}

// ---------- Goldkugelkaktus ----------
function kaktus(s, welk) {
  const r = [6, 8, 10, 12][s - 1];
  const cy = -r; // Kugel sitzt auf der Erde
  const hell = welk ? '#b5c48a' : '#8fc98a';
  const schatten = welk ? '#a8a36a' : '#6fb06a';
  const rippe = welk ? '#8c8650' : '#4f8a4a';
  const dorn = welk ? '#d9c27a' : '#ffd23f';
  const wy = cy - r * 0.75; // Wollscheitel nahe dem oberen Pol
  let out = kreis(0, cy, r, `fill="${hell}"`) +
    pfad(`M0,${f(cy - r)}A${f(r)},${f(r)} 0 0 1 0,${f(cy + r)}Z`, `fill="${schatten}" opacity="0.8"`);
  for (let i = 0; i < 11; i++) {
    const lam = (i - 5) * 16 * RAD;
    const sw = Math.sin(lam) >= 0 ? 1 : 0;
    out += pfad(`M0,${f(cy - r)}A${f(r * Math.abs(Math.sin(lam)))},${f(r)} 0 0 ${sw} 0,${f(cy + r)}`,
      `fill="none" stroke="${rippe}" stroke-width="1" stroke-linecap="round"`);
  }
  // Dornen als feine Sternchen auf den Rippenkanten
  const lats = s === 1 ? [0] : s === 2 ? [-20, 20] : [-40, -12, 16, 42];
  for (const lat of lats) {
    for (let i = 0; i < 11; i++) {
      if (s === 1 && i % 3) continue;
      const lam = (i - 5) * 16 * RAD, phi = lat * RAD;
      out += stern(r * Math.cos(phi) * Math.sin(lam), cy - r * Math.sin(phi), Math.max(0.7, r * 0.1), dorn, 4);
    }
  }
  out += oval(0, wy, r * 0.36, r * 0.2, 'fill="#f7f0dc" stroke="#b9ad8f" stroke-width="0.6"');
  if (s === 4) {
    for (const deg of [200, 250, 290, 340]) {
      const a = deg * RAD;
      const x = r * 0.5 * Math.cos(a), y = wy + r * 0.28 * Math.sin(a);
      out += kreis(x, y, r * 0.2, `fill="${welk ? '#9c8b7a' : '#ffe08a'}" ${kontur(welk)}`) +
        kreis(x, y, r * 0.08, `fill="${welk ? '#6b5a4a' : '#f5c518'}"`);
    }
  }
  out += kreis(0, cy, r, `fill="none" ${kontur(welk)}`);
  return out;
}

// ---------- Sonnenblume ----------
function sonnenblume(s, welk) {
  if (s === 1) {
    const dreh = welk ? 70 : 28;
    const cot = (sg) => oval(sg * 4.2, -11, 4.6, 2.6,
      `transform="rotate(${sg * dreh} ${sg * 4.2} -11)" fill="${welk ? '#b5c48a' : '#7fb069'}" ${kontur(welk)}`);
    return stiel('M0,0L0,-10', welk, 2.8) + cot(-1) + cot(1);
  }
  const H = [0, 40, 66, 72][s - 1];
  const X = s === 4 ? 5 : 0;
  const P = (t) => qb([0, 0], [2, -H / 2], [X, -H], t);
  let out = stiel(`M0,0Q2,${f(-H / 2)} ${X},${-H}`, welk);
  const L = [0, 17, 19, 20][s - 1];
  const blaetter = s === 2 ? [[0.3, -1], [0.5, 1], [0.7, -1], [0.9, 1]]
    : s === 3 ? [[0.22, -1], [0.42, 1], [0.62, -1]]
      : [[0.2, -1], [0.4, 1], [0.6, -1]];
  blaetter.forEach(([t, sd], i) => {
    const [x, y] = P(t);
    out += an(x, y, sd * (welk ? 125 : 55), blatt(herzKante(L, 0.7 * L, true), { L, W: 0.7 * L, ...farben(i, welk) }));
  });
  if (s === 3) {
    // Geschlossene gruene Knospe mit Kelchblaettern
    out += an(X, -H + 2, -28, blatt(ovalKante(15, 4.5, true), { L: 15, W: 4.5, ...farben(0, welk) })) +
      an(X, -H + 2, 28, blatt(ovalKante(15, 4.5, true), { L: 15, W: 4.5, ...farben(1, welk) })) +
      oval(X, -H - 6, 5.5, 7, `fill="${welk ? '#a8a36a' : '#7fb069'}" ${kontur(welk)}`) +
      linie([X - 2, -H - 9], [X - 1, -H - 2], `stroke="${welk ? '#c4c98f' : '#9ccc7a'}" stroke-width="1" stroke-linecap="round"`);
  }
  if (s === 4) {
    const C = welk
      ? { aussen: '#c9a46a', innen: '#d8b97a', scheibe: '#6b5a4a', punkt: '#4a3a2a' }
      : { aussen: '#e8a90c', innen: '#f5c518', scheibe: '#7a4a2a', punkt: '#4a2c18' };
    let kopf = '';
    for (let i = 0; i < 16; i++) kopf += oval(0, -15, 3.8, 7.6, `transform="rotate(${i * 22.5})" fill="${C.aussen}" ${kontur(welk)}`);
    for (let i = 0; i < 16; i++) kopf += oval(0, -11.8, 3.4, 6, `transform="rotate(${i * 22.5 + 11.25})" fill="${C.innen}" ${kontur(welk)}`);
    kopf += kreis(0, 0, 8.6, `fill="${C.scheibe}" ${kontur(welk)}`);
    for (const [rr, n] of [[2.8, 6], [5, 12], [6.9, 18]]) {
      for (let i = 0; i < n; i++) {
        const a = (i + rr * 0.3) * 2 * Math.PI / n;
        kopf += kreis(rr * Math.cos(a), rr * Math.sin(a), 0.75, `fill="${C.punkt}"`);
      }
    }
    kopf += oval(-2.6, -3.2, 2.6, 1.6, 'fill="#ffffff" opacity="0.2"');
    out += an(X, -H, welk ? 150 : 22, kopf);
  }
  return out;
}

// ---------- Tomate ----------
// Fiederblatt: Spindel nach oben, je zwei Fiederblaettchen paarweise und ein Endblaettchen (5 pro Blatt),
// dafuer groessere Blaettchen und weniger Blaetter je Pflanze.
function tomatenBlatt(len, welk, i) {
  const col = welk ? WELK : GRUEN[i % 2];
  let out = linie([0, 0], [0, -len], `stroke="${welk ? '#a8a36a' : '#477d43'}" stroke-width="1" stroke-linecap="round"`);
  const blaettchen = (x, y, rot, L) => an(x, y, rot, blatt(ovalKante(L, 0.5 * L, true), { L, W: 0.5 * L, ...col }));
  for (const fr of [0.4, 0.7]) {
    for (const sd of [-1, 1]) out += blaettchen(0, -len * fr, sd * 55, len * 0.55);
  }
  out += blaettchen(0, -len, 0, len * 0.6);
  return out;
}

// Tomatenfrucht mit Glanzpunkt und gruenem Kelch-Stern
function frucht(x, y, r) {
  return kreis(x, y, r, 'fill="#b8362e"') +
    kreis(x - r * 0.22, y - r * 0.22, r * 0.9, 'fill="#e0533d"') +
    kreis(x - r * 0.4, y - r * 0.42, r * 0.22, 'fill="#ffffff" opacity="0.75"') +
    kreis(x, y, r, `fill="none" ${KON_GRUEN}`) +
    stern(x, y - r * 0.9, r * 0.5, '#5e9a52', 5);
}

function blume(x, y) {
  let out = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * RAD;
    out += kreis(x + 2.3 * Math.cos(a), y + 2.3 * Math.sin(a), 1.7, `fill="#ffd23f" ${KON_GRUEN}`);
  }
  return out + kreis(x, y, 1.1, 'fill="#f5c518"');
}

function tomate(s, welk) {
  const H = [24, 48, 70, 88][s - 1];
  const P = (t) => qb([2, 0], [6, -H / 2], [4, -H], t);
  const SH = H + 14;
  // Holzstab mit Licht, Schatten und Maserung
  let out = rechteck(-5, -SH, 4, SH, 1.5, `fill="#c98f5a" ${KON_TOPF}`) +
    linie([-4.2, -SH + 2], [-4.2, -2], 'stroke="#e2b07c" stroke-width="1" stroke-linecap="round"') +
    linie([-1.6, -SH + 2], [-1.6, -2], 'stroke="#a86b43" stroke-width="1"') +
    linie([-3, -SH * 0.6], [-2.6, -SH * 0.4], 'stroke="#a86b43" stroke-width="0.5"') +
    linie([-3.4, -SH * 0.25], [-3, -SH * 0.1], 'stroke="#a86b43" stroke-width="0.5"');
  out += stiel(`M2,0Q6,${f(-H / 2)} 4,${-H}`, welk, 3);
  for (const t of [0.3, 0.55, 0.8]) {
    const [x, y] = P(t);
    out += linie([-3.5, y + 1.6], [x + 0.5, y - 1.4], 'stroke="#e8c48a" stroke-width="1.6" stroke-linecap="round"');
  }
  const T = { 1: [0.55, 0.8], 2: [0.35, 0.75], 3: [0.3, 0.6, 0.85], 4: [0.25, 0.5, 0.78] }[s];
  const LEN = [11, 14, 17, 18][s - 1];
  T.forEach((t, i) => {
    const [x, y] = P(t);
    const sd = i % 2 ? 1 : -1;
    out += an(x, y, sd * (welk ? 110 : 52), tomatenBlatt(LEN, welk, i));
  });
  if (s === 3) {
    const [gx, gy] = P(0.55), [hx, hy] = P(0.4);
    out += linie([gx, gy], [-6, -H * 0.6 + 6], 'stroke="#5e9a52" stroke-width="1" stroke-linecap="round"') +
      kreis(-6, -H * 0.6 + 6, 2.6, `fill="#9ccc7a" ${KON_GRUEN}`) +
      linie([hx, hy], [8, -H * 0.55], 'stroke="#5e9a52" stroke-width="1" stroke-linecap="round"') +
      kreis(8, -H * 0.55, 2.4, `fill="#9ccc7a" ${KON_GRUEN}`);
    out += blume(1, -H - 3) + blume(-5, -H + 2) + blume(9, -H + 5);
  }
  if (s === 4) {
    const [px, py] = P(0.6);
    for (const [x, y, r] of [[-6, -52, 5.4], [9, -54, 4.6], [1, -40, 5.6], [11, -37, 4.2]]) {
      out += linie([px, py], [x, y - r], 'stroke="#5e9a52" stroke-width="1" stroke-linecap="round"') + frucht(x, y, r);
    }
  }
  return out;
}

// ---------- Efeutute ----------
// Gruen mit gelblicher Panaschierung (Streifen)
const EF_R = 10;
const EF_AUF = {
  1: [[-36, 8, 9], [6, 9, 10], [40, 7, 8]],
  2: [[-52, 9, 10], [-16, 10, 11], [14, 9, 10], [46, 8, 9]],
  3: [[-60, 10, 11], [-30, 11, 12], [0, 12, 12], [30, 10, 11], [58, 9, 10]],
  4: [[-66, 11, 12], [-38, 12, 13], [-12, 13, 13], [14, 12, 12], [40, 11, 12], [64, 10, 10]],
};
// [Richtung (+1 rechts, -1 links), Fall in Pflanzenkoordinaten (Erdoberflaeche = 0)]
const EF_RANKEN = { 1: [], 2: [[1, 14]], 3: [[1, 26], [-1, 20]], 4: [[1, 40], [-1, 36], [1, 22]] };

function streifen(L, W) {
  const st = 'fill="none" stroke="#e8e29a" stroke-linecap="round"';
  return pfad(`M${f(W * 0.12)},${f(-L * 0.28)}Q${f(W * 0.3)},${f(-L * 0.45)} ${f(W * 0.22)},${f(-L * 0.62)}`, `${st} stroke-width="1.4"`) +
    pfad(`M${f(-W * 0.15)},${f(-L * 0.2)}Q${f(-W * 0.3)},${f(-L * 0.4)} ${f(-W * 0.28)},${f(-L * 0.5)}`, `${st} stroke-width="1.1"`);
}

function efeuBlatt(L, welk, i) {
  const W = 0.8 * L;
  let out = blatt(herzKante(L, W, false), { L, W, ...farben(i, welk) });
  if (!welk) out += streifen(L, W);
  return out;
}

// Ranke: startet an der Erde, zieht ueber den Topfrand und haengt nach unten. Blaetter entlang der Ranke.
function ranke(sg, fall, welk, ebene, s) {
  const bre = ebene === 'brett';
  const S = [sg * 2, 0];
  const C = [sg * (EF_R + (bre ? 13 : 8)), -3];
  const E = [sg * (EF_R + (bre ? 9 : 3)), fall * (bre ? 1.1 : 1)];
  const d = `M${f(S[0])},${f(S[1])}Q${f(C[0])},${f(C[1])} ${f(E[0])},${f(E[1])}`;
  let out = pfad(d, 'fill="none" stroke="#3a6b3a" stroke-width="2.4" stroke-linecap="round"') +
    pfad(d, 'fill="none" stroke="#7fb069" stroke-width="1.2" stroke-linecap="round"');
  const anz = Math.max(2, Math.round(fall / 9));
  for (let k = 0; k < anz; k++) {
    const t = 0.2 + 0.75 * k / (anz - 1);
    const [x, y] = qb(S, C, E, t);
    const rot = sg * (welk ? 150 : 60 + (k % 2) * 35);
    out += an(x, y, rot, efeuBlatt(s >= 3 ? 8 : 7, welk, k));
  }
  return out;
}

function efeutute(s, welk, ebene) {
  const blaetter = stielBlaetter(EF_AUF[s], welk, ([a0, S, L], i) => efeuBlatt(L, welk, i));
  const rankenSvg = EF_RANKEN[s].map(([sg, fall]) => ranke(sg, fall, welk, ebene, s)).join('');
  return blaetter + rankenSvg;
}

// ---------- Gemeinsame Hilfen der neuen Pflanzen ----------
// Glatter geschlossener Pfad durch Punkte (Catmull-Rom als kubische Beziers), lokal kopiert aus szene.js
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

// Mittellinie eines Blatts als kubische Bezier von a nach d. Liefert Mittellinie M sowie linke und rechte Kante L, R.
// Breite: sin(pi t)^0.7, also spitz an beiden Enden. Lokal kopiert aus szene.js (dort unveraendert).
function blattBand(a, c1, c2, d, breite, n = 9) {
  const M = [], L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const m = [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * d[k]);
    const tg = [0, 1].map((k) => 3 * (u * u * (c1[k] - a[k]) + 2 * u * t * (c2[k] - c1[k]) + t * t * (d[k] - c2[k])));
    const len = Math.hypot(tg[0], tg[1]) || 1;
    const w = (breite / 2) * Math.pow(Math.sin(Math.PI * t), 0.7);
    const nx = (-tg[1] / len) * w, ny = (tg[0] / len) * w;
    M.push(m);
    L.push([m[0] + nx, m[1] + ny]);
    R.push([m[0] - nx, m[1] - ny]);
  }
  return { M, L, R };
}

// Geschlossener Umriss aus rechter Kante R (Grund bis Spitze) und gespiegelter linker Kante
const umriss = (R) => R.concat(R.slice().reverse().map(([x, y]) => [-x, y]));

// Zweiteilige Flaeche: rechte Haelfte dunkel, linke Haelfte hell (Licht von links)
function zweiseitig(R, hell, dunkel) {
  return pfad(p2pfad(R), `fill="${dunkel}"`) +
    pfad(p2pfad(R.map(([x, y]) => [-x, y]).reverse()), `fill="${hell}"`);
}

// ---------- Bogenhanf (Sansevieria) ----------
// Steife, schwertfoermige Blaetter, dunkelgruen mit hellen Zickzack-Baendern und breitem gelbem Rand.
// Licht von links: linke Haelfte heller. Hintere Blaetter dunkler.
const BOG = { gruen: '#3f6b45', hell: '#4f8056', band: '#9fb79a', rand: '#e3c95a', glanz: '#c8dcc0' };
const BOG_HINTEN = { gruen: '#345a3a', hell: '#3f6c46', band: '#8aa58c', rand: '#cfb24c', glanz: '#a9c4a3' };
const BOG_WELK = { gruen: '#a8a36a', hell: '#c4c98f', band: '#d8d6a0', rand: '#a6845a', glanz: '#dcdcb0', spitze: '#8f6a45' };

// Schwertkanten mit Mittellinie. Die Mitte wandert mit bieg * t^2 leicht zur Seite, damit das Blatt gedreht wirkt.
// Liefert Mitte, rechte und linke Kante mit je 41 Punkten (Grund (0,0), Spitze (0,-L)).
function bogKanten(L, W, bieg) {
  const mitte = [], rechts = [], links = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const cx = bieg * t * t, hb = W * Math.sin(Math.PI * Math.pow(t, 0.55));
    mitte.push([cx, -L * t]);
    rechts.push([cx + hb, -L * t]);
    links.push([cx - hb, -L * t]);
  }
  return { mitte, rechts, links };
}

function bogBlatt(L, W, welk, hinten, bieg) {
  const T = welk ? BOG_WELK : (hinten ? BOG_HINTEN : BOG);
  const au = bogKanten(L, W, bieg);          // aeussere Kontur (gelber Rand)
  const innen = bogKanten(L, W * 0.68, bieg); // dunkler Koerper innerhalb des Randes
  let out = pfad(p2pfad([...au.rechts, ...au.links.slice().reverse()]), `fill="${T.rand}"`) +
    pfad(p2pfad([...innen.mitte, ...innen.links.slice().reverse()]), `fill="${T.hell}"`) +
    pfad(p2pfad([...innen.rechts, ...innen.mitte.slice().reverse()]), `fill="${T.gruen}"`);
  // Querbaender als Zickzack-Linien ueber die ganze Blattbreite
  const n = Math.max(3, Math.round(L / 7));
  for (let k = 0; k < n; k++) {
    const i = Math.round((0.2 + 0.62 * k / (n - 1)) * 40);
    const y = innen.mitte[i][1];
    const x0 = innen.links[i][0], x1 = innen.rechts[i][0];
    const pts = [];
    for (let j = 0; j <= 4; j++) {
      pts.push([x0 + (x1 - x0) * j / 4, y + (j % 2 ? -0.9 : 0.5)]);
    }
    out += pfad('M' + pts.map(p2).join('L'), `fill="none" stroke="${T.band}" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"`);
  }
  // Glanzstreifen entlang der Mitte (leicht links)
  const glanz = [];
  for (let i = 4; i <= 34; i += 2) glanz.push([innen.mitte[i][0] - W * 0.18, innen.mitte[i][1]]);
  out += pfad('M' + glanz.map(p2).join('L'), `fill="none" stroke="${T.glanz}" stroke-width="0.6" stroke-linecap="round" opacity="0.45"`);
  // Welk: braune Spitze
  if (welk) out += pfad(p2pfad([...au.rechts.slice(32), ...au.links.slice(32).reverse()]), `fill="${T.spitze}" opacity="0.8"`);
  return out + pfad(p2pfad([...au.rechts, ...au.links.slice().reverse()]), `fill="none" ${kontur(welk)}`);
}

// Stufen: Blattanzahl, Faecherwinkel der aeussersten Blaetter (Grad), Blattlaenge, halbe Breite
const BOG_STUFE = {
  1: { n: 5, faecher: 14, L: 19, W: 2.2 },
  2: { n: 6, faecher: 17, L: 28, W: 2.4 },
  3: { n: 7, faecher: 19, L: 36, W: 2.5 },
  4: { n: 9, faecher: 22, L: 44, W: 2.6 },
};

function bogenhanf(s, welk) {
  const B = BOG_STUFE[s];
  const r = zufall(23 + s);
  const liste = [];
  for (let i = 0; i < B.n; i++) {
    const u = B.n === 1 ? 0 : (2 * i) / (B.n - 1) - 1; // -1 ganz links bis 1 ganz rechts
    const a = u * B.faecher + (r() - 0.5) * 4;
    const L = B.L * (1 - 0.15 * Math.abs(u)) * (0.94 + 0.12 * r());
    const W = B.W * (0.94 + 0.12 * r());
    liste.push({ a, L, W, dx: u * 2.5, hinten: Math.abs(u) > 0.6 });
  }
  // Hintere (aeussere) Blaetter zuerst, die mittleren liegen davor
  liste.sort((p, q) => Number(q.hinten) - Number(p.hinten));
  let out = '';
  for (const { a, L, W, dx, hinten } of liste) {
    const rot = welk ? a * 1.4 + Math.sign(a) * 30 : a;
    out += an(dx, 1, rot, bogBlatt(welk ? L * 0.75 : L, W, welk, hinten, 0.04 * L * Math.sign(a)));
  }
  return out;
}

// ---------- Aloe vera ----------
// Fleischige, spitze Blaetter in Rosette, graugruen, weisse Punkte und kleine Zaehnchen am Rand
const ALOE = { hell: '#8fb08a', dunkel: '#6e9469', rippe: '#b5cca6', punkt: '#f4f4e8' };
const ALOE_WELK = { hell: '#c4c98f', dunkel: '#a8a36a', rippe: '#d8d6a0', punkt: '#e6e2c0' };

// Blattbreite (halbe) auf Hoehe t (0 Grund, 1 Spitze)
const aloeBreite = (W, t) => W * Math.sin(Math.PI * Math.pow(t, 0.8)) * (1 - 0.15 * t);

// Blattkante mit Zaehnchen: Grund (0,0), Spitze (0,-L)
function aloeKante(L, W) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    let w = aloeBreite(W, t);
    if (i > 0 && i < 40) w *= i % 4 === 2 ? 1.16 : (i % 4 === 0 ? 0.86 : 1);
    pts.push([w, -L * t]);
  }
  return pts;
}

function aloeBlatt(L, W, welk) {
  const T = welk ? ALOE_WELK : ALOE;
  const R = aloeKante(L, W);
  let out = zweiseitig(R, T.hell, T.dunkel) +
    linie([0, -L * 0.04], [0, -L * 0.9], `stroke="${T.rippe}" stroke-width="1" stroke-linecap="round" opacity="0.7"`);
  // Weisse Punkte, abwechselnd links und rechts der Mittelrippe
  for (let j = 0; j < 7; j++) {
    const t = 0.18 + j * 0.1, sd = j % 2 ? 1 : -1;
    out += kreis(sd * aloeBreite(W, t) * 0.45, -L * t, 0.6, `fill="${T.punkt}" opacity="0.9"`);
  }
  out += linie([-W * 0.4, -L * 0.2], [-W * 0.35, -L * 0.5], 'stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.4"');
  const rand = welk ? 'fill="none" stroke="#a6845a" stroke-width="1" stroke-linejoin="round"' : `fill="none" ${KON_GRUEN}`;
  return out + pfad(p2pfad(umriss(R)), rand);
}

// Rosette: [Winkel, Laenge, halbe Breite]. Aeussere Blaetter zuerst.
const ALOE_BLAETTER = {
  1: [[-40, 12, 2.6], [40, 12, 2.6], [0, 14, 2.8]],
  2: [[-50, 14, 3], [-20, 17, 3.4], [15, 17, 3.4], [48, 14, 3]],
  3: [[-62, 15, 3], [-35, 19, 3.6], [-10, 21, 3.9], [18, 20, 3.8], [44, 18, 3.5], [64, 14, 3]],
  4: [[-70, 15, 3], [-48, 20, 3.6], [-24, 23, 4], [0, 25, 4.2], [24, 23, 4], [48, 20, 3.6], [70, 15, 3]],
};

function aloe(s, welk) {
  const tab = ALOE_BLAETTER[s].slice().sort((p, q) => Math.abs(q[0]) - Math.abs(p[0]));
  let out = '';
  for (const [a, L, W] of tab) {
    const rot = welk ? a * 1.3 : a;
    out += an(0, 1, rot, aloeBlatt(welk ? L * 0.8 : L, W, welk));
  }
  if (s === 4) {
    // Hoher Bluetenstiel mit orangen Roehrenbluten
    const FL = welk ? ['#c9a46a', '#e0c08a'] : ['#f0863a', '#ffc27a'];
    out += stiel('M0,0Q2,-22 6,-40', welk, 2.2);
    for (let j = 0; j < 6; j++) {
      const t = 0.62 + j * 0.07, sd = j % 2 ? 1 : -1;
      const [x, y] = qb([0, 0], [2, -22], [6, -40], t);
      const bx = x + sd * 1.6;
      out += oval(bx, y, 1.5, 3, `transform="rotate(${sd * 25} ${f(bx)} ${f(y)})" fill="${FL[0]}" ${kontur(welk)}`) +
        kreis(bx - sd * 0.3, y - 0.9, 0.6, `fill="${FL[1]}"`);
    }
  }
  return out;
}

// ---------- Gruenlilie (Chlorophytum) ----------
// Schmale, ueberhaengende Blaetter mit cremefarbenem Mittelstreifen und gruenen Raendern (Licht links).
// Hintere Blaetter dunkler. Ab Stufe 3 Auslaeufer mit Kindeln und winzigen weissen Sternbluete.
const GRL = { hell: '#6fae6a', schatten: '#4f8a4c', streifen: '#f5f0dc', ader: '#3f7a40' };
const GRL_HINTEN = { hell: '#5c9c58', schatten: '#3f7a40', streifen: '#e6e1c0', ader: '#2f5f32' };
const GRL_WELK = { hell: '#c4c98f', schatten: '#a8a36a', streifen: '#e4e3b4', ader: '#8c8650', spitze: '#a6845a' };

// Blatt als Band (Mittellinie a bis d, Breite W) mit cremefarbenem Mittelstreifen.
// Die Kante mit dem kleineren x liegt im Licht (von links oben), die andere im Schatten.
function grlBlatt(a, c1, c2, d, W, welk, hinten = false) {
  const T = welk ? GRL_WELK : (hinten ? GRL_HINTEN : GRL);
  const b = blattBand(a, c1, c2, d, W, 12);
  const sn = blattBand(a, c1, c2, d, W * 0.5, 12);
  const mitteX = (pts) => pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const [licht, dunkel] = mitteX(b.L) <= mitteX(b.R) ? [b.L, b.R] : [b.R, b.L];
  const form = glattGeschlossen([...b.L, ...b.R.slice().reverse()]);
  const lichtFlaeche = glattGeschlossen([...b.M, ...licht.slice().reverse()]);
  const streifen = glattGeschlossen([...sn.L, ...sn.R.slice().reverse()]);
  // Feine Laengsadern auf beiden Seiten, parallel zur Mittellinie
  let adern = '';
  for (const kante of [licht, dunkel]) {
    const pts = b.M.map((m, i) => [m[0] + (kante[i][0] - m[0]) * 0.55, m[1] + (kante[i][1] - m[1]) * 0.55]);
    adern += pfad('M' + pts.slice(1, -1).map(p2).join('L'), `fill="none" stroke="${T.ader}" stroke-width="0.35" stroke-linecap="round" opacity="0.6"`);
  }
  let out = pfad(form, `fill="${T.schatten}"`) +
    pfad(lichtFlaeche, `fill="${T.hell}"`) +
    pfad(streifen, `fill="${T.streifen}"`) +
    adern;
  // Welk: braune Blattspitze
  if (welk) out += pfad(glattGeschlossen([...b.L.slice(9), ...b.R.slice(9).reverse()]), `fill="${T.spitze}" opacity="0.8"`);
  return out + pfad(form, `fill="none" stroke="${welk ? '#7d6a45' : '#2f5a30'}" stroke-width="1" stroke-linejoin="round"`);
}

// Blaetter: [Spitze x, Bogenhoehe, Spitze y (positiv = haengt unter den Topfrand), Breite, Schicht]
// Schicht 0 = hinten (steil, dunkler, zuerst gezeichnet), 1 = mitte, 2 = vorn (weit ueberhaengend)
const GRL_BLAETTER = {
  1: [[-15, 14, 6, 3.2, 0], [14, 15, 7, 3.2, 0], [-5, 17, 0, 3.4, 1], [5, 17, -1, 3.4, 2]],
  2: [[-22, 17, 9, 3.4, 0], [20, 17, 10, 3.4, 0], [-12, 21, 2, 3.4, 1], [11, 21, 4, 3.4, 1], [-3, 23, -6, 3.6, 0], [4, 22, 6, 3.6, 2]],
  3: [[-24, 19, 11, 3.2, 0], [23, 19, 12, 3.2, 0], [-17, 24, 3, 3.2, 0], [17, 24, 4, 3.2, 0], [-9, 27, -4, 3.2, 1], [9, 27, -3, 3.2, 1], [-3, 26, 8, 3.2, 2], [4, 25, -9, 3.2, 1]],
  4: [
    [-11, 15, -10, 2.6, 0], [-4, 17, -14, 2.6, 0], [4, 17, -13, 2.6, 0], [11, 15, -9, 2.6, 0],
    [-18, 21, 2, 2.8, 1], [-6, 22, -2, 2.8, 1], [5, 22, 1, 2.8, 1], [16, 21, 5, 2.8, 1], [22, 20, 3, 2.8, 1],
    [-26, 24, 13, 2.8, 2], [-14, 25, 16, 2.8, 2], [2, 25, 15, 2.8, 2], [18, 25, 17, 2.8, 2], [27, 24, 13, 2.8, 2],
  ],
};

// Auslaeufer: [Richtung (+1 rechts, -1 links), Endpunkt x, Endpunkt y, Kontrollpunkt x, Kontrollpunkt y]
// Bogen ueber den Topfrand, dann nach unten haengend
const GRL_AUSLAEUFER = {
  1: [],
  2: [],
  3: [[1, 24, 14, 16, -18], [-1, -23, 16, -16, -18]],
  4: [[1, 27, 16, 16, -18], [-1, -25, 17, -16, -18], [1, 12, 28, 15, 6]],
};

// Duenner gelblichgruener Stängel (keine Roehre), Strichstaerke 1.2
function grlAusl(d, welk) {
  return pfad(d, `fill="none" stroke="${welk ? '#a8a36a' : '#b9c76a'}" stroke-width="1.2" stroke-linecap="round"`);
}

// Winzige weisse Sternbluete
function grlSternbluete(x, y, r) {
  const pts = [];
  for (let k = 0; k < 12; k++) {
    const a = (k * 30 - 90) * RAD, rr = k % 2 ? r * 0.45 : r;
    pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]);
  }
  return poly(pts, 'fill="#fffdf2" stroke="#b9c49a" stroke-width="0.3" stroke-linejoin="round"');
}

// Kindel: kleine Tochterrosette mit Wurzelansatz am Auslaeuferende und einer Sternbluete
function kindel(E, welk) {
  // Kindel: Rosette aus sechs kurzen, gestreiften Blaettchen, Wurzelansatz am Auslaeuferende
  let out = linie(E, [E[0] - 0.8, E[1] + 2.5], `stroke="${welk ? '#a6845a' : '#c9b48a'}" stroke-width="0.5" stroke-linecap="round"`);
  for (const [dx, dy, W] of [[-3.5, -2.5, 1.8], [-2, -5.5, 1.9], [0, -6.8, 1.9], [2, -5.5, 1.9], [3.8, -3, 1.8], [0.5, -4, 1.5]]) {
    out += grlBlatt(E, [E[0] + dx * 0.2, E[1] - 1.5], [E[0] + dx * 0.8, E[1] + dy * 0.8], [E[0] + dx, E[1] + dy], W, welk);
  }
  if (!welk) out += grlSternbluete(E[0] + 0.5, E[1] - 9, 1.3);
  return out;
}

function gruenlilie(s, welk) {
  let ausl = '', kindeln = '', bluete = '';
  for (const [sg, x, y, cx, cy] of GRL_AUSLAEUFER[s]) {
    const E = [x, y];
    ausl += grlAusl(`M${sp([sg * 4, -1])}Q${sp([cx, cy])} ${sp(E)}`, welk);
    kindeln += kindel(E, welk);
  }
  // Blaetter nach Schicht sortieren: hinten zuerst, vorn zuletzt
  const schichten = [[], [], []];
  for (const [xt, bogen, yt, W, schicht] of GRL_BLAETTER[s]) {
    const yE = welk ? yt + 8 : yt, hoehe = welk ? bogen * 0.7 : bogen;
    schichten[schicht].push(grlBlatt([0, 0], [xt * 0.15, -hoehe * 1.1], [xt * 0.9, -hoehe * 0.75], [xt, yE], W, welk, schicht === 0));
  }
  if (s === 4 && !welk) {
    // Bluetenstiel aus der Rosette mit drei winzigen Sternbluete
    ausl += grlAusl('M0,-1Q-1,-14 -5,-24', welk);
    bluete = grlSternbluete(-5, -24, 1.8) + grlSternbluete(-8, -20, 1.5) + grlSternbluete(-2.5, -21, 1.5);
  }
  return ausl + schichten.flat().join('') + kindeln + bluete;
}

// ---------- Gluecksfeder (Zamioculcas) ----------
// Aufrechte, dicke Stiele mit paarigen, glaenzenden, ovalen Fiederblaettchen
const GLF = { gruen: '#3f7a3c', hell: '#4f8c48', glanz: '#9ccc7a' };
const GLF_WELK = { gruen: '#a8a36a', hell: '#c4c98f', glanz: '#d8d6a0' };

function glfBlaettchen(L, welk) {
  const T = welk ? GLF_WELK : GLF;
  const R = ovalKante(L, 0.3 * L, false);
  return zweiseitig(R, T.hell, T.gruen) +
    linie([0, -L * 0.08], [0, -L * 0.85], `stroke="${welk ? '#7d6a45' : '#2f5a30'}" stroke-width="0.4" opacity="0.5"`) +
    oval(-0.16 * L, -0.55 * L, 0.1 * L + 0.4, 0.14 * L, `fill="${T.glanz}" opacity="0.9"`) +
    pfad(p2pfad(umriss(R)), `fill="none" ${kontur(welk)}`);
}

// Stiele: [Neigung in Grad, Laenge]
const GLF_STIELE = {
  1: [[-14, 22], [12, 26]],
  2: [[-26, 28], [-12, 36], [3, 40], [16, 32]],
  3: [[-30, 30], [-17, 40], [-4, 46], [9, 42], [24, 34]],
  4: [[-34, 30], [-22, 40], [-10, 46], [3, 48], [14, 42], [28, 34]],
};

function gluecksfeder(s, welk) {
  let stiele = '', blaettchen = '';
  for (const [a0, S] of GLF_STIELE[s]) {
    const a = welk ? a0 * 1.25 : a0;
    const E = [S * Math.sin(a * RAD) * (welk ? 0.8 : 1), -S * Math.cos(a * RAD) * (welk ? 0.6 : 1)];
    const C = [E[0] * 0.12, E[1] * 0.7];
    stiele += stiel(`M0,0Q${sp(C)} ${sp(E)}`, welk, 3.8);
    // Zwei Fiederpaare im oberen Stielbereich, Endblaettchen an der Spitze (Stiele bleiben sichtbar)
    for (const t of [0.55, 0.8]) {
      const [x, y] = qb([0, 0], C, E, t);
      for (const sd of [-1, 1]) blaettchen += an(x, y, a + sd * (welk ? 75 : 60), glfBlaettchen(8, welk));
    }
    blaettchen += an(E[0], E[1], a, glfBlaettchen(10, welk));
  }
  return stiele + blaettchen;
}

// ---------- Echeverie ----------
// Kompakte Rosette aus loeffelfoermigen Blaettern in blaugruen, rosa Spitzen, flach (y-Ausdehnung 0.55)
const ECH = { hell: '#a9c8bf', dunkel: '#85a99f', spitze: '#e9a6b1' };
const ECH_WELK = { hell: '#c4c98f', dunkel: '#a8a36a', spitze: '#a6845a' };

// Loeffelkante: Grund (0,0) schmal, breiteste Stelle bei 70 %, runde Spitze (0,-L). W = halbe Breite.
function loeffelKante(L, W) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const w = t <= 0.7
      ? W * (0.3 + 0.7 * Math.sin((Math.PI / 2) * t / 0.7))
      : W * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.7) / 0.3, 2)));
    pts.push([w, -L * t]);
  }
  return pts;
}

function echBlatt(L, W, welk) {
  const T = welk ? ECH_WELK : ECH;
  const R = loeffelKante(L, W);
  return zweiseitig(R, T.hell, T.dunkel) +
    pfad(p2pfad(umriss(R.slice(32))), `fill="${T.spitze}" opacity="0.85"`) +
    linie([0, -L * 0.1], [0, -L * 0.7], `stroke="${T.dunkel}" stroke-width="0.4" opacity="0.6"`) +
    linie([-W * 0.4, -L * 0.3], [-W * 0.35, -L * 0.6], 'stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" opacity="0.45"') +
    pfad(p2pfad(umriss(R)), `fill="none" ${kontur(welk)}`);
}

// Ringe: [Anzahl, Laenge, halbe Breite, Startwinkel]. Aeusserer Ring zuerst (liegt unten).
const ECH_RINGE = {
  1: [[5, 6, 2.2, 0], [6, 8, 3, 30]],
  2: [[5, 5.5, 2, 0], [5, 7.5, 2.9, 36], [6, 9.5, 3.5, 18]],
  3: [[5, 5.5, 2, 0], [6, 8, 3, 30], [6, 10.5, 3.8, 0]],
  4: [[5, 5, 1.9, 0], [5, 7, 2.7, 36], [6, 9, 3.4, 18], [7, 11.5, 4, 0]],
};

function echeverie(s, welk) {
  let blaetter = '';
  const ringe = ECH_RINGE[s];
  for (let r = ringe.length - 1; r >= 0; r--) {
    const [n, L, W, off] = ringe[r];
    for (let i = 0; i < n; i++) {
      // Blatt liegt flach auf der Rosette, Spitze zeigt radial nach aussen (Drehung um 90 Grad)
      blaetter += an(0, 0, off + i * 360 / n + 90, echBlatt(L, W, welk));
    }
  }
  let out = gruppe(`transform="translate(0,-2) scale(1,${welk ? 0.45 : 0.55})"`, blaetter);
  if (s === 4) {
    // Gebogener Bluetenstiel mit korallfarbenen Gloeckchen
    const G = welk ? '#b99a7a' : '#f08a7a', GH = welk ? '#d8c0a0' : '#ffc0b0';
    out += stiel('M0,-2Q3,-18 7,-34', welk, 1.8);
    for (let j = 0; j < 5; j++) {
      const t = 0.55 + j * 0.11, sd = j % 2 ? 1 : -1;
      const [x, y] = qb([0, -2], [3, -18], [7, -34], t);
      const bx = x + sd * 1.8;
      out += oval(bx, y, 1.6, 2.3, `transform="rotate(${sd * 30} ${f(bx)} ${f(y)})" fill="${G}" ${kontur(welk)}`) +
        kreis(bx - 0.4, y - 0.8, 0.5, `fill="${GH}"`);
    }
  }
  return out;
}

// ---------- Geigenfeige (Ficus lyrata) ----------
// Gerader brauner Stamm, geigenfoermige, gewellte Blaetter wechselstaendig, oben ein Schopf aus jungen Blaettern
const GEI = { hell: '#5e9a52', dunkel: '#3f7a3c', ader: '#b9d99a' };
const GEI_JUNG = { hell: '#7fb069', dunkel: '#5e9a52', ader: '#c7e6a8' };
const GEI_WELK = { hell: '#c4c98f', dunkel: '#a8a36a', ader: '#e4e3b4' };

// Breitenprofil des Geigenblatts: t von Grund (0) bis Spitze (1), Breite als Anteil der halben Blattbreite.
// Breite oben (t 0.75), Taille bei t 0.5, kleiner unterer Lappen bei t 0.25. Glatt interpoliert (Hermite).
const GEI_PROFIL = [[0, 0], [0.1, 0.2], [0.25, 0.5], [0.38, 0.56], [0.5, 0.6], [0.62, 0.82], [0.75, 1], [0.87, 0.9], [0.95, 0.5], [1, 0.02]];
function geigenProfil(t) {
  const P = GEI_PROFIL;
  let k = 0;
  while (k < P.length - 2 && t > P[k + 1][0]) k++;
  const [t0, w0] = P[k], [t1, w1] = P[k + 1];
  const m0 = k > 0 ? (w1 - P[k - 1][1]) / (t1 - P[k - 1][0]) : (w1 - w0) / (t1 - t0);
  const m1 = k < P.length - 2 ? (P[k + 2][1] - w0) / (P[k + 2][0] - t0) : (w1 - w0) / (t1 - t0);
  const h = t1 - t0, u = (t - t0) / h;
  const v = (2 * u * u * u - 3 * u * u + 1) * w0 + (u * u * u - 2 * u * u + u) * h * m0 +
    (-2 * u * u * u + 3 * u * u) * w1 + (u * u * u - u * u) * h * m1;
  return Math.max(0, v);
}

// Geigenkante: Grund (0,0), Spitze (0,-L), halbe Breite W. Leicht gewellter, glatter Rand.
function geigenKante(L, W) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const welle = 1 + 0.02 * Math.sin(2 * Math.PI * t * 3);
    pts.push([W * geigenProfil(t) * welle, -L * t]);
  }
  return pts;
}

function geigenBlatt(L, T, welk) {
  const W = 0.33 * L;
  const R = geigenKante(L, W);
  let out = zweiseitig(R, T.hell, T.dunkel) +
    linie([0, -L * 0.02], [0, -L * 0.94], `stroke="${T.ader}" stroke-width="1" stroke-linecap="round" opacity="0.95"`);
  // Helle Seitenadern, je drei pro Seite, von der Mittelader schraeg zum Rand
  for (const t of [0.3, 0.5, 0.7]) {
    const [ex, ey] = R[Math.round(t * 40)];
    for (const sd of [-1, 1]) {
      out += linie([0, ey], [sd * ex * 0.8, ey - L * 0.1], `stroke="${T.ader}" stroke-width="0.6" stroke-linecap="round" opacity="0.8"`);
    }
  }
  out += linie([-W * 0.45, -L * 0.42], [-W * 0.5, -L * 0.7], 'stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.4"');
  return out + pfad(p2pfad(umriss(R)), `fill="none" ${kontur(welk)}`);
}

// Stamm (Holz) mit Licht links, Schatten rechts und feinen Maserungslinien
function geigenStamm(H, welk) {
  const d = `M0,2L0,${-H}`;
  return pfad(d, 'fill="none" stroke="#6b4a3a" stroke-width="3.6" stroke-linecap="round"') +
    pfad(d, `fill="none" stroke="${welk ? '#c9b07a' : '#c98f5a'}" stroke-width="2.8" stroke-linecap="round"`) +
    pfad(`M1,2L1,${-H}`, 'fill="none" stroke="#a86b43" stroke-width="0.9" stroke-linecap="round" opacity="0.7"') +
    pfad(`M-0.8,2L-0.8,${-H}`, 'fill="none" stroke="#e2b07c" stroke-width="0.8" stroke-linecap="round" opacity="0.8"') +
    linie([-0.2, -H * 0.3], [0.4, -H * 0.2], 'stroke="#a86b43" stroke-width="0.4"') +
    linie([-0.4, -H * 0.62], [0.3, -H * 0.55], 'stroke="#a86b43" stroke-width="0.4"');
}

// Stufen: Stammhoehe H, Blaetter [Hoehe am Stamm (Anteil), Seite (+1 rechts, -1 links), Neigung gegen die Senkrechte, Laenge], Schopf-Laenge
const GEI_STUFE = {
  1: { H: 24, blaetter: [[0.4, -1, 58, 14], [0.6, 1, 56, 15], [0.82, -1, 52, 14]], schopf: 8 },
  2: { H: 42, blaetter: [[0.3, -1, 60, 17], [0.44, 1, 60, 18], [0.58, -1, 58, 18], [0.72, 1, 56, 17], [0.86, -1, 54, 16]], schopf: 10 },
  3: { H: 56, blaetter: [[0.22, 1, 60, 19], [0.33, -1, 60, 19], [0.44, 1, 58, 19], [0.55, -1, 58, 18], [0.66, 1, 56, 18], [0.77, -1, 54, 17], [0.87, 1, 52, 16]], schopf: 11 },
  4: { H: 70, blaetter: [[0.18, -1, 62, 20], [0.2625, 1, 62, 20], [0.345, -1, 60, 19], [0.4275, 1, 60, 19], [0.51, -1, 58, 18], [0.5925, 1, 57, 18], [0.675, -1, 55, 17], [0.7575, 1, 53, 16], [0.84, -1, 50, 15]], schopf: 12 },
};

function geigenfeige(s, welk) {
  const G = GEI_STUFE[s];
  let out = geigenStamm(G.H, welk);
  for (const [t, sd, ang, L0] of G.blaetter) {
    const L = welk ? L0 * 0.8 : L0;
    const y = -G.H * t;
    const qx = sd * (welk ? 3 : 4), qy = y - (welk ? 1 : 2.5);
    out += stiel(`M0,${f(y)}L${f(qx)},${f(qy)}`, welk, 1.4);
    out += an(qx, qy, welk ? sd * 125 : sd * ang, geigenBlatt(L, welk ? GEI_WELK : GEI, welk));
  }
  // Schopf: junge, hellere Blaetter am Stammende
  for (const a of [-20, 0, 20]) {
    const L = G.schopf * (a === 0 ? 1 : 0.8);
    out += an(0, -G.H, welk ? a * 3 : a, geigenBlatt(L, welk ? GEI_WELK : GEI_JUNG, welk));
  }
  return out;
}

// ---------- Orchidee (Phalaenopsis) ----------
// Fleischige, glaenzende Grundblaetter flach ueber dem Topf, gebogene Rispen mit falterfoermigen Blueten
const ORC = { blatt: '#7fb069', dunkel: '#5e9a52', bluete: '#fbe3ec', kelch: '#f3c6d6', lippe: '#d9658f', knospe: '#9ccc7a', rosa: '#e9a0bb' };
const ORC_WELK = { blatt: '#c4c98f', dunkel: '#a8a36a', bluete: '#e6d8c8', kelch: '#d8c4b0', lippe: '#b8906a', knospe: '#b5c48a', rosa: '#c9b09a' };

// Grundblaetter: [Winkel gegen oben, Laenge]. Liegen flach (y gestaucht).
const ORC_BLAETTER = {
  1: [[-65, 13], [55, 14]],
  2: [[-72, 13], [-22, 14], [40, 14]],
  3: [[-78, 12], [-35, 14], [5, 15], [60, 13]],
  4: [[-78, 13], [-30, 15], [18, 15], [66, 13]],
};

function orchBlatt(L, welk) {
  const T = welk ? ORC_WELK : ORC;
  const W = 0.32 * L;
  const R = ovalKante(L, W, false);
  return zweiseitig(R, T.blatt, T.dunkel) +
    linie([0, -L * 0.05], [0, -L * 0.8], `stroke="${T.dunkel}" stroke-width="0.6" opacity="0.7"`) +
    linie([-W * 0.4, -L * 0.25], [-W * 0.35, -L * 0.6], 'stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.6"') +
    pfad(p2pfad(umriss(R)), `fill="none" ${kontur(welk)}`);
}

// Falterbluete: Mittelpunkt (x,y), Drehung rot, k = Groesse. 3 Kelchblaetter, 2 breite Kronblaetter, Lippe unten.
function orchBluete(x, y, rot, k, welk) {
  const T = welk ? ORC_WELK : ORC;
  const kon = kontur(welk);
  const teil = (ang, cy, rx, ry, fill) => an(0, 0, ang, oval(0, cy * k, rx * k, ry * k, `fill="${fill}" ${kon}`));
  const inhalt = teil(0, -3, 1.9, 3, T.kelch) +
    teil(150, -2.6, 1.9, 2.9, T.kelch) + teil(-150, -2.6, 1.9, 2.9, T.kelch) +
    teil(72, -2.4, 2.9, 3.4, T.bluete) + teil(-72, -2.4, 2.9, 3.4, T.bluete) +
    teil(0, 1.4, 1.5, 1.8, T.lippe) +
    kreis(0, 0, 0.9 * k, 'fill="#fff7d6"');
  return an(x, y, rot, inhalt);
}

function orchKnospe(x, y, welk) {
  const T = welk ? ORC_WELK : ORC;
  return oval(x, y, 1.2, 1.7, `fill="${T.knospe}" ${kontur(welk)}`) +
    kreis(x + 0.2, y - 0.6, 0.55, `fill="${T.rosa}"`);
}

// Rispen: Stab von S ueber C zur Spitze E. bl: [Anteil am Stab, Seite] je Bluete, kn: je Knospe
const ORC_RISPEN = {
  2: [{ S: [0, -1], C: [3, -14], E: [7, -24], bl: [], kn: [[0.5, 1], [0.7, -1], [0.85, 1], [1, 0]] }],
  3: [{ S: [0, -1], C: [3, -16], E: [8, -30], bl: [[0.45, 1], [0.7, -1]], kn: [[0.88, 1], [1, 0]] }],
  4: [
    { S: [0, -1], C: [4, -17], E: [9, -34], bl: [[0.4, 1], [0.62, -1], [0.82, 1]], kn: [[1, 0]] },
    { S: [-1, -1], C: [-5, -12], E: [-10, -24], bl: [[0.45, -1], [0.7, 1], [0.9, -1]], kn: [] },
  ],
};

function orchRispe(r, welk) {
  let out = stiel(`M${sp(r.S)}Q${sp(r.C)} ${sp(r.E)}`, welk, 1.1);
  for (const [t, sd] of r.kn) {
    const [x, y] = qb(r.S, r.C, r.E, t);
    out += orchKnospe(x + sd * 1.2, y, welk);
  }
  for (const [t, sd] of r.bl) {
    const [x, y] = qb(r.S, r.C, r.E, t);
    out += orchBluete(x + sd * 2.2, y, sd * 15, 0.75, welk);
  }
  return out;
}

function orchidee(s, welk) {
  let blaetter = '';
  for (const [a, len] of ORC_BLAETTER[s].slice().sort((p, q) => Math.abs(q[0]) - Math.abs(p[0]))) {
    blaetter += an(0, 0, welk ? a * 0.8 : a, orchBlatt(welk ? len * 0.8 : len, welk));
  }
  let out = gruppe(`transform="translate(0,-1) scale(1,${welk ? 0.4 : 0.5})"`, blaetter);
  for (const r of ORC_RISPEN[s] || []) out += orchRispe(r, welk);
  return out;
}

// Transparenter Kunststofftopf (Orchideen): halbtransparenter Korpus, Wurzeln und Rinde schimmern durch
function kunststofftopf(R, H) {
  const Rb = R * 0.8, ry = R * 0.4, ryb = Rb * 0.4;
  const korpus = `M${f(-R)},${-H}L${f(-Rb)},0A${f(Rb)},${f(ryb)} 0 0 0 ${f(Rb)},0L${R},${-H}A${R},${f(ry)} 0 0 1 ${f(-R)},${-H}Z`;
  const wurzel = (d) => pfad(d, 'fill="none" stroke="#9fbfa6" stroke-width="1.6" stroke-linecap="round" opacity="0.8"');
  const rinde = [[-4, -6], [3, -9], [-1, -4], [5, -5], [-6, -10]]
    .map(([x, y]) => oval(x, y, 1.1, 0.7, 'fill="#8a6a4a" opacity="0.5"')).join('');
  return oval(1, 0, Rb + 2.5, ryb + 1.5, 'fill="#6b4a3a" opacity="0.18"') +
    wurzel(`M-3,${f(-H + 2)}Q-5,${f(-H * 0.5)} -2.5,-3`) +
    wurzel(`M1.5,${f(-H + 2)}Q3.5,${f(-H * 0.5)} 2.5,-4`) +
    wurzel(`M-0.5,${f(-H + 2)}Q0,${f(-H * 0.4)} 1,-6`) +
    pfad(korpus, 'fill="#cfdde8" opacity="0.55"') +
    rinde +
    pfad(korpus, `fill="none" ${KON_TOPF}`) +
    linie([-R + 2.5, -H + 4], [-Rb + 2.5, -3], 'stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.7"') +
    oval(0, -H, R, ry, 'fill="#dfeaf2" opacity="0.7"') +
    oval(0, -H, R - 1.6, ry - 0.8, 'fill="#8a6a4a" opacity="0.6"') +
    oval(0, -H, R, ry, `fill="none" ${KON_TOPF}`) +
    pfad(`M${f(-R + 1)},${f(-H + 1)}Q${f(-R - 3)},${f(-H + 2)} ${f(-R - 2)},${f(-H + 6)}`, 'fill="none" stroke="#b5cdb9" stroke-width="1.4" stroke-linecap="round"');
}

// ---------- Calathea (Korbmarante) ----------
// Ovale, aufrechte Blaetter an Stielen. Oberseite hellgruen mit dunklen Fischgraet-Strichen. Gedrehte Blaetter zeigen die purpure Unterseite.
const CAL = { hell: '#9ccc7a', dunkel: '#7fb069', fisch: '#3a6b3a', ader: '#c8e6a8' };
const CAL_UNTEN = { hell: '#8a3a5e', dunkel: '#6e2c4c', fisch: '#8a3a5e', ader: '#c98aa8' };
const CAL_WELK = { hell: '#c4c98f', dunkel: '#a8a36a', fisch: '#8c8650', ader: '#e4e3b4' };

function calBlatt(L, welk, unten) {
  const T = welk ? CAL_WELK : (unten ? CAL_UNTEN : CAL);
  const R = ovalKante(L, 0.3 * L, false);
  let out = zweiseitig(R, T.hell, T.dunkel);
  if (!unten) {
    // Fischgraet: Striche von der Mittelader schraeg nach oben zum Rand
    for (let k = 0; k < 5; k++) {
      const t = 0.16 + k * 0.14;
      const [ex, ey] = R[Math.round(t * 40)];
      for (const sd of [-1, 1]) {
        out += linie([0, ey], [sd * ex * 0.75, ey - L * 0.12], `stroke="${T.fisch}" stroke-width="1.3" stroke-linecap="round" opacity="0.85"`);
      }
    }
  }
  out += linie([0, -L * 0.03], [0, -L * 0.93], `stroke="${T.ader}" stroke-width="0.7" stroke-linecap="round" opacity="0.8"`);
  const rand = welk ? KON_WELK : 'stroke="#2f5a30" stroke-width="1.4" stroke-linejoin="round"';
  return out + pfad(p2pfad(umriss(R)), `fill="none" ${rand}`);
}

// Blaetter: [Winkel gegen die Senkrechte, Stiellaenge, Blattlaenge, gedreht (Unterseite sichtbar)]
const CAL_BLAETTER = {
  1: [[-28, 8, 11, false], [24, 9, 11, false]],
  2: [[-36, 10, 13, false], [0, 12, 14, false], [34, 10, 13, true]],
  3: [[-46, 11, 14, false], [-16, 14, 16, false], [16, 14, 16, true], [44, 11, 14, false]],
  4: [[-54, 11, 14, false], [-26, 15, 17, false], [0, 17, 18, false], [24, 15, 17, true], [50, 11, 14, false]],
};

function calathea(s, welk) {
  let stiele = '', blaetter = '';
  for (const [a0, S, L, gedreht] of CAL_BLAETTER[s].slice().sort((p, q) => Math.abs(q[0]) - Math.abs(p[0]))) {
    const a = welk ? a0 * 1.25 : a0;
    const ex = S * Math.sin(a * RAD), ey = -S * Math.cos(a * RAD) * (welk ? 0.5 : 1);
    stiele += stiel(`M0,0Q${f(ex * 0.1)},${f(ey * 0.5)} ${f(ex)},${f(ey)}`, welk, 1.5);
    const dreht = gedreht && !welk;
    let b = calBlatt(welk ? L * 0.8 : L, welk, dreht);
    if (dreht) b = gruppe('transform="scale(0.8,1)"', b);
    blaetter += an(ex, ey, welk ? (a0 < 0 ? -140 : 140) : a0 * 0.5, b);
  }
  return stiele + blaetter;
}

// ---------- Bostonfarn (Nephrolepis) ----------
// Lange, bogig ueberhaengende Wedel mit dicht gereihten kleinen Fiederblaettchen (Kammform)
const BOS = { hell: '#9ccc7a', dunkel: '#7fb069', rachis: '#4f8c48' };
const BOS_WELK = { hell: '#c4c98f', dunkel: '#a8a36a', rachis: '#8c8650' };
// Wedel: [Endpunkt x (negativ = links), Bogenhoehe]. Der Wedel steigt, bogt sich und haengt ueber den Topfrand.
const BOS_WEDEL = {
  1: [[-13, 16], [11, 18], [-4, 20]],
  2: [[-17, 18], [-7, 23], [6, 22], [16, 17]],
  3: [[-19, 17], [-11, 24], [-2, 26], [8, 24], [18, 18]],
  4: [[-21, 16], [-14, 24], [-6, 28], [3, 27], [11, 24], [20, 17], [-18, 26], [14, 27]],
};
const BOS_FIEDER = [0, 6, 9, 12, 14];

function bostonfarn(s, welk) {
  const T = welk ? BOS_WELK : BOS;
  const n = BOS_FIEDER[s];
  const Lp = welk ? 2.2 : 2.5;
  const R = ovalKante(Lp, 0.75, false);
  const fiederA = pfad(p2pfad(umriss(R)), `fill="${T.hell}" stroke="#2f5a30" stroke-width="0.4" stroke-linejoin="round"`);
  const fiederB = pfad(p2pfad(umriss(R)), `fill="${T.dunkel}" stroke="#2f5a30" stroke-width="0.4" stroke-linejoin="round"`);
  let out = '';
  for (const [X0, Y0] of BOS_WEDEL[s].slice().sort((p, q) => Math.abs(q[0]) - Math.abs(p[0]))) {
    const X = welk ? X0 * 1.15 : X0;
    const Y = welk ? Y0 * 0.6 : Y0;
    const P = [[0, 0], [X * 0.1, -Y], [X * 0.85, -Y * 0.8], [X, welk ? 12 : 5]];
    out += pfad(`M0,0C${sp(P[1])} ${sp(P[2])} ${sp(P[3])}`, `fill="none" stroke="${T.rachis}" stroke-width="0.9" stroke-linecap="round"`);
    for (let k = 0; k < n; k++) {
      const t = 0.12 + 0.86 * k / (n - 1);
      const [x, y] = bez(P, t);
      const [x2, y2] = bez(P, t + 0.02);
      const tRot = Math.atan2(x2 - x, -(y2 - y)) / RAD;
      for (const sd of [-1, 1]) {
        out += an(x, y, tRot + sd * 70, sd > 0 ? fiederA : fiederB);
      }
    }
  }
  return out;
}

// ---------- Lavendel ----------
// Halbkugeliger, lockerer Busch aus vielen schmalen, nadelartigen Blaettchen. Ab Stufe 3 darueber sehr duenne,
// leicht gefaecherte Stiele, jeder mit einer schmalen violetten Aehre aus kleinen Punkten.
const LAV = { hell: '#9fb39a', schatten: '#7e9479', kontur: '#5f7a5c', stiel: '#8fa889', punkt: '#9b7fc9', schatten2: '#7a5fb0', licht: '#e8dcff', knospe: '#7fb069' };
const LAV_WELK = { hell: '#c4c98f', schatten: '#a8a36a', kontur: '#7d6a45', stiel: '#a8a36a', punkt: '#a89a8a', schatten2: '#8a7a6a', licht: '#cfc6b4', knospe: '#b5c48a' };
// Busch je Stufe: [Anzahl Nadeln, Radius der Halbkugel]
const LAV_BUSCH = { 1: [30, 8], 2: [40, 9.5], 3: [50, 10.5], 4: [58, 11.5] };
// Stiele je Stufe: [Anzahl, Hoehe]. Stufe 2: wenige gruene Knospenstiele, ab Stufe 3 violette Aehren.
const LAV_STIELE = { 1: [0, 0], 2: [3, 13], 3: [12, 27], 4: [20, 33] };

// Eine schmale Nadel: Grund (0,0), Spitze (0,-L), halbe Breite 0.45, um a Grad gedreht
function lavNadel(x, y, a, L, fill, kon) {
  const R = ovalKante(L, 0.45, false);
  return an(x, y, a, pfad(p2pfad(umriss(R)), `fill="${fill}" stroke="${kon}" stroke-width="0.5" stroke-linejoin="round"`));
}

function lavendel(s, welk) {
  const T = welk ? LAV_WELK : LAV;
  const r = zufall(21 + s);
  const [N, Rd] = LAV_BUSCH[s];
  // Halbkugel: jede Nadel laeuft von der Buschmitte zu einem Punkt auf der Kugelflaeche (welk: flacher, breiter)
  const nadeln = [];
  for (let i = 0; i < N; i++) {
    const th = (-82 + 164 * (i + r() * 0.8) / N) * RAD;
    const rho = Rd * (0.75 + 0.25 * r()) * (welk ? 0.8 : 1);
    const ziel = [rho * Math.sin(th) * (welk ? 1.15 : 1), -rho * Math.cos(th) * (welk ? 0.6 : 0.9)];
    const x0 = (r() - 0.5) * 6, y0 = -1 - r() * 2;
    const dx = ziel[0] - x0, dy = ziel[1] - y0;
    const a = Math.atan2(dx, -dy) / RAD;
    // Licht von links: Nadeln links heller, rechts dunkler (gelegentlich abweichend)
    nadeln.push({ th: Math.abs(th), x0, y0, a, L: Math.hypot(dx, dy) * (0.95 + 0.1 * r()), hell: (a < 0) !== (r() < 0.2) });
  }
  let out = '';
  for (const b of nadeln.slice().sort((p, q) => q.th - p.th)) {
    out += lavNadel(b.x0, b.y0, b.a, b.L, b.hell ? T.hell : T.schatten, T.kontur);
  }
  const [ns, hoehe] = LAV_STIELE[s];
  let stiele = '', spitzen = '';
  for (let k = 0; k < ns; k++) {
    const a = (-24 + 48 * (k + r() * 0.6) / Math.max(1, ns - 1)) * RAD;
    const h = hoehe * (0.85 + 0.25 * r()) * (welk ? 0.8 : 1);
    const B = [(r() - 0.5) * 6, -4];
    const tip = [B[0] + h * Math.sin(a) * (welk ? 1.3 : 1), B[1] - h * Math.cos(a)];
    const C = [B[0] + (tip[0] - B[0]) * 0.1, (B[1] + tip[1]) / 2];
    stiele += pfad(`M${sp(B)}Q${sp(C)} ${sp(tip)}`, `fill="none" stroke="${T.stiel}" stroke-width="0.6" stroke-linecap="round"`);
    if (s === 2) {
      spitzen += kreis(tip[0], tip[1], 1.1, `fill="${T.knospe}"`);
      continue;
    }
    // Aehre: sieben Punkte entlang der letzten Stielstrecke, abwechselnd links und rechts, nach oben schmaler
    const dl = Math.hypot(tip[0] - C[0], tip[1] - C[1]) || 1;
    const d = [(tip[0] - C[0]) / dl, (tip[1] - C[1]) / dl];
    const perp = [-d[1], d[0]];
    const Ls = 5 + 2 * r();
    const unten = [tip[0] - d[0] * Ls, tip[1] - d[1] * Ls];
    for (let j = 0; j < 7; j++) {
      const t = j / 6;
      const w = 0.3 * (1 - 0.4 * t) * (j % 2 ? 1 : -1);
      const px = unten[0] + (tip[0] - unten[0]) * t + perp[0] * w;
      const py = unten[1] + (tip[1] - unten[1]) * t + perp[1] * w;
      spitzen += kreis(px + 0.3, py + 0.3, 0.75, `fill="${T.schatten2}"`) +
        kreis(px, py, 0.75, `fill="${T.punkt}"`) +
        kreis(px - 0.25, py - 0.25, 0.25, `fill="${T.licht}" opacity="0.7"`);
    }
  }
  return out + stiele + spitzen;
}

// ---------- Gemeinsame Bluete (weiss mit gelber Mitte) ----------
// Fuenf runde Blueten-Blaettchen um eine gelbe Mitte. Mittelpunkt (x,y), k = Groesse
function weissBlute(x, y, k, welk) {
  const kon = kontur(welk);
  let out = '';
  for (let j = 0; j < 5; j++) {
    const a = (j * 72 - 90) * RAD;
    out += oval(x + 1.9 * k * Math.cos(a), y + 1.9 * k * Math.sin(a), 1.3 * k, 1.3 * k, `fill="${welk ? '#e6d8c8' : '#ffffff'}" ${kon}`);
  }
  return out + kreis(x, y, 1.1 * k, `fill="${welk ? '#c9a46a' : '#f5c518'}"`);
}

// ---------- Basilikum ----------
// Aufrechte Triebe mit gegenstaendigen, eifoermigen, glattrandigen, leicht gewoelbten, glaenzenden Blaettern.
// Blattpaare zur Triebspitze hin kleiner. Stufe 4 mit weissen Lippenbluetenquirlen an 2 bis 3 Triebspitzen.
// Triebe: [Winkel gegen die Senkrechte, Triebhoehe, Blattpaare je Trieb]
const BAS_TRIEBE = {
  1: [[-22, 10, 2], [0, 13, 2], [22, 10, 2]],
  2: [[-26, 12, 2], [-8, 16, 2], [10, 15, 2], [28, 11, 2]],
  3: [[-30, 13, 3], [-14, 18, 3], [0, 20, 3], [14, 17, 3], [30, 13, 2]],
  4: [[-34, 14, 3], [-18, 19, 3], [-4, 22, 3], [10, 21, 3], [24, 18, 3], [38, 14, 3]],
};
// Stufe 4: Triebe (Index in BAS_TRIEBE[4]) mit Bluetenquirl an der Spitze
const BAS_BLUETEN = [1, 2, 4];
// Basilikum-Toene: Grund, Licht, Glanzstreifen, Adern, Rand (welk: Erdtoene, Rand braeunlich)
const BAS = { grund: '#5e9a52', licht: '#7fb069', glanz: '#b9dd9a', ader: '#477d43' };
const BAS_WELK = { grund: '#a8a36a', licht: '#c4c98f', glanz: '#d8d6a0', ader: '#8c8650' };

// Basilikumblatt: Grund (0,0), Spitze (0,-L), eifoermig mit breiter Mitte im unteren Drittel und glattem Rand.
// Rechte Haelfte dunkler, linke heller und etwas schmaler (leichte Woelbung), Glanzstreifen links neben der
// Mittelader, Mittelader und zwei feine Seitenadern je Seite.
function basilBlatt(L, W, welk) {
  const c = welk ? BAS_WELK : BAS;
  // Eiform mit breiter Mitte bei t 0.35 (unteres Drittel) und stumpf gerundeter Spitze (kein Zacken)
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
  const rand = welk ? 'stroke="#a6845a" stroke-width="0.8" stroke-linejoin="round"' : `stroke="#2f5a30" stroke-width="0.6" stroke-linejoin="round"`;
  let out = pfad(p2pfad(R), `fill="${c.grund}"`) + pfad(p2pfad(lk), `fill="${c.licht}"`);
  // Glanzstreifen: schmal, links neben der Mittelader
  const glanz = [];
  for (let i = 8; i <= 20; i++) {
    const t = i / 30;
    glanz.push([-0.55 * breite(t), -L * t]);
  }
  for (let i = 20; i >= 8; i--) {
    const t = i / 30;
    glanz.push([-0.33 * breite(t), -L * t]);
  }
  out += pfad(p2pfad(glanz), `fill="${c.glanz}" opacity="0.75"`);
  out += pfad(p2pfad(R.concat(lk)), `fill="none" ${rand}`);
  // Mittelader und Seitenadern (je Seite zwei)
  out += linie([0, 0], [0, -L * 0.92], `stroke="${c.ader}" stroke-width="0.6" stroke-linecap="round"`);
  for (const t of [0.35, 0.6]) {
    for (const sd of [-1, 1]) {
      out += linie([0, -L * t], [sd * breite(t + 0.15) * 0.75, -L * (t + 0.15)], `stroke="${c.ader}" stroke-width="0.45" stroke-linecap="round" opacity="0.7"`);
    }
  }
  return out;
}

// Weisser Lippenbluetenquirl: fuenf kleine Lippenbluetchen um eine gruene Mitte
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
    const a = welk ? a0 * 1.2 : a0;
    const h = h0 * (welk ? 0.8 : 1);
    const tip = [h * Math.sin(a * RAD), -h * Math.cos(a * RAD)];
    stiele += stiel(`M0,0L${sp(tip)}`, welk, 1.6);
    const ts = paare === 2 ? [0.5, 0.85] : [0.4, 0.65, 0.9];
    for (const t of ts) {
      const N = [tip[0] * t, tip[1] * t];
      for (const sd of [-1, 1]) {
        // Blattpaar gegenstaendig, zur Triebspitze hin kleiner (t = Lage am Trieb)
        const L = (welk ? 5.5 : 7) * (0.85 + 0.3 * r()) * (1 - 0.35 * t);
        const stielchen = linie([0, 1.2], [0, 0], `stroke="${welk ? '#7d6a45' : '#2f5a30'}" stroke-width="0.8" stroke-linecap="round"`);
        blaetter += an(N[0], N[1], a + sd * (welk ? 55 : 42), stielchen + basilBlatt(L, 0.32 * L, welk));
      }
    }
    if (s === 4 && BAS_BLUETEN.includes(idx)) bluten += lippenQuirl(tip[0], tip[1]);
  });
  return stiele + blaetter + bluten;
}

// ---------- Erdbeere ----------
// Dreizaehlige, gezaehnte Blaetter an Stielen, Auslaeufer ueber den Topfrand.
// Stufe 3 weisse Bluetchen, Stufe 4 rote Fruechte.
// Blattstiele: [Winkel gegen die Senkrechte, Stiellaenge]
const ERD_BLAETTER = {
  1: [[-40, 9], [-5, 11], [30, 9]],
  2: [[-48, 11], [-20, 13], [8, 13], [36, 10]],
  3: [[-52, 12], [-28, 14], [-6, 15], [16, 14], [42, 11]],
  4: [[-54, 12], [-30, 14], [-8, 15], [14, 15], [38, 12]],
};
// Auslaeufer je Stufe: Seiten (+1 rechts, -1 links)
const ERD_AUSLAEUFER = { 1: [], 2: [1], 3: [1, -1], 4: [1, -1] };
// Fruechte je Stufe: [x, y, Radius]. Die Fruechte haengen ueber den Topfrand.
const ERD_FRUECHTE = { 1: [], 2: [], 3: [], 4: [[-12, -4, 3.4], [12, -2, 3.6], [-5, -14, 3.2], [6, -15, 3.0]] };

// Herzform mit Spitze nach unten, gelbe Nuesschen-Punkte, gruener Kelch oben
function erdFrucht(x, y, r) {
  const w = r * 0.9, h = r;
  const pts = [[0, -0.55 * h], [0.55 * w, -0.95 * h], [0.95 * w, -0.2 * h], [0.5 * w, 0.6 * h], [0, 1.2 * h], [-0.5 * w, 0.6 * h], [-0.95 * w, -0.2 * h], [-0.55 * w, -0.95 * h]]
    .map(([px, py]) => [x + px, y + py]);
  let out = pfad(glattGeschlossen(pts), 'fill="#e8453c" stroke="#8a2a24" stroke-width="0.6" stroke-linejoin="round"') +
    oval(x - 0.4 * w, y - 0.2 * h, 0.3 * w, 0.2 * h, 'fill="#ffffff" opacity="0.5"');
  for (const [px, py] of [[-0.5, -0.45], [0.4, -0.35], [-0.2, 0.1], [0.45, 0.25], [-0.45, 0.4], [0, 0.65], [0.25, 0.8]]) {
    out += kreis(x + px * w, y + py * h, 0.3, 'fill="#ffe08a"');
  }
  // Kelch: zehn Spitzen (abwechselnd lang und kurz), flach gedrueckt
  const kelch = [];
  for (let k = 0; k < 10; k++) {
    const a = k * 36 * RAD, rr = k % 2 ? 0.3 * w : 0.7 * w;
    kelch.push([x + rr * Math.cos(a), y - 0.6 * h + rr * Math.sin(a) * 0.45]);
  }
  return out + poly(kelch, `fill="#5e9a52" ${KON_GRUEN}`);
}

function erdbeere(s, welk) {
  let stiele = '', blaetter = '', bluten = '', ausl = '', fr = '';
  ERD_BLAETTER[s].forEach(([a0, S], i) => {
    const a = welk ? a0 * 1.25 : a0;
    const len = welk ? S * 0.8 : S;
    const N = [len * Math.sin(a * RAD), -len * Math.cos(a * RAD) * (welk ? 0.6 : 1)];
    stiele += stiel(`M0,0L${sp(N)}`, welk, 1.4);
    // Dreizaehliges Blatt: Endblaettchen in Stielrichtung, zwei seitliche Blaettchen
    for (const [da, k] of [[0, 1], [-50, 0.85], [50, 0.85]]) {
      const Lf = 6.5 * k * (welk ? 0.8 : 1);
      blaetter += an(N[0], N[1], a + da, blatt(ovalKante(Lf, 0.6 * Lf, true), { L: Lf, W: 0.6 * Lf, ...farben(i + (da > 0 ? 1 : 0), welk) }));
    }
    if (s === 3 && i < 3) bluten += weissBlute(N[0], N[1] - 2, 0.9, welk);
  });
  for (const sg of ERD_AUSLAEUFER[s]) {
    const E = [sg * 17, 8];
    ausl += stiel(`M${sg * 3},-3Q${sg * 14},-9 ${sp(E)}`, welk, 1.2);
    // Jungpflanze am Ende des Ausloeufers: zwei kleine Blaettchen
    for (const da of [-30, 30]) {
      ausl += an(E[0], E[1], sg * da, blatt(ovalKante(4.5, 2.4, true), { L: 4.5, W: 2.4, ...farben(da > 0 ? 1 : 0, welk) }));
    }
  }
  for (const [x, y, rad] of ERD_FRUECHTE[s]) {
    fr += linie([x * 0.2, -3], [x, y - rad * 0.6], 'stroke="#5e9a52" stroke-width="0.9" stroke-linecap="round"') + erdFrucht(x, y, rad);
  }
  return stiele + ausl + blaetter + bluten + fr;
}

// ---------- Zitronenbaeumchen ----------
// Kleines Baeumchen mit Stamm und runder Krone aus ovalen, glaenzenden dunkelgruenen Blaettern.
// Stufe 3 weisse Bluetchen, Stufe 4 gelbe Zitronen.
const ZIT = { hell: '#477d43', dunkel: '#3a6b3a', welk: false };
// TH Stammhoehe, KR Kronenradius, N Blaetter, L Blattlaenge, blueten/zitronen Anzahl
const ZIT_STUFE = {
  1: { TH: 12, KR: 11, N: 14, L: 5.5, blueten: 0, zitronen: 0 },
  2: { TH: 16, KR: 13, N: 22, L: 5.5, blueten: 0, zitronen: 0 },
  3: { TH: 20, KR: 15, N: 30, L: 6, blueten: 3, zitronen: 0 },
  4: { TH: 22, KR: 16, N: 36, L: 6, blueten: 2, zitronen: 5 },
};
// Positionen in Kronen-Koordinaten (Anteil am Kronenradius)
const ZIT_BLUETEN = [[-0.6, -0.3], [0.5, 0.2], [0.1, 0.7]];
const ZIT_ZITRONEN = [[-0.75, 0.6], [0.2, 0.95], [0.8, 0.45], [-0.3, 0.95], [0.5, 1.0]];

// Zitrone: ovale Form mit spitzen Enden, Licht links, Schatten rechts, heller Glanzpunkt
function zitronenFrucht(x, y, w, h, welk) {
  const aussen = welk ? '#a8895a' : '#d9b52a', innen = welk ? '#c9a46a' : '#f5d63d';
  const form = (k, dx) => glattGeschlossen([[0, -h], [0.6 * w, -0.5 * h], [0.75 * w, 0], [0.6 * w, 0.5 * h], [0, h], [-0.6 * w, 0.5 * h], [-0.75 * w, 0], [-0.6 * w, -0.5 * h]]
    .map(([px, py]) => [x + px * k + dx, y + py]));
  return pfad(form(1, 0), `fill="${aussen}" ${KON_GRUEN}`) +
    pfad(form(0.8, -0.12 * w), `fill="${innen}"`) +
    oval(x - 0.35 * w, y - 0.25 * h, 0.2 * w, 0.14 * h, 'fill="#ffffff" opacity="0.7"');
}

function zitrone(s, welk) {
  const Z = ZIT_STUFE[s];
  const r = zufall(51 + s);
  const cx = 0, cy = -Z.TH - Z.KR * 0.5;
  const T = welk ? WELK : ZIT;
  const holz = welk ? '#c9b07a' : '#c98f5a';
  // Schatten unter der Krone, Stamm mit Licht und Schatten, drei Aeste
  let out = oval(cx, cy + Z.KR * 0.2, Z.KR * 0.95, Z.KR * 0.75, `fill="${welk ? '#a8a36a' : '#3a6b3a'}" opacity="0.3"`) +
    pfad(`M-2.6,1L-1.7,${-Z.TH}L1.7,${-Z.TH}L2.6,1Z`, `fill="${holz}" ${KON_TOPF}`) +
    linie([-1.5, -Z.TH + 1], [-1.5, -1], 'stroke="#e2b07c" stroke-width="1" stroke-linecap="round"') +
    linie([1.2, -Z.TH + 1], [1.2, -1], 'stroke="#a86b43" stroke-width="0.8"');
  for (const [bx, by] of [[-8, cy + Z.KR * 0.2], [7, cy + Z.KR * 0.3], [0, cy + Z.KR * 0.7]]) {
    const d = `M0,${-Z.TH + 2}Q${f(bx * 0.4)},${f(-Z.TH - 2)} ${f(bx)},${f(by)}`;
    out += pfad(d, 'fill="none" stroke="#6b4a3a" stroke-width="2.6" stroke-linecap="round"') +
      pfad(d, `fill="none" stroke="${holz}" stroke-width="1.4" stroke-linecap="round"`);
  }
  // Blaetter in der Krone, nach aussen gerichtet; obere zuerst, untere liegen vorn
  const bl = [];
  for (let i = 0; i < Z.N; i++) {
    const phi = r() * 2 * Math.PI, rho = Math.sqrt(r()) * 0.9;
    const x = cx + Z.KR * rho * Math.cos(phi), y = cy + Z.KR * 0.8 * rho * Math.sin(phi);
    bl.push({ x, y, rot: (x - cx) / Z.KR * 70 + (r() - 0.5) * 40, L: Z.L * (0.85 + 0.3 * r()) });
  }
  bl.sort((p, q) => p.y - q.y);
  for (const b of bl) {
    out += an(b.x, b.y, b.rot, blatt(ovalKante(b.L, 0.42 * b.L, false), { L: b.L, W: 0.42 * b.L, ...T }));
  }
  for (const [dx, dy] of ZIT_BLUETEN.slice(0, Z.blueten)) {
    out += weissBlute(cx + Z.KR * dx, cy + Z.KR * dy, 1, welk);
  }
  for (const [dx, dy] of ZIT_ZITRONEN.slice(0, Z.zitronen)) {
    const x = cx + Z.KR * dx, y = cy + Z.KR * 0.8 * dy + 2;
    out += linie([cx + Z.KR * dx * 0.4, cy + Z.KR * 0.5], [x, y - 4.6], `stroke="${welk ? '#a8a36a' : '#477d43'}" stroke-width="0.9" stroke-linecap="round"`) +
      zitronenFrucht(x, y, 3.4, 4.6, welk);
  }
  return out;
}

// ---------- Bonsai (Ficus) ----------
// Flache, rechteckige Keramikschale auf Fuesschen statt Topf, knorriger S-foermiger Stamm mit Wurzelansatz,
// 2 bis 4 flache Laubpolster aus kleinen Blaettchen, Moos auf der Erde.
const SCHALE = { links: '#4d5c78', rechts: '#3d4b65', oben: '#6b7ba0' };
// Hoehe der Schale (Oberkante = Erde)
const BON_H = 5;
// Stufen: h Stammhoehe, pols [x, y, rx, ry] je Laubpolster, L Blaettchenlaenge, n Blaettchen je Polster
const BON_STUFE = {
  1: { h: 20, pols: [[-6, -15, 5.5, 3.2], [5, -19, 5, 3]], L: 3.4, n: 8 },
  2: { h: 25, pols: [[-7, -15, 6.5, 3.6], [6, -20, 6, 3.4], [0, -27, 4.5, 2.8]], L: 3.6, n: 10 },
  3: { h: 30, pols: [[-8, -15, 7.5, 4], [7, -21, 7, 3.8], [-2, -28, 6, 3.4]], L: 3.8, n: 12 },
  4: { h: 33, pols: [[-9, -14, 8.5, 4.5], [8, -20, 7.5, 4.2], [-3, -27, 7, 3.9], [5, -33, 5.5, 3.2]], L: 4, n: 14 },
};

// Ortskoordinaten relativ zum Ursprung der Schale (Mitte Bodenkontakt)
const isoRel = (gx, gy, z) => { const [x, y] = iso(gx, gy, z); return [x - OX, y - OY]; };

// Schale mit Fuessen, Erde, Kieseln und Moos. Oberkante bei -H, der Baum sitzt im Ursprung der Pflanzengruppe.
function bonsaiSchale(H) {
  const fuss = [[-0.13, -0.09], [0.13, -0.09], [-0.13, 0.09], [0.13, 0.09]]
    .map(([gx, gy]) => { const [x, y] = isoRel(gx, gy, 0); return oval(x, y + 1.5, 2.4, 1.5, 'fill="#3d4b65" stroke="#6b4a3a" stroke-width="0.6"'); })
    .join('');
  const korpus = gruppe(`transform="translate(${-OX},${-OY})"`, kiste(-0.16, 0.16, -0.12, 0.12, 0, H, SCHALE));
  const erde = poly([[-0.13, -0.09], [0.13, -0.09], [0.13, 0.09], [-0.13, 0.09]].map(([gx, gy]) => isoRel(gx, gy, H)), 'fill="#6b4a3a" stroke="#4a3a2a" stroke-width="0.6" stroke-linejoin="round"');
  const [m1x, m1y] = isoRel(-0.06, 0.03, H), [m2x, m2y] = isoRel(0.06, -0.04, H);
  const moos = oval(m1x, m1y, 3.2, 1.6, 'fill="#8fc98a"') + oval(m1x + 1, m1y - 0.4, 1.4, 0.8, 'fill="#5e9a52"') +
    oval(m2x, m2y, 2.4, 1.2, 'fill="#7fb069"');
  const [s1x, s1y] = isoRel(0.04, 0.07, H), [s2x, s2y] = isoRel(-0.07, -0.05, H);
  const kiesel = kreis(s1x, s1y, 0.6, 'fill="#8a6a4a"') + kreis(s2x, s2y, 0.5, 'fill="#8a6a4a"');
  const schatten = oval(0, 0, 14, 6, 'fill="#6b4a3a" opacity="0.18"');
  return schatten + fuss + korpus + erde + moos + kiesel;
}

function bonsai(s, welk) {
  const St = BON_STUFE[s];
  const r = zufall(71 + s);
  const h = St.h;
  const holz = welk ? '#c9b07a' : '#c98f5a';
  // Knorriger S-foermiger Stamm: dunkle Kontur, Holzfarbe, heller Streifen links, Schatten rechts
  const d = `M0,2C-6,${f(-h * 0.13)} 5,${f(-h * 0.3)} 0,${f(-h * 0.5)}C-5,${f(-h * 0.7)} 4,${f(-h * 0.83)} 1,${f(-h)}`;
  let out = pfad(d, 'fill="none" stroke="#6b4a3a" stroke-width="6.4" stroke-linecap="round"') +
    pfad(d, `fill="none" stroke="${holz}" stroke-width="5" stroke-linecap="round"`) +
    gruppe('transform="translate(-1.3,0)"', pfad(d, 'fill="none" stroke="#e2b07c" stroke-width="1.2" stroke-linecap="round" opacity="0.8"')) +
    gruppe('transform="translate(1.7,0)"', pfad(d, 'fill="none" stroke="#a86b43" stroke-width="1.2" stroke-linecap="round" opacity="0.6"'));
  // Wurzelansatz: vier kurze Wurzeln, die sich auf der Erde verteilen
  for (const [ex, ey] of [[-7, 4], [6, 4], [-3, 5.5], [4, 5]]) {
    const rd = `M0,2Q${f(ex * 0.5)},${f(ey - 1)} ${f(ex)},${f(ey)}`;
    out += pfad(rd, 'fill="none" stroke="#6b4a3a" stroke-width="3" stroke-linecap="round"') +
      pfad(rd, `fill="none" stroke="${holz}" stroke-width="1.6" stroke-linecap="round"`);
  }
  // Laubpolster: flache Ellipsen aus kleinen Blaettchen, mit Astansatz am Stamm
  St.pols.forEach(([cx, cy, rx, ry], j) => {
    out += linie([0, cy + ry * 0.4], [cx * 0.6, cy + ry * 0.5], 'stroke="#6b4a3a" stroke-width="1.6" stroke-linecap="round"') +
      linie([0, cy + ry * 0.4], [cx * 0.6, cy + ry * 0.5], `stroke="${holz}" stroke-width="0.8" stroke-linecap="round"`) +
      oval(cx, cy + ry * 0.6, rx * 0.95, ry * 0.8, `fill="${welk ? '#a8a36a' : '#3a6b3a'}" opacity="0.35"`);
    const bl = [];
    for (let k = 0; k < St.n; k++) {
      const phi = r() * 2 * Math.PI, rho = Math.sqrt(r()) * 0.9;
      bl.push({ x: cx + rx * rho * Math.cos(phi), y: cy + ry * rho * Math.sin(phi), rot: (r() - 0.5) * 120, k });
    }
    bl.sort((p, q) => p.y - q.y);
    for (const b of bl) {
      out += an(b.x, b.y, b.rot, blatt(ovalKante(St.L, 0.42 * St.L, true), { L: St.L, W: 0.42 * St.L, ...farben(b.k + j, welk) }));
    }
  });
  return out;
}

// ---------- Kletterrose ----------
// Rosenstrauch an einem Holz-Rankgitter (Latten, ca. 70 hoch), dornige Triebe, gefiederte gezaehnte Blaetter.
// Stufe 3 Knospen, Stufe 4 Rosen.
const ROS = { rose: '#e9849b', hell: '#f5c0cb', spirale: '#c45c78' };
const ROS_WELK = { rose: '#c9a46a', hell: '#e0c08a', spirale: '#8a6a4a' };
// Triebe als kubische Bezier-Kurven vom Topfrand nach oben
const ROS_TRIEBE = [
  [[-1, -1], [-9, -12], [-11, -26], [-8, -40]],
  [[1, -1], [10, -10], [9, -26], [11, -42]],
  [[0, -1], [-3, -16], [4, -30], [1, -50]],
];
// Stufen: tmax Anteil der Triebe, blaetter je Trieb, L Blattlaenge, knospen [Trieb], rosen [Trieb, Anteil, Seite]
const ROS_STUFE = {
  1: { tmax: 0.5, blaetter: 2, L: 8, knospen: [], rosen: [] },
  2: { tmax: 0.7, blaetter: 3, L: 9, knospen: [], rosen: [] },
  3: { tmax: 0.85, blaetter: 3, L: 10, knospen: [0, 1, 2], rosen: [] },
  4: { tmax: 1, blaetter: 4, L: 11, knospen: [], rosen: [[0, 1, 1], [0, 0.7, -1], [1, 1, -1], [1, 0.72, 1], [2, 1, 1], [2, 0.7, -1], [1, 0.45, -1]] },
};

// Rankgitter aus Latten: zwei Pfosten, Querlatten und Gitterlatten, Ursprung am Topfrand, ca. 70 hoch
function rankgitter(welk) {
  const at = `fill="${welk ? '#c9b07a' : '#c98f5a'}" stroke="#6b4a3a" stroke-width="0.7" stroke-linejoin="round"`;
  let out = '';
  for (const x of [-7, 0, 7]) out += rechteck(x - 0.7, -70, 1.4, 70, 0.3, at);
  for (const y of [-10, -24, -38, -52, -66]) out += rechteck(-14, y - 0.9, 28, 1.8, 0.4, at);
  return out + rechteck(-15.2, -70, 2.4, 71, 0.6, at) + rechteck(12.8, -70, 2.4, 71, 0.6, at) + rechteck(-15.8, -71.5, 31.6, 2.2, 0.8, at);
}

// Gefiederte Blattfolge: Spindel nach oben, Fiederblaettchen paarweise und ein Endblaettchen, gezaehnt
function rosenBlatt(L, welk, i) {
  const col = welk ? WELK : GRUEN[i % 2];
  const bl = (x, y, rot, Lf) => an(x, y, rot, blatt(ovalKante(Lf, 0.5 * Lf, true), { L: Lf, W: 0.5 * Lf, ...col }));
  let out = linie([0, 0], [0, -L], `stroke="${welk ? '#a8a36a' : '#477d43'}" stroke-width="0.8" stroke-linecap="round"`);
  for (const fr of [0.35, 0.65]) {
    for (const sd of [-1, 1]) out += bl(0, -L * fr, sd * 60, L * 0.36);
  }
  return out + bl(0, -L, 0, L * 0.38);
}

// Triebverlauf bis zum Anteil tmax als Polygonzug
function rankPfad(P, tmax) {
  let d = '';
  for (let i = 0; i <= 16; i++) d += (i ? 'L' : 'M') + p2(bez(P, tmax * i / 16));
  return d;
}

// Dornen: kleine dunkle Spitzen, abwechselnd nach links und rechts
function dornen(P, tmax) {
  let out = '';
  for (let k = 1; k <= 6; k++) {
    const [x, y] = bez(P, tmax * k / 7), sd = k % 2 ? 1 : -1;
    out += pfad(`M${f(x)},${f(y)}L${f(x + sd * 2.4)},${f(y - 1.4)}L${f(x + sd * 0.4)},${f(y + 0.8)}Z`, 'fill="#7a5a1a"');
  }
  return out;
}

// Rosenbluete: aeussere Blaetter in Rosa, hellere Innenseite, Spirale aus Blattkanten in der Mitte
function rosenBlute(x, y, r, welk) {
  const T = welk ? ROS_WELK : ROS;
  let spirale = '';
  for (let i = 0; i <= 24; i++) {
    const th = i / 24 * 3 * Math.PI, rad = r * (0.1 + 0.6 * i / 24);
    spirale += (i ? 'L' : 'M') + p2([x + rad * Math.cos(th), y + rad * Math.sin(th)]);
  }
  return kreis(x, y, r, `fill="${T.rose}" ${kontur(welk)}`) +
    kreis(x + 0.2 * r, y - 0.2 * r, r * 0.7, `fill="${T.hell}"`) +
    pfad(spirale, `fill="none" stroke="${T.spirale}" stroke-width="0.6" stroke-linecap="round" opacity="0.8"`);
}

// Knospe: rosa Kopf auf einem gruenen Kelch
function rosenKnospe(x, y, welk) {
  const T = welk ? ROS_WELK : ROS;
  return oval(x, y + 1.4, 1.4, 1.8, `fill="#5e9a52" ${kontur(welk)}`) +
    oval(x, y - 0.4, 1.6, 2.2, `fill="${T.rose}" ${kontur(welk)}`);
}

function kletterrose(s, welk) {
  const St = ROS_STUFE[s];
  const r = zufall(61 + s);
  let triebe = '', dorn = '', blaetter = '', knospen = '', rosen = '';
  ROS_TRIEBE.forEach((P, j) => {
    triebe += stiel(rankPfad(P, St.tmax), welk, 2.2);
    dorn += dornen(P, St.tmax);
    for (let k = 0; k < St.blaetter; k++) {
      const t = St.tmax * (0.3 + 0.7 * k / (St.blaetter - 1));
      const [x, y] = bez(P, t);
      blaetter += an(x, y, ((k + j) % 2 ? 1 : -1) * 62, rosenBlatt(St.L, welk, k + j));
    }
  });
  for (const j of St.knospen) {
    const [x, y] = bez(ROS_TRIEBE[j], St.tmax);
    knospen += rosenKnospe(x, y, welk);
  }
  for (const [j, t, sd] of St.rosen) {
    const [x, y] = bez(ROS_TRIEBE[j], St.tmax * t);
    rosen += rosenBlute(x + sd * 1.5, y - 1, 3.6 + 0.8 * r(), welk);
  }
  return rankgitter(welk) + triebe + dorn + blaetter + knospen + rosen;
}

// ---------- Zusammensetzen ----------
// Pflanzen mit kleinem Topf (Radius EF_R, Hoehe 16)
const KLEIN = ['kaktus', 'efeutute', 'bogenhanf', 'aloe', 'gruenlilie', 'echeverie', 'orchidee', 'calathea', 'bostonfarn', 'lavendel', 'basilikum', 'erdbeere', 'bonsai'];

function zeichnePflanze(typ, stufe, welk, ebene) {
  const s = Math.min(4, Math.max(1, Math.round(Number(stufe) || 1)));
  const klein = KLEIN.includes(typ);
  const schale = typ === 'bonsai';
  const R = schale ? 12 : klein ? EF_R : 14, H = schale ? BON_H : klein ? 16 : 20;
  let inhalt;
  if (typ === 'monstera') inhalt = monstera(s, welk);
  else if (typ === 'geigenfeige') inhalt = geigenfeige(s, welk);
  else if (typ === 'orchidee') inhalt = orchidee(s, welk);
  else if (typ === 'calathea') inhalt = calathea(s, welk);
  else if (typ === 'bostonfarn') inhalt = bostonfarn(s, welk);
  else if (typ === 'lavendel') inhalt = lavendel(s, welk);
  else if (typ === 'basilikum') inhalt = basilikum(s, welk);
  else if (typ === 'erdbeere') inhalt = erdbeere(s, welk);
  else if (typ === 'zitrone') inhalt = zitrone(s, welk);
  else if (typ === 'bonsai') inhalt = bonsai(s, welk);
  else if (typ === 'kletterrose') inhalt = kletterrose(s, welk);
  else if (typ === 'kaktus') inhalt = kaktus(s, welk);
  else if (typ === 'sonnenblume') inhalt = sonnenblume(s, welk);
  else if (typ === 'tomate') inhalt = tomate(s, welk);
  else if (typ === 'bogenhanf') inhalt = bogenhanf(s, welk);
  else if (typ === 'aloe') inhalt = aloe(s, welk);
  else if (typ === 'gruenlilie') inhalt = gruenlilie(s, welk);
  else if (typ === 'gluecksfeder') inhalt = gluecksfeder(s, welk);
  else if (typ === 'echeverie') inhalt = echeverie(s, welk);
  else inhalt = efeutute(s, welk, ebene);
  return (typ === 'orchidee' ? kunststofftopf(R, H) : schale ? bonsaiSchale(H) : topf(R, H)) +
    gruppe(`transform="translate(0,${-H}) rotate(${welk ? 8 : 0})"`, inhalt) +
    (welk ? fallLaub(ebene) : '');
}

// ebene: 'boden' (Standard) oder 'brett' (Stellplatz auf einem Moebel)
export const PFLANZEN = {
  monstera: { name: 'Monstera deliciosa', groesse: 'gross', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('monstera', stufe, welk, ebene) },
  kaktus: { name: 'Goldkugelkaktus', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('kaktus', stufe, welk, ebene) },
  sonnenblume: { name: 'Sonnenblume', groesse: 'gross', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('sonnenblume', stufe, welk, ebene) },
  tomate: { name: 'Tomate', groesse: 'gross', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('tomate', stufe, welk, ebene) },
  efeutute: { name: 'Efeutute', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('efeutute', stufe, welk, ebene) },
  bogenhanf: { name: 'Bogenhanf', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('bogenhanf', stufe, welk, ebene) },
  aloe: { name: 'Aloe vera', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('aloe', stufe, welk, ebene) },
  gruenlilie: { name: 'Grünlilie', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('gruenlilie', stufe, welk, ebene) },
  gluecksfeder: { name: 'Glücksfeder', groesse: 'gross', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('gluecksfeder', stufe, welk, ebene) },
  echeverie: { name: 'Echeverie', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('echeverie', stufe, welk, ebene) },
  geigenfeige: { name: 'Geigenfeige', groesse: 'gross', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('geigenfeige', stufe, welk, ebene) },
  orchidee: { name: 'Orchidee', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('orchidee', stufe, welk, ebene) },
  calathea: { name: 'Calathea', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('calathea', stufe, welk, ebene) },
  bostonfarn: { name: 'Bostonfarn', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('bostonfarn', stufe, welk, ebene) },
  lavendel: { name: 'Lavendel', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('lavendel', stufe, welk, ebene) },
  basilikum: { name: 'Basilikum', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('basilikum', stufe, welk, ebene) },
  erdbeere: { name: 'Erdbeere', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('erdbeere', stufe, welk, ebene) },
  zitrone: { name: 'Zitronenbäumchen', groesse: 'gross', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('zitrone', stufe, welk, ebene) },
  bonsai: { name: 'Ficus-Bonsai', groesse: 'klein', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('bonsai', stufe, welk, ebene) },
  kletterrose: { name: 'Kletterrose', groesse: 'gross', zeichne: (stufe, welk = false, ebene = 'boden') => zeichnePflanze('kletterrose', stufe, welk, ebene) },
};
