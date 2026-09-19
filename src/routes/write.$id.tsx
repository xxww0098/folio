import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getPostForEdit, listPublishedPosts } from "@/lib/blog/server";
import { getWorkspaceAccess } from "@/lib/entrance/server";
import type { PostDetail } from "@/lib/blog/types";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WriteForm } from "@/components/write-form";

export const Route = createFileRoute("/write/$id")({
  loader: () => listPublishedPosts(),
  head: () => ({ meta: [{ title: "编辑文章 - 折页" }] }),
  component: EditPage,
});

function EditPage() {
  const posts = Route.useLoaderData();
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [post, setPost] = useState<PostDetail | null | undefined>(undefined);
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

  useEffect(() => {
    if (!user) return;
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      setPost(null);
      return;
    }
    void getPostForEdit({ data: numericId })
      .then(setPost)
      .catch(() => setPost(null));
  }, [id, user]);

  return (
    <SiteShell posts={posts}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight">编辑文章</h1>
        {isPending || (user && (canWrite === null || post === undefined)) ? (
          <Skeleton className="h-96 w-full" />
        ) : !user ? (
          <Navigate to="/login" search={{ next: `/write/${id}` }} />
        ) : !canWrite ? (
          <div className="rounded-xl bg-card p-8 shadow-md">
            <p className="text-sm text-muted-foreground">编辑文章需要作者身份。</p>
            <Button asChild className="mt-4">
              <Link to="/me">去个人中心</Link>
            </Button>
          </div>
        ) : post ? (
          <WriteForm post={post} />
        ) : (
          <p className="text-sm text-muted-foreground">找不到这篇文章，或它不属于你。</p>
        )}
      </div>
    </SiteShell>
  );
}
