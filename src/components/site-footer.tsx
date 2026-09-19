import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function SiteFooter() {
  return (
    <footer className="mt-10">
      <Separator />
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground lg:px-6">
        <Button asChild variant="link" className="h-auto p-0 text-muted-foreground">
          <a href="/rss.xml">RSS</a>
        </Button>
        <p>© 2026 折页</p>
      </div>
    </footer>
  );
}
