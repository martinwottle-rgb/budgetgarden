// Moebel Teil 2 als SVG-Strings: Beete, Sideboard, Pflanzentreppe, Vitrine, Sputnik, Raumteiler-Regal, Zinkregale (SPEC-5, Abschnitt 7).
// Gleiche Schnittstelle wie MOEBEL in moebel.js: {name, breite, tiefe, plaetze:[{dx, dy, z}], zeichne(gx, gy, drehung)}.
// Beete tragen zusaetzlich beet: true, ihre Plaetze ebenfalls.
// Lokal: u = Laenge entlang breite, v = Tiefe entlang tiefe. drehung 0: u auf gx, v auf gy.
// drehung 90: u auf gy, v auf gx. Plaetze (dx, dy, z) liegen im lokalen System, z in px.
// Plastik ohne Filter: Flaechen mit linearen Verlaeufen, Licht von links oben, helle Oberkanten, dunkle Unterkanten,
// weiche radiale Kontaktschatten. Verlaufs-Ids tragen einen Zaehler, damit sich Moebel nicht gegenseitig ueberschreiben.

import { iso, f, p2, poly, pfad, linie, oval, gerundet, zufall } from './hilfen.js';

const KON12 = 'stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"';
const KON08 = 'stroke="#6b4a3a" stroke-width="0.8" stroke-linejoin="round" stroke-linecap="round"';
const LICHT_KANTE = 'stroke="#fff6e6" stroke-width="1" stroke-linecap="round" opacity="0.6"';
const DUNKEL_KANTE = 'stroke="#3a220f" stroke-width="0.9" stroke-linecap="round" opacity="0.35"';
const GLANZ = 'stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.75"';
const LICHT = 'stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.45"';
const MASER = 'stroke="#9c5f2e" stroke-width="0.7" stroke-linecap="round" opacity="0.8"';
const MASER_TOENE = ['#9c5f2e', '#7a4520', '#c07a40'];
const TEAK_LICHT = '#f0c08a';
const TEAK_FUGE = '#3d2412';
const KAPPE_R = 0.03, KAPPE_H = 4.5; // Messingkappe am Beinende: Radius und Hoehe

// Materialien: je Seite [heller Ton, dunkler Ton]. oben: Licht links oben. links: +gy. rechts: +gx (Schattenseite).
const TEAK = { oben: ['#f0c08a', '#d99a5b'], links: ['#d9a06a', '#b06c34'], rechts: ['#a05f2c', '#73421c'] };
const TEAK_HELL = { oben: ['#f9d7a8', '#eab27c'], links: ['#eeb47e', '#d39457'], rechts: ['#c98a4f', '#a2612f'] };
const STAHL = { oben: ['#fbfcfd', '#dfe4e9'], links: ['#e4e8ec', '#b4bcc4'], rechts: ['#a3abb3', '#7b838b'] };
const ZINK = { oben: ['#f6f8f9', '#d6dce1'], links: ['#dde2e7', '#aab2ba'], rechts: ['#9aa2aa', '#6c747c'] };
const ZINK_KANTE = { oben: ['#c9ced4', '#a4acb4'], links: ['#b6bdc4', '#8c949c'], rechts: ['#838b93', '#5d656d'] };
const MESSING = { oben: ['#fbe9b0', '#e2bd66'], links: ['#e6c374', '#b8913c'], rechts: ['#a57c2c', '#72551a'] };
const SENF = { oben: ['#fbd98a', '#eeb856'], links: ['#eab454', '#c9902f'], rechts: ['#c08a2f', '#8c6220'] };
const PETROL = { oben: ['#8cc2c4', '#5b9ea2'], links: ['#4a8e92', '#2f6f73'], rechts: ['#2c6366', '#1c4a4d'] };
const KUNST = { oben: ['#5a5a5f', '#3a3a3e'], links: ['#3d3d42', '#26262a'], rechts: ['#222226', '#141417'] };
const HOLZ_KISTE = { oben: ['#f3c99a', '#dca06a'], links: ['#dca36a', '#b97a45'], rechts: ['#b97a45', '#8c5530'] };
const ERDE = { oben: ['#8a6446', '#5a3d28'], links: ['#6e4d33', '#4a2f20'], rechts: ['#4f3523', '#33200f'] };
const STEIN = { oben: ['#fbfaf6', '#e2dfd6'], links: ['#e6e3dc', '#c9c5bb'], rechts: ['#b3afa5', '#8f8b82'] };
const MOOS = { oben: ['#b5de8c', '#5e9a52'], links: ['#7fb069', '#4f8a4a'], rechts: ['#5e9a52', '#3a6b3a'] };
const BUCH = [
  { oben: ['#ecaa9a', '#d98f7f'], links: ['#d98f7f', '#b8685a'], rechts: ['#b8685a', '#8a4a3d'] },
  { oben: ['#c4e2d2', '#a8c9b6'], links: ['#a8c9b6', '#7fa890'], rechts: ['#7fa890', '#58796a'] },
  { oben: ['#fbe4ad', '#f0d293'], links: ['#f0d293', '#d7b06a'], rechts: ['#d7b06a', '#a88341'] },
];

// Verlaufs-Zaehler: jede Verlaufs-Id ist im Dokument eindeutig
let zaehler = 0;

