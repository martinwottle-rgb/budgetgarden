// Moebel als SVG-Strings. zeichne(gx, gy, drehung) zeichnet in absoluten iso()-Koordinaten.
// Lokal: u = Laenge entlang breite, v = Tiefe entlang tiefe. drehung 0: u auf gx, v auf gy.
// drehung 90: u auf gy, v auf gx. Plaetze (dx, dy, z) liegen im lokalen System, z in px.

import { kiste, iso, f, p2, poly, pfad, linie, oval, gruppe, tr, bodenschatten, gerundet } from './hilfen.js';

// Lokale Koordinaten auf Feldkoordinaten abbilden
export function feldPunkt(gx, gy, drehung, u, v) {
  return drehung === 90 ? [gx + v, gy + u] : [gx + u, gy + v];
}

// Quader in lokalen Koordinaten, intern als Feldkiste gezeichnet
function kasten(m, u0, u1, v0, v1, z0, z1, farben) {
  const a = feldPunkt(m.gx, m.gy, m.drehung, u0, v0);
  const b = feldPunkt(m.gx, m.gy, m.drehung, u1, v1);
  return kiste(Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1]), z0, z1, farben);
}

// Stellplatz n eines Moebels in Feldkoordinaten plus Hoehe z
export function platzFeld(m, n) {
  const def = MOEBEL[m.typ];
  const p = def && def.plaetze[n];
  if (!p) return null;
  const [gx, gy] = feldPunkt(m.gx, m.gy, m.drehung, p.dx, p.dy);
  return { gx, gy, z: p.z };
}

// Schmales offenes Holzregal: zwei Seitenwangen, drei Bretter (Oberseiten z = 4, 65, 130)
function regalZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const holz = { oben: '#e8b98a', links: '#b87d4b', rechts: '#c98f5a' };
  let s = kasten(m, 0, 0.1, 0.1, 0.55, 0, 130, holz) + kasten(m, 2.9, 3.0, 0.1, 0.55, 0, 130, holz);
  for (const z of [0, 61, 126]) s += kasten(m, 0, 3.0, 0.1, 0.55, z, z + 4, holz);
  // Kleine Buecher auf dem mittleren Brett
  const buecher = [[0.2, 0.34, 26, '#c97b6b'], [0.38, 0.5, 32, '#8fb3a0'], [0.54, 0.68, 22, '#e7c27a'], [2.0, 2.14, 30, '#e7c27a'], [2.18, 2.32, 24, '#c97b6b']];
  for (const [u0, u1, h, c] of buecher) s += kasten(m, u0, u1, 0.18, 0.46, 65, 65 + h, { oben: c, links: c, rechts: c });
  return s;
}

// Pflanzentisch Naturholz: vier Beine, Platte
function tischZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const beine = [[0.1, 0.15], [3.5, 0.15], [0.1, 0.8], [3.5, 0.8]]
    .map(([u, v]) => kasten(m, u - 0.06, u + 0.06, v - 0.06, v + 0.06, 0, 70, { oben: '#b87d4b', links: '#b87d4b', rechts: '#a86b43' }))
    .join('');
  return beine + kasten(m, 0, 3.6, 0.1, 0.9, 70, 76, { oben: '#e8b98a', links: '#b87d4b', rechts: '#c98f5a' });
}

// ---------- Neue Moebel: Hilfen ----------
// Kontur 1.2 px (Vorgabe fuer die neuen Moebel). kiste() aus hilfen.js bleibt unveraendert bei 1.5 px.
const KON12 = 'stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';
const MASER = 'stroke="#a86b43" stroke-width="0.7" stroke-linecap="round" opacity="0.7"';
const FUGE = 'stroke="#9c978c" stroke-width="0.9" stroke-linecap="round"';
const HOLZ = { oben: '#e2b07c', links: '#c98f5a', rechts: '#a86b43' };
const METALL = { oben: '#7a7a80', links: '#4a4a4f', rechts: '#34343a' };
const LACK = { oben: '#ffffff', links: '#f6f1e7', rechts: '#ddd5c5' };
const STEIN = { oben: '#e9e6e0', links: '#d9d6cf', rechts: '#b9b5ac' };

// Bildschirmpunkt einer lokalen Koordinate (u, v) in der Hoehe z
function pkt(m, u, v, z) {
  const [x, y] = feldPunkt(m.gx, m.gy, m.drehung, u, v);
  return iso(x, y, z);
}

// Weltgrenzen [x0, x1, y0, y1] eines lokalen Rechtecks
function grenzen(m, u0, u1, v0, v1) {
  const a = feldPunkt(m.gx, m.gy, m.drehung, u0, v0);
  const b = feldPunkt(m.gx, m.gy, m.drehung, u1, v1);
  return [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])];
}

