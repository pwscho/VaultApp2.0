import {
  asSource,
  bytesEqual,
  concatBytes,
  decodeText,
  encodeText,
  randomBytes,
  readUint32BE,
  wipeBytes,
  writeUint32BE,
} from "@/lib/bytes"
import { VaultError, type VaultPayload } from "@/lib/types"

export const MAGIC = encodeText("VLT2")
export const VERSION = 1
export const KDF_PBKDF2_SHA256 = 1
export const ITERATIONS = 600_000
const SALT_LEN = 16
const IV_LEN = 12
const KEY_LEN = 32
const TAG_LEN = 16
const WRAP_LEN = KEY_LEN + TAG_LEN
const HEADER_LEN = MAGIC.length + 1 + 1 + 4 + SALT_LEN
const PREFIX_LEN = HEADER_LEN + IV_LEN + WRAP_LEN + IV_LEN
const MIN_LEN = PREFIX_LEN + TAG_LEN

export type SessionSecrets = {
  dek: CryptoKey
  file: Uint8Array
}

function headerAad(file: Uint8Array): Uint8Array {
  return file.slice(0, HEADER_LEN)
}

function payloadAad(file: Uint8Array): Uint8Array {
  return file.slice(0, HEADER_LEN + IV_LEN + WRAP_LEN)
}

async function deriveKek(
  passwordBytes: Uint8Array,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    asSource(passwordBytes),
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asSource(salt),
      iterations,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  )
}

async function createDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  )
}

function gcmParams(iv: Uint8Array, aad: Uint8Array): AesGcmParams {
  return {
    name: "AES-GCM",
    iv: asSource(iv),
    additionalData: asSource(aad),
    tagLength: TAG_LEN * 8,
  }
}

export async function createVaultFile(
  password: string,
  payload: VaultPayload
): Promise<SessionSecrets> {
  const passwordBytes = encodeText(password)
  const salt = randomBytes(SALT_LEN)
  const kekIv = randomBytes(IV_LEN)
  const payloadIv = randomBytes(IV_LEN)
  const iterations = writeUint32BE(ITERATIONS)
  const header = concatBytes(
    MAGIC,
    new Uint8Array([VERSION, KDF_PBKDF2_SHA256]),
    iterations,
    salt
  )

  try {
    const kek = await deriveKek(passwordBytes, salt, ITERATIONS)
    const dek = await createDek()
    const wrapped = new Uint8Array(
      await crypto.subtle.wrapKey("raw", dek, kek, gcmParams(kekIv, header))
    )
    const plaintext = encodeText(JSON.stringify(toStorageDto(payload)))
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        gcmParams(payloadIv, concatBytes(header, kekIv, wrapped)),
        dek,
        asSource(plaintext)
      )
    )
    wipeBytes(plaintext)
    const file = concatBytes(header, kekIv, wrapped, payloadIv, ciphertext)
    return { dek, file }
  } finally {
    wipeBytes(passwordBytes)
  }
}

export async function unlockVaultFile(
  password: string,
  file: Uint8Array
): Promise<{ secrets: SessionSecrets; payload: VaultPayload }> {
  const parsed = parseFile(file)
  const passwordBytes = encodeText(password)
  try {
    const kek = await deriveKek(passwordBytes, parsed.salt, parsed.iterations)
    let dek: CryptoKey
    try {
      dek = await crypto.subtle.unwrapKey(
        "raw",
        asSource(parsed.wrappedDek),
        kek,
        gcmParams(parsed.kekIv, parsed.header),
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      )
    } catch {
      throw new VaultError("incorrect-password", "Incorrect password.")
    }

    let plaintext: Uint8Array
    try {
      plaintext = new Uint8Array(
        await crypto.subtle.decrypt(
          gcmParams(parsed.payloadIv, parsed.payloadAad),
          dek,
          asSource(parsed.ciphertext)
        )
      )
    } catch {
      throw new VaultError(
        "corrupted",
        "The password is correct, but the vault contents are damaged."
      )
    }

    try {
      const parsedPayload = fromStorageDto(JSON.parse(decodeText(plaintext)))
      return { secrets: { dek, file }, payload: parsedPayload }
    } finally {
      wipeBytes(plaintext)
    }
  } finally {
    wipeBytes(passwordBytes)
  }
}

