// Speichern im localStorage, Export und Import als JSON. Kein DOM, keine Abhaengigkeiten.

export const SCHLUESSEL = 'budgetgarten';

const PFLICHT_LISTEN = ['kategorien', 'vertraege', 'gehaltseingaenge', 'buchungen', 'ruecklagen', 'sparziele', 'abschluesse'];

// Startdaten nach SPEC.md, Datenmodell
export function standardDaten(heute) {
  return {
    schema: 1,
    einstellungen: { gehaltstag: 1, ersteinrichtungFertig: false, startDatum: heute, push: { abonniert: false } },
    kategorien: [
      { id: 'lebensmittel', name: 'Lebensmittel', emoji: '🛒', eigene: false },
      { id: 'essen', name: 'Essen gehen', emoji: '🍝', eigene: false },
      { id: 'transport', name: 'Transport', emoji: '🚌', eigene: false },
      { id: 'freizeit', name: 'Freizeit', emoji: '🎟️', eigene: false },
      { id: 'shopping', name: 'Shopping', emoji: '🛍️', eigene: false },
      { id: 'gesundheit', name: 'Gesundheit', emoji: '💊', eigene: false },
      { id: 'haushalt', name: 'Haushalt', emoji: '🧽', eigene: false },
      { id: 'sonstiges', name: 'Sonstiges', emoji: '✨', eigene: false }
    ],
    vertraege: [],
    gehaltseingaenge: [],
    buchungen: [],
    ruecklagen: [],
    sparziele: [],
    abschluesse: [],
    spiel: {
      samen: 50,
      xp: 0,
      serie: 0,
      besteSerie: 0,
      abzeichen: [],
      challenges: {},
      bewertet: { tage: [], wochen: [], zeitraeume: [] },
      offeneAbschluesse: [],
      besuch: { letzter: null, tag: 0 },
      gutscheine: [],
      saatgut: {},
      tuete: { seitSelten: 0, seitLegendaer: 0, geoeffnet: 0 },
      gratisTueten: 0,
      design: { boden: 'dielen', rahmen: 'teak', dach: 'giebel' },
      designs: ['dielen', 'teak'],
      entdeckt: [],
      gewaechshaus: {
        groesse: 6,
        moebel: [
          { id: 'm1', typ: 'regal_holz', gx: 0, gy: 1.6, drehung: 90 },
          { id: 'm2', typ: 'tisch_natur', gx: 1.2, gy: 0, drehung: 0 }
        ],
        pflanzen: [{ id: 'p1', typ: 'efeutute', stufe: 1, ort: { moebel: 'm2', platz: 0 } }],
        deko: []
      }
    }
  };
}

// Liest die Daten aus dem localStorage, null bei fehlendem oder kaputtem Inhalt
export function laden() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    return roh ? JSON.parse(roh) : null;
  } catch (e) {
    return null;
  }
}

// Gibt true zurueck, wenn der Speicher geklappt hat
export function speichern(daten) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(daten));
    return true;
  } catch (e) {
    return false;
  }
}

export function exportDatei(daten, heute = new Date()) {
  const j = heute.getFullYear();
  const m = String(heute.getMonth() + 1).padStart(2, '0');
  const t = String(heute.getDate()).padStart(2, '0');
  return { name: `budgetgarten-${j}-${m}-${t}.json`, text: JSON.stringify(daten, null, 2) };
}

// Prueft eine Importdatei. Gibt die Daten zurueck oder wirft einen Error mit deutscher Meldung.
export function importText(text) {
  let daten;
  try {
    daten = JSON.parse(text);
  } catch (e) {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  if (!daten || typeof daten !== 'object' || Array.isArray(daten)) {
    throw new Error('Die Datei enthält kein Budget-Daten-Objekt.');
  }
  if (daten.schema !== 1) {
    throw new Error('Diese Dateiversion wird nicht unterstützt (schema ' + daten.schema + ').');
  }
  const fehlt = fehlendesFeld(daten);
  if (fehlt) {
    throw new Error('Die Datei ist unvollständig: „' + fehlt + '“ fehlt.');
  }
  return daten;
}

function fehlendesFeld(daten) {
  const s = daten.spiel;
  const b = s && s.bewertet;
  const g = s && s.gewaechshaus;
  const objekt = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const zahl = (x) => typeof x === 'number';
  const pruefungen = [
    ['einstellungen', objekt(daten.einstellungen)],
    ...PFLICHT_LISTEN.map(k => [k, Array.isArray(daten[k])]),
    ['spiel', objekt(s)],
    ['spiel.samen', !!s && zahl(s.samen)],
    ['spiel.xp', !!s && zahl(s.xp)],
    ['spiel.serie', !!s && zahl(s.serie)],
    ['spiel.besteSerie', !!s && zahl(s.besteSerie)],
    ['spiel.abzeichen', !!s && Array.isArray(s.abzeichen)],
    ['spiel.offeneAbschluesse', !!s && Array.isArray(s.offeneAbschluesse)],
    ['spiel.challenges', !!s && objekt(s.challenges)],
    ['spiel.bewertet', objekt(b)],
    ['spiel.bewertet.tage', !!b && Array.isArray(b.tage)],
    ['spiel.bewertet.wochen', !!b && Array.isArray(b.wochen)],
    ['spiel.bewertet.zeitraeume', !!b && Array.isArray(b.zeitraeume)],
    ['spiel.gewaechshaus', objekt(g)],
    ['spiel.gewaechshaus.groesse', !!g && zahl(g.groesse)],
    ['spiel.gewaechshaus.moebel', !!g && Array.isArray(g.moebel)],
    ['spiel.gewaechshaus.pflanzen', !!g && Array.isArray(g.pflanzen)],
    ['spiel.gewaechshaus.deko', !!g && Array.isArray(g.deko)]
  ];
  const erster = pruefungen.find(([, ok]) => !ok);
  return erster ? erster[0] : null;
}

// Eindeutige Id: Praefix, Zeitstempel in Base36, Zufallsanteil
export function neueId(praefix) {
  return praefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
