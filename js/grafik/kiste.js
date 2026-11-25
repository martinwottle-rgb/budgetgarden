// Gärtnerkiste für das Tagesgeschenk: isometrische Teakkiste mit Stroh. Beim Öffnen fliegt der Deckel weg,
// Münzen und Konfetti sprühen oben heraus und der Preis (Säckchen, Samentüte oder das Teil aus dem Gutschein) steigt auf.
//
// Zeichenreihenfolge (wichtig, damit nichts vor der Kiste liegt, was in ihr steckt):
//   1. Schatten, 2. Innenraum (Rückwände, Boden), 3. Deckel, 4. Inhalt: Konfetti, Münzen, Preis,
//   5. Stroh am Rand, 6. Vorderwände der Kiste. Alles aus Schritt 4 startet unterhalb der Vorderkante
//   und ist deshalb von den Vorderwänden verdeckt, bis es über den Rand steigt.
// Die Bewegung kommt aus css/ios.css (Klassen gk-*), ausgelöst durch .ios-geschenk.offen.

// Ecken der Öffnung (Raute) und Höhe der Kiste im viewBox 0 0 160 160
const H = { x: 80, y: 60 };   // hinten
const R = { x: 130, y: 85 };  // rechts
const V = { x: 80, y: 110 };  // vorn
const L = { x: 30, y: 85 };   // links
const TIEFE = 40;             // Höhe der Wände
const KON = 'stroke="#6b4a3a" stroke-width="2.2" stroke-linejoin="round"';

const p = (...pts) => pts.map(q => `${q.x},${q.y}`).join(' ');
const unten = (q, d = TIEFE) => ({ x: q.x, y: q.y + d });

const DEFS = '<defs>' +
  '<linearGradient id="gk-links" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d99a5e"/><stop offset="1" stop-color="#b87842"/></linearGradient>' +
  '<linearGradient id="gk-rechts" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b47240"/><stop offset="1" stop-color="#8f5530"/></linearGradient>' +
  '<linearGradient id="gk-innen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4a28"/><stop offset="1" stop-color="#4f2f1a"/></linearGradient>' +
  '<linearGradient id="gk-deckel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0c088"/><stop offset="1" stop-color="#cf914f"/></linearGradient>' +
  '<radialGradient id="gk-muenze" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff1b0"/><stop offset="0.55" stop-color="#f2c14e"/><stop offset="1" stop-color="#c9922a"/></radialGradient>' +
  '<radialGradient id="gk-schatten" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#6b4a3a" stop-opacity="0.32"/><stop offset="1" stop-color="#6b4a3a" stop-opacity="0"/></radialGradient>' +
  '<linearGradient id="gk-jute" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8cf9c"/><stop offset="1" stop-color="#b8945c"/></linearGradient>' +
  '</defs>';

// Latten-Fugen auf einer Wand (von a nach b oben, nach unten um TIEFE)
function fugen(a, b) {
  let s = '';
  for (const t of [1 / 3, 2 / 3]) {
    s += `<line x1="${a.x}" y1="${a.y + TIEFE * t}" x2="${b.x}" y2="${b.y + TIEFE * t}" stroke="#6b4a3a" stroke-width="1.2" opacity="0.45"/>`;
  }
  return s;
}

// Münze: goldene Scheibe mit Samenkorn, Ursprung in der Mitte
const MUENZE = '<ellipse rx="7" ry="7" fill="url(#gk-muenze)" stroke="#6b4a3a" stroke-width="1.6"/>' +
  '<ellipse rx="2" ry="3.2" fill="#8a5a2a" opacity="0.75"/><ellipse cx="-2.4" cy="-2.6" rx="1.6" ry="1" fill="#fff8d8" opacity="0.9"/>';

