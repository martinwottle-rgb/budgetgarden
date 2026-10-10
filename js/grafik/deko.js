// Deko als SVG-Strings. zeichne() liefert das Objekt mit Ursprung (0,0) = Mitte des Bodenkontakts,
// ohne Positionierung und ohne Skalierung. Haengende Deko (haengend: true): Ursprung = Aufhaengepunkt oben,
// die Grafik haengt nach unten (positive y).

import { f, gruppe, kreis, linie, oval, p2, pfad, poly, qb, tr, zufall } from './hilfen.js';

let zaehler = 0;
// Eindeutige Ids fuer Verlaeufe, damit mehrere SVGs auf einer Seite nicht kollidieren
const eindeutig = (name) => `${name}-${++zaehler}`;

// Konturen der Deko: 1.1 px (hilfen.js liefert 1.5 px, das wirkte zu dick)
const KON = 'stroke="#6b4a3a" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"';
// Konturen der Bank: 1.0 px
const KB = 'stroke="#6b4a3a" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"';

// Lokale Isometrie fuer die Deko: x nach rechts unten, y nach links unten, z nach oben (in px)
const KX = 0.9, KY = 0.45;
const P = (x, y, z = 0) => [(x - y) * KX, (x + y) * KY - z];

// Ebene aus 3D-Punkten (x, y, z)
function flaeche(punkte, attr) {
  return poly(punkte.map(([x, y, z = 0]) => P(x, y, z)), attr);
}

// Quader mit sichtbaren Flaechen links (+y), rechts (+x) und oben
function quader(x0, x1, y0, y1, z0, z1, f, kon = KON) {
  return flaeche([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], `fill="${f.links}" ${kon}`) +
    flaeche([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], `fill="${f.rechts}" ${kon}`) +
    flaeche([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], `fill="${f.oben}" ${kon}`);
}

