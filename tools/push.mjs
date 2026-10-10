// Sendet die 22-Uhr-Erinnerung des Budgetgartens. Läuft in GitHub Actions (siehe .github/workflows/erinnerung.yml).
// Env: VAPID_PUBLIC, VAPID_PRIVATE, PUSH_ABO (Abo-JSON, auch ein Array mehrerer Abos), optional ERZWINGEN=1.

import webpush from 'web-push';

const vapidPublic = process.env.VAPID_PUBLIC;
const vapidPrivate = process.env.VAPID_PRIVATE;
const pushAboText = process.env.PUSH_ABO;
const erzwingen = process.env.ERZWINGEN === '1';

if (!vapidPublic || !vapidPrivate || !pushAboText) {
  console.error('Fehlende Env-Variable: VAPID_PUBLIC, VAPID_PRIVATE und PUSH_ABO müssen gesetzt sein.');
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
  const daten = JSON.parse(pushAboText);
  abos = Array.isArray(daten) ? daten : [daten];
} catch (fehler) {
  console.error('PUSH_ABO ist kein gültiges JSON:', fehler.message);
  process.exit(1);
}

webpush.setVapidDetails('mailto:budgetgarten@example.invalid', vapidPublic, vapidPrivate);

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
      console.error('Senden fehlgeschlagen (Status ' + (fehler.statusCode ?? 'unbekannt') + '):', fehler.body || fehler.message);
    }
  }
}

console.log(`Gesendet: ${gesendet}, fehlgeschlagen: ${fehlgeschlagen}`);
if (fehlgeschlagen > 0) {
  process.exitCode = 1;
}
