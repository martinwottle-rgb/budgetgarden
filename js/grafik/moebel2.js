// Moebel Teil 2 als SVG-Strings: Beete, Sideboard, Pflanzentreppe, Vitrine, Sputnik, Raumteiler-Regal (SPEC-2, Abschnitt 1 bis 3).
// Gleiche Schnittstelle wie MOEBEL in moebel.js: {name, breite, tiefe, plaetze:[{dx, dy, z}], zeichne(gx, gy, drehung)}.
// Beete tragen zusaetzlich beet: true, ihre Plaetze ebenfalls.
// Lokal: u = Laenge entlang breite, v = Tiefe entlang tiefe. drehung 0: u auf gx, v auf gy.
// drehung 90: u auf gy, v auf gx. Plaetze (dx, dy, z) liegen im lokalen System, z in px.

import { iso, f, p2, poly, pfad, linie, oval, gruppe, tr, bodenschatten, gerundet } from './hilfen.js';

const KON12 = 'stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';
const MASER = 'stroke="#9c5f2e" stroke-width="0.7" stroke-linecap="round" opacity="0.8"';
const GLANZ = 'stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="0.85"';
const LICHT = 'stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.45"';
const TEAK = { oben: '#d99a5b', links: '#b8743d', rechts: '#8a5228' };
const TEAK_HELL = { oben: '#e8b07a', links: '#d99a5b', rechts: '#b8743d' };
const STAHL = { oben: '#eef1f4', links: '#c9cdd2', rechts: '#9aa1a8' };
const MESSING = { oben: '#e9cf8a', links: '#c9a14a', rechts: '#9c7a2c' };
const SENF = { oben: '#ecc16a', links: '#d9a441', rechts: '#b9872e' };
const PETROL = { oben: '#4f8f93', links: '#2f6f73', rechts: '#245a5d' };
const STEIN = { oben: '#e9e6e0', links: '#d9d6cf', rechts: '#b9b5ac' };
const ERDE = '#6b4a33';
const GLAS = 'fill="#cfeef7" fill-opacity="0.3" stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round"';
const GLAS_HINTEN = 'fill="#cfeef7" fill-opacity="0.14" stroke="#6b4a3a" stroke-width="0.8" stroke-linejoin="round"';
const BUCH = [
  { oben: '#d98f7f', links: '#c97b6b', rechts: '#a95f4f' },
  { oben: '#a8c9b6', links: '#8fb3a0', rechts: '#6f917f' },
  { oben: '#f0d293', links: '#e7c27a', rechts: '#c9a35a' },
];

// Lokale Koordinaten auf Feldkoordinaten abbilden
function feldPunkt(gx, gy, drehung, u, v) {
  return drehung === 90 ? [gx + v, gy + u] : [gx + u, gy + v];
}

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

// Quader mit Kontur 1.2 px. farben: oben (Licht), links (+gy), rechts (+gx)
function quader(m, u0, u1, v0, v1, z0, z1, farben) {
  const [x0, x1, y0, y1] = grenzen(m, u0, u1, v0, v1);
  return poly([iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)], `fill="${farben.links}" ${KON12}`) +
    poly([iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)], `fill="${farben.rechts}" ${KON12}`) +
    poly([iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)], `fill="${farben.oben}" ${KON12}`);
}

// Flaechen in lokaler Ebene: v konstant, u konstant oder z konstant
function flaecheV(m, u0, u1, v, z0, z1, attr) {
  return poly([pkt(m, u0, v, z0), pkt(m, u1, v, z0), pkt(m, u1, v, z1), pkt(m, u0, v, z1)], attr);
}
function flaecheU(m, u, v0, v1, z0, z1, attr) {
  return poly([pkt(m, u, v0, z0), pkt(m, u, v1, z0), pkt(m, u, v1, z1), pkt(m, u, v0, z1)], attr);
}
function flaecheH(m, u0, u1, v0, v1, z, attr) {
  return poly([pkt(m, u0, v0, z), pkt(m, u1, v0, z), pkt(m, u1, v1, z), pkt(m, u0, v1, z)], attr);
}

// Maserung auf einer waagerechten Flaeche, Linien entlang u
function maserH(m, u0, u1, v0, v1, z, n = 2) {
  let s = '';
  for (let k = 1; k <= n; k++) {
    const v = v0 + (v1 - v0) * k / (n + 1);
    s += linie(pkt(m, u0 + 0.08, v, z), pkt(m, u1 - 0.08, v, z), MASER);
  }
  return s;
}