// Geschlossener weicher Pfad durch die Punkte (Catmull-Rom als kubische Bezierkurven)
function glatt(pts) {
  const n = pts.length;
  let d = `M${p2(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n], e = pts[(i + 2) % n];
    const c1 = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6];
    const c2 = [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6];
    d += `C${p2(c1)} ${p2(c2)} ${p2(c)}`;
  }
  return d + 'Z';
}

// Holz nach STIL.md: Grundton, Schatten, Licht
const HOLZ = { links: '#c98f5a', rechts: '#a86b43', oben: '#e2b07c' };

function laterne() {
  const glow = eindeutig('laterne-glow');
  const flam = eindeutig('laterne-flamme');
  const s = 3.6; // halbe Kantenlaenge des Glaskaefigs
  const glasVorne = 'fill="#fff3c4" fill-opacity="0.5" stroke="#c9a46a" stroke-width="0.8" stroke-linejoin="round"';
  const glasHinten = 'fill="#fff3c4" fill-opacity="0.22" stroke="#c9a46a" stroke-width="0.8" stroke-linejoin="round"';
  const strebe = (x, y) =>
    linie(P(x, y, 2.8), P(x, y, 16), 'stroke="#6b4a3a" stroke-width="1.6" stroke-linecap="round"') +
    linie(P(x, y, 2.8), P(x, y, 16), 'stroke="#c98f5a" stroke-width="1.1" stroke-linecap="round"');

  return `<defs>` +
    `<radialGradient id="${glow}"><stop offset="0" stop-color="#ffe9a8" stop-opacity="0.5"/>` +
    `<stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>` +
    // Flamme: oben orange, unten gelb
    `<linearGradient id="${flam}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#fff1a8"/></linearGradient>` +
    `</defs>` +
    // Kontaktschatten und weicher Lichtschein
    oval(0, 0, 11, 5.5, 'fill="#6b4a3a" opacity="0.18"') +
    kreis(0, -12, 24, `fill="url(#${glow})"`) +
    // Sockel und unterer Rahmen
    quader(-4, 4, -4, 4, 0, 2, HOLZ) +
    quader(-4.2, 4.2, -4.2, 4.2, 2, 2.8, HOLZ) +
    // Glas: Rueckwand schwach, damit man durchsieht
    flaeche([[-s, -s, 2.8], [-s, s, 2.8], [-s, s, 16], [-s, -s, 16]], glasHinten) +
    flaeche([[-s, -s, 2.8], [s, -s, 2.8], [s, -s, 16], [-s, -s, 16]], glasHinten) +
    // Kerze mit Docht und Flamme (Tropfenform, 1.5fach, Verlauf gelb unten nach orange oben)
    quader(-1.2, 1.2, -1.2, 1.2, 2.8, 8, { links: '#fff6e0', rechts: '#e8d6b0', oben: '#fffbef' }) +
    linie(P(0, 0, 8), P(0, 0, 9.5), 'stroke="#6b4a3a" stroke-width="0.8"') +
    `<path d="M0,-7 C1.4,-5 2.4,-3.6 2.2,-2 C2,-0.5 1,0.3 0,0.3 C-1,0.3 -2,-0.5 -2.2,-2 C-2.4,-3.6 -1.4,-5 0,-7Z" ` +
    `transform="translate(0,-8.5) scale(1.5)" fill="url(#${flam})" stroke="#e08a2c" stroke-width="0.5" stroke-linejoin="round"/>` +
    oval(0, -13.2, 1.3, 2.2, 'fill="#fffbe6" opacity="0.85"') +
    // Glas vorne (zwei sichtbare Scheiben)
    flaeche([[s, -s, 2.8], [s, s, 2.8], [s, s, 16], [s, -s, 16]], glasVorne) +
    flaeche([[-s, s, 2.8], [s, s, 2.8], [s, s, 16], [-s, s, 16]], glasVorne) +
    // Eckstreben
    strebe(-s, -s) + strebe(s, -s) + strebe(-s, s) + strebe(s, s) +
    // Oberer Rahmen
    quader(-4.2, 4.2, -4.2, 4.2, 16, 17.5, HOLZ) +
    // Dach als Pyramide: zwei sichtbare Flaechen (Licht links, Schatten rechts)
    flaeche([[-6, 6, 17.5], [6, 6, 17.5], [0, 0, 25]], `fill="#c98f5a" ${KON}`) +
    flaeche([[6, -6, 17.5], [6, 6, 17.5], [0, 0, 25]], `fill="#a86b43" ${KON}`) +
    flaeche([[-6, 6, 17.5], [0, 0, 25], [-6, -6, 17.5]], 'fill="none" stroke="#e2b07c" stroke-width="0.8" stroke-linejoin="round" opacity="0.7"') +
    // Knauf und Henkelring
    kreis(0, -26, 1.3, `fill="#a86b43" ${KON}`) +
    kreis(0, -29, 2.6, 'fill="none" stroke="#6b4a3a" stroke-width="1.4"') +
    kreis(0, -29, 2.6, 'fill="none" stroke="#a86b43" stroke-width="0.7"');
}

// Ebene der Kissen, knapp vor der Rueckenlehne (Lehne bei y -3.6)
const KISSEN_EBENE_Y = -2.7;

// Ein kleines, weiches Kissen: runde, prall gefuellte Form mit eingedellter Mitte. Umriss mit vier leicht
// abstehenden Ecken und eingezogenen Randmitten. Schraeg (Drehung in Grad) an die Lehne gelehnt, oben etwas nach hinten.
// Schatten rechts unten als dunklere Kante (Versatz des hellen Koerpers nach links oben), Glanzlicht links oben,
// Dellenschatten und Knopf in der Mitte. (cx, cz): Mitte auf der Ebene, hell/dunkel: Grundton und Schattenton.
function kissenKlein(cx, cz, drehung, hell, dunkel) {
  const a = 4.4, b = 3.6; // Halbbreite und Halbhoehe
  const T = drehung * Math.PI / 180;
  const cT = Math.cos(T), sT = Math.sin(T);
  // u: waagerecht entlang der Lehne, v: senkrecht, w: Woelbung nach vorn (zum Betrachter)
  const punkt = (u, v, w = 0) => P(cx + u * cT, KISSEN_EBENE_Y + u * sT - 0.3 * v + w, cz + v);
  // Umriss: 24 Punkte; Ecken (45 Grad) stehen ab, Randmitten (0, 90, ...) sind eingezogen
  const rand = [];
  for (let k = 0; k < 24; k++) {
    const phi = k * 15 * Math.PI / 180;
    const r = 1 - 0.1 * Math.cos(4 * phi);
    rand.push(punkt(a * r * Math.cos(phi), b * r * Math.sin(phi)));
  }
  const koerper = rand.map(([x, y]) => [x - 1.1, y - 1.4]);
  const knopf = punkt(0, 0, 0.9);
  const glanz = punkt(-0.45 * a, 0.5 * b, 0.6);
  return pfad(glatt(rand), `fill="${dunkel}" ${KB}`) +
    pfad(glatt(koerper), `fill="${hell}" ${KB}`) +
    oval(glanz[0], glanz[1], 1.6, 0.9, `fill="#ffffff" opacity="0.55" transform="rotate(-25 ${f(glanz[0])} ${f(glanz[1])})"`) +
    oval(knopf[0], knopf[1], 2.2, 1.2, `fill="${dunkel}" opacity="0.35"`) +
    kreis(knopf[0], knopf[1], 0.6, `fill="${dunkel}"`);
}

// Zwei kleinere Kissen: rosa links, salbeigruen rechts, beide an der Lehne
function kissen() {
  return kissenKlein(-6.6, 14.8, 10, '#f2b8b5', '#d99a97') + kissenKlein(5.8, 14.8, -12, '#b9d3a8', '#98b889');
}

function bank() {
  // Maserung auf der Oberseite: feine Linie in dunklerem Holzton
  const maser = (y, z) => linie(P(-15, y, z), P(15, y, z), 'stroke="#c98f5a" stroke-width="0.6" stroke-linecap="round"');
  // Beine in Holz-Schattenton
  const BEIN = { links: '#a86b43', rechts: '#a86b43', oben: '#a86b43' };
  const beine = [[-14.2, -4], [-14.2, 4], [14.2, -4], [14.2, 4]]
    .map(([x, y]) => quader(x - 0.9, x + 0.9, y - 0.9, y + 0.9, 0, 9, BEIN, KB)).join('');
  // Sitz: drei Latten mit Fugen, vorne (+y) sichtbar
  let sitz = '';
  for (const y0 of [-5, -1.6, 1.8]) {
    sitz += quader(-16, 16, y0, y0 + 3.2, 9, 11, HOLZ, KB) + maser(y0 + 0.9, 11) + maser(y0 + 2.4, 11);
  }
  const armFern = quader(-16.6, -14.6, -5, 5, 14.5, 16, HOLZ, KB) +
    quader(-15.8, -14.2, 3.2, 4.8, 11, 14.5, HOLZ, KB) + quader(-15.8, -14.2, -4.8, -3.2, 11, 14.5, HOLZ, KB);
  const armNah = quader(14.6, 16.6, -5, 5, 14.5, 16, HOLZ, KB) +
    quader(14.2, 15.8, 3.2, 4.8, 11, 14.5, HOLZ, KB) + quader(14.2, 15.8, -4.8, -3.2, 11, 14.5, HOLZ, KB);
  // Rueckenlehne hinten (y = -5): zwei Latten, getragen von zwei Pfosten an den Enden
  const lehne = quader(-16, 16, -5, -3.6, 13, 14.6, HOLZ, KB) + quader(-16, 16, -5, -3.6, 16.4, 18, HOLZ, KB) +
    maser(-4.3, 13.8) + maser(-4.3, 17.2) +
    quader(-16, -14.4, -5, -3.6, 11, 19.4, HOLZ, KB) + quader(14.4, 16, -5, -3.6, 11, 19.4, HOLZ, KB);

  return oval(0, 0, 21, 10.5, 'fill="#6b4a3a" opacity="0.18"') +
    beine + sitz + armFern + lehne + kissen() + armNah;
}

function giesskanne() {
  const verlauf = eindeutig('giesskanne-verlauf');
  // Naht mit Nieten: Punkte auf einer Quadratkurve
  const naht = [0.2, 0.5, 0.8].map((t) => qb([-10, -6], [0, 2.5], [10, -6], t));
  return oval(1, 0, 15, 6.5, 'fill="#6b4a3a" opacity="0.18"') +
    `<defs><linearGradient id="${verlauf}" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#a8d8d5"/><stop offset="0.35" stop-color="#6fb3b0"/>` +
    `<stop offset="1" stop-color="#4f8f8c"/></linearGradient></defs>` +
    // Ausguss, liegt hinter dem Korpus
    linie([9, -3.5], [22, -14], 'stroke="#6b4a3a" stroke-width="5" stroke-linecap="round"') +
    linie([9, -3.5], [22, -14], 'stroke="#6fb3b0" stroke-width="3" stroke-linecap="round"') +
    linie([8.5, -4.4], [20.5, -14.8], 'stroke="#a8d8d5" stroke-width="0.9" stroke-linecap="round" opacity="0.8"') +
    // Bügelgriff
    pfad('M-7,-11 Q0,-30 7,-11', 'fill="none" stroke="#6b4a3a" stroke-width="4.5" stroke-linecap="round"') +
    pfad('M-7,-11 Q0,-30 7,-11', 'fill="none" stroke="#6fb3b0" stroke-width="2.2" stroke-linecap="round"') +
    // Ovaler Korpus als Zylinder
    pfad('M-10,-11 L-10,-1.5 Q0,7.5 10,-1.5 L10,-11 Q0,-20 -10,-11Z', `fill="url(#${verlauf})" ${KON}`) +
    // Glanzstreifen links und Naht mit Nieten
    linie([-6.8, -9.5], [-6.8, -4], 'stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.6"') +
    pfad(`M-10,-6 Q0,2.5 10,-6`, 'fill="none" stroke="#4f8f8c" stroke-width="0.8"') +
    naht.map(([x, y]) => kreis(x, y, 0.8, 'fill="#a8d8d5" stroke="#4f8f8c" stroke-width="0.6"')).join('') +
    // Deckel als Ellipse mit Rand
    oval(0, -11, 10, 4.5, `fill="#a8d8d5" ${KON}`) +
    oval(0, -11, 6.5, 2.8, 'fill="none" stroke="#4f8f8c" stroke-width="0.8" opacity="0.6"') +
    // Brause: Rosette mit Loechern, quer zum Ausguss
    `<g transform="rotate(-39 22 -14)">` +
    oval(22, -14, 2.6, 4.4, `fill="#a8d8d5" ${KON}`) +
    [[-0.9, -2.6], [0.9, -2.6], [-0.9, 0], [0.9, 0], [-0.9, 2.6], [0.9, 2.6]]
      .map(([dx, dy]) => kreis(22 + dx, -14 + dy, 0.6, 'fill="#4f8f8c"')).join('') +
    `</g>`;
}