// Lineare Verlaufsdefinition. stops = [[offset, farbe, deckkraft?], ...]
function verlauf(id, x1, y1, x2, y2, stops) {
  const st = stops.map(([o, c, d]) => `<stop offset="${o}" stop-color="${c}"${d === undefined ? '' : ` stop-opacity="${d.toFixed(2)}"`}/>`).join('');
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${st}</linearGradient>`;
}

// Flaechenverlaeufe eines Materials. oben: diagonal (Licht links oben). links und rechts: senkrecht, oben hell, unten dunkel.
// quer: waagerecht ueber einen runden Koerper (Helligkeit links, dunkel rechts). Liefert fill-Werte und das <defs> dazu.
function materialVerlaeufe(mat) {
  const n = ++zaehler;
  const id = (teil) => `m2-${n}-${teil}`;
  const defs = verlauf(id('oben'), 0, 0, 1, 1, [[0, mat.oben[0]], [1, mat.oben[1]]]) +
    verlauf(id('links'), 0, 0, 0, 1, [[0, mat.links[0]], [1, mat.links[1]]]) +
    verlauf(id('rechts'), 0, 0, 0, 1, [[0, mat.rechts[0]], [1, mat.rechts[1]]]) +
    verlauf(id('quer'), 0, 0, 1, 0, [[0, mat.links[1]], [0.3, mat.oben[0]], [0.6, mat.links[0]], [1, mat.rechts[1]]]);
  return {
    defs: `<defs>${defs}</defs>`,
    oben: `url(#${id('oben')})`, links: `url(#${id('links')})`, rechts: `url(#${id('rechts')})`, quer: `url(#${id('quer')})`,
  };
}

// Weicher Schatten: radialer Verlauf (kein Filter), innen dunkler, aussen transparent
function weich(ox, oy, rx, ry, deckkraft = 0.4) {
  const id = `m2-${++zaehler}-weich`;
  const st = [[0, deckkraft], [0.55, deckkraft * 0.45], [1, 0]]
    .map(([o, d]) => `<stop offset="${o}" stop-color="#3a220f" stop-opacity="${d.toFixed(2)}"/>`).join('');
  return `<defs><radialGradient id="${id}">${st}</radialGradient></defs>` + oval(ox, oy, rx, ry, `fill="url(#${id})"`);
}

// Glasverlauf: oben heller und blaeulich, unten transparenter. hinten: noch blasser und duenner konturiert
function glasVerlauf(hinten) {
  const id = `m2-${++zaehler}-glas`;
  const a = hinten ? 0.5 : 1;
  return {
    defs: `<defs>${verlauf(id, 0, 0, 0, 1, [[0, '#f2fbff', 0.5 * a], [0.55, '#c4e9f4', 0.3 * a], [1, '#8fc9da', 0.42 * a]])}</defs>`,
    fill: `url(#${id})`,
    kontur: hinten ? 0.8 : 1.2,
  };
}

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

// Quader mit Verlaeufen. Vordere Oberkanten bekommen eine helle Lichtkante, vordere Unterkanten eine dunkle Kante.
// fv: Materialobjekt mit links (+gy), rechts (+gx) und oben als fill-Werte.
function quader(m, u0, u1, v0, v1, z0, z1, fv) {
  const [x0, x1, y0, y1] = grenzen(m, u0, u1, v0, v1);
  return poly([iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)], `fill="${fv.links}" ${KON12}`) +
    poly([iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)], `fill="${fv.rechts}" ${KON12}`) +
    poly([iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)], `fill="${fv.oben}" ${KON12}`) +
    linie(iso(x0, y1, z1), iso(x1, y1, z1), LICHT_KANTE) + linie(iso(x1, y1, z1), iso(x1, y0, z1), LICHT_KANTE) +
    linie(iso(x0, y1, z0), iso(x1, y1, z0), DUNKEL_KANTE) + linie(iso(x1, y1, z0), iso(x1, y0, z0), DUNKEL_KANTE);
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

// Linienzug aus Bildschirmpunkten
function linienzug(pts, attr) {
  return pfad(pts.map((p, i) => (i ? 'L' : 'M') + p2(p)).join(''), `fill="none" ${attr}`);
}

// Feine geschwungene Maserung auf einer waagerechten Flaeche, Linien entlang u (2 bis 3 Toene, dezent)
function maserung(m, u0, u1, v0, v1, z, n, seed) {
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
    const farbe = MASER_TOENE[Math.floor(rnd() * MASER_TOENE.length)];
    const op = (0.35 + rnd() * 0.15).toFixed(2), w = (0.6 + rnd() * 0.3).toFixed(2);
    s += linienzug(pts, `stroke="${farbe}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"`);
  }
  return s;
}

// Holzbrett: Quader mit Verlauf und feiner Maserung auf der Oberseite
function brett(m, u0, u1, v0, v1, z0, z1, holz, seed) {
  return quader(m, u0, u1, v0, v1, z0, z1, holz) + maserung(m, u0 + 0.06, u1 - 0.06, v0 + 0.15, v1 - 0.15, z1, 1, seed);
}

// Kontaktschatten am Boden unter einer Grundflaeche b x t (Felder), Mittelpunkt im Feldmittelpunkt
function schatten(m, b, t) {
  const [x, y] = feldPunkt(m.gx, m.gy, m.drehung, b / 2, t / 2);
  const [ox, oy] = iso(x, y, 0);
  return weich(ox, oy, 24 * (b + t) * 0.9, 12 * (b + t) * 0.9, 0.45);
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

// Punkte einer Ellipse in der waagerechten Ebene z (lokal, Radien ru, rv in Feldern)
function ellipsePunkte(m, u, v, z, ru, rv, n = 20) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 2 * Math.PI;
    pts.push(pkt(m, u + ru * Math.cos(a), v + rv * Math.sin(a), z));
  }
  return pts;
}

