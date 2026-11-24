// Winter-Grafiken (Zimmertanne, Strohstern, Adventskranz, Schneekugel) als SVG-Strings. Export WINTER.
// Gleiche Schnittstelle wie SAISON in saison.js:
// art 'pflanze': zeichne(stufe, welk, ebene, schmuck) mit Topf, Ursprung (0,0) = Mitte der Topf-Unterkante.
// art 'deko': zeichne() mit Ursprung (0,0) = Mitte des Bodenkontakts.
// haengend: true (Strohstern): Ursprung und Haken wie bei haengeampel in deko.js (Haken bei AMPEL_HAKEN).
// Licht von links oben, Konturen #6b4a3a, Kontaktschatten unter jedem Objekt. Alles deterministisch.

import { f, p2, gruppe, pfad, linie, oval, kreis, poly, zufall } from './hilfen.js';
import { gewaehlterTopf } from './topfwahl.js';

const RAD = Math.PI / 180;
const FAC = [0.5, 0.72, 0.9, 1]; // Groesse je Stufe 1 bis 4

// ---------- Konturen und Helfer ----------
const KON_TOPF = 'stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';
const KON_DEKO = 'stroke="#6b4a3a" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"';
const KON_GRUEN = 'stroke="#2f5a30" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const KON_WELK = 'stroke="#7d6a45" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"';
const SCHATTEN = 'fill="#6b4a3a" opacity="0.18"';

// Eindeutige Ids fuer Verlaeufe und Masken, wenn mehrere SVGs auf einer Seite stehen
let zaehler = 0;
const uid = (name) => `${name}-w${++zaehler}`;

// Lokale Isometrie fuer Deko (wie saison.js und deko.js): x nach rechts unten, y nach links unten, z nach oben
const KX = 0.9, KY = 0.45;
const P = (x, y, z = 0) => [(x - y) * KX, (x + y) * KY - z];
const pk = (pts, attr) => poly(pts.map(([x, y, z = 0]) => P(x, y, z)), attr);
const kontakt = (rx, ry) => oval(0, 0, rx, ry, SCHATTEN);
const stufeN = (s) => Math.min(4, Math.max(1, Math.round(Number(s) || 1)));

// Kugel mit Glanzpunkt (Schmuck, Beeren)
const kugelGlanz = (x, y, r, farbe) =>
  kreis(x, y, r, `fill="${farbe}" stroke="#6b4a3a" stroke-width="0.4"`) +
  kreis(x - r * 0.35, y - r * 0.35, r * 0.3, 'fill="#ffffff" opacity="0.5"');

// Quader mit sichtbaren Flaechen links (+y), rechts (+x) und oben
function quader(x0, x1, y0, y1, z0, z1, fa, kon = KON_DEKO) {
  return pk([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], `fill="${fa.links}" ${kon}`) +
    pk([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], `fill="${fa.rechts}" ${kon}`) +
    pk([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], `fill="${fa.oben}" ${kon}`);
}