function katze() {
  const fell = 'fill="none" stroke="#b9c0cc" stroke-width="0.7" stroke-linecap="round"';
  const schwanz = 'M10,-1.5 C15,-0.5 14,2 8,1.8 C0,1.6 -9,2.4 -14,-0.5';
  return oval(0, 0.5, 16, 5, 'fill="#6b4a3a" opacity="0.18"') +
    // Koerper als weiche Bohne
    pfad('M-13,-3 C-14.5,-11 -5,-14.5 3,-13 C11,-11.5 15,-7 13.5,-2.5 C12.5,0.5 6,0.8 0,0.4 C-7,0 -12.5,0.5 -13,-3Z', `fill="#ffffff" ${KON}`) +
    // Schatten rechts unten
    pfad('M13.5,-2.5 C12.5,0.5 6,0.8 0,0.4 C4,-2.5 9,-4.5 13.5,-2.5Z', 'fill="#dfe3ec"') +
    // Fellstriche
    pfad('M4,-9 q2,1.2 1.5,3.2', fell) + pfad('M8,-6.5 q1.5,1 1.2,2.6', fell) +
    // Schwanz um den Koerper gelegt
    pfad(schwanz, 'fill="none" stroke="#6b4a3a" stroke-width="5.2" stroke-linecap="round"') +
    pfad(schwanz, 'fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round"') +
    pfad('M8,2.6 C0,2.4 -9,3.2 -13,0.6', 'fill="none" stroke="#dfe3ec" stroke-width="0.9" stroke-linecap="round"') +
    // Kopf auf den Pfoten mit Ohren
    pfad('M-15.6,-9.6 L-14.4,-16.6 L-10.2,-12.3Z', `fill="#ffffff" ${KON}`) +
    pfad('M-10.4,-12.6 L-5.6,-16.4 L-3.2,-9.8Z', `fill="#ffffff" ${KON}`) +
    pfad('M-14.6,-10.8 L-14.1,-14.6 L-11.9,-12.3Z', 'fill="#f5b9b5"') +
    pfad('M-9.6,-12.8 L-5.9,-14.8 L-4.6,-10.9Z', 'fill="#f5b9b5"') +
    oval(-9, -6.5, 7, 5.3, `fill="#ffffff" ${KON}`) +
    oval(-7.5, -3.6, 3.5, 1.6, 'fill="#dfe3ec"') +
    // Geschlossene Augen, Nase, Wangen
    pfad('M-12.6,-7.2 Q-11,-5.2 -9.4,-7.2', 'fill="none" stroke="#6b4a3a" stroke-width="1.1" stroke-linecap="round"') +
    pfad('M-8.2,-7.2 Q-6.6,-5.2 -5,-7.2', 'fill="none" stroke="#6b4a3a" stroke-width="1.1" stroke-linecap="round"') +
    pfad('M-7.8,-5.2 L-6,-5.2 L-6.9,-4.1Z', 'fill="#f2a0a0" stroke="#6b4a3a" stroke-width="0.5" stroke-linejoin="round"') +
    oval(-12.5, -4.5, 1.3, 0.8, 'fill="#f5b9b5" opacity="0.7"') +
    oval(-4.2, -4.5, 1.3, 0.8, 'fill="#f5b9b5" opacity="0.7"') +
    // Pfoten unter dem Kopf
    oval(-12, -0.6, 3.4, 1.8, `fill="#ffffff" ${KON}`) +
    oval(-6, -0.2, 3.4, 1.8, `fill="#ffffff" ${KON}`);
}

