import { createFileRoute, redirect } from "@tanstack/react-router";
import { isMeSection } from "@/components/console/nav";
import { loadWorkspace, WorkspaceApp } from "@/components/console/workspace";
import { getWorkspaceAccess } from "@/lib/entrance/server";

export const Route = createFileRoute("/me")({
  validateSearch: (search: Record<string, unknown>): { section?: import("@/components/console/nav").MeSection } =>
    isMeSection(search.section) ? { section: search.section } : {},
  beforeLoad: async ({ search }) => {
    const access = await getWorkspaceAccess();
    if (!access.signedIn) {
      const next = search.section ? `/me?section=${search.section}` : "/me";
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: () => loadWorkspace("me"),
  head: () => ({ meta: [{ title: "个人中心 - 折页" }] }),
  component: MePage,
});

function MePage() {
  const data = Route.useLoaderData();
  const { section = "dashboard" } = Route.useSearch();
  return <WorkspaceApp area="me" section={section} initial={data} />;
}
