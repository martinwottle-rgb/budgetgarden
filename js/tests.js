// Mini-Testrahmen fuer die Rechenlogik. Laeuft im Browser, zeigt jede Pruefung als Zeile.
// Pflichttests 1 bis 12 nach SPEC.md, "Budget-Logik".

import * as L from './logik.js';

const ergebnisse = [];
let aktuell = '';

function test(name, fn) {
  aktuell = name;
  try {
    fn();
  } catch (e) {
    ergebnisse.push({ ok: false, text: name + ': Fehler: ' + (e && e.message ? e.message : e) });
  }
}

function zeigt(x) {
  return typeof x === 'object' && x !== null ? JSON.stringify(x) : String(x);
}

function gleich(ist, soll, was) {
  const ok = typeof soll === 'object' && soll !== null
    ? JSON.stringify(ist) === JSON.stringify(soll)
    : ist === soll;
  const bezeichnung = aktuell + (was ? ' · ' + was : '');
  if (ok) {
    ergebnisse.push({ ok: true, text: bezeichnung });
  } else {
    ergebnisse.push({ ok: false, text: bezeichnung + ': ist ' + zeigt(ist) + ' soll ' + zeigt(soll) });
  }
}

// Basis-Datenstruktur nach SPEC, Datenmodell
function basis(gehaltstag, extra) {
  return Object.assign({
    schema: 1,
    einstellungen: { gehaltstag, ersteinrichtungFertig: true, push: { abonniert: false } },
    kategorien: [],
    vertraege: [],
    gehaltseingaenge: [],
    buchungen: [],
    ruecklagen: [],
    sparziele: [],
    abschluesse: []
  }, extra || {});
}

const EUR = (x) => x * 100;

// Gehalt 3000 EUR im Zeitraum 2026-11-01 bis 2026-11-30 (30 Tage), Gehaltstag 1
function dreitausend(extra) {
  return basis(1, Object.assign({
    vertraege: [{ id: 'g', art: 'einnahme', name: 'Gehalt', betrag: EUR(3000), intervall: 1,
      ersteFaelligkeit: '2026-11-01', kategorie: '', istGehalt: true, ende: null }]
  }, extra || {}));
}

// ---------- Pflichttests ----------

test('Pflicht 1: Zeitraum ohne Eingang', () => {
  const zr = L.zeitraum(basis(27), '2026-10-10');
  gleich(zr.start, '2026-09-27', 'Start');
  gleich(zr.ende, '2026-10-26', 'Ende');
});

test('Pflicht 2: Gehaltstag 31 im Februar', () => {
  const zr = L.zeitraum(basis(31), '2026-02-15');
  gleich(zr.start, '2026-01-31', 'Start');
  gleich(zr.ende, '2026-02-27', 'Ende');
});

test('Pflicht 3: Gehaltseingang frueher als Gehaltstag', () => {
  const zr = L.zeitraum(basis(27, { gehaltseingaenge: ['2026-09-25'] }), '2026-10-10');
  gleich(zr.start, '2026-09-25', 'Start');
  gleich(zr.ende, '2026-10-26', 'Ende');
});

test('Pflicht 4: V 3000 EUR, 30 Tage, Tag 1', () => {
  const d = dreitausend();
  const zr = L.zeitraum(d, '2026-11-01');
  gleich(zr.tage, 30, 'Tage');
  gleich(L.verfuegbar(d, zr).V, EUR(3000), 'V');
  gleich(L.tagesbudget(d, '2026-11-01'), EUR(100), 'B(Tag 1) = 100,00 EUR');
});

test('Pflicht 5: Tag 1 ausgegeben 40 EUR', () => {
  const d = dreitausend({ buchungen: [{ id: 'a', art: 'ausgabe', name: 'Brot', betrag: EUR(40), datum: '2026-11-01', kategorie: 'Lebensmittel', notiz: '' }] });
  gleich(L.tagesbudget(d, '2026-11-02'), 10207, 'B(Tag 2) = 102,07 EUR');
});