// Quader mit Kontur 1.2 px. farben: oben (Licht), links (+gy, Grundton), rechts (+gx, Schatten)
function quader(m, u0, u1, v0, v1, z0, z1, farben) {
  const [x0, x1, y0, y1] = grenzen(m, u0, u1, v0, v1);
  return poly([iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)], `fill="${farben.links}" ${KON12}`) +
    poly([iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)], `fill="${farben.rechts}" ${KON12}`) +
    poly([iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)], `fill="${farben.oben}" ${KON12}`);
}

// Linienzug aus Bildschirmpunkten
function linienzug(pts, attr) {
  return pfad(pts.map((p, i) => (i ? 'L' : 'M') + p2(p)).join(''), `fill="none" ${attr}`);
}

// Maserung: Linien entlang der langen Seite auf der Deckflaeche, bei hohen Teilen auch waagerecht auf den Sichtflaechen
function maser(m, u0, u1, v0, v1, z0, z1, n = 2) {
  const [x0, x1, y0, y1] = grenzen(m, u0, u1, v0, v1);
  const lang = x1 - x0 >= y1 - y0;
  let s = '';
  for (let k = 1; k <= n; k++) {
    const t = k / (n + 1);
    if (lang) {
      const y = y0 + (y1 - y0) * t;
      s += linie(iso(x0 + 0.08, y, z1), iso(x1 - 0.08, y, z1), MASER);
    } else {
      const x = x0 + (x1 - x0) * t;
      s += linie(iso(x, y0 + 0.08, z1), iso(x, y1 - 0.08, z1), MASER);
    }
  }
  if (z1 - z0 >= 10) {
    for (const t of [1 / 3, 2 / 3]) {
      const z = z0 + (z1 - z0) * t;
      s += linie(iso(x0, y1, z), iso(x1, y1, z), MASER) + linie(iso(x1, y0, z), iso(x1, y1, z), MASER);
    }
  }
  return s;
}

// Glanzstreifen auf der Vorderseite (links, +gy) eines Metallteils
function glanz(m, u0, u1, v0, v1, z0, z1) {
  const [x0, x1, , y1] = grenzen(m, u0, u1, v0, v1);
  const x = x0 + (x1 - x0) * 0.3;
  return linie(iso(x, y1, z0 + 3), iso(x, y1, z1 - 3), 'stroke="#8a8a92" stroke-width="1.1" stroke-linecap="round" opacity="0.9"');
}

// Metallpfosten mit Glanzstreifen
function pfosten(m, u0, u1, v0, v1) {
  return quader(m, u0, u1, v0, v1, 0, 141, METALL) + glanz(m, u0, u1, v0, v1, 0, 141);
}

// Prisma: Profil [v, z] in der Ebene senkrecht zu u, von u0 bis u1 extrudiert (fuer schraege Holme).
// Sichtbar ist eine Flaeche, wenn ihre Weltnormale n mit n . (1, 1, 48) > 0 (Blick von +gx, +gy, oben).
function prisma(m, u0, u1, profil, farben) {
  const n = profil.length;
  const cv = profil.reduce((s, p) => s + p[0], 0) / n;
  const cz = profil.reduce((s, p) => s + p[1], 0) / n;
  // Lokale Normale (nu, nv, nz) in Weltnormale umrechnen
  const welt = (nu, nv, nz) => (m.drehung === 90 ? [nv, nu, nz] : [nu, nv, nz]);
  const flaeche = (pts, w) => {
    if (w[0] + w[1] + 48 * w[2] <= 0) return '';
    const farbe = w[2] > 0.7 ? farben.oben : Math.abs(w[0]) > Math.abs(w[1]) ? farben.rechts : farben.links;
    return poly(pts, `fill="${farbe}" ${KON12}`);
  };
  let s = flaeche(profil.map(([v, z]) => pkt(m, u0, v, z)), welt(-1, 0, 0));
  for (let i = 0; i < n; i++) {
    const p = profil[i], q = profil[(i + 1) % n];
    let nv = q[1] - p[1], nz = -(q[0] - p[0]);
    const mv = (p[0] + q[0]) / 2 - cv, mz = (p[1] + q[1]) / 2 - cz;
    if (nv * mv + nz * mz < 0) { nv = -nv; nz = -nz; }
    const len = Math.hypot(nv, nz) || 1;
    s += flaeche([pkt(m, u0, p[0], p[1]), pkt(m, u1, p[0], p[1]), pkt(m, u1, q[0], q[1]), pkt(m, u0, q[0], q[1])], welt(0, nv / len, nz / len));
  }
  s += flaeche(profil.map(([v, z]) => pkt(m, u1, v, z)), welt(1, 0, 0));
  return s;
}

// Kontaktschatten unter einer Grundflaeche b x t (Felder), Mittelpunkt im Feldmittelpunkt
function schatten(m, b, t) {
  const [x, y] = feldPunkt(m.gx, m.gy, m.drehung, b / 2, t / 2);
  return gruppe(tr(iso(x, y, 0)), bodenschatten(24 * (b + t) * 0.9, 12 * (b + t) * 0.9));
}

