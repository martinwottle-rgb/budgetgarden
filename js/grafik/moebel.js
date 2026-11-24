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

// Schraeg ausgestelltes Teak-Standbein unter der Platte: oben bei (u, v), Fuss um (du, dv) nach aussen, Messingkappe
function standBein(m, u, v, du, dv, zOben) {
  // Kappe zuerst, das Bein endet in ihr (sonst liegt die Kappe als Scheibe vor dem Bein)
  return beschlag(m, u + du, v + dv, KAPPE_R, 0, KAPPE_H) +
    bein(m, [u, v, zOben], kappenAnsatz([u, v, zOben], [u + du, v + dv]), 0.05, 0.022, TEAK);
}

// Messingkappe am Beinende: enge Huelse, Hoehe KAPPE_H
const KAPPE_R = 0.03, KAPPE_H = 4.5;
// Punkt auf der Beinachse in Kappenhoehe (Bein von oben nach Fuss bei z 0)
function kappenAnsatz(oben, fuss) {
  const t = KAPPE_H / oben[2];
  return [fuss[0] + (oben[0] - fuss[0]) * t, fuss[1] + (oben[1] - fuss[1]) * t, KAPPE_H];
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
  // Die Strebe endet oben in der Messingkappe (Kappe zuerst gezeichnet, Strebe beginnt auf deren Oberkante)
  const N = 48, zUnten = KAPPE_H, zOben = keys[keys.length - 1][0];
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const z = zUnten + ((zOben - zUnten) * k) / N;
    const R = kurveRadius(keys, z);
    pts.push(pkt(m, 0.5 + R * Math.cos(a), 0.5 + R * Math.sin(a), z));
  }
  const R0 = kurveRadius(keys, KAPPE_H);
  return messingKappe(m, 0.5 + R0 * Math.cos(a), 0.5 + R0 * Math.sin(a), KAPPE_R, 0, KAPPE_H) + rohrVerlauf(pts, 2.6);
}

// Flacher Korb (runde Ablage): Wand mit schraeger Kreuzschraffur, oberer Rand als Band, Oeffnung mit Boden
function korb(cx, cy, r, z0, z1) {
  const id = 'rattan-' + (++musterZaehler);
  const rat = verlaeufe('rattan', PAL.rattan.oben, PAL.rattan.links, PAL.rattan.rechts);
  const [ox, oy] = iso(cx, cy, 0);
  const rx = 48 * Math.SQRT2 * r, ry = 24 * Math.SQRT2 * r;
  const yT = oy - z1, yB = oy - z0;
  const seite = `M${p2([ox - rx, yT])}A${f(rx)},${f(ry)} 0 0 0 ${p2([ox + rx, yT])}L${p2([ox + rx, yB])}A${f(rx)},${f(ry)} 0 0 1 ${p2([ox - rx, yB])}Z`;
  const schattenseite = `M${p2([ox, yT - ry])}A${f(rx)},${f(ry)} 0 0 1 ${p2([ox, yT + ry])}L${p2([ox, yB + ry])}A${f(rx)},${f(ry)} 0 0 0 ${p2([ox, yB - ry])}Z`;
  const unterkante = `M${p2([ox + rx, yB])}A${f(rx)},${f(ry)} 0 0 1 ${p2([ox - rx, yB])}`;
  const rxi = rx * 0.8, ryi = ry * 0.8, tiefe = ry * 0.18;
  let s = rat.defs + `<defs><pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse">` +
    `<path d="M0,0 L5,5 M5,0 L0,5" stroke="${RATTAN.rechts}" stroke-width="0.9" fill="none" opacity="0.55"/></pattern>` +
    `<clipPath id="${id}-oeff"><ellipse cx="${f(ox)}" cy="${f(yT)}" rx="${f(rxi)}" ry="${f(ryi)}"/></clipPath></defs>`;
  // Wand: Verlauf links (Licht) und rechts (Schatten), Geflecht darueber, dunkle Unterkante
  s += pfad(seite, `fill="${rat.links}"`) + pfad(schattenseite, `fill="${rat.rechts}"`);
  s += pfad(seite, `fill="url(#${id})"`) + pfad(seite, `fill="none" ${KON12}`);
  s += pfad(unterkante, 'fill="none" stroke="#5e3418" stroke-width="1" stroke-linecap="round" opacity="0.6"');
  // Oberseite: Rand mit Verlauf und Geflecht
  s += oval(ox, yT, rx, ry, `fill="${rat.oben}" ${KON12}`);
  s += oval(ox, yT, rx, ry, `fill="url(#${id})"`);
  // Oeffnung: dunkles Inneres, der Boden liegt etwas tiefer und ist abgeschnitten
  s += oval(ox, yT, rxi, ryi, 'fill="#7a4a2a" stroke="#6b4a3a" stroke-width="0.8"');
  s += `<g clip-path="url(#${id}-oeff)">` +
    oval(ox, yT + tiefe, rxi, ryi, `fill="${rat.rechts}"`) +
    oval(ox, yT + tiefe, rxi, ryi, `fill="url(#${id})"`) + `</g>`;
  return s;
}

// ---------- Moebel ----------

// Ebenen: Die Teile-Funktionen liefern { teile, zs }. teile = [[ebene, svg], ...] in Zeichenreihenfolge,
// ebene = Index in zs (0 = unterste Schicht). zs = Oberkante des Bretts je Schicht (Stellhoehe der Pflanzen).
// zeichne() setzt alle Teile in Originalreihenfolge zusammen, schichten() sammelt je Ebene.
const gesamtSvg = (r) => r.teile.map((t) => t[1]).join('');
const schichtenSvg = (r) => r.zs.map((z, k) => ({ z, svg: r.teile.filter((t) => t[0] === k).map((t) => t[1]).join('') }));

