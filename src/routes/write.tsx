import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SiteShell } from "@/components/site-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { WriteForm } from "@/components/write-form";
import { listPublishedPosts } from "@/lib/blog/server";

export const Route = createFileRoute("/write")({
  loader: () => listPublishedPosts(),
  component: WritePage,
});

function WritePage() {
  const posts = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();

  return (
    <SiteShell posts={posts}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">写文章</h1>
        <p className="mt-2 mb-8 max-w-xl text-sm text-muted-foreground">
          可视化编辑，或切到源码。用 [[别名]] 引用已有文章。可以先存草稿，确认后再发布。
        </p>
        {isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : user ? (
          <WriteForm />
        ) : (
          <RedirectToSignIn />
        )}
      </div>
    </SiteShell>
  );
}
