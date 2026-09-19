import { createFileRoute } from "@tanstack/react-router";
import { isMeSection } from "@/components/console/nav";
import { loadWorkspace, WorkspaceApp } from "@/components/console/workspace";

export const Route = createFileRoute("/me")({
  validateSearch: (search: Record<string, unknown>): { section?: import("@/components/console/nav").MeSection } =>
    isMeSection(search.section) ? { section: search.section } : {},
  loader: () => loadWorkspace("me"),
  head: () => ({ meta: [{ title: "个人中心 - 折页" }] }),
  component: MePage,
});

function MePage() {
  const data = Route.useLoaderData();
  const { section = "dashboard" } = Route.useSearch();
  return <WorkspaceApp area="me" section={section} initial={data} />;
}
