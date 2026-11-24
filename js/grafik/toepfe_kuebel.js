// Kuebel (grosse Toepfe fuer grosse Pflanzen, SPEC-5 Abschnitt 1). Jeder Eintrag: zeichne(R, H) liefert SVG mit
// Ursprung (0,0) = Mitte der Standflaeche. Oberer Rand: Ellipse bei y = -H mit Radius R und ry = 0.4 R, dort wird die
// Pflanze eingesetzt. Geometrie wie topf(R, H) in pflanzen.js. Verlaufs- und Clip-Ids tragen einen Zaehler.

import { f, pfad, oval, linie, zufall } from './hilfen.js';

const KON = 'stroke="#6b4a3a" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"';
const ERDE = '#7a5238';
const KRUEMEL = '#d6b08a';
const INNENRAND = '#5c3d2c';

let zaehler = 0;
const neueId = (name) => `kb${++zaehler}-${name}`;

const P = (x, y) => `${f(x)},${f(y)}`;
const zug = (pts) => 'M' + pts.map(([x, y]) => P(x, y)).join('L');

// Profile: Radius r(t) fuer t von 0 (Standflaeche) bis 1 (oberer Rand, immer R).
const linear = (R, rb) => (t) => rb + (R - rb) * t;
const bauchig = (R, rmax, rb, pk) => (t) => t <= pk
  ? rb + (rmax - rb) * Math.sin((Math.PI / 2) * t / pk)
  : rmax + (R - rmax) * Math.pow((t - pk) / (1 - pk), 1.5);
// Unebene Kontur: Ausschlag in der Mitte, oben und unten bleibt der Radius exakt
const unebel = (basis) => (t) => basis(t) *
  (1 + Math.sin(Math.PI * t) * (0.045 * Math.sin(t * 23.1) + 0.03 * Math.sin(t * 9.7 + 1.3)));

// Koerper als geschlossener Pfad: links von oben nach unten, vorderer Bogen unten, rechts nach oben,
// vorderer Bogen oben. Form wie topf(R, H); unten = y der Standflaeche (negativ bei angehobenem Koerper).
function korpus(R, H, prof, unten) {
  const N = 18, ry = R * 0.4, rb = prof(0), ryb = rb * 0.4;
  const y = (t) => unten - t * (H + unten);
  const rechts = [];
  for (let i = 0; i <= N; i++) rechts.push([prof(i / N), y(i / N)]);
  const links = rechts.map(([x, yy]) => [-x, yy]).reverse();
  return zug(links) +
    `A${f(rb)},${f(ryb)} 0 0 0 ${P(rb, unten)}` +
    zug(rechts.slice(1)).replace(/^M/, 'L') +
    `A${f(R)},${f(ry)} 0 0 1 ${P(-R, -H)}Z`;
}

// Krumen in der Erde (wie topf)
function krumen(R, H) {
  const k = R / 14;
  return [[-6, 1.5, 1.1, 0.6], [-2, 2.6, 0.9, 0.5], [3, 0.8, 1, 0.55], [6, 2.2, 0.8, 0.45], [1, -1.2, 0.7, 0.4]]
    .map(([x, y, rx, rr]) => oval(x * k, -H + y * k, rx * k, rr * k, `fill="${KRUEMEL}"`))
    .join('');
}

