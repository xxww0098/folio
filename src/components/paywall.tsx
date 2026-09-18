import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { describeUnlock, type AccessGate } from "@/lib/membership/access";
import { Button } from "@/components/ui/button";

export function Paywall({ access, slug }: { access: AccessGate; slug: string }) {
  if (!access.locked) {
    if (access.isStaff && access.exclusive) {
      return (
        <p className="mt-8 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
          编辑可见全文。读者
          {access.mode === "paid" ? "订阅前看不到正文" : ` ${describeUnlock(access.publicAt)} 前看不到正文`}。
        </p>
      );
    }
    return null;
  }

  const next = `/posts/${slug}`;
  const early = access.mode === "early";

  return (
    <aside className="relative mt-2">
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-gradient-to-t from-card to-transparent" />
      <div className="rounded-xl bg-header px-5 py-6 text-header-foreground shadow-md sm:px-8 sm:py-8">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Lock className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">{early ? "会员抢先" : "会员专享"}</h2>
            <p className="mt-2 text-sm text-header-foreground/75">
              {early ? `${describeUnlock(access.publicAt)} 后公开` : "订阅后阅读，不限次数。"}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {access.reason === "login" ? (
            <Button asChild className="min-h-11">
              <Link to="/login" search={{ next }}>
                登录后订阅
              </Link>
            </Button>
          ) : (
            <Button asChild className="min-h-11">
              <Link to="/membership" search={{ next }}>
                订阅
              </Link>
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