// Mittellinie eines Blatts als kubische Bezierkurve von a nach d (Kontrollpunkte c1, c2). Liefert die Mittellinie M
// sowie linke und rechte Kante L, R (jeweils von a nach d). Breite: sin(pi t)^0.7, also spitz an beiden Enden.
function blattBand(a, c1, c2, d, breite, n = 9) {
  const M = [], L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const m = [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * d[k]);
    const tg = [0, 1].map((k) => 3 * (u * u * (c1[k] - a[k]) + 2 * u * t * (c2[k] - c1[k]) + t * t * (d[k] - c2[k])));
    const len = Math.hypot(tg[0], tg[1]) || 1;
    const w = (breite / 2) * Math.pow(Math.sin(Math.PI * t), 0.7);
    const nx = (-tg[1] / len) * w, ny = (tg[0] / len) * w;
    M.push(m);
    L.push([m[0] + nx, m[1] + ny]);
    R.push([m[0] - nx, m[1] - ny]);
  }
  return { M, L, R };
}

// Haengeampel mit Gruenlilie (Chlorophytum comosum). Lokale Einheiten: 1 Einheit = 2.4 px in der Szene
// (Skalierung 1.6, also 1.5 Deko-Einheiten). Lokaler Ursprung = Mitte des Schalenrandes. Die Ampel haengt senkrecht:
// Haken lokal bei AMPEL_HAKEN, Schale relativ zum Haken bei AMPEL_SCHALE (Deko-Einheiten, 51 px nach unten).
// Ursprung der Deko = Haken. Drei Schnuere vom Haken zu drei Punkten am Schalenrand. Tiefster Punkt lokal y 20.
const AMPEL_HAKEN = [0, -21.25];
const AMPEL_SCHALE = [0, 31.875];