// Terrakotta-Topf (wie saison.js und pflanzen.js), Ursprung unten Mitte, H = Topfhoehe
function topf(R, H) {
  const gewaehlt = gewaehlterTopf();
  if (gewaehlt) return gewaehlt(R, H);
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

// Achtzackiger Strohstern (16 Eckpunkte, abwechselnd aussen und innen)
function achtStern(x, y, ro) {
  const pts = [];
  for (let j = 0; j < 16; j++) {
    const a = (j * 22.5 - 90) * RAD, r = j % 2 ? ro * 0.5 : ro;
    pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
  }
  return poly(pts, 'fill="#e9c97a" stroke="#9a7420" stroke-width="0.5" stroke-linejoin="round"') +
    kreis(x, y, ro * 0.22, 'fill="#fff3c4" opacity="0.8"');
}

// Fuenfzackiger Stern (Spitze)
function fuenfStern(x, y, ro, ri) {
  const pts = [];
  for (let j = 0; j < 10; j++) {
    const a = (j * 36 - 90) * RAD, r = j % 2 ? ri : ro;
    pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
  }
  return poly(pts, 'fill="#e8b83a" stroke="#9a7420" stroke-width="0.6" stroke-linejoin="round"') +
    kreis(x - ro * 0.2, y - ro * 0.2, ro * 0.22, 'fill="#fff3c4" opacity="0.7"');
}

// ---------- Zimmertanne ----------
const TANNE = { hell: '#6fae6a', mittel: '#4f8a4c', dunkel: '#3f6b45' };
const TANNE_WELK = { hell: '#c9bf8a', mittel: '#b5b07a', dunkel: '#9c8a5a' };

// Geometrie: Topf, Stamm und Etagen (oben zuerst), Spitze bei yA, Etagen enden auf dem Topfrand (-H)
function tanneGeometrie(s) {
  const H = 16, R = 13;
  const treeH = [24, 48, 72, 94][s - 1];
  const W0 = [13, 22, 30, 38][s - 1];
  const n = [3, 4, 5, 6][s - 1];
  const yA = -H - treeH;
  const step = treeH / (n + 0.6);
  const th = step * 1.6;
  const etagen = [];
  for (let i = 0; i < n; i++) {
    const ty = yA + i * step;
    etagen.push({ ty, th, W: W0 * (0.3 + 0.7 * (i + 1) / n) });
  }
  return { H, R, treeH, W0, yA, etagen };
}

// Umriss einer Etage: Spitze oben, seitlich gerundet, unten gezackt aus kurzen Bogen.
// Ergibt die ganze Form sowie die helle linke und die dunkle rechte Haelfte.
function etagenUmriss({ ty, th, W }) {
  const N = 4;
  const yb0 = ty + th * 0.78, by = ty + th, ys = ty + th * 0.28;
  const R = [];
  for (let k = 0; k <= N; k++) R.push([W * (1 - k / N), yb0 + (by - yb0) * k / N]);
  // rechte Seite: von der Seite zur Mitte unten, jede Zacke ein Bogen nach unten
  let rechts = '';
  for (let k = 0; k < N; k++) {
    const a = R[k], b = R[k + 1];
    rechts += `Q${f((a[0] + b[0]) / 2)},${f((a[1] + b[1]) / 2 + th * 0.2)} ${f(b[0])},${f(b[1])}`;
  }
  // linke Seite: von der Mitte unten zurueck nach aussen
  let links = '';
  for (let k = N - 1; k >= 0; k--) {
    const a = R[k + 1], b = R[k];
    links += `Q${f(-(a[0] + b[0]) / 2)},${f((a[1] + b[1]) / 2 + th * 0.2)} ${f(-b[0])},${f(b[1])}`;
  }
  const kopfR = `M0,${f(ty)}Q${f(W * 0.72)},${f(ys)} ${f(W)},${f(yb0)}`;
  const kopfL = `Q${f(-W * 0.72)},${f(ys)} 0,${f(ty)}`;
  return {
    voll: kopfR + rechts + links + kopfL + 'Z',
    rechts: kopfR + rechts + `L0,${f(ty)}Z`,
    links: `M0,${f(by)}` + links + kopfL + 'Z',
  };
}

// Eine Etage mit drei Gruentoenen, feinen Nadelstrichen und Kunstschnee-Hauch.
// welk: blasser, braune Nadeln (die Schiefstellung kommt von der Gruppe darum herum)
function etage(T, welk, s, z) {
  const c = welk ? TANNE_WELK : TANNE;
  const kon = welk ? KON_WELK : KON_GRUEN;
  const { ty, th, W } = T;
  const pf = etagenUmriss(T);
  let out = pfad(pf.voll, `fill="${c.mittel}"`) +
    pfad(pf.links, `fill="${c.hell}"`) +
    pfad(pf.rechts, `fill="${c.dunkel}" opacity="0.85"`) +
    pfad(pf.voll, `fill="none" ${kon}`);
  // Feine Nadelstriche als Struktur (dunkel, auf der Lichtseite zusaetzlich helle Striche)
  const nStr = [6, 10, 14, 18][s - 1];
  for (let j = 0; j < nStr; j++) {
    const t = 0.2 + z() * 0.55;
    const y = ty + th * t;
    const hw = W * Math.pow(Math.min(1, t / 0.78), 0.9);
    const x = (z() * 2 - 1) * hw * 0.8;
    const dx = 1.1 + z() * 1.2, dy = 2.6 + z() * 1.2;
    out += linie([x, y], [x + dx, y + dy], `stroke="${welk ? '#8f6446' : '#2f5a30'}" stroke-width="0.5" stroke-linecap="round" opacity="0.55"`);
    if (!welk && x < 0) {
      out += linie([x - 0.6, y - 0.4], [x - 0.6 + dx, y - 0.4 + dy], 'stroke="#9ccc7a" stroke-width="0.5" stroke-linecap="round" opacity="0.6"');
    }
  }
  // Kunstschnee-Hauch auf den Etagen (nur gruene Tanne)
  if (!welk) {
    for (let j = 0; j < 3; j++) {
      const t = 0.2 + z() * 0.3;
      const x = (z() * 2 - 1) * W * 0.5;
      out += oval(x, ty + th * t, 1.8 + z(), 0.8, 'fill="#ffffff" opacity="0.6"');
    }
  }
  return out;
}

// Punkte auf den Etagen (fuer Kugeln, Sterne): innen, nicht am Rand
function tannePunkt(etagen, z) {
  const T = etagen[Math.floor(z() * etagen.length)];
  const t = 0.3 + z() * 0.45;
  const hw = T.W * Math.pow(Math.min(1, t / 0.78), 0.9);
  return [(z() * 2 - 1) * hw * 0.7, T.ty + T.th * t];
}

// Geschenk als Quader mit Band oben und an den Seiten, Schleife oben
function geschenk(cx, cy, sz, hoehe, fa, band) {
  const x0 = cx - sz / 2, x1 = cx + sz / 2, y0 = cy - sz / 2, y1 = cy + sz / 2, z1 = hoehe;
  const [sx, sy] = P(cx, cy);
  let out = oval(sx, sy, sz * 0.95, sz * 0.45, SCHATTEN) +
    quader(x0, x1, y0, y1, 0, z1, fa) +
    // Band quer ueber den Deckel (laengs) und ueber beide Seitenflaechen
    pk([[cx - 0.9, y0, z1], [cx + 0.9, y0, z1], [cx + 0.9, y1, z1], [cx - 0.9, y1, z1]], `fill="${band}"`) +
    pk([[x1, cy - 0.9, 0], [x1, cy + 0.9, 0], [x1, cy + 0.9, z1], [x1, cy - 0.9, z1]], `fill="${band}"`) +
    pk([[cx - 0.9, y1, 0], [cx + 0.9, y1, 0], [cx + 0.9, y1, z1], [cx - 0.9, y1, z1]], `fill="${band}"`);
  // Schleife: zwei Schlaufen und ein Knoten
  const [qx, qy] = P(cx, cy, z1 + 0.5);
  out += oval(qx - 2.2, qy - 1.2, 2.6, 1.5, `transform="rotate(-30 ${f(qx - 2.2)} ${f(qy - 1.2)})" fill="${band}" stroke="#7a5a1e" stroke-width="0.5"`) +
    oval(qx + 2.2, qy - 1.2, 2.6, 1.5, `transform="rotate(30 ${f(qx + 2.2)} ${f(qy - 1.2)})" fill="${band}" stroke="#7a5a1e" stroke-width="0.5"`) +
    kreis(qx, qy, 1.1, `fill="${band}" stroke="#7a5a1e" stroke-width="0.4"`);
  return out;
}

// Drei Geschenke unter dem Baum, neben dem Topf (Positionen in der Deko-Isometrie)
function geschenke() {
  // Größer und dicht am Topf: links vorn, rechts vorn, rechts daneben (vorher zu klein und vor dem Topf verstreut)
  return geschenk(22, -4, 11, 10, { links: '#e8b85a', rechts: '#d9a441', oben: '#f0cc78' }, '#c9302c') +
    geschenk(-15, 15, 13, 12, { links: '#e0544a', rechts: '#a81e22', oben: '#ef6a5e' }, '#e8b83a') +
    geschenk(12, 19, 11, 9, { links: '#3f8a8e', rechts: '#2f6f73', oben: '#5aa2a6' }, '#f3e6cf');
}

// Zimmertanne mit Topf, Etagen und optionalem Schmuck
function zimmertanne(s, welk, schmuck) {
  const { H, R, treeH, W0, yA, etagen } = tanneGeometrie(s);
  const k = FAC[s - 1];
  const rnd = zufall(5200 + s);   // Etagen-Striche
  const zs = zufall(5300 + s);    // Schmuckpositionen
  const gid = uid('tanne-schein');
  const n = etagen.length;
  let out = `<defs><radialGradient id="${gid}"><stop offset="0" stop-color="#ffe9a8" stop-opacity="0.85"/>` +
    `<stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient></defs>` +
    topf(R, H);
  // Stamm (wird von den Etagen verdeckt)
  const stamm = `M0,${-H}L0,${f(yA + treeH * 0.5)}`;
  out += pfad(stamm, 'fill="none" stroke="#6b4a3a" stroke-width="3" stroke-linecap="round"') +
    pfad(stamm, 'fill="none" stroke="#a86b43" stroke-width="1.8" stroke-linecap="round"');
  // Etagen von unten nach oben, so liegen die oberen vorn. Welk: leicht schief.
  for (let i = n - 1; i >= 0; i--) {
    const inh = etage(etagen[i], welk, s, rnd);
    const ang = welk ? (i % 2 ? 3 : -3) : 0;
    out += ang ? gruppe(`transform="rotate(${ang} 0 ${f(etagen[i].ty)})"`, inh) : inh;
  }

  const sch = schmuck || {};
  // Lichterkette: zwei bis drei Spiralen um den Baum, Lichtpunkte mit weichem Schein
  if (sch.lichter) {
    const nSp = s >= 3 ? 3 : 2, L = [5, 7, 9, 11][s - 1], N = 60;
    const yUnten = -H - 3, yOben = yA + 4;
    const lage = (u, phase) => {
      const y = yUnten + (yOben - yUnten) * u;
      const breite = W0 * (0.25 + 0.7 * (1 - u)) * 0.92;
      const w = phase + 2.6 * 2 * Math.PI * u;
      return [breite * Math.cos(w), y, Math.sin(w)]; // dritter Wert > 0: vorn
    };
    for (let sp = 0; sp < nSp; sp++) {
      const phase = sp * 2 * Math.PI / nSp;
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const [x, y] = lage(i / N, phase);
        pts.push([x, y]);
      }
      out += pfad('M' + pts.map(p2).join('L'), 'fill="none" stroke="#c9a14a" stroke-width="0.5" opacity="0.7" stroke-linecap="round"');
      for (let j = 0; j < L; j++) {
        const [x, y, d] = lage((j + 0.5) / L, phase);
        const vorn = d > 0;
        out += kreis(x, y, 2.6 * k + 0.6, `fill="url(#${gid})" opacity="${vorn ? 1 : 0.35}"`) +
          kreis(x, y, 0.9 + 0.3 * k, `fill="#ffe9a8" stroke="#e8c86a" stroke-width="0.3" opacity="${vorn ? 1 : 0.45}"`) +
          kreis(x - 0.2, y - 0.2, 0.3, `fill="#ffffff" opacity="${vorn ? 0.9 : 0.3}"`);
      }
    }
  }
  // Kugeln rot und gold, verteilt auf den Etagen
  if (sch.kugeln) {
    const nK = [8, 9, 11, 12][s - 1], r = [1.7, 2.0, 2.4, 2.8][s - 1];
    for (let i = 0; i < nK; i++) {
      const [x, y] = tannePunkt(etagen, zs);
      out += kugelGlanz(x, y, r, i % 2 ? '#e8b83a' : '#d94b3d');
    }
  }
  // Kleine achtzackige Strohsterne
  if (sch.strohsterne) {
    const nS = [5, 6, 6, 7][s - 1], r = [2.6, 3.0, 3.4, 3.8][s - 1];
    for (let i = 0; i < nS; i++) {
      const [x, y] = tannePunkt(etagen, zs);
      out += achtStern(x, y, r);
    }
  }
  // Goldener Stern auf der Spitze
  if (sch.spitze) {
    const ro = 3 + 1.6 * k, cy = yA - ro * 0.5;
    out += kreis(0, cy, ro * 2.4, `fill="url(#${gid})"`) + fuenfStern(0, cy, ro, ro * 0.45);
  }
  // Geschenke unter dem Baum, kleiner bei kleinen Stufen
  if (sch.geschenke) out += gruppe(`transform="scale(${k})"`, geschenke());
  return out;
}

