import { Lock, Timer } from "lucide-react";
import { ACCESS_LABEL, describeUnlock, type AccessMode } from "@/lib/membership/access";
import { cn } from "@/lib/utils";

export function AccessBadge({
  mode,
  exclusive,
  publicAt,
  className,
}: {
  mode: AccessMode;
  exclusive: boolean;
  publicAt: string | null;
  className?: string;
}) {
  if (mode === "public" || !exclusive) return null;
  const early = mode === "early";
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium",
        early ? "bg-accent text-accent-foreground" : "bg-header text-header-foreground",
        className,
      )}
    >
      {early ? <Timer className="size-3" /> : <Lock className="size-3" />}
      {early ? describeUnlock(publicAt) : ACCESS_LABEL.paid}
    </span>
  );
}
