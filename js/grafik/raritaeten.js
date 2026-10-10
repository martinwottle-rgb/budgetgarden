// Raritaeten: seltene, echte Pflanzen im goldenen Topf. Nicht kaufbar, nur freischaltbar (SPEC.md, Abschnitt Raritaeten).
// Schnittstelle wie PFLANZEN in pflanzen.js: zeichne(stufe, welk, ebene, optionen) liefert SVG-Inhalt mit Ursprung (0,0)
// = Mitte der Topf-Unterkante, ohne Positionierung und ohne Skalierung. optionen = { tageszeit } (Koenigin der Nacht).
// silhouette(typ) liefert die Stufe-4-Form einfarbig (gesperrte Shop-Karten).
// Gemeinsam: goldener Topf mit Ornamentband und Edelstein, Funkeln (SVG-Animation), weicher goldener Schein.

import { f, p2, gruppe, pfad, linie, oval, kreis, rechteck, poly, qb, zufall, iso, kiste, OX, OY } from './hilfen.js';

const RAD = Math.PI / 180;
const SILH = '#6b4a3a';

// Konturen wie in pflanzen.js: Topf braun, Pflanzenteile dunkelgruen (welk: Erdton)
const KON_TOPF = 'stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';
const KON_GRUEN = 'stroke="#2f5a30" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const KON_WELK = 'stroke="#7d6a45" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const kontur = (welk) => (welk ? KON_WELK : KON_GRUEN);
// Innenlinien (Adern)
const ADER = 'stroke="#3a6b3a" stroke-width="0.5" stroke-linecap="round" opacity="0.6"';

const GOLD = { mittel: '#e8c15a', schatten: '#c19a35', licht: '#fff0b3' };
const GRUEN = [{ hell: '#7fb069', dunkel: '#5e9a52' }, { hell: '#9ccc7a', dunkel: '#7fb069' }];
const WELK = { hell: '#c4c98f', dunkel: '#a8a36a', welk: true };

// ---------- Blattgeometrie (Kopien aus pflanzen.js, dort nicht exportiert) ----------
function bez(P, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [0, 1].map((j) => a * P[0][j] + b * P[1][j] + c * P[2][j] + d * P[3][j]);
}

const WELLE = (i) => 1 + 0.05 * Math.sin((2 * Math.PI * i) / 6.5);

// Herzform: Grund (0,0) mit Lappen nach unten, Spitze (0,-L)
function herzKante(L, W, zacken) {
  const A = [[0, 0], [0.35 * W, 0.22 * L], [0.62 * W, 0.05 * L], [0.55 * W, -0.25 * L]];
  const B = [[0.55 * W, -0.25 * L], [0.5 * W, -0.6 * L], [0.25 * W, -0.85 * L], [0, -L]];
  const pts = [];
  for (let i = 0; i <= 20; i++) pts.push(bez(A, i / 20));
  for (let i = 1; i <= 20; i++) pts.push(bez(B, i / 20));
  return zacken ? pts.map(([x, y], i) => (i > 0 && i < 40 ? [x * WELLE(i), y] : [x, y])) : pts;
}

// Ovale, spitze Form (Grund (0,0), Spitze (0,-L))
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

// Blatt aus rechter Kante R (Grund (0,0), Spitze (0,-L)). Linke Haelfte heller, rechte dunkler.
// o: { L, W, hell, dunkel, welk }
function blatt(R, o) {
  const { L, W, hell, dunkel, welk } = o;
  const Lk = R.map(([x, y]) => [-x, y]);
  const lk = Lk.slice().reverse();
  let out = pfad(p2pfad(R), `fill="${dunkel}"`) + pfad(p2pfad(lk), `fill="${hell}"`);
  out += linie([0, 0], [0, -L * 0.92], ADER);
  for (const t of [0.3, 0.5, 0.7]) {
    for (const s of [-1, 1]) out += linie([0, -L * t], [s * W * 0.4, -L * (t + 0.12)], ADER);
  }
  out += pfad(p2pfad(R.concat(lk)), `fill="none" ${kontur(welk)}`);
  out += linie([-W * 0.3, -L * 0.2], [-W * 0.2, -L * 0.5], 'stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="0.45"');
  return out;
}

// Stiel mit dunkler Kontur, Farbkern und Glanzlinie
function stiel(d, rand, aussen, innen, w = 2.6) {
  return pfad(d, `fill="none" stroke="${rand}" stroke-width="${f(w + 1.4)}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${aussen}" stroke-width="${w}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${innen}" stroke-width="${f(w * 0.55)}" stroke-linecap="round"`);
}

// Sternchen als Fleck oder Funkel-Form (vierzackig, Spitzen ueber Quadratkurven)
function vierstern(x, y, r, attr) {
  const d = `M${f(x)},${f(y - r)}Q${f(x)},${f(y)} ${f(x + r)},${f(y)}Q${f(x)},${f(y)} ${f(x)},${f(y + r)}Q${f(x)},${f(y)} ${f(x - r)},${f(y)}Q${f(x)},${f(y)} ${f(x)},${f(y - r)}Z`;
  return pfad(d, attr);
}

// Funkeln: kleine vierzackige Sterne, die per <animate> auf opacity 0 - 1 - 0 blinken
function funkeln(liste) {
  return liste.map(([x, y, r0, b]) => {
    const r = r0 * 1.5;
    const d = `M${f(x)},${f(y - r)}Q${f(x)},${f(y)} ${f(x + r)},${f(y)}Q${f(x)},${f(y)} ${f(x)},${f(y + r)}Q${f(x)},${f(y)} ${f(x - r)},${f(y)}Q${f(x)},${f(y)} ${f(x)},${f(y - r)}Z`;
    return `<path d="${d}" fill="#fff6c8" opacity="0"><animate attributeName="opacity" values="0;1;0" dur="2.4s" begin="${b}s" repeatCount="indefinite"/></path>`;
  }).join('');
}