// ---------- Strohstern (haengend) ----------
// Haken wie in haengeampel (deko.js): Ring bei (0, -21.25), Ursprung = Aufhaengepunkt
const HAKEN = [0, -21.25];

// Strohstern: acht Zacken mit Doppelstreifen, rote Bindung in der Mitte, pendelt am Faden
function strohstern() {
  const R = 12, cy = 8;
  const vp = (r, a) => [r * Math.cos(a), cy + r * Math.sin(a)];
  let stern = '';
  for (let j = 0; j < 8; j++) {
    const a = (j * 45 - 90) * RAD;
    const links = Math.cos(a) <= 0.01;      // Lichtseite links, Schatten rechts
    const fa = links ? '#f3dc98' : '#d9b66a';
    stern += poly([[0, cy], vp(R * 0.5, a - 14 * RAD), vp(R, a), vp(R * 0.5, a + 14 * RAD)],
      `fill="${fa}" stroke="#8a6a2a" stroke-width="0.6" stroke-linejoin="round"`);
    // Doppelstreifen: zwei feine Linien in jeder Zacke
    for (const sd of [-1, 1]) {
      const a2 = a + sd * 7 * RAD;
      stern += linie(vp(R * 0.14, a), vp(R * 0.8, a2), 'stroke="#c9a14a" stroke-width="0.6" stroke-linecap="round"');
    }
  }
  // Rote Bindung in der Mitte mit kleiner Schleife
  stern += oval(-1.6, cy + 0.2, 1.7, 0.9, 'fill="#d94b3d" stroke="#7a1418" stroke-width="0.4" transform="rotate(-30 -1.6 ' + f(cy + 0.2) + ')"') +
    oval(1.6, cy + 0.2, 1.7, 0.9, 'fill="#d94b3d" stroke="#7a1418" stroke-width="0.4" transform="rotate(30 1.6 ' + f(cy + 0.2) + ')"') +
    kreis(0, cy, 2.2, 'fill="#c0392b" stroke="#7a1418" stroke-width="0.5"');

  const hakenRing = kreis(HAKEN[0], HAKEN[1], 1, 'fill="none" stroke="#6b4a3a" stroke-width="0.46"') +
    kreis(HAKEN[0], HAKEN[1], 1, 'fill="none" stroke="#cfd8dc" stroke-width="0.25"');
  const faden = linie(HAKEN, [0, cy - R], 'stroke="#6b4a3a" stroke-width="0.42"');
  const [hx, hy] = HAKEN;
  const pendel = `<animateTransform attributeName="transform" type="rotate" values="-4 ${hx} ${hy};4 ${hx} ${hy};-4 ${hx} ${hy}" dur="5s" repeatCount="indefinite"/>`;
  return hakenRing + `<g>${pendel}${faden}${stern}</g>`;
}

