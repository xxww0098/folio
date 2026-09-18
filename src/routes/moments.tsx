import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SignInGate } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { getSiteChrome } from "@/lib/blog/server";
import { formatRelative } from "@/lib/format";
import { createMoment, deleteMoment, listMoments } from "@/lib/moments/server";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/site-shell";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/moments")({
  loader: async () => {
    const [chrome, moments] = await Promise.all([getSiteChrome(), listMoments()]);
    return { chrome, moments };
  },
  head: () => ({ meta: [{ title: "瞬间 - 折页" }] }),
  component: MomentsPage,
});

function MomentsPage() {
  const { chrome, moments } = Route.useLoaderData();
  const user = useCurrentUser();
  const [body, setBody] = useState("");
  const [items, setItems] = useState(moments);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (body.trim().length < 2) return;
    setPending(true);
    try {
      const moment = await createMoment({ data: { body: body.trim() } });
      setItems((current) => [moment, ...current]);
      setBody("");
      toast.success("已发布瞬间");
    } catch {
      toast.error("没能发布");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteMoment({ data: id });
      setItems((current) => current.filter((item) => item.id !== id));
    } catch {
      toast.error("无法删除");
    }
  }

  return (
    <SiteShell posts={chrome.posts} tags={chrome.tags} recentComments={chrome.recentComments} sidebar>
      <h1 className="text-2xl font-semibold tracking-tight">瞬间</h1>
      <p className="mt-2 text-sm text-muted-foreground">短一点的记录，不必写成文章。</p>

      <SignInGate
        fallback={
          <p className="mt-6 rounded-xl bg-card px-4 py-5 text-sm text-muted-foreground shadow-md">
            登录后可以发布瞬间。
          </p>
        }
      >
        <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-xl bg-card p-4 shadow-md">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="这一刻想留下什么？"
            maxLength={280}
            className="min-h-24"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs tabular-nums text-muted-foreground">{body.length} / 280</span>
            <Button type="submit" size="sm" disabled={pending || body.trim().length < 2}>
              {pending ? "发布中…" : "发布"}
            </Button>
          </div>
        </form>
      </SignInGate>

      <ol className="mt-6 space-y-4">
        {items.map((moment) => (
          <li key={moment.id} className="rounded-xl bg-card p-5 shadow-md">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{moment.authorName}</p>
              <div className="flex items-center gap-3">
                <time className="text-xs text-muted-foreground">{formatRelative(moment.createdAt)}</time>
                {user?.id === moment.userId ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => void onDelete(moment.id)}
                  >
                    删除
                  </button>
                ) : null}
              </div>
            </div>
            <p className="whitespace-pre-wrap text-base leading-relaxed">{moment.body}</p>
          </li>
        ))}
      </ol>
    </SiteShell>
  );
}