// Kontaktschatten unter einer Grundflaeche b x t (Felder), Mittelpunkt im Feldmittelpunkt
function schatten(m, b, t) {
  const [x, y] = feldPunkt(m.gx, m.gy, m.drehung, b / 2, t / 2);
  return gruppe(tr(iso(x, y, 0)), bodenschatten(24 * (b + t) * 0.9, 12 * (b + t) * 0.9));
}

// Senkrechter Zylinder um (cx, cy) in Weltkoordinaten, Radius r (Felder), Hoehe z0 bis z1. Licht links, Schatten rechts.
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

// Gebogenes Rohr entlang von Bildschirmpunkten: Kontur, Koerper in farben.links, Glanzlinie in farben.oben
function rohr(punkte, dicke, farben, zusatz = '') {
  const d = punkte.map((p, i) => (i ? 'L' : 'M') + p2(p)).join('');
  const hell = punkte.map((p, i) => (i ? 'L' : 'M') + p2([p[0] - dicke * 0.25, p[1]])).join('');
  return pfad(d, `fill="none" stroke="#2b3f33" stroke-width="${f(dicke + 1.4)}" stroke-linejoin="round" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="${farben.links}" stroke-width="${dicke}" stroke-linejoin="round" stroke-linecap="round"`) +
    zusatz +
    pfad(hell, `fill="none" stroke="${farben.oben}" stroke-width="${f(dicke * 0.3)}" stroke-linecap="round" opacity="0.9"`);
}

// Ellipse in der waagerechten Ebene z (lokal, Radien ru, rv in Feldern), als Polygon
function ellipseAuf(m, u, v, z, ru, rv, attr, n = 16) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 2 * Math.PI;
    pts.push(pkt(m, u + ru * Math.cos(a), v + rv * Math.sin(a), z));
  }
  return poly(pts, attr);
}

// Schraeges Teakbein: vom Ansatz (u, v, zOben) nach aussen gespreizt (spreiz in Feldern) bis zum Fuss auf z 0, Messingkappe
function bein(m, u, v, zOben, cu, cv, spreiz) {
  const du = u - cu, dv = v - cv, len = Math.hypot(du, dv) || 1;
  const oben = pkt(m, u, v, zOben);
  const unten = pkt(m, u + du / len * spreiz, v + dv / len * spreiz, 0);
  return oval(unten[0], unten[1], 4.5, 2.2, 'fill="#6b4a3a" opacity="0.2"') +
    rohr([oben, unten], 4.6, TEAK) +
    oval(unten[0], unten[1] - 1.5, 2.8, 1.4, `fill="${MESSING.links}" stroke="#6b4a3a" stroke-width="0.6"`);
}

// Rahmen aus vier Wandstuecken (links, hinten, vorn, rechts), in Zeichenreihenfolge fern nach nah.
// zwischen wird nach dem hinteren Stueck eingefuegt (Erde im Trog).
function rahmen(m, U, V, z0, z1, b, farben, zwischen = '') {
  return quader(m, 0, b, 0, V, z0, z1, farben) +
    quader(m, b, U - b, 0, b, z0, z1, farben) +
    zwischen +
    quader(m, b, U - b, V - b, V, z0, z1, farben) +
    quader(m, U - b, U, 0, V, z0, z1, farben);
}

// Edelstahl-Trog: Wand aus Stahl, Erde auf zErde mit Kruemeln, vorn und rechts Glanzstreifen
function trog(m, U, V, z0, z1, zErde, b) {
  let erde = flaecheH(m, b, U - b, b, V - b, zErde, `fill="${ERDE}"`);
  for (let i = 0; i < 18; i++) {
    const u = b + (U - 2 * b) * ((i * 0.37 + 0.1) % 1);
    const v = b + (V - 2 * b) * ((i * 0.61 + 0.3) % 1);
    const [x, y] = pkt(m, u, v, zErde);
    erde += oval(x, y, 1.6 + (i % 3) * 0.6, 0.8 + (i % 2) * 0.4, `fill="${i % 2 ? '#4a2f20' : '#8a6548'}"`);
  }
  let s = rahmen(m, U, V, z0, z1, b, STAHL, erde);
  s += linie(pkt(m, U * 0.3, V, z0 + 6), pkt(m, U * 0.3, V, z1 - 6), GLANZ);
  s += linie(pkt(m, U, V * 0.3, z0 + 6), pkt(m, U, V * 0.3, z1 - 6), GLANZ);
  return s;
}

