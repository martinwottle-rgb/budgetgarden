// Moebel als SVG-Strings. zeichne(gx, gy, drehung) zeichnet in absoluten iso()-Koordinaten.
// Lokal: u = Laenge entlang breite, v = Tiefe entlang tiefe. drehung 0: u auf gx, v auf gy.
// drehung 90: u auf gy, v auf gx. Plaetze (dx, dy, z) liegen im lokalen System, z in px.
// Stil: Mid-Century Modern (SPEC-2.md, Abschnitt 1): Teak, schraege Beine, Messingkappen, Haarnadeln.

import { iso, f, p2, poly, pfad, linie, oval, gruppe, tr, bodenschatten, zufall } from './hilfen.js';

// Lokale Koordinaten auf Feldkoordinaten abbilden
export function feldPunkt(gx, gy, drehung, u, v) {
  return drehung === 90 ? [gx + v, gy + u] : [gx + u, gy + v];
}

// Stellplatz n eines Moebels in Feldkoordinaten plus Hoehe z
export function platzFeld(m, n) {
  const def = MOEBEL[m.typ];
  const p = def && def.plaetze[n];
  if (!p) return null;
  const [gx, gy] = feldPunkt(m.gx, m.gy, m.drehung, p.dx, p.dy);
  return { gx, gy, z: p.z };
}

// ---------- Farben (SPEC-2.md, Abschnitt 1) ----------
// Farbtupel: oben (Licht), links (+gy, Grundton), rechts (+gx, Schatten)
const KON12 = 'stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';
const MASER = 'stroke="#9c5f2e" stroke-width="0.7" stroke-linecap="round" opacity="0.8"';
const TEAK = { oben: '#d99a5b', links: '#b8743d', rechts: '#8a5228' };
const TEAK_DUNKEL = { oben: '#b8743d', links: '#8a5228', rechts: '#6e4020' };
const SENF = { oben: '#e8b962', links: '#d9a441', rechts: '#b8862e' };
const MESSING = { oben: '#e6c97a', links: '#c9a14a', rechts: '#9c7a2e' };
const HAARNADEL = { oben: '#4a4a4f', links: '#2b2b2b', rechts: '#1c1c1c' };
const PETROL = { oben: '#4f9499', links: '#2f6f73', rechts: '#215457' };
const CREME = { oben: '#fbf5ea', links: '#f3e6cf', rechts: '#d6c4a2' };
const BETON = { oben: '#bcbcb7', links: '#a9a9a4', rechts: '#85857f' };
const TERRAZZO = { oben: '#f3e6cf', links: '#e8dac0', rechts: '#cdbb98' };
const SPLITTER = ['#d9a441', '#2f6f73', '#d9693b', '#8e8a84'];
const POREN = ['#8c8c87', '#7d7d78', '#c9c9c4'];
const RATTAN = { oben: '#e9bd86', links: '#d9a56b', rechts: '#b8844f' };
let musterZaehler = 0;

// Farben lokaler Seiten: lokal +v liegt je nach Drehung auf +gy (links) oder +gx (rechts), lokal +u umgekehrt
const farbeV = (m, farben) => (m.drehung === 90 ? farben.rechts : farben.links);
const farbeU = (m, farben) => (m.drehung === 90 ? farben.links : farben.rechts);

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

// Quader in lokalen Koordinaten mit drei Sichtflaechen
function quader(m, u0, u1, v0, v1, z0, z1, farben) {
  const [x0, x1, y0, y1] = grenzen(m, u0, u1, v0, v1);
  return poly([iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)], `fill="${farben.links}" ${KON12}`) +
    poly([iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)], `fill="${farben.rechts}" ${KON12}`) +
    poly([iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)], `fill="${farben.oben}" ${KON12}`);
}