// Abgefallene Blaetter (nur welk), wie in pflanzen.js
function fallLaub(ebene) {
  const stellen = ebene === 'brett'
    ? [[-18, 9, 20], [-9, 4, -20]]
    : [[13, 7, -35], [-12, 8, 30], [2, 11, -5]];
  return stellen.map(([x, y, w]) => fallBlatt(x, y, w)).join('');
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

// Kontaktschatten unter dem Topf
function kontakt(R, H, schale) {
  if (schale) return oval(0, 0, 14, 6, 'fill="#6b4a3a" opacity="0.18"');
  const Rb = R * 0.72, ryb = Rb * 0.4;
  return oval(1, 0, Rb + 2.5, ryb + 1.5, 'fill="#6b4a3a" opacity="0.18"');
}

// Edelstein (Raute mit Facetten und Glanzpunkt)
function edelstein(x, y, gh, gb, farbe) {
  return poly([[x, y - gh], [x + gb, y], [x, y + gh], [x - gb, y]], `fill="${farbe}" stroke="#6b4a3a" stroke-width="0.6" stroke-linejoin="round"`) +
    poly([[x, y - gh], [x - gb, y], [x, y]], 'fill="#ffffff" opacity="0.35"') +
    poly([[x, y], [x + gb, y], [x, y + gh]], 'fill="#000000" opacity="0.12"') +
    kreis(x - gb * 0.35, y - gh * 0.45, gh * 0.18, 'fill="#ffffff"');
}

// ---------- Goldener Topf (wie der Terrakotta-Topf, mit Ornamentband und Edelstein vorne) ----------
function goldTopf(R, H, stein) {
  const k = R / 14, Rb = R * 0.72, ry = R * 0.4, ryb = Rb * 0.4;
  const korpus = `M${f(-R)},${-H}L${f(-Rb)},0A${f(Rb)},${f(ryb)} 0 0 0 ${f(Rb)},0L${R},${-H}A${R},${f(ry)} 0 0 1 ${f(-R)},${-H}Z`;
  // Punkt auf der Vorderseite: t = 0 an der Unterkante, t = 1 am oberen Rand
  const vorn = (x, t) => [x, ryb * Math.sqrt(Math.max(0, 1 - (x / Rb) ** 2)) * (1 - t) + (-H + ry * Math.sqrt(Math.max(0, 1 - (x / R) ** 2))) * t];
  let band = '';
  for (const t of [0.22, 0.78]) {
    for (let x = -0.6 * Rb; x <= 0.6 * Rb; x += 2.2 * k) {
      const [px, py] = vorn(x, t);
      band += poly([[px, py - 0.9 * k], [px + 0.65 * k, py], [px, py + 0.9 * k], [px - 0.65 * k, py]],
        `fill="${GOLD.schatten}" stroke="#8a6a1a" stroke-width="0.3" stroke-linejoin="round"`);
      const [qx, qy] = vorn(x + 1.1 * k, t);
      band += kreis(qx, qy, 0.4 * k, `fill="${GOLD.licht}"`);
    }
  }
  return pfad(korpus, `fill="${GOLD.mittel}"`) +
    pfad(`M0,${f(-H + ry)}A${R},${f(ry)} 0 0 0 ${R},${-H}L${f(Rb)},0A${f(Rb)},${f(ryb)} 0 0 1 0,${f(ryb)}Z`, `fill="${GOLD.schatten}"`) +
    pfad(`M${f(-R + 3 * k)},${f(-H + 5 * k)}L${f(-Rb + 3 * k)},${f(-2 * k)}`, `fill="none" stroke="${GOLD.licht}" stroke-width="2" stroke-linecap="round" opacity="0.9"`) +
    band + edelstein(0, -H * 0.5, 2.6 * k, 2.0 * k, stein) +
    pfad(korpus, `fill="none" ${KON_TOPF}`) +
    oval(0, -H, R, ry, `fill="${GOLD.licht}"`) +
    oval(0, -H, R - 2.4 * k, ry - 1.2 * k, `fill="${GOLD.schatten}"`) +
    oval(0, -H + 0.8 * k, R - 3.4 * k, ry - 1.7 * k, 'fill="#7a5238"') +
    oval(0, -H, R, ry, `fill="none" ${KON_TOPF}`);
}

// Goldene flache Bonsai-Schale (Oberkante bei -H)
const SCHALE_GOLD = { links: '#c19a35', rechts: '#a8792a', oben: '#e8c15a' };
const isoRel = (gx, gy, z) => { const [x, y] = iso(gx, gy, z); return [x - OX, y - OY]; };
function goldSchale(H) {
  const fuss = [[-0.13, -0.09], [0.13, -0.09], [-0.13, 0.09], [0.13, 0.09]]
    .map(([gx, gy]) => { const [x, y] = isoRel(gx, gy, 0); return oval(x, y + 1.5, 2.4, 1.5, 'fill="#a8792a" stroke="#6b4a3a" stroke-width="0.6"'); })
    .join('');
  const korpus = gruppe(`transform="translate(${-OX},${-OY})"`, kiste(-0.16, 0.16, -0.12, 0.12, 0, H, SCHALE_GOLD));
  const erde = poly([[-0.13, -0.09], [0.13, -0.09], [0.13, 0.09], [-0.13, 0.09]].map(([gx, gy]) => isoRel(gx, gy, H)),
    'fill="#6b4a3a" stroke="#4a3a2a" stroke-width="0.6" stroke-linejoin="round"');
  const edel = edelstein(...isoRel(0, 0.12, H / 2), 1.8, 1.4, '#3fb27f');
  return fuss + korpus + erde + edel;
}

// Kontur-Helfer fuer Stamm und Zweige (Holz, Schatten, Glanz)
function holzLinie(d, w, holz) {
  return pfad(d, `fill="none" stroke="#6b4a3a" stroke-width="${f(w + 1.4)}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${holz}" stroke-width="${w}" stroke-linecap="round"`) +
    gruppe('transform="translate(-1.2,0)"', pfad(d, 'fill="none" stroke="#e2b07c" stroke-width="1" stroke-linecap="round" opacity="0.8"'));
}

// ---------- Koenigin der Nacht ----------
// Triebe: [Richtung (-1 links, 1 rechts), Scheitelhoehe, Ueberhang]. Sie ranken sich am Holzstab und haengen bogig ab.
const KOEN = {
  1: { stab: 30, triebe: [[-1, 34, 18], [1, 30, 20]] },
  2: { stab: 42, triebe: [[-1, 44, 24], [1, 40, 26], [-1, 24, 14]] },
  3: { stab: 52, triebe: [[-1, 52, 28], [1, 48, 30], [-1, 34, 18], [1, 22, 12]] },
  4: { stab: 64, triebe: [[-1, 56, 30], [1, 54, 32], [-1, 40, 22], [1, 32, 20], [-1, 20, 11]] },
};
const KOEN_BLUETE = [6, -44];

function knospe(x, y, skal, welk) {
  const c = welk ? { a: '#b5a07a', d: '#8a7050', l: '#d8c49a' } : { a: '#8a4a32', d: '#5e2e20', l: '#b0664a' };
  const form = `M0,0C${f(3.2 * skal)},${f(1 * skal)} ${f(3.6 * skal)},${f(6 * skal)} 0,${f(12 * skal)}C${f(-3.6 * skal)},${f(6 * skal)} ${f(-3.2 * skal)},${f(1 * skal)} 0,0Z`;
  return an(x, y, 0,
    pfad(form, `fill="${c.a}" ${kontur(welk)}`) +
    pfad(`M${f(0.9 * skal)},${f(2 * skal)}Q${f(1.8 * skal)},${f(6 * skal)} ${f(0.4 * skal)},${f(10 * skal)}`, `fill="none" stroke="${c.l}" stroke-width="${f(1.1 * skal)}" stroke-linecap="round"`) +
    pfad(`M0,${f(1 * skal)}Q${f(-2 * skal)},${f(4 * skal)} ${f(-1.6 * skal)},${f(9 * skal)}`, `fill="none" stroke="${c.d}" stroke-width="0.6" stroke-linecap="round"`) +
    pfad(`M0,${f(1 * skal)}Q${f(1.4 * skal)},${f(3 * skal)} ${f(2.4 * skal)},${f(7 * skal)}`, `fill="none" stroke="${c.d}" stroke-width="0.5" stroke-linecap="round"`));
}

// Nachtbluete: zwei Kraenze schmaler weisser Blaetter, gelbliche Kelchblaetter aussen, dichte Staubgefaesse
function koenBluete(cx, cy) {
  const bluetenblatt = (L, W, fill, rand) =>
    pfad(`M0,0Q${f(W)},${f(-L * 0.5)} 0,${f(-L)}Q${f(-W)},${f(-L * 0.5)} 0,0Z`, `fill="${fill}" stroke="${rand}" stroke-width="0.5" stroke-linejoin="round"`);
  let out = '';
  for (let k = 0; k < 6; k++) out += an(cx, cy, 15 + k * 60, bluetenblatt(13, 2.8, '#e3d27a', '#8a7a2a'));
  for (let k = 0; k < 14; k++) out += an(cx, cy, k * 360 / 14, bluetenblatt(12, 2.6, '#fffdf2', '#d8d0a8'));
  for (let k = 0; k < 12; k++) out += an(cx, cy, 15 + k * 30, bluetenblatt(9, 2.2, '#ffffff', '#d8d0a8'));
  const r = zufall(91);
  for (let k = 0; k < 22; k++) {
    const a = r() * 2 * Math.PI, l = 2.6 + r() * 2.4;
    const x = cx + Math.cos(a) * l, y = cy + Math.sin(a) * l;
    out += linie([cx, cy], [x, y], 'stroke="#f0b400" stroke-width="0.5" stroke-linecap="round"') + kreis(x, y, 0.5, 'fill="#ffd23f"');
  }
  return out + kreis(cx, cy, 3.2, 'fill="#ffe066" stroke="#b8860b" stroke-width="0.4"');
}

function koenigin(s, welk, optionen) {
  const K = KOEN[s];
  const nacht = !welk && s === 4 && (optionen.tageszeit === 'nacht' || optionen.tageszeit === 'abend');
  const rand = welk ? '#8c8650' : '#2f5a30';
  const innen = welk ? '#c4c98f' : '#9ccc7a';
  let hinten = '', koerper = '';
  // Holzstab
  koerper += rechteck(-1.2, -K.stab, 2.4, K.stab, 1.1, `fill="${welk ? '#b9a36a' : '#c98f5a'}" ${KON_TOPF}`) +
    linie([-0.5, -K.stab + 2], [-0.5, -2], 'stroke="#e2b07c" stroke-width="0.7" stroke-linecap="round" opacity="0.8"');
  const triebe = K.triebe.map(([d, h0, reach0]) => {
    const h = welk ? h0 * 0.8 : h0, reach = welk ? reach0 * 0.7 : reach0;
    const s1 = [[d * 1.2, 0], [d * 1.6, -h * 0.5], [d * 2.6, -h * 0.85], [d * reach * 0.35, -h]];
    const s2 = [s1[3], [d * reach * 0.7, -h * 1.05], [d * reach * 1.05, -h * 0.75], [d * reach, -h * 0.4]];
    const D = `M${p2(s1[0])}C${p2(s1[1])} ${p2(s1[2])} ${p2(s1[3])}C${p2(s2[1])} ${p2(s2[2])} ${p2(s2[3])}`;
    return { d, s1, s2, D, ende: s2[3] };
  });
  for (const t of triebe) {
    koerper += pfad(t.D, `fill="none" stroke="${rand}" stroke-width="5.4" stroke-linecap="round"`) +
      pfad(t.D, `fill="none" stroke="${welk ? '#a8a36a' : '#477d43'}" stroke-width="4.2" stroke-linecap="round"`) +
      gruppe('transform="translate(-1.1,0)"', pfad(t.D, `fill="none" stroke="${rand}" stroke-width="0.5" opacity="0.7"`)) +
      gruppe('transform="translate(1.2,0)"', pfad(t.D, `fill="none" stroke="${rand}" stroke-width="0.5" opacity="0.7"`)) +
      gruppe('transform="translate(-0.8,0)"', pfad(t.D, `fill="none" stroke="${innen}" stroke-width="0.9" opacity="0.6"`));
    // Areolen (kleine Wollpolster) entlang der Rippen
    for (const u of [0.3, 0.55, 0.8]) {
      const [x, y] = bez(t.s1, u);
      koerper += oval(x, y, 0.9, 0.6, 'fill="#f7f0dc" stroke="#b9ad8f" stroke-width="0.3"');
    }
    for (const u of [0.35, 0.7]) {
      const [x, y] = bez(t.s2, u);
      koerper += oval(x, y, 0.9, 0.6, 'fill="#f7f0dc" stroke="#b9ad8f" stroke-width="0.3"');
    }
    // Luftwurzeln am Stab
    for (const u of [0.25, 0.5]) {
      const [x, y] = bez(t.s1, u);
      koerper += pfad(`M${f(x)},${f(y)}q${f(-t.d * 0.6)},2 ${f(-t.d * 1.8)},6`, `fill="none" stroke="${welk ? '#8c8650' : '#8a6a4a'}" stroke-width="0.8" stroke-linecap="round"`);
    }
  }
  const enden = triebe.map((t) => t.ende);
  if (nacht) {
    const [cx, cy] = KOEN_BLUETE;
    hinten += `<defs><radialGradient id="raritaet-koenigin-bluete"><stop offset="0" stop-color="#fffbe0" stop-opacity="0.95"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></radialGradient></defs>` +
      `<circle cx="${cx}" cy="${cy}" r="30" fill="url(#raritaet-koenigin-bluete)"><animate attributeName="r" values="26;34;26" dur="3s" repeatCount="indefinite"/></circle>`;
    koerper += koenBluete(cx, cy);
  } else if (s >= 3) {
    koerper += knospe(enden[0][0], enden[0][1], 1.2, welk);
    if (s === 4) koerper += knospe(enden[1][0], enden[1][1], 1.1, welk);
  }
  const funkel = [[-30, -54, 3, 0], [30, -40, 2.6, 0.6], [-24, -16, 2.2, 1.2], [26, -18, 2.6, 1.8], [4, -80, 3, 0.9], [-6, -30, 2.2, 2.2]];
  return { hinten, koerper, vorne: '', funkel };
}

// ---------- Jadewein ----------
const JADE = { mittel: '#4fd1c5', schatten: '#2fa89d', licht: '#a8f0e8' };
const JADE_WELK = { mittel: '#c9b07a', schatten: '#a8875a', licht: '#e6d8a8' };
// Blattbueschel am Holzbogen: [Seite (-1 links, 1 rechts), Position auf dem Bogen 0..1]
const JADE_BUESCHEL = {
  1: [[-1, 0.45], [1, 0.5]],
  2: [[-1, 0.4], [1, 0.5], [-1, 0.8]],
  3: [[-1, 0.35], [1, 0.4], [-1, 0.7], [1, 0.82]],
  4: [[-1, 0.3], [1, 0.35], [-1, 0.6], [1, 0.7], [-1, 0.9]],
};
const JADE_BOGEN_L = [[-9, 0], [-17, -14], [-13, -34], [0, -38]];
const JADE_BOGEN_R = [[9, 0], [17, -14], [13, -34], [0, -38]];

// Traube: Start, Ende, Kruemmung, Anzahl Bluetenklauen
function jadeTraube(sx, sy, ex, ey, bend, n, welk) {
  const c = welk ? JADE_WELK : JADE;
  const A = [sx, sy], B = [ex, ey], C = [(sx + ex) / 2 + bend, (sy + ey) / 2];
  let out = pfad(`M${p2(A)}Q${p2(C)} ${p2(B)}`, `fill="none" stroke="${welk ? '#8c8650' : '#3a6b3a'}" stroke-width="1" stroke-linecap="round"`);
  for (let k = 0; k < n; k++) {
    const t = 0.15 + 0.85 * (k + 0.5) / n;
    const [x, y] = qb(A, C, B, t);
    const seite = k % 2 ? 1 : -1;
    out += an(x + seite * 1.4, y, seite * 30,
      pfad('M0,0C2.2,-0.6 3.4,1 2.8,3.2C2.2,1.8 1.2,1.4 0,0Z', `fill="${c.mittel}" stroke="${c.schatten}" stroke-width="0.4" stroke-linejoin="round"`) +
      pfad('M0.4,0.4C1.4,0.2 2,1.2 1.8,2.2', `fill="none" stroke="${c.licht}" stroke-width="0.5" stroke-linecap="round"`));
  }
  return out;
}

function jadewein(s, welk) {
  const holz = welk ? '#c9b07a' : '#c98f5a';
  const bogen = 'M-9,0C-17,-14 -13,-34 0,-38C13,-34 17,-14 9,0';
  let koerper = holzLinie(bogen, 3, holz);
  // Dreizaehlige Blaetter an beiden Seiten des Bogens
  const Lb = 7 + 1.6 * s;
  JADE_BUESCHEL[s].forEach(([seite, t], i) => {
    const P = seite < 0 ? JADE_BOGEN_L : JADE_BOGEN_R;
    const [x, y] = bez(P, t);
    const blaetter = [-36, 0, 36].map((a, k) =>
      an(0, 0, a, blatt(ovalKante(Lb, 0.45 * Lb, true), { L: Lb, W: 0.45 * Lb, ...(welk ? WELK : GRUEN[(i + k) % 2]) }))).join('');
    koerper += an(x, y, seite * 55, blaetter);
  });
  if (s === 3) {
    koerper += jadeTraube(2, -36, 4, -18, 1.5, 8, welk);
  } else if (s === 4) {
    koerper += jadeTraube(-6, -36, -15, -10, -2, 12, welk) +
      jadeTraube(0, -38, 1, -6, 0, 12, welk) +
      jadeTraube(6, -36, 16, -12, 2, 12, welk);
  }
  const funkel = [[-30, -60, 3, 0], [30, -52, 2.6, 0.5], [-24, -30, 2.2, 1.1], [26, -34, 2.4, 1.6], [2, -70, 3, 0.9]];
  return { hinten: '', koerper, vorne: '', funkel };
}

// ---------- Monstera Thai Constellation (Monstera-Blatt mit Sternenhimmel-Flecken) ----------
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
  return { rechts, links, ganz: `M0,0${rechts}${links}Z`, halbRechts: `M0,0${rechts}L0,0Z`, halbLinks: `M0,0L0,${f(-L)}${links}Z` };
}