// Ebenen (wie in moebel.js): Teile-Funktionen liefern { teile, zs }; teile = [[ebene, svg], ...] in Zeichenreihenfolge,
// zs = Oberkante des Bretts je Schicht. zeichne() setzt alle Teile zusammen, schichten() sammelt je Ebene.
const gesamtSvg = (r) => r.teile.map((t) => t[1]).join('');
const schichtenSvg = (r) => r.zs.map((z, k) => ({ z, svg: r.teile.filter((t) => t[0] === k).map((t) => t[1]).join('') }));

// ---------- Kraeuterbeet 2x1 ----------
function kraeuterbeetZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const U = 2, V = 1;
  let s = schatten(m, U, V);
  for (const [u, v] of [[0.15, 0.15], [1.85, 0.15], [0.15, 0.85], [1.85, 0.85]]) s += bein(m, u, v, 22, U / 2, V / 2, 0.22);
  s += trog(m, U, V, 22, 45, 38, 0.08);
  return s;
}

// ---------- Hochbeet 2x2 ----------
function hochbeetZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const U = 2, V = 2;
  let s = schatten(m, U, V);
  s += quader(m, 0.03, U - 0.03, 0.03, V - 0.03, 0, 4, TEAK);
  s += trog(m, U, V, 4, 56, 46, 0.1);
  // Teak-Abdeckleiste auf dem oberen Rand
  s += rahmen(m, U, V, 56, 60, 0.16, TEAK_HELL);
  return s;
}

// ---------- Sideboard 2x1: Teakkorpus, zwei Schiebetueren (senf, petrol), Bein-Untergestell ----------
function sideboardZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const U = 2, V = 1;
  let s = schatten(m, U, V);
  for (const [u, v] of [[0.12, 0.12], [1.88, 0.12], [0.12, 0.88], [1.88, 0.88]]) s += bein(m, u, v, 14, U / 2, V / 2, 0.14);
  s += quader(m, 0, U, 0, V, 14, 56, TEAK);
  // Schiebetueren auf der Vorderseite (+v), Grifflöcher nahe der Mitte
  for (const [u0, u1, farben] of [[0.06, 0.94, SENF], [1.06, 1.94, PETROL]]) {
    s += flaecheV(m, u0, u1, V + 0.02, 18, 52, `fill="${farben.links}" ${KON12}`);
    s += flaecheV(m, u0 + 0.06, u1 - 0.06, V + 0.02, 48, 50, `fill="${farben.oben}" opacity="0.6"`);
  }
  for (const [u0, u1] of [[0.86, 0.92], [1.08, 1.14]]) {
    const loch = [pkt(m, u0, V + 0.03, 40), pkt(m, u1, V + 0.03, 40), pkt(m, u1, V + 0.03, 32), pkt(m, u0, V + 0.03, 32)];
    s += pfad(gerundet(loch, 1.5), 'fill="#3d2b20" stroke="#6b4a3a" stroke-width="0.6"');
  }
  // Abdeckplatte mit leichtem Ueberstand
  s += quader(m, -0.04, U + 0.04, -0.04, V + 0.04, 56, 60, TEAK_HELL);
  s += maserH(m, -0.04, U + 0.04, -0.04, V + 0.04, 60, 2);
  return s;
}

// ---------- Pflanzentreppe 1x1: drei gestufte Podeste, hinten am hoechsten ----------
function pflanzentreppeZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  let s = schatten(m, 1, 1);
  // Von fern (hoch) nach nah (niedrig)
  for (const [u0, u1, z] of [[0.02, 0.34, 54], [0.34, 0.66, 36], [0.66, 0.98, 18]]) {
    s += quader(m, u0, u1, 0.04, 0.96, 0, z, TEAK) + maserH(m, u0, u1, 0.04, 0.96, z, 2);
  }
  return s;
}

