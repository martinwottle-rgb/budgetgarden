// Budget-Rechenlogik des Gewaechshauses. Reine Funktionen, kein DOM, keine Abhaengigkeiten.
// Beträge in Cent (Ganzzahlen). Datumswerte als "YYYY-MM-DD", intern mit UTC-Daten gerechnet,
// damit die Zeitzone und die Sommerzeit nichts verschieben.

const TAG_MS = 86400000;

function zerlege(d) {
  const [j, m, t] = d.split('-').map(Number);
  return { j, m, t };
}

function fmt(j, m, t) {
  return String(j).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(t).padStart(2, '0');
}

function ms(d) {
  const { j, m, t } = zerlege(d);
  return Date.UTC(j, m - 1, t);
}

function ausMs(x) {
  return new Date(x).toISOString().slice(0, 10);
}

function summe(liste, f) {
  let s = 0;
  for (const x of liste) s += f(x);
  return s;
}

function gehaltstag(daten) {
  const g = daten.einstellungen && daten.einstellungen.gehaltstag;
  return g || 1;
}

// ---------- Datum ----------

export function monatslaenge(jahr, monat) {
  return new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
}

export function datumPlusTage(d, n) {
  return ausMs(ms(d) + n * TAG_MS);
}

export function datumPlusMonate(d, n, tagWunsch) {
  const { j, m, t } = zerlege(d);
  const gesamt = (m - 1) + n;
  const jahr = j + Math.floor(gesamt / 12);
  const monat = ((gesamt % 12) + 12) % 12 + 1;
  const tag = Math.min(tagWunsch || t, monatslaenge(jahr, monat));
  return fmt(jahr, monat, tag);
}

export function tageZwischen(a, b) {
  return Math.round((ms(b) - ms(a)) / TAG_MS);
}

// 0 = Montag ... 6 = Sonntag
export function wochentag(d) {
  return (new Date(ms(d)).getUTCDay() + 6) % 7;
}

export function wochenbeginn(d) {
  return datumPlusTage(d, -wochentag(d));
}

// ---------- Runden und Format ----------

export function rundeCent(x) {
  const r = Math.round(Math.abs(x) + 1e-9);
  return x < 0 && r !== 0 ? -r : r;
}

export function euro(cent) {
  const neg = cent < 0;
  const a = Math.abs(Math.round(cent));
  const euros = Math.floor(a / 100);
  const rest = a % 100;
  const gruppiert = String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const vorzeichen = neg && a !== 0 ? '−' : '';
  return vorzeichen + gruppiert + ',' + String(rest).padStart(2, '0') + ' €';
}

// ---------- Fälligkeiten und Zeitraum ----------

// Die Reihe läuft vom eingetragenen Datum aus in beide Richtungen: Eingetragen wird die NÄCHSTE
// Fälligkeit, frühere Termine desselben Vertrags gab es also schon.
export function faelligkeiten(vertrag, von, bis) {
  const ef = zerlege(vertrag.ersteFaelligkeit);
  const tag = ef.t;
  const schritt = Math.max(1, vertrag.intervall || 1);
  const v = zerlege(von);
  const monateZurueck = Math.max(0, (ef.j - v.j) * 12 + (ef.m - v.m));
  const ergebnis = [];
  for (let k = -Math.ceil(monateZurueck / schritt) - 1; ; k++) {
    const d = datumPlusMonate(vertrag.ersteFaelligkeit, k * schritt, tag);
    if (d > bis) break;
    if (vertrag.ende && d > vertrag.ende) break;
    if (d >= von) ergebnis.push(d);
  }
  return ergebnis;
}