// Gesamtaufbau eines Kuebels: Schatten, Hinteres, Koerper mit Verlauf, Schatten rechts, Details (im Koerper
// beschnitten), Kontur, Glanzkante, oberer Rand, Erde.
function bau(R, H, o) {
  const unten = o.unten || 0;
  const prof = o.prof;
  const rb = prof(0), ry = R * 0.4;
  const y = (t) => unten - t * (H + unten);
  const c = { R, H, prof, y, unten, rb };
  const body = korpus(R, H, prof, unten);
  const id = neueId('k');
  const [hell, mitte, dunkel] = o.farben;
  const glanz = [];
  for (let i = 2; i <= 13; i++) glanz.push([-prof(i / 16) * 0.8, y(i / 16)]);
  const hinten = o.hinten ? o.hinten(c) : '';
  const details = o.details ? o.details(c) : '';
  const r = o.rand || {};
  return `<defs>` +
    `<linearGradient id="${id}-v" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${hell}"/>` +
    `<stop offset="0.55" stop-color="${mitte}"/><stop offset="1" stop-color="${dunkel}"/></linearGradient>` +
    `<clipPath id="${id}-c"><path d="${body}"/></clipPath></defs>` +
    oval(1, 0, rb + 2.5, rb * 0.4 + 1.5, 'fill="#6b4a3a" opacity="0.18"') +
    hinten +
    pfad(body, `fill="url(#${id}-v)"`) +
    `<g clip-path="url(#${id}-c)">` +
    `<rect x="0" y="${f(-H - ry - 2)}" width="${f(R + 4)}" height="${f(H + ry + 14)}" fill="#4a2f20" opacity="0.2"/>` +
    details +
    `</g>` +
    pfad(body, `fill="none" ${KON}`) +
    pfad(zug(glanz), `fill="none" stroke="${o.glanzFarbe || '#fff6ea'}" stroke-width="${o.glanzBreite || 2}" ` +
      `stroke-linecap="round" opacity="0.6"`) +
    oval(0, -H, R, ry, `fill="${r.licht || '#eba47f'}" ${KON}`) +
    oval(0, -H, R - 2.4, ry - 1.2, `fill="${r.innen || INNENRAND}"`) +
    oval(0, -H + 0.8, R - 3.4, ry - 1.7, `fill="${ERDE}"`) +
    krumen(R, H);
}

// Henkel als Bogen seitlich am Koerper (sx = -1 links, 1 rechts), von Hoehe t1 nach Hoehe t2
function henkel(c, sx, t1, t2, dx, farbe, w = 2.6) {
  return pfad(`M${P(sx * c.prof(t1), c.y(t1))}C${P(sx * (c.R + dx), c.y(t1) - 2)} ${P(sx * (c.R + dx), c.y(t2) + 2)} ` +
    `${P(sx * c.prof(t2), c.y(t2))}`,
  `fill="none" stroke="${farbe}" stroke-width="${w}" stroke-linecap="round"`);
}

// Horizontaler Ring (Reifen, Rille, Naht) als vorderer Bogen auf Hoehe t
function band(c, t, farbe, w = 0.9, op = 0.8) {
  const r = c.prof(t), yy = c.y(t);
  return pfad(`M${P(-r, yy)}A${f(r)},${f(r * 0.4)} 0 0 0 ${P(r, yy)}`,
    `fill="none" stroke="${farbe}" stroke-width="${w}" opacity="${op}"`);
}

// Verstreute Flecken (Verwitterung, Poren) mit festem Seed
function flecken(c, seed, farben, n) {
  const rnd = zufall(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const t = 0.08 + 0.84 * rnd();
    const x = (2 * rnd() - 1) * c.prof(t) * 0.85;
    const rx = 1 + 2.4 * rnd();
    s += oval(x, c.y(t), rx, rx * 0.5, `fill="${farben[i % farben.length]}" opacity="${(0.25 + 0.3 * rnd()).toFixed(2)}"`);
  }
  return s;
}

// Schmaler Glanzstreifen links, Anteil am Radius und Breite frei waehlbar
function glanzStreifen(c, anteil, w, op) {
  const pts = [];
  for (let i = 3; i <= 14; i++) pts.push([-c.prof(i / 16) * anteil, c.y(i / 16)]);
  return pfad(zug(pts), `fill="none" stroke="#ffffff" stroke-width="${w}" stroke-linecap="round" opacity="${op}"`);
}

// Bunte Sprenkel fuer Terrazzo
function sprenkel(c, seed) {
  const rnd = zufall(seed);
  const farben = ['#c9a27a', '#8fa39a', '#b7a8c9', '#d9c9a3', '#9c7a5c'];
  let s = '';
  for (let i = 0; i < 34; i++) {
    const t = 0.03 + 0.94 * rnd();
    const x = (2 * rnd() - 1) * c.prof(t) * 0.95;
    const rx = 0.8 + 1.6 * rnd();
    s += oval(x, c.y(t), rx, rx * 0.55, `fill="${farben[i % farben.length]}" opacity="0.85"`);
  }
  return s;
}