// ---------- Pflanzentisch Teak und Teakregal: plastische Fassung (nur diese beiden Moebel) ----------
// Lokale Helfer mit eigenen Verlaufs-Ids (Zaehler). Licht von links oben: Oberseite, linke und rechte Seite als Verlauf.
let teakZaehler = 0;
const TEAK_VERLAUF = {
  oben: ['#e3a96a', '#d39457'],
  links: ['#b8743d', '#a8672f'],
  rechts: ['#8a5228', '#774520'],
};
const TEAK_MASER = ['#9c5f2e', '#7a4520', '#c07a40'];
const TEAK_LICHT = '#f0c08a';
const TEAK_FUGE = '#3d2412';

// Drei Flaechenverlaeufe fuer ein Teil. fv.oben/links/rechts sind fill-Werte url(#id), fv.defs das zugehoerige <defs>.
function teakVerlaeufe() {
  const n = ++teakZaehler;
  const defs = [];
  const fv = {};
  for (const seite of ['oben', 'links', 'rechts']) {
    const [hell, dunkel] = TEAK_VERLAUF[seite];
    const id = `teak-${n}-${seite}`;
    defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hell}"/><stop offset="1" stop-color="${dunkel}"/></linearGradient>`);
    fv[seite] = `url(#${id})`;
  }
  fv.defs = `<defs>${defs.join('')}</defs>`;
  return fv;
}

// Weicher Fleck (Kontaktschatten, Umgebungsverdeckung) mit radialem Verlauf statt einfarbiger Ellipse
function teakWeich(ox, oy, rx, ry, farbe, deckkraft) {
  const id = `teak-${++teakZaehler}-weich`;
  return `<defs><radialGradient id="${id}">` +
    `<stop offset="0" stop-color="${farbe}" stop-opacity="${deckkraft.toFixed(3)}"/>` +
    `<stop offset="0.55" stop-color="${farbe}" stop-opacity="${(deckkraft * 0.45).toFixed(3)}"/>` +
    `<stop offset="1" stop-color="${farbe}" stop-opacity="0"/></radialGradient></defs>` +
    oval(ox, oy, rx, ry, `fill="url(#${id})"`);
}

// Kontaktschatten am Boden unter einer Grundflaeche b x t (Felder)
function teakSchatten(m, b, t) {
  const [x, y] = feldPunkt(m.gx, m.gy, m.drehung, b / 2, t / 2);
  const [ox, oy] = iso(x, y, 0);
  return teakWeich(ox, oy, 22 * (b + t), 11 * (b + t), '#6b4a3a', 0.4);
}

// Schraeg verjuengter Teakstab mit Verlauf quer zur Laengsrichtung (Mitte heller = zylindrisch)
function teakBein(m, oben, unten, rO, rU) {
  const n = ++teakZaehler;
  const ecken = (c, r) => [[-r, -r], [r, -r], [r, r], [-r, r]].map(([du, dv]) => pkt(m, c[0] + du, c[1] + dv, c[2]));
  const huelle = konvex([...ecken(oben, rO), ...ecken(unten, rU)]);
  const a = pkt(m, oben[0], oben[1], oben[2]), b = pkt(m, unten[0], unten[1], unten[2]);
  const id = `teak-${n}-bein`;
  const verlauf = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#6e4020"/><stop offset="0.3" stop-color="#e3a96a"/>` +
    `<stop offset="0.55" stop-color="#b8743d"/><stop offset="1" stop-color="#5e3418"/></linearGradient></defs>`;
  return verlauf + poly(huelle, `fill="url(#${id})" ${KON12}`) +
    linie([a[0] - 0.9, a[1]], [b[0] - 0.5, b[1]], `stroke="${TEAK_LICHT}" stroke-width="1" stroke-linecap="round" opacity="0.85"`) +
    linie([a[0] + 1.3, a[1]], [b[0] + 0.7, b[1]], `stroke="${TEAK_FUGE}" stroke-width="0.8" stroke-linecap="round" opacity="0.5"`);
}

// Messingkappe mit Glanzpunkt auf der Oberseite
function teakKappe(m, u, v) {
  const [cx, cy] = feldPunkt(m.gx, m.gy, m.drehung, u, v);
  const [ox, oy] = iso(cx, cy, KAPPE_H);
  return beschlag(m, u, v, KAPPE_R, 0, KAPPE_H) + oval(ox - 0.7, oy - 0.3, 0.5, 0.3, 'fill="#fff6d6" opacity="0.9"');
}

// Teak-Standbein: oben bei (u, v) in der Hoehe zOben, Fuss um (du, dv) nach aussen, Messingkappe
function teakStandBein(m, u, v, du, dv, zOben) {
  return teakKappe(m, u + du, v + dv) + teakBein(m, [u, v, zOben], kappenAnsatz([u, v, zOben], [u + du, v + dv]), 0.05, 0.022);
}

// Konvexer Koerper mit Verlaeufen: Sichtflaechen, helle Lichtkante an den vorderen Oberkanten, dunkle Kante unten
function teakKoerper(grund, z0, z1, fv) {
  const n = grund.length;
  const cx = grund.reduce((s, p) => s + p[0], 0) / n, cy = grund.reduce((s, p) => s + p[1], 0) / n;
  let s = '', kanten = '';
  for (let i = 0; i < n; i++) {
    const p = grund[i], q = grund[(i + 1) % n];
    let nx = q[1] - p[1], ny = -(q[0] - p[0]);
    const mx = (p[0] + q[0]) / 2 - cx, my = (p[1] + q[1]) / 2 - cy;
    if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
    if (nx + ny <= 0) continue;
    const farbe = Math.abs(nx) > Math.abs(ny) ? fv.rechts : fv.links;
    s += poly([iso(p[0], p[1], z0), iso(q[0], q[1], z0), iso(q[0], q[1], z1), iso(p[0], p[1], z1)], `fill="${farbe}" ${KON12}`);
    kanten += linie(iso(p[0], p[1], z1), iso(q[0], q[1], z1), `stroke="${TEAK_LICHT}" stroke-width="1" stroke-linecap="round" opacity="0.9"`) +
      linie(iso(p[0], p[1], z0), iso(q[0], q[1], z0), `stroke="${TEAK_FUGE}" stroke-width="1" stroke-linecap="round" opacity="0.55"`);
  }
  return s + poly(grund.map(([x, y]) => iso(x, y, z1)), `fill="${fv.oben}" ${KON12}`) + kanten;
}