export function zeitraum(daten, stichtag) {
  const gt = gehaltstag(daten);
  const eingang = (daten.gehaltseingaenge || [])
    .filter(e => e <= stichtag && tageZwischen(e, stichtag) <= 40)
    .sort()
    .pop();

  // Ein Gehaltseingang bestimmt den Start nur, solange sein Zeitraum den Stichtag noch enthält;
  // sonst gilt der reguläre Gehaltstag (Gehalt diesmal noch nicht bestätigt).
  if (eingang) {
    const ende = endeAb(eingang, gt);
    if (ende >= stichtag) return { start: eingang, ende, tage: tageZwischen(eingang, ende) + 1 };
  }
  const { j, m } = zerlege(stichtag);
  let start = fmt(j, m, Math.min(gt, monatslaenge(j, m)));
  if (start > stichtag) start = datumPlusMonate(stichtag, -1, gt);
  const ende = endeAb(start, gt);
  return { start, ende, tage: tageZwischen(start, ende) + 1 };
}

// Ende = Tag vor dem nächsten erwarteten Gehaltstag, der mindestens 15 Tage nach dem Start liegt
// (ein verfrühter Eingang am 25. bei Gehaltstag 27 endet so am 26. des Folgemonats).
function endeAb(start, gt) {
  const { j, m } = zerlege(datumPlusTage(start, 15));
  let naechster = fmt(j, m, Math.min(gt, monatslaenge(j, m)));
  if (naechster < datumPlusTage(start, 15)) naechster = datumPlusMonate(naechster, 1, gt);
  return datumPlusTage(naechster, -1);
}

// ---------- Verfügbar ----------

// stichtag (optional): Stand an diesem Tag. Einmalige Einnahmen und Fixkosten-Buchungen nach dem Stichtag
// und nicht monatliche Vertragseinnahmen, die erst danach eingehen, zählen dann noch nicht. So ändert eine
// spätere Einnahme kein Tages- oder Wochenbudget, das schon gegolten hat.
export function verfuegbar(daten, zr, stichtag) {
  const posten = [];
  const bisTag = stichtag && stichtag < zr.ende ? stichtag : zr.ende;

  for (const v of daten.vertraege || []) {
    if (v.ende && v.ende < zr.start) continue;
    // Geglättete Ausgaben (Intervall > 1) werden schon vor der ersten Fälligkeit zurückgelegt,
    // sonst fehlt das Geld, wenn sie zum ersten Mal abgebucht werden.
    // Monatliche Verträge zählen in jedem Zeitraum genau einmal, auch wenn die eingetragene
    // (nächste) Fälligkeit schon im Folgemonat liegt.

    if (v.art === 'einnahme') {
      const n = (v.intervall || 1) === 1 ? 1 : faelligkeiten(v, zr.start, bisTag).length;
      if (n > 0) posten.push({ name: v.name, betrag: n * v.betrag, art: 'einnahme' });
    } else if (v.art === 'ausgabe') {
      posten.push({ name: v.name, betrag: -rundeCent(v.betrag / Math.max(1, v.intervall || 1)), art: 'fixkosten' });
    }
  }

  for (const b of daten.buchungen || []) {
    if (b.datum < zr.start || b.datum > bisTag) continue;
    if (b.art === 'einnahme') posten.push({ name: b.name, betrag: b.betrag, art: 'einnahme' });
    if (b.art === 'fixkosten') posten.push({ name: b.name, betrag: -b.betrag, art: 'fixkosten' });
  }

  for (const r of daten.ruecklagen || []) {
    posten.push({ name: r.name, betrag: -rundeCent(r.betragProJahr / 12), art: 'ruecklage' });
  }

  for (const s of daten.sparziele || []) {
    posten.push({ name: s.name, betrag: -(s.proMonat || 0), art: 'sparziel' });
  }

  const vorher = datumPlusTage(zr.start, -1);
  const abschluss = (daten.abschluesse || []).find(a => a.zeitraumEnde === vorher);
  if (abschluss) posten.push({ name: 'Übertrag', betrag: abschluss.uebertrag, art: 'uebertrag' });

  // Startet die App mitten im Zeitraum, ist ein Teil des Geldes schon weg: nur der Anteil ab dem Starttag zählt.
  const anteil = anteilAbStart(daten, zr);
  if (anteil < 1) {
    const voll = summe(posten, p => p.betrag);
    posten.push({ name: 'Vor dem Start verbraucht (anteilig)', betrag: -rundeCent(voll * (1 - anteil)), art: 'anteilig' });
  }

  return { V: summe(posten, p => p.betrag), posten };
}