// ---------- Adventskranz ----------
// Kleiner runder Kranz auf dem Tisch: Aussenbreite 40, Ring 2:1, Kerzen auf dem Ring
function adventskranz() {
  const RX = 20, RY = 10, HK = 6;     // Aussenradius, Hoehe des Rings
  const IX = 12, IY = 6;              // Innenloch
  const MX = 16, MY = 8;              // Mitte des Rings (Kerzen, Beeren)
  const kp = (rx, ry, a, hoch = 0) => [rx * Math.cos(a * RAD), ry * Math.sin(a * RAD) - hoch];
  const ellipseOben = (rx, ry, z) =>
    `M${f(-rx)},${f(-z)}A${f(rx)},${f(ry)} 0 1 0 ${f(rx)},${f(-z)}A${f(rx)},${f(ry)} 0 1 0 ${f(-rx)},${f(-z)}Z`;
  const rnd = zufall(880);
  const TUFT = ['#3f6b45', '#4f8a4c', '#6fae6a'];
  // Ein weicher Nadelbueschel: vier kurze, leicht gebogene Striche von einem Punkt aus
  const busch = (bx, by, da, len, i) => {
    let s = '';
    for (let j = 0; j < 4; j++) {
      const w = da + (j - 1.5) * 0.4 + (rnd() - 0.5) * 0.2;
      const l = len * (0.75 + rnd() * 0.5);
      s += linie([bx + (j - 1.5) * 0.6, by], [bx + Math.cos(w) * l, by + Math.sin(w) * l],
        `stroke="${TUFT[(i + j) % 3]}" stroke-width="2.2" stroke-linecap="round"`);
    }
    return s;
  };

  // Schatten am Boden und Loch
  let out = kontakt(RX + 3, RY + 1.5) + oval(0, 0, IX, IY, 'fill="#6b4a3a" opacity="0.3"');
  // Seitenband: nur die vordere Haelfte ist sichtbar
  const seite = [];
  for (let a = 0; a <= 180; a += 10) seite.push(kp(RX, RY, a, 0));
  for (let a = 180; a >= 0; a -= 10) seite.push(kp(RX, RY, a, HK));
  out += pfad('M' + seite.map(p2).join('L') + 'Z', `fill="#3f6b45" ${KON_GRUEN}`);
  // Hinterer Innenrand, durch das Loch sichtbar
  const innen = [];
  for (let a = 180; a <= 360; a += 10) innen.push(kp(IX, IY, a, HK));
  for (let a = 360; a >= 180; a -= 10) innen.push(kp(IX, IY, a, 0));
  out += pfad('M' + innen.map(p2).join('L') + 'Z', 'fill="#2f5a30"');
  // Oberseite des Rings mit Loch (Evenodd)
  out += pfad(ellipseOben(RX, RY, HK) + ellipseOben(IX, IY, HK), `fill="#4f8a4c" fill-rule="evenodd" ${KON_GRUEN}`);
  // Tannengruen: Buescheln auf der Oberseite
  for (let i = 0; i < 34; i++) {
    const a = (i + rnd() * 0.7) / 34 * 360;
    const t = 0.92 + rnd() * 0.16;
    const [bx, by] = kp(MX * t, MY * t, a, HK);
    const da = Math.atan2(Math.sin(a * RAD) * 0.5 - 0.4, Math.cos(a * RAD));
    out += busch(bx, by, da, 4.5 + rnd() * 2, i);
  }
  // Buescheln an der vorderen Seite, nach unten haengend
  for (let i = 0; i < 14; i++) {
    const a = 10 + (i + rnd() * 0.6) / 14 * 160;
    const [bx, by] = kp(RX - 0.6, RY - 0.3, a, HK * 0.5);
    const da = Math.atan2(0.9, Math.cos(a * RAD) * 0.6);
    out += busch(bx, by, da, 3.5, i + 1);
  }
  // Rote Beeren zwischen dem Gruen
  for (const a of [20, 70, 160, 250, 290, 340]) {
    const [x, y] = kp(MX, MY, a, HK + 0.5);
    out += kugelGlanz(x, y, 1.5, '#d94b3d');
  }
  // Zimtstange vorn auf dem Ring
  const [z1x, z1y] = kp(MX, MY, 78, HK), [z2x, z2y] = kp(MX, MY, 104, HK);
  out += linie([z1x, z1y], [z2x, z2y], 'stroke="#5a3a20" stroke-width="3.4" stroke-linecap="round"') +
    linie([z1x, z1y], [z2x, z2y], 'stroke="#a86b43" stroke-width="2.4" stroke-linecap="round"') +
    linie([z1x, z1y - 0.9], [z2x, z2y - 0.9], 'stroke="#e2b07c" stroke-width="0.8" stroke-linecap="round" opacity="0.7"');

  // Vier Kerzen (hintere zuerst)
  const kerzen = [[-135, 11], [-45, 14], [45, 12], [135, 15]];
  kerzen.sort((p, q) => Math.sin(p[0] * RAD) - Math.sin(q[0] * RAD));
  for (const [a, h] of kerzen) {
    const [x, y] = kp(MX, MY, a, HK);
    out += kerze(x, y, h);
  }
  // Goldene Schleife vorn links
  const [bx, by] = kp(RX - 2, RY - 1, 150, HK * 0.5);
  out += oval(bx - 2.2, by - 0.8, 2.8, 1.6, `transform="rotate(-30 ${f(bx - 2.2)} ${f(by - 0.8)})" fill="#e8b83a" stroke="#9a7420" stroke-width="0.5"`) +
    oval(bx + 2.2, by - 0.8, 2.8, 1.6, `transform="rotate(30 ${f(bx + 2.2)} ${f(by - 0.8)})" fill="#e8b83a" stroke="#9a7420" stroke-width="0.5"`) +
    pfad(`M${f(bx)},${f(by)}Q${f(bx - 2)},${f(by + 3)} ${f(bx - 4)},${f(by + 6)}`, 'fill="none" stroke="#e8b83a" stroke-width="1.5" stroke-linecap="round"') +
    pfad(`M${f(bx)},${f(by)}Q${f(bx + 1.5)},${f(by + 3)} ${f(bx + 3)},${f(by + 6)}`, 'fill="none" stroke="#c9a14a" stroke-width="1.5" stroke-linecap="round"') +
    kreis(bx, by, 1.2, 'fill="#c9a14a" stroke="#7a5a1e" stroke-width="0.4"');
  return out;
}