// Fein geschwungene Maserung auf einer Oberflaeche (2 bis 3 Toene, Deckkraft 0.35 bis 0.5)
function teakMaser(m, u0, u1, v0, v1, z, n, seed) {
  const rnd = zufall(seed);
  let s = '';
  for (let k = 0; k < n; k++) {
    const t = (k + 1) / (n + 1) + (rnd() - 0.5) * 0.08;
    const v = v0 + (v1 - v0) * t;
    const amp = 0.015 + rnd() * 0.015, ph = rnd() * Math.PI * 2, per = 1.5 + rnd() * 1.5;
    const pts = [];
    for (let j = 0; j <= 12; j++) {
      const u = u0 + ((u1 - u0) * j) / 12;
      pts.push(pkt(m, u, v + amp * Math.sin(ph + (per * Math.PI * j) / 6), z));
    }
    const farbe = TEAK_MASER[Math.floor(rnd() * TEAK_MASER.length)];
    const op = (0.35 + rnd() * 0.15).toFixed(2), w = (0.6 + rnd() * 0.3).toFixed(2);
    s += linienzug(pts, `stroke="${farbe}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"`);
  }
  return s;
}

// Hirnholz an einem Ende (Band von ua bis ub auf der Oberseite) mit Jahresring-Andeutung
function teakHirnholz(m, ua, ub, v0, v1, z) {
  let s = poly([pkt(m, ua, v0, z), pkt(m, ub, v0, z), pkt(m, ub, v1, z), pkt(m, ua, v1, z)], 'fill="#6e4020" opacity="0.35"');
  for (const t of [0.3, 0.62]) {
    const u = ua + (ub - ua) * t;
    s += linienzug([pkt(m, u, v0 + 0.03, z), pkt(m, u + 0.02, (v0 + v1) / 2, z), pkt(m, u, v1 - 0.03, z)],
      'stroke="#5a3418" stroke-width="0.6" stroke-linecap="round" opacity="0.5"');
  }
  return s;
}

// Pflanzentisch Teak: Platte mit abgerundeten Ecken, vier schraeg ausgestellte Beine mit Messingkappen, Zarge darunter.
// Platte und Fuesse bleiben innerhalb der 3 x 1 Felder (vorher 3,6 Felder lang, die Beine ragten seitlich hinaus)
function tischZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const fv = teakVerlaeufe();
  const beine = [[0.28, 0.22], [2.72, 0.22], [0.28, 0.78], [2.72, 0.78]];
  let s = fv.defs + teakSchatten(m, 3, 1);
  for (const [u, v] of beine) s += teakStandBein(m, u, v, u < 1.5 ? -0.12 : 0.12, v < 0.5 ? -0.07 : 0.07, 62);
  // Zarge unter der Platte, dunkler weicher Streifen direkt unter der Platte
  s += teakKoerper(platte(m, 0.3, 2.7, 0.2, 0.8, 0.03), 55, 62, fv);
  s += linie(pkt(m, 0.3, 0.8, 60.5), pkt(m, 2.7, 0.8, 60.5), `stroke="${TEAK_FUGE}" stroke-width="3" stroke-linecap="round" opacity="0.28"`);
  // Umgebungsverdeckung am Beinansatz
  for (const [u, v] of beine) {
    const [ax, ay] = pkt(m, u, v, 61);
    s += teakWeich(ax, ay, 7, 3.5, '#3a220f', 0.45);
  }
  s += teakKoerper(platte(m, 0.06, 2.94, 0.12, 0.88, 0.1), 62, 68, fv);
  s += teakMaser(m, 0.16, 2.84, 0.2, 0.8, 68, 3, 11);
  s += teakHirnholz(m, 0.06, 0.16, 0.12, 0.88, 68) + teakHirnholz(m, 2.84, 2.94, 0.12, 0.88, 68);
  return s;
}

// Teakregal: offenes Regal, Seitenwangen schraeg nach unten breiter mit runden Ecken oben, Boeden in Teak, Rueckseite offen
// Ebenen und Stellhoehen unveraendert: teile/zs wie bisher (Ebene 0 = unten, zs = Oberkanten der Bretter)
function regalTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const fv = teakVerlaeufe();
  const wange = [[0.02, 0], [0.88, 0], ...bogen(0.74, 116, 0.08, 14, 0, 90), ...bogen(0.18, 116, 0.08, 14, 90, 180)];
  const T = [[0, fv.defs + teakSchatten(m, 3, 1)], [0, prisma(m, 0, 0.1, wange, fv)]];
  [0, 61, 126].forEach((z, k) => {
    let b = teakKoerper(platte(m, 0.1, 2.9, 0.1, 0.8, 0.04), z, z + 4, fv);
    b += teakMaser(m, 0.2, 2.8, 0.18, 0.73, z + 4, 2, 21 + k);
    b += teakHirnholz(m, 0.1, 0.2, 0.14, 0.76, z + 4) + teakHirnholz(m, 2.8, 2.9, 0.14, 0.76, z + 4);
    // Dunkle Fugen, wo Brett und Seitenwange aufeinandertreffen
    for (const u of [0.1, 2.9]) {
      b += linie(pkt(m, u, 0.8, z), pkt(m, u, 0.8, z + 4), `stroke="${TEAK_FUGE}" stroke-width="1.2" stroke-linecap="round" opacity="0.8"`);
    }
    // Leichter Schatten des Bretts darueber auf die Oberseite des Bretts darunter (nur bei Brettern, die ein Brett darueber haben)
    if (k < 2) {
      b += poly([pkt(m, 0.25, 0.2, z + 4), pkt(m, 2.9, 0.2, z + 4), pkt(m, 2.9, 0.6, z + 4), pkt(m, 0.25, 0.6, z + 4)],
        'fill="#3a220f" opacity="0.16"');
    }
    T.push([k, b]);
  });
  T.push([2, prisma(m, 2.9, 3, wange, fv)]);
  return { teile: T, zs: [4, 65, 130] };
}

