import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { MissingPage } from "@/components/missing-page";
import { getBackendAccess } from "@/lib/entrance/server";

export const Route = createFileRoute("/me")({
  beforeLoad: async () => {
    const access = await getBackendAccess();
    if (!access.unlocked) throw notFound();
    throw redirect({ to: "/console" });
  },
  notFoundComponent: MissingPage,
  component: function MeRedirect() {
    return null;
  },
});
