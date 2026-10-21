# Anleitung: Erinnerung um 22 Uhr

Die tägliche Erinnerung kommt über die Kurzbefehle-App deines iPhones. Sie läuft auf die Minute genau und braucht weder Server noch GitHub.

Früher kam sie über GitHub Actions. GitHub startet zeitgesteuerte Läufe aber oft bis zu drei Stunden zu spät, deshalb ist dieser Weg seit dem 21.10.2026 abgeschaltet.

## Einrichten (einmalig, etwa 1 Minute)

1. Die App **Kurzbefehle** öffnen und unten **Automation** wählen.
2. Oben rechts **+** antippen, dann **Tageszeit**.
3. **22:00** einstellen, **Täglich** wählen und darunter **Sofort ausführen** aktivieren.
   **Bei Ausführung mitteilen** ausschalten. Dann **Weiter**.
4. **Neue leere Automation** wählen, dann **Aktion hinzufügen** antippen und nach **Mitteilung anzeigen** suchen.
5. Als Text eintragen: `Wie viel hast du heute ausgegeben? 🌱`
6. Oben rechts **Fertig**.

Ab jetzt erscheint jeden Abend um 22 Uhr die Mitteilung.

## Gut zu wissen

- Die Mitteilung kommt von der App „Kurzbefehle“. Antippen öffnet die Kurzbefehle-App, nicht den Budgetgarten. Den Budgetgarten öffnest du wie gewohnt über das Symbol auf dem Home-Bildschirm.
- Im Fokus-Modus „Schlafen“ oder „Nicht stören“ werden Mitteilungen still zugestellt. Wer sie trotzdem sehen will, erlaubt im jeweiligen Fokus die App Kurzbefehle.
- Uhrzeit ändern: In Kurzbefehle unter Automation die Automation antippen und die Zeit anpassen.

## Web-Push (alt, nur noch manuell)

Der GitHub-Workflow „Erinnerung 22 Uhr“ bleibt bestehen und lässt sich unter Actions mit **Run workflow** und der Option **erzwingen** von Hand starten. Er nutzt die Secrets `PUSH_ABO`, `VAPID_PUBLIC` und `VAPID_PRIVATE`. Der private Schlüssel liegt nur auf dem Laptop im Ordner `budget-gewaechshaus-geheim` und gehört nie ins Projekt.