// Pflanzentisch Creme: cremefarben lackierte Platte auf Teak-Beinen, untere schmale Teak-Ablage
function tischWeissTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const T = [[0, schatten(m, 3, 1)]];
  // Hintere Beine und untere Ablage gehoeren zur unteren Ebene, vordere Beine unter die Platte (obere Ebene)
  T.push([0, standBein(m, 0.15, 0.15, -0.1, -0.08, 70) + standBein(m, 2.85, 0.15, 0.1, -0.08, 70)]);
  T.push([0, koerper(platte(m, 0.15, 2.85, 0.15, 0.85, 0.06), 14, 17, TEAK)]);
  T.push([1, standBein(m, 0.15, 0.85, -0.1, 0.08, 70) + standBein(m, 2.85, 0.85, 0.1, 0.08, 70)]);
  T.push([1, koerper(platte(m, 0, 3, 0, 1, 0.1), 70, 76, CREME)]);
  // Glanzlicht entlang der vorderen Plattenkante
  const [x0, x1, , y1] = grenzen(m, 0, 3, 0, 1);
  T.push([1, linie(iso(x0 + 0.1, y1, 74.5), iso(x1 - 0.1, y1, 74.5), 'stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.8"')]);
  return { teile: T, zs: [17, 76] };
}

// ---------- Phase 2 Rest: Verlaeufe, Metall, Stein, Rattan (eigene Zaehler, eindeutige Ids) ----------
let verlaufZaehler = 0;

// Drei Verlaeufe (oben, links, rechts) fuer eine Flaeche; je Seite [helle Farbe oben, dunkle Farbe unten].
// Liefert fill-Werte url(#id) und das zugehoerige <defs> (in fv.defs), Ids sind durch den Zaehler eindeutig.
function verlaeufe(name, oben, links, rechts) {
  const n = ++verlaufZaehler;
  const defs = [];
  const fv = {};
  for (const [seite, paar] of [['oben', oben], ['links', links], ['rechts', rechts]]) {
    const id = `mo-${n}-${name}-${seite}`;
    defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${paar[0]}"/><stop offset="1" stop-color="${paar[1]}"/></linearGradient>`);
    fv[seite] = `url(#${id})`;
  }
  fv.defs = `<defs>${defs.join('')}</defs>`;
  return fv;
}

// Farbpaare fuer die neuen Teile (Licht von links oben: oben hell, links mittel, rechts dunkel)
const PAL = {
  stein: { oben: ['#f8f0e0', '#ebdfc6'], links: ['#e6d8ba', '#d2bf9a'], rechts: ['#c0a882', '#a88f66'] },
  beton: { oben: ['#d4d4cf', '#bfbfb9'], links: ['#b6b6b0', '#9d9d97'], rechts: ['#8c8c86', '#76766f'] },
  messing: { oben: ['#f6e6a8', '#dbb860'], links: ['#dfbc62', '#b98f3a'], rechts: ['#a27a2c', '#7b5c20'] },
  rattan: { oben: ['#f4d6a2', '#e2b074'], links: ['#e0b078', '#c48d55'], rechts: ['#a86f3c', '#84562a'] },
  petrol: { oben: ['#76bcbf', '#5aa3a7'], links: ['#4a8f93', '#2f6f73'], rechts: ['#225a5d', '#1a4a4d'] },
  dunkel: { oben: ['#b06f3e', '#9a5f33'], links: ['#8a5228', '#744420'], rechts: ['#653b1a', '#4e2d13'] },
  senf: { oben: ['#f1cd7e', '#e2aa4c'], links: ['#dca640', '#c18b2d'], rechts: ['#a57824', '#86611e'] },
};

// Quaderkoerper mit Verlaeufen, Lichtkante oben vorn, dunkle Fuge unten (wie teakKoerper, Farben einstellbar)
function plastKoerper(grund, z0, z1, fv, licht = '#fff6e2', fuge = '#3d2412') {
  const n = grund.length;
  const cx = grund.reduce((s, p) => s + p[0], 0) / n, cy = grund.reduce((s, p) => s + p[1], 0) / n;
  let s = '', kanten = '';
  for (let i = 0; i < n; i++) {
    const p = grund[i], q = grund[(i + 1) % n];
    let nx = q[1] - p[1], ny = -(q[0] - p[0]);
    const mx = (p[0] + q[0]) / 2 - cx, my = (p[1] + q[1]) / 2 - cy;
    if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
    if (nx + ny <= 0) continue;
    const farbe = Math.abs(nx) > Math.abs(ny) ? fv.rechts : fv.links;
    s += poly([iso(p[0], p[1], z0), iso(q[0], q[1], z0), iso(q[0], q[1], z1), iso(p[0], p[1], z1)], `fill="${farbe}" ${KON12}`);
    kanten += linie(iso(p[0], p[1], z1), iso(q[0], q[1], z1), `stroke="${licht}" stroke-width="1" stroke-linecap="round" opacity="0.85"`) +
      linie(iso(p[0], p[1], z0), iso(q[0], q[1], z0), `stroke="${fuge}" stroke-width="1" stroke-linecap="round" opacity="0.5"`);
  }
  return s + poly(grund.map(([x, y]) => iso(x, y, z1)), `fill="${fv.oben}" ${KON12}`) + kanten;
}

// Rechteck in lokalen Koordinaten (u0 bis u1, v0 bis v1) als Grundflaeche in Feldpunkten
function viereck(m, u0, u1, v0, v1) {
  return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => feldPunkt(m.gx, m.gy, m.drehung, u, v));
}

// Messingkappe mit Verlauf (eigene defs), Zylinder um (u, v) von z0 bis z1
function messingKappe(m, u, v, r, z0, z1) {
  const fv = verlaeufe('messing', PAL.messing.oben, PAL.messing.links, PAL.messing.rechts);
  const [cx, cy] = feldPunkt(m.gx, m.gy, m.drehung, u, v);
  return fv.defs + zylinder(cx, cy, r, z0, z1, fv, false);
}

