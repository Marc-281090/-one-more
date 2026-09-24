# Blind Path

Blind Path ist ein offline spielbares, für Smartphones gestaltetes Gedächtnis- und Geschicklichkeitsspiel. Ein Pfad wird kurz sichtbar und muss anschließend in derselben Reihenfolge nachgetippt werden. Ein Fehler kostet ein Leben, zeigt aber bewusst **denselben deterministischen Pfad** erneut.

## Lokal starten und testen

```bash
npm test
npm start
```

Danach `http://localhost:4173` öffnen. Die installierbare PWA funktioniert nach dem ersten Laden offline. Fortschritt und Einstellungen bleiben ausschließlich im lokalen Browser (`localStorage`).

## Umgesetzter Stand

- Responsive Hochformat-Oberfläche mit Safe Areas für Notch, Dynamic Island und Home-Indikator
- Faire Progressionskurve, großzügige Anfangszeiten und regelmäßige Erholungsstages
- Begrenzter Pfadgenerator mit deterministischen Seeds, eindeutigen Feldern und garantiertem Fallback
- Drei Leben, unveränderter Pfad nach Fehlern, Serien, Rekord, Statistik und sofortiger Neustart
- Onboarding im Spielfluss, sieben unterscheidbare Tonsignale und optionales haptisches Feedback
- Versionierte und validierte lokale Speicherung sowie Offline-Service-Worker
- Einheitliches SVG-Icon-System ohne Emoji- oder plattformabhängige Textsymbole
- Einstellung für reduzierte Spieleffekte; zusätzlich wird die Betriebssystem-Einstellung `prefers-reduced-motion` respektiert

## Audio und Haptik

Der Web-Audio-Kontext wird direkt durch die erste Berührung des Spielen-Buttons erzeugt und entsperrt. Nach einer Rückkehr aus dem Hintergrund versucht die App den Kontext über `visibilitychange` und `pageshow` zu reaktivieren; die nächste Schaltflächenberührung ist ein zusätzlicher, direkter Entsperrpunkt für die Einschränkungen von iOS Safari.

Web-Haptik ist auf iPhone und iPad eingeschränkt: Safari unterstützt `navigator.vibrate` derzeit nicht zuverlässig. Das Spiel bleibt deshalb ohne Vibration vollständig verständlich. `src/haptics.js` verwendet im Web eine optionale Vibration und erkennt bereits `Capacitor.Plugins.Haptics`; in einer späteren nativen Capacitor-Hülle kann dadurch echte iOS-/Android-Haptik ohne Umbau der Spiellogik eingesetzt werden.

## Store-Vorbereitung

Der aktuelle Build ist eine installierbare PWA und benötigt keine Server oder Nutzerdaten. Für native App-Store-Pakete ist **Capacitor** als dünne Hülle um den Web-Build vorgesehen. Dafür werden lokal Node.js, Android Studio beziehungsweise auf macOS Xcode benötigt. Anschließend sind je Plattform App-ID, native PNG-Icons und Splash-Screens, Capacitor-Haptik, Signing und Store-Metadaten zu ergänzen.

Marc muss selbst erledigen: Apple-/Google-Developer-Konten eröffnen, Verträge und Gebühren bestätigen, Zertifikate sowie Signing verwalten, auf echten Geräten prüfen und Builds in App Store Connect beziehungsweise Play Console hochladen. Benötigt werden aktuelle iPhone- und Android-Hochformat-Screenshots von Start, Pfadanzeige, Eingabe, Erfolg und Spielende.

Nach aktuellem Funktionsumfang werden keine personenbezogenen Daten erhoben, kein Tracking eingesetzt und keine Daten übertragen. Die endgültigen Datenschutzangaben müssen unmittelbar vor der Veröffentlichung trotzdem erneut geprüft werden.

## Bekannte technische Einschränkungen

- Die kurzen Tonsignale werden zur Laufzeit mit Web Audio erzeugt. Finale Marken-Audioassets können später ergänzt werden.
- Web-Haptik ist auf iOS eingeschränkt; zuverlässige native Haptik benötigt die vorbereitete Capacitor-Integration.
- Store-Signing, native Binärdateien und reale iPhone-/Android-Gerätetests sind außerhalb dieses Browser-Repositories noch offen.
