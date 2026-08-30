export type VaultEntry = {
  id: string
  title: string
  username: string
  password: string
  url: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type VaultPayload = {
  entries: VaultEntry[]
}

export type VaultErrorCode =
  | "incorrect-password"
  | "corrupted"
  | "missing"
  | "weak-password"
  | "mismatch"
  | "unsupported"
  | "exists"

export class VaultError extends Error {
  code: VaultErrorCode

  constructor(code: VaultErrorCode, message: string) {
    super(message)
    this.name = "VaultError"
    this.code = code
  }
}

export const MIN_PASSWORD_LENGTH = 12
export const DEFAULT_IDLE_MS = 2 * 60 * 1000
export const CLIPBOARD_CLEAR_MS = 20_000
export const REVEAL_MS = 8_000