// Metallstab von oben (Punkt mit z) zum Fuss: Verlauf quer zur Laenge, helle Glanzlinie links
function stabMetall(m, oben, unten, rO, rU) {
  const n = ++verlaufZaehler;
  const ecken = (c, r) => [[-r, -r], [r, -r], [r, r], [-r, r]].map(([du, dv]) => pkt(m, c[0] + du, c[1] + dv, c[2]));
  const huelle = konvex([...ecken(oben, rO), ...ecken(unten, rU)]);
  const xs = huelle.map((p) => p[0]);
  const id = `mo-${n}-stab`;
  const defs = `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(Math.min(...xs))}" y1="0" x2="${f(Math.max(...xs))}" y2="0">` +
    '<stop offset="0" stop-color="#2a2d33"/><stop offset="0.3" stop-color="#7d838d"/><stop offset="0.62" stop-color="#4a4f58"/><stop offset="1" stop-color="#1c1e23"/></linearGradient></defs>';
  const a = pkt(m, oben[0], oben[1], oben[2]), b = pkt(m, unten[0], unten[1], unten[2]);
  return defs + poly(huelle, `fill="url(#${id})" ${KON12}`) +
    linie([a[0] - 0.8, a[1]], [b[0] - 0.4, b[1]], 'stroke="#d5dae2" stroke-width="0.8" stroke-linecap="round" opacity="0.7"');
}

// Haarnadel-Stuetze aus Metall in der Ebene u: Spitze bei (u, 0.5, zSpitze), Fuesse bei v 0.1 und 0.9 mit Messingkappen.
// Erst beide Kappen, dann die Beine, die in den Kappen enden (kappenAnsatz)
function haarnadelMetall(m, u, zSpitze) {
  const oben = [u, 0.5, zSpitze];
  let s = messingKappe(m, u, 0.1, KAPPE_R, 0, KAPPE_H) + messingKappe(m, u, 0.9, KAPPE_R, 0, KAPPE_H);
  for (const v of [0.1, 0.9]) s += stabMetall(m, oben, kappenAnsatz(oben, [u, v]), 0.022, 0.02);
  return s;
}

// Gebogenes Rohr mit Verlauf quer zur Laengsrichtung (Licht links, Schatten rechts), Ton im userSpaceOnUse
function rohrVerlauf(punkte, dicke) {
  const n = ++verlaufZaehler;
  const d = punkte.map((p, i) => (i ? 'L' : 'M') + p2(p)).join('');
  const xs = punkte.map((p) => p[0]);
  const id = `mo-${n}-rohr`;
  const defs = `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(Math.min(...xs) - dicke)}" y1="0" x2="${f(Math.max(...xs) + dicke)}" y2="0">` +
    '<stop offset="0" stop-color="#b8743d"/><stop offset="0.35" stop-color="#e3a96a"/><stop offset="0.7" stop-color="#b8743d"/><stop offset="1" stop-color="#6e4020"/></linearGradient></defs>';
  return defs + pfad(d, `fill="none" stroke="#6b4a3a" stroke-width="${f(dicke + 1.4)}" stroke-linejoin="round" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="url(#${id})" stroke-width="${dicke}" stroke-linejoin="round" stroke-linecap="round"`);
}

// Leiterregal: zwei schraege Teak-Holme (hinten hoeher), drei Stufenbretter mit Messingbeschlaegen.
// Die Stufen sind so tief, dass die Pflanzen (dy plus/minus 0.3) ganz auf dem Brett stehen. Vorn ragen sie etwas ueber den Holm.
function leiterTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const fv = teakVerlaeufe();
  const vf = (z) => 0.95 - 0.55 * z / 150; // Vorderkante der Holme je Hoehe: lehnt nach hinten
  const holm = [[vf(0), 0], [vf(150), 150], [vf(150) - 0.1, 150], [vf(0) - 0.1, 0]];
  const T = [[0, fv.defs + teakSchatten(m, 1, 1)], [0, prisma(m, 0, 0.1, holm, fv)]];
  // Stufen von hinten (oben) nach vorn (unten): [Hoehe, hintere Kante, vordere Kante, Ebene]
  for (const [zk, hinten, vorn, k] of [[130, 0, 0.543, 2], [85, 0.06, 0.68, 1], [40, 0.183, 0.803, 0]]) {
    let b = plastKoerper(platte(m, 0.1, 0.9, hinten, vorn, 0.03), zk, zk + 4, fv);
    b += teakMaser(m, 0.16, 0.84, hinten + 0.05, vorn - 0.05, zk + 4, 2, 50 + k);
    // Dunkle Fuge, wo die Stufe an die Holme stoesst
    for (const u of [0.1, 0.9]) b += linie(pkt(m, u, (hinten + vorn) / 2, zk), pkt(m, u, (hinten + vorn) / 2, zk + 4), `stroke="${TEAK_FUGE}" stroke-width="1.2" stroke-linecap="round" opacity="0.8"`);
    // Messingbeschlaege vorn auf der Stufe
    for (const u of [0.22, 0.78]) b += messingKappe(m, u, vorn - 0.06, 0.03, zk + 4, zk + 5.5);
    T.push([k, b]);
  }
  T.push([2, prisma(m, 0.9, 1, holm, fv)]);
  return { teile: T, zs: [44, 89, 134] };
}

// Blumenhocker: runder Teakhocker mit drei schraegen Beinen und Messingkappen
function hockerZeichnen(gx, gy) {
  const m = { gx, gy, drehung: 0 };
  const cx = gx + 0.5, cy = gy + 0.5;
  const fv = teakVerlaeufe();
  // Bein je Winkel: oben bei Radius 0.3 unter der Sitzflaeche, Fuss bei Radius 0.46 (mit Messingkappe)
  const bein = (w) => {
    const a = w * Math.PI / 180;
    const c = Math.cos(a), sn = Math.sin(a);
    return teakStandBein(m, 0.5 + 0.3 * c, 0.5 + 0.3 * sn, 0.16 * c, 0.16 * sn, 41);
  };
  // Kontaktschatten, Beine (hinten zuerst), Sitzflaeche zuletzt: die Beine enden unter der Platte
  let s = fv.defs + teakSchatten(m, 1, 1);
  s += bein(210) + bein(330) + bein(90);
  s += zylinder(cx, cy, 0.42, 41, 45, fv);
  return s;
}

