import { DEFAULT_IDLE_MS } from "@/lib/types"

const DB_NAME = "vaultapp-v2"
const DB_VERSION = 1
const STORE = "vault"

type StoreKey = "current" | "backup"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    const timeout = window.setTimeout(() => {
      reject(new Error("Vault storage did not open in time."))
    }, 10_000)
    const finish = (work: () => void) => {
      window.clearTimeout(timeout)
      work()
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => finish(() => resolve(request.result))
    request.onerror = () => finish(() => reject(request.error))
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    const request = work(store)
    tx.oncomplete = () => {
      db.close()
      if (request) resolve(request.result)
      else resolve(undefined as T)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
    if (request) {
      request.onerror = () => reject(request.error)
    }
  })
}

export async function readBlob(key: StoreKey): Promise<Uint8Array | null> {
  const value = await withStore<ArrayBuffer | undefined>("readonly", (store) =>
    store.get(key)
  )
  return value ? new Uint8Array(value) : null
}

export async function writeVaultAtomic(next: Uint8Array): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    const current = store.get("current")
    current.onsuccess = () => {
      if (current.result) {
        store.put(current.result, "backup")
      }
      store.put(next.buffer.slice(next.byteOffset, next.byteOffset + next.byteLength), "current")
    }
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function restoreBackup(): Promise<Uint8Array | null> {
  const backup = await readBlob("backup")
  if (!backup) return null
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    const current = store.get("current")
    current.onsuccess = () => {
      if (current.result) store.put(current.result, "backup")
      store.put(
        backup.buffer.slice(backup.byteOffset, backup.byteOffset + backup.byteLength),
        "current"
      )
    }
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
  return backup
}

export async function clearVaultStore(): Promise<void> {
  await withStore("readwrite", (store) => {
    store.delete("current")
    store.delete("backup")
  })
}

export function readIdleMs(): number {
  if (typeof window === "undefined") return DEFAULT_IDLE_MS
  const raw = window.localStorage.getItem("vaultapp-idle-ms")
  const parsed = raw ? Number(raw) : DEFAULT_IDLE_MS
  return Number.isFinite(parsed) && parsed >= 60_000 ? parsed : DEFAULT_IDLE_MS
}

export function writeIdleMs(ms: number) {
  window.localStorage.setItem("vaultapp-idle-ms", String(ms))
}

export function downloadVaultFile(file: Uint8Array) {
  const copy = new Uint8Array(file)
  const blob = new Blob([copy], { type: "application/octet-stream" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "vault.vlt2"
  link.click()
  URL.revokeObjectURL(url)
}

export async function readVaultFile(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer())
}