// Halbe Blattbreite auf Hoehe y
function monsteraBreite(L, y) {
  const pts = [];
  for (const seg of monsteraRechts(L)) for (let i = 0; i <= 30; i++) pts.push(bez(seg, i / 30));
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (y0 !== y1 && (y0 - y) * (y1 - y) <= 0) return x0 + (x1 - x0) * (y - y0) / (y1 - y0);
  }
  return 0;
}

// Keilfoermiger Einschnitt (sd = +1 rechts, -1 links)
function monsteraSchlitz(L, y, sd) {
  const wE = monsteraBreite(L, y);
  const xI = 0.35 * wE, yI = y - 0.1 * L;
  const xo = wE + 0.12 * L, hb = 0.05 * L;
  const at = (x, yy) => [sd * x, yy];
  const t = (wE - xI) / (xo - xI);
  return {
    keil: [at(xI, yI), at(xo, y + hb), at(xo, y - hb)],
    kante: [at(wE, yI + t * (y + hb - yI)), at(xI, yI), at(wE, yI + t * (y - hb - yI))],
  };
}

const THAI_GRUEN = { links: '#5e9a52', rechts: '#477d43', mittel: '#9ccc7a', glanz: '#9ccc7a' };
const THAI_WELK = { links: '#c4c98f', rechts: '#a8a36a', mittel: '#e4e3b4', glanz: '#f0efcc' };

