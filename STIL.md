# Zeichenregeln für alle Grafiken

Ziel: Detailgrad wie im Referenzbild referenz/stil.png (Cozy-Illustration, isometrisch).

1. **Licht** kommt immer von links oben. Jede Form hat drei Töne: Grundton, Schattenseite
   (rechts/unten, ca. 15 bis 20 % dunkler), Glanzlicht (links/oben, ca. 15 % heller, als
   schmaler Streifen oder kleine Fläche, opacity 0.5 bis 0.8).
2. **Konturen** #6b4a3a, 1.2 bis 1.5 px, stroke-linejoin round. Innenlinien (Adern, Maserung,
   Falten) dünner, 0.6 bis 0.9 px, in einem dunkleren Ton der Fläche statt in Braun.
3. **Kontaktschatten** unter jedem Objekt: flache Ellipse #6b4a3a, opacity 0.18. Dazu
   Eigenschatten, wo Teile sich überdecken (z. B. unter dem Topfrand, unter Blättern am Stiel).
4. **Blätter**: nie ein einzelner flacher Polygonzug. Jedes Blatt hat Mittelader, bei großen
   Blättern Seitenadern, zwei Grüntöne (Ober-/Unterseite oder Licht/Schatten), leicht
   gebogene Form (Bézier, nicht eckig), Blattstiel. Mindestens 3 Grüntöne pro Pflanze aus:
   #9ccc7a #7fb069 #5e9a52 #477d43 #3a6b3a. Welk: #c4c98f #b5c48a #a8a36a, Ränder bräunlich #a6845a.
5. **Holz**: Grundton #c98f5a, Schatten #a86b43, Licht #e2b07c, feine Maserungslinien.
   **Metall**: Grundton + heller Glanzstreifen + dunkle Kante. **Keramik/Terrakotta**:
   #d9825b, Schatten #b8643f, Licht #eba47f, Rand als eigene Kiste/Ellipse mit Innenseite dunkler.
6. **Isometrie**: Objekte im gleichen Blickwinkel wie der Raum (Draufsicht von schräg oben,
   Kanten im Verhältnis 2:1). Runde Dinge (Töpfe, Kannen) als Ellipsen mit Höhe/Breite ca. 0.5.
7. **Maßstab**: Ursprung (0,0) = Mitte Bodenkontakt. Pflanzen/Deko werden in der Szene mit
   scale(1.6) gezeichnet; ein normaler Topf ist ca. 24 px breit (vor Skalierung).
8. Alles deterministisch (kein Math.random, nur der Zufallsgenerator aus hilfen.js mit festem Seed).