// Teakkiste: niedrige Kiste mit abgerundeten Kanten, senffarbenes Band in der Mitte, flacher Deckel
function kisteZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const fv = teakVerlaeufe();
  const senf = verlaeufe('senf', PAL.senf.oben, PAL.senf.links, PAL.senf.rechts);
  let s = fv.defs + senf.defs + teakSchatten(m, 1, 1);
  // Unterteil, senffarbenes Band, Oberteil, flacher Deckel mit Maserung (Platz oben auf dem Deckel)
  s += teakKoerper(platte(m, 0.04, 0.96, 0.04, 0.96, 0.1), 0, 12, fv);
  s += teakKoerper(platte(m, 0.04, 0.96, 0.04, 0.96, 0.1), 12, 16, senf);
  s += teakKoerper(platte(m, 0.04, 0.96, 0.04, 0.96, 0.1), 16, 27, fv);
  s += teakKoerper(platte(m, 0, 1, 0, 1, 0.08), 27, 31, fv) + teakMaser(m, 0.12, 0.88, 0.12, 0.88, 31, 2, 41);
  return s;
}

// Terrazzo-Sockel: Sockel und Saeule aus Terrazzo (Creme mit Splittern in Senf, Petrol, Orange, Grau)
function steinZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const stein = verlaeufe('stein', PAL.stein.oben, PAL.stein.links, PAL.stein.rechts);
  const licht = '#fffaf0', fuge = '#8a7a60';
  let s = stein.defs + teakSchatten(m, 1, 1);
  s += plastKoerper(platte(m, 0, 1, 0, 1, 0.04), 0, 4, stein, licht, fuge);
  s += plastKoerper(platte(m, 0.08, 0.92, 0.08, 0.92, 0.1), 4, 52, stein, licht, fuge);
  s += sprenkel(m, 0.08, 0.92, 0.08, 0.92, 4, 52, 34, 31, 0, SPLITTER, 1.4);
  s += plastKoerper(platte(m, 0, 1, 0, 1, 0.06), 52, 56, stein, licht, fuge);
  s += sprenkel(m, 0.02, 0.98, 0.02, 0.98, 56, 56, 8, 37, 1, SPLITTER, 1.1);
  return s;
}

// Haarnadel-Regal: Teakbretter auf schwarzen Haarnadel-Stuetzen an beiden Enden
function metallTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const fv = teakVerlaeufe();
  const zb = [18, 76, 134]; // Unterkanten der Bretter
  // Kontaktschatten und hintere Haarnadel zuerst, dann die Bretter von unten nach oben, vordere Haarnadel zuletzt
  const T = [[0, fv.defs + teakSchatten(m, 2, 1)], [0, haarnadelMetall(m, 0.1, 141)]];
  zb.forEach((z, k) => {
    // Bretter etwas tiefer als vorher (v 0.08 bis 0.92): Pflanzen (dy 0.5 plus/minus 0.3) stehen ganz auf dem Brett
    T.push([k, plastKoerper(platte(m, 0.02, 1.98, 0.08, 0.92, 0.04), z, z + 4, fv) + teakMaser(m, 0.1, 1.9, 0.2, 0.8, z + 4, 2, 61 + k)]);
  });
  T.push([2, haarnadelMetall(m, 1.9, 141)]);
  return { teile: T, zs: [22, 80, 138] };
}

// Brett auf Betonsteinen: Teakbrett auf zwei grauen Betonsteinen mit Poren, leicht schief
function ziegelbrettZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const beton = verlaeufe('beton', PAL.beton.oben, PAL.beton.links, PAL.beton.rechts);
  const holz = teakVerlaeufe();
  let s = beton.defs + holz.defs + teakSchatten(m, 2, 1);
  for (const uc of [0.5, 1.5]) {
    s += plastKoerper(platte(m, uc - 0.24, uc + 0.24, 0.18, 0.82, 0.03), 0, 18, beton, '#f2f2ec', '#4d4d48');
    s += sprenkel(m, uc - 0.24, uc + 0.24, 0.18, 0.82, 0, 18, 22, 7 + Math.round(uc * 10), 0.3, POREN, 0.9);
  }
  // Brett: Oberseite faellt leicht von u = 0 nach u = 2, Unterseite liegt flach auf den Steinen
  // Tiefer als vorher (v 0.12 bis 0.88), damit die Pflanze (dy 0.5 plus/minus 0.3) ganz aufliegt
  const zo = (u) => 25.4 - 0.4 * u;
  const zu = 18;
  const A = (u, v, z) => pkt(m, u, v, z);
  const [u0, u1, v0, v1] = [0.02, 1.98, 0.12, 0.88];
  s += poly([A(u0, v0, zo(u0)), A(u1, v0, zo(u1)), A(u1, v1, zo(u1)), A(u0, v1, zo(u0))], `fill="${holz.oben}" ${KON12}`);
  s += poly([A(u0, v1, zu), A(u1, v1, zu), A(u1, v1, zo(u1)), A(u0, v1, zo(u0))], `fill="${farbeV(m, holz)}" ${KON12}`);
  s += poly([A(u1, v0, zu), A(u1, v1, zu), A(u1, v1, zo(u1)), A(u1, v0, zo(u1))], `fill="${farbeU(m, holz)}" ${KON12}`);
  // Lichtkante an der vorderen Oberkante, Maserung in Laengsrichtung
  s += linie(A(u0, v1, zo(u0)), A(u1, v1, zo(u1)), `stroke="${TEAK_LICHT}" stroke-width="1" stroke-linecap="round" opacity="0.85"`);
  for (const v of [0.36, 0.62]) {
    s += linienzug([0.1, 0.5, 0.9, 1.3, 1.7, 1.9].map((u) => A(u, v, zo(u))), `stroke="${TEAK_MASER[1]}" stroke-width="0.7" stroke-linecap="round" opacity="0.5"`);
  }
  return s;
}

