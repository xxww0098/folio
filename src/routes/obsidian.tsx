import { createFileRoute, redirect } from "@tanstack/react-router";
import { MissingPage } from "@/components/missing-page";
import { requireWriterAccess } from "@/lib/writer-guard";

export const Route = createFileRoute("/obsidian")({
  beforeLoad: async () => {
    await requireWriterAccess("/console?section=obsidian");
    throw redirect({ to: "/console", search: { section: "obsidian" } });
  },
  notFoundComponent: () => <MissingPage />,
});