// Sternenhimmel: cremefarbene Sprenkel und Sternchen, deterministisch verteilt (innerhalb der Blattmaske)
function thaiFlecken(L, seed, welk) {
  const r = zufall(seed);
  const farbe = welk ? '#e4e3b4' : '#f3ecd2';
  let out = '';
  const n = Math.round(L * 1.1);
  for (let k = 0; k < n; k++) {
    const y = -(0.1 + 0.78 * r()) * L;
    const x = (2 * r() - 1) * monsteraBreite(L, y) * 0.85;
    if (r() < 0.3) out += vierstern(x, y, 0.8 + 0.5 * r(), `fill="${farbe}"`);
    else out += kreis(x, y, 0.3 + 0.3 * r(), `fill="${farbe}"`);
  }
  return out;
}

// Monsterablatt: Ansatz bei (0,0), Winkel dreht um den Ansatz. Schlitze und Loecher ueber eine <mask>.
function thaiBlatt(L, winkel, schlitze, loecher, welk, seed) {
  const T = welk ? THAI_WELK : THAI_GRUEN;
  const kon = kontur(welk);
  const U = monsteraUmriss(L);
  const id = `thai${Math.round(L)}s${schlitze}h${loecher}`;
  const ys = schlitze === 0 ? [] : Array.from({ length: schlitze }, (_, k) =>
    (schlitze === 1 ? -0.5 : -(0.15 + 0.7 * k / (schlitze - 1))) * L);
  let maske = pfad(U.ganz, 'fill="#fff" stroke="#fff" stroke-width="1.5"');
  let kanten = '';
  for (const y of ys) {
    for (const sd of [1, -1]) {
      const k = monsteraSchlitz(L, y, sd);
      maske += poly(k.keil, 'fill="#000"');
      kanten += pfad(`M${sp(k.kante[0])}L${sp(k.kante[1])}L${sp(k.kante[2])}`, `fill="none" ${kon}`);
    }
  }
  const lochPos = [];
  for (let j = 0; j < loecher; j++) {
    const y = -(0.27 + 0.2 * j) * L;
    const x = (j % 2 ? -1 : 1) * 0.17 * monsteraBreite(L, y);
    lochPos.push([x, y]);
    maske += oval(x, y, 0.05 * L, 0.03 * L, 'fill="#000"');
  }
  const nAd = L > 20 ? 4 : 3;
  let adern = '';
  for (let k = 0; k < nAd; k++) {
    const yk = -(0.28 + 0.42 * k / (nAd - 1)) * L;
    for (const sd of [1, -1]) {
      const w1 = monsteraBreite(L, yk), w2 = monsteraBreite(L, yk - 0.2 * L);
      adern += pfad(`M0,${f(yk)}Q${f(sd * w1 * 0.5)},${f(yk - 0.03 * L)} ${f(sd * w2 * 0.9)},${f(yk - 0.2 * L)}`, `fill="none" ${ADER}`);
    }
  }
  const innen = pfad(U.halbRechts, `fill="${T.rechts}"`) +
    pfad(U.halbLinks, `fill="${T.links}"`) +
    adern +
    linie([0, 0], [0, -0.9 * L], `stroke="${T.mittel}" stroke-width="1" stroke-linecap="round"`) +
    linie([-0.22 * L, -0.25 * L], [-0.3 * L, -0.5 * L], `stroke="${T.glanz}" stroke-width="1.2" stroke-linecap="round" opacity="0.5"`) +
    thaiFlecken(L, seed, welk);
  const lochKontur = lochPos.map(([x, y]) => oval(x, y, 0.05 * L, 0.03 * L, `fill="none" ${kon}`)).join('');
  return gruppe(`transform="rotate(${f(winkel)})"`,
    `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${f(-1.5 * L)}" y="${f(-1.5 * L)}" width="${f(3 * L)}" height="${f(3 * L)}">${maske}</mask></defs>` +
    `<g mask="url(#${id})">${innen}${pfad(U.ganz, `fill="none" ${kon}`)}</g>` + kanten + lochKontur);
}