// Senkrechter Zylinder (Kreis in der Ebene) um (u, v), Radius r, Hoehe z0 bis z1. Huelle mit Querverlauf, Deckel mit Verlauf.
function zylinderV(m, u, v, r, z0, z1, mat, n = 20) {
  const oben = ellipsePunkte(m, u, v, z1, r, r, n);
  const unten = ellipsePunkte(m, u, v, z0, r, r, n);
  return poly(konvex([...oben, ...unten]), `fill="${mat.quer}" ${KON08}`) + poly(oben, `fill="${mat.oben}" ${KON08}`);
}

// Schraeg verjuengter Holzstab von der Oberkante oben = [u, v, z] zum Fuss unten = [u, v, z].
// Querverlauf ueber die Silhouette, helle Lichtlinie links, dunkle Fuge rechts.
function holzBein(m, oben, unten, rO, rU, holz) {
  const ecken = (c, r) => [[-r, -r], [r, -r], [r, r], [-r, r]].map(([du, dv]) => pkt(m, c[0] + du, c[1] + dv, c[2]));
  const huelle = konvex([...ecken(oben, rO), ...ecken(unten, rU)]);
  const a = pkt(m, oben[0], oben[1], oben[2]), b = pkt(m, unten[0], unten[1], unten[2]);
  return poly(huelle, `fill="${holz.quer}" ${KON12}`) +
    linie([a[0] - 0.9, a[1]], [b[0] - 0.5, b[1]], `stroke="${TEAK_LICHT}" stroke-width="1" stroke-linecap="round" opacity="0.85"`) +
    linie([a[0] + 1.3, a[1]], [b[0] + 0.7, b[1]], `stroke="${TEAK_FUGE}" stroke-width="0.8" stroke-linecap="round" opacity="0.5"`);
}

// Messingkappe am Fuss: kleiner Zylinder von z 0 bis KAPPE_H mit Glanzpunkt auf dem Deckel
function messingKappe(m, u, v, messing) {
  const [ox, oy] = pkt(m, u, v, KAPPE_H);
  return zylinderV(m, u, v, KAPPE_R, 0, KAPPE_H, messing, 14) + oval(ox - 0.4, oy - 0.2, 0.5, 0.25, 'fill="#fff6d6" opacity="0.9"');
}

// Punkt auf der Beinachse in Kappenhoehe (Bein von oben nach Fuss bei z 0)
function kappenAnsatz(oben, fuss) {
  const t = KAPPE_H / oben[2];
  return [fuss[0] + (oben[0] - fuss[0]) * t, fuss[1] + (oben[1] - fuss[1]) * t, KAPPE_H];
}

// Fussposition eines schraegen Beins: um spreiz (Felder) von (u, v) weg von (cu, cv)
function fussVon(u, v, cu, cv, spreiz) {
  const du = u - cu, dv = v - cv, len = Math.hypot(du, dv) || 1;
  return [u + du / len * spreiz, v + dv / len * spreiz];
}

// Schraeg ausgestelltes Holzbein mit Messingkappe. Reihenfolge: erst Kontaktschatten, dann die Kappe, dann das Bein,
// das in der Kappe endet (eine breitere Kappe liegt nie ueber dem Bein).
function holzStandBein(m, u, v, fu, fw, zOben, holz, messing) {
  const [ax, ay] = pkt(m, fu, fw, 0);
  return weich(ax, ay, 5, 2.6, 0.4) +
    messingKappe(m, fu, fw, messing) +
    holzBein(m, [u, v, zOben], kappenAnsatz([u, v, zOben], [fu, fw]), 0.05, 0.022, holz);
}

// Sprenkel-artige Erdkruemel auf einer waagerechten Flaeche (deterministisch ueber seed)
function krumel(m, u0, u1, v0, v1, z, n, seed) {
  const rnd = zufall(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const [x, y] = pkt(m, u0 + (u1 - u0) * rnd(), v0 + (v1 - v0) * rnd(), z);
    const r = 0.9 + rnd() * 1.2;
    const hell = i % 3 === 0;
    s += oval(x, y, r, r * 0.55, `fill="${hell ? '#9a7455' : '#3a2415'}" opacity="${(0.5 + rnd() * 0.4).toFixed(2)}"`);
    if (hell) s += oval(x - 0.3, y - 0.2, r * 0.4, r * 0.2, 'fill="#e8c9a4" opacity="0.5"');
  }
  return s;
}

// Rahmen aus vier Wandstuecken (links, hinten, vorn, rechts), in Zeichenreihenfolge fern nach nah.
// zwischen wird nach dem hinteren Stueck eingefuegt (Erde im Trog).
function rahmen(m, U, V, z0, z1, b, fv, zwischen = '') {
  return quader(m, 0, b, 0, V, z0, z1, fv) +
    quader(m, b, U - b, 0, b, z0, z1, fv) +
    zwischen +
    quader(m, b, U - b, V - b, V, z0, z1, fv) +
    quader(m, U - b, U, 0, V, z0, z1, fv);
}

// Edelstahl-Trog: Wand aus Stahl mit Verlauf und Glanzkante, Erde auf zErde mit Verlauf, dunkler Randfuge und Kruemeln
function trog(m, U, V, z0, z1, zErde, b, stahl, erde) {
  let innen = flaecheH(m, b, U - b, b, V - b, zErde, `fill="${erde.oben}" stroke="#3a220f" stroke-width="0.8" stroke-opacity="0.6"`);
  innen += krumel(m, b, U - b, b, V - b, zErde, 18, 7);
  let s = rahmen(m, U, V, z0, z1, b, stahl, innen);
  s += linie(pkt(m, U * 0.3, V, z0 + 6), pkt(m, U * 0.3, V, z1 - 6), GLANZ);
  s += linie(pkt(m, U, V * 0.3, z0 + 6), pkt(m, U, V * 0.3, z1 - 6), GLANZ);
  return s;
}

