import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WriteForm } from "@/components/write-form";
import { listPublishedPosts } from "@/lib/blog/server";
import { getWorkspaceAccess } from "@/lib/entrance/server";

export const Route = createFileRoute("/write")({
  loader: () => listPublishedPosts(),
  head: () => ({ meta: [{ title: "写文章 - 折页" }] }),
  component: WritePage,
});

function WritePage() {
  const posts = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const [canWrite, setCanWrite] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setCanWrite(null);
      return;
    }
    let cancelled = false;
    void getWorkspaceAccess()
      .then((access) => {
        if (!cancelled) setCanWrite(access.canWrite);
      })
      .catch(() => {
        if (!cancelled) setCanWrite(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <SiteShell posts={posts}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">写文章</h1>
        <p className="mt-2 mb-8 max-w-xl text-sm text-muted-foreground">
          可视化编辑，或切到源码。用 [[别名]] 引用已有文章。可以先存草稿，确认后再发布。
        </p>
        {isPending || (user && canWrite === null) ? (
          <div className="space-y-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !user ? (
          <Navigate to="/login" search={{ next: "/write" }} />
        ) : canWrite ? (
          <WriteForm />
        ) : (
          <div className="rounded-xl bg-card p-8 shadow-md">
            <p className="text-sm text-muted-foreground">投稿需要作者身份。注册用户可以评论、开会员，写稿请联系管理员开通。</p>
            <div className="mt-4 flex gap-2">
              <Button asChild>
                <Link to="/me">去个人中心</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">回首页</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
