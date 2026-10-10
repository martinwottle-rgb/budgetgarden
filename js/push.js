// Web-Push für die 22-Uhr-Erinnerung. Wird von den Einstellungen benutzt.

export const VAPID_PUBLIC = 'BPMiuHw0_UefWeytfcIMckdt5dyB6PMbMPl8QZP6KI2USLROLBC8n4eZdoJNrHlRQlgwuEZGRwHqystY5FgX5b0';

// Registriert den Service Worker. Fehler werden nur protokolliert.
export function swRegistrieren() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch((fehler) => {
    console.error('Service Worker konnte nicht registriert werden:', fehler);
  });
}

// Prüft, ob Erinnerungen auf diesem Gerät möglich sind.
export function pushMoeglich() {
  if (!('serviceWorker' in navigator)) {
    return { moeglich: false, grund: 'Dieser Browser unterstützt keine Service Worker.' };
  }
  if (!('PushManager' in window)) {
    return { moeglich: false, grund: 'Dieser Browser unterstützt keine Push-Nachrichten.' };
  }
  if (!('Notification' in window)) {
    return { moeglich: false, grund: 'Dieser Browser unterstützt keine Benachrichtigungen.' };
  }
  const istIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const alsApp = navigator.standalone === true
    || (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);
  if (istIos && !alsApp) {
    return { moeglich: false, grund: 'Erst zum Home-Bildschirm hinzufügen' };
  }
  return { moeglich: true, grund: '' };
}

// Fragt die Erlaubnis ab, abonniert Push und gibt das Abo als JSON-Text zurück.
export async function pushAbonnieren() {
  const erlaubnis = await Notification.requestPermission();
  if (erlaubnis !== 'granted') {
    throw new Error('Benachrichtigungen wurden nicht erlaubt.');
  }
  await navigator.serviceWorker.register('./sw.js');
  const registrierung = await navigator.serviceWorker.ready;
  const abo = await registrierung.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlNachBytes(VAPID_PUBLIC),
  });
  return JSON.stringify(abo.toJSON());
}

// Gibt das bestehende Abo als JSON-Text zurück oder null, wenn keins vorhanden ist.
export async function pushAbo() {
  if (!('serviceWorker' in navigator)) return null;
  const registrierung = await navigator.serviceWorker.getRegistration();
  if (!registrierung) return null;
  const abo = await registrierung.pushManager.getSubscription();
  return abo ? JSON.stringify(abo.toJSON()) : null;
}

// Wandelt einen Base64url-Text (VAPID-Schlüssel) in Bytes um.
function base64UrlNachBytes(text) {
  const auffuellen = '='.repeat((4 - (text.length % 4)) % 4);
  const base64 = (text + auffuellen).replace(/-/g, '+').replace(/_/g, '/');
  const roh = atob(base64);
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) {
    bytes[i] = roh.charCodeAt(i);
  }
  return bytes;
}