// Kreisbogen (ellipsenfoermig) um (ca, cb) mit Radien ra, rb von Winkel g0 bis g1 in Grad
function bogen(ca, cb, ra, rb, g0, g1, n = 3) {
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = ((g0 + ((g1 - g0) * k) / n) * Math.PI) / 180;
    pts.push([ca + ra * Math.cos(t), cb + rb * Math.sin(t)]);
  }
  return pts;
}

// Abgerundetes Rechteck in den Achsen a und b (Eckradien ra, rb), gegen den Uhrzeigersinn
function rrect2(a0, a1, b0, b1, ra, rb, n = 3) {
  const ecken = [[a1 - ra, b0 + rb, -90], [a1 - ra, b1 - rb, 0], [a0 + ra, b1 - rb, 90], [a0 + ra, b0 + rb, 180]];
  const pts = [];
  for (const [ca, cb, grad] of ecken) pts.push(...bogen(ca, cb, ra, rb, grad, grad + 90, n));
  return pts;
}

// Grundflaeche in Weltkoordinaten: lokales Rechteck mit abgerundeten Ecken (Radius r in Feldern)
function platte(m, u0, u1, v0, v1, r) {
  return rrect2(u0, u1, v0, v1, r, r).map(([u, v]) => feldPunkt(m.gx, m.gy, m.drehung, u, v));
}

