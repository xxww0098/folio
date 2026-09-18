import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPublishedPosts } from "@/lib/blog/server";
import { ACCESS_LABEL, PLANS, describeUnlock } from "@/lib/membership/access";
import { getMyMembership, redeemCode, startSubscription } from "@/lib/membership/server";
import { SignInGate } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatZhDate } from "@/lib/format";

export const Route = createFileRoute("/membership")({
  validateSearch: (search: Record<string, unknown>): { next?: string } => {
    const next = typeof search.next === "string" && search.next.startsWith("/") && !search.next.startsWith("//") ? search.next : undefined;
    return next ? { next } : {};
  },
  loader: async () => {
    const [posts, membership] = await Promise.all([listPublishedPosts(), getMyMembership()]);
    return { posts, membership };
  },
  head: () => ({ meta: [{ title: "会员 - 折页" }] }),
  component: MembershipPage,
});

function MembershipPage() {
  const { posts, membership: initial } = Route.useLoaderData();
  const { next } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [membership, setMembership] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const exclusive = posts.filter((post) => post.exclusive);

  async function subscribe(plan: "monthly" | "yearly") {
    setPending(plan);
    try {
      const nextState = await startSubscription({ data: { plan } });
      setMembership(nextState);
      toast.success("会员已开通");
    } catch (error) {
      const message = error instanceof Error ? error.message : "无法开通";
      toast.error(message === "Unauthorized" ? "请先登录" : message);
    } finally {
      setPending(null);
    }
  }

  async function onRedeem() {
    setPending("code");
    try {
      const nextState = await redeemCode({ data: { code } });
      setMembership(nextState);
      setCode("");
      toast.success("兑换成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "兑换失败");
    } finally {
      setPending(null);
    }
  }

  return (
    <SiteShell posts={posts}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">会员</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          新文立刻读全文，到期公开。
        </p>

        {membership.isPaid ? (
          <div className="mt-8 rounded-xl bg-card p-5 shadow-md">
            <p className="text-sm font-medium text-primary">已开通 · {membership.planLabel}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {membership.expiresAt
                ? `有效至 ${formatZhDate(membership.expiresAt)}，剩 ${membership.remainingDays} 天。`
                : "长期有效。"}
            </p>
            {next ? (
              <Button asChild className="mt-4">
                <a href={next}>{next.startsWith("/posts/") ? "返回文章" : "继续"}</a>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PLANS.map((plan) => (
              <article key={plan.id} className="flex flex-col rounded-xl bg-card p-5 shadow-md">
                <h2 className="text-lg font-semibold">{plan.label}</h2>
                <p className="mt-1 text-3xl font-semibold tracking-tight">
                  ¥{plan.price}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/ {plan.days} 天</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.blurb}</p>
                <div className="mt-auto pt-5">
                  {isPending ? (
                    <Button className="w-full" disabled>
                      开通
                    </Button>
                  ) : (
                    <SignInGate
                      fallback={
                        <Button asChild className="w-full">
                          <Link to="/login" search={{ next: next || "/membership" }}>
                            登录后开通
                          </Link>
                        </Button>
                      }
                    >
                      <Button
                        className="w-full"
                        disabled={!!pending}
                        onClick={() => void subscribe(plan.id)}
                      >
                        {pending === plan.id ? "开通中…" : `开通${plan.label}`}
                      </Button>
                    </SignInGate>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          预览环境直接写入会员记录。兑换码{" "}
          <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">FOLIO-TECH</code>
        </p>

        <div className="mt-8 rounded-xl bg-card p-5 shadow-md">
          <h2 className="text-base font-semibold">兑换码</h2>
          {user ? (
            <form
              className="mt-4 flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void onRedeem();
              }}
            >
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="FOLIO-TECH"
                className="font-mono uppercase"
                maxLength={32}
              />
              <Button type="submit" disabled={!!pending || code.trim().length < 4}>
                {pending === "code" ? "兑换中…" : "兑换"}
              </Button>
            </form>
          ) : (
            <Button asChild className="mt-4" variant="outline">
              <Link to="/login" search={{ next: "/membership" }}>
                登录后兑换
              </Link>
            </Button>
          )}
        </div>

        {exclusive.length ? (
          <section className="mt-10">
            <h2 className="text-base font-semibold">当前抢先 / 专享</h2>
            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-md">
              {exclusive.map((post) => (
                <li key={post.id}>
                  <Link
                    to="/posts/$slug"
                    params={{ slug: post.slug }}
                    className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-secondary/60"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{post.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ACCESS_LABEL[post.accessMode]}
                        {post.accessMode === "early" ? ` · ${describeUnlock(post.publicAt)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-primary">阅读</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </SiteShell>
  );
}
