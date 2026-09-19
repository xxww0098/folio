import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { MissingPage } from "@/components/missing-page";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: MissingPage,
    defaultPreload: "intent",
    defaultStaleTime: 30_000,
    scrollRestoration: true,
  });
}
