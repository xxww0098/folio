import { notFound, redirect } from "@tanstack/react-router";
import { getWorkspaceAccess } from "@/lib/entrance/server";

export async function requireWriterAccess(next: string) {
  const access = await getWorkspaceAccess();
  if (!access.unlocked) throw notFound();
  if (!access.signedIn) {
    throw redirect({ to: "/login", search: { next } });
  }
  if (!access.canWrite) {
    throw redirect({ to: "/me" });
  }
  return access;
}
