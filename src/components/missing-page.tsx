import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export function MissingPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-sm text-muted-foreground">404</p>
        <h1 className="mt-3 text-2xl font-semibold">页面不存在</h1>
        <Link to="/" className="mt-6 inline-flex h-11 items-center text-sm text-primary hover:underline">
          返回首页
        </Link>
      </div>
    </SiteShell>
  );
}
