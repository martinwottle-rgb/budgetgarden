// Kleine Helfer für die Oberfläche: DOM bauen ohne innerHTML für Nutzerdaten, Formate, Eingabe lesen.
// Keine Abhängigkeiten außer logik.js (Rechnen und euro()).

import * as L from '../logik.js';

export const euro = L.euro;

// el('button', {class: 'knopf', onclick: fn, text: 'Hallo'}, kind1, 'Text', null)
// Attribute: class, text (textContent), on<ereignis> (Listener), sonst setAttribute. null/false werden ausgelassen.
export function el(tag, attr, ...kinder) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attr || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kind of kinder.flat()) {
    if (kind === undefined || kind === null || kind === false) continue;
    e.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return e;
}

// Ein Element mit eigenem SVG-Markup (nur für eigene, feste Grafiken)
export function svgBox(svg, klasse = '') {
  const e = el('span', { class: klasse, 'aria-hidden': 'true' });
  e.innerHTML = svg;
  return e;
}

// Lokales Datum als YYYY-MM-DD (nicht toISOString, das ist UTC)
export function heutigesDatum(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Goldene Münze mit kleinem Samen. Nur feste Farben, keine IDs, damit sie mehrfach vorkommen kann.
export function muenzSvg(px = 24) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${px}" height="${px}" aria-hidden="true">` +
    '<circle cx="16" cy="16" r="14.5" fill="#e0a93a" stroke="#6b4a3a" stroke-width="1.5"/>' +
    '<circle cx="16" cy="15.2" r="11.6" fill="#f2c14e"/>' +
    '<path d="M6.5 11 Q10 5.5 16 4.8 Q13 8 12.2 12.5 Z" fill="#fff6c9" opacity="0.7"/>' +
    '<ellipse cx="16" cy="16.5" rx="4.2" ry="5.6" transform="rotate(-18 16 16.5)" fill="#8a5a36" stroke="#6b4a3a" stroke-width="0.9"/>' +
    '<path d="M14.2 13.6 Q13.6 16.5 14.6 19.2" fill="none" stroke="#c99a6a" stroke-width="0.9" stroke-linecap="round"/>' +
    '</svg>';
}

// Zahl mit Tausenderpunkt, für Samen und Zähler
export function zahl(n) {
  return Math.round(n).toLocaleString('de-DE');
}

// '2026-10-03' -> '03.10.'
export function kurzDatum(iso) {
  const [, m, t] = iso.split('-');
  return t + '.' + m + '.';
}

// '2026-10-03' -> 'Sa, 03.10.'
const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export function langDatum(iso) {
  return WOCHENTAGE[L.wochentag(iso)] + ', ' + kurzDatum(iso);
}

// Eingabe wie '12,5', '12,50', '1.234,50' oder '12.50' zu Cent. null, wenn ungültig.
export function parseBetrag(text) {
  let s = String(text ?? '').trim().replace(/[\s€]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '');
  s = s.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

// Cent zu Eingabetext '12,50' (leer bei 0 oder ungültig)
export function betragText(cent) {
  if (!cent) return '';
  return (cent / 100).toFixed(2).replace('.', ',');
}

export function kategorieVon(daten, id) {
  return (daten.kategorien || []).find(k => k.id === id) || { id, name: 'Sonstiges', emoji: '✨' };
}

// Tage mit richtiger Einzahl
export function tage(n) {
  return n + (n === 1 ? ' Tag' : ' Tage');
}

// Balken für Anteil ausgegeben / Budget. Über Budget rot. Budget 0 oder kleiner: jede Ausgabe ist voll.
export function balken(ausgegeben, budget) {
  const ueber = ausgegeben > budget;
  let p = budget > 0 ? Math.min(100, (ausgegeben / budget) * 100) : (ausgegeben > 0 ? 100 : 0);
  return el('div', { class: 'balken' + (ueber ? ' ueber' : '') }, el('span', { style: 'width:' + p.toFixed(1) + '%' }));
}

export function vorzeichen(cent) {
  return cent < 0 ? 'negativ' : 'positiv';
}
