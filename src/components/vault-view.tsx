"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Copy,
  Eye,
  EyeOff,
  Globe,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { EntryDialog } from "@/components/entry-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useSession } from "@/lib/session"
import { REVEAL_MS, type VaultEntry } from "@/lib/types"

export function VaultView() {
  const { entries, saveEntries, copySecret, busy } = useSession()
  const [query, setQuery] = useState("")
  const [editor, setEditor] = useState<VaultEntry | null | "new">(null)
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!revealedId) return
    const timer = window.setTimeout(() => setRevealedId(null), REVEAL_MS)
    return () => window.clearTimeout(timer)
  }, [revealedId])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return entries
    return entries.filter((entry) =>
      `${entry.title} ${entry.username} ${entry.url}`.toLowerCase().includes(needle)
    )
  }, [entries, query])

  async function persist(next: VaultEntry[]) {
    await saveEntries(next)
  }

  async function markCopied(key: string, value: string) {
    await copySecret(value)
    setCopied(key)
    window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, usernames, sites"
            className="pl-8"
          />
        </div>
        <Button onClick={() => setEditor("new")}>
          <Plus />
          Add entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">No logins yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a site, username, and password. Nothing is written until you
              save, and the file on disk stays ciphertext.
            </p>
            <Button className="mt-4" onClick={() => setEditor("new")}>
              Add the first entry
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No entries match “{query}”.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((entry) => {
            const revealed = revealedId === entry.id
            return (
              <li key={entry.id}>
                <Card>
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{entry.title}</p>
                        {entry.url ? (
                          <a
                            href={entry.url}
                            className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Globe className="size-3" />
                            {entry.url.replace(/^https?:\/\//, "")}
                          </a>
                        ) : null}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Edit entry"
                          onClick={() => setEditor(entry)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Delete entry"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Delete “${entry.title}”?`)) {
                              persist(entries.filter((item) => item.id !== entry.id))
                            }
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>

                    <SecretRow
                      label="Username"
                      value={entry.username}
                      copied={copied === `${entry.id}-user`}
                      onCopy={() => markCopied(`${entry.id}-user`, entry.username)}
                    />
                    <SecretRow
                      label="Password"
                      value={revealed ? entry.password : "••••••••"}
                      secret
                      revealed={revealed}
                      copied={copied === `${entry.id}-pass`}
                      onCopy={() => markCopied(`${entry.id}-pass`, entry.password)}
                      onReveal={() =>
                        setRevealedId((current) =>
                          current === entry.id ? null : entry.id
                        )
                      }
                    />
                    {entry.notes ? (
                      <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                        {entry.notes}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <EntryDialog
        open={editor !== null}
        entry={editor === "new" ? null : editor}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
        onSave={(draft) => {
          const now = new Date().toISOString()
          if (editor === "new" || editor === null) {
            persist([
              ...entries,
              {
                ...draft,
                title: draft.title.trim(),
                id: crypto.randomUUID(),
                createdAt: now,
                updatedAt: now,
              },
            ])
            return
          }
          persist(
            entries.map((item) =>
              item.id === editor.id
                ? { ...item, ...draft, title: draft.title.trim(), updatedAt: now }
                : item
            )
          )
        }}
      />
    </div>
  )
}

function SecretRow({
  label,
  value,
  secret,
  revealed,
  copied,
  onCopy,
  onReveal,
}: {
  label: string
  value: string
  secret?: boolean
  revealed?: boolean
  copied: boolean
  onCopy: () => void
  onReveal?: () => void
}) {
  if (!value && !secret) return null
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={
            secret && !revealed
              ? "font-mono text-sm tracking-widest"
              : "truncate font-mono text-sm"
          }
        >
          {value || "—"}
        </p>
      </div>
      {secret ? (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={revealed ? "Hide password" : "Reveal password"}
          onClick={onReveal}
        >
          {revealed ? <EyeOff /> : <Eye />}
        </Button>
      ) : null}
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={`Copy ${label}`}
        onClick={onCopy}
        disabled={!value}
      >
        <Copy />
        <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
      </Button>
    </div>
  )
}