// ---------- Kraeuterbeet 2x1 ----------
function kraeuterbeetZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const U = 2, V = 1;
  const holz = materialVerlaeufe(TEAK), messing = materialVerlaeufe(MESSING);
  const stahl = materialVerlaeufe(STAHL), erde = materialVerlaeufe(ERDE);
  let s = holz.defs + messing.defs + stahl.defs + erde.defs + schatten(m, U, V);
  // Beine zuerst (liegen unter dem Trog)
  for (const [u, v] of [[0.15, 0.15], [1.85, 0.15], [0.15, 0.85], [1.85, 0.85]]) {
    const [fu, fw] = fussVon(u, v, U / 2, V / 2, 0.22);
    s += holzStandBein(m, u, v, fu, fw, 22, holz, messing);
  }
  s += trog(m, U, V, 22, 45, 38, 0.08, stahl, erde);
  return s;
}

// ---------- Hochbeet 2x2 ----------
function hochbeetZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const U = 2, V = 2;
  const holz = materialVerlaeufe(TEAK), hell = materialVerlaeufe(TEAK_HELL);
  const stahl = materialVerlaeufe(STAHL), erde = materialVerlaeufe(ERDE);
  let s = holz.defs + hell.defs + stahl.defs + erde.defs + schatten(m, U, V);
  s += quader(m, 0.03, U - 0.03, 0.03, V - 0.03, 0, 4, holz);
  s += trog(m, U, V, 4, 56, 46, 0.1, stahl, erde);
  // Teak-Abdeckleiste auf dem oberen Rand
  s += rahmen(m, U, V, 56, 60, 0.16, hell);
  return s;
}

// Schiebetuer vorn auf der Ebene v = V + 0.02: Platte mit Verlauf, heller Streifen oben, dunkler Streifen unten
function tuer(m, u0, u1, V, mat) {
  const seite = m.drehung === 90 ? mat.rechts : mat.links;
  let s = flaecheV(m, u0, u1, V + 0.02, 18, 52, `fill="${seite}" ${KON12}`);
  s += flaecheV(m, u0 + 0.06, u1 - 0.06, V + 0.02, 48, 50, 'fill="#fff6e6" opacity="0.3"');
  s += flaecheV(m, u0 + 0.06, u1 - 0.06, V + 0.02, 20, 22, 'fill="#3a220f" opacity="0.2"');
  return s;
}

// ---------- Sideboard 2x1: Teakkorpus, zwei Schiebetueren (senf, petrol), Bein-Untergestell ----------
function sideboardZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const U = 2, V = 1;
  const holz = materialVerlaeufe(TEAK), hell = materialVerlaeufe(TEAK_HELL);
  const senf = materialVerlaeufe(SENF), petrol = materialVerlaeufe(PETROL), messing = materialVerlaeufe(MESSING);
  let s = holz.defs + hell.defs + senf.defs + petrol.defs + messing.defs + schatten(m, U, V);
  for (const [u, v] of [[0.12, 0.12], [1.88, 0.12], [0.12, 0.88], [1.88, 0.88]]) {
    const [fu, fw] = fussVon(u, v, U / 2, V / 2, 0.14);
    s += holzStandBein(m, u, v, fu, fw, 14, holz, messing);
  }
  s += quader(m, 0, U, 0, V, 14, 56, holz);
  // Schiebetueren auf der Vorderseite (+v)
  s += tuer(m, 0.06, 0.94, V, senf) + tuer(m, 1.06, 1.94, V, petrol);
  // Grifflöcher nahe der Mitte
  for (const [u0, u1] of [[0.86, 0.92], [1.08, 1.14]]) {
    const loch = [pkt(m, u0, V + 0.03, 40), pkt(m, u1, V + 0.03, 40), pkt(m, u1, V + 0.03, 32), pkt(m, u0, V + 0.03, 32)];
    s += pfad(gerundet(loch, 1.5), 'fill="#3d2b20" stroke="#6b4a3a" stroke-width="0.6"');
  }
  // Abdeckplatte mit leichtem Ueberstand
  s += quader(m, -0.04, U + 0.04, -0.04, V + 0.04, 56, 60, hell);
  s += maserung(m, -0.02, U + 0.02, 0.1, V - 0.1, 60, 2, 31);
  return s;
}

// ---------- Pflanzentreppe 1x1: drei gestufte Podeste, hinten am hoechsten ----------
function pflanzentreppeZeichnen(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const holz = materialVerlaeufe(TEAK);
  let s = holz.defs + schatten(m, 1, 1);
  // Von fern (hoch) nach nah (niedrig)
  [[0.02, 0.34, 54], [0.34, 0.66, 36], [0.66, 0.98, 18]].forEach(([u0, u1, z], k) => {
    s += quader(m, u0, u1, 0.04, 0.96, 0, z, holz) + maserung(m, u0 + 0.04, u1 - 0.04, 0.1, 0.9, z, 2, 41 + k);
  });
  return s;
}