function haengeampel() {
  const r2 = zufall(77);
  const KON_A = 'stroke="#6b4a3a" stroke-width="0.6" stroke-linejoin="round"';
  const KOERPER = 'M-10.8,0 C-10.8,8.5 -7,16 0,16 C7,16 10.8,8.5 10.8,0 A10.8,5.4 0 0 1 -10.8,0 Z';
  const RAND_VORN = 'M-10.8,0 A10.8,5.4 0 0 0 10.8,0 L10.8,1.8 A10.8,5.4 0 0 1 -10.8,1.8 Z';
  // Haken am Dachbalken (Ring) und drei Schnuere zu drei Randpunkten (auf der Randellipse bei 200, 340 und 90 Grad)
  let s = kreis(AMPEL_HAKEN[0], AMPEL_HAKEN[1], 1, 'fill="none" stroke="#6b4a3a" stroke-width="0.46"') +
    kreis(AMPEL_HAKEN[0], AMPEL_HAKEN[1], 1, 'fill="none" stroke="#cfd8dc" stroke-width="0.25"');
  for (const [lx, ly] of [[-10.1, -1.8], [10.1, -1.8], [0, 5.4]]) {
    s += linie(AMPEL_HAKEN, [lx, ly], 'stroke="#6b4a3a" stroke-width="0.42"');
  }
  // Blatt: Band mit Lichtseite (links) und dunklerer rechter Haelfte, cremefarbener Mittelstreifen, Kontur
  const blatt = (a, c1, c2, d, W) => {
    const b = blattBand(a, c1, c2, d, W);
    const sn = blattBand(a, c1, c2, d, W * 0.4);
    let x = pfad(glatt([...b.L, ...b.R.slice().reverse()]), 'fill="#5e9a52"');
    x += pfad(glatt([...b.M, ...b.R.slice().reverse()]), 'fill="#477d43" opacity="0.4"');
    x += pfad(glatt([...sn.L, ...sn.R.slice().reverse()]), 'fill="#f1ecc4"');
    x += pfad(glatt([...b.L, ...b.R.slice().reverse()]), 'fill="none" stroke="#2f5a30" stroke-width="0.7" stroke-linejoin="round"');
    return x;
  };
  // 16 Blaetter aus der Mitte der Erde: steigen nach oben, fallen ueber den Rand nach aussen und unten.
  // cy > 0 = vorn (zum Betrachter), cy < 0 = hinten.
  const hinten = [], vorn = [];
  for (let i = 0; i < 16; i++) {
    const al = ((i + 0.5 + (r2() - 0.5) * 0.6) / 16) * 2 * Math.PI;
    const cx = Math.cos(al), cy = Math.sin(al);
    const a = [cx * 2 + (r2() - 0.5) * 2, 0.6 + cy * 1.2];
    const hoch = 9 + r2() * 4;
    const d = [cx * (11 + r2() * 5), 3 + r2() * 13 + (cy > 0 ? 4 : 0)];
    const c1 = [a[0] + cx * 2 + (r2() - 0.5) * 2, -hoch * 2.4];
    const c2 = [d[0] - cx * 3, d[1] - 9];
    (cy > 0 ? vorn : hinten).push(blatt(a, c1, c2, d, 2 + r2()));
  }
  // Schale: obere Oeffnung mit Rand (Ellipse 2:1), Erde nur als schmaler dunkler Streifen hinten sichtbar
  const oben = oval(0, 0, 10.8, 5.4, `fill="#e6bb88" ${KON_A}`) +
    oval(0, 0, 9.2, 4.4, `fill="#b8844f" ${KON_A}`) +
    oval(0, 0.7, 8.6, 3.6, 'fill="#5a3f2c"');
  // Koerper: geflochtenes Rattan, Flechtlinien im Clip des Koerpers, Licht von links
  let koerper = `<clipPath id="ampel-koerper"><path d="${KOERPER}"/></clipPath>`;
  koerper += pfad(KOERPER, 'fill="#d9a56b"');
  let muster = pfad('M1,-6 H15 V18 H1 Z', 'fill="#b8844f" opacity="0.55"');
  for (let x = -20; x <= 20; x += 4) {
    muster += linie([x, -6], [x + 22, 16], 'stroke="#a86b43" stroke-width="0.5" opacity="0.8"');
    muster += linie([x, -6], [x - 22, 16], 'stroke="#a86b43" stroke-width="0.5" opacity="0.8"');
  }
  muster += pfad('M-8.4,3 Q-9.4,8.5 -6.6,13', 'fill="none" stroke="#f6dcb2" stroke-width="1.1" stroke-linecap="round" opacity="0.8"');
  koerper += `<g clip-path="url(#ampel-koerper)">${muster}</g>`;
  koerper += pfad(KOERPER, `fill="none" ${KON_A}`);
  koerper += pfad(RAND_VORN, `fill="#c9955e" ${KON_A}`);
  koerper += pfad('M-10.15,-1.85 A10.8,5.4 0 0 1 -3.7,-5.07', 'fill="none" stroke="#fbe9cc" stroke-width="0.8" stroke-linecap="round" opacity="0.8"');
  // Auslaeufer: zwei duenne Triebe mit Kindeln (Mini-Rosetten aus 6 kurzen Blaettern) am Ende
  const laeufer = [
    { a: [-2, 0.4], c1: [-6, -8], c2: [-15, -2], d: [-17, 16] },
    { a: [2, 0.4], c1: [6, -8], c2: [15, -2], d: [16, 17] },
  ];
  let lauf = '';
  for (const l of laeufer) {
    lauf += pfad(`M${p2(l.a)} C${p2(l.c1)} ${p2(l.c2)} ${p2(l.d)}`, 'fill="none" stroke="#a3b86c" stroke-width="0.8" stroke-linecap="round"');
    for (let j = 0; j < 6; j++) {
      lauf += oval(l.d[0] + 1.9, l.d[1], 1.9, 0.8,
        `transform="rotate(${j * 60} ${f(l.d[0])} ${f(l.d[1])})" fill="${j % 2 ? '#7fb069' : '#5e9a52'}" stroke="#2f5a30" stroke-width="0.4"`);
    }
  }
  const inhalt = oben + hinten.join('') + koerper + lauf + vorn.join('');
  return gruppe(tr(AMPEL_SCHALE, 1.5), s + inhalt);
}

export const DEKO = {
  laterne: { name: 'Laterne', zeichne: () => laterne() },
  bank: { name: 'Bank', zeichne: () => bank() },
  giesskanne: { name: 'Gießkanne', zeichne: () => giesskanne() },
  katze: { name: 'Katze', zeichne: () => katze() },
  haengeampel: { name: 'Hängeampel', haengend: true, zeichne: () => haengeampel() },
};