// Anteil des Zeitraums ab einstellungen.startDatum (1, wenn der Zeitraum nach dem Start beginnt).
export function anteilAbStart(daten, zr) {
  const st = daten.einstellungen && daten.einstellungen.startDatum;
  if (!st || st <= zr.start || st > zr.ende) return 1;
  return (tageZwischen(st, zr.ende) + 1) / zr.tage;
}

// ---------- Ausgaben ----------

export function ausgabenAm(daten, d) {
  return summe((daten.buchungen || []).filter(b => b.art === 'ausgabe' && b.datum === d), b => b.betrag);
}

export function ausgabenZwischen(daten, von, bis) {
  return summe((daten.buchungen || []).filter(b => b.art === 'ausgabe' && b.datum >= von && b.datum <= bis), b => b.betrag);
}

// ---------- Tagesbudget, Heute, Woche ----------

// Budget für Tag d: verfügbares Geld minus Ausgaben vor d, verteilt auf die restlichen Tage.
// stichtag: Stand dieses Tages (Spiel, damit spätere Einnahmen nichts rückwirkend bestehen lassen);
// ohne Stichtag zählen alle bekannten Einnahmen (Anzeige).
function budgetAm(daten, zr, d, stichtag = d) {
  const v = verfuegbar(daten, zr, stichtag || undefined).V;
  const vorher = ausgabenZwischen(daten, zr.start, datumPlusTage(d, -1));
  const tageRest = tageZwischen(d, zr.ende) + 1;
  return rundeCent((v - vorher) / tageRest);
}

export function tagesbudget(daten, d) {
  return budgetAm(daten, zeitraum(daten, d), d);
}

export function heute(daten, d) {
  const zr = zeitraum(daten, d);
  const V = verfuegbar(daten, zr).V;
  const B = budgetAm(daten, zr, d);
  const ausgegeben = ausgabenAm(daten, d);
  return {
    zr,
    V,
    B,
    ausgegeben,
    rest: B - ausgegeben,
    tageUebrig: tageZwischen(d, zr.ende) + 1
  };
}

// Wochenbudget. fuerSpiel: festgelegt mit dem Stand des ersten Wochentags, damit eine spätere Einnahme
// keine Wochenwertung und keine Challenge rückwirkend bestehen lässt. Für die Anzeige (Standard) zählen
// alle bekannten Einnahmen sofort mit.
function wocheIm(daten, zr, wb, fuerSpiel = false) {
  const so = datumPlusTage(wb, 6);
  // Woche beginnt frühestens am Zeitraumstart und am Starttag der App.
  const st = (daten.einstellungen && daten.einstellungen.startDatum) || '';
  let von = wb > zr.start ? wb : zr.start;
  if (st > von && st <= datumPlusTage(wb, 6)) von = st;
  const bis = so < zr.ende ? so : zr.ende;
  const tage = Math.max(0, tageZwischen(von, bis) + 1);
  const W = budgetAm(daten, zr, von, fuerSpiel ? von : null) * tage;
  const ausgegeben = ausgabenZwischen(daten, von, bis);
  return { von, bis, tage, W, ausgegeben, rest: W - ausgegeben };
}

// Wochenbudget, wie es das Spiel wertet (Stand Wochenbeginn)
export function wocheFuerSpiel(daten, d) {
  return wocheIm(daten, zeitraum(daten, d), wochenbeginn(d), true);
}

export function woche(daten, d) {
  return wocheIm(daten, zeitraum(daten, d), wochenbeginn(d));
}

