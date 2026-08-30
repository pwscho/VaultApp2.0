import { SecurityFixes } from "@/components/security-fixes"

export const metadata = {
  title: "V2 remediations · VaultApp 2.0",
  description: "How VaultApp 2.0 closes each finding from the V1 audit.",
}

export default function SecurityPage() {
  return (
    <main className="flex-1">
      <SecurityFixes />
    </main>
  )
}
