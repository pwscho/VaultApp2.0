# VaultApp 2.0

A local-only password vault that closes the findings from the [V1 audit](./SECURITY_AUDIT.md) of [pwscho/VaultApp](https://github.com/pwscho/VaultApp).

Nothing is uploaded. The master password is used once to unwrap a vault key, then the password bytes are wiped. Secrets stay masked, the tab locks when you leave it, and the file on disk is AES-256-GCM with PBKDF2-SHA256 at 600,000 iterations.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147).

```bash
npm run build
```

`npm run build` writes a static site to `out/` (no Node server required at runtime).

## Android APK (no web server)

A debug APK is in [`releases/VaultApp-2.0-android-debug.apk`](./releases/VaultApp-2.0-android-debug.apk). On GitHub, open that file and click **Download raw file**.

On the phone:

1. Copy the APK to the device (USB, Drive, or the GitHub download).
2. Open it and allow **Install unknown apps** for that source if Android asks.
3. Launch **VaultApp 2.0**. The vault stays in the app’s local storage. There is no server.

This build is **debug-signed** (fine for personal sideload, not for Play Store). Recents/screenshots are blocked with `FLAG_SECURE`. Android backup is off.

To rebuild after changing the web app (needs the Android SDK):

```bash
npm run android:apk
```

The new file is `android/app/build/outputs/apk/debug/app-debug.apk`.

## iOS (needs a Mac)

This Linux environment cannot compile an `.ipa`. Apple’s toolchain (Xcode) only runs on macOS. The Xcode project is in [`ios/`](./ios/) so you can build on a Mac and install to an iPhone.

On a Mac with Xcode 16+ and CocoaPods/SPM available:

```bash
git clone https://github.com/pwscho/VaultApp2.0.git
cd VaultApp2.0
npm install
npm run ios:prepare
npx cap open ios
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities**.
2. Choose your Team (a free Apple ID works for your own device; App Store needs a paid developer account).
3. Connect the iPhone, pick it as the run destination, and click Run.
4. On the phone, trust the developer under **Settings → General → VPN & Device Management**.

The app switcher is covered with a blank view so vault contents are not snapshotted. Encryption export compliance is declared in `Info.plist` (`ITSAppUsesNonExemptEncryption`).

There is no prebuilt iOS file in `releases/` because it cannot be signed here.

## Windows desktop (no web server)

A portable x64 build is in [`releases/VaultApp-2.0-windows-portable-x64.exe`](./releases/VaultApp-2.0-windows-portable-x64.exe). On GitHub, open that file and click **Download raw file**.

On Windows:

1. Download the `.exe` (or copy it from a USB drive).
2. Run **VaultApp 2.0**. Windows SmartScreen may warn because the binary is unsigned — choose **More info → Run anyway** for personal use.
3. The vault stays in the app's local storage. There is no server.

This is a **portable** build (no installer). You can move the `.exe` anywhere; it stores data under your Windows user profile like any Electron app.

The desktop app uses the same lock-on-idle and lock-when-hidden behavior as the browser build. To rebuild after changing the web app:

```bash
npm run windows:release
```

The new portable file is `electron/dist/VaultApp-2.0-windows-portable-x64.exe`. An NSIS installer needs Wine on Linux or a Windows machine to produce.

## What you can do

- Create a vault with a confirmed master password (12+ characters)
- Unlock, add, edit, and delete logins
- Reveal one secret at a time (auto-hides) or copy it (clipboard clears after 20s)
- Generate passwords
- Change the master password (re-checks the **file**, not memory)
- Export / import `vault.vlt2`
- Restore the previous file after a save or a replace
- Lock now, lock on idle, lock when the tab is hidden

## Pages

| Path | What it is |
| --- | --- |
| `/` | The vault |
| `/security` | Each V1 finding and the 2.0 fix |
| `/audit` | The original V1 static review |

## Crypto

`VLT2` files are:

`magic | version | kdf | iterations | salt | wrap IV | wrapped DEK | payload IV | payload`

Both wrapped key and payload use AES-256-GCM with a 128-bit tag and AAD bound to the header. The KDF is PBKDF2-HMAC-SHA256, 600,000 iterations, 16-byte random salt.

V1 `vault.enc` files are not compatible — they allowed empty passwords and had no version field.

## What this is not

This is a browser app, not a rewritten .NET MAUI binary. It implements the same job (a local encrypted credential vault) with the remediations from the V1 review. It is not a certified password manager and does not defend against malware running as you.
