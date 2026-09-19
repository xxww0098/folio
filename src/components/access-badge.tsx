import { Lock, Timer } from "lucide-react";
import { ACCESS_LABEL, describeUnlock, type AccessMode } from "@/lib/membership/access";
import { Badge } from "@/components/ui/badge";
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
    <Badge variant={early ? "accent" : "paid"} className={cn("h-6 px-2 text-[11px]", className)}>
      {early ? <Timer className="size-3" /> : <Lock className="size-3" />}
      {early ? describeUnlock(publicAt) : ACCESS_LABEL.paid}
    </Badge>
  );
}