// Senkrechter Zylinder um (cx, cy) mit Radius r (Felder), Hoehe z0 bis z1. Licht links, Schatten rechts.
function zylinder(cx, cy, r, z0, z1, farben) {
  const [ox, oy] = iso(cx, cy, 0);
  const rx = 48 * Math.SQRT2 * r, ry = 24 * Math.SQRT2 * r;
  const yT = oy - z1, yB = oy - z0;
  const seite = `M${p2([ox - rx, yT])}A${f(rx)},${f(ry)} 0 0 0 ${p2([ox + rx, yT])}L${p2([ox + rx, yB])}A${f(rx)},${f(ry)} 0 0 1 ${p2([ox - rx, yB])}Z`;
  const schattenseite = `M${p2([ox, yT - ry])}A${f(rx)},${f(ry)} 0 0 1 ${p2([ox, yT + ry])}L${p2([ox, yB + ry])}A${f(rx)},${f(ry)} 0 0 0 ${p2([ox, yB - ry])}Z`;
  let s = pfad(seite, `fill="${farben.links}"`) + pfad(schattenseite, `fill="${farben.rechts}"`) + pfad(seite, `fill="none" ${KON12}`);
  s += oval(ox, yT, rx, ry, `fill="${farben.oben}" ${KON12}`);
  for (const k of [-0.4, 0.4]) {
    const hw = 0.8 * rx * Math.sqrt(1 - k * k);
    s += linie([ox - hw, yT + ry * k], [ox + hw, yT + ry * k], MASER);
  }
  return s;
}

// Gedrechseltes Bein: Rotationskoerper senkrecht ab Standpunkt (bx, by). profil: [Hoehe, Radius], aufsteigend
function drechsel(bx, by, profil, farben) {
  const H = profil[profil.length - 1][0];
  const radius = (h) => {
    for (let i = 1; i < profil.length; i++) {
      const [h0, r0] = profil[i - 1], [h1, r1] = profil[i];
      if (h <= h1) return r0 + (r1 - r0) * (h - h0) / ((h1 - h0) || 1);
    }
    return profil[profil.length - 1][1];
  };
  const hs = [];
  for (let h = 0; h < H; h += 1) hs.push(h);
  hs.push(H);
  const rechts = hs.map((h) => [bx + radius(h), by - h]);
  const links = hs.map((h) => [bx - radius(h), by - h]).reverse();
  const mitte = hs.map((h) => [bx, by - h]);
  const r0 = radius(0);
  // Fussscheibe, Koerper hell, rechte Haelfte dunkler, Kontur, Glanzlinie links
  let s = oval(bx, by, r0, r0 * 0.5, `fill="${farben.rechts}" ${KON12}`);
  s += poly([...rechts, ...links], `fill="${farben.links}"`);
  s += poly([...mitte, ...rechts.slice().reverse()], `fill="${farben.rechts}"`);
  s += poly([...rechts, ...links], `fill="none" ${KON12}`);
  s += linienzug(hs.filter((h) => h >= 2 && h <= H - 2).map((h) => [bx - radius(h) * 0.5, by - h]),
    'stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.9"');
  return s;
}

// Pflanzentisch Weiss: gedrechselte Beine, untere Ablage, lackierte Platte
function tischWeissZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const profil = [[0, 4.6], [2, 5.4], [4, 5], [7, 3.2], [11, 3], [17, 3.8], [23, 5], [29, 4], [35, 2.8], [45, 2.8], [50, 3.4], [55, 4.8], [60, 3.4], [66, 3], [70, 3.4]];
  const bein = (u, v) => {
    const [bx, by] = pkt(m, u, v, 0);
    return drechsel(bx, by, profil, LACK);
  };
  let s = schatten(m, 3, 1);
  // Hintere Beine, untere Ablage, vordere Beine, Platte
  s += bein(0.15, 0.15) + bein(2.85, 0.15);
  s += quader(m, 0.15, 2.85, 0.15, 0.85, 14, 17, LACK);
  s += bein(0.15, 0.85) + bein(2.85, 0.85);
  s += quader(m, 0, 3, 0, 1, 70, 76, LACK);
  // Glanzlicht entlang der vorderen Plattenkante
  const [x0, x1, , y1] = grenzen(m, 0, 3, 0, 1);
  s += linie(iso(x0, y1, 74.5), iso(x1, y1, 74.5), 'stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.8"');
  return s;
}