test('Pflicht 6: Tag 1 ausgegeben 160 EUR', () => {
  const d = dreitausend({ buchungen: [{ id: 'a', art: 'ausgabe', name: 'Einkauf', betrag: EUR(160), datum: '2026-11-01', kategorie: 'Lebensmittel', notiz: '' }] });
  gleich(L.tagesbudget(d, '2026-11-02'), 9793, 'B(Tag 2) = 97,93 EUR');
});

test('Pflicht 7: Gehalt, Miete, Sparziel, Ruecklage', () => {
  const d = basis(1, {
    vertraege: [
      { id: 'g', art: 'einnahme', name: 'Gehalt', betrag: EUR(2000), intervall: 1, ersteFaelligkeit: '2026-01-01', kategorie: '', istGehalt: true, ende: null },
      { id: 'm', art: 'ausgabe', name: 'Miete', betrag: EUR(800), intervall: 1, ersteFaelligkeit: '2026-01-03', kategorie: 'Wohnen', istGehalt: false, ende: null }
    ],
    sparziele: [{ id: 's1', name: 'Urlaub', proMonat: EUR(150), zielsumme: null, angespart: 0 }],
    ruecklagen: [{ id: 'r1', name: 'Geschenke', betragProJahr: EUR(120) }]
  });
  const zr = L.zeitraum(d, '2026-11-15');
  gleich(L.verfuegbar(d, zr).V, EUR(1040), 'V = 1040 EUR');
});

test('Pflicht 8: Versicherung halbjaehrlich 300 EUR', () => {
  const d = basis(27, {
    vertraege: [{ id: 'v', art: 'ausgabe', name: 'Haftpflicht', betrag: EUR(300), intervall: 6, ersteFaelligkeit: '2026-10-03', kategorie: 'Versicherung', istGehalt: false, ende: null }]
  });
  const zrSept = L.zeitraum(d, '2026-10-10');
  gleich(L.faelligkeiten(d.vertraege[0], zrSept.start, zrSept.ende), ['2026-10-03'], 'Faelligkeit im Zeitraum');
  gleich(L.verfuegbar(d, zrSept).V, EUR(-50), 'Abzug 50 EUR mit Faelligkeit');
  const zrNov = L.zeitraum(d, '2026-11-10');
  gleich(L.faelligkeiten(d.vertraege[0], zrNov.start, zrNov.ende), [], 'keine Faelligkeit im November');
  gleich(L.verfuegbar(d, zrNov).V, EUR(-50), 'Abzug 50 EUR ohne Faelligkeit');
});

test('Pflicht 9: Urlaubsgeld 500 EUR jaehrlich', () => {
  const d = basis(1, {
    vertraege: [{ id: 'u', art: 'einnahme', name: 'Urlaubsgeld', betrag: EUR(500), intervall: 12, ersteFaelligkeit: '2026-06-30', kategorie: '', istGehalt: false, ende: null }]
  });
  const juni = L.zeitraum(d, '2026-06-15');
  gleich(juni.ende, '2026-06-30', 'Juni-Zeitraum endet 30.06.');
  gleich(L.verfuegbar(d, juni).V, EUR(500), 'Juni: voll');
  const oktober = L.zeitraum(d, '2026-10-15');
  gleich(L.verfuegbar(d, oktober).V, 0, 'Oktober: 0');
});

test('Pflicht 10: monatlich ab 31.08., Feb-Zeitraum', () => {
  const v = { id: 'x', art: 'einnahme', name: 'Zuschuss', betrag: EUR(100), intervall: 1, ersteFaelligkeit: '2026-08-31', kategorie: '', istGehalt: false, ende: null };
  const zr = L.zeitraum(basis(1), '2027-02-10');
  gleich(zr.start, '2027-02-01', 'Zeitraum Start');
  gleich(L.faelligkeiten(v, zr.start, zr.ende), ['2027-02-28'], 'faellig am 28.02.2027');
});