// Konvexer Koerper ueber einer Grundflaeche (Weltfelder) von z0 bis z1. Nur nach oben und vorn sichtbare Flaechen.
function koerper(grund, z0, z1, farben) {
  const n = grund.length;
  const cx = grund.reduce((s, p) => s + p[0], 0) / n, cy = grund.reduce((s, p) => s + p[1], 0) / n;
  let s = '';
  for (let i = 0; i < n; i++) {
    const p = grund[i], q = grund[(i + 1) % n];
    let nx = q[1] - p[1], ny = -(q[0] - p[0]);
    const mx = (p[0] + q[0]) / 2 - cx, my = (p[1] + q[1]) / 2 - cy;
    if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
    if (nx + ny <= 0) continue;
    const farbe = Math.abs(nx) > Math.abs(ny) ? farben.rechts : farben.links;
    s += poly([iso(p[0], p[1], z0), iso(q[0], q[1], z0), iso(q[0], q[1], z1), iso(p[0], p[1], z1)], `fill="${farbe}" ${KON12}`);
  }
  return s + poly(grund.map(([x, y]) => iso(x, y, z1)), `fill="${farben.oben}" ${KON12}`);
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

// Prisma: Profil [v, z] in der Ebene senkrecht zu u, von u0 bis u1 extrudiert (fuer Seitenwangen und Winkel).
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
function zylinder(cx, cy, r, z0, z1, farben, mit = true) {
  const [ox, oy] = iso(cx, cy, 0);
  const rx = 48 * Math.SQRT2 * r, ry = 24 * Math.SQRT2 * r;
  const yT = oy - z1, yB = oy - z0;
  const seite = `M${p2([ox - rx, yT])}A${f(rx)},${f(ry)} 0 0 0 ${p2([ox + rx, yT])}L${p2([ox + rx, yB])}A${f(rx)},${f(ry)} 0 0 1 ${p2([ox - rx, yB])}Z`;
  const schattenseite = `M${p2([ox, yT - ry])}A${f(rx)},${f(ry)} 0 0 1 ${p2([ox, yT + ry])}L${p2([ox, yB + ry])}A${f(rx)},${f(ry)} 0 0 0 ${p2([ox, yB - ry])}Z`;
  let s = pfad(seite, `fill="${farben.links}"`) + pfad(schattenseite, `fill="${farben.rechts}"`) + pfad(seite, `fill="none" ${KON12}`);
  s += oval(ox, yT, rx, ry, `fill="${farben.oben}" ${KON12}`);
  if (mit) {
    for (const k of [-0.4, 0.4]) {
      const hw = 0.8 * rx * Math.sqrt(1 - k * k);
      s += linie([ox - hw, yT + ry * k], [ox + hw, yT + ry * k], MASER);
    }
  }
  return s;
}

// Konvexe Huelle (Andrew) von Bildschirmpunkten
function konvex(pts) {
  const s = pts.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const kreuz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const unten = [], oben = [];
  for (const p of s) {
    while (unten.length >= 2 && kreuz(unten[unten.length - 2], unten[unten.length - 1], p) <= 0) unten.pop();
    unten.push(p);
  }
  for (const p of s.slice().reverse()) {
    while (oben.length >= 2 && kreuz(oben[oben.length - 2], oben[oben.length - 1], p) <= 0) oben.pop();
    oben.push(p);
  }
  oben.pop(); unten.pop();
  return unten.concat(oben);
}

// Schraeg verjuengter Stab von der Oberkante oben = [u, v, z] zum Fuss unten = [u, v, z].
// Silhouette aus den acht Eckpunkten, Glanzlinie auf der linken Seite.
function bein(m, oben, unten, rO, rU, farben) {
  const ecken = (c, r) => [[-r, -r], [r, -r], [r, r], [-r, r]].map(([du, dv]) => pkt(m, c[0] + du, c[1] + dv, c[2]));
  const huelle = konvex([...ecken(oben, rO), ...ecken(unten, rU)]);
  const a = pkt(m, oben[0], oben[1], oben[2]), b = pkt(m, unten[0], unten[1], unten[2]);
  return poly(huelle, `fill="${farben.links}" ${KON12}`) +
    linie([a[0] - 1.2, a[1]], [b[0] - 0.6, b[1]], `stroke="${farben.oben}" stroke-width="1" stroke-linecap="round" opacity="0.85"`);
}

// Messingteil (Kappe, Schraube) als Zylinder um die lokale Koordinate (u, v)
function beschlag(m, u, v, r, z0, z1) {
  const [cx, cy] = feldPunkt(m.gx, m.gy, m.drehung, u, v);
  return zylinder(cx, cy, r, z0, z1, MESSING, false);
}

// Haarnadel-Stuetze in der Ebene u = const: zwei schwarze Staebe von den Fuessen (v 0.1 und 0.9) zur Spitze bei v 0.5
function haarnadel(m, u, zSpitze) {
  return bein(m, [u, 0.5, zSpitze], [u, 0.1, 0], 0.022, 0.016, HAARNADEL) +
    bein(m, [u, 0.5, zSpitze], [u, 0.9, 0], 0.022, 0.016, HAARNADEL);
}

// Schraeg ausgestelltes Teak-Standbein unter der Platte: oben bei (u, v), Fuss um (du, dv) nach aussen, Messingkappe
function standBein(m, u, v, du, dv, zOben) {
  return bein(m, [u, v, zOben], [u + du, v + dv, 0], 0.05, 0.02, TEAK) + beschlag(m, u + du, v + dv, 0.04, 0, 3);
}

// Sprenkel (Splitter, Poren) auf den Sichtflaechen eines Quaders. anteilOben: Anteil auf der Deckflaeche.
// Deterministisch ueber seed. Die Ovale sitzen auf der Flaeche und werden nach dem Koerper gezeichnet.
function sprenkel(m, u0, u1, v0, v1, z0, z1, n, seed, anteilOben, farben, rmax) {
  const rnd = zufall(seed);
  const [x0, x1, y0, y1] = grenzen(m, u0, u1, v0, v1);
  let s = '';
  for (let k = 0; k < n; k++) {
    const seite = rnd(), a = rnd(), b = rnd();
    const c = farben[Math.floor(rnd() * farben.length)];
    const r = 0.6 + rnd() * rmax;
    let p;
    if (seite < anteilOben) p = iso(x0 + (x1 - x0) * a, y0 + (y1 - y0) * b, z1);
    else if (rnd() < 0.5) p = iso(x0 + (x1 - x0) * a, y1, z0 + (z1 - z0) * b);
    else p = iso(x1, y0 + (y1 - y0) * a, z0 + (z1 - z0) * b);
    s += oval(p[0], p[1], r, r * 0.6, `fill="${c}"`);
  }
  return s;
}

// Geflochtener Zylinder mit Flechtmuster (wie zuvor nicht in einem Moebel verwendet, unveraendert belassen)
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

// Catmull-Rom-Interpolation des Radius ueber der Hoehe z; keys = [[z, Radius], ...] aufsteigend nach z
function kurveRadius(keys, z) {
  let i = 0;
  while (i < keys.length - 2 && z > keys[i + 1][0]) i++;
  const [z0, y0] = keys[i], [z1, y1] = keys[i + 1];
  const p0 = keys[Math.max(i - 1, 0)][1], p3 = keys[Math.min(i + 2, keys.length - 1)][1];
  const t = (z - z0) / (z1 - z0);
  return 0.5 * (2 * y0 + (y1 - p0) * t + (2 * p0 - 5 * y0 + 4 * y1 - p3) * t * t + (3 * y0 - p0 - 3 * y1 + p3) * t * t * t);
}

// Geschwungene Teakstrebe aussen an den Koerben: Winkel a (Grad), Radius folgt der Kurve keys. Fuss mit Messingkappe.
function strebe(m, winkel, keys) {
  const a = (winkel * Math.PI) / 180;
  const N = 48, zUnten = keys[0][0], zOben = keys[keys.length - 1][0];
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const z = zUnten + ((zOben - zUnten) * k) / N;
    const R = kurveRadius(keys, z);
    pts.push(pkt(m, 0.5 + R * Math.cos(a), 0.5 + R * Math.sin(a), z));
  }
  const R0 = keys[0][1];
  return rohr(pts, 2.6, TEAK, '', '#6b4a3a') + beschlag(m, 0.5 + R0 * Math.cos(a), 0.5 + R0 * Math.sin(a), 0.05, 0, 3);
}