// Leiterregal: zwei schraege Holme (hinten hoeher), drei Stufenbretter mit abnehmender Tiefe
function leiterZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const vf = (z) => 0.95 - 0.55 * z / 150; // Vorderkante der Holme je Hoehe: lehnt nach hinten
  const holm = [[vf(0), 0], [vf(150), 150], [vf(150) - 0.1, 150], [vf(0) - 0.1, 0]];
  const maserHolm = (u) => linienzug([12, 50, 90, 130, 148].map((z) => pkt(m, u, vf(z) - 0.01, z)),
    'stroke="#a86b43" stroke-width="0.7" stroke-linecap="round" opacity="0.7"');
  let s = schatten(m, 1, 1);
  s += prisma(m, 0, 0.1, holm, HOLZ) + maserHolm(0.05);
  // Stufen von hinten (oben) nach vorn (unten): Vorderkante bündig an den Holmen, Tiefe nimmt nach oben ab
  for (const [zk, D] of [[130, 0.46], [85, 0.52], [40, 0.62]]) {
    const vn = vf(zk);
    s += quader(m, 0.1, 0.9, vn - D, vn, zk, zk + 4, HOLZ) + maser(m, 0.1, 0.9, vn - D, vn, zk, zk + 4, 2);
  }
  s += prisma(m, 0.9, 1, holm, HOLZ) + maserHolm(0.95);
  return s;
}

// Blumenhocker: runder Holzhocker mit drei schraegen Beinen
function hockerZeichnen(gx, gy) {
  const cx = gx + 0.5, cy = gy + 0.5;
  let s = gruppe(tr(iso(cx, cy, 0)), bodenschatten(34, 17));
  // Beine: hinten zuerst, das vordere (90 Grad) zuletzt
  for (const w of [210, 330, 90]) {
    const a = w * Math.PI / 180;
    const c = Math.cos(a), sn = Math.sin(a);
    const oben = iso(cx + 0.3 * c, cy + 0.3 * sn, 41);
    const unten = iso(cx + 0.46 * c, cy + 0.46 * sn, 0);
    s += oval(unten[0], unten[1], 2.8, 1.4, 'fill="#6b4a3a" opacity="0.4"');
    s += linie(oben, unten, 'stroke="#6b4a3a" stroke-width="5" stroke-linecap="round"');
    s += linie(oben, unten, 'stroke="#a86b43" stroke-width="3.4" stroke-linecap="round"');
    s += linie([oben[0] - 0.7, oben[1]], [unten[0] - 0.7, unten[1]], 'stroke="#e2b07c" stroke-width="0.9" stroke-linecap="round" opacity="0.9"');
  }
  // Sitzflaeche als Holzscheibe
  s += zylinder(cx, cy, 0.42, 41, 45, HOLZ);
  return s;
}

// Holzkiste: Obstkiste aus Latten mit Spalten, Griffloecher auf zwei Sichtseiten, Deckel aus drei Latten
function kisteZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const innen = { oben: '#8a6a4a', links: '#6e4f36', rechts: '#5a3f2c' };
  let s = schatten(m, 1, 1);
  s += quader(m, 0, 1, 0, 1, 0, 29, innen);
  // Latten: rechte Wand zuerst, dann vordere Wand (liegt vorn), Spalten zeigen den dunklen Innenraum
  for (const [z0, z1] of [[0, 5], [6, 11], [12, 17], [18, 23], [24, 29]]) {
    s += quader(m, 0.9, 1, 0, 0.9, z0, z1, HOLZ);
    s += quader(m, 0, 1, 0.9, 1, z0, z1, HOLZ);
  }
  // Griffloecher auf der vorderen (+gy) und rechten (+gx) Sichtseite
  const [x0, x1, y0, y1] = grenzen(m, 0, 1, 0, 1);
  const griff = (pts) => pfad(gerundet(pts, 1.6), 'fill="#3d2b20" stroke="#6b4a3a" stroke-width="0.8"');
  s += griff([iso(x0 + 0.42 * (x1 - x0), y1, 13), iso(x0 + 0.58 * (x1 - x0), y1, 13), iso(x0 + 0.58 * (x1 - x0), y1, 16), iso(x0 + 0.42 * (x1 - x0), y1, 16)]);
  s += griff([iso(x1, y0 + 0.42 * (y1 - y0), 13), iso(x1, y0 + 0.58 * (y1 - y0), 13), iso(x1, y0 + 0.58 * (y1 - y0), 16), iso(x1, y0 + 0.42 * (y1 - y0), 16)]);
  // Deckel: drei Latten mit Spalten, darauf der Stellplatz
  for (const [v0, v1] of [[0, 0.32], [0.36, 0.64], [0.68, 1]]) {
    s += quader(m, 0, 1, v0, v1, 29, 31, HOLZ) + maser(m, 0, 1, v0, v1, 29, 31, 1);
  }
  return s;
}