test('Pflicht 11: Woche beginnt vor Zeitraum', () => {
  const d = basis(1, {
    buchungen: [{ id: 'e', art: 'einnahme', name: 'Zuschuss', betrag: EUR(3100), datum: '2026-10-01', kategorie: '', notiz: '' }]
  });
  const w = L.woche(d, '2026-10-02');
  gleich(w.von, '2026-10-01', 'von = Zeitraumbeginn');
  gleich(w.bis, '2026-10-04', 'bis = Sonntag');
  gleich(w.W, EUR(100) * 4, 'W = 4 Tage x 100 EUR');
});

test('Pflicht 12: Abschluss mit R = -60 EUR', () => {
  const d = basis(1, {
    sparziele: [
      { id: 's1', name: 'Urlaub', proMonat: EUR(100), zielsumme: null, angespart: 0 },
      { id: 's2', name: 'Auto', proMonat: EUR(50), zielsumme: null, angespart: 0 }
    ],
    buchungen: [{ id: 'e', art: 'einnahme', name: 'Zuschuss', betrag: EUR(90), datum: '2026-11-05', kategorie: '', notiz: '' }]
  });
  const zr = L.zeitraum(d, '2026-11-15');
  const a = L.abschluss(d, zr);
  gleich(a.rest, EUR(-60), 'R');
  gleich(a.gutgeschrieben, { s1: EUR(60), s2: EUR(30) }, 'gutgeschrieben 60 + 30 EUR');
  gleich(a.uebertrag, 0, 'kein Uebertrag');
});

// ---------- Eigene Tests ----------

test('Zeitraumwechsel genau am Gehaltstag', () => {
  const d = basis(27);
  const vor = L.zeitraum(d, '2026-10-26');
  gleich(vor.start, '2026-09-27', 'einen Tag vor Gehaltstag: alter Zeitraum');
  gleich(vor.ende, '2026-10-26', 'Ende des alten Zeitraums');
  const am = L.zeitraum(d, '2026-10-27');
  gleich(am.start, '2026-10-27', 'am Gehaltstag: neuer Zeitraum');
  gleich(am.ende, '2026-11-26', 'Ende des neuen Zeitraums');
});

test('Woche mit Sonntag als Stichtag', () => {
  const d = basis(27, {
    buchungen: [{ id: 'e', art: 'einnahme', name: 'Gehalt', betrag: EUR(3000), datum: '2026-09-27', kategorie: '', notiz: '' }]
  });
  gleich(L.wochentag('2026-10-11'), 6, 'Stichtag ist Sonntag');
  gleich(L.wochenbeginn('2026-10-11'), '2026-10-05', 'Montag der Woche');
  const w = L.woche(d, '2026-10-11');
  gleich(w.von, '2026-10-05', 'von');
  gleich(w.bis, '2026-10-11', 'bis = Sonntag');
  // V = 300000, Tage 10-05 bis 10-26 = 22, B = 300000 / 22 = 13636,36 -> 13636, W = 7 x 13636
  gleich(L.tagesbudget(d, '2026-10-05'), 13636, 'B(Montag)');
  gleich(w.W, 13636 * 7, 'W = 7 Tage');
});

test('euro() Format', () => {
  gleich(L.euro(123456), '1.234,56 €', '1234,56');
  gleich(L.euro(0), '0,00 €', 'Null');
  gleich(L.euro(5), '0,05 €', 'fuenf Cent');
  gleich(L.euro(100000000), '1.000.000,00 €', 'eine Million');
  gleich(L.euro(-1230), '−12,30 €', 'negativ mit U+2212');
  gleich(L.euro(-5), '−0,05 €', 'negativ unter einem Euro');
});

