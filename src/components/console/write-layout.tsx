import { useEffect, useState, type ReactNode } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getAuthorDashboard } from "@/lib/blog/server";
import type { PostListItem } from "@/lib/blog/types";
import type { Role } from "@/lib/roles";
import { ConsoleShell } from "./shell";

export function ConsoleWriteLayout({
  posts,
  children,
}: {
  heading?: string;
  posts: PostListItem[];
  children: ReactNode;
}) {
  const { user } = useCurrentUserState();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAuthorDashboard({ data: { scope: "all" } })
      .then((dash) => {
        if (!cancelled) setRole(dash.role);
      })
      .catch(() => {
        if (!cancelled) setRole(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ConsoleShell
      area="console"
      section="posts"
      userName={user?.displayName ?? user?.primaryEmail ?? "Administrator"}
      role={role}
      posts={posts}
      onRefresh={() => undefined}
    >
      <div className="-mx-4 flex min-h-[calc(100dvh-8rem)] flex-col sm:-mx-6">{children}</div>
    </ConsoleShell>
  );
}