// Glasscheibe: Achse 'v' liegt bei v = c (laeuft entlang u), Achse 'u' bei u = c (laeuft entlang v). Zwei schmale Spiegelstreifen.
function scheibe(m, achse, c, a0, a1, z0, z1, g) {
  const attr = `fill="${g.fill}" stroke="#6b4a3a" stroke-width="${g.kontur}" stroke-linejoin="round"`;
  const flaeche = achse === 'v' ? flaecheV(m, a0, a1, c, z0, z1, attr) : flaecheU(m, c, a0, a1, z0, z1, attr);
  const spiegel = (p0, p1, zz0, zz1, op) => (achse === 'v'
    ? flaecheV(m, p0, p1, c, zz0, zz1, `fill="#ffffff" opacity="${op}"`)
    : flaecheU(m, c, p0, p1, zz0, zz1, `fill="#ffffff" opacity="${op}"`));
  const L = a1 - a0, H = z1 - z0;
  return flaeche +
    spiegel(a0 + L * 0.16, a0 + L * 0.22, z0 + H * 0.1, z1 - H * 0.1, 0.3) +
    spiegel(a0 + L * 0.3, a0 + L * 0.32, z0 + H * 0.25, z1 - H * 0.3, 0.55);
}

// ---------- Glasvitrine mit Terrarium 1x1 ----------
function vitrineTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const holz = materialVerlaeufe(TEAK);
  const glas = glasVerlauf(false), glasHinten = glasVerlauf(true);
  const stein = materialVerlaeufe(STEIN), moos = materialVerlaeufe(MOOS);
  const defs = holz.defs + glas.defs + glasHinten.defs + stein.defs + moos.defs;
  // Ebenen: 0 = Boden bis Zwischenboden 40 (Platz z 44), 1 = bis Zwischenboden 84 (Platz z 88), 2 = Deckplatte und Terrarium
  const T = [[0, defs + schatten(m, 1, 1)], [0, quader(m, 0.02, 0.98, 0.02, 0.98, 0, 8, holz)]];
  // Hintere und linke Glasscheibe (kaum sichtbar), hintere Pfosten
  T.push([0, scheibe(m, 'v', 0.08, 0.08, 0.92, 12, 120, glasHinten)]);
  T.push([0, scheibe(m, 'u', 0.08, 0.08, 0.92, 12, 120, glasHinten)]);
  T.push([0, quader(m, 0.02, 0.08, 0.02, 0.08, 12, 120, holz)]);
  T.push([0, quader(m, 0.92, 0.98, 0.02, 0.08, 12, 120, holz)]);
  T.push([0, quader(m, 0.02, 0.98, 0.02, 0.98, 8, 12, holz)]);
  // Zwischenboeden (Plaetze liegen auf der Oberseite)
  [[40, 0], [84, 1]].forEach(([z, k]) => {
    T.push([k, quader(m, 0.08, 0.92, 0.08, 0.92, z, z + 4, holz) + maserung(m, 0.12, 0.88, 0.2, 0.8, z + 4, 1, 40 + z)]);
  });
  // Vordere Pfosten, dann vordere und rechte Glasscheibe mit Glanzlinie (nah, obere Ebene)
  T.push([2, quader(m, 0.02, 0.08, 0.92, 0.98, 12, 120, holz)]);
  T.push([2, quader(m, 0.92, 0.98, 0.92, 0.98, 12, 120, holz)]);
  T.push([2, scheibe(m, 'v', 0.92, 0.08, 0.92, 12, 120, glas)]);
  T.push([2, scheibe(m, 'u', 0.92, 0.08, 0.92, 12, 120, glas)]);
  T.push([2, linie(pkt(m, 0.22, 0.92, 110), pkt(m, 0.34, 0.92, 70), LICHT) + linie(pkt(m, 0.92, 0.22, 110), pkt(m, 0.92, 0.34, 70), LICHT)]);
  // Deckplatte
  T.push([2, quader(m, 0.02, 0.98, 0.02, 0.98, 120, 124, holz)]);
  // Terrarium: Sockel, hintere Glaswaende, Moos und Steine, vordere Glaswaende, Deckel
  T.push([2, quader(m, 0.2, 0.8, 0.2, 0.8, 124, 127, holz)]);
  T.push([2, scheibe(m, 'v', 0.24, 0.24, 0.76, 127, 165, glasHinten)]);
  T.push([2, scheibe(m, 'u', 0.24, 0.24, 0.76, 127, 165, glasHinten)]);
  let moosS = '';
  for (const [u, v, ru, rv] of [[0.36, 0.56, 0.12, 0.09], [0.54, 0.42, 0.1, 0.08], [0.6, 0.62, 0.08, 0.06], [0.42, 0.38, 0.06, 0.05]]) {
    moosS += poly(ellipsePunkte(m, u, v, 127, ru, rv, 12), `fill="${moos.oben}" stroke="#4f8a4a" stroke-width="0.6"`);
  }
  T.push([2, moosS]);
  let steine = '';
  for (const [u, v, r] of [[0.66, 0.34, 4], [0.3, 0.3, 3.2], [0.7, 0.68, 3]]) {
    const [x, y] = pkt(m, u, v, 131);
    steine += oval(x, y, r * 1.3, r, `fill="${stein.oben}" ${KON08}`);
    steine += oval(x - 1, y - 1, r * 0.5, r * 0.3, 'fill="#ffffff" opacity="0.7"');
  }
  T.push([2, steine]);
  T.push([2, scheibe(m, 'v', 0.76, 0.24, 0.76, 127, 165, glas)]);
  T.push([2, scheibe(m, 'u', 0.76, 0.24, 0.76, 127, 165, glas)]);
  T.push([2, flaecheH(m, 0.24, 0.76, 0.24, 0.76, 165, `fill="${glasHinten.fill}" stroke="#6b4a3a" stroke-width="0.8" stroke-linejoin="round"`)]);
  return { teile: T, zs: [44, 88, 124] };
}