// Gebogenes Rohr entlang von Bildschirmpunkten: Kontur, Koerper in farben.links, Glanzlinie in farben.oben
function rohr(punkte, dicke, farben, zusatz = '', kontur = '#2b3f33') {
  const d = punkte.map((p, i) => (i ? 'L' : 'M') + p2(p)).join('');
  const hell = punkte.map((p, i) => (i ? 'L' : 'M') + p2([p[0] - dicke * 0.25, p[1]])).join('');
  return pfad(d, `fill="none" stroke="${kontur}" stroke-width="${f(dicke + 1.4)}" stroke-linejoin="round" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${farben.links}" stroke-width="${dicke}" stroke-linejoin="round" stroke-linecap="round"`) +
    zusatz +
    pfad(hell, `fill="none" stroke="${farben.oben}" stroke-width="${f(dicke * 0.3)}" stroke-linecap="round" opacity="0.9"`);
}

// Flacher Korb (runde Ablage): Wand mit schraeger Kreuzschraffur, oberer Rand als Band, Oeffnung mit Boden
function korb(cx, cy, r, z0, z1) {
  const id = 'rattan-' + (++musterZaehler);
  const [ox, oy] = iso(cx, cy, 0);
  const rx = 48 * Math.SQRT2 * r, ry = 24 * Math.SQRT2 * r;
  const yT = oy - z1, yB = oy - z0;
  const seite = `M${p2([ox - rx, yT])}A${f(rx)},${f(ry)} 0 0 0 ${p2([ox + rx, yT])}L${p2([ox + rx, yB])}A${f(rx)},${f(ry)} 0 0 1 ${p2([ox - rx, yB])}Z`;
  const schattenseite = `M${p2([ox, yT - ry])}A${f(rx)},${f(ry)} 0 0 1 ${p2([ox, yT + ry])}L${p2([ox, yB + ry])}A${f(rx)},${f(ry)} 0 0 0 ${p2([ox, yB - ry])}Z`;
  const rxi = rx * 0.8, ryi = ry * 0.8, tiefe = ry * 0.18;
  let s = `<defs><pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse">` +
    `<path d="M0,0 L5,5 M5,0 L0,5" stroke="${RATTAN.rechts}" stroke-width="0.9" fill="none" opacity="0.9"/></pattern>` +
    `<clipPath id="${id}-oeff"><ellipse cx="${f(ox)}" cy="${f(yT)}" rx="${f(rxi)}" ry="${f(ryi)}"/></clipPath></defs>`;
  // Wand: Licht links, Schatten rechts, darueber die Kreuzschraffur
  s += pfad(seite, `fill="${RATTAN.links}"`) + pfad(schattenseite, `fill="${RATTAN.rechts}"`);
  s += pfad(seite, `fill="url(#${id})"`) + pfad(seite, `fill="none" ${KON12}`);
  // Oberseite: Rand als dunkleres Band mit Schraffur
  s += oval(ox, yT, rx, ry, `fill="${RATTAN.rechts}" ${KON12}`);
  s += oval(ox, yT, rx, ry, `fill="url(#${id})"`);
  // Oeffnung: dunkles Inneres, der Boden liegt etwas tiefer und ist abgeschnitten
  s += oval(ox, yT, rxi, ryi, 'fill="#8f5a35" stroke="#6b4a3a" stroke-width="0.8"');
  s += `<g clip-path="url(#${id}-oeff)">` +
    oval(ox, yT + tiefe, rxi, ryi, `fill="${RATTAN.rechts}"`) +
    oval(ox, yT + tiefe, rxi, ryi, `fill="url(#${id})"`) + `</g>`;
  return s;
}