// Steinsockel: quadratische Saeule aus hellem Stein mit Sockel, Deckplatte, Fugen und Moos am Fuss
function steinZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const [x0, x1, y0, y1] = grenzen(m, 0.04, 0.96, 0.04, 0.96);
  const xm = (fx) => x0 + (x1 - x0) * fx, ym = (fx) => y0 + (y1 - y0) * fx;
  let s = schatten(m, 1, 1);
  s += quader(m, 0, 1, 0, 1, 0, 4, STEIN);
  s += quader(m, 0.04, 0.96, 0.04, 0.96, 4, 52, STEIN);
  s += quader(m, 0, 1, 0, 1, 52, 56, STEIN);
  // Lagen: waagerechte Fugen bei 19 und 36, senkrechte Stoesse in jeder Lage versetzt
  for (const z of [19, 36]) s += linie(iso(x0, y1, z), iso(x1, y1, z), FUGE) + linie(iso(x1, y0, z), iso(x1, y1, z), FUGE);
  for (const [z0, z1, stoss] of [[4, 19, [0.5]], [19, 36, [0.25, 0.75]], [36, 52, [0.5]]]) {
    for (const fx of stoss) {
      s += linie(iso(xm(fx), y1, z0), iso(xm(fx), y1, z1), FUGE);
      s += linie(iso(x1, ym(fx), z0), iso(x1, ym(fx), z1), FUGE);
    }
  }
  // Moosandeutung am Fuss
  const flecken = [
    [iso(xm(0.18), y1, 3), 6, 3, '#7fb069'], [iso(xm(0.5), y1, 1.5), 5, 2.4, '#5e9a52'], [iso(xm(0.84), y1, 4), 5, 2.6, '#7fb069'],
    [iso(x1, ym(0.3), 2.5), 4.5, 2.2, '#5e9a52'], [iso(x1, ym(0.72), 5), 5, 2.6, '#7fb069'],
  ];
  for (const [[px, py], rx, ry, c] of flecken) s += oval(px, py, rx, ry, `fill="${c}" stroke="#4f8a4a" stroke-width="0.6"`);
  return s;
}

// Metallregal: schwarzes Gestell mit vier Pfosten, Querstreben und drei Holzbrettern
function metallZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const zb = [18, 76, 134]; // Unterkanten der Bretter
  let s = schatten(m, 2, 1);
  s += pfosten(m, 0.02, 0.08, 0.02, 0.08);
  for (const z of zb) s += quader(m, 0.08, 1.92, 0.03, 0.07, z - 3, z, METALL);
  for (const z of zb) s += quader(m, 0.03, 0.07, 0.08, 0.92, z - 3, z, METALL);
  s += pfosten(m, 1.92, 1.98, 0.02, 0.08);
  for (const z of zb) s += quader(m, 0.08, 1.92, 0.08, 0.92, z, z + 4, HOLZ) + maser(m, 0.08, 1.92, 0.08, 0.92, z, z + 4, 2);
  for (const z of zb) s += quader(m, 1.93, 1.97, 0.08, 0.92, z - 3, z, METALL);
  for (const z of zb) s += quader(m, 0.08, 1.92, 0.93, 0.97, z - 3, z, METALL);
  s += pfosten(m, 0.02, 0.08, 0.92, 0.98);
  s += pfosten(m, 1.92, 1.98, 0.92, 0.98);
  return s;
}

// ---------- Neue Moebel (Teil 2): Ziegelbrett, Gaertnertisch, Wandregal, Rattan-Etagere ----------
const ZIEGEL = { oben: '#cf7a57', links: '#b85c3c', rechts: '#9a4a2e' };
const FICHTE = { oben: '#f3d9ae', links: '#e0bd8a', rechts: '#c9a06e' };
const GUSS = { oben: '#6f8f7a', links: '#3f5a48', rechts: '#2f4538' };
const RATTAN = { oben: '#e9bd86', links: '#d9a56b', rechts: '#b8844f' };
const HOLZ_DUNKEL = { oben: '#c98f5a', links: '#a86b43', rechts: '#8f5a35' };
const LOCH = 'fill="#5a2e1c" stroke="#3d1f12" stroke-width="0.6"';
let musterZaehler = 0;

// Farben lokaler Seiten: lokal +v liegt je nach Drehung auf +gy (links) oder +gx (rechts), lokal +u umgekehrt
const farbeV = (m, farben) => (m.drehung === 90 ? farben.rechts : farben.links);
const farbeU = (m, farben) => (m.drehung === 90 ? farben.links : farben.rechts);

// Ellipse in der waagerechten Ebene z (lokal, Radien ru, rv in Feldern), als Polygon
function ellipseAuf(m, u, v, z, ru, rv, attr, n = 16) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 2 * Math.PI;
    pts.push(pkt(m, u + ru * Math.cos(a), v + rv * Math.sin(a), z));
  }
  return poly(pts, attr);
}

// Gebogenes Rohr entlang von Bildschirmpunkten: Kontur, Koerper in farben.links, Glanzlinie in farben.oben
function rohr(punkte, dicke, farben, zusatz = '') {
  const d = punkte.map((p, i) => (i ? 'L' : 'M') + p2(p)).join('');
  const hell = punkte.map((p, i) => (i ? 'L' : 'M') + p2([p[0] - dicke * 0.25, p[1]])).join('');
  return pfad(d, `fill="none" stroke="#2b3f33" stroke-width="${f(dicke + 1.4)}" stroke-linejoin="round" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${farben.links}" stroke-width="${dicke}" stroke-linejoin="round" stroke-linecap="round"`) +
    zusatz +
    pfad(hell, `fill="none" stroke="${farben.oben}" stroke-width="${f(dicke * 0.3)}" stroke-linecap="round" opacity="0.9"`);
}