test('Rundung', () => {
  gleich(L.rundeCent(2.5), 3, '2,5 nach oben');
  gleich(L.rundeCent(2.4), 2, '2,4 nach unten');
  gleich(L.rundeCent(-2.5), -3, '-2,5 symmetrisch');
  gleich(L.rundeCent(-2.4), -2, '-2,4 symmetrisch');
  gleich(L.rundeCent(-0.4), 0, '-0,4 wird 0');
  gleich(L.rundeCent(10206.896551724), 10207, 'Tagesbudget-Rundung');
});

test('Vertrag mit ende in der Vergangenheit zaehlt nicht', () => {
  const d = basis(1, {
    vertraege: [
      { id: 'g', art: 'einnahme', name: 'altes Gehalt', betrag: EUR(3000), intervall: 1, ersteFaelligkeit: '2026-01-01', kategorie: '', istGehalt: true, ende: '2026-08-31' },
      { id: 'm', art: 'ausgabe', name: 'altes Abo', betrag: EUR(10), intervall: 1, ersteFaelligkeit: '2026-01-05', kategorie: 'Abos', istGehalt: false, ende: '2026-08-31' }
    ]
  });
  const zr = L.zeitraum(d, '2026-11-10');
  gleich(L.verfuegbar(d, zr).V, 0, 'V ohne beendete Vertraege');
});

test('Gehaltseingang aelter als 40 Tage wird ignoriert', () => {
  const zr = L.zeitraum(basis(27, { gehaltseingaenge: ['2026-08-01'] }), '2026-10-10');
  gleich(zr.start, '2026-09-27', 'Start ueber Gehaltstag');
});

test('Abschluss mit R >= 0 und Uebertrag in naechsten Zeitraum', () => {
  const d = basis(1, {
    sparziele: [
      { id: 's1', name: 'Urlaub', proMonat: EUR(100), zielsumme: null, angespart: 0 },
      { id: 's2', name: 'Auto', proMonat: EUR(50), zielsumme: null, angespart: 0 }
    ],
    buchungen: [{ id: 'e', art: 'einnahme', name: 'Zuschuss', betrag: EUR(200), datum: '2026-11-05', kategorie: '', notiz: '' }]
  });
  const zr = L.zeitraum(d, '2026-11-15');
  const a = L.abschluss(d, zr);
  gleich(a.rest, EUR(50), 'R = 50 EUR');
  gleich(a.gutgeschrieben, { s1: EUR(100), s2: EUR(50) }, 'jedes Sparziel voll');
  gleich(a.uebertrag, EUR(50), 'Uebertrag = R');
  const naechsterD = Object.assign({}, d, {
    abschluesse: [{ zeitraumStart: '2026-11-01', zeitraumEnde: '2026-11-30', rest: a.rest, gutgeschrieben: a.gutgeschrieben, uebertrag: a.uebertrag }]
  });
  const zrDez = L.zeitraum(naechsterD, '2026-12-10');
  gleich(zrDez.start, '2026-12-01', 'naechster Zeitraum');
  gleich(L.verfuegbar(naechsterD, zrDez).V, EUR(50) - EUR(150) + 0, 'V enthaelt Uebertrag und Sparziele');
});

test('Datum und Monatslaenge (UTC, Sommerzeit)', () => {
  gleich(L.monatslaenge(2028, 2), 29, 'Schaltjahr');
  gleich(L.monatslaenge(2026, 2), 28, 'Februar 2026');
  gleich(L.monatslaenge(2026, 12), 31, 'Dezember');
  gleich(L.datumPlusTage('2026-02-28', 1), '2026-03-01', '+1 Tag');
  gleich(L.datumPlusMonate('2026-01-31', 1), '2026-02-28', '+1 Monat gekappt');
  gleich(L.tageZwischen('2026-03-28', '2026-03-30'), 2, 'Sommerzeitwechsel 29.03.');
  gleich(L.wochentag('2026-10-10'), 5, 'Samstag = 5');
});