// ---------- Sputnik-Pflanzenstaender 1x1: Messingstange, vier Arme in verschiedenen Hoehen, Teakschalen ----------
// Messingstange: dunkle Kontur, Mittelton, schmale helle Glanzlinie links
function stange(punkte, dicke) {
  const d = punkte.map((p, i) => (i ? 'L' : 'M') + p2(p)).join('');
  const hell = punkte.map((p, i) => (i ? 'L' : 'M') + p2([p[0] - dicke * 0.25, p[1]])).join('');
  return pfad(d, `fill="none" stroke="#6b4a3a" stroke-width="${f(dicke + 1.2)}" stroke-linejoin="round" stroke-linecap="round"`) +
    pfad(d, `fill="none" stroke="#c9a14a" stroke-width="${dicke}" stroke-linejoin="round" stroke-linecap="round"`) +
    pfad(hell, `fill="none" stroke="#fbe9b0" stroke-width="${f(dicke * 0.3)}" stroke-linecap="round" opacity="0.9"`);
}

// Teakschale mit Querverlauf an der Seite, Deckel mit Verlauf und dunklerer Innenflaeche.
// (u, v) Mitte, zh Oberkante (= Platzhoehe), ru, rv Radien in Feldern (Ellipse in der Ebene).
function schale(m, u, v, zh, ru, rv, holz) {
  const oben = ellipsePunkte(m, u, v, zh, ru, rv);
  const unten = ellipsePunkte(m, u, v, zh - 6, ru, rv);
  const innen = ellipsePunkte(m, u, v, zh, ru * 0.72, rv * 0.72, 16);
  return poly(konvex([...oben, ...unten]), `fill="${holz.quer}" ${KON08}`) +
    poly(oben, `fill="${holz.oben}" ${KON08}`) +
    poly(innen, 'fill="#5a3418" opacity="0.28"');
}

// Arm mit Schale: (bu, bv) lokale Schalenmitte, zh Oberkante der Schale (= Platzhoehe), rv Radius in v (Felder)
function sputnikArm(m, bu, bv, zh, rv, holz) {
  return stange([pkt(m, 0.5, 0.5, zh), pkt(m, bu, bv, zh - 6)], 2.6) + schale(m, bu, bv, zh, 0.22, rv, holz);
}

// Ebenen = Arme (je eine Schicht pro Armhoehe). Die Mittelstange wird je Schicht abschnittsweise gezeichnet.
function sputnikTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const messing = materialVerlaeufe(MESSING), holz = materialVerlaeufe(TEAK);
  const T = [[0, messing.defs + holz.defs + schatten(m, 1, 1)], [0, zylinderV(m, 0.5, 0.5, 0.3, 0, 4, messing)]];
  // Hintere Arme zuerst, dann die Mittelstange, dann die vorderen Arme.
  T.push([3, sputnikArm(m, 0.22, 0.5, 146, 0.22, holz)]);
  T.push([0, sputnikArm(m, 0.5, 0.22, 64, 0.22, holz)]);
  for (const [a, b, k] of [[4, 78, 0], [78, 112, 1], [112, 140, 2], [140, 160, 3]]) {
    T.push([k, stange([pkt(m, 0.5, 0.5, a), pkt(m, 0.5, 0.5, b)], 3.4)]);
  }
  T.push([2, sputnikArm(m, 0.78, 0.5, 118, 0.22, holz)]);
  T.push([1, sputnikArm(m, 0.5, 0.78, 84, 0.22, holz)]);
  return { teile: T, zs: [64, 84, 118, 146] };
}

// ---------- Raumteiler-Regal 3x1: offen, drei Spalten mit unterschiedlichen Faechern ----------
// Ebenen nach Bretthoehen: 0 = C 44, 1 = A 60, 2 = B 88, 3 = C 104, 4 = A 120, 5 = B 144, 6 = oberste Bretter 174.
// Rueckwaende (fern) liegen ganz in der Ebene ihres unteren Endes, Trennwaende werden je Ebene abgeschnitten.
function hochregalTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const holz = materialVerlaeufe(TEAK);
  const senf = materialVerlaeufe(SENF), petrol = materialVerlaeufe(PETROL);
  const b = BUCH.map((x) => materialVerlaeufe(x));
  const defs = [holz, senf, petrol, ...b].map((x) => x.defs).join('');
  const T = [[0, defs + schatten(m, 3, 1)]];
  // Rueckwaende: senf in Spalte B (Mitte), petrol in Spalte A (oben). Liegen hinten, zuerst zeichnen.
  // Die Trennwaende sind nur so hoch, dass die Rueckwaende aus der Isometrie sichtbar bleiben.
  T.push([2, quader(m, 1.03, 1.97, 0, 0.05, 88, 140, senf)]);
  T.push([1, quader(m, 0.05, 0.97, 0, 0.05, 60, 116, petrol)]);
  T.push([0, quader(m, 0, 0.05, 0, 1, 0, 174, holz)]);
  // Spalte A
  for (const [z0, z1, k] of [[0, 4, 0], [56, 60, 1], [116, 120, 4], [170, 174, 6]]) T.push([k, brett(m, 0.05, 0.97, 0, 1, z0, z1, holz, 60 + k * 3 + z0)]);
  // Buecher auf Brettern ohne Pflanze
  T.push([1, quader(m, 0.55, 0.63, 0.2, 0.6, 60, 60 + 26, b[0]) + quader(m, 0.64, 0.71, 0.2, 0.6, 60, 60 + 32, b[1]) + quader(m, 0.72, 0.79, 0.2, 0.6, 60, 60 + 22, b[2])]);
  T.push([0, quader(m, 0.97, 1.03, 0, 1, 0, 56, holz)]);
  // Spalte B
  for (const [z0, z1, k] of [[0, 4, 0], [84, 88, 2], [140, 144, 5], [170, 174, 6]]) T.push([k, brett(m, 1.03, 1.97, 0, 1, z0, z1, holz, 90 + k * 3 + z0)]);
  T.push([6, quader(m, 1.2, 1.3, 0.2, 0.6, 174, 174 + 30, b[2]) + quader(m, 1.3, 1.38, 0.2, 0.6, 174, 174 + 24, b[0])]);
  // Trennwand B|C: in den Ebenen 0, 1 und 2 abgeschnitten
  T.push([0, quader(m, 1.97, 2.03, 0, 1, 0, 56, holz)]);
  T.push([1, quader(m, 1.97, 2.03, 0, 1, 56, 84, holz)]);
  T.push([2, quader(m, 1.97, 2.03, 0, 1, 84, 88, holz)]);
  // Spalte C
  for (const [z0, z1, k] of [[0, 4, 0], [40, 44, 0], [100, 104, 3], [170, 174, 6]]) T.push([k, brett(m, 2.03, 2.95, 0, 1, z0, z1, holz, 120 + k * 3 + z0)]);
  T.push([0, quader(m, 2.1, 2.2, 0.2, 0.6, 44, 44 + 28, b[1]) + quader(m, 2.2, 2.3, 0.2, 0.6, 44, 44 + 20, b[0])]);
  T.push([6, quader(m, 2.95, 3, 0, 1, 0, 174, holz)]);
  return { teile: T, zs: [44, 60, 88, 104, 120, 144, 174] };
}