// Thai-Stufen: [Winkel, Stiellaenge, Blattlaenge, Schlitze je Seite, Loecher] wie bei der Monstera
const THAI = {
  1: [[-35, 15, 14, 0, 0], [30, 16, 14, 0, 0]],
  2: [[-45, 17, 18, 0, 0], [0, 19, 18, 2, 0], [42, 17, 18, 0, 0]],
  3: [[-55, 19, 22, 1, 0], [-18, 21, 22, 2, 1], [20, 21, 22, 3, 2], [52, 19, 22, 3, 2]],
  4: [[-60, 22, 26, 1, 0], [-30, 24, 26, 2, 1], [0, 25, 26, 3, 2], [30, 24, 26, 4, 3], [60, 22, 26, 4, 3]],
};

// Moosstab mit Sprossen (braun-gruen)
function mossStab(h, welk) {
  const holz = welk ? '#9c9466' : '#8a7f4e';
  const moos = welk ? '#a8a36a' : '#5e9a52';
  let out = rechteck(-1.25, -h, 2.5, h, 1.2, `fill="${holz}" ${KON_TOPF}`);
  for (let k = 0; k * 6.5 < h - 4; k++) out += oval(k % 2 ? -0.6 : 0.6, -4 - k * 6.5, 2.2, 1.3, `fill="${moos}" stroke="#3a6b3a" stroke-width="0.5"`);
  return out;
}

const welkWinkel = (a0) => (a0 < 0 ? -120 : 120) + a0 * 0.2;

