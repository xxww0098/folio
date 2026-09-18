import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
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
      toast.success("会员已开通，文章不限次数阅读");
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
        <p className="text-sm font-medium text-primary">折页会员</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">抢先读技术长文</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          新文章可设置开放时限。会员立刻看全文、不限次数；时限一到，普通读者也能读。正文在服务器裁切，不是前端藏起来。
        </p>

        {membership.isPaid ? (
          <div className="mt-8 rounded-xl bg-card p-5 shadow-md">
            <p className="text-sm font-medium text-primary">已开通 · {membership.planLabel}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {membership.expiresAt
                ? `有效期至 ${formatZhDate(membership.expiresAt)}，剩余 ${membership.remainingDays} 天。期间阅读不限次数。`
                : "长期有效，阅读不限次数。"}
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
                <ul className="mt-4 space-y-2 text-sm">
                  {["抢先阅读期内立刻看全文", "有效期内不限阅读次数", "到期后文章自动对所有人开放"].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
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
                        {pending === plan.id ? "开通中…" : `演示开通${plan.label}`}
                      </Button>
                    </SignInGate>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          预览环境没有接真实支付，开通会直接写入本站会员记录，方便验证权限。兑换码{" "}
          <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">FOLIO-TECH</code>{" "}
          可开一年。
        </p>

        <div className="mt-8 rounded-xl bg-card p-5 shadow-md">
          <h2 className="text-base font-semibold">兑换码</h2>
          <p className="mt-1 text-sm text-muted-foreground">已登录读者可以兑换会员，次数同样不限。</p>
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
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="size-4 text-primary" />
              当前抢先 / 专享
            </h2>
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
