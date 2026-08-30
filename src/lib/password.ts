import { MIN_PASSWORD_LENGTH, VaultError } from "@/lib/types"
import { randomBytes, wipeBytes } from "@/lib/bytes"

const LOWER = "abcdefghijkmnopqrstuvwxyz"
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"
const DIGITS = "23456789"
const SYMBOLS = "!@#$%^&*_-+=?"
const AMBIGUOUS = "0O1lI"

export function validateNewPassword(password: string, confirm: string) {
  if (password.trim().length === 0 || password !== password.trim()) {
    throw new VaultError(
      "weak-password",
      "The master password cannot be empty or only spaces."
    )
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new VaultError(
      "weak-password",
      `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    )
  }
  if (password !== confirm) {
    throw new VaultError("mismatch", "The two passwords do not match.")
  }
}

export function passwordScore(password: string): {
  score: number
  label: string
  hints: string[]
} {
  const hints: string[] = []
  if (!password) {
    return { score: 0, label: "Empty", hints: ["Choose a password."] }
  }

  let score = 0
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1
  else hints.push(`At least ${MIN_PASSWORD_LENGTH} characters.`)
  if (password.length >= 16) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  else hints.push("Mix upper and lower case.")
  if (/\d/.test(password)) score += 1
  else hints.push("Add a number.")
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  else hints.push("Add a symbol.")
  if (password.length < MIN_PASSWORD_LENGTH) score = Math.min(score, 1)
  if (/(.)\1{3,}/.test(password) || /password|qwerty|12345/i.test(password)) {
    score = Math.min(score, 2)
    hints.push("Avoid repeats and common words.")
  }

  const label =
    score <= 1 ? "Too weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong"
  return { score: Math.min(score, 4), label, hints }
}

export function generatePassword(length = 20): string {
  const alphabet = LOWER + UPPER + DIGITS + SYMBOLS
  const bytes = randomBytes(length + 16)
  const chars: string[] = [
    pick(LOWER, bytes[0]),
    pick(UPPER, bytes[1]),
    pick(DIGITS, bytes[2]),
    pick(SYMBOLS, bytes[3]),
  ]
  for (let i = chars.length; i < length; i += 1) {
    chars.push(alphabet[bytes[i] % alphabet.length])
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = bytes[i + 8] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  wipeBytes(bytes)
  return chars.join("").replace(new RegExp(`[${AMBIGUOUS}]`, "g"), "x")
}

function pick(alphabet: string, byte: number) {
  return alphabet[byte % alphabet.length]
}
