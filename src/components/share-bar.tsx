import { Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" className="h-11 gap-1.5 text-muted-foreground" onClick={() => void copyLink()}>
          <Link2 className="size-4" />
          {copied ? "已复制" : "分享"}
        </Button>
      </TooltipTrigger>
      <TooltipContent>复制链接</TooltipContent>
    </Tooltip>
  );
}