// Kerze auf dem Kranz: creme Koerper mit Licht links, Docht, Flamme mit Schein. (x, yb) = Standflaeche
function kerze(x, yb, h) {
  const w = 1.8, yt = yb - h, fy = yt - 1.4;
  const gid = uid('kerze-schein');
  return `<defs><radialGradient id="${gid}"><stop offset="0" stop-color="#ffd23f" stop-opacity="0.7"/>` +
    `<stop offset="1" stop-color="#ffd23f" stop-opacity="0"/></radialGradient></defs>` +
    oval(x, yb + 0.2, w + 1, 0.9, SCHATTEN) +
    pfad(`M${f(x - w)},${f(yt)}L${f(x - w)},${f(yb)}L${f(x + w)},${f(yb)}L${f(x + w)},${f(yt)}Z`, 'fill="#f3e6cf"') +
    pfad(`M${f(x - w)},${f(yt)}L${f(x - w)},${f(yb)}L${f(x - w * 0.3)},${f(yb)}L${f(x - w * 0.3)},${f(yt)}Z`, 'fill="#fdf8ec" opacity="0.8"') +
    pfad(`M${f(x + w * 0.4)},${f(yt)}L${f(x + w * 0.4)},${f(yb)}L${f(x + w)},${f(yb)}L${f(x + w)},${f(yt)}Z`, 'fill="#d8c29c"') +
    pfad(`M${f(x - w)},${f(yt)}L${f(x - w)},${f(yb)}L${f(x + w)},${f(yb)}L${f(x + w)},${f(yt)}Z`, 'fill="none" stroke="#8a7a60" stroke-width="0.5" stroke-linejoin="round"') +
    oval(x, yt, w, 0.9, 'fill="#fff8e6" stroke="#8a7a60" stroke-width="0.4"') +
    linie([x, yt], [x, fy], 'stroke="#3a2a1a" stroke-width="0.6" stroke-linecap="round"') +
    kreis(x, fy - 2.6, 5.5, `fill="url(#${gid})"`) +
    pfad(`M${f(x)},${f(fy - 6)}Q${f(x + 2)},${f(fy - 2.5)} ${f(x)},${f(fy)}Q${f(x - 2)},${f(fy - 2.5)} ${f(x)},${f(fy - 6)}Z`, 'fill="#ffb347" stroke="#c4602a" stroke-width="0.4"') +
    pfad(`M${f(x)},${f(fy - 4.2)}Q${f(x + 0.9)},${f(fy - 2.5)} ${f(x)},${f(fy - 1.2)}Q${f(x - 0.9)},${f(fy - 2.5)} ${f(x)},${f(fy - 4.2)}Z`, 'fill="#fff3b0"');
}

