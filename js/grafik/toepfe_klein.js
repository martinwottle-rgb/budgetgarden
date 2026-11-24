// Kleine Toepfe (R etwa 10 bis 14) fuer kleine Pflanzen. Export TOEPFE_KLEIN: je Eintrag { name, groesse, preis, level, zeichne(R, H) }.
// Ursprung (0,0) = Mitte der Standflaeche. Oberer Rand = Ellipse bei y = -H mit Radius R (ry = 0.4 R), darin Erde.
// Verlaufs- und Clip-Ids bekommen einen Zaehler, damit mehrere Szenen auf einer Seite nicht kollidieren.

import { f, pfad, oval, kreis, rechteck, linie, zufall } from './hilfen.js';

const KON_TOPF = 'stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';
const KONTUR = 'stroke="#6b4a3a" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"';
const ERDE = '#7a5238';

let laufNr = 0;
const neuId = (name) => {
  laufNr += 1;
  return `tk-${name}-${laufNr}`;
};

// ---------- Terrakotta: Code unveraendert aus topf(R, H) in pflanzen.js ----------
function terrakotta(R, H) {
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
    oval(0, -H + 0.8, R - 3.4, ry - 1.7, `fill="${ERDE}"`) +
    krumen +
    oval(0, -H, R, ry, `fill="none" ${KON_TOPF}`);
}

// ---------- Gemeinsamer Aufbau fuer plastische Toepfe ----------
// Koerper: oben Radius R bei y = -H, unten Radius Rb bei y = 0, b = Ausbauchung in der Mitte.
function koerper(R, H, Rb, b) {
  const ry = R * 0.4, ryb = Rb * 0.4;
  return `M${f(-R)},${f(-H)}` +
    `C${f(-R - b)},${f(-H * 0.75)} ${f(-Rb - b)},${f(-H * 0.25)} ${f(-Rb)},0` +
    `A${f(Rb)},${f(ryb)} 0 0 0 ${f(Rb)},0` +
    `C${f(Rb + b)},${f(-H * 0.25)} ${f(R + b)},${f(-H * 0.75)} ${f(R)},${f(-H)}` +
    `A${f(R)},${f(ry)} 0 0 1 ${f(-R)},${f(-H)}Z`;
}

// Krumen in der Erde, wie bei topf()
function krumenErde(R, H) {
  const k = R / 14;
  return [[-6, 1.5, 1.1, 0.6], [-2, 2.6, 0.9, 0.5], [3, 0.8, 1, 0.55], [6, 2.2, 0.8, 0.45], [1, -1.2, 0.7, 0.4]]
    .map(([x, y, rx, rr]) => oval(x * k, -H + y * k, rx * k, rr * k, 'fill="#d6b08a"'))
    .join('');
}

// o: { name, rb (Faktor Bodenradius), bauch, stops [[offset, farbe, opacity?]], rand [hell, dunkel], glanz, dekor(c), kante(c) }
// c = { R, H, Rb, ry, id, kp } wird an dekor und kante uebergeben. Dekor liegt im Koerper (Clip), kante ueber der Kontur.
function gefaess(R, H, o) {
  const Rb = R * o.rb;
  const b = o.bauch || 0;
  const ry = R * 0.4, ryb = Rb * 0.4;
  const id = neuId(o.name);
  const kp = koerper(R, H, Rb, b);
  const c = { R, H, Rb, ry, id, kp };
  const verlauf = `${id}-v`;
  const clip = `${id}-k`;
  const stopps = o.stops
    .map(([off, col, op]) => `<stop offset="${off}" stop-color="${col}"${op === undefined ? '' : ` stop-opacity="${op}"`}/>`)
    .join('');
  const defs = `<defs><linearGradient id="${verlauf}" x1="0" y1="0" x2="1" y2="0">${stopps}</linearGradient>` +
    `<clipPath id="${clip}"><path d="${kp}"/></clipPath></defs>`;
  const [randHell, randDunkel] = o.rand;
  const glanz = pfad(
    `M${f(-R + 2.5)},${f(-H + 4)}L${f(-Rb + 2.5)},-4`,
    `fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="${o.glanz === undefined ? 0.5 : o.glanz}"`
  );
  return defs +
    oval(1, 0, Rb + 2.5, ryb + 1.5, 'fill="#6b4a3a" opacity="0.18"') +
    pfad(kp, `fill="url(#${verlauf})"`) +
    `<g clip-path="url(#${clip})">${o.dekor ? o.dekor(c) : ''}</g>` +
    glanz +
    pfad(kp, `fill="none" ${KONTUR}`) +
    (o.kante ? o.kante(c) : '') +
    oval(0, -H, R, ry, `fill="${randHell}"`) +
    pfad(`M0,${f(-H - ry)}A${R},${f(ry)} 0 0 1 0,${f(-H + ry)}Z`, `fill="${randDunkel}"`) +
    oval(0, -H, R - 2.4, ry - 1.2, 'fill="#a85a38"') +
    oval(0, -H + 0.8, R - 3.4, ry - 1.7, `fill="${ERDE}"`) +
    krumenErde(R, H) +
    oval(0, -H, R, ry, `fill="none" ${KONTUR}`);
}

