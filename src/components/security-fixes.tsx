"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, Shield } from "lucide-react"
import { SeverityBadge } from "@/components/severity-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { v2FixList } from "@/lib/v2-fixes"
import { selfTest } from "@/lib/vault-crypto"

export function SecurityFixes() {
  const [test, setTest] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <Shield className="size-4" />
          VaultApp 2.0
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Every V1 finding, closed
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          This build is a new local vault, not a patched MAUI binary. The
          cryptography, session, and UI were written against the audit of{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">pwscho/VaultApp</code>{" "}
          at <code className="rounded bg-muted px-1 py-0.5 text-xs">233e896</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href="/" />}>
            Back to vault
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/audit" />}
          >
            V1 audit report
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                setTest(await selfTest())
              } catch (error) {
                setTest(
                  error instanceof Error ? error.message : "Self-test failed."
                )
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}
            Run crypto self-test
          </Button>
        </div>
        {test ? (
          <p className="text-sm text-ok">{test}</p>
        ) : null}
      </div>

      <div className="grid gap-3">
        {v2FixList.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <span className="font-mono text-xs text-muted-foreground">
                  {item.id}
                </span>
                <SeverityBadge severity={item.severity} />
                <span>{item.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed">
              <p className="text-muted-foreground">{item.summary}</p>
              <p className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />
                <span>{item.fix}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