function thai(s, welk) {
  const tab = THAI[s].map(([a0, S, L, schlitze, loecher]) => ({ a0, S, L, schlitze, loecher }));
  let stiele = '';
  const ansatz = tab.map((b) => {
    const ex = b.S * Math.sin(b.a0 * RAD) * (welk ? 0.8 : 1);
    const ey = -b.S * Math.cos(b.a0 * RAD) * (welk ? 0.7 : 1);
    stiele += pfad(`M0,0Q${f(ex * 0.1)},${f(ey * 0.75)} ${f(ex)},${f(ey)}`,
      `fill="none" stroke="${welk ? '#a8a36a' : '#5e9a52'}" stroke-width="2" stroke-linecap="round"`);
    return [ex, ey];
  });
  // Hintere (weit aussen) zuerst, die mittleren Blaetter liegen oben
  const reihe = tab.map((b, i) => ({ b, i })).sort((p, q) => Math.abs(q.b.a0) - Math.abs(p.b.a0) || p.i - q.i);
  let blaetter = '';
  for (const { b, i } of reihe) {
    const [ex, ey] = ansatz[i];
    const winkel = welk ? welkWinkel(b.a0) : b.a0;
    blaetter += an(ex, ey, 0, thaiBlatt(b.L, winkel, b.schlitze, b.loecher, welk, 13 * b.L + 7 * i));
  }
  return (s === 4 ? mossStab(62, welk) : '') + stiele + blaetter;
}

// ---------- Pink Princess ----------
const PINK_STUFE = {
  1: [[-30, 13, 13], [24, 14, 14]],
  2: [[-38, 17, 16], [0, 20, 18], [36, 16, 15]],
  3: [[-50, 20, 18], [-18, 23, 20], [18, 23, 20], [50, 20, 18]],
  4: [[-58, 22, 19], [-30, 26, 21], [0, 28, 23], [30, 26, 21], [58, 22, 19]],
};

// Herzfoermiges, spitzes Blatt. Jedes dritte Blatt ist halb rosa, die uebrigen tragen rosa Panaschierung.
function pinkBlatt(L, i, welk) {
  const R = herzKante(L, 0.72 * L, true);
  const ganz = p2pfad(R.concat(R.slice().reverse().map(([x, y]) => [-x, y])));
  const halb = i % 3 === 2;
  const o = welk
    ? { ...WELK, L, W: 0.72 * L }
    : { hell: '#3b4a2f', dunkel: halb ? '#f39ac0' : '#5a2b3a', L, W: 0.72 * L, welk: false };
  let out = blatt(R, o);
  if (!welk && !halb) {
    const id = `pink${Math.round(L * 10)}`;
    const r = zufall(17 + i * 5 + Math.round(L));
    let flecken = '';
    for (let k = 0; k < 3; k++) {
      const x = (r() < 0.5 ? -1 : 1) * (0.1 + 0.25 * r()) * L;
      const y = -(0.3 + 0.5 * r()) * L;
      const rr = (0.18 + 0.12 * r()) * L;
      flecken += oval(x, y, rr, rr * 0.8, 'fill="#f39ac0"') + oval(x + rr * 0.15, y, rr * 0.55, rr * 0.45, 'fill="#e86fa5"');
    }
    out += `<defs><clipPath id="${id}"><path d="${ganz}"/></clipPath></defs>` +
      gruppe(`clip-path="url(#${id})"`, flecken) +
      pfad(ganz, `fill="none" ${kontur(false)}`);
  }
  return out;
}

function pink(s, welk) {
  const tab = PINK_STUFE[s];
  let stiele = '', blaetter = '';
  tab.forEach(([a0, S, L], i) => {
    const a = welk ? a0 * 1.25 : a0;
    const ex = S * Math.sin(a * RAD);
    const ey = -S * Math.cos(a * RAD) * (welk ? 0.6 : 1);
    stiele += stiel(`M0,0Q${f(ex * 0.1)},${f(ey * 0.7)} ${f(ex)},${f(ey)}`,
      welk ? '#7d6a45' : '#6b2f45', welk ? '#a8a36a' : '#a84a68', welk ? '#c4c98f' : '#d88aa0', 1.8);
    const rot = welk ? (a0 < 0 ? -150 : 150) : a * 0.8;
    blaetter += an(ex, ey, rot, pinkBlatt(L, i, welk));
  });
  return (s === 4 ? mossStab(26, welk) : '') + stiele + blaetter;
}

// ---------- Drachenbaum ----------
// Aeste: [Winkel zur Senkrechten (Grad), Laenge]. Je Stufe mehr Aeste.
const DRACHE = {
  1: [[-36, 24], [34, 22]],
  2: [[-44, 28], [42, 27]],
  3: [[-52, 30], [-4, 36], [50, 30]],
  4: [[-58, 32], [-22, 36], [14, 38], [56, 33]],
};

function harztropfen(x, y) {
  return pfad(`M${f(x)},${f(y - 3)}C${f(x + 1.8)},${f(y - 0.6)} ${f(x + 1.6)},${f(y + 1.6)} ${f(x)},${f(y + 1.6)}C${f(x - 1.6)},${f(y + 1.6)} ${f(x - 1.8)},${f(y - 0.6)} ${f(x)},${f(y - 3)}Z`,
    'fill="#b3122e" stroke="#6b0a1a" stroke-width="0.5" stroke-linejoin="round"') +
    kreis(x - 0.5, y - 0.6, 0.5, 'fill="#ffd0d8"');
}

