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
npm start
```

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
