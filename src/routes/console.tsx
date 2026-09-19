import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { isConsoleSection, type ConsoleSection } from "@/components/console/nav";
import { loadWorkspace, WorkspaceApp } from "@/components/console/workspace";
import { MissingPage } from "@/components/missing-page";
import { getWorkspaceAccess } from "@/lib/entrance/server";

export const Route = createFileRoute("/console")({
  validateSearch: (search: Record<string, unknown>): { section?: ConsoleSection; id?: number } => {
    const section = isConsoleSection(search.section) ? search.section : undefined;
    const raw = Number(search.id);
    const id = section === "write" && Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : undefined;
    return {
      ...(section ? { section } : {}),
      ...(id ? { id } : {}),
    };
  },
  beforeLoad: async ({ search }) => {
    const access = await getWorkspaceAccess();
    if (!access.unlocked) throw notFound();
    if (!access.signedIn) {
      const next = search.section ? `/console?section=${search.section}` : "/console";
      throw redirect({ to: "/login", search: { next } });
    }
    if (!access.canWrite) {
      throw redirect({ to: "/me" });
    }
  },
  loader: () => loadWorkspace("console"),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? "控制台 - 折页" : "折页 Folio" }],
  }),
  notFoundComponent: MissingPage,
  component: ConsolePage,
});

function ConsolePage() {
  const data = Route.useLoaderData();
  const { section = "dashboard", id } = Route.useSearch();
  return <WorkspaceApp area="console" section={section} postId={id} initial={data} />;
}
