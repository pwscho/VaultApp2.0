# VaultApp security audit

**Target:** [pwscho/VaultApp](https://github.com/pwscho/VaultApp)  
**Commit:** `233e89689f2a2423dcfe1b5f8b5679bd977ea89a` (13 March 2026)  
**Reviewed:** 30 August 2026  
**Method:** Source-assisted static review. No dynamic instrumentation and no exploit proofs of concept.  
**Overall risk:** High

The vault file format uses real authenticated encryption (AES-256-GCM, PBKDF2-SHA256, random salt and IV). The product around that format treats the master password as optional, prints every secret on screen, and never locks the session. That combination is not safe for real credentials.

This environment cannot run the MAUI Windows or mobile shells, so this is not a penetration-test report.

## Counts

| Severity | Count |
| --- | --- |
| Critical | 2 |
| High | 6 |
| Medium | 7 |
| Low | 4 |
| **Total** | **19** |

## What holds up

- AES-256-GCM with a 96-bit nonce and a 128-bit tag. A wrong password fails closed.
- Fresh salt and IV on every save, from `RandomNumberGenerator`.
- PBKDF2 is constructed with SHA-256, not the old SHA-1 default.
- Unlock and change-password fields set `IsPassword="True"`.
- No application-level `HttpClient`, telemetry, or vault upload.
- The design is local-file-only. There is no server to breach.

## Threat model

| Threat | Status |
| --- | --- |
| Stolen `vault.enc` | Intended threat. Broken if the password is empty or short; KDF is cheaper than current guidance. |
| Someone looking at the screen | Not defended. The main list shows every password. |
| Unlocked, unattended device | Not defended. No idle or background lock. |
| Malware on the same account | Out of scope, correctly. Do not claim otherwise. |
| Remote network attacker | No server or sync. Strongest part of the design. |

## Findings

### C-01 — Empty master password is accepted when creating a vault (Critical)

**CWE-521** · `Pages/UnlockPage.xaml.cs`, `VaultService.DeriveKey`

Create New Vault writes `vault.enc` using whatever is in the password field, including nothing. The comment says so: “Save it (empty password allowed).” `DeriveKey` also substitutes `null` with `string.Empty`.

Anyone who can read the file can decrypt it. There is no secret.

**Fix:** Refuse empty and whitespace-only passwords on create, unlock, and change-password. Require a confirmation field on create. Do not coerce null to empty inside the KDF.

### C-02 — Every stored password is shown in cleartext in the list (Critical)

**CWE-319** · `Pages/MainPage.xaml`

The collection view binds `Password` to a `Label` in display mode. Edit mode uses a plain `Entry` without `IsPassword`. Opening the vault reveals every secret at once.

Shoulder surfing, screenshots, screen recordings, and accessibility services can read the entire vault.

**Fix:** Mask secrets by default. Reveal one field at a time. Prefer copy-to-clipboard with a short lifetime.

### H-01 — PBKDF2 iteration count is below current guidance (High)

**CWE-916** · `Core/VaultService.cs`

`Iterations = 100_000` for PBKDF2-HMAC-SHA256. Current OWASP guidance for that construction is 600,000 iterations. The vault file is a portable offline target, and there is no format version for a later upgrade.

**Fix:** Raise the count (or switch to Argon2id) and add a version byte so old files can be migrated on the next successful unlock.

### H-02 — Master password and decrypted vault travel through Shell navigation (High)

**CWE-312** · `UnlockPage.xaml.cs`, `MainPage.xaml.cs`

Unlock passes `VaultData`, `Password`, and `VaultPath` as Shell query properties. `MainPage` keeps the master password on a public `string` for the rest of the session.

The password is an immutable managed string. Navigation state, crash dumps, and later logging can recover it.

**Fix:** Hold a derived session key in a service. Do not pass secrets through navigation dictionaries. Zero key material after each save.

### H-03 — No auto-lock, idle timeout, or lock-on-background (High)

**CWE-613** · `App.xaml.cs`, `MainPage.xaml.cs`

After unlock the vault stays open until the process exits. There is no idle timer and no lifecycle handler that returns to `UnlockPage`.

**Fix:** Lock after a short idle period and whenever the app backgrounds. Drop `VaultData` and the session key.

### H-04 — No screenshot or recent-apps protection (High)

**CWE-200** · `MainActivity.cs`, iOS `Info.plist`, `MainPage.xaml`

Android never sets `FLAG_SECURE`. iOS has no app-switcher cover. Combined with C-02, the OS will snapshot a screen full of passwords.

**Fix:** Set `FLAG_SECURE` while unlocked. Obscure the window on background. Still mask the fields.

### H-05 — Key and plaintext buffers are never wiped (High)

**CWE-316** · `Core/VaultService.cs`

Key, plaintext JSON, and related arrays are left for garbage collection. There is no `CryptographicOperations.ZeroMemory` in a `finally` block.

**Fix:** Wipe key and plaintext buffers after use. Prefer UTF-8 bytes over `System.String` for the password.

### H-06 — Android backup is enabled for app data (High)

**CWE-530** · `AndroidManifest.xml`, `VaultPaths.cs`

The default vault lives under `FileSystem.AppDataDirectory` and the manifest sets `android:allowBackup="true"`. Auto Backup can copy `vault.enc` into a cloud archive.

**Fix:** Set `allowBackup="false"`. If backup is a feature, make it an explicit encrypted export.

### M-01 — Unused INTERNET permission on a local vault (Medium)

**CWE-250** · `AndroidManifest.xml`

`INTERNET` and `ACCESS_NETWORK_STATE` are requested. No application code opens a network client.

**Fix:** Remove both permissions until a real network feature exists.

### M-02 — No password policy or confirmation on vault create (Medium)

**CWE-521** · `UnlockPage.xaml.cs`, `ChangePasswordDialog.xaml.cs`

Create never asks the user to type the password twice. Change Password rejects an empty new password and nothing else.

**Fix:** Require confirmation. Enforce a minimum length and a strength meter.

### M-03 — Change-password verifies the in-memory string, not the file (Medium)

**CWE-287** · `ChangePasswordDialog.xaml.cs`

The dialog compares the typed current password to the string held on `MainPage`. If that string is empty, the check is skipped. It never re-decrypts `vault.enc`.

**Fix:** Always re-open the file with the typed current password before rewriting it.

### M-04 — Vault writes are not atomic (Medium)

**CWE-459** · `VaultService.SaveVault`

`File.WriteAllBytes` writes the live path. A crash or full disk leaves a truncated file and the previous ciphertext is already gone.

**Fix:** Write a temp file, flush, then replace atomically. Keep `vault.enc.bak`.

### M-05 — File format has no version; GCM constructor is obsolete (Medium)

`Core/VaultService.cs`

On-disk layout is `[salt 16][iv 12][ciphertext||tag 16]` with no version or AAD. `new AesGcm(key)` does not take an explicit tag size.

**Fix:** Prefix a version byte. Pass version and salt as GCM AAD. Use `new AesGcm(key, TagLength)`.

### M-06 — MainPage is a first-class Shell route next to Unlock (Medium)

**CWE-425** · `AppShell.xaml`

Both `unlock` and `main` are sibling `ShellContent` routes. `MainPage` can be constructed without a successful `LoadVault`.

**Fix:** Push `MainPage` only after unlock. On lock, pop it and drop the instance.

### M-07 — Create New Vault can overwrite `vault.enc` without opening it (Medium)

`UnlockPage.xaml.cs`

An existing `vault.enc` can be replaced with an empty vault under whatever is currently in the unlock field. The old password is never checked.

**Fix:** Default to a unique filename. If overwrite is allowed, require the current password and keep a backup.

### L-01 — Unlock treats every failure as a wrong password (Low)

`UnlockPage.xaml.cs`, `VaultService.LoadVault`

A missing file returns an empty `VaultData`, so Unlock on a bad path silently creates a blank vault on the next save. Other errors all say “Incorrect password.”

**Fix:** If the file is missing, say so. Do not create a vault as a side effect of Unlock.

### L-02 — Password compare on change is not constant-time (Low)

`ChangePasswordDialog.xaml.cs` uses `current != _currentPassword`. Re-decrypt the file instead.

### L-03 — Default template identity and full-trust Windows package (Low)

`ApplicationId` is still `com.companyname.vaultapp`. The Windows package requests `runFullTrust` and is unpackaged.

### L-04 — UI flags are serialized into the encrypted JSON (Low)

`IsEditing` and `IsSelected` are public properties, so they go into the ciphertext. A vault saved mid-edit can reopen with the password field visible.

## Suggested fix order

1. Block empty passwords on create, unlock, and change-password. Add a confirmation field on create.
2. Mask secrets in the list. Reveal one value at a time. Copy-to-clipboard with a 15–30s clear.
3. Raise PBKDF2 to at least 600,000 iterations (or switch to Argon2id) and add a file version.
4. Add idle auto-lock and lock-on-background. Drop the session key when locked.
5. Stop passing the master password through Shell query properties.
6. Wipe key and plaintext buffers. Write vault files atomically with a `.bak`.
7. Disable Android Auto Backup. Remove unused INTERNET permissions.
8. Set `FLAG_SECURE` / app-switcher cover. Do not serialize `IsEditing` into the vault JSON.

## Out of scope

- Runtime testing on Windows, Android, or iOS
- Dependency CVE scanning of the MAUI workload
- Side-channel analysis of PBKDF2 or AES-GCM on device
- Claims about malware on the same OS account

This review is not a certification and is not a substitute for an independent cryptography audit before storing real secrets.
