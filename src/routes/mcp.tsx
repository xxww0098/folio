import { createFileRoute, redirect } from "@tanstack/react-router";
import { MissingPage } from "@/components/missing-page";
import { requireWriterAccess } from "@/lib/writer-guard";

export const Route = createFileRoute("/mcp")({
  beforeLoad: async () => {
    await requireWriterAccess("/console?section=agent");
    throw redirect({ to: "/console", search: { section: "agent" } });
  },
  notFoundComponent: () => <MissingPage />,
});
