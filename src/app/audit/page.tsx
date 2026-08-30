import { AuditReport } from "@/components/audit-report"

export const metadata = {
  title: "V1 audit · VaultApp 2.0",
  description: "Original static security review of pwscho/VaultApp.",
}

export default function AuditPage() {
  return (
    <main className="flex-1">
      <AuditReport />
    </main>
  )
}
