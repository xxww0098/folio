import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { describeUnlock, type AccessGate } from "@/lib/membership/access";
import { Button } from "@/components/ui/button";

export function Paywall({ access, slug }: { access: AccessGate; slug: string }) {
  if (!access.locked) {
    if (access.isStaff && access.exclusive) {
      return (
        <p className="mt-8 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
          编辑可见全文。读者在{access.mode === "paid" ? "订阅前看不到正文" : ` ${describeUnlock(access.publicAt)} 前看不到正文`}。
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
            <p className="text-sm font-medium text-primary">
              {early ? "会员抢先阅读" : "会员专享"}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {early ? "订阅后立刻读完全文" : "订阅后可随时回看"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-header-foreground/75">
              {early
                ? `付费会员现在就能看，不限次数。普通读者将在${describeUnlock(access.publicAt)}看到全文。`
                : "这篇文章只对有效会员开放，登录后订阅即可阅读，次数不限。"}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {access.reason === "login" ? (
            <>
              <Button asChild className="min-h-11">
                <Link to="/login" search={{ next }}>
                  登录后订阅
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="min-h-11 border-header-foreground/20 bg-transparent text-header-foreground hover:bg-header-foreground/10 hover:text-header-foreground"
              >
                <Link to="/membership" search={{ next }}>
                  了解会员
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild className="min-h-11">
                <Link to="/membership" search={{ next }}>
                  <Sparkles className="size-4" />
                  立即订阅
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="min-h-11 border-header-foreground/20 bg-transparent text-header-foreground hover:bg-header-foreground/10 hover:text-header-foreground"
              >
                <Link to="/membership" search={{ next }}>
                  兑换码开通
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
