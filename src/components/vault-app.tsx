"use client"

import Link from "next/link"
import { Lock, Settings2, Shield } from "lucide-react"
import { LockScreen } from "@/components/lock-screen"
import { SettingsDialog } from "@/components/settings-dialog"
import { VaultView } from "@/components/vault-view"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/session"
import { useState } from "react"

export function VaultApp() {
  const { status, lock, entries } = useSession()
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-20 text-sm text-muted-foreground">
        Looking for a vault on this device…
      </div>
    )
  }

  if (status !== "unlocked") {
    return <LockScreen />
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Shield className="size-4" />
            VaultApp 2.0
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Your vault</h1>
          <p className="text-sm text-muted-foreground">
            {entries.length} {entries.length === 1 ? "entry" : "entries"} ·
            encrypted on this device
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/security" />}
          >
            Security
          </Button>
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings2 />
            Settings
          </Button>
          <Button variant="default" onClick={lock}>
            <Lock />
            Lock now
          </Button>
        </div>
      </header>
      <VaultView />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