// ---------- Metallregale (verzinkter Stahl wie IKEA HYLLIS): L-Winkel-Pfosten, Bleche mit umgekanteter Vorderkante ----------
const BLECH_RAND = 0.03; // Abstand der Bleche zu den Feldkanten (u)
// Pfostenreihen (v) und Blechtiefe: 0.2 bis 0.8 (0.6 Felder). Ein Platz bei dy 0.5 hat damit 0.3 Felder Brett vor und hinter sich.
const PFOSTEN_HINTEN = 0.2, PFOSTEN_VORNE = 0.8;

// Verzinkte Oberflaeche: feine helle und dunkle Sprenkel, waagerecht auf Hoehe z, fester Seed
function sprenkelZink(m, u0, u1, v0, v1, z, seed, n) {
  const r = zufall(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const [x, y] = pkt(m, u0 + (u1 - u0) * r(), v0 + (v1 - v0) * r(), z);
    const rx = 0.8 + r() * 0.6, ry = 0.45 + r() * 0.3;
    s += i % 2 ? oval(x, y, rx, ry, 'fill="#8f969d" opacity="0.5"') : oval(x, y, rx, ry, 'fill="#ffffff" opacity="0.7"');
  }
  return s;
}

// L-Winkel-Pfosten an der Ecke (uc, vc). sx, sy: Richtung der Schenkel ins Innere (+1 oder -1).
// Schenkel 0.07 Felder lang, 0.025 dick. Kante an der Ecke als schmale Glanzlinie.
function winkelPfosten(m, uc, vc, sx, sy, z0, z1, zink) {
  return quader(m, uc, uc + sx * 0.07, vc, vc + sy * 0.025, z0, z1, zink) +
    quader(m, uc, uc + sx * 0.025, vc, vc + sy * 0.07, z0, z1, zink) +
    linie(pkt(m, uc, vc, z0 + 3), pkt(m, uc, vc, z1 - 3), GLANZ);
}

// Schwarzer Kunststofffuss unter einem Pfosten
function fuss(m, uc, vc, kunst) {
  return quader(m, uc - 0.035, uc + 0.035, vc - 0.035, vc + 0.035, 0, 5, kunst);
}

// Schraubpunkt auf der Vorderflaeche eines Pfostens (u, v), Hoehe z
function schraube(m, u, v, z) {
  const [x, y] = pkt(m, u, v, z);
  return oval(x, y, 1.6, 1.6, 'fill="#9aa2aa" stroke="#6b4a3a" stroke-width="0.6"') +
    oval(x - 0.5, y - 0.5, 0.6, 0.6, 'fill="#ffffff" opacity="0.8"');
}

// Blech mit umgekanteter Vorderkante: Platte auf Hoehe zt (Oberflaeche = Platzhoehe), Kante 4 px nach unten.
// Die Kante wird zuerst gezeichnet, damit die Platte ihre Oberkante verdeckt.
function blech(m, U, zt, seed, zink, kante) {
  const u0 = BLECH_RAND, u1 = U - BLECH_RAND;
  return quader(m, u0, u1, PFOSTEN_VORNE - 0.03, PFOSTEN_VORNE, zt - 6, zt - 2, kante) +
    quader(m, u0, u1, PFOSTEN_HINTEN, PFOSTEN_VORNE, zt - 2, zt, zink) +
    sprenkelZink(m, u0 + 0.05, u1 - 0.05, PFOSTEN_HINTEN + 0.05, PFOSTEN_VORNE - 0.05, zt, seed, 4);
}

