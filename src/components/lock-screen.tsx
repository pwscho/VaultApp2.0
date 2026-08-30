"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { FileUp, Loader2, Shield } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordMeter } from "@/components/password-meter"
import { SecretInput } from "@/components/secret-input"
import { useSession } from "@/lib/session"
import { VaultError } from "@/lib/types"

export function LockScreen() {
  const {
    hasVault,
    hasBackup,
    busy,
    error,
    createVault,
    unlock,
    importVault,
    restorePrevious,
    exportVault,
    clearError,
  } = useSession()
  const [mode, setMode] = useState<"unlock" | "create">(
    hasVault ? "unlock" : "create"
  )
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [replaceToken, setReplaceToken] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  async function onUnlock(event: React.FormEvent) {
    event.preventDefault()
    try {
      await unlock(password)
      setPassword("")
    } catch {
      setPassword("")
    }
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault()
    try {
      const replace = hasVault && replaceToken === "REPLACE"
      await createVault(password, confirm, replace)
      setPassword("")
      setConfirm("")
      setReplaceToken("")
    } catch (err) {
      if (err instanceof VaultError && err.code === "exists") {
        return
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:py-16">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Shield className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">VaultApp 2.0</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Local encrypted logins. The master password never leaves this browser,
          and the vault locks the moment you switch away.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {mode === "unlock" ? "Unlock vault" : "Create vault"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mode === "unlock" ? (
            <form className="space-y-4" onSubmit={onUnlock}>
              <div className="space-y-1.5">
                <Label htmlFor="unlock-password">Master password</Label>
                <SecretInput
                  id="unlock-password"
                  value={password}
                  onChange={(event) => {
                    clearError()
                    setPassword(event.target.value)
                  }}
                  placeholder="Your master password"
                />
              </div>
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Could not unlock</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy || !hasVault}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                Unlock
              </Button>
              {!hasVault ? (
                <p className="text-xs text-muted-foreground">
                  No vault is stored in this browser yet.
                </p>
              ) : null}
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onCreate}>
              <div className="space-y-1.5">
                <Label htmlFor="create-password">Master password</Label>
                <SecretInput
                  id="create-password"
                  value={password}
                  onChange={(event) => {
                    clearError()
                    setPassword(event.target.value)
                  }}
                  placeholder="At least 12 characters"
                />
                <PasswordMeter password={password} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-confirm">Confirm password</Label>
                <SecretInput
                  id="create-confirm"
                  value={confirm}
                  onChange={(event) => {
                    clearError()
                    setConfirm(event.target.value)
                  }}
                  placeholder="Type it again"
                />
              </div>
              {hasVault ? (
                <div className="space-y-1.5">
                  <Label htmlFor="replace">Replace existing vault</Label>
                  <Input
                    id="replace"
                    value={replaceToken}
                    onChange={(event) => setReplaceToken(event.target.value)}
                    placeholder='Type REPLACE to keep a backup and start over'
                  />
                </div>
              ) : null}
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Could not create vault</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                Create vault
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 text-sm">
        {hasVault ? (
          <Button
            variant="ghost"
            onClick={() => {
              clearError()
              setMode(mode === "unlock" ? "create" : "unlock")
            }}
          >
            {mode === "unlock"
              ? "Create a new vault instead"
              : "Unlock the existing vault"}
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <FileUp />
          Open encrypted file
        </Button>
        {hasVault ? (
          <Button variant="ghost" onClick={() => exportVault()}>
            Download encrypted backup
          </Button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept=".vlt2,.enc"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (file) {
              try {
                await importVault(file)
                setMode("unlock")
              } catch {
                /* session.error */
              }
            }
          }}
        />
        {hasBackup ? (
          <Button
            variant="ghost"
            onClick={() => restorePrevious().catch(() => undefined)}
          >
            Restore previous vault backup
          </Button>
        ) : null}
        <p className="pt-2 text-center text-xs text-muted-foreground">
          <Link href="/security" className="underline-offset-4 hover:underline">
            How 2.0 addresses the V1 audit
          </Link>
          {" · "}
          <Link href="/audit" className="underline-offset-4 hover:underline">
            Original V1 report
          </Link>
        </p>
      </div>
    </div>
  )
}
