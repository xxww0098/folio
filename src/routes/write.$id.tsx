import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getPostForEdit, listPublishedPosts } from "@/lib/blog/server";
import type { PostDetail } from "@/lib/blog/types";
import { SiteShell } from "@/components/site-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { WriteForm } from "@/components/write-form";

export const Route = createFileRoute("/write/$id")({
  loader: () => listPublishedPosts(),
  component: EditPage,
});

function EditPage() {
  const posts = Route.useLoaderData();
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [post, setPost] = useState<PostDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      setPost(null);
      return;
    }
    void getPostForEdit({ data: numericId }).then(setPost).catch(() => setPost(null));
  }, [id, user]);

  return (
    <SiteShell posts={posts}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight">编辑文章</h1>
        {isPending || (user && post === undefined) ? (
          <Skeleton className="h-96 w-full" />
        ) : !user ? (
          <RedirectToSignIn />
        ) : post ? (
          <WriteForm post={post} />
        ) : (
          <p className="text-sm text-muted-foreground">找不到这篇文章，或它不属于你。</p>
        )}
      </div>
    </SiteShell>
  );
}
