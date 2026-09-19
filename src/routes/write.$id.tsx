import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { MissingPage } from "@/components/missing-page";
import { requireWriterAccess } from "@/lib/writer-guard";

export const Route = createFileRoute("/write/$id")({
  beforeLoad: async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isFinite(id) || id <= 0) throw notFound();
    await requireWriterAccess(`/console?section=write&id=${id}`);
    throw redirect({ to: "/console", search: { section: "write", id } });
  },
  notFoundComponent: () => <MissingPage />,
});
