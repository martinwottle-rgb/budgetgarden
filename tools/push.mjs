// Sendet die 22-Uhr-Erinnerung des Budgetgartens. Läuft in GitHub Actions (siehe .github/workflows/erinnerung.yml).
// Env: VAPID_PUBLIC, VAPID_PRIVATE, PUSH_ABO (Abo-JSON, auch ein Array mehrerer Abos), optional ERZWINGEN=1.

import webpush from 'web-push';

// Secrets tolerant lesen: Leerzeichen, Anführungszeichen oder eine mitkopierte JSON-Zeile
// wie "VAPID_PUBLIC": "..." werden entfernt, übrig bleibt nur der Base64url-Schlüssel.
const schluessel = (wert) => {
  const t = (wert || '').trim();
  const treffer = t.match(/[A-Za-z0-9_-]{40,}/g);
  return treffer ? treffer[treffer.length - 1] : '';
};
const vapidPublic = schluessel(process.env.VAPID_PUBLIC);
const vapidPrivate = schluessel(process.env.VAPID_PRIVATE);
const pushAboText = (process.env.PUSH_ABO || '').trim();
const erzwingen = process.env.ERZWINGEN === '1';
const APP_PUBLIC = 'BPMiuHw0_UefWeytfcIMckdt5dyB6PMbMPl8QZP6KI2USLROLBC8n4eZdoJNrHlRQlgwuEZGRwHqystY5FgX5b0';

const fehlt = [];
if (!vapidPublic) fehlt.push('VAPID_PUBLIC');
if (!vapidPrivate) fehlt.push('VAPID_PRIVATE');
if (!pushAboText) fehlt.push('PUSH_ABO');
if (fehlt.length) {
  console.error('FEHLER: Diese Secrets fehlen oder sind leer: ' + fehlt.join(', ') + '. In GitHub unter Settings, Secrets and variables, Actions anlegen.');
  process.exit(1);
}
if (vapidPublic !== APP_PUBLIC) {
  console.error('FEHLER: VAPID_PUBLIC passt nicht zum Schlüssel der App. Erwartet beginnt mit ' + APP_PUBLIC.slice(0, 10) + '…, gefunden beginnt mit ' + vapidPublic.slice(0, 10) + '…');
  process.exit(1);
}
if (vapidPrivate.length < 42 || vapidPrivate.length > 44) {
  console.error('FEHLER: VAPID_PRIVATE hat eine unerwartete Länge (' + vapidPrivate.length + ' Zeichen, erwartet 43). Bitte nur den Wert aus vapid.json ohne Anführungszeichen eintragen.');
  process.exit(1);
}

// Fenster 21:40 bis 22:40 Berliner Zeit. Ein früher Lauf wartet bis 22:00, ein verspäteter sendet sofort.
// Die zwei Cron-Zeiten (19:50 und 20:50 UTC) treffen je nach Sommer-/Winterzeit genau einmal dieses Fenster.
if (!erzwingen) {
  const teile = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const wert = (typ) => Number(teile.find((t) => t.type === typ).value);
  const sekunden = wert('hour') * 3600 + wert('minute') * 60 + wert('second');
  const von = 21 * 3600 + 40 * 60, zehn = 22 * 3600, bis = 22 * 3600 + 40 * 60;
  if (sekunden < von || sekunden >= bis) {
    console.log('Nicht im Fenster 21:40 bis 22:40 Uhr in Berlin, übersprungen');
    process.exit(0);
  }
  if (sekunden < zehn) {
    console.log(`Warte ${zehn - sekunden} s bis 22:00 Uhr`);
    await new Promise((r) => setTimeout(r, (zehn - sekunden) * 1000));
  }
}

let abos;
try {
  let text = pushAboText;
  // Falls das Abo in Anführungszeichen eingefügt wurde, diese entfernen
  if (text.startsWith('"') && text.endsWith('"')) text = JSON.parse(text);
  const daten = JSON.parse(text);
  abos = Array.isArray(daten) ? daten : [daten];
  for (const a of abos) {
    if (!a || !a.endpoint || !a.keys || !a.keys.p256dh || !a.keys.auth) throw new Error('endpoint oder keys fehlen');
  }
} catch (fehler) {
  console.error('FEHLER: PUSH_ABO ist kein vollständiger Abo-Code (' + fehler.message + '). In der App unter Einstellungen den Code neu kopieren und komplett, mit { am Anfang und } am Ende, als Secret einfügen.');
  process.exit(1);
}

// Apple verlangt einen echten Absender (mailto oder https), daher die Adresse der App
webpush.setVapidDetails('https://martinwottle-rgb.github.io/budgetgarden/', vapidPublic, vapidPrivate);

const payload = JSON.stringify({ text: 'Wie viel hast du heute ausgegeben? 🌱' });

let gesendet = 0;
let fehlgeschlagen = 0;
for (const abo of abos) {
  try {
    await webpush.sendNotification(abo, payload);
    gesendet++;
  } catch (fehler) {
    fehlgeschlagen++;
    if (fehler.statusCode === 404 || fehler.statusCode === 410) {
      console.error('Abo abgelaufen, in der App neu aktivieren (Status ' + fehler.statusCode + ').');
    } else {
      console.error('FEHLER beim Senden an ' + new URL(abo.endpoint).host + ' (Status ' + (fehler.statusCode ?? 'unbekannt') + '): ' + (fehler.body || fehler.message));
      if (fehler.statusCode === 403) console.error('Hinweis: 403 heißt meist, dass VAPID_PRIVATE nicht zu VAPID_PUBLIC passt.');
    }
  }
}

console.log(`Gesendet: ${gesendet}, fehlgeschlagen: ${fehlgeschlagen}`);
if (fehlgeschlagen > 0) {
  process.exitCode = 1;
}