test('Tag- und Heute-Werte', () => {
  const d = dreitausend({ buchungen: [{ id: 'a', art: 'ausgabe', name: 'Brot', betrag: EUR(40), datum: '2026-11-01', kategorie: '', notiz: '' }] });
  gleich(L.tagErfuellt(d, '2026-11-01'), true, 'Tag 1 im Budget');
  const h = L.heute(d, '2026-11-02');
  gleich(h.B, 10207, 'B heute');
  gleich(h.rest, 10207, 'Rest heute');
  gleich(h.tageUebrig, 29, 'Tage uebrig');
  const teuer = dreitausend({ buchungen: [{ id: 'a', art: 'ausgabe', name: 'Einkauf', betrag: EUR(160), datum: '2026-11-01', kategorie: '', notiz: '' }] });
  gleich(L.tagErfuellt(teuer, '2026-11-01'), false, 'Tag 1 ueber Budget');
});

test('Zeitraumrest und Wochenziel', () => {
  const d = dreitausend({ buchungen: [{ id: 'a', art: 'ausgabe', name: 'Brot', betrag: EUR(40), datum: '2026-11-01', kategorie: '', notiz: '' }] });
  const zr = L.zeitraum(d, '2026-11-01');
  gleich(L.zeitraumRest(d, zr), EUR(2960), 'R = V - Ausgaben');
  // Woche 26.10. bis 01.11. schneidet den Zeitraum auf 01.11.: W = 100 EUR, Ausgaben 40 EUR
  gleich(L.wocheErfuellt(d, '2026-10-26', zr), true, 'Woche im Budget');
  const teuer = dreitausend({ buchungen: [{ id: 'a', art: 'ausgabe', name: 'Einkauf', betrag: EUR(160), datum: '2026-11-01', kategorie: '', notiz: '' }] });
  const zrTeuer = L.zeitraum(teuer, '2026-11-01');
  gleich(L.wocheErfuellt(teuer, '2026-10-26', zrTeuer), false, 'Woche ueber Budget');
});

test('Frueher Eingang, danach naechster Gehaltstag ohne neuen Eingang', () => {
  const d = basis(27, { gehaltseingaenge: ['2026-09-25'] });
  const zr = L.zeitraum(d, '2026-10-28');
  gleich(zr.start, '2026-10-27', 'start');
  gleich(zr.ende, '2026-11-26', 'ende');
});

test('Eingang kurz vor Gehaltstag startet neuen Zeitraum', () => {
  const d = basis(27, { gehaltseingaenge: ['2026-10-24'] });
  const zr = L.zeitraum(d, '2026-10-24');
  gleich(zr.start, '2026-10-24', 'start');
  gleich(zr.ende, '2026-11-26', 'ende');
  const spaeter = L.zeitraum(d, '2026-10-27');
  gleich(spaeter.start, '2026-10-24', 'kein Neustart am regulaeren Gehaltstag');
});

test('Jahresvertrag mit Faelligkeit in der Zukunft wird schon jetzt zurueckgelegt', () => {
  const d = basis(27, { vertraege: [
    { id: 'g', art: 'einnahme', name: 'Gehalt', betrag: 250000, intervall: 1, ersteFaelligkeit: '2026-09-27', kategorie: 'x', istGehalt: true, ende: null },
    { id: 'h', art: 'ausgabe', name: 'Haftpflicht', betrag: 6000, intervall: 12, ersteFaelligkeit: '2027-01-15', kategorie: 'x', istGehalt: false, ende: null },
  ] });
  const zr = L.zeitraum(d, '2026-10-10');
  gleich(L.verfuegbar(d, zr).V, 250000 - 500, 'V mit 5 EUR Ruecklage');
});