// Regal-Geruest: Fuesse, Pfosten und Bleche je Ebene (zs = Oberflaeche je Ebene). Hintere Pfosten zuerst (Ebene 0),
// vordere Pfosten zuletzt in der obersten Ebene, damit sie Bleche und Pflanzen der unteren Ebenen verdecken.
// mitte: zusaetzliche Pfostenreihe in der Mitte (breite Regale).
function regalTeile(m, U, zs, mitte) {
  const top = zs.length - 1;
  const zink = materialVerlaeufe(ZINK), kante = materialVerlaeufe(ZINK_KANTE), kunst = materialVerlaeufe(KUNST);
  const spalten = [[BLECH_RAND, 1], [U - BLECH_RAND, -1]];
  if (mitte) spalten.push([U / 2, 1]);
  const T = [[0, zink.defs + kante.defs + kunst.defs + schatten(m, U, 1)]];
  for (const [uc, sx] of spalten) {
    T.push([0, fuss(m, uc, PFOSTEN_HINTEN, kunst) + fuss(m, uc, PFOSTEN_VORNE, kunst) + winkelPfosten(m, uc, PFOSTEN_HINTEN, sx, 1, 5, zs[top], zink)]);
  }
  zs.forEach((zt, k) => T.push([k, blech(m, U, zt, 5 + k * 13 + U * 7, zink, kante)]));
  for (const [uc, sx] of spalten) {
    let s = winkelPfosten(m, uc, PFOSTEN_VORNE, sx, -1, 5, zs[top], zink);
    for (const zt of zs) s += schraube(m, uc + sx * 0.035, PFOSTEN_VORNE, zt - 4);
    T.push([top, s]);
  }
  return { teile: T, zs };
}

// Kleine Zinkgiesskanne auf der Ablage z0, Mitte bei (u, v): Korpus, Henkel hinten, Tuelle vorn rechts, Brause
function giesskanne(m, u, v, z0) {
  const zink = materialVerlaeufe(ZINK);
  const zk = z0 + 15;
  const [ox, oy] = pkt(m, u, v, zk);
  const henkel = `M${p2([ox - 7, oy])}Q${p2([ox, oy - 22])} ${p2([ox + 7, oy])}`;
  const tA = pkt(m, u + 0.12, v, z0 + 4), tB = pkt(m, u + 0.26, v, z0 + 24);
  return zink.defs + zylinderV(m, u, v, 0.12, z0, zk, zink) +
    pfad(henkel, 'fill="none" stroke="#6b4a3a" stroke-width="2.6" stroke-linecap="round"') +
    pfad(henkel, 'fill="none" stroke="#aab2ba" stroke-width="1.1" stroke-linecap="round"') +
    linie(tA, tB, 'stroke="#6b4a3a" stroke-width="3.2" stroke-linecap="round"') +
    linie(tA, tB, 'stroke="#c3c9cf" stroke-width="1.5" stroke-linecap="round"') +
    oval(tB[0], tB[1], 2.4, 1.5, `fill="#9aa2aa" ${KON08}`);
}

// Kleine Holzkiste auf der Ablage: Latten als feine Linien auf Vorder- und Seitenflaeche
function holzkiste(m, u0, u1, v0, v1, z0, z1) {
  const kiste = materialVerlaeufe(HOLZ_KISTE);
  const zm = (z0 + z1) / 2;
  return kiste.defs + quader(m, u0, u1, v0, v1, z0, z1, kiste) +
    linie(pkt(m, u0 + 0.03, v1, zm), pkt(m, u1 - 0.03, v1, zm), MASER) +
    linie(pkt(m, u1, v0 + 0.03, zm), pkt(m, u1, v1 - 0.03, zm), MASER);
}

// Zinkregal 1x1: drei gleichmaessige Ebenen (Oberflaechen 14, 43, 72)
function metallregalTeile(gx, gy, drehung) {
  return regalTeile({ gx, gy, drehung }, 1, [14, 43, 72], false);
}

// Hohes Metallregal 2x1: vier Ebenen (Oberflaechen 22, 60, 98, 136). Unten fest Giesskanne und Kiste, keine Plaetze
function metallregalHochTeile(gx, gy, drehung) {
  const m = { gx, gy, drehung };
  const r = regalTeile(m, 2, [22, 60, 98, 136], true);
  r.teile.push([0, giesskanne(m, 0.45, 0.5, 22) + holzkiste(m, 1.2, 1.7, 0.3, 0.7, 22, 40)]);
  return r;
}

const gesamtSvg = (r) => r.teile.map((t) => t[1]).join('');
const schichtenSvg = (r) => r.zs.map((z, k) => ({ z, svg: r.teile.filter((t) => t[0] === k).map((t) => t[1]).join('') }));

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
  zinkregal: {
    name: 'Zinkregal',
    breite: 1,
    tiefe: 1,
    plaetze: [
      { dx: 0.5, dy: 0.5, z: 14, hoehe: 27 }, { dx: 0.5, dy: 0.5, z: 43, hoehe: 27 }, { dx: 0.5, dy: 0.5, z: 72 },
    ],
    zeichne: (gx, gy, drehung = 0) => gesamtSvg(metallregalTeile(gx, gy, drehung)),
    schichten: (gx, gy, drehung = 0) => schichtenSvg(metallregalTeile(gx, gy, drehung)),
  },
  zinkregal_hoch: {
    name: 'Hohes Zinkregal',
    breite: 2,
    tiefe: 1,
    plaetze: [
      { dx: 0.5, dy: 0.5, z: 60, hoehe: 36 }, { dx: 1.5, dy: 0.5, z: 60, hoehe: 36 },
      { dx: 0.5, dy: 0.5, z: 98, hoehe: 36 }, { dx: 1.5, dy: 0.5, z: 98, hoehe: 36 },
      { dx: 0.5, dy: 0.5, z: 136 }, { dx: 1.5, dy: 0.5, z: 136 },
    ],
    zeichne: (gx, gy, drehung = 0) => gesamtSvg(metallregalHochTeile(gx, gy, drehung)),
    schichten: (gx, gy, drehung = 0) => schichtenSvg(metallregalHochTeile(gx, gy, drehung)),
  },
};
