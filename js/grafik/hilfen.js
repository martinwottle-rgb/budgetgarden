// Gemeinsame Zeichenhelfer fuer die isometrische Szene. Reine Funktionen, die SVG-Strings liefern.

export const TW = 96, TH = 48, OX = 400, OY = 315;
export function iso(gx, gy, z = 0) { return [OX + (gx - gy) * TW / 2, OY + (gx + gy) * TH / 2 - z]; }

// Konturen dunkelbraun statt Schwarz
export const KON = 'stroke="#6b4a3a" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"';
export const BLATT_FARBEN = ['#7fb069', '#5e9a52'];

// Deterministischer Zufallsgenerator (mulberry32)
export function zufall(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// SVG-Helfer
export const f = (n) => Math.round(n * 10) / 10;
export const p2 = (p) => f(p[0]) + ',' + f(p[1]);
export const tr = (p, sc = 1) => `transform="translate(${f(p[0])},${f(p[1])})${sc === 1 ? '' : ` scale(${sc})`}"`;
export const poly = (pts, attr) => `<polygon points="${pts.map(p2).join(' ')}" ${attr}/>`;
export const linie = (a, b, attr) => `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" ${attr}/>`;
export const kreis = (x, y, r, attr) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" ${attr}/>`;
export const oval = (x, y, rx, ry, attr) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" ${attr}/>`;
export const pfad = (d, attr) => `<path d="${d}" ${attr}/>`;
export const gruppe = (attr, inhalt) => `<g ${attr}>${inhalt}</g>`;
export const rechteck = (x, y, w, h, rx, attr) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}" ${attr}/>`;

// Polygon mit abgerundeten Ecken als Pfad
export function gerundet(pts, r) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const s = Math.min(r, da / 2, db / 2);
    const A = [p[0] + (a[0] - p[0]) / da * s, p[1] + (a[1] - p[1]) / da * s];
    const B = [p[0] + (b[0] - p[0]) / db * s, p[1] + (b[1] - p[1]) / db * s];
    d += (i === 0 ? 'M' : 'L') + p2(A) + 'Q' + p2(p) + ' ' + p2(B);
  }
  return d + 'Z';
}

// Quadratische Bezierkurve
export function qb(a, c, b, t) {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
}

// Quader mit sichtbaren Flaechen oben, links (+y) und rechts (+x)
export function kiste(x0, x1, y0, y1, z0, z1, farben) {
  return poly([iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)], `fill="${farben.links}" ${KON}`) +
    poly([iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)], `fill="${farben.rechts}" ${KON}`) +
    poly([iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)], `fill="${farben.oben}" ${KON}`);
}

// Kontaktschatten unter Objekten; Mittelpunkt im Ursprung (Bodenkontakt)
export function bodenschatten(rx, ry) {
  return oval(0, 0, rx, ry, 'fill="#6b4a3a" opacity="0.18"');
}

// Gemeinsame <defs> einer Szene. uid macht die Ids eindeutig, wenn mehrere SVGs auf einer Seite stehen.
export function defs(uid = 'g') {
  return `<defs>` +
    `<linearGradient id="${uid}-himmel" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#bfe3f5"/><stop offset="1" stop-color="#e6f5fb"/></linearGradient>` +
    `<radialGradient id="${uid}-glow">` +
    `<stop offset="0" stop-color="#fff3c4" stop-opacity="0.95"/>` +
    `<stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient>` +
    `<filter id="${uid}-weich" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>` +
    `<filter id="weich" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>` +
    `</defs>`;
}