// ---------- Schneekugel (exklusiv, Adventskalender Tag 24) ----------
// Glasglobus auf Teak-Sockel mit Messingband, darin ein kleines Gewaechshaus im Schnee und fallende Flocken
function schneekugel() {
  const glas = uid('kugel-glas'), klip = uid('kugel-klip');
  const cx = 0, cy = -19, R = 12;
  // Zylinder mit Ellipsenboden und -deckel (z nach oben, Ursprung Mitte Bodenkontakt)
  const zyl = (rx, ry, z0, z1) =>
    `M${f(-rx)},${f(-z1)}L${f(-rx)},${f(-z0)}A${f(rx)},${f(ry)} 0 0 0 ${f(rx)},${f(-z0)}L${f(rx)},${f(-z1)}A${f(rx)},${f(ry)} 0 0 1 ${f(-rx)},${f(-z1)}Z`;
  const hp = (a) => [9.6 * Math.cos(a * RAD), cy + 9.6 * Math.sin(a * RAD)];
  const rnd = zufall(2424);

  let out = kontakt(14, 6) +
    // Teak-Sockel mit Maserung und hellem Streifen links
    pfad(zyl(11, 5.5, 0, 6), `fill="#a86b43" ${KON_DEKO}`) +
    pfad('M-9,-1L-9,-5', 'fill="none" stroke="#e2b07c" stroke-width="1.2" stroke-linecap="round" opacity="0.6"') +
    pfad('M-6,-2.5Q0,-1.5 6,-2.5', 'fill="none" stroke="#8f5a35" stroke-width="0.5" opacity="0.7"') +
    pfad('M-7,-4.2Q0,-3.4 7,-4.2', 'fill="none" stroke="#8f5a35" stroke-width="0.5" opacity="0.7"') +
    oval(0, -6, 11, 5.5, `fill="#c98f5a" ${KON_DEKO}`) +
    // Messingband um den Sockel
    pfad(zyl(11.4, 5.7, 2.2, 3.4), 'fill="#c9a14a" stroke="#7a5a1e" stroke-width="0.8" stroke-linejoin="round"') +
    pfad('M-10.5,-3.4Q0,7 10.5,-3.4', 'fill="none" stroke="#f0d27a" stroke-width="0.8" stroke-linecap="round" opacity="0.8"') +
    // Halterung unter der Kugel
    pfad(zyl(6.6, 3.3, 6, 8), `fill="#c9a14a" ${KON_DEKO}`);

  // Glaskugel: Verlauf fuer Glas, Klippe fuer den Inhalt
  out += `<defs><radialGradient id="${glas}" cx="0.35" cy="0.3" r="0.8">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/>` +
    `<stop offset="0.6" stop-color="#d4eef7" stop-opacity="0.35"/>` +
    `<stop offset="1" stop-color="#8fc7dc" stop-opacity="0.5"/></radialGradient>` +
    `<clipPath id="${klip}"><circle cx="${cx}" cy="${cy}" r="11.2"/></clipPath></defs>` +
    kreis(cx, cy, R, `fill="url(#${glas})" stroke="#7fb6c9" stroke-width="0.9"`);

  // Inhalt im Glas: Schneehuegel, kleines Gewaechshaus, fallende Flocken
  let inhalt = oval(0, -10.2, 10, 3.4, 'fill="#ffffff"') +
    pfad('M-9,-9.5Q0,-6.5 9,-9.5', 'fill="none" stroke="#c4d6e0" stroke-width="0.6"') +
    // Gewaechshaus: Glaswand, Dach, Sprossen, Pflanzen
    poly([[-4.5, -10], [4.5, -10], [4.5, -15.5], [-4.5, -15.5]], 'fill="#e6f6fb" opacity="0.85" stroke="#6b4a3a" stroke-width="0.4" stroke-linejoin="round"') +
    poly([[-4.8, -15.5], [4.8, -15.5], [0, -19.8]], 'fill="#dfeff5" stroke="#6b4a3a" stroke-width="0.4" stroke-linejoin="round"') +
    linie([-1.5, -10], [-1.5, -15.5], 'stroke="#7fb6c9" stroke-width="0.35"') +
    linie([1.5, -10], [1.5, -15.5], 'stroke="#7fb6c9" stroke-width="0.35"') +
    oval(-2.2, -11.6, 1.6, 1.1, 'fill="#5e9a52"') +
    oval(1.8, -11.4, 1.9, 1.2, 'fill="#7fb069"') +
    oval(0, -17.9, 1.8, 0.6, 'fill="#ffffff"');
  // Flocken: langsam fallend, Start oben im Glas
  for (let i = 0; i < 7; i++) {
    const x = (rnd() * 2 - 1) * 7;
    const y0 = -28 + rnd() * 8;
    const dist = 14 + rnd() * 4;
    const dx = (rnd() * 2 - 1) * 1.2;
    const dur = (4.5 + rnd() * 3).toFixed(1);
    const delay = (rnd() * 4).toFixed(1);
    const r = 0.7 + rnd() * 0.4;
    inhalt += `<g transform="translate(${f(x)},${f(y0)})"><g>` +
      `<animateTransform attributeName="transform" type="translate" values="0,0;${f(dx)},${f(dist)}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>` +
      kreis(0, 0, r, 'fill="#ffffff" stroke="#b9ccd6" stroke-width="0.25"') +
      `</g></g>`;
  }
  out += gruppe(`clip-path="url(#${klip})"`, inhalt);
  // Glasrand und Glanzlichter
  out += kreis(cx, cy, R, 'fill="none" stroke="#7fb6c9" stroke-width="0.9"') +
    pfad(`M${p2(hp(200))}A9.6,9.6 0 0 1 ${p2(hp(250))}`, 'fill="none" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity="0.85"') +
    oval(-5.4, -25.6, 2.2, 1, 'fill="#ffffff" opacity="0.9" transform="rotate(-35 -5.4 -25.6)"') +
    pfad(`M${p2(hp(60))}A9.6,9.6 0 0 1 ${p2(hp(100))}`, 'fill="none" stroke="#ffffff" stroke-width="0.7" stroke-linecap="round" opacity="0.35"');
  return out;
}

export const WINTER = {
  zimmertanne: {
    name: 'Zimmertanne', art: 'pflanze', groesse: 'gross', saison: 'winter',
    zeichne: (stufe = 1, welk = false, ebene = 'boden', schmuck = {}) => zimmertanne(stufeN(stufe), welk, schmuck || {}),
  },
  strohstern: { name: 'Strohstern', art: 'deko', saison: 'winter', haengend: true, zeichne: () => strohstern() },
  adventskranz: { name: 'Adventskranz', art: 'deko', saison: 'winter', zeichne: () => adventskranz() },
  schneekugel: { name: 'Schneekugel', art: 'deko', saison: 'winter', zeichne: () => schneekugel() },
};
