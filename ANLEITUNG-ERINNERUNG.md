# Anleitung: Erinnerung um 22 Uhr

Jeden Abend um 22 Uhr erinnert dich der Budgetgarten daran, deine Ausgaben einzutragen. Die Erinnerung kommt als Benachrichtigung auf dein iPhone. Sie funktioniert nur, wenn die App auf dem Home-Bildschirm liegt (iOS 16.4 oder neuer).

## 1. App auf den Home-Bildschirm legen

1. Budgetgarten in Safari öffnen.
2. Teilen-Symbol antippen, dann "Zum Home-Bildschirm".
3. Die App von dort öffnen. Ab jetzt läuft sie als eigene App.

## 2. Erinnerung in der App aktivieren

1. In der App auf "Einstellungen" gehen.
2. "Erinnerung aktivieren" antippen und die Benachrichtigungen erlauben.
3. Es erscheint ein Abo-Code. Den Kopieren-Knopf drücken.

## 3. Abo-Code in GitHub hinterlegen

Der Code wird als Geheimnis (Secret) im Repository gespeichert.

1. Repository auf GitHub öffnen.
2. Settings → Secrets and variables → Actions → "New repository secret".
3. Name: `PUSH_ABO`, Wert: den kopierten Abo-Code einfügen, speichern.
4. Ein zweites Secret anlegen: Name `VAPID_PUBLIC`, Wert: der öffentliche Schlüssel aus der Datei `vapid.json` (Ordner `budget-gewaechshaus-geheim` auf deinem Laptop).
5. Ein drittes Secret anlegen: Name `VAPID_PRIVATE`, Wert: der private Schlüssel aus derselben Datei.

Die Datei mit dem privaten Schlüssel gehört nur auf deinen Rechner. Sie darf nicht in das Projekt kopiert oder dort abgelegt werden.

## 4. Test

1. Im Repository auf "Actions" gehen.
2. Links "Erinnerung 22 Uhr" wählen.
3. "Run workflow" drücken, die Option "erzwingen" aktivieren und starten.
4. Nach kurzer Zeit sollte die Benachrichtigung auf dem iPhone erscheinen.

Ohne "erzwingen" sendet der Workflow nur, wenn es in Berlin gerade 22:00 bis 22:29 Uhr ist. Der Lauf meldet dann "Nicht 22 Uhr in Berlin, übersprungen".

## Wenn keine Erinnerung kommt

- Meldung "Abo abgelaufen, in der App neu aktivieren" im Actions-Lauf: In der App auf "Erinnerung aktivieren" tippen, den neuen Code kopieren und das Secret `PUSH_ABO` ersetzen.
- Benachrichtigungen für Budgetgarten in den iPhone-Einstellungen prüfen.
