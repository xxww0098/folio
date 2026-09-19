import { createFileRoute } from "@tanstack/react-router";
import { app } from "@/lib/hono/app";

function handle({ request }: { request: Request }) {
  return app.fetch(request);
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handle,
      HEAD: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
      OPTIONS: handle,
    },
  },
});