// ---------- Glasvitrine mit Terrarium 1x1 ----------
function vitrineTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  // Ebenen: 0 = Boden bis Zwischenboden 40 (Platz z 44), 1 = bis Zwischenboden 84 (Platz z 88), 2 = Deckplatte und Terrarium
  const T = [[0, schatten(m, 1, 1)], [0, quader(m, 0.02, 0.98, 0.02, 0.98, 0, 8, TEAK)]];
  // Hinteres und linkes Glas (kaum sichtbar), hintere Pfosten
  T.push([0, flaecheV(m, 0.08, 0.92, 0.08, 12, 120, GLAS_HINTEN)]);
  T.push([0, flaecheU(m, 0.08, 0.08, 0.92, 12, 120, GLAS_HINTEN)]);
  T.push([0, quader(m, 0.02, 0.08, 0.02, 0.08, 12, 120, TEAK)]);
  T.push([0, quader(m, 0.92, 0.98, 0.02, 0.08, 12, 120, TEAK)]);
  T.push([0, quader(m, 0.02, 0.98, 0.02, 0.98, 8, 12, TEAK)]);
  // Zwischenboeden (Plaetze liegen auf der Oberseite)
  [[40, 0], [84, 1]].forEach(([z, k]) => {
    T.push([k, quader(m, 0.08, 0.92, 0.08, 0.92, z, z + 4, TEAK) + maserH(m, 0.08, 0.92, 0.08, 0.92, z + 4, 1)]);
  });
  // Vordere Pfosten, dann vorderes und rechtes Glas mit Glanzlinien (nah, obere Ebene)
  T.push([2, quader(m, 0.02, 0.08, 0.92, 0.98, 12, 120, TEAK)]);
  T.push([2, quader(m, 0.92, 0.98, 0.92, 0.98, 12, 120, TEAK)]);
  T.push([2, flaecheV(m, 0.08, 0.92, 0.92, 12, 120, GLAS)]);
  T.push([2, flaecheU(m, 0.92, 0.08, 0.92, 12, 120, GLAS)]);
  T.push([2, linie(pkt(m, 0.22, 0.92, 110), pkt(m, 0.34, 0.92, 70), LICHT) + linie(pkt(m, 0.92, 0.22, 110), pkt(m, 0.92, 0.34, 70), LICHT)]);
  // Deckplatte
  T.push([2, quader(m, 0.02, 0.98, 0.02, 0.98, 120, 124, TEAK)]);
  // Terrarium: Sockel, hintere Glaswaende, Moos und Steine, vordere Glaswaende, Deckel
  T.push([2, quader(m, 0.2, 0.8, 0.2, 0.8, 124, 127, TEAK)]);
  T.push([2, flaecheV(m, 0.24, 0.76, 0.24, 127, 165, GLAS_HINTEN)]);
  T.push([2, flaecheU(m, 0.24, 0.24, 0.76, 127, 165, GLAS_HINTEN)]);
  let moos = '';
  for (const [u, v, ru, rv, c] of [[0.36, 0.56, 0.12, 0.09, '#5e9a52'], [0.54, 0.42, 0.1, 0.08, '#7fb069'], [0.6, 0.62, 0.08, 0.06, '#5e9a52'], [0.42, 0.38, 0.06, 0.05, '#9ccc7a']]) {
    moos += ellipseAuf(m, u, v, 127, ru, rv, `fill="${c}" stroke="#4f8a4a" stroke-width="0.6"`, 12);
  }
  T.push([2, moos]);
  let steine = '';
  for (const [u, v, r] of [[0.66, 0.34, 4], [0.3, 0.3, 3.2], [0.7, 0.68, 3]]) {
    const [x, y] = pkt(m, u, v, 131);
    steine += oval(x, y, r * 1.3, r, `fill="${STEIN.oben}" ${KON12}`);
    steine += oval(x - 1, y - 1, r * 0.5, r * 0.3, 'fill="#ffffff" opacity="0.7"');
  }
  T.push([2, steine]);
  T.push([2, flaecheV(m, 0.24, 0.76, 0.76, 127, 165, GLAS)]);
  T.push([2, flaecheU(m, 0.76, 0.24, 0.76, 127, 165, GLAS)]);
  T.push([2, flaecheH(m, 0.24, 0.76, 0.24, 0.76, 165, GLAS)]);
  return { teile: T, zs: [44, 88, 124] };
}

// ---------- Sputnik-Pflanzenstaender 1x1: Messingstange, vier Arme in verschiedenen Hoehen, Teakschalen ----------
// Arm mit Schale: (bu, bv) lokale Schalenmitte, zh Oberkante der Schale (= Platzhoehe)
function sputnikArm(m, bu, bv, zh) {
  const [wx, wy] = feldPunkt(m.gx, m.gy, m.drehung, bu, bv);
  const [ox, oy] = iso(wx, wy, zh);
  return rohr([pkt(m, 0.5, 0.5, zh), pkt(m, bu, bv, zh - 6)], 2.6, MESSING) +
    zylinder(wx, wy, 0.22, zh - 6, zh, TEAK) +
    oval(ox, oy, 10.5, 5.3, 'fill="#8a5228" opacity="0.6"');
}

