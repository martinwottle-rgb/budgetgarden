// Teppiche als Bodenbelag fuer die isometrische Szene. Schnittstelle wie DEKO mit bodenbelag: true:
// zeichne() liefert ein SVG-Fragment mit Ursprung (0,0) = Mitte des Teppichs. Die Teppiche liegen flach
// in der Bodenebene (z = 0.4) und blockieren kein Feld. Lokale Isometrie wie teppich() in deko.js.

import { zufall } from './hilfen.js';

const KX = 0.9, KY = 0.45, Z = 0.4;
const P = (x, y, z = Z) => [(x - y) * KX, (x + y) * KY - z];

const f = (n) => Math.round(n * 10) / 10;
const p2 = (p) => f(p[0]) + ',' + f(p[1]);

let zaehler = 0;
// Eindeutige Ids fuer Verlaeufe und Beschnitte, damit mehrere SVGs auf einer Seite nicht kollidieren
const eindeutig = (name) => `${name}-${++zaehler}`;

// Dezente Kontur
const KONTUR = 'stroke="#8a6a50" stroke-width="0.9" stroke-linejoin="round"';
const SCHATTEN = 'fill="#6b4a3a" opacity="0.18"';

// Polygon aus Ebenenpunkten [x, y], um (dx, dy) verschoben
function flach(ebene, attr, dx = 0, dy = 0) {
  return `<polygon points="${ebene.map(([x, y]) => p2(P(x + dx, y + dy))).join(' ')}" ${attr}/>`;
}

// Schatten flach auf dem Boden, leicht nach rechts unten versetzt
const schatten = (ebene) => flach(ebene, SCHATTEN, 1.6, 1.4);

// Strich zwischen zwei Ebenenpunkten
function strich(a, b, attr) {
  const A = P(a[0], a[1]), B = P(b[0], b[1]);
  return `<line x1="${f(A[0])}" y1="${f(A[1])}" x2="${f(B[0])}" y2="${f(B[1])}" ${attr}/>`;
}

// Ellipse in der Ebene mit n Punkten, Mittelpunkt (mx, my)
function oval(rx, ry, n = 48, mx = 0, my = 0) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * 2 * Math.PI;
    pts.push([mx + rx * Math.cos(t), my + ry * Math.sin(t)]);
  }
  return pts;
}

