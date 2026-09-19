import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SignInGate } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { getSiteChrome } from "@/lib/blog/server";
import { formatRelative } from "@/lib/format";
import { createMoment, deleteMoment, listMoments } from "@/lib/moments/server";
import { requirePublicPage } from "@/lib/pages/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteShell, siteChromeProps } from "@/components/site-shell";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/moments")({
  beforeLoad: () => requirePublicPage("moments"),
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
    <SiteShell {...siteChromeProps(chrome)} sidebar>
      <h1 className="text-2xl font-semibold tracking-tight">瞬间</h1>
      <p className="mt-2 text-sm text-muted-foreground">短一点的记录，不必写成文章。</p>

      <SignInGate
        fallback={
          <Alert variant="muted" className="mt-6">
            <AlertDescription>登录后可以发布瞬间。</AlertDescription>
          </Alert>
        }
      >
        <Card className="mt-6 shadow-md">
          <CardContent className="p-4">
            <form onSubmit={onSubmit} className="space-y-3">
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="写一句这一刻"
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
          </CardContent>
        </Card>
      </SignInGate>

      {items.length === 0 ? (
        <Alert variant="muted" className="mt-6">
          <AlertDescription>还没有瞬间。</AlertDescription>
        </Alert>
      ) : null}
      <ol className="mt-6 space-y-4">
        {items.map((moment) => (
          <li key={moment.id}>
            <Card className="shadow-md">
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{moment.authorName}</p>
                  <div className="flex items-center gap-3">
                    <time className="text-xs text-muted-foreground">{formatRelative(moment.createdAt)}</time>
                    {user?.id === moment.userId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-0 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => void onDelete(moment.id)}
                      >
                        删除
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-base leading-relaxed">{moment.body}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </SiteShell>
  );
}
