# Fastlane setup

## Required GitHub Secrets

Go to github.com/mehakmit/odyssey → Settings → Secrets → Actions → New secret:

| Secret | Where to get it |
|---|---|
| `ASC_KEY_ID` | App Store Connect → Users & Access → Keys → Key ID |
| `ASC_ISSUER_ID` | Same page → Issuer ID (top of Keys page) |
| `ASC_PRIVATE_KEY` | Download the .p8 file contents (copy/paste the whole file including -----BEGIN PRIVATE KEY-----) |

## App Store Connect setup (one-time)

1. Go to appstoreconnect.apple.com → Apps → New App
2. Platform: iOS
3. Bundle ID: app.odyssey (register it first at developer.apple.com → Identifiers)
4. SKU: odyssey

## How builds work

Every push to `main` triggers the GitHub Actions workflow which:
1. Builds the web app (Vite)
2. Syncs to the iOS Capacitor project
3. Creates/fetches the distribution certificate and provisioning profile via the ASC API
4. Builds the IPA
5. Uploads to TestFlight

Build numbers increment automatically using the GitHub run number.