// ---------- Moebel ----------

// Pflanzentisch Teak: Platte mit abgerundeten Ecken, vier schraeg ausgestellte Beine mit Messingkappen
function tischZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  let s = schatten(m, 3.6, 1);
  for (const [u, v] of [[0.1, 0.15], [3.5, 0.15], [0.1, 0.8], [3.5, 0.8]]) {
    s += standBein(m, u, v, u < 1.8 ? -0.14 : 0.14, v < 0.5 ? -0.08 : 0.08, 70);
  }
  s += koerper(platte(m, 0, 3.6, 0.1, 0.9, 0.1), 70, 76, TEAK);
  for (const v of [0.35, 0.65]) s += linie(pkt(m, 0.3, v, 76), pkt(m, 3.3, v, 76), MASER);
  return s;
}

// Teakregal: offenes Regal, Seitenwangen schraeg nach unten breiter mit runden Ecken oben, Boeden in Teak, Rueckseite offen
function regalZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const wange = [[0.02, 0], [0.62, 0], ...bogen(0.48, 116, 0.08, 14, 0, 90), ...bogen(0.18, 116, 0.08, 14, 90, 180)];
  let s = schatten(m, 3, 0.6);
  s += prisma(m, 0, 0.1, wange, TEAK);
  for (const z of [0, 61, 126]) {
    s += koerper(platte(m, 0.1, 2.9, 0.1, 0.55, 0.04), z, z + 4, TEAK) + maser(m, 0.1, 2.9, 0.1, 0.55, z, z + 4, 2);
  }
  s += prisma(m, 2.9, 3, wange, TEAK);
  return s;
}

// Pflanzentisch Creme: cremefarben lackierte Platte auf Teak-Beinen, untere schmale Teak-Ablage
function tischWeissZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  let s = schatten(m, 3, 1);
  s += standBein(m, 0.15, 0.15, -0.1, -0.08, 70) + standBein(m, 2.85, 0.15, 0.1, -0.08, 70);
  s += koerper(platte(m, 0.15, 2.85, 0.15, 0.85, 0.06), 14, 17, TEAK);
  s += standBein(m, 0.15, 0.85, -0.1, 0.08, 70) + standBein(m, 2.85, 0.85, 0.1, 0.08, 70);
  s += koerper(platte(m, 0, 3, 0, 1, 0.1), 70, 76, CREME);
  // Glanzlicht entlang der vorderen Plattenkante
  const [x0, x1, , y1] = grenzen(m, 0, 3, 0, 1);
  s += linie(iso(x0 + 0.1, y1, 74.5), iso(x1 - 0.1, y1, 74.5), 'stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.8"');
  return s;
}

