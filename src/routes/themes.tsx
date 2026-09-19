import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/themes")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
