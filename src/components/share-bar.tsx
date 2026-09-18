import { Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ShareBar({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("链接已复制");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("链接已复制");
      } catch {
        toast.error("无法分享");
      }
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copyLink()}
      className="inline-flex h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
    >
      <Link2 className="size-4" />
      {copied ? "已复制" : "分享"}
    </button>
  );
}