// Leiterregal: zwei schraege Teak-Holme (hinten hoeher), drei Stufenbretter mit Messingbeschlaegen
function leiterZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const vf = (z) => 0.95 - 0.55 * z / 150; // Vorderkante der Holme je Hoehe: lehnt nach hinten
  const holm = [[vf(0), 0], [vf(150), 150], [vf(150) - 0.1, 150], [vf(0) - 0.1, 0]];
  let s = schatten(m, 1, 1);
  s += prisma(m, 0, 0.1, holm, TEAK);
  // Stufen von hinten (oben) nach vorn (unten): Vorderkante buendig an den Holmen, Tiefe nimmt nach oben ab
  for (const [zk, D] of [[130, 0.46], [85, 0.52], [40, 0.62]]) {
    const vn = vf(zk), vm = vn - D / 2;
    s += koerper(platte(m, 0.1, 0.9, vn - D, vn, 0.03), zk, zk + 4, TEAK) + maser(m, 0.1, 0.9, vn - D, vn, zk, zk + 4, 2);
    for (const u of [0.22, 0.78]) s += beschlag(m, u, vm, 0.03, zk + 4, zk + 5.5);
  }
  s += prisma(m, 0.9, 1, holm, TEAK);
  return s;
}

// Blumenhocker: runder Teakhocker mit drei schraegen Beinen und Messingkappen
function hockerZeichnen(gx, gy) {
  const m = { gx, gy, drehung: 0 };
  const cx = gx + 0.5, cy = gy + 0.5;
  let s = gruppe(tr(iso(cx, cy, 0)), bodenschatten(34, 17));
  // Beine: hinten zuerst, das vordere (90 Grad) zuletzt
  for (const w of [210, 330, 90]) {
    const a = w * Math.PI / 180;
    const c = Math.cos(a), sn = Math.sin(a);
    s += bein(m, [0.5 + 0.3 * c, 0.5 + 0.3 * sn, 41], [0.5 + 0.46 * c, 0.5 + 0.46 * sn, 0], 0.05, 0.02, TEAK);
    s += beschlag(m, 0.5 + 0.46 * c, 0.5 + 0.46 * sn, 0.04, 0, 3);
  }
  // Sitzflaeche als runde Teakscheibe
  s += zylinder(cx, cy, 0.42, 41, 45, TEAK);
  return s;
}

// Teakkiste: niedrige Kiste mit abgerundeten Kanten, senffarbenes Band in der Mitte, flacher Deckel
function kisteZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  let s = schatten(m, 1, 1);
  s += koerper(platte(m, 0.04, 0.96, 0.04, 0.96, 0.1), 0, 12, TEAK);
  s += koerper(platte(m, 0.04, 0.96, 0.04, 0.96, 0.1), 12, 16, SENF);
  s += koerper(platte(m, 0.04, 0.96, 0.04, 0.96, 0.1), 16, 27, TEAK);
  s += koerper(platte(m, 0, 1, 0, 1, 0.08), 27, 31, TEAK) + maser(m, 0.1, 0.9, 0.1, 0.9, 27, 31, 2);
  return s;
}

// Terrazzo-Sockel: Sockel und Saeule aus Terrazzo (Creme mit Splittern in Senf, Petrol, Orange, Grau)
function steinZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  let s = schatten(m, 1, 1);
  s += koerper(platte(m, 0, 1, 0, 1, 0.04), 0, 4, TERRAZZO);
  s += koerper(platte(m, 0.08, 0.92, 0.08, 0.92, 0.1), 4, 52, TERRAZZO);
  s += sprenkel(m, 0.08, 0.92, 0.08, 0.92, 4, 52, 34, 31, 0, SPLITTER, 1.4);
  s += koerper(platte(m, 0, 1, 0, 1, 0.06), 52, 56, TERRAZZO);
  s += sprenkel(m, 0.02, 0.98, 0.02, 0.98, 56, 56, 8, 37, 1, SPLITTER, 1.1);
  return s;
}

