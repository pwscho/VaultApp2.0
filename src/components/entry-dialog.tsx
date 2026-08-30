"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SecretInput } from "@/components/secret-input"
import { generatePassword } from "@/lib/password"
import type { VaultEntry } from "@/lib/types"

type Draft = Omit<VaultEntry, "id" | "createdAt" | "updatedAt">

function initialDraft(entry: VaultEntry | null): Draft {
  if (!entry) {
    return { title: "", username: "", password: "", url: "", notes: "" }
  }
  return {
    title: entry.title,
    username: entry.username,
    password: entry.password,
    url: entry.url,
    notes: entry.notes,
  }
}

export function EntryDialog({
  open,
  entry,
  onOpenChange,
  onSave,
}: {
  open: boolean
  entry: VaultEntry | null
  onOpenChange: (open: boolean) => void
  onSave: (draft: Draft) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{entry ? "Edit entry" : "Add entry"}</DialogTitle>
          <DialogDescription>
            Secrets stay on this device. The password field is masked unless you
            reveal it.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <EntryForm
            key={entry?.id ?? "new"}
            entry={entry}
            onClose={() => onOpenChange(false)}
            onSave={onSave}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function EntryForm({
  entry,
  onClose,
  onSave,
}: {
  entry: VaultEntry | null
  onClose: () => void
  onSave: (draft: Draft) => void
}) {
  const [draft, setDraft] = useState(() => initialDraft(entry))

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!draft.title.trim()) return
        onSave(draft)
        onClose()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="entry-title">Title</Label>
        <Input
          id="entry-title"
          required
          value={draft.title}
          onChange={(event) =>
            setDraft((current) => ({ ...current, title: event.target.value }))
          }
          placeholder="Bank, email, work SSO"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="entry-user">Username</Label>
        <Input
          id="entry-user"
          value={draft.username}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              username: event.target.value,
            }))
          }
          placeholder="name@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="entry-pass">Password</Label>
        <div className="flex gap-2">
          <SecretInput
            id="entry-pass"
            className="flex-1"
            value={draft.password}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
          />
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                password: generatePassword(),
              }))
            }
          >
            <RefreshCw />
            Generate
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="entry-url">Website</Label>
        <Input
          id="entry-url"
          value={draft.url}
          onChange={(event) =>
            setDraft((current) => ({ ...current, url: event.target.value }))
          }
          placeholder="https://"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="entry-notes">Notes</Label>
        <Textarea
          id="entry-notes"
          value={draft.notes}
          onChange={(event) =>
            setDraft((current) => ({ ...current, notes: event.target.value }))
          }
          placeholder="Recovery codes, security questions — still encrypted"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save entry</Button>
      </DialogFooter>
    </form>
  )
}
