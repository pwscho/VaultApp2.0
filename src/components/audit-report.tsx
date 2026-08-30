"use client"

import {
  auditMeta,
  countBySeverity,
  findings,
  remediationOrder,
  strengths,
  threatModel,
} from "@/lib/audit"
import { FindingList } from "@/components/finding-list"
import { SeverityBadge } from "@/components/severity-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle2,
  FileWarning,
  Lock,
  Shield,
  ShieldAlert,
} from "lucide-react"

const counts = countBySeverity()

const statCards = [
  {
    label: "Critical",
    value: counts.critical,
    className: "border-critical/30 bg-critical/10 text-critical",
  },
  {
    label: "High",
    value: counts.high,
    className: "border-high/30 bg-high/10 text-high",
  },
  {
    label: "Medium",
    value: counts.medium,
    className: "border-medium/40 bg-medium/10 text-medium-foreground dark:text-medium",
  },
  {
    label: "Low",
    value: counts.low,
    className: "border-low/30 bg-low/10 text-low",
  },
]

export function AuditReport() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Shield className="size-3.5" />
            Security audit
          </Badge>
          <Badge variant="secondary">Static review</Badge>
          <Badge className="border-transparent bg-high text-high-foreground">
            Overall risk: {auditMeta.overallRisk}
          </Badge>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            VaultApp security audit
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {auditMeta.overallSummary}
          </p>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Source
            </dt>
            <dd className="mt-1">
              <a
                href={auditMeta.repo}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                pwscho/VaultApp
              </a>
              <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                {auditMeta.commit.slice(0, 12)} · {auditMeta.commitDate}
              </span>
            </dd>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Scope
            </dt>
            <dd className="mt-1 leading-relaxed">
              {auditMeta.stack}
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Reviewed {auditMeta.reviewedOn}
              </span>
            </dd>
          </div>
        </dl>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className={stat.className}>
            <CardContent className="pt-1">
              <p className="text-3xl font-semibold tabular-nums">{stat.value}</p>
              <p className="mt-1 text-sm font-medium">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="findings">
            Findings
            <span className="text-xs opacity-70">{counts.total}</span>
          </TabsTrigger>
          <TabsTrigger value="strengths">What holds up</TabsTrigger>
          <TabsTrigger value="fix">Fix order</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileWarning className="size-4" />
                Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 leading-relaxed text-muted-foreground">
              <p>{auditMeta.method}</p>
              <p>
                This environment cannot run the MAUI Windows or mobile shells, so
                nothing here is a penetration-test result. Findings come from
                reading the vault format, key derivation, navigation, and
                platform manifests.
              </p>
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Threat model</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {threatModel.map((item) => (
                <Card key={item.title}>
                  <CardHeader>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-relaxed text-muted-foreground">
                    {item.detail}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-4" />
                Highest-priority issues
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {findings
                .filter(
                  (finding) =>
                    finding.severity === "critical" ||
                    finding.severity === "high"
                )
                .map((finding) => (
                  <div
                    key={finding.id}
                    className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-start"
                  >
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {finding.id}
                      </span>
                      <SeverityBadge severity={finding.severity} />
                    </div>
                    <div>
                      <p className="font-medium">{finding.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {finding.summary}
                      </p>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="findings" className="pt-5">
          <FindingList />
        </TabsContent>

        <TabsContent value="strengths" className="space-y-4 pt-5">
          <p className="text-sm text-muted-foreground">
            The crypto primitive choices are the strongest part of the project.
            Keep them, and fix the product around them.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {strengths.map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle className="flex items-start gap-2 text-base">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.detail}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="fix" className="pt-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-4" />
                Suggested fix order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {remediationOrder.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <Separator className="my-5" />
              <p className="text-sm text-muted-foreground">
                A full write-up with the same findings lives in{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  SECURITY_AUDIT.md
                </code>{" "}
                in this repository.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <footer className="border-t pt-6 text-xs leading-relaxed text-muted-foreground">
        Reviewed against {auditMeta.repo} at {auditMeta.commit.slice(0, 12)}.
        This is a source review, not a certification, and not a substitute for
        an independent cryptography audit before storing real secrets.
      </footer>
    </div>
  )
}