// Ebenen = Arme (je eine Schicht pro Armhoehe). Die Mittelstange wird je Schicht abschnittsweise gezeichnet.
function sputnikTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const [wx, wy] = feldPunkt(gx, gy, drehung, 0.5, 0.5);
  const T = [[0, schatten(m, 1, 1)], [0, zylinder(wx, wy, 0.3, 0, 4, MESSING)]];
  // Hintere Arme zuerst, dann die Mittelstange, dann die vorderen Arme
  T.push([3, sputnikArm(m, 0.22, 0.5, 146)]);
  T.push([0, sputnikArm(m, 0.5, 0.22, 64)]);
  for (const [a, b, k] of [[4, 78, 0], [78, 112, 1], [112, 140, 2], [140, 160, 3]]) {
    T.push([k, rohr([pkt(m, 0.5, 0.5, a), pkt(m, 0.5, 0.5, b)], 3.4, MESSING)]);
  }
  T.push([2, sputnikArm(m, 0.78, 0.5, 118)]);
  T.push([1, sputnikArm(m, 0.5, 0.78, 84)]);
  return { teile: T, zs: [64, 84, 118, 146] };
}

// ---------- Raumteiler-Regal 3x1: offen, drei Spalten mit unterschiedlichen Faechern ----------
// Ebenen nach Bretthoehen: 0 = C 44, 1 = A 60, 2 = B 88, 3 = C 104, 4 = A 120, 5 = B 144, 6 = oberste Bretter 174.
// Rueckwaende (fern) liegen ganz in der Ebene ihres unteren Endes, Trennwaende werden je Ebene abgeschnitten.
function hochregalTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const T = [[0, schatten(m, 3, 1)]];
  // Rueckwaende: senf in Spalte B (Mitte), petrol in Spalte A (oben). Liegen hinten, zuerst zeichnen.
  // Die Trennwaende sind nur so hoch, dass die Rueckwaende aus der Isometrie sichtbar bleiben.
  T.push([2, quader(m, 1.03, 1.97, 0, 0.05, 88, 140, SENF)]);
  T.push([1, quader(m, 0.05, 0.97, 0, 0.05, 60, 116, PETROL)]);
  T.push([0, quader(m, 0, 0.05, 0, 1, 0, 174, TEAK)]);
  // Spalte A
  for (const [z0, z1, k] of [[0, 4, 0], [56, 60, 1], [116, 120, 4], [170, 174, 6]]) T.push([k, quader(m, 0.05, 0.97, 0, 1, z0, z1, TEAK)]);
  // Buecher auf Brettern ohne Pflanze
  T.push([1, quader(m, 0.55, 0.63, 0.2, 0.6, 60, 60 + 26, BUCH[0]) + quader(m, 0.64, 0.71, 0.2, 0.6, 60, 60 + 32, BUCH[1]) + quader(m, 0.72, 0.79, 0.2, 0.6, 60, 60 + 22, BUCH[2])]);
  T.push([0, quader(m, 0.97, 1.03, 0, 1, 0, 56, TEAK)]);
  // Spalte B
  for (const [z0, z1, k] of [[0, 4, 0], [84, 88, 2], [140, 144, 5], [170, 174, 6]]) T.push([k, quader(m, 1.03, 1.97, 0, 1, z0, z1, TEAK)]);
  T.push([6, quader(m, 1.2, 1.3, 0.2, 0.6, 174, 174 + 30, BUCH[2]) + quader(m, 1.3, 1.38, 0.2, 0.6, 174, 174 + 24, BUCH[0])]);
  // Trennwand B|C: in den Ebenen 0, 1 und 2 abgeschnitten
  T.push([0, quader(m, 1.97, 2.03, 0, 1, 0, 56, TEAK)]);
  T.push([1, quader(m, 1.97, 2.03, 0, 1, 56, 84, TEAK)]);
  T.push([2, quader(m, 1.97, 2.03, 0, 1, 84, 88, TEAK)]);
  // Spalte C
  for (const [z0, z1, k] of [[0, 4, 0], [40, 44, 0], [100, 104, 3], [170, 174, 6]]) T.push([k, quader(m, 2.03, 2.95, 0, 1, z0, z1, TEAK)]);
  T.push([0, quader(m, 2.1, 2.2, 0.2, 0.6, 44, 44 + 28, BUCH[1]) + quader(m, 2.2, 2.3, 0.2, 0.6, 44, 44 + 20, BUCH[0])]);
  T.push([6, quader(m, 2.95, 3, 0, 1, 0, 174, TEAK)]);
  return { teile: T, zs: [44, 60, 88, 104, 120, 144, 174] };
}