// Samensäckchen (Standardpreis), Ursprung Mitte unten
export const SAECKCHEN = '<path d="M-17 0 C-21 -12 -15 -24 -8 -28 L8 -28 C15 -24 21 -12 17 0 Z" fill="url(#gk-jute)" stroke="#6b4a3a" stroke-width="2.2" stroke-linejoin="round"/>' +
  '<path d="M-8 -28 C-10 -33 -5 -36 0 -33 C5 -36 10 -33 8 -28" fill="#e8cf9c" stroke="#6b4a3a" stroke-width="2" stroke-linejoin="round"/>' +
  '<path d="M-9 -27 L9 -27" stroke="#c96b5b" stroke-width="3" stroke-linecap="round"/>' +
  '<ellipse cy="-12" rx="6" ry="6" fill="url(#gk-muenze)" stroke="#6b4a3a" stroke-width="1.5"/><ellipse cy="-12" rx="1.6" ry="2.8" fill="#8a5a2a" opacity="0.75"/>' +
  '<path d="M-12 -6 C-13 -14 -11 -20 -7 -24" stroke="#fff6dc" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.7"/>';

// Samentüte (bei einer Gratis-Tüte), Ursprung Mitte unten
export const TUETE = '<path d="M-14 0 L-14 -34 L14 -34 L14 0 Z" fill="#f2dcbc" stroke="#6b4a3a" stroke-width="2.2" stroke-linejoin="round"/>' +
  '<path d="M-14 -34 L-11 -39 L-6 -35 L0 -40 L6 -35 L11 -39 L14 -34" fill="#f2dcbc" stroke="#6b4a3a" stroke-width="2" stroke-linejoin="round"/>' +
  '<rect x="-9" y="-27" width="18" height="16" rx="3" fill="#a8cf8e" stroke="#6b4a3a" stroke-width="1.5"/>' +
  '<path d="M0 -13 C0 -18 -4 -20 -6 -22 M0 -16 C3 -20 5 -21 7 -22" stroke="#4f8a4a" stroke-width="1.8" fill="none" stroke-linecap="round"/>';

