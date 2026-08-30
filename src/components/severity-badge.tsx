import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Severity } from "@/lib/audit"

const styles: Record<Severity, string> = {
  critical:
    "border-transparent bg-critical text-critical-foreground capitalize",
  high: "border-transparent bg-high text-high-foreground capitalize",
  medium: "border-transparent bg-medium text-medium-foreground capitalize",
  low: "border-transparent bg-low text-low-foreground capitalize",
}

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity
  className?: string
}) {
  return (
    <Badge className={cn(styles[severity], className)}>{severity}</Badge>
  )
}