export const MOEBEL2 = {
  kraeuterbeet: {
    name: 'Kräuterbeet',
    breite: 2,
    tiefe: 1,
    beet: true,
    plaetze: [
      { dx: 0.3, dy: 0.5, z: 38, beet: true }, { dx: 0.7, dy: 0.5, z: 38, beet: true },
      { dx: 1.3, dy: 0.5, z: 38, beet: true }, { dx: 1.7, dy: 0.5, z: 38, beet: true },
    ],
    zeichne: (gx, gy, drehung = 0) => kraeuterbeetZeichnen(gx, gy, drehung),
  },
  hochbeet: {
    name: 'Hochbeet',
    breite: 2,
    tiefe: 2,
    beet: true,
    plaetze: [
      { dx: 0.35, dy: 0.6, z: 46, beet: true }, { dx: 1.0, dy: 0.6, z: 46, beet: true }, { dx: 1.65, dy: 0.6, z: 46, beet: true },
      { dx: 0.35, dy: 1.4, z: 46, beet: true }, { dx: 1.0, dy: 1.4, z: 46, beet: true }, { dx: 1.65, dy: 1.4, z: 46, beet: true },
    ],
    zeichne: (gx, gy, drehung = 0) => hochbeetZeichnen(gx, gy, drehung),
  },
  sideboard: {
    name: 'Sideboard',
    breite: 2,
    tiefe: 1,
    plaetze: [{ dx: 0.35, dy: 0.5, z: 60 }, { dx: 1.0, dy: 0.5, z: 60 }, { dx: 1.65, dy: 0.5, z: 60 }],
    zeichne: (gx, gy, drehung = 0) => sideboardZeichnen(gx, gy, drehung),
  },
  pflanzentreppe: {
    name: 'Pflanzentreppe',
    breite: 1,
    tiefe: 1,
    plaetze: [{ dx: 0.18, dy: 0.5, z: 54 }, { dx: 0.5, dy: 0.5, z: 36 }, { dx: 0.82, dy: 0.5, z: 18 }],
    zeichne: (gx, gy, drehung = 0) => pflanzentreppeZeichnen(gx, gy, drehung),
  },
  vitrine: {
    name: 'Glasvitrine mit Terrarium',
    breite: 1,
    tiefe: 1,
    plaetze: [{ dx: 0.5, dy: 0.5, z: 44, hoehe: 40 }, { dx: 0.5, dy: 0.5, z: 88, hoehe: 32 }],
    zeichne: (gx, gy, drehung = 0) => gesamtSvg(vitrineTeile(gx, gy, drehung)),
    schichten: (gx, gy, drehung = 0) => schichtenSvg(vitrineTeile(gx, gy, drehung)),
  },
  sputnik: {
    name: 'Sputnik-Pflanzenständer',
    breite: 1,
    tiefe: 1,
    plaetze: [
      { dx: 0.78, dy: 0.5, z: 118 }, { dx: 0.5, dy: 0.78, z: 84 },
      { dx: 0.22, dy: 0.5, z: 146 }, { dx: 0.5, dy: 0.22, z: 64 },
    ],
    zeichne: (gx, gy, drehung = 0) => gesamtSvg(sputnikTeile(gx, gy, drehung)),
    schichten: (gx, gy, drehung = 0) => schichtenSvg(sputnikTeile(gx, gy, drehung)),
  },
  hochregal: {
    name: 'Raumteiler-Regal',
    breite: 3,
    tiefe: 1,
    plaetze: [
      { dx: 0.2, dy: 0.85, z: 60, hoehe: 56 }, { dx: 0.2, dy: 0.5, z: 120, hoehe: 50 },
      { dx: 1.5, dy: 0.5, z: 88, hoehe: 52 }, { dx: 1.5, dy: 0.5, z: 144, hoehe: 26 },
      { dx: 2.49, dy: 0.5, z: 44, hoehe: 56 }, { dx: 2.49, dy: 0.5, z: 104, hoehe: 66 },
      { dx: 0.2, dy: 0.5, z: 174 }, { dx: 1.5, dy: 0.5, z: 174 }, { dx: 2.49, dy: 0.5, z: 174 },
    ],
    zeichne: (gx, gy, drehung = 0) => gesamtSvg(hochregalTeile(gx, gy, drehung)),
    schichten: (gx, gy, drehung = 0) => schichtenSvg(hochregalTeile(gx, gy, drehung)),
  },
};
