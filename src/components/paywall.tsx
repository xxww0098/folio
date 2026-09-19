import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { describeUnlock, type AccessGate } from "@/lib/membership/access";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function Paywall({ access, slug }: { access: AccessGate; slug: string }) {
  if (!access.locked) {
    if (access.isStaff && access.exclusive) {
      return (
        <Alert variant="muted" className="mt-8">
          <AlertDescription>
            编辑可见全文。读者
            {access.mode === "paid" ? "订阅前看不到正文" : ` ${describeUnlock(access.publicAt)} 前看不到正文`}。
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  const next = `/posts/${slug}`;
  const early = access.mode === "early";

  return (
    <aside className="relative mt-2">
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-gradient-to-t from-card to-transparent" />
      <Card className="border-0 bg-header text-header-foreground shadow-md">
        <CardHeader className="flex-row items-start gap-3 space-y-0 px-5 py-6 sm:px-8 sm:pt-8">
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Lock className="size-4" />
          </span>
          <div className="min-w-0">
            <CardTitle className="font-sans text-xl text-header-foreground">{early ? "会员抢先" : "会员专享"}</CardTitle>
            <CardDescription className="mt-2 text-header-foreground/75">
              {early ? `${describeUnlock(access.publicAt)} 后公开` : "订阅后阅读，不限次数。"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-6 sm:px-8 sm:pb-8">
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
        </CardContent>
      </Card>
    </aside>
  );
}