// Prognose für ein Fenster von..bis am Tag d (von <= d <= bis): Tempo = Ausgaben bis gestern je Tag.
// Heute zählt mit dem Tempo oder mit dem, was heute schon ausgegeben ist, falls das mehr ist.
// Am ersten Tag des Fensters gibt es noch kein Tempo: prognoseAusgaben ist dann null.
export function prognose(daten, von, bis, budget, d) {
  const vergangen = Math.max(0, tageZwischen(von, d));
  const nachHeute = Math.max(0, tageZwischen(d, bis));
  const bisGestern = vergangen > 0 ? ausgabenZwischen(daten, von, datumPlusTage(d, -1)) : 0;
  const heuteAus = ausgabenAm(daten, d);
  const ausgegeben = bisGestern + heuteAus;
  const rest = budget - ausgegeben;
  const tageOffen = nachHeute + 1;
  const proTag = rundeCent(rest / tageOffen);
  if (vergangen === 0) return { ausgegeben, rest, proTag, tempo: null, prognoseAusgaben: null, prognoseRest: null };
  const tempo = rundeCent(bisGestern / vergangen);
  const prognoseAusgaben = bisGestern + Math.max(heuteAus, tempo) + tempo * nachHeute;
  return { ausgegeben, rest, proTag, tempo, prognoseAusgaben, prognoseRest: budget - prognoseAusgaben };
}

// Woche mit Prognose und Betrag pro restlichem Tag (heute eingeschlossen)
export function wochenStand(daten, d) {
  const w = woche(daten, d);
  return { ...w, ...prognose(daten, w.von, w.bis, w.W, d) };
}

// Laufender Zeitraum mit Prognose
export function zeitraumStand(daten, d) {
  const zr = zeitraum(daten, d);
  const V = verfuegbar(daten, zr).V;
  const st = (daten.einstellungen && daten.einstellungen.startDatum) || '';
  const von = st > zr.start && st <= zr.ende ? st : zr.start;
  return { zr, V, ...prognose(daten, von, zr.ende, V, d) };
}

// ---------- Ziele ----------

export function tagErfuellt(daten, d) {
  const zr = zeitraum(daten, d);
  return ausgabenAm(daten, d) <= budgetAm(daten, zr, d);
}

export function wocheErfuellt(daten, wochenbeginnDatum, zr) {
  const w = wocheIm(daten, zr, wochenbeginnDatum, true);
  return w.ausgegeben <= w.W;
}

export function zeitraumRest(daten, zr) {
  return verfuegbar(daten, zr).V - ausgabenZwischen(daten, zr.start, zr.ende);
}

// ---------- Monatsabschluss ----------

export function abschluss(daten, zr) {
  const rest = zeitraumRest(daten, zr);
  const sparziele = daten.sparziele || [];
  const gutgeschrieben = {};

  // Im ersten, angebrochenen Zeitraum wurde auch nur anteilig gespart.
  const anteil = anteilAbStart(daten, zr);
  const rate = s => rundeCent((s.proMonat || 0) * anteil);

  if (rest >= 0) {
    for (const s of sparziele) gutgeschrieben[s.id] = rate(s);
    return { rest, gutgeschrieben, uebertrag: rest };
  }

  const S = summe(sparziele, rate);
  const T = Math.max(0, S + rest);
  if (S === 0) {
    for (const s of sparziele) gutgeschrieben[s.id] = 0;
    return { rest, gutgeschrieben, uebertrag: 0 };
  }

  let verteilt = 0;
  let groesster = null;
  for (const s of sparziele) {
    const p = rate(s);
    const teil = rundeCent(T * p / S);
    gutgeschrieben[s.id] = teil;
    verteilt += teil;
    if (groesster === null || p > rate(groesster)) groesster = s;
  }
  if (groesster !== null) gutgeschrieben[groesster.id] += T - verteilt;

  return { rest, gutgeschrieben, uebertrag: 0 };
}