export async function saveWithDek(
  dek: CryptoKey,
  currentFile: Uint8Array,
  payload: VaultPayload
): Promise<Uint8Array> {
  const parsed = parseFile(currentFile)
  const payloadIv = randomBytes(IV_LEN)
  const plaintext = encodeText(JSON.stringify(toStorageDto(payload)))
  try {
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        gcmParams(payloadIv, parsed.payloadAad),
        dek,
        asSource(plaintext)
      )
    )
    return concatBytes(
      parsed.header,
      parsed.kekIv,
      parsed.wrappedDek,
      payloadIv,
      ciphertext
    )
  } finally {
    wipeBytes(plaintext)
  }
}

export async function rotatePassword(
  currentPassword: string,
  newPassword: string,
  currentFile: Uint8Array,
  payload: VaultPayload
): Promise<SessionSecrets> {
  const unlocked = await unlockVaultFile(currentPassword, currentFile)
  return createVaultFile(newPassword, payload ?? unlocked.payload)
}

export function parseFile(file: Uint8Array) {
  if (file.length < MIN_LEN) {
    throw new VaultError("corrupted", "This file is too short to be a vault.")
  }
  const magic = file.slice(0, MAGIC.length)
  if (!bytesEqual(magic, MAGIC)) {
    throw new VaultError(
      "corrupted",
      "This is not a VaultApp 2.0 file. V1 vault.enc files are not compatible."
    )
  }
  const version = file[4]
  const kdf = file[5]
  if (version !== VERSION) {
    throw new VaultError("unsupported", `Unsupported vault version ${version}.`)
  }
  if (kdf !== KDF_PBKDF2_SHA256) {
    throw new VaultError("unsupported", "Unsupported key derivation method.")
  }
  const iterations = readUint32BE(file, 6)
  if (iterations < 600_000) {
    throw new VaultError("corrupted", "Vault header has an invalid iteration count.")
  }
  const salt = file.slice(10, 10 + SALT_LEN)
  const kekIv = file.slice(HEADER_LEN, HEADER_LEN + IV_LEN)
  const wrappedDek = file.slice(
    HEADER_LEN + IV_LEN,
    HEADER_LEN + IV_LEN + WRAP_LEN
  )
  const payloadIv = file.slice(
    HEADER_LEN + IV_LEN + WRAP_LEN,
    PREFIX_LEN
  )
  const ciphertext = file.slice(PREFIX_LEN)
  return {
    iterations,
    salt,
    kekIv,
    wrappedDek,
    payloadIv,
    ciphertext,
    header: headerAad(file),
    payloadAad: payloadAad(file),
  }
}

type StoredEntry = {
  id: string
  title: string
  username: string
  password: string
  url: string
  notes: string
  createdAt: string
  updatedAt: string
}

function toStorageDto(payload: VaultPayload): { entries: StoredEntry[] } {
  return {
    entries: payload.entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      username: entry.username,
      password: entry.password,
      url: entry.url,
      notes: entry.notes,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
  }
}

function fromStorageDto(value: unknown): VaultPayload {
  if (!value || typeof value !== "object" || !("entries" in value)) {
    throw new VaultError("corrupted", "Vault JSON is missing entries.")
  }
  const entries = (value as { entries: unknown }).entries
  if (!Array.isArray(entries)) {
    throw new VaultError("corrupted", "Vault JSON entries are not a list.")
  }
  return {
    entries: entries.map((raw) => {
      const entry = raw as Partial<StoredEntry>
      return {
        id: String(entry.id ?? crypto.randomUUID()),
        title: String(entry.title ?? ""),
        username: String(entry.username ?? ""),
        password: String(entry.password ?? ""),
        url: String(entry.url ?? ""),
        notes: String(entry.notes ?? ""),
        createdAt: String(entry.createdAt ?? new Date().toISOString()),
        updatedAt: String(entry.updatedAt ?? new Date().toISOString()),
      }
    }),
  }
}

export async function selfTest(): Promise<string> {
  const { file } = await createVaultFile("correct-horse-battery-1", {
    entries: [
      {
        id: "t1",
        title: "Example",
        username: "ada",
        password: "secret",
        url: "https://example.test",
        notes: "",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  })
  await unlockVaultFile("correct-horse-battery-1", file)
  try {
    await unlockVaultFile("wrong-password-1234", file)
    throw new Error("wrong password was accepted")
  } catch (error) {
    if (!(error instanceof VaultError) || error.code !== "incorrect-password") {
      throw error
    }
  }
  return "Round-trip encrypt, decrypt, and reject a wrong password."
}