// Gaertnertisch Haarnadel: Teakplatte auf zwei Haarnadel-Gestellen, untere Ablage als durchgehendes Brett mit Lattenfugen
function gaertnertischTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const fv = teakVerlaeufe();
  const T = [[0, fv.defs + teakSchatten(m, 2, 1)], [0, haarnadelMetall(m, 0.12, 70)]];
  // Untere Ablage: ein Brett von v 0.08 bis 0.92 (vorher drei Latten), Fugen zeigen die Latten
  let unten = plastKoerper(platte(m, 0.12, 1.88, 0.08, 0.92, 0.02), 18, 21, fv);
  for (const v of [0.36, 0.64]) {
    unten += linie(pkt(m, 0.12, v, 21), pkt(m, 1.88, v, 21), `stroke="${TEAK_FUGE}" stroke-width="0.9" stroke-linecap="round" opacity="0.6"`);
  }
  T.push([0, unten]);
  T.push([1, haarnadelMetall(m, 1.88, 70)]);
  T.push([1, plastKoerper(platte(m, 0, 2, 0, 1, 0.08), 74, 80, fv) + teakMaser(m, 0.1, 1.9, 0.2, 0.8, 80, 3, 71)]);
  return { teile: T, zs: [21, 80] };
}

// Wandboard: schmaler Teak-Sockel, Wandplatte, zwei Teakbretter auf petrolfarbenen Metallwinkeln
// Wandboard: hängt an der Rückwand, berührt den Boden nicht (darunter bleibt Platz für Kleines).
// Leiste an der Wand, zwei Teakbretter auf Petrol-Konsolen in 110 und 160 Höhe.
function wandregalTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const fv = teakVerlaeufe();
  const dunkel = verlaeufe('dunkel', PAL.dunkel.oben, PAL.dunkel.links, PAL.dunkel.rechts);
  const petrol = verlaeufe('petrol', PAL.petrol.oben, PAL.petrol.links, PAL.petrol.rechts);
  // Rueckwand (dunkles Holz) zuerst, dann je Brett: Konsolen, Brett darueber
  const T = [[0, dunkel.defs + petrol.defs + fv.defs + plastKoerper(viereck(m, 0, 2, 0, 0.03), 100, 108, dunkel)]];
  [110, 160].forEach((zb, k) => {
    for (const uc of [0.3, 1.7]) {
      // Konsole bis v 0.56, damit sie unter dem Brett bis fast zur Vorderkante reicht
      T.push([k, prisma(m, uc - 0.04, uc + 0.04, [[0.03, zb], [0.56, zb], [0.56, zb - 4], [0.1, zb - 20], [0.03, zb - 20]], petrol)]);
    }
    // Brett tiefer als vorher (v 0 bis 0.62): Pflanzen mit dy 0.3 stehen ganz darauf
    T.push([k, plastKoerper(viereck(m, 0, 2, 0, 0.62), zb, zb + 4, fv) + teakMaser(m, 0.1, 1.9, 0.14, 0.5, zb + 4, 2, 81 + k)]);
  });
  return { teile: T, zs: [114, 164] };
}

// Kleines Wandbord: ein Brett für ein Feld an der Rückwand, in 130 Höhe
function wandbordTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const fv = teakVerlaeufe();
  const dunkel = verlaeufe('dunkel', PAL.dunkel.oben, PAL.dunkel.links, PAL.dunkel.rechts);
  const petrol = verlaeufe('petrol', PAL.petrol.oben, PAL.petrol.links, PAL.petrol.rechts);
  // Rueckwand, Konsolen, Brett. Brett tiefer als vorher (v 0 bis 0.6), Pflanze (dy 0.3) steht ganz darauf
  const T = [[0, dunkel.defs + petrol.defs + fv.defs + plastKoerper(viereck(m, 0.05, 0.95, 0, 0.03), 120, 127, dunkel)]];
  for (const uc of [0.22, 0.78]) {
    T.push([0, prisma(m, uc - 0.04, uc + 0.04, [[0.03, 130], [0.56, 130], [0.56, 126], [0.1, 112], [0.03, 112]], petrol)]);
  }
  T.push([0, plastKoerper(viereck(m, 0.04, 0.96, 0, 0.6), 130, 134, fv) + teakMaser(m, 0.1, 0.9, 0.12, 0.48, 134, 1, 91)]);
  return { teile: T, zs: [134] };
}

// Rattan-Etagere: drei flache Koerbe, verbunden durch drei geschwungene Teakstreben mit Messingfuessen
function etagereTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const [cx, cy] = feldPunkt(gx, gy, drehung, 0.5, 0.5);
  // Strebenkurve: Radius (Felder) ueber der Hoehe, aussen an den Koerben vorbei, unten Fuss (Form nach oben schmaler)
  const KEYS = [[2, 0.5], [20, 0.6], [40, 0.56], [74, 0.47], [104, 0.36]];
  // Koerbe nach oben kleiner, der oberste etwas breiter als frueher, damit der Topf darauf Platz hat
  // Reihenfolge: hintere Strebe zuerst, dann die Koerbe von unten nach oben, danach die vorderen Streben
  const T = [[0, teakSchatten(m, 1, 1) + strebe(m, 240, KEYS)]];
  [[0.46, 40], [0.38, 74], [0.31, 108]].forEach(([r, z1], k) => {
    T.push([k, korb(cx, cy, r, z1 - 5, z1)]);
  });
  T.push([1, strebe(m, 120, KEYS)]);
  T.push([2, strebe(m, 0, KEYS)]);
  return { teile: T, zs: [40, 74, 108] };
}