test('Start mitten im Zeitraum: nur anteiliges Budget und anteilige Sparrate', () => {
  const d = basis(1, {
    einstellungen: { gehaltstag: 1, startDatum: '2026-11-16', ersteinrichtungFertig: true, push: { abonniert: false } },
    vertraege: [{ id: 'g', art: 'einnahme', name: 'Gehalt', betrag: 300000, intervall: 1, ersteFaelligkeit: '2026-11-01', kategorie: 'x', istGehalt: true, ende: null }],
    sparziele: [{ id: 's', name: 'Urlaub', proMonat: 30000, zielsumme: null, angespart: 0 }],
  });
  const zr = L.zeitraum(d, '2026-11-16');
  gleich(L.verfuegbar(d, zr).V, 135000, 'V = 2700 EUR x 15/30');
  gleich(L.tagesbudget(d, '2026-11-16'), 9000, 'B = 90 EUR wie bei vollem Monat');
  gleich(L.abschluss(d, zr).gutgeschrieben.s, 15000, 'Sparziel anteilig 150 EUR');
  const dez = L.zeitraum(d, '2026-12-05');
  gleich(L.verfuegbar(d, dez).V, 270000, 'Folgemonat voll');
});

test('Erste Woche zaehlt erst ab Starttag', () => {
  const d = basis(1, {
    einstellungen: { gehaltstag: 1, startDatum: '2026-11-21', ersteinrichtungFertig: true, push: { abonniert: false } },
    vertraege: [{ id: 'g', art: 'einnahme', name: 'Gehalt', betrag: 300000, intervall: 1, ersteFaelligkeit: '2026-11-01', kategorie: 'x', istGehalt: true, ende: null }],
  });
  const w = L.woche(d, '2026-11-21');
  gleich(w.von, '2026-11-21', 'von = Starttag (Samstag)');
  gleich(w.W, 20000, 'W = 2 Tage x 100 EUR');
});

test('Nutzerfall: Start mitten im Monat, Vertraege mit naechster Faelligkeit im Folgemonat', () => {
  const v = (id, art, name, betrag, intervall, ef, istGehalt) =>
    ({ id, art, name, betrag, intervall, ersteFaelligkeit: ef, kategorie: 'x', istGehalt: !!istGehalt, ende: null });
  const d = basis(1, {
    einstellungen: { gehaltstag: 1, startDatum: '2026-10-10', ersteinrichtungFertig: true, push: { abonniert: false } },
    vertraege: [
      v('g', 'einnahme', 'Gehalt', 270000, 1, '2026-10-01', true),
      v('m', 'ausgabe', 'Miete', 150000, 1, '2026-11-01'),
      v('h', 'ausgabe', 'Handy', 30000, 1, '2026-11-15'),
      v('s', 'ausgabe', 'Strom', 30000, 1, '2026-11-03'),
    ],
  });
  const zr = L.zeitraum(d, '2026-10-10');
  gleich(zr.start + ' ' + zr.ende, '2026-10-01 2026-10-31', 'Zeitraum');
  // 600 EUR frei, davon 22 von 31 Tagen: 425,81 EUR, also 19,36 EUR pro Tag
  gleich(L.verfuegbar(d, zr).V, 42581, 'V anteilig');
  gleich(L.tagesbudget(d, '2026-10-10'), 1936, 'Tagesbudget 425,81 / 22 = 19,355');
});

test('Monatliche Einnahme mit naechster Faelligkeit im Folgemonat zaehlt diesen Monat', () => {
  const d = basis(1, { vertraege: [
    { id: 'k', art: 'einnahme', name: 'Kindergeld', betrag: 25500, intervall: 1, ersteFaelligkeit: '2026-12-05', kategorie: 'x', istGehalt: false, ende: null },
  ] });
  gleich(L.verfuegbar(d, L.zeitraum(d, '2026-11-10')).V, 25500, 'einmal im November');
});

