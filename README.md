# VaultApp security audit

Interactive report for a static security review of [pwscho/VaultApp](https://github.com/pwscho/VaultApp) at commit `233e896`.

The MAUI app itself is not in this repository. This project is the audit: findings, threat model, and remediations.

**Overall risk: High.** The file format uses AES-256-GCM, but empty master passwords are allowed and every secret is shown in cleartext once the vault is open.

## Findings at a glance

| Severity | Count |
| --- | --- |
| Critical | 2 |
| High | 6 |
| Medium | 7 |
| Low | 4 |

Full write-up: [SECURITY_AUDIT.md](./SECURITY_AUDIT.md).

## Run locally

```bash
npm install
npm run dev
```

The app listens on [http://127.0.0.1:43147](http://127.0.0.1:43147).

```bash
npm run build
npm start
```

## What was reviewed

- `VaultService` key derivation and AES-GCM file layout
- Unlock, create-vault, and change-password flows
- Main-page display of stored secrets
- Android / iOS / Windows platform manifests
- Session lifetime and navigation of the master password

No live MAUI run was possible in this environment. Nothing in the report is an exploit or a proof of concept.