export const MOEBEL = {
  tisch_natur: {
    name: 'Pflanzentisch Teak',
    breite: 3,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 68 }, { dx: 1.5, dy: 0.5, z: 68 }, { dx: 2.5, dy: 0.5, z: 68 }],
    zeichne: (gx, gy, drehung = 0) => tischZeichnen(gx, gy, drehung),
  },
  regal_holz: {
    name: 'Teakregal',
    breite: 3,
    tiefe: 1,
    plaetze: [
      { dx: 0.4, dy: 0.5, z: 130 }, { dx: 1.6, dy: 0.5, z: 130 }, { dx: 2.7, dy: 0.5, z: 130 },
      { dx: 0.4, dy: 0.5, z: 4, hoehe: 44 }, { dx: 1.6, dy: 0.5, z: 4, hoehe: 44 }, { dx: 2.7, dy: 0.5, z: 4, hoehe: 44 },
      { dx: 0.4, dy: 0.5, z: 65, hoehe: 48 }, { dx: 1.6, dy: 0.5, z: 65, hoehe: 48 }, { dx: 2.7, dy: 0.5, z: 65, hoehe: 48 },
    ],
    zeichne: (gx, gy, drehung = 0) => gesamtSvg(regalTeile(gx, gy, drehung)),
    schichten: (gx, gy, drehung = 0) => schichtenSvg(regalTeile(gx, gy, drehung)),
  },
  tisch_weiss: {
    name: 'Pflanzentisch Creme',
    breite: 3,
    tiefe: 1,
    plaetze: [
      { dx: 0.5, dy: 0.5, z: 76 }, { dx: 1.5, dy: 0.5, z: 76 }, { dx: 2.5, dy: 0.5, z: 76 },
      { dx: 0.5, dy: 0.5, z: 17, hoehe: 53 }, { dx: 1.5, dy: 0.5, z: 17, hoehe: 53 }, { dx: 2.5, dy: 0.5, z: 17, hoehe: 53 },
    ],
    zeichne: (gx, gy, drehung = 0) => gesamtSvg(tischWeissTeile(gx, gy, drehung)),
    schichten: (gx, gy, drehung = 0) => schichtenSvg(tischWeissTeile(gx, gy, drehung)),
  },
  leiterregal: {
    name: 'Leiterregal',
    breite: 1,
    tiefe: 1,
    plaetze: [
      { dx: 0.5, dy: 0.493, z: 44, hoehe: 41 }, { dx: 0.5, dy: 0.378, z: 89, hoehe: 41 }, { dx: 0.5, dy: 0.243, z: 134 },
    ],
    zeichne: (gx, gy, drehung = 0) => gesamtSvg(leiterTeile(gx, gy, drehung)),
    schichten: (gx, gy, drehung = 0) => schichtenSvg(leiterTeile(gx, gy, drehung)),
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
    plaetze: [
      { dx: 0.5, dy: 0.5, z: 138 }, { dx: 1.5, dy: 0.5, z: 138 },
      { dx: 0.5, dy: 0.5, z: 80, hoehe: 54 }, { dx: 1.5, dy: 0.5, z: 80, hoehe: 54 },
      { dx: 0.5, dy: 0.5, z: 22, hoehe: 54 }, { dx: 1.5, dy: 0.5, z: 22, hoehe: 54 },
    ],
    zeichne: (gx, gy, drehung = 0) => gesamtSvg(metallTeile(gx, gy, drehung)),
    schichten: (gx, gy, drehung = 0) => schichtenSvg(metallTeile(gx, gy, drehung)),
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
    plaetze: [
      { dx: 0.5, dy: 0.5, z: 80 }, { dx: 1.5, dy: 0.5, z: 80 },
      { dx: 0.5, dy: 0.5, z: 21, hoehe: 53 }, { dx: 1.5, dy: 0.5, z: 21, hoehe: 53 },
    ],
    zeichne: (gx, gy, drehung = 0) => gesamtSvg(gaertnertischTeile(gx, gy, drehung)),
    schichten: (gx, gy, drehung = 0) => schichtenSvg(gaertnertischTeile(gx, gy, drehung)),
  },
  wandregal: {
    name: 'Wandboard',
    breite: 2,
    tiefe: 1,
    // wand: hängt an einer Rückwand (drehung 0 an der Wand bei y = 0, drehung 90 an der Wand bei x = 0) und belegt keinen Boden
    wand: true,
    plaetze: [
      { dx: 0.5, dy: 0.3, z: 114, hoehe: 46 }, { dx: 1.5, dy: 0.3, z: 114, hoehe: 46 },
      { dx: 0.5, dy: 0.3, z: 164 }, { dx: 1.5, dy: 0.3, z: 164 },
    ],
    zeichne: (gx, gy, drehung = 0) => gesamtSvg(wandregalTeile(gx, gy, drehung)),
    schichten: (gx, gy, drehung = 0) => schichtenSvg(wandregalTeile(gx, gy, drehung)),
  },
  wandbord: {
    name: 'Wandbord',
    breite: 1,
    tiefe: 1,
    wand: true,
    plaetze: [{ dx: 0.5, dy: 0.3, z: 134 }],
    zeichne: (gx, gy, drehung = 0) => gesamtSvg(wandbordTeile(gx, gy, drehung)),
    schichten: (gx, gy, drehung = 0) => schichtenSvg(wandbordTeile(gx, gy, drehung)),
  },
  rattan_etagere: {
    name: 'Rattan-Etagere',
    breite: 1,
    tiefe: 1,
    plaetze: [
      { dx: 0.44, dy: 0.46, z: 40, hoehe: 29 }, { dx: 0.56, dy: 0.52, z: 74, hoehe: 29 }, { dx: 0.48, dy: 0.56, z: 108 },
    ],
    zeichne: (gx, gy, drehung = 0) => gesamtSvg(etagereTeile(gx, gy, drehung)),
    schichten: (gx, gy, drehung = 0) => schichtenSvg(etagereTeile(gx, gy, drehung)),
  },
};
