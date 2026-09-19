import { cn } from "@/lib/utils";

export function FolioMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("block", className)} aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M7 7.5 16 11v13.5L7 19.2V7.5zm10 3.5 8-4v11.6l-8 6.1V11z" />
    </svg>
  );
}
