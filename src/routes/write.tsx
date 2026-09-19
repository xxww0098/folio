import { createFileRoute, redirect } from "@tanstack/react-router";
import { MissingPage } from "@/components/missing-page";
import { requireWriterAccess } from "@/lib/writer-guard";

export const Route = createFileRoute("/write")({
  beforeLoad: async () => {
    await requireWriterAccess("/console?section=write");
    throw redirect({ to: "/console", search: { section: "write" } });
  },
  notFoundComponent: MissingPage,
});
