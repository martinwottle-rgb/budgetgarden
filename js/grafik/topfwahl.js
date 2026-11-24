// Gewählter Topf beim Zeichnen einer Pflanze. Die Szene setzt ihn kurz vor dem Zeichnen (mitTopf), die Topf-Funktionen
// der Pflanzendateien fragen ihn ab und zeichnen dann diesen Topf statt ihres eigenen. Ohne Wahl: eigener Topf wie bisher.
let aktuell = null;   // Funktion (R, H) => svg oder null

export function gewaehlterTopf() {
  return aktuell;
}

// zeichne: (R, H) => svg des gewählten Topfs; fn: zeichnet die Pflanze
export function mitTopf(zeichne, fn) {
  if (!zeichne) return fn();
  const vorher = aktuell;
  aktuell = zeichne;
  try {
    return fn();
  } finally {
    aktuell = vorher;
  }
}