// Ziegelbrett: rohes Fichtenbrett mit Astloch, leicht schief, auf zwei Ziegelstapeln
function ziegelbrettZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  let s = schatten(m, 2, 1);
  for (const uc of [0.5, 1.5]) {
    for (const [z0, z1] of [[0, 9], [9, 18]]) {
      s += quader(m, uc - 0.22, uc + 0.22, 0.26, 0.74, z0, z1, ZIEGEL);
      const zm = (z0 + z1) / 2;
      // Mauerfugen: waagerecht in halber Hoehe auf beiden Sichtseiten, senkrecht mittig auf der Vorderseite
      s += linie(pkt(m, uc - 0.22, 0.74, zm), pkt(m, uc + 0.22, 0.74, zm), FUGE);
      s += linie(pkt(m, uc + 0.22, 0.26, zm), pkt(m, uc + 0.22, 0.74, zm), FUGE);
      s += linie(pkt(m, uc, 0.74, z0 + 1), pkt(m, uc, 0.74, z1 - 1), FUGE);
      // Lochung auf der Oberseite
      for (const du of [-0.09, 0.09]) s += ellipseAuf(m, uc + du, 0.5, z1, 0.04, 0.12, LOCH);
    }
  }
  // Brett: Oberseite faellt leicht von u = 0 nach u = 2, Unterseite liegt flach auf den Ziegeln
  const zo = (u) => 25.4 - 0.4 * u;
  const zu = 18;
  const A = (u, v, z) => pkt(m, u, v, z);
  const [u0, u1, v0, v1] = [0.02, 1.98, 0.2, 0.8];
  s += poly([A(u0, v0, zo(u0)), A(u1, v0, zo(u1)), A(u1, v1, zo(u1)), A(u0, v1, zo(u0))], `fill="${FICHTE.oben}" ${KON12}`);
  s += poly([A(u0, v1, zu), A(u1, v1, zu), A(u1, v1, zo(u1)), A(u0, v1, zo(u0))], `fill="${farbeV(m, FICHTE)}" ${KON12}`);
  s += poly([A(u1, v0, zu), A(u1, v1, zu), A(u1, v1, zo(u1)), A(u1, v0, zo(u1))], `fill="${farbeU(m, FICHTE)}" ${KON12}`);
  // Maserung in Laengsrichtung, Astloch mit dunklem Rand
  for (const v of [0.36, 0.62]) {
    s += linienzug([0.1, 0.5, 0.9, 1.3, 1.7, 1.9].map((u) => A(u, v, zo(u))), 'stroke="#b98a5a" stroke-width="0.7" stroke-linecap="round" opacity="0.7"');
  }
  s += ellipseAuf(m, 1.2, 0.5, zo(1.2), 0.07, 0.11, 'fill="#9a6a40" stroke="#7a4a2c" stroke-width="0.6"');
  s += ellipseAuf(m, 1.2, 0.5, zo(1.2), 0.04, 0.06, 'fill="#5a3a22"');
  return s;
}

// Gusseisen-Stirnseite bei lokalem u: zwei verschnoerkelte Beine mit Spirale am Fuss, Bogen und Zarge
function gussStirn(m, u) {
  let s = '';
  for (const vc of [0.12, 0.88]) {
    const sg = vc < 0.5 ? 1 : -1;
    // Fussplatte, Spirale nach aussen
    s += ellipseAuf(m, u, vc, 1.2, 0.07, 0.12, `fill="${GUSS.links}" ${KON12}`);
    const spirale = [];
    for (let k = 0; k <= 28; k++) {
      const a = (k / 28) * 2.6 * Math.PI, r = 0.075 * (1 - k / 34);
      spirale.push(pkt(m, u, vc - sg * 0.07 + r * Math.cos(a), 6 + 60 * r * Math.sin(a)));
    }
    // Bein mit S-Schwung vom Fuss bis unter die Zarge
    const bein = [];
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
      bein.push(pkt(m, u, vc + sg * 0.045 * Math.sin(2 * Math.PI * t) * (1 - 0.4 * t), 2 + 70 * t));
    }
    s += rohr(bein, 2.8, GUSS) + rohr(spirale, 2.0, GUSS);
    s += ellipseAuf(m, u, vc, 74, 0.05, 0.05, `fill="${GUSS.oben}" ${KON12}`, 10);
  }
  // Bogen zwischen den Beinen, unter der Zarge
  const bogen = [];
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    bogen.push(pkt(m, u, 0.12 + 0.76 * t, 40 - 22 * Math.sin(Math.PI * t)));
  }
  s += rohr(bogen, 2.2, GUSS);
  // Zarge unter der Tischplatte
  s += rohr([pkt(m, u, 0.12, 68), pkt(m, u, 0.88, 68)], 3, GUSS);
  return s;
}

