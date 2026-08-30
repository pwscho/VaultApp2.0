import { findings } from "@/lib/audit"

export const v2Fixes: Record<string, string> = {
  "C-01":
    "Create, unlock, and change-password all reject empty or whitespace-only master passwords. Create requires a matching confirmation.",
  "C-02":
    "Secrets render as dots. Only one field can be revealed at a time, and it hides again after 8 seconds. Copy is the default action.",
  "H-01":
    "PBKDF2-SHA256 now uses 600,000 iterations. The file header stores the count so a later version can raise it again.",
  "H-02":
    "The master password never enters React state or the URL. Unlock derives a vault key (DEK), then the password bytes are wiped. Saves use the DEK only.",
  "H-03":
    "The vault locks after idle time (default 2 minutes) and the moment this tab is hidden.",
  "H-04":
    "Hiding the tab locks immediately, so the app-switcher snapshot is the lock screen rather than a list of secrets. Fields stay masked in the DOM unless revealed.",
  "H-05":
    "Password bytes and JSON plaintext are overwritten after each cryptographic operation. The DEK is dropped on lock.",
  "H-06":
    "Only the ciphertext lives in IndexedDB. There is no account, no server, and no cloud backup. Export is an explicit download of the encrypted file.",
  "M-01":
    "Vault bytes never leave the browser. There is no sync API and no analytics.",
  "M-02":
    "New passwords must be at least 12 characters, confirmed, and are scored before the vault is created.",
  "M-03":
    "Change password re-opens the stored file with the typed current password. The in-memory session is not the source of truth.",
  "M-04":
    "Each save writes the new blob and keeps the previous blob as a backup in the same IndexedDB transaction.",
  "M-05":
    "Files start with VLT2, a version byte, KDF id, and iteration count. Both the wrapped DEK and the payload use AES-GCM with explicit 128-bit tags and AAD bound to that header.",
  "M-06":
    "The vault view does not render until a session exists. There is no unlocked deep link.",
  "M-07":
    "Creating a vault when one already exists requires typing REPLACE. The previous file is kept as a backup you can restore.",
  "L-01":
    "Missing, wrong-password, damaged-payload, and not-a-vault-file each have their own error. Unlock never creates a file.",
  "L-02":
    "Password checks go through GCM unwrap of the stored DEK, not a string compare.",
  "L-03":
    "The product identity is VaultApp 2.0. It is a local web app, not a leftover MAUI template.",
  "L-04":
    "The stored JSON is a dedicated DTO: id, title, username, password, url, notes, timestamps. UI flags are not written.",
}

export const v2FixList = findings.map((finding) => ({
  ...finding,
  fix: v2Fixes[finding.id],
}))
