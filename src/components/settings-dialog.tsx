"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { PasswordMeter } from "@/components/password-meter"
import { SecretInput } from "@/components/secret-input"
import { useSession } from "@/lib/session"

const idleOptions = [
  { label: "1 minute", ms: 60_000 },
  { label: "2 minutes", ms: 120_000 },
  { label: "5 minutes", ms: 300_000 },
  { label: "10 minutes", ms: 600_000 },
]

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const {
    idleMs,
    setIdleMs,
    changePassword,
    exportVault,
    restorePrevious,
    destroyVault,
    hasBackup,
    busy,
    error,
    clearError,
  } = useSession()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [done, setDone] = useState<string | null>(null)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setCurrent("")
          setNext("")
          setConfirm("")
          setDone(null)
          clearError()
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vault settings</DialogTitle>
          <DialogDescription>
            Changing the master password re-encrypts the stored file after
            checking the password you type against that file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              try {
                await changePassword(current, next, confirm)
                setCurrent("")
                setNext("")
                setConfirm("")
                setDone("Master password updated.")
              } catch {
                setDone(null)
              }
            }}
          >
            <p className="text-sm font-medium">Change master password</p>
            <div className="space-y-1.5">
              <Label htmlFor="current-pass">Current password</Label>
              <SecretInput
                id="current-pass"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next-pass">New password</Label>
              <SecretInput
                id="next-pass"
                value={next}
                onChange={(event) => setNext(event.target.value)}
              />
              <PasswordMeter password={next} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next-confirm">Confirm new password</Label>
              <SecretInput
                id="next-confirm"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              Re-encrypt vault
            </Button>
          </form>

          <div className="space-y-2">
            <Label htmlFor="idle">Lock when idle</Label>
            <select
              id="idle"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={idleMs}
              onChange={(event) => setIdleMs(Number(event.target.value))}
            >
              {idleOptions.map((option) => (
                <option key={option.ms} value={option.ms}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              The vault also locks the instant this tab is hidden.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={exportVault}>
              Download encrypted backup
            </Button>
            {hasBackup ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  restorePrevious()
                    .then(() => onOpenChange(false))
                    .catch(() => undefined)
                }
              >
                Restore previous file
              </Button>
            ) : null}
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (
                  window.confirm(
                    "Delete the encrypted vault from this browser? This cannot be undone unless you have an exported file."
                  )
                ) {
                  destroyVault().then(() => onOpenChange(false))
                }
              }}
            >
              Delete vault from this browser
            </Button>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {done ? (
            <Alert>
              <AlertDescription>{done}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