// Abgerundetes Rechteck in der Ebene, r = Eckradius, n = Punkte je Ecke
function rrect(hw, hh, r, n = 6) {
  const ecken = [
    [hw - r, hh - r, 0],
    [-hw + r, hh - r, Math.PI / 2],
    [-hw + r, -hh + r, Math.PI],
    [hw - r, -hh + r, (3 * Math.PI) / 2],
  ];
  const pts = [];
  for (const [cx, cy, a0] of ecken) {
    for (let k = 0; k <= n; k++) {
      const a = a0 + (k / n) * (Math.PI / 2);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
}

// Clip-Pfad aus einer Ebenenform: liefert [clipPath-Markup, id]
function beschnitt(ebene) {
  const id = eindeutig('tep-clip');
  return [`<clipPath id="${id}">${flach(ebene, '')}</clipPath>`, id];
}

// Radialer Verlauf: Mitte heller, nach aussen transparent (objectBoundingBox, Mitte = Ursprung)
function mitteHell(id) {
  return `<radialGradient id="${id}"><stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/>` +
    `<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>`;
}

// Glanz-Overlay mit dem Mitte-heller-Verlauf
const glanz = (ebene, id) => flach(ebene, `fill="url(#${id})"`);

// Rautenmuster: Scharen x + y = k und x - y = k, Abstand in k, Halblaenge lang
function rauten(abstand, lang, attr) {
  let s = '';
  for (let k = -lang; k <= lang; k += abstand) {
    s += strich([k / 2 - lang, k / 2 + lang], [k / 2 + lang, k / 2 - lang], attr);
    s += strich([k / 2 - lang, -k / 2 - lang], [k / 2 + lang, -k / 2 + lang], attr);
  }
  return s;
}

// Kleine Raute um (cx, cy) mit Halbdiagonale s
const raute = (cx, cy, s, fill) =>
  flach([[cx, cy - s], [cx + s, cy], [cx, cy + s], [cx - s, cy]], `fill="${fill}" stroke="#8a6a50" stroke-width="0.4"`);

// ---------- 1. Berberteppich: rund, creme mit braunen Rauten, Fransen rundum ----------
function berber() {
  const R = 54, RI = R - 5;
  const ebene = oval(R, R, 72);
  const innen = oval(RI, RI, 72);
  const [clip, cid] = beschnitt(innen);
  const glow = eindeutig('tep-glow');
  let s = `<defs>${clip}${mitteHell(glow)}</defs>`;
  s += schatten(ebene);
  // Fransen rundum: kurze Striche nach aussen, alle Punkte über P projiziert
  for (let k = 0; k < 72; k++) {
    const t = (k / 72) * 2 * Math.PI;
    const L = 3.5 + (k % 2) * 1;
    const c = Math.cos(t), sn = Math.sin(t);
    s += strich([(R - 0.5) * c, (R - 0.5) * sn], [(R + L) * c, (R + L) * sn],
      'stroke="#efe6cf" stroke-width="1" stroke-linecap="round"');
  }
  // Dunklere Borte als äußerer Ring, darauf der cremefarbene Grund
  s += flach(ebene, `fill="#b98f5e" ${KONTUR}`);
  s += flach(innen, 'fill="#f1e7d3"');
  // Rautennetz: Diagonalen in zwei Richtungen, Abstand 12
  s += `<g clip-path="url(#${cid})">` +
    rauten(12, 70, 'stroke="#8a6a50" stroke-width="1.1" stroke-linecap="round"');
  // Ein kleiner Punkt in jeder zweiten Raute (Mittelpunkte liegen auf dem Gitter k = -64 + 12 m)
  for (let i = -12; i <= 12; i++) {
    for (let j = -12; j <= 12; j++) {
      if (Math.abs(i + j) % 2 !== 0) continue;
      const a = -64 + 12 * i, b = -64 + 12 * j;
      const mx = (a + b) / 2, my = (a - b) / 2;
      if (Math.hypot(mx, my) > RI - 3) continue;
      s += flach(oval(0.9, 0.9, 6, mx, my), 'fill="#8a6a50"');
    }
  }
  s += '</g>';
  // Leichter Verlauf über dem Grund
  s += flach(innen, `fill="url(#${glow})"`);
  return s;
}

// ---------- 2. Kelim: Rechteck, Rauten und Treppen, Fransen an den Schmalseiten ----------
function kelim() {
  const hw = 50, hh = 33;
  const ebene = rrect(hw, hh, 2, 2);
  const [clip, cid] = beschnitt(rrect(hw - 2, hh - 2, 1, 2));
  const glow = eindeutig('tep-glow');
  let s = `<defs>${clip}${mitteHell(glow)}</defs>`;
  s += schatten(ebene);
  // Fransen an den beiden Schmalseiten (x = +-hw)
  for (const x of [-hw, hw]) {
    const d = Math.sign(x);
    for (let k = 0; k <= 24; k++) {
      const y = -28 + k * 2.33;
      const L = 3.5 + (k % 2) * 0.8;
      s += strich([x, y], [x + d * L, y], 'stroke="#efe6cf" stroke-width="1" stroke-linecap="round"');
    }
  }
  s += flach(ebene, `fill="#efe4cc" ${KONTUR}`);
  // Muster: Reihen aus ineinander gesetzten Rauten (Terrakotta, Petrol, Senf) und Treppen-Zickzack
  const farben = ['#d9693b', '#2f6f73', '#d9a441'];
  const reihen = [[-22, [-30, -10, 10, 30]], [0, [-40, -20, 0, 20, 40]], [22, [-30, -10, 10, 30]]];
  let muster = '';
  let n = 0;
  for (const [y, xs] of reihen) {
    for (const x of xs) {
      muster += raute(x, y, 8, farben[n % 3]);
      muster += raute(x, y, 5, '#efe4cc');
      muster += raute(x, y, 2.5, farben[(n + 1) % 3]);
      n++;
    }
  }
  for (const y of [-11, 11]) {
    const zick = [];
    for (let x = -46; x <= 46; x += 4) zick.push([x, y + (Math.round(x / 4) % 2 ? 2.5 : 0)]);
    muster += flach(zick, 'fill="none" stroke="#d9693b" stroke-width="1.2" stroke-linejoin="miter"');
  }
  s += `<g clip-path="url(#${cid})">${muster}</g>`;
  // Bordüre
  s += flach(rrect(hw - 3, hh - 3, 2, 2), 'fill="none" stroke="#d9693b" stroke-width="1.2"');
  s += glanz(ebene, glow);
  return s;
}

// ---------- 3. Karoteppich: gelb-grünes Karo mit Weißlinien, schmale Bordüre ----------
function karo() {
  const hw = 48, hh = 35, bord = 6;
  const aussen = rrect(hw, hh, 2, 2);
  const innen = rrect(hw - bord, hh - bord, 1, 2);
  const [clip, cid] = beschnitt(innen);
  const glow = eindeutig('tep-glow');
  let s = `<defs>${clip}${mitteHell(glow)}</defs>`;
  s += schatten(aussen);
  s += flach(aussen, `fill="#8db07c" ${KONTUR}`);
  // Karos von 12 x 12 Einheiten, Weißlinien als Zellrand
  let kar = '';
  for (let i = -4; i < 4; i++) {
    for (let j = -3; j < 3; j++) {
      const x0 = i * 12, y0 = j * 12;
      const farbe = (i + j) % 2 === 0 ? '#f3e9a0' : '#b9d3a0';
      kar += flach([[x0, y0], [x0 + 12, y0], [x0 + 12, y0 + 12], [x0, y0 + 12]],
        `fill="${farbe}" stroke="#fbfbf1" stroke-width="0.9"`);
    }
  }
  s += `<g clip-path="url(#${cid})">${kar}</g>`;
  s += flach(innen, 'fill="none" stroke="#fbfbf1" stroke-width="0.9"');
  s += glanz(aussen, glow);
  return s;
}

// ---------- 4. Wolkenteppich: hellblau, cremefarbener Rand, plüschige Florpunkte ----------
function wolke() {
  const rand = zufall(41);
  // Bögen (x, y, r): ein Hauptbogen in der Mitte, sechs am Rand
  // Maße in der Ebene etwa 90 x 64 Einheiten; alle Punkte laufen über flach() und P() in die Bodenebene
  const bogen = [[0, 0, 22]];
  for (let k = 0; k < 6; k++) {
    const t = (k * Math.PI) / 3 + 0.3;
    bogen.push([Math.cos(t) * 26, Math.sin(t) * 17, 14 + (k % 2) * 2]);
  }
  const glow = eindeutig('tep-glow');
  let s = `<defs>${mitteHell(glow)}</defs>`;
  // Kontur: cremefarbene Bögen, etwas größer, zuerst (ergeben den Rand)
  // Ein gemeinsamer Schatten in einer Gruppe, damit sich überlappende Bögen nicht doppelt abdunkeln
  s += '<g opacity="0.18">';
  for (const [x, y, r] of bogen) {
    s += flach(oval(r + 2.6, r + 2.6, 28, x, y), 'fill="#6b4a3a"', 1.6, 1.4);
  }
  s += '</g>';
  for (const [x, y, r] of bogen) {
    s += flach(oval(r + 2.6, r + 2.6, 28, x, y), `fill="#f3e8cf" ${KONTUR}`);
  }
  // Blaue Bögen darüber, jeder mit eigenem Mitte-heller-Verlauf
  for (const [x, y, r] of bogen) {
    s += flach(oval(r, r, 28, x, y), 'fill="#cfe3f0"');
    s += flach(oval(r, r, 28, x, y), `fill="url(#${glow})"`);
  }
  // Plüsch: feine Florpunkte innerhalb der Bögen
  for (let k = 0; k < 110; k++) {
    const x = (rand() * 2 - 1) * 46, y = (rand() * 2 - 1) * 33;
    const drin = bogen.some(([bx, by, br]) => Math.hypot(x - bx, y - by) < br - 4);
    if (!drin) continue;
    const hell = k % 2 === 0;
    s += flach(oval(0.9, 0.9, 6, x, y), `fill="${hell ? '#ffffff' : '#9cc3dd'}" opacity="${hell ? 0.6 : 0.5}"`);
  }
  return s;
}

// ---------- 5. Läufer: langer Streifen 150 x 40 entlang x, salbei mit cremefarbener Bordüre ----------
function laeufer() {
  const hw = 75, hh = 20;
  const aussen = rrect(hw, hh, 19, 6);
  const innen = rrect(hw - 5, hh - 5, 14, 6);
  const glow = eindeutig('tep-glow');
  let s = `<defs>${mitteHell(glow)}</defs>`;
  s += schatten(aussen);
  s += flach(aussen, `fill="#f1e7cf" ${KONTUR}`);
  s += flach(innen, 'fill="#9fb79a" stroke="#7d9a7d" stroke-width="0.7"');
  // Kleines Muster: Rauten in Reihe, dazwischen dunklere Punkte, feine Linien am Rand des Feldes
  for (let k = 0; k <= 10; k++) {
    const x = -60 + k * 12;
    s += raute(x, 0, 4, '#f1e7cf');
    s += raute(x + 6, 0, 2, '#6f8c72');
  }
  for (const y of [-10, 10]) {
    s += strich([-66, y], [66, y], 'stroke="#f1e7cf" stroke-width="0.7"');
  }
  // Punkte auf der Bordüre
  for (let x = -68; x <= 68; x += 8) {
    for (const y of [-17.5, 17.5]) {
      s += flach(oval(0.7, 0.7, 5, x, y), 'fill="#c9a27a"');
    }
  }
  s += glanz(aussen, glow);
  return s;
}

// ---------- 6. Schaffell: weiß, unregelmäßige Form, zotteliger Rand aus kleinen Bögen ----------
function fell() {
  const N = 40;
  const ebene = [];
  for (let k = 0; k < N; k++) {
    const t = (k / N) * 2 * Math.PI;
    const r = 1 + 0.06 * Math.sin(3 * t + 0.4) + 0.04 * Math.sin(5 * t + 1.3) + 0.025 * Math.sin(9 * t);
    ebene.push([32 * r * Math.cos(t), 24 * r * Math.sin(t)]);
  }
  // Zotteliger Rand: zwischen je zwei Punkten ein nach außen gewölbter Bogen
  let rand = '';
  for (let k = 0; k < N; k++) {
    const a = ebene[k], b = ebene[(k + 1) % N];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const len = Math.hypot(m[0], m[1]) || 1;
    const c = [m[0] + (m[0] / len) * 6, m[1] + (m[1] / len) * 6];
    const pa = P(a[0], a[1]), pb = P(b[0], b[1]), pc = P(c[0], c[1]);
    rand += (k === 0 ? `M${p2(pa)}` : '') + `Q${p2(pc)} ${p2(pb)}`;
  }
  const zotten = `<path d="${rand}Z" fill="#e4ddcf" stroke="#9c9080" stroke-width="0.8" stroke-linejoin="round"/>`;
  let s = schatten(ebene) + zotten;
  // Grauschatten unten rechts, helles Fell oben links (Licht von links oben)
  s += flach(ebene.map(([x, y]) => [x * 0.9 - 1, y * 0.9 - 1]), 'fill="#f8f5ef"');
  // Feine Fellstränge
  const rnd = zufall(23);
  for (let k = 0; k < 16; k++) {
    const x = (rnd() * 2 - 1) * 20, y = (rnd() * 2 - 1) * 14;
    const dx = (rnd() - 0.5) * 6, dy = (rnd() - 0.5) * 4;
    s += strich([x, y], [x + dx, y + dy], 'stroke="#d8d0bf" stroke-width="0.8" stroke-linecap="round"');
  }
  const glow = eindeutig('tep-glow');
  s = `<defs>${mitteHell(glow)}</defs>` + s;
  s += glanz(ebene, glow);
  return s;
}

export const TEPPICHE = {
  berber_rund: { name: 'Berberteppich', bodenbelag: true, zeichne: () => berber() },
  kelim: { name: 'Kelim', bodenbelag: true, zeichne: () => kelim() },
  karo: { name: 'Karoteppich', bodenbelag: true, zeichne: () => karo() },
  wolke: { name: 'Wolkenteppich', bodenbelag: true, zeichne: () => wolke() },
  laeufer: { name: 'Läufer', bodenbelag: true, zeichne: () => laeufer() },
  fell: { name: 'Schaffell', bodenbelag: true, zeichne: () => fell() },
};
