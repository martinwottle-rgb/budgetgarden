// Kleine Deko, die auch auf Möbel-Stellplätzen stehen darf (Regalböden, Tische), mit ihrer Höhe in Zeichen-Einheiten
// (wie die Pflanzenhöhen). Die Szene verkleinert sie damit wie Pflanzen, wenn der Platz bis zum nächsten Boden knapp ist.
// Große Deko (Bank, Sessel, Brunnen, Vogelhaus, Teppich, Hängeampel) bleibt auf dem Boden bzw. am Haken.
export const DEKO_AUF_MOEBEL = {
  laterne: 36,
  giesskanne: 21,
  gartenzwerg: 23,
  windspiel: 41,
  lichterkette: 39,
  katze: 17,
  skulptur: 39,
  goldene_giesskanne: 19,
  keramikpfau: 24,
  kuerbis: 31,
  schneelaterne: 34
};

export function dekoAufMoebel(typ) {
  return Object.prototype.hasOwnProperty.call(DEKO_AUF_MOEBEL, typ);
}
