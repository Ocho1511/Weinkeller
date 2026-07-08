# Weinkeller als iOS-App bauen (ganz ohne eigenen Mac)

Das Projekt ist bereits als Capacitor-App eingerichtet (`ios/` Ordner) und hat eine
GitHub-Actions-Pipeline (`.github/workflows/ios-build.yml`), die auf einem Mac-Runner
in der Cloud baut, signiert und automatisch an TestFlight schickt. Du musst nur einmalig
im Browser ein paar Dinge bei Apple einrichten und als "Secrets" in GitHub hinterlegen.

## Voraussetzung

- Apple Developer Program Mitgliedschaft (99 $/Jahr) unter https://developer.apple.com/account
- Ein GitHub-Repository für dieses Projekt (Push nötig, damit die Pipeline läuft)

## Schritt 1: Zertifikat erzeugen (per OpenSSL, kein Mac nötig)

In Git Bash (auf diesem PC):

```bash
openssl genrsa -out ios_distribution.key 2048
openssl req -new -key ios_distribution.key -out ios_distribution.csr -subj "/emailAddress=DEINE_APPLE_ID@example.com, CN=Ocho, C=DE"
```

`ios_distribution.csr` bei Apple hochladen:
1. https://developer.apple.com/account/resources/certificates/add
2. Typ "Apple Distribution" wählen → `ios_distribution.csr` hochladen → herunterladen als `distribution.cer`

Zertifikat in ein .p12 umwandeln (Passwort frei wählbar, merken für später):

```bash
openssl x509 -in distribution.cer -inform DER -out distribution.pem -outform PEM
openssl pkcs12 -export -inkey ios_distribution.key -in distribution.pem -out distribution.p12 -passout pass:DEIN_P12_PASSWORT
base64 -w0 distribution.p12 > distribution.p12.base64
```

## Schritt 2: App-ID registrieren

https://developer.apple.com/account/resources/identifiers/add/bundleId
- Bundle ID: `com.ochos.weinkeller` (exakt so, wie im Projekt konfiguriert)

## Schritt 3: Provisioning Profile erstellen

https://developer.apple.com/account/resources/profiles/add
- Typ: "App Store" (funktioniert für TestFlight und App Store)
- App-ID: `com.ochos.weinkeller`
- Zertifikat: das eben erstellte Distribution-Zertifikat
- Herunterladen als `Weinkeller.mobileprovision`, dann:

```bash
base64 -w0 Weinkeller.mobileprovision > Weinkeller.mobileprovision.base64
```

Notiere dir den **Profile-Namen**, den du beim Erstellen vergeben hast — den brauchst du als `PROVISIONING_PROFILE_NAME`.

## Schritt 4: App Store Connect App anlegen

https://appstoreconnect.apple.com/apps → "+" → Neue App
- Bundle ID: `com.ochos.weinkeller`
- Name: Weinkeller

## Schritt 5: App Store Connect API Key erstellen (für den automatischen Upload)

https://appstoreconnect.apple.com/access/integrations/api
- Key mit Rolle "App Manager" erstellen
- `.p8`-Datei herunterladen (geht nur EINMAL – gut aufbewahren)
- Issuer ID (oben auf der Seite) und Key ID notieren

```bash
base64 -w0 AuthKey_XXXXXXXXXX.p8 > AuthKey.p8.base64
```

## Schritt 6: Team ID finden

https://developer.apple.com/account → oben rechts, 10-stellige Team ID.

## Schritt 7: Secrets in GitHub hinterlegen

Im Repo: Settings → Secrets and variables → Actions → "New repository secret".
Diese anlegen:

| Secret Name | Wert |
|---|---|
| `BUILD_CERTIFICATE_BASE64` | Inhalt von `distribution.p12.base64` |
| `P12_PASSWORD` | Das Passwort aus Schritt 1 |
| `BUILD_PROVISION_PROFILE_BASE64` | Inhalt von `Weinkeller.mobileprovision.base64` |
| `PROVISIONING_PROFILE_NAME` | Profile-Name aus Schritt 3 |
| `KEYCHAIN_PASSWORD` | Ein beliebiges neues Passwort (nur für die CI-Keychain) |
| `APPLE_TEAM_ID` | Team ID aus Schritt 6 |
| `APPSTORE_ISSUER_ID` | Issuer ID aus Schritt 5 |
| `APPSTORE_KEY_ID` | Key ID aus Schritt 5 |
| `APPSTORE_PRIVATE_KEY` | Inhalt von `AuthKey.p8.base64` |

## Schritt 8: Pushen und bauen lassen

```bash
git push origin main
```

Die Pipeline läuft automatisch (siehe "Actions"-Tab auf GitHub). Nach ein paar Minuten
erscheint der Build in App Store Connect unter "TestFlight". Auf dem iPhone die
**TestFlight-App** installieren, dich als Tester einladen (App Store Connect → TestFlight →
Interne Tester → deine Apple-ID hinzufügen) und die App darüber installieren.

## Lokal testen ohne all das

Vor dem ganzen Signier-Aufwand kannst du die Web-App jederzeit direkt im iPhone-Browser
testen: `www/index.html` irgendwo hosten (z.B. GitHub Pages) und in Safari öffnen — das
Verhalten ist identisch zur späteren App, nur ohne eigenes App-Icon/TestFlight.

## Danach: Code ändern

Wenn du `index.html` änderst, auch `www/index.html` aktualisieren (oder ein Build-Skript
einrichten, das das automatisch macht) und `npx cap sync ios` laufen lassen, bevor du
committest.