function drache(s, welk) {
  const holz = welk ? '#c4bf9e' : '#a9a79a';
  const ast = (d, w) => pfad(d, `fill="none" stroke="#5e5c52" stroke-width="${f(w + 1.4)}" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${holz}" stroke-width="${w}" stroke-linecap="round"`) +
    gruppe('transform="translate(1.2,0)"', pfad(d, 'fill="none" stroke="#7d7b70" stroke-width="0.9" stroke-linecap="round" opacity="0.8"')) +
    gruppe('transform="translate(-1,0)"', pfad(d, 'fill="none" stroke="#d6d4c6" stroke-width="0.9" stroke-linecap="round"'));
  const gabel = -30;
  let koerper = ast('M0.5,0Q-0.8,-14 0,-30', 6);
  for (const u of [-6, -12, -18, -24]) koerper += linie([-2.4, u], [2.4, u + 0.5], 'stroke="#7d7b70" stroke-width="0.5" stroke-linecap="round"');
  koerper += kreis(0, gabel, 3.2, `fill="${holz}"`);
  const aeste = DRACHE[s];
  const tips = [];
  for (const [winkel, len] of aeste) {
    const a = winkel * RAD;
    const tx = len * Math.sin(a) * 0.9, ty = gabel - len * Math.cos(a);
    tips.push([tx, ty, winkel]);
    koerper += ast(`M0,${gabel}Q0,${f(gabel + (ty - gabel) * 0.8)} ${f(tx)},${f(ty)}`, 4);
  }
  // Schopf steifer, schwertfoermiger Blaetter an jeder Astspitze
  for (const [tx, ty, winkel] of tips) {
    const richt = winkel;
    for (let k = 0; k < 9; k++) {
      const Lk = 17 + ((k * 5) % 4) * 1.6 + s * 0.6;
      const ang = richt + (k / 8 - 0.5) * 150;
      koerper += an(tx, ty, ang, blatt(ovalKante(Lk, 2.4, false), { L: Lk, W: 2.4, ...(welk ? WELK : { hell: '#8fbfa6', dunkel: '#6f9e8a', welk: false }) }));
    }
  }
  // Drachenblut: rote Harztropfen am Stamm
  const tropfen = [[-2.2, -8], [2.0, -14], [-1.8, -20]];
  koerper += tropfen.slice(0, s <= 2 ? 2 : 3).map(([x, y]) => harztropfen(x, y)).join('');
  const funkel = [[-40, -70, 3, 0], [40, -62, 2.6, 0.5], [-20, -50, 2.2, 1.2], [24, -38, 2.6, 1.8], [0, -80, 3, 0.9]];
  return { hinten: '', koerper, vorne: '', funkel };
}

// ---------- Goldener Ginkgo-Bonsai ----------
const GINK = { mittel: '#f2c94c', schatten: '#e0a92a', licht: '#ffe58a', rand: '#8a6a1a' };
const GINK_WELK = { mittel: '#c9b07a', schatten: '#a8875a', licht: '#e6d8a8', rand: '#7d6a45' };
// Stufen: h Stammhoehe, pols [x, y, rx, ry] je Laubpolster, L Blattlaenge, n Blaetter je Polster
const GINKGO = {
  1: { h: 16, pols: [[-6, -12, 6, 3.6], [5, -15, 5.6, 3.4]], L: 6.2, n: 6 },
  2: { h: 20, pols: [[-7, -13, 7, 4], [6, -18, 6.6, 3.8], [0, -24, 5.4, 3.2]], L: 6.8, n: 8 },
  3: { h: 24, pols: [[-8, -14, 8.2, 4.6], [7, -20, 7.8, 4.4], [-2, -26, 7, 4]], L: 7.2, n: 10 },
  4: { h: 28, pols: [[-9, -14, 9, 5], [8, -21, 8.6, 4.8], [-3, -27, 8, 4.4], [5, -33, 6.4, 3.8]], L: 7.6, n: 12 },
};

// Faecherblatt des Ginkgo: Grund (0,0), Spitze am Fanrand, Einkerbung in der Mitte
function faecher(L, welk) {
  const c = welk ? GINK_WELK : GINK;
  const W = L * 0.85;
  const umriss = `M0,0C${f(-W)},${f(-L * 0.2)} ${f(-W * 1.05)},${f(-L * 0.85)} ${f(-W * 0.3)},${f(-L)}Q0,${f(-L * 0.8)} ${f(W * 0.3)},${f(-L)}C${f(W * 1.05)},${f(-L * 0.85)} ${f(W)},${f(-L * 0.2)} 0,0Z`;
  const schatten = `M0,0C${f(W)},${f(-L * 0.2)} ${f(W * 1.05)},${f(-L * 0.85)} ${f(W * 0.3)},${f(-L)}L0,${f(-L * 0.8)}Z`;
  return pfad(umriss, `fill="${c.mittel}" stroke="${c.rand}" stroke-width="0.6" stroke-linejoin="round"`) +
    pfad(schatten, `fill="${c.schatten}"`) +
    linie([0, 0], [0, -L * 0.85], `stroke="${c.licht}" stroke-width="0.4" stroke-linecap="round"`) +
    linie([0, 0], [-W * 0.45, -L * 0.9], `stroke="${c.licht}" stroke-width="0.35" stroke-linecap="round" opacity="0.7"`) +
    linie([0, 0], [W * 0.45, -L * 0.9], `stroke="${c.licht}" stroke-width="0.35" stroke-linecap="round" opacity="0.7"`);
}

function ginkgo(s, welk) {
  const G = GINKGO[s];
  const r = zufall(300 + s);
  const holz = welk ? '#c9b07a' : '#c98f5a';
  const h = G.h;
  const d = `M0,2C-6,${f(-h * 0.13)} 5,${f(-h * 0.3)} 0,${f(-h * 0.5)}C-5,${f(-h * 0.7)} 4,${f(-h * 0.83)} 1,${f(-h)}`;
  let koerper = holzLinie(d, 4.2, holz);
  G.pols.forEach(([cx, cy, rx, ry], j) => {
    koerper += linie([0, cy + ry * 0.4], [cx * 0.6, cy + ry * 0.5], 'stroke="#6b4a3a" stroke-width="1.4" stroke-linecap="round"') +
      oval(cx, cy + ry * 0.6, rx * 0.95, ry * 0.8, `fill="${welk ? '#a8875a' : '#b8862a'}" opacity="0.35"`);
    const bl = [];
    for (let k = 0; k < G.n; k++) {
      const phi = r() * 2 * Math.PI, rho = Math.sqrt(r()) * 0.9;
      bl.push({ x: cx + rx * rho * Math.cos(phi), y: cy + ry * rho * Math.sin(phi), rot: (r() - 0.5) * 140, k });
    }
    bl.sort((p, q) => p.y - q.y);
    for (const b of bl) koerper += an(b.x, b.y, b.rot, faecher(G.L, welk));
  });
  // Stufe 4: einzelne Blaetter fallen langsam herab (Translation und Drehung in verschachtelten Gruppen)
  let vorne = '';
  if (s === 4 && !welk) {
    const fallend = [[-22, -30, -14, 6, 0], [18, -34, 26, 4, 2], [-6, -40, 4, 8, 3.5], [10, -26, 16, 6, 1.2]];
    for (const [x0, y0, x1, y1, b] of fallend) {
      vorne += `<g><animateTransform attributeName="transform" type="translate" values="${x0} ${y0};${x1} ${y1}" dur="6s" begin="${b}s" repeatCount="indefinite"/>` +
        `<g><animateTransform attributeName="transform" type="rotate" values="-25;25;-25" dur="6s" begin="${b}s" repeatCount="indefinite"/>${faecher(4.2, false)}</g></g>`;
    }
  }
  const funkel = [[-18, -38, 2.6, 0], [18, -40, 2.2, 0.7], [-10, -28, 2, 1.3], [12, -22, 2.4, 1.9], [0, -46, 2.6, 0.9]];
  return { hinten: '', koerper, vorne, funkel };
}

