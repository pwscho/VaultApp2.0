import { passwordScore } from "@/lib/password"
import { cn } from "@/lib/utils"

export function PasswordMeter({ password }: { password: string }) {
  const { score, label, hints } = passwordScore(password)
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full bg-muted",
              score > index &&
                (score <= 1
                  ? "bg-critical"
                  : score === 2
                    ? "bg-high"
                    : score === 3
                      ? "bg-medium"
                      : "bg-ok")
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {password ? `${label}. ` : ""}
        {hints[0] ?? "This looks usable as a master password."}
      </p>
    </div>
  )
}