// Haarnadel-Regal: Teakbretter auf schwarzen Haarnadel-Stuetzen an beiden Enden
function metallZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const zb = [18, 76, 134]; // Unterkanten der Bretter
  let s = schatten(m, 2, 1);
  s += haarnadel(m, 0.1, 141);
  for (const z of zb) {
    s += koerper(platte(m, 0.02, 1.98, 0.08, 0.92, 0.04), z, z + 4, TEAK) + maser(m, 0.02, 1.98, 0.08, 0.92, z, z + 4, 2);
  }
  s += haarnadel(m, 1.9, 141);
  return s;
}

// Brett auf Betonsteinen: Teakbrett auf zwei grauen Betonsteinen mit Poren, leicht schief
function ziegelbrettZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  let s = schatten(m, 2, 1);
  for (const uc of [0.5, 1.5]) {
    s += koerper(platte(m, uc - 0.24, uc + 0.24, 0.26, 0.74, 0.03), 0, 18, BETON);
    s += sprenkel(m, uc - 0.24, uc + 0.24, 0.26, 0.74, 0, 18, 22, 7 + Math.round(uc * 10), 0.3, POREN, 0.9);
  }
  // Brett: Oberseite faellt leicht von u = 0 nach u = 2, Unterseite liegt flach auf den Steinen
  const zo = (u) => 25.4 - 0.4 * u;
  const zu = 18;
  const A = (u, v, z) => pkt(m, u, v, z);
  const [u0, u1, v0, v1] = [0.02, 1.98, 0.2, 0.8];
  s += poly([A(u0, v0, zo(u0)), A(u1, v0, zo(u1)), A(u1, v1, zo(u1)), A(u0, v1, zo(u0))], `fill="${TEAK.oben}" ${KON12}`);
  s += poly([A(u0, v1, zu), A(u1, v1, zu), A(u1, v1, zo(u1)), A(u0, v1, zo(u0))], `fill="${farbeV(m, TEAK)}" ${KON12}`);
  s += poly([A(u1, v0, zu), A(u1, v1, zu), A(u1, v1, zo(u1)), A(u1, v0, zo(u1))], `fill="${farbeU(m, TEAK)}" ${KON12}`);
  // Maserung in Laengsrichtung
  for (const v of [0.36, 0.62]) {
    s += linienzug([0.1, 0.5, 0.9, 1.3, 1.7, 1.9].map((u) => A(u, v, zo(u))), MASER);
  }
  return s;
}

// Gaertnertisch Haarnadel: Teakplatte auf zwei Haarnadel-Gestellen, untere Ablage aus drei Teaklatten
function gaertnertischZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  let s = schatten(m, 2, 1);
  s += haarnadel(m, 0.12, 70);
  for (const [v0, v1] of [[0.1, 0.32], [0.36, 0.58], [0.62, 0.84]]) {
    s += koerper(platte(m, 0.12, 1.88, v0, v1, 0.02), 18, 21, TEAK);
  }
  s += haarnadel(m, 1.88, 70);
  s += koerper(platte(m, 0, 2, 0, 1, 0.08), 74, 80, TEAK) + maser(m, 0, 2, 0, 1, 74, 80, 3);
  return s;
}