// Untere Gitterablage aus Metallstegen zwischen den Stirnseiten (z 9 bis 11)
function gitterablage(m) {
  let s = '';
  for (const v of [0.1, 0.9]) s += quader(m, 0.12, 1.88, v - 0.03, v + 0.03, 9, 11, GUSS);
  for (const u of [0.12, 1.88]) s += quader(m, u - 0.03, u + 0.03, 0.1, 0.9, 9, 11, GUSS);
  for (const v of [0.3, 0.5, 0.7]) s += quader(m, 0.12, 1.88, v - 0.015, v + 0.015, 9, 10.2, GUSS);
  for (const u of [0.5, 1.0, 1.5]) s += quader(m, u - 0.015, u + 0.015, 0.1, 0.9, 9, 10.2, GUSS);
  return s;
}

// Gaertnertisch Gusseisen: Gestell aus zwei Stirnseiten, Gitterablage, fuenf Holzlatten als Platte
function gaertnertischZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  let s = schatten(m, 2, 1);
  s += gussStirn(m, 0.12);
  s += gitterablage(m);
  s += gussStirn(m, 1.88);
  for (const [v0, v1] of [[0.02, 0.18], [0.22, 0.38], [0.42, 0.58], [0.62, 0.78], [0.82, 0.98]]) {
    s += quader(m, 0, 2, v0, v1, 74, 80, HOLZ) + maser(m, 0, 2, v0, v1, 74, 80, 1);
  }
  return s;
}

// Wandregal: schmaler Holzsockel, Rueckwand, zwei Bretter auf schwarzen Winkeln
function wandregalZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  let s = schatten(m, 2, 0.6);
  s += quader(m, 0.04, 1.96, 0.1, 0.5, 0, 4, HOLZ_DUNKEL);
  s += quader(m, 0, 2, 0, 0.03, 4, 100, HOLZ_DUNKEL);
  for (const zb of [42, 96]) {
    // Winkel: Strebe von der Wand zur Unterseite des Bretts
    for (const uc of [0.3, 1.7]) {
      s += prisma(m, uc - 0.04, uc + 0.04, [[0.03, zb], [0.5, zb], [0.5, zb - 4], [0.1, zb - 20], [0.03, zb - 20]], METALL);
    }
    s += quader(m, 0, 2, 0.03, 0.55, zb, zb + 4, HOLZ) + maser(m, 0, 2, 0.03, 0.55, zb, zb + 4, 2);
  }
  return s;
}

// Rattan-Geflecht: Zylinder wie zylinder() in moebel.js, Seitenflaeche mit Flechtmuster (Muster in Bildkoordinaten)
function geflochten(cx, cy, r, z0, z1, farben) {
  const id = 'flecht-' + (++musterZaehler);
  const [ox, oy] = iso(cx, cy, 0);
  const rx = 48 * Math.SQRT2 * r, ry = 24 * Math.SQRT2 * r;
  const yT = oy - z1, yB = oy - z0;
  const seite = `M${p2([ox - rx, yT])}A${f(rx)},${f(ry)} 0 0 0 ${p2([ox + rx, yT])}L${p2([ox + rx, yB])}A${f(rx)},${f(ry)} 0 0 1 ${p2([ox - rx, yB])}Z`;
  const rechteSeite = `M${p2([ox, yT - ry])}A${f(rx)},${f(ry)} 0 0 1 ${p2([ox, yT + ry])}L${p2([ox, yB + ry])}A${f(rx)},${f(ry)} 0 0 0 ${p2([ox, yB - ry])}Z`;
  let s = `<defs><pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse">` +
    `<path d="M0,0 L5,5 M5,0 L0,5" stroke="#a86b43" stroke-width="0.9" fill="none" opacity="0.7"/></pattern></defs>`;
  s += pfad(seite, `fill="${farben.links}"`) + pfad(rechteSeite, `fill="${farben.rechts}"`) + pfad(seite, `fill="url(#${id})"`);
  s += pfad(seite, `fill="none" ${KON12}`);
  s += oval(ox, yT, rx, ry, `fill="${farben.oben}" ${KON12}`);
  s += oval(ox, yT, rx * 0.8, ry * 0.8, 'fill="none" stroke="#b8844f" stroke-width="0.7" opacity="0.8"');
  return s;
}

