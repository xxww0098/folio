import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { MissingPage } from "@/components/missing-page";
import { claimEntrance } from "@/lib/entrance/server";

export const Route = createFileRoute("/$entry")({
  loader: async ({ params }) => {
    const { ok } = await claimEntrance({ data: { entry: params.entry } });
    if (!ok) throw notFound();
    throw redirect({ to: "/console", reloadDocument: true });
  },
  notFoundComponent: () => <MissingPage />,
  component: function EntranceForward() {
    return null;
  },
});
