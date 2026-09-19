import { hc } from "hono/client";
import type { AppType } from "./app";

export function createApiClient(origin: string) {
  return hc<AppType>(origin.replace(/\/$/, ""));
}