// Wandboard: schmaler Teak-Sockel, Wandplatte, zwei Teakbretter auf petrolfarbenen Metallwinkeln
function wandregalZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  let s = schatten(m, 2, 0.6);
  s += quader(m, 0, 2, 0, 0.03, 4, 100, TEAK_DUNKEL);
  s += quader(m, 0.04, 1.96, 0.1, 0.5, 0, 4, TEAK);
  for (const zb of [42, 96]) {
    for (const uc of [0.3, 1.7]) {
      s += prisma(m, uc - 0.04, uc + 0.04, [[0.03, zb], [0.5, zb], [0.5, zb - 4], [0.1, zb - 20], [0.03, zb - 20]], PETROL);
    }
    s += koerper(platte(m, 0, 2, 0.03, 0.55, 0.04), zb, zb + 4, TEAK) + maser(m, 0, 2, 0.03, 0.55, zb, zb + 4, 2);
  }
  return s;
}

// Rattan-Etagere: drei flache Koerbe, verbunden durch drei geschwungene Teakstreben mit Messingfuessen
function etagereZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const [cx, cy] = feldPunkt(gx, gy, drehung, 0.5, 0.5);
  // Strebenkurve: Radius (Felder) ueber der Hoehe, aussen an den Koerben vorbei, unten Fuss
  const KEYS = [[2, 0.5], [20, 0.6], [40, 0.56], [74, 0.45], [104, 0.31]];
  let s = schatten(m, 1, 1);
  // Streben so, dass keine genau auf der Bildmitte steht (sonst wirkt sie wie eine Mittelsaeule).
  // Hintere Strebe zuerst, dann die Koerbe von unten nach oben, zuletzt die vordere Strebe
  s += strebe(m, 240, KEYS) + strebe(m, 120, KEYS);
  for (const [r, z1] of [[0.46, 40], [0.36, 74], [0.27, 108]]) {
    s += korb(cx, cy, r, z1 - 5, z1);
  }
  s += strebe(m, 0, KEYS);
  return s;
}

export const MOEBEL = {
  tisch_natur: {
    name: 'Pflanzentisch Teak',
    breite: 3,
    tiefe: 1,
    plaetze: [{ dx: 0.8, dy: 0.5, z: 76 }, { dx: 2.0, dy: 0.5, z: 76 }, { dx: 3.2, dy: 0.5, z: 76 }],
    zeichne: (gx, gy, drehung = 0) => tischZeichnen(gx, gy, drehung),
  },
  regal_holz: {
    name: 'Teakregal',
    breite: 3,
    tiefe: 1,
    plaetze: [{ dx: 0.4, dy: 0.5, z: 130 }, { dx: 1.6, dy: 0.5, z: 130 }, { dx: 2.7, dy: 0.5, z: 130 }],
    zeichne: (gx, gy, drehung = 0) => regalZeichnen(gx, gy, drehung),
  },
  tisch_weiss: {
    name: 'Pflanzentisch Creme',
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
    name: 'Teakkiste',
    breite: 1,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 31 }],
    zeichne: (gx, gy, drehung = 0) => kisteZeichnen(gx, gy, drehung),
  },
  steinsockel: {
    name: 'Terrazzo-Sockel',
    breite: 1,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 56 }],
    zeichne: (gx, gy, drehung = 0) => steinZeichnen(gx, gy, drehung),
  },
  metallregal: {
    name: 'Haarnadel-Regal',
    breite: 2,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 138 }, { dx: 1.5, dy: 0.5, z: 138 }, { dx: 0.5, dy: 0.5, z: 80 }, { dx: 1.5, dy: 0.5, z: 80 }],
    zeichne: (gx, gy, drehung = 0) => metallZeichnen(gx, gy, drehung),
  },
  ziegelbrett: {
    name: 'Brett auf Betonsteinen',
    breite: 2,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 25.2 }, { dx: 1.5, dy: 0.5, z: 24.8 }],
    zeichne: (gx, gy, drehung = 0) => ziegelbrettZeichnen(gx, gy, drehung),
  },
  gaertnertisch_guss: {
    name: 'Gärtnertisch Haarnadel',
    breite: 2,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 80 }, { dx: 1.5, dy: 0.5, z: 80 }],
    zeichne: (gx, gy, drehung = 0) => gaertnertischZeichnen(gx, gy, drehung),
  },
  wandregal: {
    name: 'Wandboard',
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