// Rattan-Etagere: drei gebogene Beine, Mittelstab, drei runde Ebenen mit Flechtmuster
function etagereZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const [cx, cy] = feldPunkt(gx, gy, drehung, 0.5, 0.5);
  let s = schatten(m, 1, 1);
  // Beine: hinten zuerst (Winkel 165 und 285 Grad), vorne zuletzt (45 Grad)
  for (const w of [165, 285, 45]) {
    const a = (w * Math.PI) / 180;
    const bein = [];
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
      const R = 0.36 * (1 - t) + 0.1 * t + 0.07 * Math.sin(Math.PI * t);
      bein.push(pkt(m, 0.5 + R * Math.cos(a), 0.5 + R * Math.sin(a), 2 + 34 * t));
    }
    s += rohr(bein, 3.2, RATTAN, linienzug(bein, `stroke="${RATTAN.rechts}" stroke-width="1" stroke-dasharray="1.5 1.5"`));
  }
  // Mittelstab vom unteren bis zum oberen Boden
  s += rohr([pkt(m, 0.5, 0.5, 36), pkt(m, 0.5, 0.5, 108)], 3.4, RATTAN);
  // Drei Ebenen von unten nach oben
  for (const [r, z0, z1] of [[0.46, 36, 40], [0.36, 70, 74], [0.27, 104, 108]]) {
    s += geflochten(cx, cy, r, z0, z1, RATTAN);
  }
  s += ellipseAuf(m, 0.5, 0.5, 110, 0.06, 0.06, `fill="${RATTAN.oben}" ${KON12}`, 12);
  return s;
}

export const MOEBEL = {
  tisch_natur: {
    name: 'Pflanzentisch Naturholz',
    breite: 3,
    tiefe: 1,
    plaetze: [{ dx: 0.8, dy: 0.5, z: 76 }, { dx: 2.0, dy: 0.5, z: 76 }, { dx: 3.2, dy: 0.5, z: 76 }],
    zeichne: (gx, gy, drehung = 0) => tischZeichnen(gx, gy, drehung),
  },
  regal_holz: {
    name: 'Holzregal',
    breite: 3,
    tiefe: 1,
    plaetze: [{ dx: 0.4, dy: 0.5, z: 130 }, { dx: 1.6, dy: 0.5, z: 130 }, { dx: 2.7, dy: 0.5, z: 130 }],
    zeichne: (gx, gy, drehung = 0) => regalZeichnen(gx, gy, drehung),
  },
  tisch_weiss: {
    name: 'Pflanzentisch Weiß lackiert',
    breite: 3,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 76 }, { dx: 1.5, dy: 0.5, z: 76 }, { dx: 2.5, dy: 0.5, z: 76 }],
    zeichne: (gx, gy, drehung = 0) => tischWeissZeichnen(gx, gy, drehung),
  },
  leiterregal: {
    name: 'Leiterregal',
    breite: 1,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.493, z: 44 }, { dx: 0.5, dy: 0.378, z: 89 }, { dx: 0.5, dy: 0.243, z: 134 }],
    zeichne: (gx, gy, drehung = 0) => leiterZeichnen(gx, gy, drehung),
  },
  blumenhocker: {
    name: 'Blumenhocker',
    breite: 1,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 45 }],
    zeichne: (gx, gy) => hockerZeichnen(gx, gy),
  },
  holzkiste: {
    name: 'Holzkiste',
    breite: 1,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 31 }],
    zeichne: (gx, gy, drehung = 0) => kisteZeichnen(gx, gy, drehung),
  },
  steinsockel: {
    name: 'Steinsockel',
    breite: 1,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 56 }],
    zeichne: (gx, gy, drehung = 0) => steinZeichnen(gx, gy, drehung),
  },
  metallregal: {
    name: 'Metallregal Industrie',
    breite: 2,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 138 }, { dx: 1.5, dy: 0.5, z: 138 }, { dx: 0.5, dy: 0.5, z: 80 }, { dx: 1.5, dy: 0.5, z: 80 }],
    zeichne: (gx, gy, drehung = 0) => metallZeichnen(gx, gy, drehung),
  },
  ziegelbrett: {
    name: 'Brett auf Ziegeln',
    breite: 2,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 25.2 }, { dx: 1.5, dy: 0.5, z: 24.8 }],
    zeichne: (gx, gy, drehung = 0) => ziegelbrettZeichnen(gx, gy, drehung),
  },
  gaertnertisch_guss: {
    name: 'Gärtnertisch Gusseisen',
    breite: 2,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 80 }, { dx: 1.5, dy: 0.5, z: 80 }],
    zeichne: (gx, gy, drehung = 0) => gaertnertischZeichnen(gx, gy, drehung),
  },
  wandregal: {
    name: 'Wandregal',
    breite: 2,
    tiefe: 1,
    plaetze: [
      { dx: 0.5, dy: 0.3, z: 46 }, { dx: 1.5, dy: 0.3, z: 46 },
      { dx: 0.5, dy: 0.3, z: 100 }, { dx: 1.5, dy: 0.3, z: 100 },
    ],
    zeichne: (gx, gy, drehung = 0) => wandregalZeichnen(gx, gy, drehung),
  },
  rattan_etagere: {
    name: 'Rattan-Etagere',
    breite: 1,
    tiefe: 1,
    plaetze: [{ dx: 0.44, dy: 0.46, z: 40 }, { dx: 0.56, dy: 0.52, z: 74 }, { dx: 0.48, dy: 0.56, z: 108 }],
    zeichne: (gx, gy, drehung = 0) => etagereZeichnen(gx, gy, drehung),
  },
};
