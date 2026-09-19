import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function VisitSiteLink({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <a
      href="/"
      target="_blank"
      rel="noreferrer"
      title="新标签打开博客前台"
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-console-ink transition-colors duration-150 hover:text-console-brand",
        className,
      )}
    >
      <ExternalLink className="size-4 shrink-0" />
      {compact ? <span className="sr-only">访问博客</span> : "访问博客"}
    </a>
  );
}