// Teile-Schnittstelle fuer die Typen, die nur einen SVG-Inhalt liefern
const thaiTeile = (s, welk) => ({
  hinten: '', vorne: '', koerper: thai(s, welk),
  funkel: [[-34, -62, 3, 0], [32, -56, 2.8, 0.4], [-30, -30, 2.2, 1.0], [34, -26, 2.6, 1.5], [0, -84, 3, 0.8], [-2, -46, 2, 1.9]],
});
const pinkTeile = (s, welk) => ({
  hinten: '', vorne: '', koerper: pink(s, welk),
  funkel: [[-16, -30, 2.4, 0], [15, -24, 2.2, 0.6], [-12, -12, 1.8, 1.2], [13, -8, 2, 1.8], [0, -40, 2.4, 0.9]],
});

// ---------- Registrierung ----------
// R, H: Topfradius und -hoehe; stein: Edelsteinfarbe; schein: [x, y, r] des weichen Scheins (Plansicht der Pflanze);
// schale: flache Schale statt Topf; teile(stufe, welk, optionen) liefert Teile der Pflanze.
const TYP = {
  koenigin_der_nacht: { R: 14, H: 20, stein: '#9b6bd9', schein: [0, -44, 44], teile: koenigin },
  jadewein: { R: 14, H: 20, stein: '#3fc1a9', schein: [0, -30, 40], teile: jadewein },
  thai_constellation: { R: 14, H: 20, stein: '#5fb8e8', schein: [0, -40, 46], teile: thaiTeile },
  pink_princess: { R: 10, H: 16, stein: '#f39ac0', schein: [0, -18, 26], teile: pinkTeile },
  drachenbaum: { R: 14, H: 20, stein: '#b3122e', schein: [0, -44, 50], teile: drache },
  gold_ginkgo: { R: 12, H: 5, stein: '#3fb27f', schein: [0, -18, 30], schale: true, teile: ginkgo },
};

function zeichneRaritaet(typ, stufe, welk, ebene, optionen) {
  const T = TYP[typ];
  const s = Math.min(4, Math.max(1, Math.round(Number(stufe) || 1)));
  const t = T.teile(s, !!welk, optionen || {});
  const H = T.H;
  const topf = T.schale ? goldSchale(H) : goldTopf(T.R, H, T.stein);
  let out = '';
  // weicher goldener Schein hinter der Pflanze (nicht bei welk)
  if (!welk) {
    const [cx, cy, r] = T.schein;
    out += gruppe(`transform="translate(0,${-H})"`,
      `<defs><radialGradient id="raritaet-${typ}-schein"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient></defs>` +
      kreis(cx, cy, r, `fill="url(#raritaet-${typ}-schein)" opacity="0.25"`));
  }
  out += kontakt(T.R, H, T.schale) + topf +
    gruppe(`transform="translate(0,${-H}) rotate(${welk ? 8 : 0})"`,
      t.hinten + t.koerper + t.vorne + (welk ? '' : funkeln(t.funkel))) +
    (welk ? fallLaub(ebene) : '');
  return out;
}

// Einfarbig: alle Farben und Deckkraefte auf eine Farbe, Masken (Blattschlitze) bleiben unveraendert
function einfarbig(svg) {
  return svg.split(/(<mask[\s\S]*?<\/mask>)/).map((teil, i) => (i % 2 ? teil : teil
    .replace(/ fill="(?!none)[^"]*"/g, ` fill="${SILH}"`)
    .replace(/ stroke="(?!none)[^"]*"/g, ` stroke="${SILH}"`)
    .replace(/ opacity="[^"]*"/g, ''))).join('');
}

export function silhouette(typ) {
  const T = TYP[typ];
  if (!T) return '';
  const t = T.teile(4, false, { tageszeit: 'tag' });
  const topf = T.schale ? goldSchale(T.H) : goldTopf(T.R, T.H, T.stein);
  return gruppe('opacity="0.25"', einfarbig(topf + gruppe(`transform="translate(0,${-T.H})"`, t.koerper)));
}

export const RARITAETEN = {
  koenigin_der_nacht: {
    name: 'Königin der Nacht', groesse: 'gross', bedingung: '30-Tage-Serie',
    zeichne: (stufe, welk = false, ebene = 'boden', optionen = {}) => zeichneRaritaet('koenigin_der_nacht', stufe, welk, ebene, optionen),
  },
  jadewein: {
    name: 'Jadewein', groesse: 'gross', bedingung: 'Erstes Sparziel komplett erreicht',
    zeichne: (stufe, welk = false, ebene = 'boden', optionen = {}) => zeichneRaritaet('jadewein', stufe, welk, ebene, optionen),
  },
  thai_constellation: {
    name: 'Monstera „Thai Constellation“', groesse: 'gross', bedingung: '3 Zeiträume in Folge im Budget',
    zeichne: (stufe, welk = false, ebene = 'boden', optionen = {}) => zeichneRaritaet('thai_constellation', stufe, welk, ebene, optionen),
  },
  pink_princess: {
    name: 'Pink Princess Philodendron', groesse: 'klein', bedingung: '4 Wochen in Folge alle Challenges',
    zeichne: (stufe, welk = false, ebene = 'boden', optionen = {}) => zeichneRaritaet('pink_princess', stufe, welk, ebene, optionen),
  },
  drachenbaum: {
    name: 'Drachenbaum', groesse: 'gross', bedingung: 'Insgesamt 1.000 € angespart',
    zeichne: (stufe, welk = false, ebene = 'boden', optionen = {}) => zeichneRaritaet('drachenbaum', stufe, welk, ebene, optionen),
  },
  gold_ginkgo: {
    name: 'Goldener Ginkgo-Bonsai', groesse: 'klein', bedingung: 'Level 15',
    zeichne: (stufe, welk = false, ebene = 'boden', optionen = {}) => zeichneRaritaet('gold_ginkgo', stufe, welk, ebene, optionen),
  },
};
