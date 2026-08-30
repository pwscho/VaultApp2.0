"use client"

import { useMemo, useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SeverityBadge } from "@/components/severity-badge"
import { findings, type Severity } from "@/lib/audit"
import { FileCode2, ShieldAlert } from "lucide-react"

const filters: Array<"all" | Severity> = [
  "all",
  "critical",
  "high",
  "medium",
  "low",
]

export function FindingList() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("all")

  const visible = useMemo(
    () =>
      filter === "all"
        ? findings
        : findings.filter((finding) => finding.severity === filter),
    [filter]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
            className="capitalize"
          >
            {value}
            <span className="text-xs opacity-70">
              {value === "all"
                ? findings.length
                : findings.filter((finding) => finding.severity === value)
                    .length}
            </span>
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No findings in this severity.
          </CardContent>
        </Card>
      ) : (
        <Accordion>
          {visible.map((finding) => (
            <AccordionItem key={finding.id} value={finding.id}>
              <AccordionTrigger className="items-center gap-3 px-1 hover:no-underline">
                <span className="font-mono text-xs text-muted-foreground">
                  {finding.id}
                </span>
                <SeverityBadge severity={finding.severity} />
                <span className="flex-1 text-left font-medium">
                  {finding.title}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pb-4">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {finding.summary}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/60 p-3">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <FileCode2 className="size-3.5" />
                        Location
                      </p>
                      <p className="font-mono text-xs leading-relaxed">
                        {finding.location}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {finding.cwe}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-3">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <ShieldAlert className="size-3.5" />
                        Impact
                      </p>
                      <p className="text-sm leading-relaxed">{finding.impact}</p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Evidence
                    </p>
                    <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-100">
                      <code>{finding.evidence}</code>
                    </pre>
                  </div>
                  <div className="rounded-lg border border-ok/30 bg-ok/10 p-3">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ok">
                      Remediation
                    </p>
                    <p className="text-sm leading-relaxed">{finding.remediation}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  )
}