// Kiste mit Preis. preis: SVG-Inhalt mit Ursprung in der Mitte der Standfläche (wird nach dem Einhängen eingepasst).
export function kisteSvg(preis) {
  const vL = [L, V, unten(V), unten(L)];
  const vR = [V, R, unten(R), unten(V)];
  let s = DEFS;
  // 1. Schatten
  s += '<ellipse cx="80" cy="128" rx="62" ry="22" fill="url(#gk-schatten)"/>';
  // Strahlen im SVG hinter der Kiste (zusätzlich zu den CSS-Strahlen)
  // 2. Innenraum: Boden etwas tiefer, zwei Rückwände
  s += `<polygon points="${p(L, H, R, V)}" fill="url(#gk-innen)" ${KON}/>`;
  s += `<polygon points="${p(L, H, unten(H, 18), unten(L, 18))}" fill="#5c361d" opacity="0.55"/>`;
  // 3. Deckel (liegt auf dem Rand, fliegt beim Öffnen nach hinten weg)
  s += '<g class="gk-deckel">' +
    `<polygon points="${p(unten(L, -1), unten(V, -1), unten(V, -7), unten(L, -7))}" fill="#c98a4c" ${KON}/>` +
    `<polygon points="${p(unten(V, -1), unten(R, -1), unten(R, -7), unten(V, -7))}" fill="#a86b3a" ${KON}/>` +
    `<polygon points="${p(unten(L, -7), unten(H, -7), unten(R, -7), unten(V, -7))}" fill="url(#gk-deckel)" ${KON}/>` +
    `<line x1="${55}" y1="${72.5 - 7}" x2="${105}" y2="${97.5 - 7}" stroke="#6b4a3a" stroke-width="1.2" opacity="0.4"/>` +
    `<line x1="${55}" y1="${97.5 - 7}" x2="${105}" y2="${72.5 - 7}" stroke="#6b4a3a" stroke-width="1.2" opacity="0.4"/>` +
    '<ellipse cx="80" cy="78" rx="7" ry="3.5" fill="#f2c14e" stroke="#6b4a3a" stroke-width="1.5"/>' +
    '</g>';
  // 4. Inhalt: Konfetti, Münzen, Preis. Start jeweils in der Kiste (unterhalb der Vorderkante).
  const farben = ['#f2c14e', '#e88a7a', '#6fae6a', '#a9d3a5', '#e8b83a', '#f4a3b5'];
  for (let i = 0; i < 14; i++) {
    const w = -75 + i * 11.5;
    const dx = Math.round(Math.sin(w * Math.PI / 180) * (60 + (i % 3) * 14));
    const dy = -Math.round(70 + ((i * 37) % 40));
    s += `<g class="gk-konfetti" style="--dx:${dx}px;--dy:${dy}px;--rot:${(i * 97) % 540 - 270}deg;animation-delay:${(0.05 + (i % 5) * 0.06).toFixed(2)}s">` +
      `<rect x="77.5" y="92" width="5" height="8" rx="1.2" fill="${farben[i % farben.length]}"/></g>`;
  }
  for (let i = 0; i < 9; i++) {
    const dx = Math.round((i - 4) * 19 + ((i * 7) % 7) - 3);
    const dy = -Math.round(62 + ((i * 29) % 52));
    s += `<g class="gk-muenze-flug" style="--dx:${dx}px;--dy:${dy}px;animation-delay:${(0.12 + (i % 4) * 0.07).toFixed(2)}s">` +
      `<g transform="translate(80 98)">${MUENZE}</g></g>`;
  }
  s += `<g class="gk-preis"><g class="gk-preis-bild" transform="translate(80 96)">${preis}</g></g>`;
  // 5. Stroh am Rand (vor dem Inhalt, hinter den Vorderwänden)
  let stroh = '';
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const x = L.x + (V.x - L.x) * Math.min(1, t * 2) + (R.x - V.x) * Math.max(0, t * 2 - 1);
    const y = (t < 0.5 ? L.y + (V.y - L.y) * t * 2 : V.y + (R.y - V.y) * (t * 2 - 1)) - 2;
    const a = ((i * 53) % 70) - 35;
    stroh += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.sin(a * Math.PI / 180) * 9).toFixed(1)} ${(-Math.cos(a * Math.PI / 180) * 9).toFixed(1)}" stroke="${i % 2 ? '#f2d27a' : '#e2b85a'}" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  s += `<g class="gk-stroh">${stroh}</g>`;
  // 6. Vorderwände mit Latten, Lichtkante oben, Messingecken
  s += `<polygon points="${p(...vL)}" fill="url(#gk-links)" ${KON}/>` + fugen(L, V);
  s += `<polygon points="${p(...vR)}" fill="url(#gk-rechts)" ${KON}/>` + fugen(V, R);
  s += `<polyline points="${p({ x: L.x + 2, y: L.y + 1.5 }, { x: V.x, y: V.y + 1.5 }, { x: R.x - 2, y: R.y + 1.5 })}" fill="none" stroke="#ffe3b8" stroke-width="1.6" opacity="0.8"/>`;
  s += `<rect x="77" y="${V.y + 1}" width="6" height="${TIEFE - 2}" rx="2" fill="#e8c46a" stroke="#6b4a3a" stroke-width="1.4"/>`;
  // Kleines Schild vorn links: Samenkorn
  s += '<g transform="translate(55 118) skewY(26.6)"><rect x="-9" y="-6" width="18" height="12" rx="2.5" fill="#f6e7c8" stroke="#6b4a3a" stroke-width="1.4"/>' +
    '<path d="M0 3 C-3 0 -3 -3 0 -4 C3 -3 3 0 0 3Z" fill="#6fae6a" stroke="#4f8a4a" stroke-width="1"/></g>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="170" height="170" aria-hidden="true">${s}</svg>`;
}

// Preis nach dem Einhängen auf höchstens 74 x 70 Einheiten einpassen, Fuß auf dem Stroh (80, 96)
export function preisEinpassen(svg) {
  const g = svg.querySelector('.gk-preis-bild');
  if (!g) return;
  let b;
  try { b = g.getBBox(); } catch (e) { return; }
  if (!b || !b.width || !b.height) return;
  const k = Math.min(74 / b.width, 70 / b.height, 1.8);
  const fussY = b.y + b.height; // untere Kante des Inhalts
  g.setAttribute('transform', `translate(80 96) scale(${k.toFixed(3)}) translate(${(-(b.x + b.width / 2)).toFixed(1)} ${(-fussY).toFixed(1)})`);
}
