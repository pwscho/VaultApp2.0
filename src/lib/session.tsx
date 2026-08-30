"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { CLIPBOARD_CLEAR_MS, VaultError, type VaultEntry } from "@/lib/types"
import { validateNewPassword } from "@/lib/password"
import {
  clearVaultStore,
  downloadVaultFile,
  readBlob,
  readIdleMs,
  readVaultFile,
  restoreBackup,
  writeIdleMs,
  writeVaultAtomic,
} from "@/lib/storage"
import {
  createVaultFile,
  parseFile,
  rotatePassword,
  saveWithDek,
  unlockVaultFile,
  type SessionSecrets,
} from "@/lib/vault-crypto"

type Status = "loading" | "locked" | "unlocked"

type SessionValue = {
  status: Status
  hasVault: boolean
  hasBackup: boolean
  entries: VaultEntry[]
  idleMs: number
  error: string | null
  busy: boolean
  createVault: (password: string, confirm: string, replace?: boolean) => Promise<void>
  unlock: (password: string) => Promise<void>
  lock: () => void
  saveEntries: (entries: VaultEntry[]) => Promise<void>
  changePassword: (
    current: string,
    next: string,
    confirm: string
  ) => Promise<void>
  exportVault: () => Promise<void>
  importVault: (file: File) => Promise<void>
  restorePrevious: () => Promise<void>
  destroyVault: () => Promise<void>
  setIdleMs: (ms: number) => void
  touch: () => void
  copySecret: (value: string) => Promise<void>
  clearError: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

let secrets: SessionSecrets | null = null

function messageFor(error: unknown): string {
  if (error instanceof VaultError) return error.message
  if (error instanceof Error) return error.message
  return "Something went wrong."
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading")
  const [hasVault, setHasVault] = useState(false)
  const [hasBackup, setHasBackup] = useState(false)
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [idleMs, setIdleMsState] = useState(readIdleMs)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const lastActivity = useRef(0)

  const refreshFlags = useCallback(async () => {
    const current = await readBlob("current")
    const backup = await readBlob("backup")
    setHasVault(Boolean(current))
    setHasBackup(Boolean(backup))
    return current
  }, [])

  const lock = useCallback(() => {
    secrets = null
    setEntries([])
    setStatus("locked")
  }, [])

  const touch = useCallback(() => {
    lastActivity.current = Date.now()
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const current = await readBlob("current")
        const backup = await readBlob("backup")
        if (cancelled) return
        setHasVault(Boolean(current))
        setHasBackup(Boolean(backup))
        setStatus("locked")
      } catch (err) {
        if (cancelled) return
        setError(messageFor(err))
        setStatus("locked")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onHide = () => {
      if (document.hidden && secrets) lock()
    }
    const onActivity = () => {
      if (secrets) lastActivity.current = Date.now()
    }
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("pointerdown", onActivity)
    window.addEventListener("keydown", onActivity)
    const timer = window.setInterval(() => {
      if (secrets && Date.now() - lastActivity.current >= idleMs) {
        lock()
      }
    }, 1000)
    return () => {
      document.removeEventListener("visibilitychange", onHide)
      window.removeEventListener("pointerdown", onActivity)
      window.removeEventListener("keydown", onActivity)
      window.clearInterval(timer)
    }
  }, [idleMs, lock])

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
      touch()
    } catch (err) {
      setError(messageFor(err))
      throw err
    } finally {
      setBusy(false)
    }
  }, [touch])

  const createVault = useCallback(
    async (password: string, confirm: string, replace = false) => {
      await run(async () => {
        validateNewPassword(password, confirm)
        const existing = await readBlob("current")
        if (existing && !replace) {
          throw new VaultError(
            "exists",
            "A vault already exists. Export it first, or type REPLACE to keep a backup and start over."
          )
        }
        const created = await createVaultFile(password, { entries: [] })
        await writeVaultAtomic(created.file)
        secrets = created
        setEntries([])
        await refreshFlags()
        setStatus("unlocked")
      })
    },
    [refreshFlags, run]
  )

  const unlock = useCallback(
    async (password: string) => {
      await run(async () => {
        if (!password || password.trim().length === 0) {
          throw new VaultError(
            "weak-password",
            "Enter the master password. Empty passwords are not accepted."
          )
        }
        const current = await readBlob("current")
        if (!current) {
          throw new VaultError(
            "missing",
            "There is no vault on this device yet. Create one first."
          )
        }
        const unlocked = await unlockVaultFile(password, current)
        secrets = unlocked.secrets
        setEntries(unlocked.payload.entries)
        setStatus("unlocked")
      })
    },
    [run]
  )

  const saveEntries = useCallback(async (next: VaultEntry[]) => {
    if (!secrets) {
      throw new VaultError("missing", "The vault is locked.")
    }
    await run(async () => {
      const file = await saveWithDek(secrets!.dek, secrets!.file, {
        entries: next,
      })
      await writeVaultAtomic(file)
      secrets = { dek: secrets!.dek, file }
      setEntries(next)
      await refreshFlags()
    })
  }, [refreshFlags, run])

  const changePassword = useCallback(
    async (current: string, next: string, confirm: string) => {
      await run(async () => {
        validateNewPassword(next, confirm)
        if (!current || current.trim().length === 0) {
          throw new VaultError(
            "weak-password",
            "Type the current master password. It is checked against the file, not memory."
          )
        }
        const stored = await readBlob("current")
        if (!stored) throw new VaultError("missing", "There is no vault to re-encrypt.")
        const rotated = await rotatePassword(current, next, stored, {
          entries,
        })
        await writeVaultAtomic(rotated.file)
        secrets = rotated
        await refreshFlags()
      })
    },
    [entries, refreshFlags, run]
  )

  const exportVault = useCallback(async () => {
    const current = secrets?.file ?? (await readBlob("current"))
    if (!current) {
      setError("There is no vault file to export.")
      return
    }
    downloadVaultFile(current)
  }, [])

  const importVault = useCallback(
    async (file: File) => {
      await run(async () => {
        const bytes = await readVaultFile(file)
        parseFile(bytes)
        await writeVaultAtomic(bytes)
        secrets = null
        setEntries([])
        await refreshFlags()
        setStatus("locked")
      })
    },
    [refreshFlags, run]
  )

  const restorePrevious = useCallback(async () => {
    await run(async () => {
      const restored = await restoreBackup()
      if (!restored) {
        throw new VaultError("missing", "There is no backup to restore.")
      }
      secrets = null
      setEntries([])
      await refreshFlags()
      setStatus("locked")
    })
  }, [refreshFlags, run])

  const destroyVault = useCallback(async () => {
    await run(async () => {
      await clearVaultStore()
      secrets = null
      setEntries([])
      await refreshFlags()
      setStatus("locked")
    })
  }, [refreshFlags, run])

  const setIdle = useCallback((ms: number) => {
    writeIdleMs(ms)
    setIdleMsState(ms)
    touch()
  }, [touch])

  const copySecret = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value)
    window.setTimeout(async () => {
      try {
        const now = await navigator.clipboard.readText()
        if (now === value) await navigator.clipboard.writeText("")
      } catch {
        /* clipboard read can be denied */
      }
    }, CLIPBOARD_CLEAR_MS)
  }, [])

  const value = useMemo<SessionValue>(
    () => ({
      status,
      hasVault,
      hasBackup,
      entries,
      idleMs,
      error,
      busy,
      createVault,
      unlock,
      lock,
      saveEntries,
      changePassword,
      exportVault,
      importVault,
      restorePrevious,
      destroyVault,
      setIdleMs: setIdle,
      touch,
      copySecret,
      clearError: () => setError(null),
    }),
    [
      status,
      hasVault,
      hasBackup,
      entries,
      idleMs,
      error,
      busy,
      createVault,
      unlock,
      lock,
      saveEntries,
      changePassword,
      exportVault,
      importVault,
      restorePrevious,
      destroyVault,
      setIdle,
      touch,
      copySecret,
    ]
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider")
  }
  return value
}