// Querbaender, die sich leicht nach unten woelben (Rundung des Topfes)
function bogen(R, y, attr) {
  return pfad(`M${f(-R - 3)},${f(y)}Q0,${f(y + R * 0.3)} ${f(R + 3)},${f(y)}`, `fill="none" ${attr}`);
}

// ---------- Die zwoelf kleinen Toepfe ----------
const POREN = [[-0.5, -0.7, 1], [0.2, -0.4, 0.8], [0.55, -0.8, 1.1], [-0.2, -0.2, 0.7], [0.35, -0.55, 0.6],
  [-0.7, -0.3, 0.6], [0.7, -0.15, 0.8], [0.05, -0.9, 0.7]];
const SPRENKEL = ['#c9785a', '#7fa3a0', '#d8b25a', '#8a7aa8', '#6b4a3a'];

export const TOEPFE_KLEIN = {
  terrakotta: {
    name: 'Terrakotta',
    groesse: 'klein',
    preis: 0,
    level: 1,
    zeichne: (R, H) => terrakotta(R, H),
  },

  keramik_weiss: {
    name: 'Keramik weiß',
    groesse: 'klein',
    preis: 30,
    level: 2,
    zeichne: (R, H) => gefaess(R, H, {
      name: 'weiss', rb: 0.7, bauch: 1.5, glanz: 0.8,
      stops: [[0, '#fdfbf6'], [0.55, '#eee8dc'], [1, '#c9bfae']],
      rand: ['#ffffff', '#e6dfd0'],
    }),
  },

  korb_klein: {
    name: 'Korb',
    groesse: 'klein',
    preis: 35,
    level: 3,
    zeichne: (R, H) => gefaess(R, H, {
      name: 'korb', rb: 0.7, bauch: 2,
      stops: [[0, '#f1e3b5'], [0.5, '#d8c285'], [1, '#a88f58']],
      rand: ['#f3e7c2', '#b59d64'],
      dekor: (c) => {
        // Flechtreihen: dunkle Reihe mit darunterliegender gestrichelter Reihe
        let s = '';
        for (let k = 0; k < 4; k++) {
          const y = -c.H * (0.15 + k * 0.22);
          s += bogen(c.R, y, 'stroke="#8a7444" stroke-width="1"');
          s += bogen(c.R, y + 2.4, 'stroke="#b59d64" stroke-width="1.2" stroke-dasharray="2.5 1.8"');
        }
        return s;
      },
    }),
  },

  streifen: {
    name: 'Streifen',
    groesse: 'klein',
    preis: 40,
    level: 4,
    zeichne: (R, H) => gefaess(R, H, {
      name: 'streifen', rb: 0.7, bauch: 1,
      stops: [[0, '#fbf6ea'], [0.5, '#ece2cb'], [1, '#c9bb97']],
      rand: ['#fffaf0', '#ddd0b0'],
      dekor: (c) => [0.24, 0.5, 0.76]
        .map((fr) => bogen(c.R, -c.H * fr, 'stroke="#d9a441" stroke-width="2.2" stroke-linecap="round"'))
        .join(''),
    }),
  },

  laufglasur: {
    name: 'Laufglasur',
    groesse: 'klein',
    preis: 45,
    level: 5,
    zeichne: (R, H) => gefaess(R, H, {
      name: 'laufglasur', rb: 0.65, bauch: 1.5,
      stops: [[0, '#f6e8cc'], [0.5, '#e2cca2'], [1, '#bf9f74']],
      rand: ['#8a5a3c', '#5c3b29'],
      dekor: (c) => {
        // Braune Glasur laeuft von oben nach unten ueber die cremefarbene Flaeche, mit tropfenden Kanten
        const e = -c.H * 0.45, w = c.R * 0.09;
        const tropfen = [[0.75, 6], [0.35, 12], [-0.1, 5], [-0.5, 10], [-0.85, 4]];
        let d = `M${f(-c.R - 6)},${f(-c.H)}L${f(c.R + 6)},${f(-c.H)}L${f(c.R + 6)},${f(e)}`;
        for (const [fx, len] of tropfen) {
          const x = fx * c.R;
          d += `L${f(x + w)},${f(e)}Q${f(x + w)},${f(e + len)} ${f(x)},${f(e + len)}Q${f(x - w)},${f(e + len)} ${f(x - w)},${f(e)}`;
        }
        d += `L${f(-c.R - 6)},${f(e)}Z`;
        return pfad(d, 'fill="#7a4a2e"') +
          pfad(`M${f(-c.R + 2)},${f(-c.H + 2)}L${f(-c.R + 2)},${f(e - 1)}`, 'fill="none" stroke="#a8693f" stroke-width="1.2" stroke-linecap="round" opacity="0.7"');
      },
    }),
  },

  beton_klein: {
    name: 'Beton',
    groesse: 'klein',
    preis: 50,
    level: 6,
    zeichne: (R, H) => gefaess(R, H, {
      name: 'beton', rb: 0.75, bauch: 0.5,
      stops: [[0, '#c9c6bf'], [0.5, '#a7a49c'], [1, '#7b7871']],
      rand: ['#d6d3cc', '#8d8a83'],
      dekor: (c) => POREN
        .map(([x, y, r]) => oval(x * c.R, y * c.H, r * 1.2, r * 0.8, 'fill="#5f5c56" opacity="0.45"'))
        .join(''),
      kante: (c) => pfad(c.kp, 'fill="none" stroke="#6b4a3a" stroke-width="0.9" stroke-dasharray="2.4 1 0.9 1.4" stroke-linecap="round" opacity="0.7"'),
    }),
  },

  emaille: {
    name: 'Emaille',
    groesse: 'klein',
    preis: 55,
    level: 8,
    zeichne: (R, H) => gefaess(R, H, {
      name: 'emaille', rb: 0.7, bauch: 1,
      stops: [[0, '#fbf5e6'], [0.5, '#eadcbc'], [1, '#c4ae84']],
      rand: ['#fcf7ec', '#d9c9a4'],
      dekor: (c) => {
        const { R: r, H: h } = c;
        return rechteck(-r - 4, -h + 3.5, 2 * r + 8, 3, 0, 'fill="#3f6fa8"') +
          rechteck(-r - 4, -h + 6.8, 2 * r + 8, 0.6, 0, 'fill="#9fbbe0"') +
          rechteck(-r - 4, -4, 2 * r + 8, 3, 0, 'fill="#3f6fa8"') +
          // kleine Abplatzer: helle Kante, dunkler Grund
          oval(-0.4 * r, -0.5 * h, 1.1, 0.8, 'fill="#fffdf7" stroke="#8c7a5a" stroke-width="0.4"') +
          oval(0.5 * r, -0.3 * h, 0.9, 0.6, 'fill="#9d8a6a"') +
          oval(0.15 * r, -0.72 * h, 0.7, 0.5, 'fill="#fffdf7" stroke="#8c7a5a" stroke-width="0.4"');
      },
    }),
  },

  terrazzo_klein: {
    name: 'Terrazzo',
    groesse: 'klein',
    preis: 60,
    level: 9,
    zeichne: (R, H) => gefaess(R, H, {
      name: 'terrazzo', rb: 0.7, bauch: 1,
      stops: [[0, '#f4efe6'], [0.5, '#dcd3c4'], [1, '#b5ab9b']],
      rand: ['#fbf8f2', '#d1c8b8'],
      dekor: (c) => {
        // Sprenkel mit festem Seed: jeder Aufruf liefert dasselbe Muster
        const r = zufall(7);
        let s = '';
        for (let i = 0; i < 26; i++) {
          const x = (r() * 2 - 1) * c.R * 0.85;
          const y = -c.H * (0.08 + r() * 0.84);
          const g = 0.9 + r() * 1.3;
          const col = SPRENKEL[Math.floor(r() * SPRENKEL.length)];
          s += oval(x, y, g, g * 0.6, `fill="${col}"`);
        }
        return s;
      },
    }),
  },

  keramik_petrol: {
    name: 'Keramik petrol',
    groesse: 'klein',
    preis: 65,
    level: 10,
    zeichne: (R, H) => gefaess(R, H, {
      name: 'petrol', rb: 0.7, bauch: 1.5, glanz: 0.75,
      stops: [[0, '#8fd0cf'], [0.45, '#3f8f93'], [1, '#1f5558']],
      rand: ['#a6dcd9', '#3f8f93'],
      dekor: (c) => oval(-0.45 * c.R, -0.5 * c.H, 0.12 * c.R + 0.6, 0.22 * c.H, 'fill="#ffffff" opacity="0.45"'),
    }),
  },

  gesicht: {
    name: 'Gesicht',
    groesse: 'klein',
    preis: 75,
    level: 15,
    zeichne: (R, H) => gefaess(R, H, {
      name: 'gesicht', rb: 0.7, bauch: 1,
      stops: [[0, '#eef8ef'], [0.5, '#cde8d2'], [1, '#98c7a4']],
      rand: ['#f6fcf6', '#b6dbc0'],
      dekor: (c) => {
        const dunkel = '#3b2a20';
        const { R: r, H: h } = c;
        return oval(-0.55 * r, -0.4 * h, 1.6, 1.0, 'fill="#f2a3a3" opacity="0.55"') +
          oval(0.55 * r, -0.4 * h, 1.6, 1.0, 'fill="#f2a3a3" opacity="0.55"') +
          kreis(-0.32 * r, -0.55 * h, 1.2, `fill="${dunkel}"`) +
          kreis(0.32 * r, -0.55 * h, 1.2, `fill="${dunkel}"`) +
          kreis(-0.32 * r + 0.4, -0.55 * h - 0.4, 0.4, 'fill="#ffffff"') +
          kreis(0.32 * r + 0.4, -0.55 * h - 0.4, 0.4, 'fill="#ffffff"') +
          pfad(`M${f(-0.35 * r)},${f(-0.36 * h)}Q0,${f(-0.2 * h)} ${f(0.35 * r)},${f(-0.36 * h)}`,
            `fill="none" stroke="${dunkel}" stroke-width="1" stroke-linecap="round"`);
      },
    }),
  },

  kupfer: {
    name: 'Kupfer',
    groesse: 'klein',
    preis: 85,
    level: 13,
    zeichne: (R, H) => gefaess(R, H, {
      name: 'kupfer', rb: 0.7, bauch: 1, glanz: 0.6,
      stops: [[0, '#f3b58b'], [0.45, '#c9784a'], [1, '#7f4426']],
      rand: ['#f7c7a2', '#9a5230'],
      dekor: (c) => {
        // warmer Glanzverlauf quer ueber den Koerper
        const gid = `${c.id}-g`;
        return `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0">` +
          '<stop offset="0" stop-color="#fff2e6" stop-opacity="0"/>' +
          '<stop offset="0.3" stop-color="#fff2e6" stop-opacity="0.6"/>' +
          '<stop offset="0.42" stop-color="#ffd9b0" stop-opacity="0.2"/>' +
          '<stop offset="1" stop-color="#ffd9b0" stop-opacity="0"/>' +
          '</linearGradient></defs>' +
          rechteck(-c.R, -c.H, 2 * c.R, c.H, 0, `fill="url(#${gid})"`);
      },
    }),
  },

  holz_klein: {
    name: 'Holz',
    groesse: 'klein',
    preis: 90,
    level: 18,
    zeichne: (R, H) => gefaess(R, H, {
      name: 'holz', rb: 0.85, bauch: 0,
      stops: [[0, '#e2b07c'], [0.35, '#c98f5a'], [1, '#8f5a34']],
      rand: ['#e7b98a', '#a86b43'],
      dekor: (c) => {
        // Dauben als senkrechte, leicht zulaufende Linien, feine Maserung, Messingbaender
        let s = '';
        for (const fr of [-0.62, -0.3, 0.02, 0.34, 0.66]) {
          s += linie([fr * c.R, -c.H], [fr * c.R * 0.9, 0], 'stroke="#a86b43" stroke-width="0.6" opacity="0.8"');
        }
        s += pfad(`M${f(-c.R)},${f(-c.H * 0.3)}Q${f(-c.R * 0.4)},${f(-c.H * 0.28)} 0,${f(-c.H * 0.32)}T${f(c.R)},${f(-c.H * 0.3)}`,
          'fill="none" stroke="#a86b43" stroke-width="0.5" opacity="0.5"');
        for (const fr of [0.22, 0.8]) {
          const y = -c.H * fr;
          s += bogen(c.R + 1, y, 'stroke="#d4b26a" stroke-width="2.4" stroke-linecap="round"') +
            bogen(c.R + 1, y + 1.4, 'stroke="#8a6a2c" stroke-width="0.5"');
        }
        return s;
      },
    }),
  },
};
