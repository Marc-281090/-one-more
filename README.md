# Blind Path

Ein offline spielbares, mobile-first Memory-/Skill-Spiel. Ein Pfad wird kurz sichtbar und muss anschließend in derselben Reihenfolge nachgetippt werden. Fehler kosten ein Leben, zeigen aber **denselben** deterministischen Pfad erneut.

## Lokal starten und testen

```bash
npm test
npm start
```

Danach `http://localhost:4173` öffnen. Alle Daten bleiben ausschließlich im lokalen Browser (`localStorage`). Die installierbare PWA funktioniert nach dem ersten Laden offline.

## Enthalten

- Responsive Portrait-UI mit Safe-Area-Unterstützung
- Faire Progressionskurve mit Erholungsstages
- Robuster, begrenzter Pfadgenerator mit deterministischen Seeds und Fallback
- Drei Leben, Streaks, Bestleistung, Statistik und unmittelbarer Neustart
- Onboarding im Spielfluss, synthetisches Audio, Haptik, reduzierte Bewegung
- Versionierte, validierte lokale Speicherung und Offline-Service-Worker

## Store-Vorbereitung

Der aktuelle Build ist eine installierbare PWA und benötigt keine Server oder Nutzerdaten. Für native App-Store-Pakete empfiehlt sich als nächster Schritt **Capacitor** als dünne Hülle um diesen Web-Build. Dafür sind lokal Node.js, Android Studio bzw. auf macOS Xcode nötig. Anschließend werden je Plattform App-ID, 1024×1024-PNG-Icon, Splash-Screens, Signing und Store-Metadaten ergänzt.

Marc muss selbst durchführen: Apple-/Google-Developer-Konten eröffnen, Verträge und Gebühren bestätigen, Zertifikate/Signing verwalten, echte Geräte prüfen und die Builds in App Store Connect bzw. Play Console hochladen. Benötigte Screenshots: aktuelle iPhone- und Android-Portraitgrößen von Startseite, Pfad-Anzeige, Eingabe, Erfolg und Game Over. Nach heutigem Funktionsumfang werden keine personenbezogenen Daten erhoben, kein Tracking eingesetzt und keine Daten übertragen; die finalen Store-Datenschutzangaben müssen vor Veröffentlichung dennoch geprüft werden.

## Bekannte Grenzen

- Audio wird zur Laufzeit per Web Audio erzeugt; finale Marken-Sounds können später ergänzt werden.
- Native Haptik, Store-Signing und reale iOS-/Android-Gerätetests sind außerhalb dieses Browser-Repositories noch offen.