test('Vierteljaehrliche Einnahme: frueherer Termin im Zeitraum wird erkannt', () => {
  const d = basis(1, { vertraege: [
    { id: 'q', art: 'einnahme', name: 'Bonus', betrag: 30000, intervall: 3, ersteFaelligkeit: '2027-02-10', kategorie: 'x', istGehalt: false, ende: null },
  ] });
  gleich(L.verfuegbar(d, L.zeitraum(d, '2026-11-20')).V, 30000, 'November (10.11. = Feb minus 3 Monate)');
  gleich(L.verfuegbar(d, L.zeitraum(d, '2026-12-20')).V, 0, 'Dezember ohne Termin');
});


test('Spaetere Einnahme aendert vergangene Tage und die laufende Woche nicht', () => {
  // Oktober 2026: 3100 EUR frei. Am 12.10. bleiben 20 Tage, also 155 EUR pro Tag. Woche Mo 12.10. bis So 18.10.
  const d = basis(1, {
    vertraege: [{ id: 'g', art: 'einnahme', name: 'Gehalt', betrag: 310000, intervall: 1, ersteFaelligkeit: '2026-10-01', kategorie: '', istGehalt: true, ende: null }],
    buchungen: [
      { id: 'a1', art: 'ausgabe', name: 'x', betrag: 16000, datum: '2026-10-12', kategorie: 'sonstiges' },
      { id: 'e1', art: 'einnahme', name: 'Erstattung', betrag: 31000, datum: '2026-10-15', kategorie: 'sonstiges' },
    ],
  });
  gleich(L.tagErfuellt(d, '2026-10-12'), false, '12.10. bleibt ueber Budget');
  gleich(L.tagesbudget(d, '2026-10-12'), 15500, 'B(12.10.) ohne spaetere Einnahme');
  const w = L.woche(d, '2026-10-16');
  gleich(w.W, 108500, 'W am Montag festgelegt: 7 x 155 EUR');
  // 15.10.: (3100 + 310 - 160) / 17 Resttage = 191,18 EUR
  gleich(L.tagesbudget(d, '2026-10-15'), 19118, 'Einnahme wirkt ab ihrem Tag');
});

test('Prognose der Woche', () => {
  const d = basis(1, {
    vertraege: [{ id: 'g', art: 'einnahme', name: 'Gehalt', betrag: 310000, intervall: 1, ersteFaelligkeit: '2026-10-01', kategorie: '', istGehalt: true, ende: null }],
    buchungen: [
      { id: 'a1', art: 'ausgabe', name: 'x', betrag: 8000, datum: '2026-10-12', kategorie: 'sonstiges' },
      { id: 'a2', art: 'ausgabe', name: 'y', betrag: 4000, datum: '2026-10-13', kategorie: 'sonstiges' },
    ],
  });
  const s = L.wochenStand(d, '2026-10-14');
  gleich(s.tempo, 6000, 'Tempo 120 EUR / 2 Tage');
  gleich(s.prognoseAusgaben, 12000 + 6000 * 5, 'bisher 120 + heute 60 + 4 x 60');
  gleich(s.prognoseRest, 108500 - 42000, 'Prognose Rest 665 EUR');
  gleich(s.proTag, 19300, 'Rest 965 EUR auf 5 Tage');
  gleich(L.wochenStand(d, '2026-10-12').prognoseAusgaben, null, 'Montag ohne Prognose');
});

// ---------- Ausgabe ----------

const zeilen = document.getElementById('zeilen');
let bestanden = 0;
for (const r of ergebnisse) {
  if (r.ok) bestanden++;
  const li = document.createElement('li');
  li.className = r.ok ? 'gruen' : 'rot';
  li.textContent = (r.ok ? '✔ ' : '✘ ') + r.text;
  zeilen.appendChild(li);
}
const ergebnisZeile = document.getElementById('ergebnis');
ergebnisZeile.textContent = bestanden + ' von ' + ergebnisse.length + ' bestanden';
ergebnisZeile.dataset.ok = String(bestanden === ergebnisse.length);
