import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SiteShell } from "@/components/site-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { WriteForm } from "@/components/write-form";
import { listPublishedPosts } from "@/lib/blog/server";
import { getWorkspaceAccess } from "@/lib/entrance/server";

export const Route = createFileRoute("/write")({
  beforeLoad: async () => {
    const access = await getWorkspaceAccess();
    if (!access.signedIn) {
      throw redirect({ to: "/login", search: { next: "/write" } });
    }
    if (!access.canWrite) {
      throw redirect({ to: "/me" });
    }
  },
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
        ) : !user || !canWrite ? (
          <Navigate to="/me" />
        ) : (
          <WriteForm />
        )}
      </div>
    </SiteShell>
  );
}