export const TOEPFE_KUEBEL = {
  terrakotta_kuebel: {
    name: 'Terrakotta-Kübel', groesse: 'kuebel', preis: 0, level: 1,
    zeichne: (R, H) => bau(R, H, {
      prof: linear(R, 0.72 * R),
      farben: ['#eba47f', '#d9825b', '#b8643f'],
    }),
  },

  laufglasur_kuebel: {
    name: 'Laufglasur-Kübel', groesse: 'kuebel', preis: 80, level: 3,
    zeichne: (R, H) => bau(R, H, {
      prof: bauchig(R, 1.1 * R, 0.66 * R, 0.4),
      farben: ['#8a5a40', '#6a4330', '#4a2d20'],
      rand: { licht: '#a0704f', innen: '#3d2619' },
      details: ({ R, y }) => {
        const yA = y(0.4);
        const glasur = pfad(`M${P(-2 * R, yA)}Q${P(-R * 0.5, yA - 4)} ${P(0, yA + 1)}T${P(2 * R, yA)}V12H${f(-2 * R)}Z`,
          'fill="#f4e4c1"');
        const tropfen = [-0.6, 0.2, 0.9].map((k) => oval(k * R, yA + 4, 1.1, 3.2, 'fill="#f4e4c1"')).join('');
        return glasur + tropfen;
      },
    }),
  },

  korb_kuebel: {
    name: 'Korbkübel', groesse: 'kuebel', preis: 95, level: 5,
    zeichne: (R, H) => bau(R, H, {
      prof: linear(R, 0.76 * R),
      farben: ['#efd6a8', '#d9b27c', '#b98e5a'],
      rand: { licht: '#f3dfb6', innen: '#7a5a34' },
      hinten: (c) => henkel(c, -1, 0.92, 0.36, 9, '#8c6a3c') + henkel(c, 1, 0.92, 0.36, 9, '#8c6a3c'),
      details: (c) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => band(c, 0.04 + i * 0.1, '#a98457', 0.7, 0.8)).join(''),
    }),
  },

  stein_kuebel: {
    name: 'Steinkübel', groesse: 'kuebel', preis: 115, level: 7,
    zeichne: (R, H) => bau(R, H, {
      prof: unebel(linear(R, 0.7 * R)),
      farben: ['#dcd0b8', '#b9a88c', '#8d8068'],
      rand: { licht: '#e6dcc6', innen: '#5f5546' },
      details: (c) => flecken(c, 11, ['#6f6a5c', '#6f6a5c', '#efe6d2'], 9),
    }),
  },

  keramik_weiss_kuebel: {
    name: 'Keramik weiß', groesse: 'kuebel', preis: 130, level: 9,
    zeichne: (R, H) => bau(R, H, {
      prof: bauchig(R, 1.06 * R, 0.56 * R, 0.55),
      farben: ['#fdfcf8', '#ebe8df', '#c9c4b6'],
      rand: { licht: '#ffffff', innen: '#a9a295' },
      glanzFarbe: '#ffffff', glanzBreite: 3,
      details: (c) => band(c, 0.22, '#e0dccf', 0.6, 0.8),
    }),
  },

  beton_kuebel: {
    name: 'Betonkübel', groesse: 'kuebel', preis: 150, level: 11,
    zeichne: (R, H) => bau(R, H, {
      prof: linear(R, 0.9 * R),
      farben: ['#8a8e95', '#64686f', '#42464d'],
      rand: { licht: '#9a9ea5', innen: '#2e3136' },
      details: (c) => band(c, 0.92, '#4a4e55', 0.6, 0.7) + band(c, 0.06, '#4a4e55', 0.6, 0.6) +
        flecken(c, 23, ['#2d3035', '#2d3035'], 26),
    }),
  },

  rattan_kuebel: {
    name: 'Rattankübel', groesse: 'kuebel', preis: 160, level: 13,
    zeichne: (R, H) => bau(R, H, {
      prof: linear(R, 0.88 * R),
      unten: -5,
      farben: ['#e8c595', '#cf9f6b', '#a8764a'],
      rand: { licht: '#e9c99b', innen: '#6b4a2c' },
      hinten: (c) => [-0.55, 0.55, 0].map((k) =>
        linie([k * c.rb, -4], [k * c.rb * 1.35, 0], 'stroke="#8a5f36" stroke-width="2.6" stroke-linecap="round"')
      ).join(''),
      details: (c) => {
        let s = '';
        for (let i = -6; i <= 6; i++) {
          const x = i * c.R / 5;
          s += pfad(`M${P(x, c.unten)}L${P(x + c.H * 0.45, -c.H)}`, 'fill="none" stroke="#b98a5a" stroke-width="0.7" opacity="0.75"');
          s += pfad(`M${P(x, c.unten)}L${P(x - c.H * 0.45, -c.H)}`, 'fill="none" stroke="#b98a5a" stroke-width="0.7" opacity="0.75"');
        }
        return s;
      },
    }),
  },

  zink_kuebel: {
    name: 'Zinkkübel', groesse: 'kuebel', preis: 180, level: 15,
    zeichne: (R, H) => bau(R, H, {
      prof: linear(R, 0.86 * R),
      farben: ['#f2f5f7', '#c5ced4', '#8e9aa2'],
      rand: { licht: '#f7f9fa', innen: '#6d7880' },
      glanzFarbe: '#ffffff', glanzBreite: 2.6,
      hinten: (c) => henkel(c, -1, 0.86, 0.66, 7, '#6f7b83', 1.8) + henkel(c, 1, 0.86, 0.66, 7, '#6f7b83', 1.8),
      details: (c) => [0.18, 0.36, 0.54, 0.72].map((t) => band(c, t, '#7d8a93', 0.9, 0.7)).join(''),
    }),
  },

  holz_kuebel: {
    name: 'Holzfass-Kübel', groesse: 'kuebel', preis: 195, level: 17,
    zeichne: (R, H) => bau(R, H, {
      prof: bauchig(R, 1.05 * R, 0.86 * R, 0.5),
      farben: ['#e2b07c', '#c98f5a', '#a86b43'],
      rand: { licht: '#ecc08f', innen: '#5a3a22' },
      details: (c) => {
        const dauben = [-0.7, -0.35, 0, 0.35, 0.7].map((k) =>
          linie([k * c.R, c.y(0)], [k * c.R, c.y(1)], 'stroke="#a86b43" stroke-width="0.7" opacity="0.7"')
        ).join('');
        return dauben + band(c, 0.16, '#4a3a30', 2.4, 0.9) + band(c, 0.84, '#4a3a30', 2.4, 0.9) +
          band(c, 0.2, '#f0cf9e', 0.6, 0.6) + band(c, 0.88, '#f0cf9e', 0.6, 0.6);
      },
    }),
  },

  terrazzo_kuebel: {
    name: 'Terrazzokübel', groesse: 'kuebel', preis: 215, level: 19,
    zeichne: (R, H) => bau(R, H, {
      prof: linear(R, 0.92 * R),
      farben: ['#f6f1e8', '#e6dfd2', '#bfb6a6'],
      rand: { licht: '#fbf8f2', innen: '#6b6258' },
      details: (c) => sprenkel(c, 31),
    }),
  },

  petrol_kuebel: {
    name: 'Petrol-Kübel', groesse: 'kuebel', preis: 240, level: 20,
    zeichne: (R, H) => bau(R, H, {
      prof: linear(R, 0.8 * R),
      farben: ['#8fd0cd', '#2f7478', '#1c4d52'],
      rand: { licht: '#a8dcd8', innen: '#15383c' },
      glanzFarbe: '#e9fbfa', glanzBreite: 3.4,
      details: (c) => glanzStreifen(c, 0.45, 1, 0.5),
    }),
  },

  gold_kuebel: {
    name: 'Goldkübel', groesse: 'kuebel', preis: 260, level: 22,
    zeichne: (R, H) => bau(R, H, {
      prof: bauchig(R, 1.04 * R, 0.7 * R, 0.45),
      farben: ['#f7e09a', '#d1ad5c', '#8e6a2a'],
      glanzFarbe: '#fff9e0', glanzBreite: 2.2,
      rand: { licht: '#f6e3a2', innen: '#5c4418' },
      details: (c) => {
        // Gehaemmerte Dellen (dunkel) und Lichtpunkte (hell)
        const rnd = zufall(41);
        let s = '';
        for (let i = 0; i < 22; i++) {
          const t = 0.06 + 0.88 * rnd();
          const x = (2 * rnd() - 1) * c.prof(t) * 0.9;
          const rr = 0.9 + 1.6 * rnd();
          s += oval(x, c.y(t), rr, rr * 0.6, 'fill="#7a5a22" opacity="0.22"');
          s += oval(x - rr * 0.3, c.y(t) - rr * 0.3, 0.8, 0.8, 'fill="#fffbe8" opacity="0.9"');
        }
        return s + glanzStreifen(c, 0.5, 1.2, 0.5);
      },
    }),
  },
};
